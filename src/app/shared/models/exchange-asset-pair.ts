import { CandleStick } from './candle-stick';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { AssetPair } from "./asset-pair";
import { TickerMessage } from "./ticker-message";

export class ExchangeAssetPair {
   exchange: string;

   pair: AssetPair;

   latestTicker: TickerMessage;

   candles: CandleStick[] = [];
}

export enum PriceChangeState {
   Falling,
   Neutral,
   Rising
}