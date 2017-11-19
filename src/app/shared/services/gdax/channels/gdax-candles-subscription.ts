import { GdaxChannelSubscription, ChannelSubscriptionState } from "../gdax-channel-subscription";
import { AssetPair } from "../../../models/asset-pair";
import { ExchangeInformationType } from "../../../models/exchange-information-type";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { CandleStick } from "../../../models/candle-stick";
import { TimeframeResolver } from "../../../helper/timeframe-resolver";

export class GdaxCandlesSubscription implements GdaxChannelSubscription {

   /** The asset pair symbol which is used in this channel e.g. BTCUSD */
   key: string;
   
   /** The asset pair of this subscription */
   assetPair: AssetPair;
   
   /** Information about the information type which is delivered in this channel (trades, order book etc.) */
   exchangeInformationType: ExchangeInformationType = ExchangeInformationType.Candles;
   
   /** Specifies the subscription's state to the channel (subscribed, unsubscribed, queued) */
   channelState: ChannelSubscriptionState;

   /** Specifies the candle's timeframe in seconds */
   timeframeSeconds: number; 

   subject: BehaviorSubject<CandleStick> = new BehaviorSubject<CandleStick>(null);

   snapshotSubject: BehaviorSubject<CandleStick[]> = new BehaviorSubject<CandleStick[]>(null);

   candles: CandleStick[] = [];

   constructor(product: string, timeframeString: string) {
      //resolve timeframe to number
      this.timeframeSeconds = TimeframeResolver.resolveToMinutes(timeframeString) * 60;
      this.key = product;
   }

   /** Build candles request url based on documentation at https://docs.gdax.com/#get-historic-rates */
   getSnapshotRequestUrl(endDate: Date):string {
      //we can only request a period of 200-candlesticks, so we have to calculate the start-date based on our timeframe
      //multiply timeframeseconds * 1000 to get milliseconds and * 200 to get 200 candles -> 200k
      let startDate: Date = new Date(endDate.getTime() - (this.timeframeSeconds * 200000));

      return `/products/${this.key}/candles?start=${startDate.toISOString()}&end=${endDate.toISOString()}&granularity=${this.timeframeSeconds}`;
   }

   /** Resolves a snapshot of candlesticks */
   resolveSnapshot(snapshotJson:any) {
      if(snapshotJson instanceof Array) {
         for(let candleJson of snapshotJson) {
            let candlestick = new CandleStick();
            candlestick.date = new Date(candleJson[0] * 1000);
            candlestick.low = candleJson[1];
            candlestick.high = candleJson[2];
            candlestick.open = candleJson[3];
            candlestick.close = candleJson[4];
            candlestick.volume = candleJson[5];

            this.candles.push(candlestick);
         }

         //push into snapshot subject
         this.snapshotSubject.next(this.candles);
      }
   }

   pushIntoSubscription(message: any): void {
      throw new Error("Method not implemented.");
   }
}