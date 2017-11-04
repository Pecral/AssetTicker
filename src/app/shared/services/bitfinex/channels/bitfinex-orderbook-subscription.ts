import { OrderBookMessage } from './../../../models/order-book-message';
import { OrderBookPosition } from './../../../models/order-book-position';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { BitfinexChannelSubscription } from '../bitfinex-channel-subscription';
import { AssetOrderType } from '../../../models/asset-order-type';
import { ExchangeInformationType } from '../../../models/exchange-information-type';
import { OrderBook } from '../../../models/order-book';
import { OrderBookSide, OrderBookAction } from '../../../models/order-book-message';

export class BitfinexOrderBookSubscription extends BitfinexChannelSubscription {

   orderbook: OrderBook = new OrderBook();

   exchangeInformationType: ExchangeInformationType = ExchangeInformationType.OrderBook;
   
   pushIntoSubscription(message: any): void {
      //the first message that we'll get is usually a snapshot of the whole orderbook
      //thus we have to iterate over whe orders and handle them one by one
      if(message[1][0] instanceof Array) {
         for(let order of message[1]) {
            this.synchronizeSingleOrder(order);
         }
      }
      else {
         this.synchronizeSingleOrder(message[1]);
      }
   }

   /** Synchronize a single order from the order book
    *  Implementation extracted by documentation in: https://docs.bitfinex.com/v2/reference#ws-public-order-books
    */
   synchronizeSingleOrder(positionMessage:any) {
      let price = positionMessage[0];
      let amountOfOrders = positionMessage[1];
      let volume = positionMessage[2];

      let orderBookSide: OrderBookSide;
      let orderBookAction: OrderBookAction;
      let orderBookPosition: OrderBookPosition;

      //when number of orders at that price level equals 0, we have to remove the bid/ask position
      if(amountOfOrders == 0) {
         let bookSide: OrderBookPosition[];
         orderBookAction = OrderBookAction.Delete;
         switch(volume) {
            case 1:
               bookSide = this.orderbook.bids;
               orderBookSide = OrderBookSide.Bids;
            break;
            case -1:
               bookSide = this.orderbook.asks;
               orderBookSide = OrderBookSide.Asks;
            break;
            default:
               console.warn(`## Bitfinex ## Order Book - Amount of orders at price level ${price} is 0, but volume is neither 1 nor -1 (${volume})`);
            break;
         }

         let positionIndex = bookSide.findIndex(x => x.price == price);

         if(positionIndex >= 0) {
            orderBookPosition = bookSide[positionIndex];
            bookSide.splice(positionIndex, 1);
            if(volume > 1) {
               this.orderbook.bids = bookSide.slice();
            }
            else if(volume == -1) {
               this.orderbook.asks = bookSide.slice();
            }
         }
      }
      else if(amountOfOrders > 0 ) {
         let bookSide : OrderBookPosition[] = volume > 0 ? this.orderbook.bids : this.orderbook.asks;
         orderBookSide = volume > 0 ? OrderBookSide.Bids : OrderBookSide.Asks;
         orderBookAction = OrderBookAction.Update;

         // let orderBookPosition : OrderBookPosition = bookSide.get(price);
         orderBookPosition = bookSide.find(x => x.price == price);

         //if the price-point doesn't already exists, we'll create it
         if(!orderBookPosition) {
            orderBookPosition = new OrderBookPosition();
            orderBookPosition.price = price;
            orderBookPosition.orderType = volume > 0 ? AssetOrderType.Buy : AssetOrderType.Sell;
            orderBookPosition.amountOfOrders = amountOfOrders;
            orderBookPosition.volume = Math.abs(volume);

            bookSide.push(orderBookPosition);
            if(volume > 0) {
               this.orderbook.bids = bookSide.sort((p1, p2) => p2.price - p1.price);
            }
            else {
               this.orderbook.asks = bookSide.sort((p1, p2) => p1.price - p2.price);
            }
         }

         orderBookPosition.amountOfOrders = amountOfOrders;
         orderBookPosition.volume = Math.abs(volume);
      }

      let message = new OrderBookMessage();
      message.action = orderBookAction;
      message.bookSide = orderBookSide;
      message.position = orderBookPosition;
      this.orderbook.orderBookMessage.next(message);
      this.orderbook.calculateVolumeTotal(orderBookSide);
   }
}