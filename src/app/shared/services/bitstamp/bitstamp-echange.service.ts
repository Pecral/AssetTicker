import { ExchangeTicker } from "../exchange-ticker";
import { BehaviorSubject } from "rxjs";
import { ExchangeTickerType } from "../../models/exchange-ticker-type";
import { Observable } from "rxjs/Observable";
import { AssetTrade } from "../../models/asset-trade";
import { AssetPair } from "../../models/asset-pair";
import { OrderBook } from "../../models/order-book";
import { OrderBookMessage } from "../../models/order-book-message";
import { CandleStick } from "../../models/candle-stick";
import { TickerMessage } from "../../models/ticker-message";
import { Asset } from "../../models/asset";
import { Http } from "@angular/http";
import { Injectable } from "@angular/core";
import { ThrottledRequestQueue } from "../../helper/throttled-request-queue/throttled-request-queue";

import { timeFormat } from "d3-ng2-service/src/bundle-d3";
import { assertNotNull } from "@angular/compiler/src/output/output_ast"; import { BitstampOrderBookSubscription } from "./channels/bitstamp-orderbook-subscription";
import { BitstampTickerSubscription } from "./channels/bitstamp-ticker-subscription";
import { BitstampTradeSubscription } from "./channels/bitstamp-trade-subscription";
import { BitstampCandlesSubscription } from "./channels/bitstamp-candles-subscription";

import Pusher from 'pusher-js';

@Injectable()
export class BitstampExchangeService implements ExchangeTicker {

   websocketIsConnected: BehaviorSubject<boolean> = new BehaviorSubject(true);
   exchangeType: ExchangeTickerType = ExchangeTickerType.Bitstamp;

   private pusher: Pusher;

   private websocket: WebSocket;

   /** We'll use Bitstamp' undocumented api2 because they've pulled support for their original API (api.Bitstamp.com) */
   private readonly websocketUrl: string = 'wss://api2.Bitstamp.com';
   private readonly apiUrl: string = 'https://www.bitstamp.net/api/v2/';

   private readonly websocketChannelMapping = { 'ticker': 1002, '24hStats': 1003, 'heartbeat': 1010 };
   private availableAssetPairs: AssetPair[];

   private apiRequestQueue: ThrottledRequestQueue;

   /** Saves the mapping from asset pair symbols to product keys */
   private symbolToProductMapping = new Map<string, { id: number, productKey: string }>();

   private apiTickerMessageCache: Map<string, TickerMessage>;
   private candleSubscriptions = new Map<string, BitstampCandlesSubscription>();
   private tickerSubscriptions = new Map<number, BitstampTickerSubscription>();
   private tradeSubscriptions = new Map<number, BitstampTradeSubscription>();
   private orderBookSubscriptions = new Map<number, BitstampOrderBookSubscription>();

   private queuedSubscriptionMessages: string[] = [];


   /** The order book updates and trades are returned in one channel. Thus we have to save whether we've subscribed to it for one of them to prevent duplicate subscriptions. This is a list of product keys. */
   private subscribedTradesAndOrderBookChannels: number[] = [];

   constructor(private http: Http) {
      this.apiRequestQueue = new ThrottledRequestQueue(http, 3, 6);
      // debugger;

      // this.pusher = new Pusher('de504dc5763aeef9ff52');
      // let channel = this.pusher.subscribe('live_trades');
      // channel.bind('trade', data => {
      //    console.log(data);
      // })

      // this.websocket = new WebSocket(this.websocketUrl);
      // this.websocket.onmessage = this.onWebsocketMessageReceived.bind(this);
      // this.websocket.onerror = this.onWebsocketError.bind(this);

      // this.websocket.onopen = () => {
      //    //inform everyone that the websocket is opened now -- should be deprecated as soon as we don't have to prevent method-calls when the websocket isn't ready
      //    //we want to queue this calls and process them as soon as the websocket is opened (handled in websocket-stash)
      //    this.websocketIsConnected.next(true);

      //    if (this.queuedSubscriptionMessages.length > 0) {
      //       for (let subscription of this.queuedSubscriptionMessages) {
      //          this.websocket.send(subscription);
      //       }
      //    }
      // }
   }

