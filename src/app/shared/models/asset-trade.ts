import { AssetOrderType } from "./asset-order-type";
import { Asset } from "./asset";

export class AssetTrade {
   dominantAsset: Asset;
   secondaryAsset: Asset;

   timestamp : Date;

   price : number;

   volume : number;

   tradeType : AssetOrderType;
}