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

@Injectable()
export class GdaxExchangeService implements ExchangeTicker, OnDestroy {
   public websocketIsConnected = new BehaviorSubject<boolean>(false);
   public exchangeType: ExchangeTickerType = ExchangeTickerType.GDAX;

   private websocket: WebSocket;

   private readonly websocketUrl: string = 'wss://ws-feed.gdax.com';
   private readonly apiUrl: string = 'https://api.gdax.com';

   /*
   * List of active subscriptions. Key: Product-ID i.e. BTC-USD
   */
   private heartbeatSubscriptions = new Map<string, GdaxChannelSubscription>();
   private tickerSubscriptions = new Map<string, GdaxTickerSubscription>();
   private tradeSubscriptions = new Map<string, GdaxChannelSubscription>();
   private candleSubscriptions = new Map<string, GdaxCandlesSubscription>();

   /** Saves the mapping from asset pair symbols to product keys */
   private symbolToProductMapping = new Map<string, string>();

   /** Currently available subscriptions - Key: ChannelId */
   //private subscriptions: Map<number, GDAXChannelSubscription> = new Map<number, GDAXChannelSubscription>();
   //private queuedSubscriptions: GDAXChannelSubscription[] = [];

   constructor(private http: Http) {
      this.websocket = new WebSocket(this.websocketUrl);

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
      // this.subscriptions.forEach(x => {
      //    this.unsubscribeFromChannel(x.channelId);
      // });
   }   

   private onWebsocketMessageReceived(message: any) {
      console.log(message);
   }

   private onChannelMessage(message: any) {
      switch(message.type) {
         case "error":
            console.error('## GDAX ## Error - ' + message.message);         
         break;
         case "subscriptions":
         break;

      }

      //push message to subscription
      // if (this.subscriptions.has(channelId)) {
      //    this.subscriptions.get(channelId).pushIntoSubscription(message);
      // }
   }

   /** Gets called if the websocket sends us a message about our current subscriptions */
   private onSubscriptionsMessage(message: any) {
      //it should have the property 'channels'
      if(message.channels && message.channels instanceof Array) {
         for(let channel of message.channels) {
            //check if any of these subscriptions are fulfilled queued subscriptions
            switch(channel.name) {
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
      throw new Error("Method not implemented.");
   }
   unsubscribeFromAssetTrades(pair: string): void {
      throw new Error("Method not implemented.");
   }

   /**
    * Returns array of available asset pairs/products on GDAX.
    */
   getAvailableAssetPairs(): Observable<AssetPair[]> {
      return this.http.get(this.apiUrl + '/products').map(result => {
         let assetPairs: AssetPair[] = [];
         let resultJson = result.json();

         //return empty array if request failed, log error
         if(result.status != 200 ) {
            console.log(`## GDAX ## Error - Failed to request '/products'. Status code: ${result.statusText}`);
         }
         else if(resultJson instanceof Array == false) {
            console.log(`## GDAX ## Error - Failed to parse response of '/products' request. The response was not an array.`);
         }
         else {
            for(let pairJson of resultJson) {
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
         
         return assetPairs;
      });
   }
   getOrderBook(pair: string): OrderBook {
      return new OrderBook();
   }
   getOrderBookMessages(pair: string): Observable<OrderBookMessage> {
      return Observable.empty<OrderBookMessage>();
   }
   unsubscribeFromOrderBook(pair: string): void {
      throw new Error("Method not implemented.");
   }

   getCandlesSnapshot(pair: string, timeFrame: string): Observable<CandleStick[]> {
      if(!this.symbolToProductMapping.has(pair)) {
         console.error(`## GDAX ## Attempted to request candles data for asset pair ${pair} even though we don't have any product id saved for it.`);
         return Observable.empty<CandleStick[]>();
      }

      return this.ensureCandlesSubscription(this.symbolToProductMapping.get(pair), timeFrame).snapshotSubject;
   }
   subscribeToCandles(pair: string, timeFrame: string): Observable<CandleStick> {
      if(!this.symbolToProductMapping.has(pair)) {
         console.error(`## GDAX ## Attempted to request candles data for asset pair ${pair} even though we don't have any product id saved for it.`);
         return Observable.empty<CandleStick>();
      }

      return this.ensureCandlesSubscription(this.symbolToProductMapping.get(pair), timeFrame).subject;
   }

   private ensureCandlesSubscription(productKey: string, timeFrame: string): GdaxCandlesSubscription {
      let mapKey = productKey + timeFrame;

      if(!this.candleSubscriptions.has(mapKey)) {
         let subscription = new GdaxCandlesSubscription(productKey, timeFrame);
         //we receive the candles snapshot over the api, so we don't have to wait for a websocket subscription
         subscription.channelState = ChannelSubscriptionState.Subscribed;
         this.candleSubscriptions.set(mapKey, subscription);

         //request historic rates
         this.http.get(this.apiUrl + subscription.getSnapshotRequestUrl(new Date()))
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
      return Observable.empty<TickerMessage>();
   }
   unsubscribeFromTickerMessages(pair: string): void {
      throw new Error("Method not implemented.");
   }   
}