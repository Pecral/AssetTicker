import { AssetPair } from './../../models/asset-pair';
import { BitfinexTickerSubscription } from './channels/bitfinex-ticker-subscription';
import { TickerMessage } from './../../models/ticker-message';
import { CandleStick } from './../../models/candle-stick';
import { BitfinexCandlesSubscription } from './channels/bitfinex-candles-subscription';
import { OrderBookMessage } from './../../models/order-book-message';
import { OrderBook } from './../../models/order-book';
import { BitfinexOrderBookSubscription } from './channels/bitfinex-orderbook-subscription';
import { AssetHandlerService } from './../asset-handler/asset-handler.service';
import { Injectable, OnInit, EventEmitter, OnDestroy } from '@angular/core';
import { Http, Response, Headers, RequestOptions, HttpModule, URLSearchParams } from '@angular/http';

import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/Rx';

import { AssetOrderType } from '../../models/asset-order-type';
import { ExchangeTickerType } from '../../models/exchange-ticker-type';
import { Asset } from '../../models/asset';
import { ExchangeInformationType } from '../../models/exchange-information-type';
import { AssetTrade } from './../../models/asset-trade';
import { ExchangeTicker } from './../exchange-ticker';
import { BitfinexChannelSubscription } from './bitfinex-channel-subscription';
import { BitfinexTradeSubscription } from './channels/bitfinex-trade-subscription';


@Injectable()
export class BitfinexTickerService implements ExchangeTicker, OnDestroy {
   public websocketIsConnected = new BehaviorSubject<boolean>(false);
   public exchangeType: ExchangeTickerType = ExchangeTickerType.Bitfinex;

   private websocket: WebSocket;

   /** Currently available subscriptions - Key: ChannelId */
   private subscriptions: Map<number, BitfinexChannelSubscription> = new Map<number, BitfinexChannelSubscription>();
   private queuedSubscriptions: BitfinexChannelSubscription[] = [];

   constructor(private http: Http, private assetHandler: AssetHandlerService) {
      this.websocket = new WebSocket('wss://api.bitfinex.com/ws/2');

      this.websocket.onmessage = this.onWebsocketMessageReceived.bind(this);
      this.websocket.onerror = this.onWebsocketError.bind(this);

      this.websocket.onopen = () => {
         //inform everyone that the websocket is opened now
         this.websocketIsConnected.next(true);
      }
   }

   //#region WebSocket-Handling

   ngOnDestroy(): void {
      //unsubscribe from all channels
      this.subscriptions.forEach(x => {
         this.unsubscribeFromChannel(x.channelId);
      });
   }   

   private onWebsocketMessageReceived(message: any) {
      let parsed = JSON.parse(message.data);

      //check if it's an event-object
      if (parsed.event) {
         this.onBitfinexEvent(parsed);
      }
      //otherwise it's probably a channel-message
      else {
         this.onBitfinexChannelMessage(parsed);
      }

   }

   private onBitfinexChannelMessage(message: any) {
      //it "should" be an array
      //the first entry is always the channel id
      let channelId = message[0];

      //push message to subscription
      if (this.subscriptions.has(channelId)) {
         this.subscriptions.get(channelId).pushIntoSubscription(message);
      }
   }

