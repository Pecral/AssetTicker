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