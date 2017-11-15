import { Component, OnInit, Input, OnDestroy, OnChanges, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subscription } from 'rxjs/Subscription';

import { Selection } from 'd3-selection';
import { D3, D3Service, ScaleTime, ScaleLinear } from 'd3-ng2-service';

import { CandleStick } from './../../../shared/models/candle-stick';
import { ExchangeTickerType } from './../../../shared/models/exchange-ticker-type';
import { ExchangeTickerHandlerService } from './../../../shared/services/exchange-ticker-handler.service';
import { ExchangeAssetPair, PriceChangeState } from './../../../shared/models/exchange-asset-pair';

import * as d3 from 'd3';
import * as techan from 'techan';

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
   ],
   encapsulation: ViewEncapsulation.None
})
export class ExchangeAssetPairComponent implements OnInit, OnDestroy, OnChanges {
   @Input()
   exchangeAssetPair: ExchangeAssetPair;

   @Input()
   drawHeader: boolean;

   @Input()
   enableChart: boolean;

   @Input()
   triggerChartInitialization: boolean;

   chartType: string = 'candles'; //TODO: Extract from settings

   priceChangeState: PriceChangeState;

   /** The candles subscription is saved globally so that we can unsubscribe from it once this component gets destroyed */
   private candlesSubscription: Subscription;
   private candlesSnapshotSubscription: Subscription;

   private readonly chartTimeframe: string = '15m';
   private candles: CandleStick[] = [];

   /** The ticker subscription is saved globally so that we can unsubscribe from it once this component gets destroyed */
   private tickerSubscription: Subscription;

   /** Saves the asset pair and exchange to which we're currently subscribed */
   private subscribedAssetPair: string;
   private subscribedExchange: string;

   //#region D3-Properties
   x: any;
   y: any;
   positiveArea: any;
   negativeArea: any;
   positiveLine: any;
   negativeLine: any;

   candlestick: any;

   dim = {
      width: null, height: null,
      margin: { top: 0, right: 5, bottom: 0, left: 5 },
      plot: { width: null, height: null },
      ohlc: { height: null },
      indicator: { height: null, padding: null, top: null, bottom: null }
   };
   //#endregion D3-Properties

   private chartIsInitialized: boolean = false;

   constructor(private changeDetectorRef: ChangeDetectorRef, private exchangeHandler: ExchangeTickerHandlerService) {
   }

   ngOnInit() {
      this.subscribeToTicker();

      if (this.triggerChartInitialization) {
         this.initializeChart();
      }
   }

   ngOnDestroy(): void {
      this.unsubscribe();
   }

   ngOnChanges(): void {
      this.updateSettings();
      if (this.triggerChartInitialization) {
         this.initializeChart();
      }
   }

   ngAfterViewInit() {
      if (this.triggerChartInitialization) {
         this.initializeChart();
      }
   }

   /** Unsubscribe from subscriptions */
   private unsubscribe(): void {
      this.unsubscribeCandles();
      this.unsubscribeTicker();
   }

   /** Unsubscribe from ticker */
   private unsubscribeTicker() {
      if (this.tickerSubscription) {
         this.tickerSubscription.unsubscribe();
      }
   }

   /** Unsubscribe from candle subscriptions */
   private unsubscribeCandles():void {
      if(this.candlesSnapshotSubscription) {
         this.candlesSnapshotSubscription.unsubscribe();
      }
      if (this.candlesSubscription) {
         this.candlesSubscription.unsubscribe();
      }
   }

   /** checks whether we're subscribed to the same asset pair as the input value and updates our subscriptions if necessary */
   private updateSettings():void {
      //subscribe only if the settings have changed
      if(this.exchangeAssetPair && !this.isSubscribedToCurrentSettings()) {
         this.subscribeToTicker();
         this.subscribeToCandles();

         this.subscribedAssetPair = this.exchangeAssetPair.pair.symbol;
         this.subscribedExchange = this.exchangeAssetPair.exchange;         
      }
   }