   /** Respond to an event which is sent by the websocket (e.g. a new subscription) */
   private onBitfinexEvent(message: any) {
      let channel: BitfinexChannelSubscription;

      switch (message.event) {
         case 'subscribed':
            switch (message.channel) {
               case 'trades':
                  channel = this.queuedSubscriptions.find(x => x.exchangeInformationType == ExchangeInformationType.Trades &&
                     x.key.toLowerCase() == message.pair.toLowerCase());
                  break;
               case 'book':
                  channel = this.queuedSubscriptions.find(x => x.exchangeInformationType == ExchangeInformationType.OrderBook &&
                     x.key.toLowerCase() == message.pair.toLowerCase());
                  break;
               case 'candles':
                  channel = this.queuedSubscriptions.find(x => x.exchangeInformationType == ExchangeInformationType.Candles &&
                     x.key.toLowerCase() == message.key.toLowerCase());
                  break;
               case 'ticker':
                  channel = this.queuedSubscriptions.find(x => x.exchangeInformationType == ExchangeInformationType.Ticker &&
                     x.key.toLowerCase() == message.pair.toLowerCase());
                  break;
            }
            console.log(`## Bitfinex ## Subscribe - Channel ${message.chanId} - Type '${message.channel}' for symbol pair '${channel.key}'`);

            //the subscription should already exist in our list of queued subscriptions, otherwise we didn't want to subscribe to it (which wouldn't make sense)..
            if (channel) {
               channel.channelId = message.chanId;
               channel.isSubscribed = true;
               this.subscriptions.set(channel.channelId, channel);

               //delete it from queued subscriptions..
               let index = this.queuedSubscriptions.indexOf(channel);
               this.queuedSubscriptions.splice(index, 1);
            }
            break;
         case 'unsubscribed':
            if (this.subscriptions.has(message.chanId)) {
               console.log(`## Bitfinex ## Unsubscribe - Channel ${message.chanId} with response code '${message.status}'`);
               this.subscriptions.delete(message.chanId);
            }
            break;
         case 'error':
            console.error(`## Bitfinex ## Error - '${JSON.stringify(message)}'`);
            break;
      }
   }

   /** Print an error to the console of something fails. */
   private onWebsocketError(error: any) {
      console.error('## Bitfinex ## Error - ' + error);
      this.websocketIsConnected.next(false);
   }

   /** Unsubscribe from a specific channel */
   private unsubscribeFromChannel(channelId: number) {
      let message = {
         event: "unsubscribe",
         chanId: channelId
      };

      this.websocket.send(JSON.stringify(message));
   }   

   //#endregion

   //#region OrderBook

   /** Get the order book of a specific symbol pair */
   getOrderBook(pair: string): OrderBook {
      let orderBookSubscription = this.ensureOrderBookSubscription(pair);
      return orderBookSubscription.orderbook;
   }

   getOrderBookMessages(pair: string): Observable<OrderBookMessage> {
      let orderBookSubscription = this.ensureOrderBookSubscription(pair);
      return orderBookSubscription.orderbook.orderBookMessage;
   }

   /** Ensures that we're subscribed to the order book channel */
   private ensureOrderBookSubscription(pair: string): BitfinexOrderBookSubscription {
      //find subscription from the map based on the asset pair string
      let subscription = Array.from(this.subscriptions.values()).find(x => x.exchangeInformationType == ExchangeInformationType.OrderBook &&
         x.key.toLowerCase() == pair.toLowerCase()) as BitfinexOrderBookSubscription;

      //if the subscription doesn't already exist (even as a queued subscription), we'll create a new one and return it then
      if (!subscription) {
         subscription = this.queuedSubscriptions.find(x => x.exchangeInformationType == ExchangeInformationType.OrderBook &&
            x.key.toLowerCase() == pair.toLowerCase()) as BitfinexOrderBookSubscription;
         //check if the subscription exists as a queued version
         if (!subscription) {
            subscription = new BitfinexOrderBookSubscription();
            subscription.key = pair;
            subscription.assetPair = this.assetHandler.splitSymbolPair(pair);
            this.queuedSubscriptions.push(subscription);

            let message = {
               event: "subscribe",
               channel: "book",
               prec: "P0",
               symbol: pair
            };

            this.websocket.send(JSON.stringify(message));
         }
      }

      return subscription;
   }

   unsubscribeFromOrderBook(pair: string): void {
      let subscription = Array.from(this.subscriptions.values()).find(x => x.exchangeInformationType == ExchangeInformationType.OrderBook &&
         x.key.toLowerCase() == pair.toLowerCase()) as BitfinexOrderBookSubscription;

      //forced unsubscription for now
      this.unsubscribeFromChannel(subscription.channelId);

      // if (subscription && subscription.observable.observers.length == 0) {
      //    this.unsubscribeFromChannel(subscription.channelId);
      // } 
   }

