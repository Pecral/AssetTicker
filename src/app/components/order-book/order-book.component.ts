import { Component, OnInit, Input, OnChanges } from '@angular/core';

import { OrderBookPosition } from './../../shared/models/order-book-position';
import { ExchangeTickerHandlerService } from './../../shared/services/exchange-ticker-handler.service';
import { OrderBook } from './../../shared/models/order-book';
import { ExchangeTickerType } from '../../shared/models/exchange-ticker-type';

@Component({
   selector: 'order-book',
   templateUrl: './order-book.component.html',
   styleUrls: ['./order-book.component.scss']
})
export class OrderBookComponent implements OnInit {

   private _symbolPair: string;
   @Input()
   set symbolPair(value: string) {
      this._symbolPair = value;
      this.loadOrderBook();
   }
   get symbolPair(): string {
      return this._symbolPair;
   }

   private _exchangeTickerType: ExchangeTickerType;
   @Input()
   set exchangeTickerType(value: ExchangeTickerType) {
      this._exchangeTickerType = value;
      this.loadOrderBook();
   }
   get exchangeTickerType(): ExchangeTickerType {
      return this._exchangeTickerType;
   }

   @Input()
   bookSide: string;

   @Input()
   reversedRows:boolean;

   orderBook: OrderBook;
   isLoaded: boolean;

   constructor(private exchangeHandler: ExchangeTickerHandlerService) { }

   ngOnInit() {
      this.loadOrderBook();
   }

   /** Load order book with the currently saved configuration */
   loadOrderBook(): void {
      if(this._symbolPair && this._exchangeTickerType !== undefined && this.bookSide) {
         let currentExchange = this.exchangeHandler.getExchangeTicker(this._exchangeTickerType);

         currentExchange.websocketIsConnected.subscribe(isConnected => {
            if(isConnected) {
               this.orderBook = currentExchange.getOrderBook(this._symbolPair);
               this.isLoaded = true;
            }
         });
      }
   }

   getBookSide():OrderBookPosition[] {
      return this.bookSide == "asks" ? this.orderBook.asks : this.orderBook.bids;
   }
}