   /** Subscribe to the traded pair's ticker */
   private subscribeToTicker() {
      this.unsubscribeTicker();

      let exchange = this.exchangeHandler.getExchangeTicker(ExchangeTickerType[this.exchangeAssetPair.exchange]);
      //subscribe for ticker
      this.tickerSubscription = exchange.subscribeToTickerMessages(this.exchangeAssetPair.pair.symbol).subscribe(tickerMessage => {
         if (this.exchangeAssetPair.latestTicker) {
            let previousPrice = this.exchangeAssetPair.latestTicker.lastPrice;

            //save new ticker message first because we don't want the coloring-animation to be triggered before the new price-number is displayed
            this.exchangeAssetPair.latestTicker = tickerMessage;

            //reset to neutral price-change-state beforehand to trigger transition-animation
            this.priceChangeState = PriceChangeState.Neutral;

            if (previousPrice < tickerMessage.lastPrice) {
               //trigger change detection for fast switches
               this.changeDetectorRef.detectChanges();
               //set to rising price-change-state because the new price is higher
               this.priceChangeState = PriceChangeState.Rising;
            }
            else if (previousPrice > tickerMessage.lastPrice) {
               this.changeDetectorRef.detectChanges();
               //set to falling price-change-state because the new price is lower
               this.priceChangeState = PriceChangeState.Falling;
            }
         }
         else {
            //save new ticker message but wait one tick to prevent ExpressionChangedAfterItHasBeenCheckedError
            //this error would happen because our parent-component is dependent on this tickerMessage and may change an input value..
            setTimeout(() => { this.exchangeAssetPair.latestTicker = tickerMessage; });
         }
      });
   }

   /** Checks whether we're subscribed to the same asset pair as the input value  */
   private isSubscribedToCurrentSettings():boolean {
      return !(this.subscribedAssetPair != this.exchangeAssetPair.pair.symbol || this.subscribedExchange != this.exchangeAssetPair.exchange);
   };