   //#endregion OrderBook

   //#region Candles

   private ensureCandlesSubscription(pair: string, timeFrame: string): BitfinexCandlesSubscription {
      let key: string = `trade:${timeFrame}:t${pair}`;
      //find subscription from the map based on the asset pair string
      let subscription = Array.from(this.subscriptions.values()).find(x => x.exchangeInformationType == ExchangeInformationType.Candles &&
         x.key.toLowerCase() == key.toLowerCase()) as BitfinexCandlesSubscription;

      //if the subscription doesn't already exist (even as a queued subscription), we'll create a new one and return it then
      if (!subscription) {
         subscription = this.queuedSubscriptions.find(x => x.exchangeInformationType == ExchangeInformationType.Candles &&
            x.key.toLowerCase() == pair.toLowerCase()) as BitfinexCandlesSubscription;
         //check if the subscription exists as a queued version
         if (!subscription) {
            subscription = new BitfinexCandlesSubscription();
            subscription.key = key;
            subscription.assetPair = this.assetHandler.splitSymbolPair(pair);
            this.queuedSubscriptions.push(subscription);

            let message = {
               event: "subscribe",
               channel: "candles",
               key: subscription.key
            };

            this.websocket.send(JSON.stringify(message));
         }
      }

      return subscription;
   }

   subscribeToCandles(pair: string, timeFrame: string) {
      let subscription = this.ensureCandlesSubscription(pair, timeFrame);
      return subscription.subject;
   }

   getCandlesSnapshot(pair: string, timeFrame: string): CandleStick[] {
      let subscription = this.ensureCandlesSubscription(pair, timeFrame);
      return subscription.candlesticks;
   }

   receivedCandlestickSnapshot(pair: string, timeFrame: string): BehaviorSubject<boolean> {
      let subscription = this.ensureCandlesSubscription(pair, timeFrame);
      return subscription.candlestickSnapshotReceived;
   }   

   unsubscribeFromCandles(pair: string, timeFrame: string): void {
      let key: string = `trade:${timeFrame}:t${pair}`;

      let subscription = Array.from(this.subscriptions.values()).find(x => x.exchangeInformationType == ExchangeInformationType.Candles &&
         x.key.toLowerCase() == key.toLowerCase()) as BitfinexCandlesSubscription;

      if (subscription && subscription.subject.observers.length == 0) {
         this.unsubscribeFromChannel(subscription.channelId);
      }
   }

   //#endregion Candles
   
   //#region AssetTrades

   /** Get an observable for new trades of a specific asset pair e.g. XMRUSD */
   subscribeToAssetTrades(pair: string): Observable<AssetTrade> {
      //find subscription from the map based on the asset pair string
      let subscription = Array.from(this.subscriptions.values()).find(x => x.exchangeInformationType == ExchangeInformationType.Trades &&
         x.key.toLowerCase() == pair.toLowerCase()) as BitfinexTradeSubscription;

      //if the subscription doesn't already exist (even as a queued subscription), we'll create a new one and return it then
      if (!subscription) {
         subscription = this.queuedSubscriptions.find(x => x.exchangeInformationType == ExchangeInformationType.Trades &&
            x.key.toLowerCase() == pair.toLowerCase()) as BitfinexTradeSubscription;
         //check if the subscription exists as a queued version
         if (!subscription) {
            subscription = new BitfinexTradeSubscription();
            subscription.key = pair;
            subscription.assetPair = this.assetHandler.splitSymbolPair(pair);
            this.queuedSubscriptions.push(subscription);

            let message = {
               event: "subscribe",
               channel: "trades",
               symbol: pair
            };

            this.websocket.send(JSON.stringify(message));
         }
      }

      return subscription.observable;
   }

