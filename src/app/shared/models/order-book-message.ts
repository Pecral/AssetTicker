import { OrderBookPosition } from './order-book-position';
export class OrderBookMessage{
   
   position: OrderBookPosition;

   /** The type of the action (update or delete) */
   action: OrderBookAction;

   /** The affected side of the order book*/
   bookSide: OrderBookSide;
}

export enum OrderBookAction {
   Update,
   Delete
}

export enum OrderBookSide {
   Bids,
   Asks   
}
