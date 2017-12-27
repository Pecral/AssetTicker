import { AssetPair } from "../../../models/asset-pair";
import { ExchangeInformationType } from "../../../models/exchange-information-type";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { TickerMessage } from "../../../models/ticker-message";

export class PoloniexTickerSubscription {
   
   /** The asset pair symbol which is used in this channel e.g. BTCUSD */
   key: string;
   
   /** The asset pair of this subscription */
   assetPair: AssetPair;
   
   /** Information about the information type which is delivered in this channel (trades, order book etc.) */
   exchangeInformationType: ExchangeInformationType;

   subject: BehaviorSubject<TickerMessage> = new BehaviorSubject<TickerMessage>(null);

   /** The last ticker message */
   latestTicker: TickerMessage;

   subscriptionType: string = "ticker";
 
   pushIntoSubscription(message: any): void {
      //websocket ticker message should be an array
      if(message instanceof Array) {
         let ticker = new TickerMessage();
         ticker.lastPrice = parseFloat(message[1]);
         //message 2 && 3 is lowestAsk && highestBid, not needed at the moment
         ticker.dailyChangePercent = parseFloat(message[4]);
         ticker.volume = parseFloat(message[6]); //message [6] == quote volume
         ticker.timestamp = new Date();
         ticker.open = ticker.lastPrice / ( 1 + ticker.dailyChangePercent); //calculate start value;
         ticker.dailyChange = ticker.lastPrice - ticker.open;

         this.subject.next(ticker);
      }
   }

   pushApiResultsIntoSubscription(tickerMessage: TickerMessage) {
      if(this.isNewerThanLatestTick(tickerMessage.timestamp)) {
         this.subject.next(tickerMessage);
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