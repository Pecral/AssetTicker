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
import { PoloniexCandlesSubscription } from "./channels/poloniex-candles-subscription";
import { timeFormat } from "d3-ng2-service/src/bundle-d3";
import { PoloniexTickerSubscription } from "./channels/poloniex-ticker-subscription";
import { assertNotNull } from "@angular/compiler/src/output/output_ast";
import { PoloniexTradeSubscription } from "./channels/poloniex-trade-subscription";
import { PoloniexOrderBookSubscription } from "./channels/poloniex-orderbook-subscription";

@Injectable()
export class PoloniexExchangeService implements ExchangeTicker {

   websocketIsConnected: BehaviorSubject<boolean> = new BehaviorSubject(false);
   exchangeType: ExchangeTickerType = ExchangeTickerType.Poloniex;

   private websocket: WebSocket;
   
   /** We'll use Poloniex' undocumented api2 because they've pulled support for their original API (api.poloniex.com) */
   private readonly websocketUrl: string = 'wss://api2.poloniex.com';
   private readonly apiUrl: string = ' https://poloniex.com/public?command=';

   private readonly websocketChannelMapping = { 'ticker': 1002, '24hStats': 1003, 'heartbeat': 1010 };
   private availableAssetPairs: AssetPair[];

   private apiRequestQueue: ThrottledRequestQueue;

   /** Saves the mapping from asset pair symbols to product keys */
   private symbolToProductMapping = new Map<string, { id:number, productKey: string }>();

   private apiTickerMessageCache: Map<string, TickerMessage>;
   private candleSubscriptions = new Map<string, PoloniexCandlesSubscription>();
   private tickerSubscriptions = new Map<number, PoloniexTickerSubscription>();
   private tradeSubscriptions = new Map<number, PoloniexTradeSubscription>();

   private queuedSubscriptionMessages: string[] = [];

   /** The order book updates and trades are returned in one channel. Thus we have to save whether we've subscribed to it for one of them to prevent duplicate subscriptions. This is a list of product keys. */
   private subscribedTradesAndOrderBookChannels : string[] = [];

   constructor(private http: Http) {
      this.apiRequestQueue = new ThrottledRequestQueue(http, 3, 6);

      this.websocket = new WebSocket(this.websocketUrl);
      this.websocket.onmessage = this.onWebsocketMessageReceived.bind(this);
      this.websocket.onerror = this.onWebsocketError.bind(this);

      this.websocket.onopen = () => {
         //inform everyone that the websocket is opened now -- should be deprecated as soon as we don't have to prevent method-calls when the websocket isn't ready
         //we want to queue this calls and process them as soon as the websocket is opened (handled in websocket-stash)
         this.websocketIsConnected.next(true);

         if(this.queuedSubscriptionMessages.length > 0) {
            for(let subscription of this.queuedSubscriptionMessages) {
               this.websocket.send(subscription);
            }
         }
      }      
   }

   onWebsocketMessageReceived(message: any) {
      let dataJson = JSON.parse(message.data);

      if(dataJson instanceof Array) {
         let channelId: number = dataJson[0];
         if(channelId != 1002) {
            console.log(message);
         }
         

         switch(channelId) {
            //ticker
            case 1002:
               let subscriptionState = dataJson[1];
               if(subscriptionState == 1) {
                  console.log('## Poloniex ## Now subscribed to ticker channel');
               }

               if(dataJson.length >= 3 && dataJson[2] instanceof Array) {
                  this.onTickerMessage(dataJson[2]);
               }
            break;
            //heartbeat
            case 1010:
               console.log('## Poloniex ## Websocket Heartbeat');
            break;
            //trade and order book
            default:
               this.onOrderBookAndTradeMessage(dataJson);
            break;
         }
      }
      else {
         console.warn(`## Poloniex ## Received unknown websocket message '${message.data}'`);
      }
   }

   onWebsocketError(message: string) {
      console.log(`## Poloniex ## Error: ${JSON.stringify(message)}`);
   }

   /** Push ticker message into the subscription depending on the product id */
   onTickerMessage(tickerData:Array<number>) {
      let productId = tickerData[0];

      let subscription = this.tickerSubscriptions.get(productId);
      if(subscription) {
         subscription.pushIntoSubscription(tickerData);
      }
   }

