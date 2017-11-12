import { TickerMessage } from './../../models/ticker-message';
import { OrderBookMessage } from './../../models/order-book-message';
import { ExchangeTickerType } from './../../models/exchange-ticker-type';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Injectable, OnDestroy } from '@angular/core';
import { ExchangeTicker } from '../exchange-ticker';
import { Http } from '@angular/http';
import { AssetHandlerService } from '../asset-handler/asset-handler.service';
import { ExchangeInformationType } from '../../models/exchange-information-type';
import { Observable } from 'rxjs/Observable';
import { AssetTrade } from '../../models/asset-trade';
import { AssetPair } from '../../models/asset-pair';
import { OrderBook } from '../../models/order-book';
import { CandleStick } from '../../models/candle-stick';

@Injectable()
export class GdaxExchangeService implements ExchangeTicker, OnDestroy {
   public websocketIsConnected = new BehaviorSubject<boolean>(false);
   public exchangeType: ExchangeTickerType = ExchangeTickerType.GDAX;

   private websocket: WebSocket;

   /** Currently available subscriptions - Key: ChannelId */
   //private subscriptions: Map<number, GDAXChannelSubscription> = new Map<number, GDAXChannelSubscription>();
   //private queuedSubscriptions: GDAXChannelSubscription[] = [];

   constructor(private http: Http, private assetHandler: AssetHandlerService) {
      console.log('## GDAX ## Initialize Websocket');
      this.websocket = new WebSocket('wss://ws-feed.gdax.com');

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
      //it "should" be an array
      //the first entry is always the channel id
      let channelId = message[0];

      //push message to subscription
      // if (this.subscriptions.has(channelId)) {
      //    this.subscriptions.get(channelId).pushIntoSubscription(message);
      // }
   }

   /** Respond to an event which is sent by the websocket (e.g. a new subscription) */
   private onGDAXEvent(message: any) {
      // let channel: GDAXChannelSubscription;

   }

   /** Print an error to the console of something fails. */
   private onWebsocketError(error: any) {
      console.error('## GDAX ## Error - ' + error);
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

   subscribeToAssetTrades(pair: string): Observable<AssetTrade> {
      throw new Error("Method not implemented.");
   }
   unsubscribeFromAssetTrades(pair: string): void {
      throw new Error("Method not implemented.");
   }
   getAvailableAssetPairs(): Observable<AssetPair[]> {
      throw new Error("Method not implemented.");
   }
   getOrderBook(pair: string): OrderBook {
      throw new Error("Method not implemented.");
   }
   getOrderBookMessages(pair: string): Observable<OrderBookMessage> {
      throw new Error("Method not implemented.");
   }
   unsubscribeFromOrderBook(pair: string): void {
      throw new Error("Method not implemented.");
   }
   getCandlesSnapshot(pair: string, timeFrame: string): CandleStick[] {
      throw new Error("Method not implemented.");
   }
   receivedCandlestickSnapshot(pair: string, timeFrame: string): BehaviorSubject<boolean> {
      throw new Error("Method not implemented.");
   }
   subscribeToCandles(pair: string, timeFrame: string): Observable<CandleStick> {
      throw new Error("Method not implemented.");
   }
   unsubscribeFromCandles(pair: string, timeFrame: string): void {
      throw new Error("Method not implemented.");
   }
   subscribeToTickerMessages(pair: string): Observable<TickerMessage> {
      throw new Error("Method not implemented.");
   }
   unsubscribeFromTickerMessages(pair: string): void {
      throw new Error("Method not implemented.");
   }   
}