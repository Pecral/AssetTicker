import { AssetPair } from "../../../models/asset-pair";
import { ExchangeInformationType } from "../../../models/exchange-information-type";
import { OrderBook } from "../../../models/order-book";
import { OrderBookPosition } from "../../../models/order-book-position";
import { AssetOrderType } from "../../../models/asset-order-type";
import { OrderBookSide, OrderBookMessage, OrderBookAction } from "../../../models/order-book-message";

export class BitstampOrderBookSubscription { 
   key: string;
   assetPair: AssetPair;
   subscriptionType: string;
   exchangeInformationType: ExchangeInformationType = ExchangeInformationType.OrderBook;

   orderbook: OrderBook = new OrderBook();

   /** Internal order book with all positions */
   private internalOrderBook: OrderBook = new OrderBook();

   pushIntoSubscription(message: any): void {
      
   }

   pushSnapshotIntoSubscription(snapshot:any) {
      //iterate over asks (first 25 for now because we didn't implement granularity yet)
      
      let orderbook = snapshot.orderBook;
      let asks = orderbook[0];
      let bids = orderbook[1];
      
      for(let askPrice in asks) {
         let askVolume = asks[askPrice];
         let position = new OrderBookPosition();
         position.orderType = AssetOrderType.Sell;
         position.price = parseFloat(askPrice);
         position.volume = parseFloat(askVolume);

         this.internalOrderBook.asks.push(position);
      }

      this.internalOrderBook.asks = this.internalOrderBook.asks.sort((p1, p2) => p1.price - p2.price);

      for(let bidPrice in bids) {
         let bidVolume = bids[bidPrice];
         let position = new OrderBookPosition();
         position.orderType = AssetOrderType.Buy;
         position.price = parseFloat(bidPrice);
         position.volume = parseFloat(bidVolume);

         this.internalOrderBook.bids.push(position);
      }      

      this.internalOrderBook.bids = this.internalOrderBook.bids.sort((p1, p2) => p2.price - p1.price);

      this.orderbook.bids = this.internalOrderBook.bids.slice(0, 25);
      this.orderbook.asks = this.internalOrderBook.asks.slice(0, 25);

      this.orderbook.calculateVolumeTotal(OrderBookSide.Bids);
      this.orderbook.calculateVolumeTotal(OrderBookSide.Asks);
   }

   pushUpdateIntoSubscription(update: any) {
      let orderAction = update[1] == 1 ? AssetOrderType.Buy : AssetOrderType.Sell;
      let bookSideType = orderAction == AssetOrderType.Buy ? OrderBookSide.Bids : OrderBookSide.Asks;
      let price = parseFloat(update[2]); 
      let size = parseFloat(update[3]);

      let bookSide : OrderBookPosition[] = update[1] == 1 ? this.internalOrderBook.bids : this.internalOrderBook.asks;
      let index = bookSide.findIndex(x => x.price == price);

      //delete position if it exists in our order book side
      if(size == 0 && index != -1) {
         let position = bookSide.splice(index, 1)[0];

         if(orderAction == AssetOrderType.Buy) {
            this.orderbook.bids = bookSide.slice(0, 25);
         }
         else {
            this.orderbook.asks = bookSide.slice(0, 25);
         }
      }
      else if(size != 0) {
         let position = new OrderBookPosition();
         position.price = price;
         position.volume = size;
         position.orderType = orderAction;

         let addedPosition: boolean = false;

         if(index != -1) {
            bookSide[index].volume = size;
         }
         else {
            bookSide.push(position);
            addedPosition = true;
         }

         if(addedPosition) {
            if(orderAction == AssetOrderType.Buy) {
               this.internalOrderBook.bids = bookSide.sort((p1, p2) => p2.price - p1.price);
               this.orderbook.bids = bookSide.slice(0, 25);
            }
            else {
               this.internalOrderBook.asks = bookSide.sort((p1, p2) => p1.price - p2.price);
               this.orderbook.asks = bookSide.slice(0, 25);
            }
         }
      }

      this.orderbook.calculateVolumeTotal(bookSideType);
   }
}