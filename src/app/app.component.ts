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
export class AppComponent {

   constructor() {

   }


}