   onOrderBookAndTradeMessage(message:any) {
      if(message instanceof Array && message.length == 3) {
         let productId = message[0];

         let updates = message[2];
         if(updates instanceof Array) {
            for(let update of updates) {
               let type = update[0];

               switch(type) {
                  case "i":
                     console.log('snapshot');
                  break;
                  case "o":
                  break;
                  case "t":
                     let tradeSubscription = this.tradeSubscriptions.get(productId);
                     if(tradeSubscription) {
                        tradeSubscription.pushIntoSubscription(update);
                     }
                  break;
               }
            }
         }
      }
   }

   websocketSafeSend(message: string) {
      if(this.websocket.readyState != 0) {
         this.websocket.send(message);
      }
      else {
         this.queuedSubscriptionMessages.push(message);
      }
   }

   subscribeToAssetTrades(pair: string): Observable<AssetTrade> {
      let product = this.symbolToProductMapping.get(pair);

      if(product) {
         let subscription = this.tradeSubscriptions.get(product.id);

         if(!subscription) {
            subscription = new PoloniexTradeSubscription();
            subscription.key = product.productKey;
            subscription.assetPair = this.availableAssetPairs.find(x => x.symbol.toLowerCase() == pair.toLowerCase());

            this.tradeSubscriptions.set(product.id, subscription);
            
            this.apiRequestQueue.enqueue(this.apiUrl +  `returnTradeHistory&currencyPair=${product.productKey}`).map(result => result.json()).subscribe(result => {
               subscription.pushApiResultIntoSubscription(result);
            })

            /** send subscribe request if we're not already subscribed to it (it could happen if we've subscribed to the order book before) */
            if(this.subscribedTradesAndOrderBookChannels.findIndex(x => x == product.productKey) == -1)
            {
               this.subscribedTradesAndOrderBookChannels.push(product.productKey);
               this.websocketSafeSend(JSON.stringify({"command" : "subscribe", "channel" : product.productKey }));
            }
         }
         
         return subscription.subject;
      }
   }

   unsubscribeFromAssetTrades(pair: string): void {
      let product = this.symbolToProductMapping.get(pair);

      if(product) {
         this.websocketSafeSend(JSON.stringify({"command" : "unsubscribe", "channel" : product.productKey }));
      }
   }

   getAvailableAssetPairs(): Observable<AssetPair[]> {
      if(this.availableAssetPairs) {
         return Observable.of(this.availableAssetPairs);
      }
      else {
         return this.apiRequestQueue.enqueue(this.apiUrl + 'returnTicker').map(result => {
            let assetPairs: AssetPair[] = [];
            let resultJson = result.json();
            this.apiTickerMessageCache = new Map<string, TickerMessage>();
            this.symbolToProductMapping = new Map<string, { id:number, productKey: string }>();
   
            //return empty array if request failed, log error
            if(result.status != 200 ) {
               console.log(`## Poloniex ## Error - Failed to request '/products'. Status code: ${result.statusText}`);
            }
            else {
               for(let pairKey in resultJson) {
                  let assetPair = new AssetPair();
   
                  let splitSymbol = pairKey.indexOf('_');
                  let primarySymbol  = pairKey.substring(0, splitSymbol);
                  let secondarySymbol = pairKey.substring(splitSymbol + 1);
   
                  //in poloniex, every asset is grouped under either BTC, ETH, XMR or USDT (e.g. BTC_ETH, BTC_XMR)
                  //their website lists them in a switched order (ETC/BTC instead of BTC_ETH), so we have to switch the symbols, too
   
                  let baseAsset = new Asset();
                  baseAsset.shortcode = secondarySymbol;
                  assetPair.primaryAsset = baseAsset;
   
                  let quoteAsset = new Asset();
                  quoteAsset.shortcode = primarySymbol;
                  assetPair.secondaryAsset = quoteAsset;
   
                  assetPair.symbol = secondarySymbol + primarySymbol;
                  assetPairs.push(assetPair);
   
                  //we can extract the ticker data from this api request
                  //this is used as an initial cached value as soon as the user requests a specific ticker message
                  let tickerMessage = new TickerMessage();
                  let tickerJson = resultJson[pairKey] as ApiTickerModel;
   
                  //safe ids/keys
                  this.symbolToProductMapping.set(assetPair.symbol, { id: tickerJson.id, productKey: pairKey });
   
                  tickerMessage.high = parseFloat(tickerJson.high24hr);
                  tickerMessage.low = parseFloat(tickerJson.low24hr);
                  tickerMessage.volume = parseFloat(tickerJson.quoteVolume);
                  tickerMessage.dailyChangePercent = parseFloat(tickerJson.percentChange) * 100;
                  tickerMessage.lastPrice = parseFloat(tickerJson.last);
   
                  this.apiTickerMessageCache.set(assetPair.symbol, tickerMessage);
               }
            }
   
            assetPairs = assetPairs.sort((a, b) => {
               let firstTicker = this.apiTickerMessageCache.get(a.symbol);
               let secondTicker = this.apiTickerMessageCache.get(b.symbol);
   
               return secondTicker.volume * secondTicker.lastPrice - firstTicker.volume * firstTicker.lastPrice;
            });
   
            this.availableAssetPairs = assetPairs;
   
            return assetPairs;
         });
      }
   }

