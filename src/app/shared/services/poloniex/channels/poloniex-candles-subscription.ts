import { AssetPair } from "../../../models/asset-pair";
import { ExchangeInformationType } from "../../../models/exchange-information-type";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { CandleStick } from "../../../models/candle-stick";
import { TimeframeResolver } from "../../../helper/timeframe-resolver";

export class PoloniexCandlesSubscription {

   /** The asset pair symbol which is used in this channel e.g. BTCUSD */
   key: string;
   
   /** The asset pair of this subscription */
   assetPair: AssetPair;
   
   /** Information about the information type which is delivered in this channel (trades, order book etc.) */
   exchangeInformationType: ExchangeInformationType = ExchangeInformationType.Candles;

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

   
   getSnapshotRequestUrl(endDate: Date):string {
      return `returnChartData&currencyPair=${this.key}&start=1405699200&end=9999999999&period=${this.timeframeSeconds}`;
   }

   /** Resolves a snapshot of candlesticks */
   resolveSnapshot(snapshotJson:ChartDataModel[]) {
      for(let candleJson of snapshotJson) {
         let candlestick = new CandleStick();
         candlestick.date = new Date(candleJson.date * 1000);
         candlestick.low = candleJson.low;
         candlestick.high = candleJson.high;
         candlestick.open = candleJson.open;
         candlestick.close = candleJson.close;
         candlestick.volume = candleJson.volume;

         this.candles.push(candlestick);
      }

      //push into snapshot subject
      this.snapshotSubject.next(this.candles);
   }

   pushIntoSubscription(message: any): void {
      throw new Error("Method not implemented.");
   }
}