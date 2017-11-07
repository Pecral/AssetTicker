import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { CandleStick } from './../../../models/candle-stick';
import { BitfinexChannelSubscription } from "../bitfinex-channel-subscription";
import { ExchangeInformationType } from "../../../models/exchange-information-type";

export class BitfinexCandlesSubscription extends BitfinexChannelSubscription {
   exchangeInformationType: ExchangeInformationType = ExchangeInformationType.Candles;

   subject: BehaviorSubject<CandleStick> = new BehaviorSubject<CandleStick>(null);

   timeframe: string;

   candlesticks: CandleStick[] = [];

   candlestickSnapshotReceived = new BehaviorSubject<boolean>(false);

   pushIntoSubscription(message: any): void {
      //ignore heartbeats
      if(message[1] == "hb") {
         
      }
      //the first message that we'll get is usually a snapshot of the last x candlesticks
      //thus we have to iterate over whe candle sticks and handle them one by one
      else if(message[1][0] instanceof Array) {
         for(let candleStick of message[1]) {
            this.handleSingleCandleStick(candleStick);
         }

         this.candlestickSnapshotReceived.next(true);
         this.candlestickSnapshotReceived.complete();
      }
      else {
         this.handleSingleCandleStick(message[1]);
      }
   }

   handleSingleCandleStick(candleStick:Array<any>) {
      //bitfinex sometimes sends an empty array that we don't want to process
      if(candleStick.length > 0) {
         let stick: CandleStick = new CandleStick();
         stick.date = new Date(candleStick[0]);
         stick.open = candleStick[1];
         stick.close = candleStick[2];
         stick.high = candleStick[3];
         stick.low = candleStick[4];
         stick.volume = candleStick[5];

         //update latest candle if it's not a new one
         let position = this.candlesticks.findIndex(x => x.date.getTime() == stick.date.getTime());
         
         if (position !== -1) {
            this.candlesticks.splice(position, 1, stick);
         }
         else {
            this.candlesticks.push(stick);
         }         
   
         this.subject.next(stick);
      }
   }
   
}