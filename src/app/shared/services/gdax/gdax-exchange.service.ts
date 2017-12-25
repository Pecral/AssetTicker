import { TickerMessage } from './../../models/ticker-message';
import { OrderBookMessage } from './../../models/order-book-message';
import { ExchangeTickerType } from './../../models/exchange-ticker-type';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Injectable, OnDestroy } from '@angular/core';
import { ExchangeTicker } from '../exchange-ticker';
import { Http } from '@angular/http';
import { ExchangeInformationType } from '../../models/exchange-information-type';
import { Observable } from 'rxjs/Observable';
import { AssetTrade } from '../../models/asset-trade';
import { AssetPair } from '../../models/asset-pair';
import { OrderBook } from '../../models/order-book';
import { CandleStick } from '../../models/candle-stick';
import { Asset } from '../../models/asset';
import { GdaxChannelSubscription, ChannelSubscriptionState } from './gdax-channel-subscription';
import { GdaxCandlesSubscription } from './channels/gdax-candles-subscription';
import { GdaxTickerSubscription } from './channels/gdax-ticker-subscription';
import { timeFormat } from 'd3-ng2-service/src/bundle-d3';
import { subscribeOn } from 'rxjs/operator/subscribeOn';
import { ThrottledRequestQueue } from '../../helper/throttled-request-queue/throttled-request-queue';
import { GdaxMatchSubscription } from './channels/gdax-match-subscription';
import { GdaxOrderBookSubscription } from './channels/gdax-orderbook-subscription';

@Injectable()
export class GdaxExchangeService implements ExchangeTicker, OnDestroy {
   public websocketIsConnected = new BehaviorSubject<boolean>(false);
   public exchangeType: ExchangeTickerType = ExchangeTickerType.GDAX;

   private websocket: WebSocket;

   private readonly websocketUrl: string = 'wss://ws-feed.gdax.com';
   private readonly apiUrl: string = 'https://api.gdax.com';

   private apiRequestQueue: ThrottledRequestQueue;

   /*
   * List of active subscriptions. Key: Product-ID i.e. BTC-USD
   */
   private heartbeatSubscriptions = new Map<string, GdaxChannelSubscription>();
   private matchSubscriptions = new Map<string, GdaxTickerSubscription>();
   private tradeSubscriptions = new Map<string, GdaxMatchSubscription>();
   private candleSubscriptions = new Map<string, GdaxCandlesSubscription>();
   private orderBookSubscriptions = new Map<string, GdaxOrderBookSubscription>();

   /** Saves the mapping from asset pair symbols to product keys */
   private symbolToProductMapping = new Map<string, string>();
   private availableAssetPairs: AssetPair[] = [];

   /** Currently available subscriptions - Key: ChannelId */
   //private subscriptions: Map<number, GDAXChannelSubscription> = new Map<number, GDAXChannelSubscription>();
   //private queuedSubscriptions: GDAXChannelSubscription[] = [];

   constructor(private http: Http) {
      //create a new throttled queue which allows 3 api requests per second
      this.apiRequestQueue = new ThrottledRequestQueue(http, 3, 6);

      this.websocket = new WebSocket(this.websocketUrl);
      this.websocket.onmessage = this.onWebsocketMessageReceived.bind(this);
      this.websocket.onerror = this.onWebsocketError.bind(this);

      this.websocket.onopen = () => {
         //inform everyone that the websocket is opened now -- should be deprecated as soon as we don't have to prevent method-calls when the websocket isn't ready
         //we want to queue this calls and process them as soon as the websocket is opened (handled in websocket-stash)
         this.websocketIsConnected.next(true);
      }
   }

   //#region WebSocket-Handling

   ngOnDestroy(): void {
      //unsubscribe from all channels
      // this.subscriptions.forEach(x => {
      //    this.unsubscribeFromChannel(x.channelId);
      // });
   }

   private onWebsocketMessageReceived(message: any) {
      if (message.data) {
         let parsedData = JSON.parse(message.data);

         if (parsedData.hasOwnProperty('type')) {
            switch (parsedData.type) {
               case 'error':
                  console.log(`## GDAX ## Error - ${JSON.stringify(parsedData)}`);
                  break;

               case 'subscriptions':
                  this.onSubscriptionsMessage(parsedData);
                  break;

               case 'heartbeat':
                  break;

               case 'ticker':
                  let subscription = this.matchSubscriptions.get(parsedData.product_id);
                  if (subscription) {
                     subscription.pushIntoSubscription(parsedData);
                  }
                  break;

               case 'snapshot':
                  let orderBookSubscription = this.orderBookSubscriptions.get(parsedData.product_id);
                  if (orderBookSubscription) {
                     orderBookSubscription.pushSnapshotIntoSubscription(parsedData);
                  }
                  break;

               case 'l2update':
                  let orderBookSubscriptionUpdate = this.orderBookSubscriptions.get(parsedData.product_id);
                  if (orderBookSubscriptionUpdate) {
                     orderBookSubscriptionUpdate.pushL2UpdateIntoSubscription(parsedData);
                  }
                  break;

               case 'match':
                  let tradeSubscription = this.tradeSubscriptions.get(parsedData.product_id);
                  if (tradeSubscription) {
                     tradeSubscription.pushIntoSubscription(parsedData);
                  }               
                  break;
            }
         } else {
            console.log(`## GDAX ## Received message contains no type property: ${JSON.stringify(parsedData)}`);
         }
      }
      else {
         console.debug(`## GDAX ## Received message contains no data property: ${JSON.stringify(message)}`);
      }

   }