   onWebsocketMessageReceived(message: any) {
      let dataJson = JSON.parse(message.data);
      console.log(message);
   }

   onWebsocketError(message: string) {
      console.log(`## Bitstamp ## Error: ${JSON.stringify(message)}`);
   }

   /** Push ticker message into the subscription depending on the product id */
   onTickerMessage(tickerData: Array<number>) {

   }

   onOrderBookAndTradeMessage(message: any) {

   }

   websocketSafeSend(message: string) {
      if (this.websocket.readyState != 0) {
         this.websocket.send(message);
      }
      else {
         this.queuedSubscriptionMessages.push(message);
      }
   }

   subscribeToAssetTrades(pair: string): Observable<AssetTrade> {
      let product = this.symbolToProductMapping.get(pair);

      return Observable.empty<AssetTrade>();

      // if (product) {
      //    let subscription = this.tradeSubscriptions.get(product.id);

      //    if (!subscription) {
      //       subscription = new BitstampTradeSubscription();
      //       subscription.key = product.productKey;
      //       subscription.assetPair = this.availableAssetPairs.find(x => x.symbol.toLowerCase() == pair.toLowerCase());

      //       this.tradeSubscriptions.set(product.id, subscription);

      //       this.apiRequestQueue.enqueue(this.apiUrl + `returnTradeHistory&currencyPair=${product.productKey}`).map(result => result.json()).subscribe(result => {
      //          subscription.pushApiResultIntoSubscription(result);
      //       })

      //       /** send subscribe request if we're not already subscribed to it (it could happen if we've subscribed to the order book before) */
      //       if (this.subscribedTradesAndOrderBookChannels.findIndex(x => x == product.id) == -1) {
      //          this.subscribedTradesAndOrderBookChannels.push(product.id);
      //          this.websocketSafeSend(JSON.stringify({ "command": "subscribe", "channel": product.productKey }));
      //       }
      //    }

      //    return subscription.subject;
      // }
   }

   unsubscribeFromAssetTrades(pair: string): void {
      let product = this.symbolToProductMapping.get(pair);

      if (product) {
         let index = this.subscribedTradesAndOrderBookChannels.findIndex(x => x == product.id);
         if (index != -1) {
            this.subscribedTradesAndOrderBookChannels.splice(index, 1);
            this.websocketSafeSend(JSON.stringify({ "command": "subscribe", "channel": product.productKey }));
         }
      }
   }

   getAvailableAssetPairs(): Observable<AssetPair[]> {
      if (this.availableAssetPairs) {
         return Observable.of(this.availableAssetPairs);
      }
      else {
         return this.apiRequestQueue.enqueue(this.apiUrl + 'trading-pairs-info/').map(result => {
            let assetPairs: AssetPair[] = [];
            let resultJson = result.json();

            //return empty array if request failed, log error
            if (result.status != 200) {
               console.log(`## Bitstamp ## Error - Failed to request '/trading-pairs-info'. Status code: ${result.statusText}`);
            }
            else {
               for (let pair of resultJson) {
                  let assetPair = new AssetPair();

                  let splitSymbol = pair.name.indexOf('/');
                  let primarySymbol = pair.name.substring(0, splitSymbol);
                  let secondarySymbol = pair.name.substring(splitSymbol + 1);

                  let baseAsset = new Asset();
                  baseAsset.shortcode = primarySymbol;
                  assetPair.primaryAsset = baseAsset;

                  let quoteAsset = new Asset();
                  quoteAsset.shortcode = secondarySymbol;
                  assetPair.secondaryAsset = quoteAsset;

                  assetPair.symbol = primarySymbol + secondarySymbol;
                  assetPairs.push(assetPair);
               }
            }

            this.availableAssetPairs = assetPairs;

            return assetPairs;
         });
      }
   }

