import { AssetDetailComponent } from './components/asset-detail/asset-detail.component';
import { AssetOverviewComponent } from './components/asset-overview/asset-overview.component';
import { TechanLiveComponent } from './components/techan-live/techan-live.component';
import { TechanChartComponent } from './components/techan-chart/techan-chart.component';
import { ChartComponent } from './components/chart/chart.component';
import { TradeOverviewComponent } from './components/trade-overview/trade-overview.component';
import { OrderBookComponent } from './components/order-book/order-book.component';
import { AssetHandlerService } from './shared/services/asset-handler/asset-handler.service';
import { ExchangeTickerHandlerService } from './shared/services/exchange-ticker-handler.service';
import { BitfinexTickerService } from './shared/services/bitfinex/bitfinex-ticker.service';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule, LOCALE_ID } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {AutoCompleteModule, DropdownModule} from 'primeng/primeng';
import {PerfectScrollbarModule, PerfectScrollbarConfigInterface} from 'ngx-perfect-scrollbar';
import { NgxAutoScroll } from 'ngx-auto-scroll/lib/ngx-auto-scroll.directive';

import { D3Service } from 'd3-ng2-service'; 
import { Routes, RouterModule } from '@angular/router';
import { CurrencyValueFormatterPipe } from './shared/pipes/currency-value-formatter.pipe';

const PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true
};

const appRoutes: Routes = [
   { path: ':exchange/:symbolpair/:timeframe', component: AssetDetailComponent },
   { path: '', component: AssetOverviewComponent, pathMatch: 'full'}
 ];

@NgModule({
  declarations: [
    AppComponent,

    AssetOverviewComponent,
    AssetDetailComponent,

    OrderBookComponent,
    TradeOverviewComponent,
    ChartComponent,
    TechanChartComponent,
    TechanLiveComponent,

    NgxAutoScroll,
    CurrencyValueFormatterPipe
  ],
  imports: [
    BrowserModule,
    HttpModule,
    FormsModule,
    BrowserAnimationsModule,
   //  RouterModule.forRoot( appRoutes ),

    AutoCompleteModule,
    DropdownModule,

    PerfectScrollbarModule.forRoot(PERFECT_SCROLLBAR_CONFIG)
  ],
  providers: [
    ExchangeTickerHandlerService,
    BitfinexTickerService,
    D3Service,

    AssetHandlerService,
    { provide: LOCALE_ID, useValue: 'de-DE' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