   unsubscribeFromAssetTrades(pair: string): void {
      let subscription = Array.from(this.subscriptions.values()).find(x => x.exchangeInformationType == ExchangeInformationType.Trades &&
         x.key.toLowerCase() == pair.toLowerCase()) as BitfinexTradeSubscription;

      if (subscription && subscription.observable.observers.length == 0) {
         this.unsubscribeFromChannel(subscription.channelId);
      }
   }

   //#endregion

   //#region Ticker

   subscribeToTickerMessages(pair: string):Observable<TickerMessage> {
      //find subscription from the map based on the asset pair string
      let subscription = Array.from(this.subscriptions.values()).find(x => x.exchangeInformationType == ExchangeInformationType.Ticker &&
         x.key.toLowerCase() == pair.toLowerCase()) as BitfinexTickerSubscription;

      //if the subscription doesn't already exist (even as a queued subscription), we'll create a new one and return it then
      if (!subscription) {
         subscription = this.queuedSubscriptions.find(x => x.exchangeInformationType == ExchangeInformationType.Ticker &&
            x.key.toLowerCase() == pair.toLowerCase()) as BitfinexTickerSubscription;
         //check if the subscription exists as a queued version
         if (!subscription) {
            subscription = new BitfinexTickerSubscription();
            subscription.key = pair;
            subscription.assetPair = this.assetHandler.splitSymbolPair(pair);
            this.queuedSubscriptions.push(subscription);

            let message = {
               event: "subscribe",
               channel: "ticker",
               symbol: 't' + subscription.key
            };

            this.websocket.send(JSON.stringify(message));
         }
      }

      return subscription.tickerObservable;
   }
   
   unsubscribeFromTickerMessages(pair: string): void {
      let subscription = Array.from(this.subscriptions.values()).find(x => x.exchangeInformationType == ExchangeInformationType.Ticker &&
         x.key.toLowerCase() == pair.toLowerCase()) as BitfinexTickerSubscription;

      if (subscription && subscription.tickerObservable.observers.length == 0) {
         this.unsubscribeFromChannel(subscription.channelId);
      }
   }   

   //#endregion Ticker

   /** Get a list of available asset pairs */
   getAvailableAssetPairs(): Observable<AssetPair[]> {
      // CORS error
      // return this.http.get('https://api.bitfinex.com/v1/symbols').map(result => {
      //    return result.json();
      // });

      let symbolPairs = ["BTCUSD", "ETHUSD", "ETHBTC", "XMRUSD", "XMRBTC", "LTCUSD", "LTCBTC", "ETCBTC", "ETCUSD", "RRTUSD", "RRTBTC", "ZECUSD", "ZECBTC", "DSHUSD", "DSHBTC", "BCCBTC", "BCUBTC", "BCCUSD", "BCUUSD", "XRPUSD", "XRPBTC", "IOTUSD", "IOTBTC", "IOTETH", "EOSUSD", "EOSBTC", "EOSETH", "SANUSD", "SANBTC", "SANETH", "OMGUSD", "OMGBTC", "OMGETH", "BCHUSD", "BCHBTC", "BCHETH", "NEOUSD", "NEOBTC", "NEOETH", "ETPUSD", "ETPBTC", "ETPETH", "QTMUSD", "QTMBTC", "QTMETH", "BT1USD", "BT2USD", "BT1BTC", "BT2BTC", "AVTUSD", "AVTBTC", "AVTETH", "EDOUSD", "EDOBTC", "EDOETH", "BG1USD", "BG2USD", "BG1BTC", "BG2BTC", "BTGUSD", "BTGBTC"];

      let assetPairs: AssetPair[] = symbolPairs.map(asset => {
         let pair = new AssetPair();
         let pairTuple = this.assetHandler.splitSymbolPair(asset);
         pair.primaryAsset = pairTuple[0];
         pair.secondaryAsset = pairTuple[1];
         pair.symbol = asset;

         return pair;
      });
      
      return Observable.of(assetPairs);
   }

}