   /** Create ticker subscription instances for all assets - we can't subscribe for one asset specifically */
   ensureTickerSubscriptions() {
      if (Array.from(this.tickerSubscriptions.keys()).length == 0) {
         let assets = Array.from(this.symbolToProductMapping.keys());

         for (let asset of assets) {
            let product = this.symbolToProductMapping.get(asset);

            let tickerSubscription = new BitstampTickerSubscription();
            tickerSubscription.key = product.productKey;

            //get from cache if it exists
            if (this.apiTickerMessageCache.has(asset)) {
               tickerSubscription.pushApiResultsIntoSubscription(this.apiTickerMessageCache.get(asset));
            }

            this.tickerSubscriptions.set(product.id, tickerSubscription);
         }
         this.websocketSafeSend(JSON.stringify({ "command": "subscribe", "channel": this.websocketChannelMapping.ticker }));
      }
   }

   getOrderBook(pair: string): OrderBook {
      let product = this.symbolToProductMapping.get(pair);

      if (product) {
         return this.ensureOrderBookSubscription(product.productKey, product.id).orderbook;
      }
   }

   getOrderBookMessages(pair: string): Observable<OrderBookMessage> {
      let product = this.symbolToProductMapping.get(pair);

      if (product) {
         return this.ensureOrderBookSubscription(product.productKey, product.id).orderbook.orderBookMessage;
      }
   }

   /**  */
   ensureOrderBookSubscription(productKey: string, productId: number): BitstampOrderBookSubscription {
      let subscription = this.orderBookSubscriptions.get(productId);

      if (!subscription) {
         subscription = new BitstampOrderBookSubscription();
         subscription.key = productKey;

         this.orderBookSubscriptions.set(productId, subscription);

         /** send subscribe request if we're not already subscribed to it (it could happen if we've subscribed to the order book before) */
         if (this.subscribedTradesAndOrderBookChannels.findIndex(x => x == productId) == -1) {
            this.subscribedTradesAndOrderBookChannels.push(productId);
            this.websocketSafeSend(JSON.stringify({ "command": "subscribe", "channel": productKey }));
         }
      }

      return subscription;
   }

   unsubscribeFromOrderBook(pair: string): void {
      let product = this.symbolToProductMapping.get(pair);

      if (product) {
         let index = this.subscribedTradesAndOrderBookChannels.findIndex(x => x == product.id);
         if (index != -1) {
            this.subscribedTradesAndOrderBookChannels.splice(index, 1);
            this.websocketSafeSend(JSON.stringify({ "command": "subscribe", "channel": product.productKey }));
         }
      }
   }

   getCandlesSnapshot(pair: string, timeFrame: string): Observable<CandleStick[]> {
      let product = this.symbolToProductMapping.get(pair);

      if (product) {
         return this.ensureCandlesSubscription(product.productKey, timeFrame).snapshotSubject;
      }
   }

   subscribeToCandles(pair: string, timeFrame: string): Observable<CandleStick> {
      let product = this.symbolToProductMapping.get(pair);

      if (product) {
         return this.ensureCandlesSubscription(product.productKey, timeFrame).subject;
      }
   }

   private ensureCandlesSubscription(productKey: string, timeFrame: string): BitstampCandlesSubscription {
      let mapKey = productKey + timeFrame;

      if (!this.candleSubscriptions.has(mapKey)) {
         let subscription = new BitstampCandlesSubscription(productKey, timeFrame);

         this.candleSubscriptions.set(mapKey, subscription);

         //request historic rates
         this.apiRequestQueue.enqueue(this.apiUrl + subscription.getSnapshotRequestUrl(new Date()))
            .map(result => result.json())
            .subscribe(snapshot => subscription.resolveSnapshot(snapshot));
      }
      return this.candleSubscriptions.get(mapKey);
   }

   unsubscribeFromCandles(pair: string, timeFrame: string): void {
      //not implemented yet..
   }

   subscribeToTickerMessages(pair: string): Observable<TickerMessage> {
      return Observable.empty<TickerMessage>();
   }

   unsubscribeFromTickerMessages(pair: string): void {
      //not implemented yet.. we may have to check to how many tickers we are currently subscribed, because there's only one subscription for all assets
   }
}