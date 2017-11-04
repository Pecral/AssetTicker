import { AssetPair } from "./asset-pair";
import { TickerMessage } from "./ticker-message";

export class ExchangeAssetPair {
   exchange: string;

   pair: AssetPair;

   latestTicker: TickerMessage;
}