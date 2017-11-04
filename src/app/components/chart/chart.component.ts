import { D3Service, D3, Axis, DSVParsedArray } from 'd3-ng2-service';
import { CandleStick } from './../../shared/models/candle-stick';
import { Subscription } from 'rxjs/Subscription';
import { ExchangeTickerHandlerService } from './../../shared/services/exchange-ticker-handler.service';
import { Component, OnInit, Input, ElementRef, ViewEncapsulation } from '@angular/core';
import { ExchangeTickerType } from '../../shared/models/exchange-ticker-type';
import { ExchangeTicker } from '../../shared/services/exchange-ticker';
import { Selection, BaseType, ArrayLike, ValueFn } from 'd3-selection';

import * as d3 from 'd3';
import * as techan from 'techan';

@Component({
   selector: 'chart',
   templateUrl: './chart.component.html',
   styleUrls: ['./chart.component.scss'],
   encapsulation: ViewEncapsulation.None
})
export class ChartComponent implements OnInit {

   private _symbolPair: string;
   @Input()
   set symbolPair(value: string) {
      if (this.currentExchange && this._symbolPair && value != this._symbolPair) {
         this.candleSubscription.unsubscribe();
         this.currentExchange.unsubscribeFromAssetTrades(this._symbolPair);
      }

      this._symbolPair = value;
      this.subscribeToCandles();
   }
   get symbolPair(): string {
      return this._symbolPair;
   }

   private _exchangeTickerType: ExchangeTickerType;
   @Input()
   set exchangeTickerType(value: ExchangeTickerType) {
      if (this.currentExchange && this._symbolPair && value != this._exchangeTickerType) {
         this.candleSubscription.unsubscribe();
         this.currentExchange.unsubscribeFromAssetTrades(this._symbolPair);
      }

      this._exchangeTickerType = value;
      this.subscribeToCandles();
   }
   get exchangeTickerType(): ExchangeTickerType {
      return this._exchangeTickerType;
   }

   currentExchange: ExchangeTicker;

   currentTimeframe: string = '1M';

   timeframes = [
      { value: '1m', label: 'one minute' },
      { value: '5m', label: 'five minutes' },
      { value: '15m', label: '15 minutes' },
      { value: '30m', label: '30 minutes' },
      { value: '1h', label: 'one hour' },
      { value: '3h', label: '3 hours' },
      { value: '6h', label: '6 hours' },
      { value: '12h', label: '12 hours' },
      { value: '1D', label: 'one day' },
      { value: '7D', label: 'one week' },
      { value: '14D', label: 'two weeks' },
      { value: '1M', label: 'one month' }
   ]

   candleSubscription: Subscription;
   candles: CandleStick[] = [];

   private d3: D3; // <-- Define the private member which will hold the d3 reference
   private parentNativeElement: any;
   private svg: any; //probably Selection<SVGSVGElement, any, null, undefined>;

   /** D3/Techan settings */
   margin = { top: 20, right: 20, bottom: 30, left: 50 };
   width: number;
   height: number;

   parseDate: (dateString: String) => Date;
   x: any;
   y: any;
   zoom: any;;
   zoomableInit;
   candlestick: any;;

   xAxisLayer: any;
   xAxis: Axis<{}>;
   yAxisGraphics:any;
   yAxis: Axis<{}>;
   chartGraphics:any;

   constructor(private exchangeHandler: ExchangeTickerHandlerService, private element: ElementRef, private d3Service: D3Service) {
      this.d3 = this.d3Service.getD3(); // <-- obtain the d3 object from the D3 Service
      this.parentNativeElement = this.element.nativeElement;
   }

   /** Load order book with the currently saved configuration */
   subscribeToCandles(): void {
      if (this._symbolPair && this._exchangeTickerType !== undefined) {
         this.currentExchange = this.exchangeHandler.getExchangeTicker(this._exchangeTickerType);
         this.candles = [];

         this.currentExchange.websocketIsConnected.subscribe(isConnected => {
            if (isConnected) {
               this.candleSubscription = this.currentExchange.subscribeToCandles(this._symbolPair, this.currentTimeframe).filter(candle => candle !== null).subscribe(candle => {
                  //if we already have a candle for this timestamp, we'll replace it
                  let position = this.candles.findIndex(x => x.date.getTime() == candle.date.getTime());

                  if (position !== -1) {
                     this.candles.splice(position, 1, candle);
                  }
                  else {
                     this.candles.push(candle);
                  }
                  this.loadCandleSticks();
               });
            }
         });
      }
   }

