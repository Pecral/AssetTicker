import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { AssetPair } from "./asset-pair";
import { TickerMessage } from "./ticker-message";

export class ExchangeAssetPair {
   exchange: string;

   pair: AssetPair;

   private _latestTicker: TickerMessage;

   set latestTicker(ticker: TickerMessage) {
      if(this._latestTicker) {
         if(this._latestTicker.lastPrice < ticker.lastPrice) {
            this.priceChangeState.next(PriceChangeState.Risen);
         }
         else if(this._latestTicker.lastPrice == ticker.lastPrice) {
            this.priceChangeState.next(PriceChangeState.Neutral);
         }
         else {
            this.priceChangeState.next(PriceChangeState.Dropped);
         }
      }

      this._latestTicker = ticker;
   }
   get latestTicker(): TickerMessage {
      return this._latestTicker;
   }

   priceChangeState: BehaviorSubject<PriceChangeState> = new BehaviorSubject(PriceChangeState.Neutral);
}

export enum PriceChangeState {
   Dropped,
   Neutral,
   Risen
}