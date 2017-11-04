import { TickerMessage } from './../../../models/ticker-message';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { ExchangeInformationType } from './../../../models/exchange-information-type';
import { BitfinexChannelSubscription } from "../bitfinex-channel-subscription";

export class BitfinexTickerSubscription extends BitfinexChannelSubscription {
   exchangeInformationType: ExchangeInformationType = ExchangeInformationType.Ticker;

   tickerObservable: BehaviorSubject<TickerMessage> = new BehaviorSubject<TickerMessage>(null);

   pushIntoSubscription(message: any): void {

      //ignore heartbeats
      if(message[1] !== 'hb') {


         let tickerMessage = new TickerMessage( );
         tickerMessage.bid = message[1][0];
         tickerMessage.bidSize = message[1][1];
         tickerMessage.ask = message[1][2];
         tickerMessage.askSize = message[1][3];
         tickerMessage.dailyChange = message[1][4];
         tickerMessage.dailyChangePercent = message[1][5] * 100; //multiply with 100 so that value == 1 == 1 percent
         tickerMessage.lastPrice = message[1][6];
         tickerMessage.volume = message[1][7];
         tickerMessage.high = message[1][8];
         tickerMessage.low = message[1][9];
   
         this.tickerObservable.next(tickerMessage);
      }
   }
}