   /** Switch the candle stick's time frame */
   switchTimeframe(timeFrame: any) {
      if (timeFrame !== this.currentTimeframe) {
         if (this.candleSubscription && !this.candleSubscription.closed) {

            this.candleSubscription.unsubscribe();
            this.currentExchange.unsubscribeFromCandles(this._symbolPair, this.currentTimeframe);

            this.currentTimeframe = timeFrame;

            this.subscribeToCandles();
         }
      }
   }

   loadCandleSticks() {
      var accessor = this.candlestick.accessor();

      let sortedCandles = this.candles.sort((a, b) => a.date.getTime() - b.date.getTime());

      this.x.domain(sortedCandles.map(accessor.d));
      this.y.domain(techan.scale.plot.ohlc(sortedCandles, accessor).domain());

      this.svg.select("g.candlestick").datum(sortedCandles);
      this.draw();

      // Associate the zoom with the scale after a domain has been applied
      // Stash initial settings to store as baseline for zooming
      this.zoomableInit = this.x.zoomable().clamp(false).copy();
   }

   ngOnInit() {
      this.parseDate = this.d3.timeParse("%d-%b-%y");
      let parseDateLocal = this.d3.timeParse("%d-%b-%y");

      this.updateAreaSize();

      this.initializeResiteListener();
   }

   initializeChartArea() {

      //remove old if needed
      if(this.svg) {
         this.d3.select(".svg-wrapper svg").remove();
         this.svg = null;
      }

      console.log(`Initialize chart area size - width ${this.width} - height ${this.height}`);

      this.x = techan.scale.financetime()
         .range([0, this.width]);

      this.y = this.d3.scaleLinear()
         .range([this.height, 0]);

      // this.zoom = this.d3.zoom()
      //    .on("zoom", this.zoomed);

      this.zoomableInit;

      this.candlestick = techan.plot.candlestick()
         .xScale(this.x)
         .yScale(this.y);

      this.xAxis = this.d3.axisBottom(this.x);

      this.yAxis = this.d3.axisLeft(this.y);

      this.svg = this.d3.select(".svg-wrapper").append("svg")
         .attr("width", this.width + this.margin.left + this.margin.right)
         .attr("height", this.height + this.margin.top + this.margin.bottom)
         .append("g")
         .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

      this.chartGraphics =this.svg.append("clipPath")
         .attr("id", "clip")
         .append("rect")
         .attr("x", 0)
         .attr("y", this.y(1))
         .attr("width", this.width)
         .attr("height", this.y(0) - this.y(1));

      this.svg.append("g")
         .attr("class", "candlestick")
         .attr("clip-path", "url(#clip)");

      this.xAxisLayer = this.svg.append("g")
         .attr("class", "x axis")
         .attr("transform", "translate(0," + this.height + ")");

      this.yAxisGraphics = this.svg.append("g")
         .attr("class", "y axis")
         .append("text")
         .attr("transform", "rotate(-90)")
         .attr("y", 6)
         .attr("dy", ".71em")
         .style("text-anchor", "end")
         .text("Price ($)");

      // this.svg.append("rect")
      //    .attr("class", "pane")
      //    .attr("width", this.width)
      //    .attr("height", this.height);
      //.call(this.zoom);         
   }

   initializeResiteListener(): void {
      let resizeTimer;
      let interval = Math.floor(1000 / 60 * 10);
      let localParentElement = this.parentNativeElement;

      window.addEventListener('resize', event => {
         if (resizeTimer !== false) {
            clearTimeout(resizeTimer);
         }
         resizeTimer = setTimeout(this.updateAreaSize.bind(this), interval);
      });
   }

   updateAreaSize() {
      //get svg-wrapper and update the size
      let svgWrapper = this.parentNativeElement.querySelector('.svg-wrapper');
 
      this.width = (svgWrapper.clientWidth - 200) - this.margin.left - this.margin.right;
      this.height = (svgWrapper.clientHeight - 300) - this.margin.top - this.margin.bottom;      

      // this.svg.attr("width", this.width).attr("height", this.height);
      // this.xAxisLayer.attr("transform", "translate(0," + this.height + ")");
      
      this.initializeChartArea();
      this.draw();
   }

   zoomed() {
      var rescaledY = this.d3.event.transform.rescaleY(this.y);
      this.yAxis.scale(rescaledY);
      this.candlestick.yScale(rescaledY);

      // Emulates D3 behaviour, required for financetime due to secondary zoomable scale
      this.x.zoomable().domain(this.d3.event.transform.rescaleX(this.zoomableInit).domain());

      this.draw();
   }

   draw() {
      this.svg.select("g.candlestick").call(this.candlestick);
      // using refresh method is more efficient as it does not perform any data joins
      // Use this if underlying data is not changing
      //        svg.select("g.candlestick").call(candlestick.refresh);
      this.svg.select("g.x.axis").call(this.xAxis);
      this.svg.select("g.y.axis").call(this.yAxis)
   }
}
