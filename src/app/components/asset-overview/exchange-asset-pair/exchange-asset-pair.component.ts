import { ExchangeTickerType } from './../../../shared/models/exchange-ticker-type';
import { ExchangeTickerHandlerService } from './../../../shared/services/exchange-ticker-handler.service';
import { Subscription } from 'rxjs/Subscription';
import { ExchangeAssetPair, PriceChangeState } from './../../../shared/models/exchange-asset-pair';
import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ChangeDetectorRef } from '@angular/core';
import { D3, D3Service } from 'd3-ng2-service';
import { CandleStick } from '../../../shared/models/candle-stick';

@Component({
   selector: 'exchange-asset-pair',
   templateUrl: './exchange-asset-pair.component.html',
   styleUrls: ['./exchange-asset-pair.component.scss'],
   animations: [
      trigger('priceChangeAnimation', [
         transition(`${PriceChangeState.Neutral} => ${PriceChangeState.Falling}`, [
            style({
               backgroundColor: '#631919',
               color: '#ff7f7f'
            }),
            animate('1500ms linear')
         ]),
         transition(`${PriceChangeState.Neutral} => ${PriceChangeState.Rising}`, [
            style({
               backgroundColor: '#044404',
               color: '#48dc48'
            }),
            animate('1500ms linear')
         ])
      ])
   ]
})
export class ExchangeAssetPairComponent implements OnInit, OnDestroy {

   @Input()
   exchangeAssetPair: ExchangeAssetPair;

   @Input()
   drawHeader: boolean;

   @Input()
   drawChart: boolean;

   priceChangeState: PriceChangeState;

   /** The candles subscription is saved globally so that we can unsubscribe from it once this component gets destroyed */
   private candlesSubscription: Subscription;
   /** D3 instance to draw svg-graphics */
   private d3: D3;   

   private readonly chartTimeframe: string = '15m';   

   private candles: CandleStick[] = [];   

   /** The ticker subscription is saved globally so that we can unsubscribe from it once this component gets destroyed */
   private tickerSubscription: Subscription;

   constructor(private changeDetectorRef: ChangeDetectorRef, private exchangeHandler: ExchangeTickerHandlerService, private d3Service: D3Service) {
      this.d3 = this.d3Service.getD3(); // <-- obtain the d3 object from the D3 Service
   }

   ngOnInit() {
      this.subscribeToTicker();

      if(this.drawChart) {
         this.initializeCandlesChart();
      }
   }

   ngOnDestroy(): void {
      this.unsubscribe();
   }
   
   /** Unsubscribe from subscriptions */
   private unsubscribe():void {
      if(this.candlesSubscription) {
         this.candlesSubscription.unsubscribe();
      }
      if(this.tickerSubscription) {
         this.tickerSubscription.unsubscribe();
      }      
   }
   
   /** Subscribe to the traded pair's ticker */
   private subscribeToTicker() {
      let exchange =this.exchangeHandler.getExchangeTicker(ExchangeTickerType[this.exchangeAssetPair.exchange]);
      //subscribe for ticker
      this.tickerSubscription = exchange.subscribeToTickerMessages(this.exchangeAssetPair.pair.symbol).subscribe(tickerMessage => {
         if(this.exchangeAssetPair.latestTicker) {
            let previousPrice = this.exchangeAssetPair.latestTicker.lastPrice;

            //save new ticker message first because we don't want the coloring-animation to be triggered before the new price-number is displayed
            this.exchangeAssetPair.latestTicker = tickerMessage;            

            //reset to neutral price-change-state beforehand to trigger transition-animation
            this.priceChangeState = PriceChangeState.Neutral;

            if(previousPrice < tickerMessage.lastPrice) {
               //trigger change detection for fast switches
               this.changeDetectorRef.detectChanges();
               //set to rising price-change-state because the new price is higher
               this.priceChangeState = PriceChangeState.Rising;
            }
            else if(previousPrice > tickerMessage.lastPrice) {
               this.changeDetectorRef.detectChanges();
               //set to falling price-change-state because the new price is lower
               this.priceChangeState = PriceChangeState.Falling;
            }
         }
         else {
            //save new ticker message
            this.exchangeAssetPair.latestTicker = tickerMessage;
         }
      });      
   }

   private initializeCandlesChart():void {
      // TODO
      //this.subscribeToCandles();    
   }

   private subscribeToCandles():void {
      //Subscribe for the primary pair's hourly candles so that the 24h chart can be drawn
      let exchange = this.exchangeHandler.getExchangeTicker(ExchangeTickerType[this.exchangeAssetPair.exchange]);
      
      exchange.receivedCandlestickSnapshot(this.exchangeAssetPair.pair.symbol, this.chartTimeframe).filter(hasReceived => hasReceived).subscribe(received => {
         //save snapshot
         this.candles = exchange.getCandlesSnapshot(this.exchangeAssetPair.pair.symbol, this.chartTimeframe).slice();

         //load candles
         //this.loadCandleSticks();

         //subscribe for new candles
         this.candlesSubscription = exchange.subscribeToCandles(this.exchangeAssetPair.pair.symbol, this.chartTimeframe).filter(candle => candle !== null).subscribe(candle => {
            //if we already have a candle for this timestamp, we'll replace it
            let position = this.candles.findIndex(x => x.date.getTime() == candle.date.getTime());

            if (position !== -1) {
               this.candles.splice(position, 1, candle);
            }
            else {
               this.candles.push(candle);
            }
            //this.loadCandleSticks();
         });
      });    
   }
   
}

