import { OrderBookMessage, OrderBookSide } from './order-book-message';
import { EventEmitter } from '@angular/core';
import { OrderBookPosition } from './order-book-position';
import { Subject } from 'rxjs';

export class OrderBook {
   orderBookMessage = new Subject<OrderBookMessage>();

   bids: OrderBookPosition[] = [];
   asks: OrderBookPosition[] = [];

   /** Performance-heavy method to update the volume total of a order book side
    * We could improve this algorithm by only updating the positions which are higher in the order book than the last updated/deleted position
    */
   calculateVolumeTotal( bookSide: OrderBookSide) {
      let book = bookSide == OrderBookSide.Asks ? this.asks : this.bids;

      let currentVolume: number = 0;

      for(let index = 0; index < book.length; index++) {
         let positionToUpdate = book[index];
         positionToUpdate.totalVolume = positionToUpdate.volume + currentVolume;
         currentVolume = positionToUpdate.totalVolume;
      }
   }
}