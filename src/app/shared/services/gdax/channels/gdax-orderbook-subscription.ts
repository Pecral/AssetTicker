import { GdaxChannelSubscription, ChannelSubscriptionState } from "../gdax-channel-subscription";
import { AssetPair } from "../../../models/asset-pair";
import { ExchangeInformationType } from "../../../models/exchange-information-type";
import { OrderBook } from "../../../models/order-book";
import { OrderBookPosition } from "../../../models/order-book-position";
import { AssetOrderType } from "../../../models/asset-order-type";
import { OrderBookSide, OrderBookMessage, OrderBookAction } from "../../../models/order-book-message";

export class GdaxOrderBookSubscription implements GdaxChannelSubscription { 
   key: string;
   assetPair: AssetPair;
   subscriptionType: string;
   exchangeInformationType: ExchangeInformationType = ExchangeInformationType.OrderBook;
   channelState: ChannelSubscriptionState;

   orderbook: OrderBook = new OrderBook();

   /** Internal order book with all positions */
   private internalOrderBook: OrderBook = new OrderBook();

   pushIntoSubscription(message: any): void {
      
   }

   pushSnapshotIntoSubscription(snapshot:GdaxOrderBookSnapshot) {
      //iterate over asks (first 25 for now because we didn't implement granuality yet)
      
      for(let ask of snapshot.asks) {
         let position = new OrderBookPosition();
         position.orderType = AssetOrderType.Sell;
         position.price = parseFloat(ask[0]);
         position.volume = parseFloat(ask[1]);

         this.internalOrderBook.asks.push(position);
      }

      this.internalOrderBook.asks = this.internalOrderBook.asks.sort((p1, p2) => p1.price - p2.price);

      for(let bid of snapshot.bids) {
         let position = new OrderBookPosition();
         position.orderType = AssetOrderType.Buy;
         position.price = parseFloat(bid[0]);
         position.volume = parseFloat(bid[1]);

         this.internalOrderBook.bids.push(position);
      }      

      this.internalOrderBook.bids = this.internalOrderBook.bids.sort((p1, p2) => p2.price - p1.price);

      this.orderbook.bids = this.internalOrderBook.bids.slice(0, 25);
      this.orderbook.asks = this.internalOrderBook.asks.slice(0, 25);

      this.orderbook.calculateVolumeTotal(OrderBookSide.Bids);
      this.orderbook.calculateVolumeTotal(OrderBookSide.Asks);
   }

   pushL2UpdateIntoSubscription(l2update: GdaxL2Update) {
      for(let change of l2update.changes) {
         let orderAction = change[0].toLowerCase() == "buy" ? AssetOrderType.Buy : AssetOrderType.Sell;
         let bookSideType = orderAction == AssetOrderType.Buy ? OrderBookSide.Bids : OrderBookSide.Asks;
         let price = parseFloat(change[1]); 
         let size = parseFloat(change[2]);

         let bookSide : OrderBookPosition[] = change[0].toLowerCase() == "buy" ? this.internalOrderBook.bids : this.internalOrderBook.asks;
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
}