   /** Create ticker subscription instances for all assets - we can't subscribe for one asset specifically */
   ensureTickerSubscriptions() {
      if(Array.from(this.tickerSubscriptions.keys()).length == 0) {
         let assets = Array.from(this.symbolToProductMapping.keys());

         for(let asset of assets) {
            let product = this.symbolToProductMapping.get(asset);
   
            let tickerSubscription = new PoloniexTickerSubscription();
            tickerSubscription.key = product.productKey;
   
            //get from cache if it exists
            if(this.apiTickerMessageCache.has(asset)) { 
               tickerSubscription.pushApiResultsIntoSubscription(this.apiTickerMessageCache.get(asset));
            }
   
            this.tickerSubscriptions.set(product.id, tickerSubscription);
         }
         this.websocketSafeSend(JSON.stringify({"command" : "subscribe", "channel" : this.websocketChannelMapping.ticker }));
      }
   }

   getOrderBook(pair: string): OrderBook {
      return new OrderBook();
   }

   getOrderBookMessages(pair: string): Observable<OrderBookMessage> {
      return Observable.empty<OrderBookMessage>();
   }

   /**  */
   ensureOrderBookSubscription(productKey:string): PoloniexOrderBookSubscription {
      return;
   }      

   unsubscribeFromOrderBook(pair: string): void {

   }

   getCandlesSnapshot(pair: string, timeFrame: string): Observable<CandleStick[]> {
      let product = this.symbolToProductMapping.get(pair);

      if(product) {
         return this.ensureCandlesSubscription(product.productKey, timeFrame).snapshotSubject;
         //return Observable.empty<CandleStick[]>();
      }
   }

   subscribeToCandles(pair: string, timeFrame: string): Observable<CandleStick> {
      let product = this.symbolToProductMapping.get(pair);

      if(product) {
         return this.ensureCandlesSubscription(product.productKey, timeFrame).subject;
      }
   }

   private ensureCandlesSubscription(productKey: string, timeFrame: string): PoloniexCandlesSubscription {
      let mapKey = productKey + timeFrame;

      if (!this.candleSubscriptions.has(mapKey)) {
         let subscription = new PoloniexCandlesSubscription(productKey, timeFrame);

         this.candleSubscriptions.set(mapKey, subscription);

         //request historic rates
         this.apiRequestQueue.enqueue(this.apiUrl + subscription.getSnapshotRequestUrl(new Date()))
            .map(result => result.json())
            .subscribe(snapshot => subscription.resolveSnapshot(snapshot));

         //TODO: Subscribe to batched-trades-channel so that we can update our candles
         //Documentation: https://docs.gdax.com/#the-code-classprettyprinttickercode-channel         
      }
      return this.candleSubscriptions.get(mapKey);
   }

   unsubscribeFromCandles(pair: string, timeFrame: string): void {
      
   }

   subscribeToTickerMessages(pair: string): Observable<TickerMessage> {
      //we can't subscribe for one ticker/asset specifically, so we have to subscribe for all of them
      this.ensureTickerSubscriptions();
      //we can't subscribe for one ticker/asset specifically, so we have to subscribe for all of them
      let product = this.symbolToProductMapping.get(pair);

      if(product) {
         let subscription = this.tickerSubscriptions.get(product.id);

         return subscription.subject;
      }
      else {
         return Observable.empty<TickerMessage>();
      }
   }

   unsubscribeFromTickerMessages(pair: string): void {
   }
   
}