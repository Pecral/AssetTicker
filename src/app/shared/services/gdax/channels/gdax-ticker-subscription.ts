import { GdaxChannelSubscription, ChannelSubscriptionState } from "../gdax-channel-subscription";
import { AssetPair } from "../../../models/asset-pair";
import { ExchangeInformationType } from "../../../models/exchange-information-type";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { TickerMessage } from "../../../models/ticker-message";

export class GdaxTickerSubscription implements GdaxChannelSubscription {
   
   /** The asset pair symbol which is used in this channel e.g. BTCUSD */
   key: string;
   
   /** The asset pair of this subscription */
   assetPair: AssetPair;
   
   /** Information about the information type which is delivered in this channel (trades, order book etc.) */
   exchangeInformationType: ExchangeInformationType;
   
   /** Specifies the subscription's state to the channel (subscribed, unsubscribed, queued) */
   channelState: ChannelSubscriptionState;

   subject: BehaviorSubject<TickerMessage> = new BehaviorSubject<TickerMessage>(null);

   /** The last ticker message */
   latestTicker: TickerMessage;

   subscriptionType: string = "ticker";
 
   pushIntoSubscription(message: any): void {
      //if time-property is available, check if it's newer
      if(message.time ) {
         let timestamp = new Date(Date.parse(message.time))
         if(!this.isNewerThanLatestTick(timestamp)) {
            return;
         }
      }
      
      let tickerMessage = new TickerMessage();

      tickerMessage.lastPrice = parseFloat(message.price);
      tickerMessage.high = parseFloat(message.high_24h);
      tickerMessage.low = parseFloat(message.low_24h);
      tickerMessage.ask = parseFloat(message.best_ask);
      tickerMessage.bid = parseFloat(message.best_bid);
      tickerMessage.volume = parseFloat(message.volume_24h);
      tickerMessage.open = parseFloat(message.open_24h);

      this.calculateDailyChangeStats(tickerMessage);
      this.subject.next(tickerMessage);
   }

   pushApiResultsIntoSubscription(statsResult: any, tickerResult:any) {
      let timestamp = new Date(Date.parse(tickerResult.time));

      if(this.isNewerThanLatestTick(timestamp)) {
         let message = new TickerMessage();;
         this.latestTicker = message;
         message.timestamp = timestamp;
         message.high = parseFloat(statsResult.high);
         message.low = parseFloat(statsResult.low);         
         message.open = parseFloat(statsResult.open);
         message.ask = parseFloat(tickerResult.ask);
         message.bid = parseFloat(tickerResult.bid);
         message.lastPrice = parseFloat(tickerResult.price);
         message.volume = parseFloat(tickerResult.volume);

         this.calculateDailyChangeStats(message);

         this.subject.next(message);
      }
   }

   private isNewerThanLatestTick(timestamp: Date): boolean {
      return !this.latestTicker || this.latestTicker.timestamp.getTime() < timestamp.getTime();
   }

   calculateDailyChangeStats(tickerMessage: TickerMessage): void {
      if(tickerMessage && tickerMessage.open && tickerMessage.lastPrice) {
         tickerMessage.dailyChange = tickerMessage.lastPrice - tickerMessage.open;
         tickerMessage.dailyChangePercent = tickerMessage.dailyChange/ tickerMessage.open * 100;
      }
   }
}

export class DailyTickerStats {

}