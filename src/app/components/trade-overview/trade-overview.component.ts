import { Subscription } from 'rxjs/Subscription';
import { ExchangeTickerHandlerService } from './../../shared/services/exchange-ticker-handler.service';
import { AssetTrade } from './../../shared/models/asset-trade';
import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { ExchangeTickerType } from '../../shared/models/exchange-ticker-type';
import { ExchangeTicker } from '../../shared/services/exchange-ticker';

@Component({
  selector: 'trade-overview',
  templateUrl: './trade-overview.component.html',
  styleUrls: ['./trade-overview.component.scss']
})
export class TradeOverviewComponent {

  trades: AssetTrade[] = [];
  tradeSubscription: Subscription;

  private _symbolPair: string;
  @Input()
  set symbolPair(value: string) {
    if (this.currentExchange && this._symbolPair && value != this._symbolPair) {
      this.tradeSubscription.unsubscribe();
      this.currentExchange.unsubscribeFromAssetTrades(this._symbolPair);
    }

    this._symbolPair = value;
    this.loadOrderBook();
  }
  get symbolPair(): string {
    return this._symbolPair;
  }

  private _exchangeTickerType: ExchangeTickerType;
  @Input()
  set exchangeTickerType(value: ExchangeTickerType) {
    if (this.currentExchange && this._symbolPair && value != this._exchangeTickerType) {
      this.tradeSubscription.unsubscribe();
      this.currentExchange.unsubscribeFromAssetTrades(this._symbolPair);
    }

    this._exchangeTickerType = value;
    this.loadOrderBook();
  }
  get exchangeTickerType(): ExchangeTickerType {
    return this._exchangeTickerType;
  }

  currentExchange: ExchangeTicker;

  constructor(private exchangeHandler: ExchangeTickerHandlerService) { }


  /** Load order book with the currently saved configuration */
  loadOrderBook(): void {
    if (this.symbolPair && this.exchangeTickerType !== undefined) {
      this.currentExchange = this.exchangeHandler.getExchangeTicker(this.exchangeTickerType);

      this.currentExchange.websocketIsConnected.subscribe(isConnected => {
        if (isConnected) {
          console.log('subscribe to trade asset');
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


  /** Returns whether the asset-shortcode is represented by a font-awesome class */
  hasFontAwesomeSymbol(shortcode: string): boolean {
    let availableShortcodes = ["btc", "cny", "eur", "gbp", "ils", "inr", "jpy", "krw", "rmb", "rub", "try", "usd", "won", "yen"];

    return availableShortcodes.find(x => x.toLowerCase() == shortcode.toLowerCase()) !== undefined;
  }

}