   private subscribeToCandles(): void {
      //Subscribe for the primary pair's hourly candles so that the 24h chart can be drawn
      let exchange = this.exchangeHandler.getExchangeTicker(ExchangeTickerType[this.exchangeAssetPair.exchange]);

      this.unsubscribeCandles();

      this.candlesSnapshotSubscription = exchange.getCandlesSnapshot(this.exchangeAssetPair.pair.symbol, this.chartTimeframe).filter(snapshot => snapshot != null).subscribe(snapshot => {
         //save snapshot
         this.candles = snapshot.slice();

         this.triggerChartRedraw();

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

            this.triggerChartRedraw();
         });
      });
   }

   private triggerChartRedraw() {
      //sort by timestamp
      this.candles = this.candles.sort((a, b) => a.date.getTime() - b.date.getTime());
      //save only last 96 candles because this is an 24h chart (15minute-candles*4*24);
      this.candles = this.candles.slice(this.candles.length - 96);

      if (this.chartIsInitialized) {
         this.drawChart(d3.select(`#overview-chart-${this.exchangeAssetPair.pair.symbol}`));
      }
   }

   private initializeChart(): void {
      this.subscribeToCandles();

      if (!this.chartIsInitialized) {
         switch (this.chartType) {
            case 'candles':
               this.initializeCandlesChart();
               break;
         }
      }
   }

   private initializeCandlesChart(): void {
      this.x = techan.scale.financetime();
      this.y = d3.scaleLinear();
      this.candlestick = techan.plot.candlestick().xScale(this.x).yScale(this.y);

      let chartWrapper = document.getElementById(`overview-chart-${this.exchangeAssetPair.pair.symbol}`);
      console.log('initializeCandlesChart start..');

      //continue only if the chart-wrapper is rendered to prevent timing issues
      if (chartWrapper) {
         console.log('initializeCandlesChart found wrapper..');
         let selection = d3.select(`#overview-chart-${this.exchangeAssetPair.pair.symbol}`);

         let svg = selection.append('svg');

         let ohlcSelection = svg.append("g")
            .attr("class", "ohlc")
            .attr("transform", "translate(0,0)");

         ohlcSelection.append("g")
            .attr("class", "candlestick")
            .attr("clip-path", "url(#ohlcClip)");

         this.updateValues(selection);
         selection.call(this.drawChart.bind(this));

         let resizeTimer;
         let interval = Math.floor(1000 / 60 * 10);

         //keep scope of functions with bound this-context
         let resizeFunction = this.resizeCandleStickChart.bind(this);
         let drawFunction = this.drawChart.bind(this);

         window.addEventListener('resize', event => {
            //cancel resize if we're still resizing
            if (resizeTimer !== false) {
               clearTimeout(resizeTimer);
            }
            resizeTimer = setTimeout(function () {
               selection.call(resizeFunction).call(drawFunction);
            }, interval);
         });

         if (this.candles.length > 0) {
            this.drawChart(selection);
         }

         this.chartIsInitialized = true;
      }


   }

   private initializeSparklineChart(): void {
      // TODO
      // let svg = this.d3.select(`#overview-chart-${this.exchangeAssetPair.pair.symbol}`).append('svg');
      // this.x = this.d3.scaleTime();
      // this.y = this.d3.scaleLinear();      
      // this.positiveArea = this.d3.area()
      // .x((candleStick: CandleStick) => this.x(d.date) )
      // .y0(height)
      // .y1(function(d) { return y(d.close); });

      this.subscribeToCandles();
   }

   /**
    * 
    * @param selection D3-selection
    */
   updateValues(selection: any): void {
      switch (this.chartType) {
         case 'candles':
            this.updateCandleStickValues(selection);
            break;
      }
   }

   updateCandleStickValues(selection: any): void {
      console.log(`updateCandleStickValues ${this.exchangeAssetPair.pair.symbol} - last candle ${JSON.stringify(this.candles[95])}`);

      let svg = selection.select("svg");

      //limit to 24*4 candle-sticks (24h * 15 minute candles)
      var accessor = this.candlestick.accessor(),
         indicatorPreRoll = this.candles.length > (24 * 4) ? this.candles.length - (24 * 4) : 0,
         postRollData = this.candles.slice(indicatorPreRoll);

      this.x.domain(techan.scale.plot.time(this.candles).domain());
      this.y.domain(techan.scale.plot.ohlc(postRollData).domain());

      this.x.zoomable().domain([indicatorPreRoll, this.candles.length]); // Zoom in a little to hide indicator preroll
      this.resizeCandleStickChart(selection);

      svg.select("g.candlestick").datum(this.candles).call(this.candlestick);
   }

   drawChart(selection): void {
      switch (this.chartType) {
         case 'candles':
            this.drawCandleStickChart(selection);
            break;
      }
   }

   drawCandleStickChart(selection): void {
      this.updateCandleStickValues(selection);
   }

   resizeCandleStickChart(selection): void {
      if (selection.node()) {
         this.dim.width = selection.node().clientWidth - this.dim.margin.left - this.dim.margin.right;
         this.dim.height = selection.node().clientHeight;

         let svgWrapper = document.querySelector('.svg-wrapper');

         this.dim.plot.width = this.dim.width;
         this.dim.plot.height = this.dim.height - this.dim.margin.top - this.dim.margin.bottom;
         this.dim.ohlc.height = this.dim.plot.height;

         var xRange = [0, this.dim.plot.width],
            yRange = [this.dim.ohlc.height, 0],
            ohlcVerticalTicks = Math.min(10, Math.round(this.dim.height / 70)),
            xTicks = Math.min(10, Math.round(this.dim.width / 130));


         this.x.range(xRange);
         this.y.range(yRange);

         selection.select("svg")
            .attr("width", this.dim.width)
            .attr("height", this.dim.height);

         selection.selectAll("defs #ohlcClip > rect")
            .attr("width", this.dim.plot.width)
            .attr("height", this.dim.ohlc.height);
      }

   }

}

