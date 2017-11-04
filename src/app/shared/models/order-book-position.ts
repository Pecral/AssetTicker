import { AssetOrderType } from "./asset-order-type";

export class OrderBookPosition {
   orderType: AssetOrderType;

   amountOfOrders: number;

   price: number;

   volume: number;

   /** Accumulated number of currency of all lower order-book positions.. */
   totalVolume: number;
}
