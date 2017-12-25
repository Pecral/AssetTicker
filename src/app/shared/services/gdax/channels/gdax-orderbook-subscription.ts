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


   pushIntoSubscription(message: any): void {
      
   }

   pushSnapshotIntoSubscription(snapshot:GdaxOrderBookSnapshot) {
      //iterate over asks (first 25 for now because we didn't implement granuality yet)
      
      for(let index = 0; index < 25 && index < snapshot.asks.length; index++) {
         let ask = snapshot.asks[index];
         let position = new OrderBookPosition();
         position.orderType = AssetOrderType.Sell;
         position.price = parseFloat(ask[0]);
         position.volume = parseFloat(ask[1]);

         this.orderbook.asks.push(position);
      }

      this.orderbook.asks = this.orderbook.asks.sort((p1, p2) => p1.price - p2.price);
      this.orderbook.calculateVolumeTotal(OrderBookSide.Asks);

      for(let index = 0; index < 25 && index < snapshot.bids.length; index++) {
         let bid = snapshot.bids[index];
         let position = new OrderBookPosition();
         position.orderType = AssetOrderType.Buy;
         position.price = parseFloat(bid[0]);
         position.volume = parseFloat(bid[1]);

         this.orderbook.bids.push(position);
      }      

      this.orderbook.bids = this.orderbook.bids.sort((p1, p2) => p2.price - p1.price);
      this.orderbook.calculateVolumeTotal(OrderBookSide.Bids);
   }

   pushL2UpdateIntoSubscription(l2update: GdaxL2Update) {
      // for(let change of l2update.changes) {
      //    let orderAction = change[0].toLowerCase() == "buy" ? AssetOrderType.Buy : AssetOrderType.Sell;
      //    let bookSideType = orderAction == AssetOrderType.Buy ? OrderBookSide.Bids : OrderBookSide.Asks;
      //    let price = parseFloat(change[1]); 
      //    let size = parseFloat(change[2]);

      //    let bookSide : OrderBookPosition[] = change[0].toLowerCase() == "buy" ? this.orderbook.bids : this.orderbook.asks;
      //    let index = bookSide.findIndex(x => x.price == price);

      //    //delete position if it exists in our order book side
      //    if(size == 0 && index != -1) {
      //       let position = bookSide.splice(index, 1)[0];

      //       let message = new OrderBookMessage();
      //       message.action = OrderBookAction.Delete;
      //       message.bookSide = bookSideType;
      //       message.position = position;
      //       this.orderbook.orderBookMessage.next(message);
      //    }
      //    else if(size != 0) {
      //       let position = new OrderBookPosition();
      //       position.price = price;
      //       position.volume = size;
      //       position.orderType = orderAction;

      //       let updatedPosition: boolean = false;

      //       switch(orderAction) {
      //          case AssetOrderType.Buy:
      //             //add only if the order book doesn't contain 25 positions or if it's within our range of displayed positions
      //             if(bookSide.length < 25 || bookSide[bookSide.length - 1].price >= price){
      //                bookSide.push(position);
      //                updatedPosition = true;
      //             }
      //             this.orderbook.bids = bookSide.sort((p1, p2) => p2.price - p1.price);
      //          break;
      //          case AssetOrderType.Sell:
      //             //add only if the order book doesn't contain 25 positions or if it's within our range of displayed positions
      //             if(bookSide.length < 25 || bookSide[bookSide.length - 1].price <= price){
      //                bookSide.push(position);
      //                updatedPosition = true;
      //             }
      //             this.orderbook.asks = bookSide.sort((p1, p2) => p1.price - p2.price);
      //          break;
      //       }

      //       this.orderbook.calculateVolumeTotal(bookSideType);

      //       if(updatedPosition) {
      //          let message = new OrderBookMessage();
      //          message.action = OrderBookAction.Update;
      //          message.bookSide = bookSideType;
      //          message.position = position;
      //          this.orderbook.orderBookMessage.next(message);
      //       }
      //    }
      // }
   }
}