   /** Gets called if the websocket sends us a message about our current subscriptions */
   private onSubscriptionsMessage(message: any) {
      //it should have the property 'channels'
      if (message.channels && message.channels instanceof Array) {
         for (let channel of message.channels) {
            //check if any of these subscriptions are fulfilled queued subscriptions
            switch (channel.name) {
               case "ticker":

                  break;
            }
         }
      }
   }

   /** Respond to an event which is sent by the websocket (e.g. a new subscription) */
   private onGDAXEvent(message: any) {
      // let channel: GDAXChannelSubscription;

   }

   /** Print an error to the console if something fails. */
   private onWebsocketError(error: any) {

   }

   /** Unsubscribe from a specific channel */
   private unsubscribeFromChannel(channelId: number) {
      let message = {
         event: "unsubscribe",
         chanId: channelId
      };

      this.websocket.send(JSON.stringify(message));
   }

   subscribeToAssetTrades(pair: string): Observable<AssetTrade> {
      let productKey = this.symbolToProductMapping.get(pair);

      let subscription: GdaxMatchSubscription;

      if (!this.tradeSubscriptions.has(productKey)) {
         subscription = new GdaxMatchSubscription();
         subscription.key = productKey;
         subscription.assetPair = this.availableAssetPairs.find(x => x.symbol.toLowerCase() == pair.toLowerCase());
         this.tradeSubscriptions.set(productKey, subscription);

         //in gdax, the ticker message consists of two api requests
         //request ticker stats
         this.apiRequestQueue.enqueue(this.apiUrl + `/products/${productKey}/trades`).map(result => result.json()).subscribe(tradeResult => {
            subscription.pushApiResultIntoSubscription(tradeResult);
         });

         //subscribe to ticker channel
         this.websocket.send(this.getChannelSubscriptionMessage(ChannelType.Matches, productKey, false));
      }
      else {
         subscription = this.tradeSubscriptions.get(productKey);
      }

      return subscription.subject;
   }

   unsubscribeFromAssetTrades(pair: string): void {
      //subscribe from trade channel
      let productKey = this.symbolToProductMapping.get(pair);
      if(productKey) {
         this.websocket.send(this.getChannelSubscriptionMessage(ChannelType.Matches, productKey, true));
      }
   }

   /**
    * Returns array of available asset pairs/products on GDAX.
    */
   getAvailableAssetPairs(): Observable<AssetPair[]> {
      return this.apiRequestQueue.enqueue(this.apiUrl + '/products').map(result => {
         let assetPairs: AssetPair[] = [];
         let resultJson = result.json();

         //return empty array if request failed, log error
         if (result.status != 200) {
            console.log(`## GDAX ## Error - Failed to request '/products'. Status code: ${result.statusText}`);
         }
         else if (resultJson instanceof Array == false) {
            console.log(`## GDAX ## Error - Failed to parse response of '/products' request. The response was not an array.`);
         }
         else {
            for (let pairJson of resultJson) {
               let assetPair = new AssetPair();

               let baseAsset = new Asset();
               baseAsset.shortcode = pairJson.base_currency;

               let quoteAsset = new Asset();
               quoteAsset.shortcode = pairJson.quote_currency;

               assetPair.primaryAsset = baseAsset;
               assetPair.secondaryAsset = quoteAsset;
               assetPair.symbol = baseAsset.shortcode + quoteAsset.shortcode;

               this.symbolToProductMapping.set(assetPair.symbol, pairJson.id);

               assetPairs.push(assetPair);
            }
         }

         this.availableAssetPairs = assetPairs;
         return assetPairs;
      });
   }
   getOrderBook(pair: string): OrderBook {
      if (!this.symbolToProductMapping.has(pair)) {
         console.error(`## GDAX ## Attempted to request orderbook data for asset pair ${pair} even though we don't have any product id saved for it.`);
         return new OrderBook();
      }

      return this.ensureOrderBookSubscription(this.symbolToProductMapping.get(pair)).orderbook;
   }

   getOrderBookMessages(pair: string): Observable<OrderBookMessage> {
      if (!this.symbolToProductMapping.has(pair)) {
         console.error(`## GDAX ## Attempted to request orderbook data for asset pair ${pair} even though we don't have any product id saved for it.`);
         return Observable.empty<OrderBookMessage>();
      }

      return this.ensureOrderBookSubscription(this.symbolToProductMapping.get(pair)).orderbook.orderBookMessage;
   }

