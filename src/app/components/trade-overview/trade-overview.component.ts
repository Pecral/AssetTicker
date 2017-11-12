import { Component, OnInit, Input, SimpleChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { ExchangeTickerHandlerService } from './../../shared/services/exchange-ticker-handler.service';
import { AssetTrade } from './../../shared/models/asset-trade';
import { ExchangeTickerType } from '../../shared/models/exchange-ticker-type';
import { ExchangeTicker } from '../../shared/services/exchange-ticker';

@Component({
   selector: 'trade-overview',
   templateUrl: './trade-overview.component.html',
   styleUrls: ['./trade-overview.component.scss']
})
export class TradeOverviewComponent implements OnDestroy {
   trades: AssetTrade[] = [];
   tradeSubscription: Subscription;

   private _symbolPair: string;
   @Input()
   set symbolPair(value: string) {
      if (this.currentExchange && this._symbolPair && value != this._symbolPair) {
         this.unsubscribe();
      }

      this._symbolPair = value;
      this.loadAssetTrades();
   }
   get symbolPair(): string {
      return this._symbolPair;
   }

   private _exchangeTickerType: ExchangeTickerType;
   @Input()
   set exchangeTickerType(value: ExchangeTickerType) {
      if (this.currentExchange && this._symbolPair && value != this._exchangeTickerType) {
         this.unsubscribe();
      }

      this._exchangeTickerType = value;
      this.loadAssetTrades();
   }
   get exchangeTickerType(): ExchangeTickerType {
      return this._exchangeTickerType;
   }

   currentExchange: ExchangeTicker;

   constructor(private exchangeHandler: ExchangeTickerHandlerService) { }

   /** Load order book with the currently saved configuration */
   loadAssetTrades(): void {
      if (this.symbolPair && this.exchangeTickerType !== undefined) {
         this.trades = [];
         this.currentExchange = this.exchangeHandler.getExchangeTicker(this.exchangeTickerType);

         this.currentExchange.websocketIsConnected.subscribe(isConnected => {
            if (isConnected) {
               //always save the latest subscripton
               this.tradeSubscription = this.currentExchange.subscribeToAssetTrades(this._symbolPair).filter(trade => trade !== null).subscribe(assetTrade => {
                  if (this.trades.length >= 50) {
                     this.trades.splice(this.trades.length - 1, 1);
                  }
                  this.trades.unshift(assetTrade);
               });
            }
         });
      }
   }

   unsubscribe() {
      this.tradeSubscription.unsubscribe();
      this.currentExchange.unsubscribeFromAssetTrades(this._symbolPair);
   }

   /** Returns whether the asset-shortcode is represented by a font-awesome class */
   hasFontAwesomeSymbol(shortcode: string): boolean {
      let availableShortcodes = ["btc", "cny", "eur", "gbp", "ils", "inr", "jpy", "krw", "rmb", "rub", "try", "usd", "won", "yen"];

      return availableShortcodes.find(x => x.toLowerCase() == shortcode.toLowerCase()) !== undefined;
   }

   ngOnDestroy(): void {
      this.unsubscribe();
   }   

}
