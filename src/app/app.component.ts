import { OrderBookPosition } from './shared/models/order-book-position';
import { OrderBook } from './shared/models/order-book';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { AssetTrade } from './shared/models/asset-trade';
import { ExchangeTickerHandlerService } from './shared/services/exchange-ticker-handler.service';
import { ExchangeTicker } from './shared/services/exchange-ticker';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ExchangeTickerType } from './shared/models/exchange-ticker-type';

@Component({
   selector: 'app-root',
   templateUrl: './app.component.html',
   styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
   trades: AssetTrade[] = [];
   tradeSubscription: Subscription;

   lastTrade: AssetTrade;

   /** search key for symbol pair search */
   symbolPairSearchKey: string;

   availableSymbolPairs: string[];

   /** current exchange */
   currentExchange: ExchangeTicker;

   /** current symbol pair */
   currentSymbolPair: string = '';

   filteredSymbolPairs: string[] = [];

   constructor(private _exchangeHandler: ExchangeTickerHandlerService) {

   }

   ngOnInit(): void {
      this.currentExchange = this._exchangeHandler.getExchangeTicker(ExchangeTickerType.Bitfinex);
      this.currentExchange.getAvailableAssetPairs().subscribe(result => {
         this.availableSymbolPairs = result.map(x => x.symbol);
      });
   }

   /** This method is called when the user presses enter in the symbol-pair search
    * We'll load the currently entered pair then.
    */
   symbolPairSearchKeyReleased(event) {
      if(event.keyCode == 13) {
         this.loadSymbolPair(this.symbolPairSearchKey);
      }
   }

   /** Filter symbol-pair search based on the current search-key */
   filterSymbolPairs(searchKey) {
      this.filteredSymbolPairs = [];

      for(let availablePair of this.availableSymbolPairs) {
         if (availablePair.toLowerCase().indexOf(searchKey.toLowerCase()) != -1) {
            this.filteredSymbolPairs.push(availablePair);
         }
      }     
   }

   /** Load trades, orderbooks and candle sticks of specific symbol pair */
   loadSymbolPair(pair: string): void {
      //if the pair is not available or we're already subscribed to it, we'll do nothing
      //TODO: Alert window
      if (!this.availableSymbolPairs.find(availablePair => availablePair.toLowerCase() == pair.toLowerCase()) || this.currentSymbolPair.toLowerCase() == pair.toLowerCase()) {
         //console.error(`Requested asset pair ${pair} is not available for this exchange!`);
         return;
      }

      //unsubsribe from old pair
      if (this.tradeSubscription) {
         this.tradeSubscription.unsubscribe();
         this.currentExchange.unsubscribeFromAssetTrades(this.currentSymbolPair);
         this.currentExchange.unsubscribeFromOrderBook(this.currentSymbolPair);
      }

      this.trades = [];
      this.currentSymbolPair = pair.toUpperCase();
      this.symbolPairSearchKey = this.currentSymbolPair; //refresh search key for proper upper-case

      this.currentExchange.websocketIsConnected.subscribe(isOpen => {

         //wait till the websocket is open
         if (isOpen) {
            //always save the latest subscripton
            this.tradeSubscription = this.currentExchange.subscribeToAssetTrades(pair).filter(trade => trade !== null).subscribe(assetTrade => {
               this.lastTrade = assetTrade;
            });
         }
      })
   }
}