   private ensureOrderBookSubscription(productKey: string): GdaxOrderBookSubscription {
      if (!this.orderBookSubscriptions.has(productKey)) {
         let subscription = new GdaxOrderBookSubscription();
         subscription.key = productKey;
         //we receive the candles snapshot over the api, so we don't have to wait for a websocket subscription
         subscription.channelState = ChannelSubscriptionState.Subscribed;
         this.orderBookSubscriptions.set(productKey, subscription);

         //request order book snapshot and updates
         this.websocket.send(this.getChannelSubscriptionMessage(ChannelType.Level2, productKey, false));

         //TODO: Subscribe to batched-trades-channel so that we can update our candles
         //Documentation: https://docs.gdax.com/#the-code-classprettyprinttickercode-channel         
      }

      return this.orderBookSubscriptions.get(productKey);
   }

   unsubscribeFromOrderBook(pair: string): void {
      //subscribe from order book channel
      let productKey = this.symbolToProductMapping.get(pair);
      if(productKey) {
         this.websocket.send(this.getChannelSubscriptionMessage(ChannelType.Level2, productKey, true));
      }
   }

   getCandlesSnapshot(pair: string, timeFrame: string): Observable<CandleStick[]> {
      if (!this.symbolToProductMapping.has(pair)) {
         console.error(`## GDAX ## Attempted to request candles data for asset pair ${pair} even though we don't have any product id saved for it.`);
         return Observable.empty<CandleStick[]>();
      }

      return this.ensureCandlesSubscription(this.symbolToProductMapping.get(pair), timeFrame).snapshotSubject;
   }
   subscribeToCandles(pair: string, timeFrame: string): Observable<CandleStick> {
      if (!this.symbolToProductMapping.has(pair)) {
         console.error(`## GDAX ## Attempted to request candles data for asset pair ${pair} even though we don't have any product id saved for it.`);
         return Observable.empty<CandleStick>();
      }

      return this.ensureCandlesSubscription(this.symbolToProductMapping.get(pair), timeFrame).subject;
   }

   private ensureCandlesSubscription(productKey: string, timeFrame: string): GdaxCandlesSubscription {
      let mapKey = productKey + timeFrame;

      if (!this.candleSubscriptions.has(mapKey)) {
         let subscription = new GdaxCandlesSubscription(productKey, timeFrame);
         //we receive the candles snapshot over the api, so we don't have to wait for a websocket subscription
         subscription.channelState = ChannelSubscriptionState.Subscribed;
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
      throw new Error("Method not implemented.");
   }

   subscribeToTickerMessages(pair: string): Observable<TickerMessage> {
      let productKey = this.symbolToProductMapping.get(pair);

      let subscription: GdaxTickerSubscription;

      if (!this.matchSubscriptions.has(productKey)) {
         subscription = new GdaxTickerSubscription();
         subscription.key = productKey;
         this.matchSubscriptions.set(productKey, subscription);

         //in gdax, the ticker message consists of two api requests
         //request ticker stats
         var tickerObservable = this.apiRequestQueue.enqueue(this.apiUrl + `/products/${productKey}/ticker`).map(result => result.json());

         //request 24hr stats
         var statsObservable = this.apiRequestQueue.enqueue(this.apiUrl + `/products/${productKey}/stats`).map(result => result.json());

         Observable.zip(tickerObservable, statsObservable).subscribe(([tickerResult, statsResult]) => {
            subscription.pushApiResultsIntoSubscription(statsResult, tickerResult);
         });

         //subscribe to ticker channel
         this.websocket.send(this.getChannelSubscriptionMessage(ChannelType.Ticker, productKey, false));
      }
      else {
         subscription = this.matchSubscriptions.get(productKey);
      }

      return subscription.subject;
      //return Observable.empty<TickerMessage>();
   }

   unsubscribeFromTickerMessages(pair: string): void {
      let productKey = this.symbolToProductMapping.get(pair);

      let subscription: GdaxTickerSubscription = this.matchSubscriptions.get(productKey);

      if (subscription && subscription.subject.observers.length == 0) {
         //unsubscribe from ticker channel
         this.websocket.send(this.getChannelSubscriptionMessage(ChannelType.Ticker, productKey, true));
      }
   }

   /** Returns either a subscription message or a unsubscription message */
   getChannelSubscriptionMessage(type: ChannelType, productId: string, isUnsubscribe: boolean): string {
      let message = {
         "type": isUnsubscribe ? "unsubscribe" : "subscribe",
         "product_ids": [
            productId
         ],
         "channels": [
            ChannelType[type].toLowerCase()
         ]
      }

      return JSON.stringify(message);
   }
}

enum ChannelType {
   Heartbeat,
   Ticker,
   Level2,
   Matches
}