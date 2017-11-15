import { Component, OnInit, Input, ElementRef, ViewEncapsulation, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';

import { ExchangeTickerHandlerService } from './../../shared/services/exchange-ticker-handler.service';
import { CandleStick } from './../../shared/models/candle-stick';
import { ExchangeTickerType } from '../../shared/models/exchange-ticker-type';
import { ExchangeTicker } from '../../shared/services/exchange-ticker';

import { Selection, BaseType, ArrayLike, ValueFn } from 'd3-selection';
import { D3Service, D3, Axis, DSVParsedArray } from 'd3-ng2-service';

import * as d3 from 'd3';
import { event as currentEvent } from 'd3-selection';
import * as techan from 'techan';

@Component({
   selector: 'candle-chart',
   templateUrl: './candle-chart.component.html',
   styleUrls: ['./candle-chart.component.scss'],
   encapsulation: ViewEncapsulation.None
})
export class CandleChartComponent implements OnInit, OnDestroy, OnChanges {

   private _symbolPair: string;
   @Input()
   set symbolPair(value: string) {
      this._symbolPair = value;
      this.subscribeToCandles();
   }
   get symbolPair(): string {
      return this._symbolPair;
   }

   private _exchangeTickerType: ExchangeTickerType;
   @Input()
   set exchangeTickerType(value: ExchangeTickerType) {
      this._exchangeTickerType = value;
      this.subscribeToCandles();
   }
   get exchangeTickerType(): ExchangeTickerType {
      return this._exchangeTickerType;
   }

   private _timeframe: string;
   @Input()
   set timeframe(value: string) {
      this._timeframe = value;
      this.subscribeToCandles();
   }
   get timeframe(): string {
      return this._timeframe;
   }

   //#region D3/Techan settings
   private parentNativeElement: any;
   private svg: any; //probably Selection<SVGSVGElement, any, null, undefined>;  

   dim = {
      width: null, height: null,
      margin: { top: 20, right: 70, bottom: 120, left: 60 },
      plot: { width: null, height: null },
      ohlc: { height: null },
      indicator: { height: null, padding: null, top: null, bottom: null }
   };

   private x: any;
   private y: any;
   private yPercent: any;

   private zoom: any;
   private currentZoom: any;
   private zoomableInit: any;
   private yInit: any;
   private yPercentInit: any;

   private indicatorTop: any;
   private candlestick: any;
   private sma0: any;
   private sma1: any;
   private ema2: any;
   private volume: any;
   private xAxis: any;
   private xAxisTop: any;
   private timeAnnotation: any;
   private timeAnnotationTop: any;
   private yAxis: any;
   private ohlcAnnotation: any;
   private closeAnnotation: any;
   private percentAxis: any;
   private percentAnnotation: any;
   private ohlcCrosshair: any;

   private volumeScale: any;
   private volumeAxisRight: any;
   private volumeAnnotationRight: any;
   private volumAxisLeft: any;
   private volumeAnnotationLeft: any;
   private volumeCrosshair: any;
   private rsi: any;
   private rsiAxis: any;
   private rsiAnnotation: any;
   private rsiAxisLeft: any;
   private rsiAnnotationLeft: any;
   private rsiScale: any;
   private rsiCrosshair: any;

   private legendTimeFormat: any;
   private legendCandleTime: any;
   private legendCandleOpen: any;
   private legendCandleHigh: any;
   private legendCandleLow: any;
   private legendCandleClose: any;
   private legendCandlePercent: any;

   private highlightMaximumPriceText: any;
   private highlightMinimumPriceText: any;

   //data properties
   //private macdData: any;
   private rsiData: any;

   candleLimit: number = 20000; //limit number of candles that should be displayed

   //#endregion   

   private currentExchange: ExchangeTicker;
   private subscribedSettings = { exchange: null, symbol: null, timeframe: null };
   private chartIsInitialized: boolean = false;

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

   private candleSubscription: Subscription;
   private candlesSnapshotSubscription: Subscription;
   private candles: CandleStick[] = [];

   constructor(private exchangeHandler: ExchangeTickerHandlerService, private element: ElementRef, private router: Router) {
      this.parentNativeElement = this.element.nativeElement;
   }

   ngOnDestroy(): void {
      this.unsubscribe();
   }

   ngOnChanges(changes: SimpleChanges): void {
   }

   unsubscribe() {
      if (this.candleSubscription && this.candlesSnapshotSubscription) {
         this.candleSubscription.unsubscribe();
         this.candlesSnapshotSubscription.unsubscribe();
         this.currentExchange.unsubscribeFromCandles(this._symbolPair, this._timeframe);
      }
   }

   /** Load order book with the currently saved configuration */
   subscribeToCandles(): void {
      //if the current input values are either null or equals to the currently subscribed settings, don't do anything
      if (this._symbolPair && this._exchangeTickerType !== undefined && this._timeframe &&
         !(this.subscribedSettings.symbol == this._symbolPair && this.subscribedSettings.exchange == this._exchangeTickerType && this.subscribedSettings.timeframe == this._timeframe)) {

         this.unsubscribe();

         //save new settings
         this.subscribedSettings.symbol = this._symbolPair;
         this.subscribedSettings.exchange = this._exchangeTickerType;
         this.subscribedSettings.timeframe = this._timeframe;

         this.currentExchange = this.exchangeHandler.getExchangeTicker(this._exchangeTickerType);
         this.candles = [];
         this.currentZoom = null;

         this.currentExchange.websocketIsConnected.subscribe(isConnected => {
            if (isConnected) {
               //wait till snapshot is received
               this.candlesSnapshotSubscription = this.currentExchange.getCandlesSnapshot(this._symbolPair, this.timeframe).filter(snapshot => snapshot != null).subscribe(snapshot => {
                  //save snapshot
                  this.candles = snapshot.slice();

                  //load candles
                  if (this.chartIsInitialized) {
                     this.loadCandleSticks();
                  }

                  //subscribe for new candles
                  this.candleSubscription = this.currentExchange.subscribeToCandles(this._symbolPair, this.timeframe).filter(candle => candle !== null).subscribe(candle => {
                     //if we already have a candle for this timestamp, we'll replace it
                     let position = this.candles.findIndex(x => x.date.getTime() == candle.date.getTime());

                     if (position !== -1) {
                        this.candles.splice(position, 1, candle);
                     }
                     else {
                        this.candles.push(candle);
                     }

                     if (this.chartIsInitialized) {
                        this.loadCandleSticks();
                     }
                  });
               });
            }
         });
      }
   }

   /** Switch the candle stick's time frame */
   switchTimeframe(newTimeframe: any) {
      this.router.navigate([`${ExchangeTickerType[this.currentExchange.exchangeType]}/${this._symbolPair}/${newTimeframe}`]);
      this.timeframe = newTimeframe;
   }

   loadCandleSticks() {
      this.candles = this.candles.sort((a, b) => a.date.getTime() - b.date.getTime());

      this.draw();
      this.highlightPeakCandles();
   }

   ngOnInit(): void {
      this.x = techan.scale.financetime();
      this.y = d3.scaleLinear();
      this.zoom = d3.zoom()
         .scaleExtent([0.5, 5])
         .on("zoom", this.zoomed.bind(this));
      this.yPercent = this.y.copy();
      this.indicatorTop = d3.scaleLinear();
      this.candlestick = techan.plot.candlestick().xScale(this.x).yScale(this.y);
      this.sma0 = techan.plot.sma().xScale(this.x).yScale(this.y);
      this.sma1 = techan.plot.sma().xScale(this.x).yScale(this.y);
      this.ema2 = techan.plot.ema().xScale(this.x).yScale(this.y);
      this.xAxis = d3.axisBottom(this.x);
      this.xAxisTop = d3.axisTop(this.x);
      this.timeAnnotation = techan.plot.axisannotation().orient('bottom').axis(this.xAxis).format(d3.timeFormat('%Y-%m-%d %H:%M')).width(95);
      this.timeAnnotationTop = techan.plot.axisannotation().orient('top').axis(this.xAxisTop).format(d3.timeFormat('%Y-%m-%d %H:%M')).width(95);
      this.yAxis = d3.axisRight(this.y);
      this.ohlcAnnotation = techan.plot.axisannotation().orient('right').axis(this.yAxis).format(d3.format(',.2f'));
      this.closeAnnotation = techan.plot.axisannotation().orient('right').accessor(this.candlestick.accessor()).axis(this.yAxis).format(d3.format(',.2f'));
      this.percentAxis = d3.axisLeft(this.yPercent).tickFormat(d3.format('+.1%'));
      this.percentAnnotation = techan.plot.axisannotation().orient('left').axis(this.percentAxis);

      this.ohlcCrosshair = techan.plot.crosshair()
         .xScale(this.timeAnnotation.axis().scale())
         .yScale(this.ohlcAnnotation.axis().scale())
         .xAnnotation([this.timeAnnotation, this.timeAnnotationTop])
         .yAnnotation([this.ohlcAnnotation, this.percentAnnotation])
         .on('move', this.ohlcCrosshairMove.bind(this));

      this.volumeScale = d3.scaleLinear();
      this.volume = techan.plot.volume().accessor(this.candlestick.accessor()).xScale(this.x).yScale(this.volumeScale);
      this.volumeAxisRight = d3.axisRight(this.volumeScale).ticks(3).tickFormat(d3.format(',.3s'));
      this.volumeAnnotationRight = techan.plot.axisannotation().orient('right').axis(this.volumeAxisRight).format(d3.format(',.2s'));
      this.volumAxisLeft = d3.axisLeft(this.volumeScale).ticks(3).tickFormat(d3.format(',.3s'));
      this.volumeAnnotationLeft = techan.plot.axisannotation().orient('left').axis(this.volumAxisLeft).format(d3.format(',.2s'));
      this.volumeCrosshair = techan.plot.crosshair().xScale(this.x).yScale(this.volumeScale).xAnnotation([this.timeAnnotation, this.timeAnnotationTop]).yAnnotation([this.volumeAnnotationRight, this.volumeAnnotationLeft]).on('move', this.ohlcCrosshairMove.bind(this));

      this.rsiScale = d3.scaleLinear();
      this.rsi = techan.plot.rsi().xScale(this.x).yScale(this.rsiScale);
      this.rsiAxis = d3.axisRight(this.rsiScale).ticks(3);
      this.rsiAnnotation = techan.plot.axisannotation().orient('right').axis(this.rsiAxis).format(d3.format(',.2s'));
      this.rsiAxisLeft = d3.axisLeft(this.rsiScale).ticks(3);
      this.rsiAnnotationLeft = techan.plot.axisannotation().orient('left').axis(this.rsiAxisLeft).format(d3.format(',.2s'));
      this.rsiCrosshair = techan.plot.crosshair().xScale(this.x).yScale(this.rsiScale).xAnnotation([this.timeAnnotation, this.timeAnnotationTop]).yAnnotation([this.rsiAnnotation, this.rsiAnnotationLeft]);

      let selection = d3.select("#bigChart");

      var svg = selection.append("svg"),
         defs = svg.append("defs");

      this.svg = svg;

      defs.append("clipPath")
         .attr("id", "ohlcClip")
         .append("rect")
         .attr("x", 0)
         .attr("y", 0);

      defs.selectAll(".indicatorClip").data([0, 1])
         .enter()
         .append("clipPath")
         .attr("id", function (d, i) { return "indicatorClip-" + i; })
         .attr("class", "indicatorClip")
         .append("rect")
         .attr("x", 0);

      svg = svg.append("g")
         .attr("class", "chart")
         .attr("transform", "translate(" + this.dim.margin.left + "," + this.dim.margin.top + ")");

      svg.append("g")
         .attr("class", "x axis bottom");

      svg.append("g")
         .attr("class", "x axis top");

      var ohlcSelection = svg.append("g")
         .attr("class", "ohlc")
         .attr("transform", "translate(0,0)");

      ohlcSelection.append("g")
         .attr("class", "y axis")
         .attr("transform", "translate(" + this.x(1) + ",0)");
         //legend for y-axis
         // .append("text")
         // .attr("transform", "rotate(-90)")
         // .attr("y", -12)
         // .attr("dy", ".71em")
         // .style("text-anchor", "end")
         // .text("Price");

      ohlcSelection.append("g")
         .attr("class", "closeValue annotation up");

      ohlcSelection.append("g")
         .attr("class", "candlestick")
         .attr("clip-path", "url(#ohlcClip)");

      ohlcSelection.append("g")
         .attr("class", "indicator sma ma-0")
         .attr("clip-path", "url(#ohlcClip)");

      ohlcSelection.append("g")
         .attr("class", "indicator sma ma-1")
         .attr("clip-path", "url(#ohlcClip)");

      ohlcSelection.append("g")
         .attr("class", "indicator ema ma-2")
         .attr("clip-path", "url(#ohlcClip)");

      ohlcSelection.append("g")
         .attr("class", "percent axis");

      let volumeSelection = svg.append("g")
         .attr("class", "volume")

      volumeSelection.append("g")
         .attr("class", "volume-plot")
         .attr("clip-path", "url(#indicatorClip-0)");

      volumeSelection.append("g")
         .attr("class", "axis right");

      volumeSelection.append("g")
         .attr("class", "axis left");

      //initialize legend
      this.legendTimeFormat = d3.timeFormat('%b %d, %Y, %H:%M');

      let legend = svg.append("g")
         .attr("class", "legend")
         .attr("transform", "translate(0, 15)");

      this.legendCandleTime = legend.append('text')
         .attr("class", "legend-time")
         .text("Nov 03, 2017, 20:24")
         .attr("x", "5");

      legend.append("text")
         .attr("class", "legend-header")
         .text("O:")
         .attr("x", "130");

      this.legendCandleOpen = legend.append('text')
         .attr("class", "legend-open")
         .text("5973.0")
         .attr("x", "145");

      legend.append("text")
         .attr("class", "legend-header")
         .text("H:")
         .attr("x", "200");

      this.legendCandleHigh = legend.append('text')
         .attr("class", "legend-high")
         .text("5973.0")
         .attr("x", "215");

      legend.append("text")
         .attr("class", "legend-header")
         .text("L:")
         .attr("x", "270");

      this.legendCandleLow = legend.append('text')
         .attr("class", "legend-low")
         .text("5973.0")
         .attr("x", "285");

      legend.append("text")
         .attr("class", "legend-header")
         .text("C:")
         .attr("x", "340");

      this.legendCandleClose = legend.append('text')
         .attr("class", "legend-close")
         .text("5973.0")
         .attr("x", "355");
      // Add trendlines and other interactions last to be above zoom pane
      svg.append('g')
         .attr("class", "crosshair ohlc");

      svg.append('g')
         .attr("class", "crosshair volume");

      this.updateValues();
      selection.call(this.draw.bind(this));

      let resizeTimer;
      let interval = Math.floor(1000 / 60 * 10);
      let localParentElement = this.parentNativeElement;

      //keep scope of functions with bound this-context
      let resizeFunction = this.resize.bind(this);
      let drawFunction = this.draw.bind(this);

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
         this.loadCandleSticks();
      }

      this.chartIsInitialized = true;
   }

   resize() {
      let selection = d3.select('#bigChart');
      let dim = this.dim;

      dim.width = selection.node().clientWidth;
      dim.height = selection.node().clientHeight;

      let svgWrapper = document.querySelector('.svg-wrapper');

      dim.plot.width = dim.width - dim.margin.left - dim.margin.right;
      dim.plot.height = dim.height - dim.margin.top - dim.margin.bottom;
      dim.ohlc.height = dim.plot.height * 0.833333333;
      dim.indicator.height = dim.plot.height * 0.144444;
      dim.indicator.padding = dim.plot.height * 0.01111111111;
      dim.indicator.top = dim.ohlc.height + dim.indicator.padding;
      dim.indicator.bottom = dim.indicator.top + dim.indicator.height + dim.indicator.padding;

      var xRange = [0, dim.plot.width],
         yRange = [dim.ohlc.height, 0],
         ohlcVerticalTicks = Math.min(10, Math.round(dim.height / 70)),
         xTicks = Math.min(10, Math.round(dim.width / 130));

      this.indicatorTop.range([dim.indicator.top, dim.indicator.bottom]);
      this.x.range(xRange);
      this.xAxis.ticks(xTicks);
      this.y.range(yRange);
      this.yAxis.ticks(ohlcVerticalTicks);
      this.yPercent.range(this.y.range());
      this.percentAxis.ticks(ohlcVerticalTicks);

      this.timeAnnotation.translate([0, dim.plot.height]);
      this.ohlcAnnotation.translate([xRange[1], 0]);
      this.closeAnnotation.translate([xRange[1], 0]);
      this.ohlcCrosshair.verticalWireRange([0, dim.plot.height]);

      let indicatorTop = this.indicatorTop;

      this.volumeScale.range([indicatorTop(0) + dim.indicator.height, indicatorTop(0)]);
      this.rsiScale.range([indicatorTop(1) + dim.indicator.height, indicatorTop(1)]);
      this.volumeAnnotationRight.translate([xRange[1], 0]);
      this.rsiAnnotation.translate([xRange[1], 0]);
      this.volumeCrosshair.verticalWireRange([0, dim.plot.height]);
      this.rsiCrosshair.verticalWireRange([0, dim.plot.height]);

      selection.select("svg")
         .attr("width", dim.width)
         .attr("height", dim.height);

      selection.selectAll("defs #ohlcClip > rect")
         .attr("width", dim.plot.width)
         .attr("height", dim.ohlc.height);

      selection.selectAll("defs .indicatorClip > rect")
         .attr("y", (d, i) => { return indicatorTop(i); })
         .attr("width", dim.plot.width)
         .attr("height", dim.indicator.height);

      selection.select("g.x.axis.bottom")
         .attr("transform", "translate(0," + dim.plot.height + ")");

      selection.select("g.ohlc g.y.axis")
         .attr("transform", "translate(" + xRange[1] + ",0)");

      selection.select("g.volume g.axis.right")
         .attr("transform", "translate(" + xRange[1] + ",0)");

      selection.select("g.volume g.axis.left")
         .attr("transform", "translate(" + xRange[0] + ",0)");

      //update peak hightlighting elements
      this.highlightPeakCandles();
   }

   updateValues(): void {
      var svg = this.svg;
      var accessor = this.candlestick.accessor(),
         indicatorPreRoll = this.candles.length > this.candleLimit ? this.candles.length - this.candleLimit : 0,
         data = this.candles.slice(indicatorPreRoll);  // Don't show where indicators don't have data


      this.x.domain(techan.scale.plot.time(this.candles).domain());
      this.y.domain(techan.scale.plot.ohlc(data).domain());
      if (this.candles.length > 0) {
         this.updateLegendWithCandleInformation(this.candles[this.candles.length - 1]);
         this.yPercent.domain(techan.scale.plot.percent(this.y, accessor(data[indicatorPreRoll])).domain());
      }

      // Stash for zooming
      this.zoomableInit = this.x.zoomable().domain([indicatorPreRoll, data.length]).copy(); // Zoom in a little to hide indicator preroll
      this.yInit = this.y.copy();
      this.yPercentInit = this.yPercent.copy();

      //if we already have a current zoom, we'll use it
      if (this.currentZoom) {
         this.x.zoomable().domain(this.currentZoom.rescaleX(this.zoomableInit).domain());
         this.y.domain(this.currentZoom.rescaleY(this.yInit).domain());
         this.yPercent.domain(this.currentZoom.rescaleY(this.yPercentInit).domain());
      }

      //this.macdData = techan.indicator.macd()(this.candles);
      this.volumeScale.domain(techan.scale.plot.volume(this.candles).domain());
      this.rsiData = techan.indicator.rsi()(this.candles);
      this.rsiScale.domain(techan.scale.plot.rsi(this.rsiData).domain());

      this.resize();

      svg.select("g.candlestick").datum(this.candles).call(this.candlestick);
      if (this.candles.length > 0) {
         svg.select("g.closeValue.annotation").datum([this.candles[this.candles.length - 1]]).call(this.closeAnnotation);
      }

      svg.select("g.sma.ma-0").datum(techan.indicator.sma().period(10)(this.candles)).call(this.sma0);
      svg.select("g.sma.ma-1").datum(techan.indicator.sma().period(20)(this.candles)).call(this.sma1);
      svg.select("g.ema.ma-2").datum(techan.indicator.ema().period(50)(this.candles)).call(this.ema2);
      svg.select("g.volume .volume-plot").datum(this.candles).call(this.volume);

      svg.select("g.crosshair.ohlc").call(this.ohlcCrosshair).call(this.zoom);
      svg.select("g.crosshair.volume").call(this.volumeCrosshair).call(this.zoom);
   }

   draw(): void {
      // debugger;
      var svg = this.svg;
      svg.select("g.x.axis").call(this.xAxis);
      svg.select("g.ohlc .axis").call(this.yAxis);
      svg.select("g.percent.axis").call(this.percentAxis);

      svg.select("g.volume .axis.right").call(this.volumeAxisRight);
      svg.select("g.volume .axis.left").call(this.volumAxisLeft);

      this.updateValues();
   }

   /** Update x and y scaling properties and redraw chart */
   zoomed() {
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush

      this.currentZoom = d3.event.transform;

      this.x.zoomable().domain(this.currentZoom.rescaleX(this.zoomableInit).domain());
      this.y.domain(this.currentZoom.rescaleY(this.yInit).domain());
      this.yPercent.domain(this.currentZoom.rescaleY(this.yPercentInit).domain());

      this.svg.select("g.x.axis").call(this.xAxis);
      this.svg.select("g.ohlc .axis").call(this.yAxis);
      this.svg.select("g.percent.axis").call(this.percentAxis);

      this.svg.select("g.volume .axis.right").call(this.volumeAxisRight);
      this.svg.select("g.volume .axis.left").call(this.volumAxisLeft);

      //refresh components with current values because the values didn't change..
      this.svg.select("g.candlestick").call(this.candlestick.refresh);
      this.svg.select("g.closeValue.annotation").call(this.closeAnnotation.refresh);
      this.svg.select("g .sma.ma-0").call(this.sma0.refresh);
      this.svg.select("g .sma.ma-1").call(this.sma1.refresh);
      this.svg.select("g .ema.ma-2").call(this.ema2.refresh);

      this.svg.select("g.volume .volume-plot").call(this.volume.refresh);

      this.svg.select("g.crosshair.ohlc").call(this.ohlcCrosshair.refresh);
      this.svg.select("g.crosshair.volume").call(this.volumeCrosshair.refresh);

      this.highlightPeakCandles();
   }

   reset() {
      this.currentZoom = null;
      this.draw();
   }

   ohlcCrosshairMove(coords) {
      let candle = this.candles.find(x => x.date.getTime() == coords.x.getTime());
      if (candle) {
         this.updateLegendWithCandleInformation(candle);
      }
   }

   updateLegendWithCandleInformation(candle: CandleStick) {
      //let legendText = d3.select("#bigChart svg text.symbol")["_groups"][0][0];

      this.legendCandleTime.text(this.legendTimeFormat(candle.date));
      this.legendCandleClose.text(candle.close.toFixed(2));
      this.legendCandleOpen.text(candle.open.toFixed(2));
      this.legendCandleHigh.text(candle.high.toFixed(2));
      this.legendCandleLow.text(candle.low.toFixed(2));
      //legendText.innerHTML = `Close: ${candle.close} Volume: ${candle.volume.toFixed(3)}`;
   }

   /**
    * Sets a text-element at the maximum and minimum candle of the current chart which display the peak's price
    */
   highlightPeakCandles() {
      if (this.candles && this.candles.length > 0) {

         let chartWidth = this.dim.plot.width;
         let chartHeight = this.dim.ohlc.height;

         let preventXCoordinateOutOfBounce = (coordinate: number): number => {
            if (coordinate < 18) {
               return 18;
            }
            else if (coordinate > (chartWidth - 33)) {
               return chartWidth - 33;
            }
            else {
               return coordinate;
            }
         }

         let preventYCoordinateOutOfBounce = (coordinate: number): number => {
            //don't display it if the coordinate is totally out of bounce
            if (coordinate < -20 || coordinate > (chartHeight + 20)) {
               return;
            }

            if (coordinate < 20) {
               return 20;
            }
            else if (coordinate > (chartHeight - 15)) {
               return chartHeight - 15;
            }
            else {
               return coordinate;
            }
         }

         let visibleCandles: Array<CandleStick> = this.x.domain().map(x => this.candles.find(candle => candle.date.getTime() == x.getTime()));
         let highestCandle: CandleStick = visibleCandles.reduce<CandleStick>((maxValue, current) => (current.high > maxValue.high ? current : maxValue), visibleCandles[0]);
         let lowestCandle: CandleStick = visibleCandles.reduce<CandleStick>((maxValue, current) => (current.low < maxValue.low ? current : maxValue), visibleCandles[0]);

         if (!this.highlightMaximumPriceText || this.highlightMaximumPriceText.empty()) {
            this.highlightMaximumPriceText = this.svg.select(".candlestick .data").append("text").attr("class", "peak-price maximum-price");
         }

         if (!this.highlightMinimumPriceText || this.highlightMinimumPriceText.empty()) {
            this.highlightMinimumPriceText = this.svg.select(".candlestick .data").append("text").attr("class", "peak-price minimum-price");
         }

         let xCoordinateMax = preventXCoordinateOutOfBounce(this.x(highestCandle.date));
         let yCoordinateMax = preventYCoordinateOutOfBounce(this.y(highestCandle.high));

         //if the coordinates have a value (they will if they're not totally out of bounce), update the text's position
         if (xCoordinateMax && yCoordinateMax) {
            this.highlightMaximumPriceText.attr("x", xCoordinateMax - 15)
               .attr("y", yCoordinateMax - 5)
               .attr("display", "initial")
               .text(highestCandle.high.toFixed(2));
         }
         else {
            //otherwise hide it
            this.highlightMaximumPriceText.attr("display", "none");
         }

         let xCoordinateMin = preventXCoordinateOutOfBounce(this.x(lowestCandle.date));
         let yCoordinateMin = preventYCoordinateOutOfBounce(this.y(lowestCandle.low));

         //if the coordinates have a value (they will if they're not totally out of bounce), update the text's position
         if (xCoordinateMin && yCoordinateMin) {
            this.highlightMinimumPriceText.attr("x", xCoordinateMin - 15)
               .attr("y", yCoordinateMin + 13)
               .attr("display", "initial")
               .text(lowestCandle.low.toFixed(2));
         }
         else {
            //otherwise we'll hide it
            this.highlightMinimumPriceText.attr("display", "none");
         }
      }
   }
}
