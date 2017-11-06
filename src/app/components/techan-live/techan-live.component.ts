import { D3Service, D3, Axis, DSVParsedArray } from 'd3-ng2-service';
import { CandleStick } from './../../shared/models/candle-stick';
import { Subscription } from 'rxjs/Subscription';
import { ExchangeTickerHandlerService } from './../../shared/services/exchange-ticker-handler.service';
import { Component, OnInit, Input, ElementRef, ViewEncapsulation, OnDestroy } from '@angular/core';
import { ExchangeTickerType } from '../../shared/models/exchange-ticker-type';
import { ExchangeTicker } from '../../shared/services/exchange-ticker';
import { Selection, BaseType, ArrayLike, ValueFn } from 'd3-selection';

import * as d3 from 'd3';
import * as techan from 'techan';
import { Router } from '@angular/router';


@Component({
   selector: 'techan-live',
   templateUrl: './techan-live.component.html',
   styleUrls: ['./techan-live.component.scss'],
   encapsulation: ViewEncapsulation.None
})
export class TechanLiveComponent implements OnInit, OnDestroy {


   private _symbolPair: string;
   @Input()
   set symbolPair(value: string) {
      if (this.currentExchange && this._symbolPair && value != this._symbolPair) {
         this.unsubscribe();
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
         this.unsubscribe();
      }

      this._exchangeTickerType = value;
      this.subscribeToCandles();
   }
   get exchangeTickerType(): ExchangeTickerType {
      return this._exchangeTickerType;
   }

   private _timeframe: string;
   @Input()
   set timeframe(value: string) {
      if(this.currentExchange && this._symbolPair && value != this._timeframe) {
         this.unsubscribe();
      }

      this._timeframe = value;
      this.subscribeToCandles();
   }
   get timeframe(): string {
      return this._timeframe;
   }

   //#region D3/Techan settings
   private d3: D3; // <-- Define the private member which will hold the d3 reference
   private parentNativeElement: any;
   private svg: any; //probably Selection<SVGSVGElement, any, null, undefined>;  

   dim = {
      width: null, height: null,
      margin: { top: 20, right: 70, bottom: 150, left: 70 },
      plot: { width: null, height: null },
      ohlc: { height: null },
      indicator: { height: null, padding: null, top: null, bottom: null }
   };

   x: any;
   y: any;
   yPercent: any;
   indicatorTop: any;
   yVolume: any;
   candlestick: any;
   sma0: any;
   sma1: any;
   ema2: any;
   volume: any;
   xAxis: any;
   xAxisTop: any;
   timeAnnotation: any;
   timeAnnotationTop: any;
   yAxis: any;
   ohlcAnnotation: any;
   closeAnnotation: any;
   percentAxis: any;
   percentAnnotation: any;
   volumeAxis: any;
   volumeAnnotation: any;
   ohlcCrosshair: any;

   macdScale: any;
   rsiScale: any;
   macd: any;
   macdAxis: any;
   macdAnnotation: any;
   macdAxisLeft: any;
   macdAnnotationLeft: any;
   rsi: any;
   rsiAxis: any;
   rsiAnnotation: any;
   rsiAxisLeft: any;
   rsiAnnotationLeft: any;
   macdCrosshair: any;
   rsiCrosshair: any;
   //data properties
   macdData: any;
   rsiData: any;

   candleLimit: number = 200; //limit number of candles that should be displayed

   //#endregion   

   currentExchange: ExchangeTicker;

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
   candlesSnapshotSubscription: Subscription;
   candles: CandleStick[] = [];

   constructor(private exchangeHandler: ExchangeTickerHandlerService, private element: ElementRef, private d3Service: D3Service, private router: Router) {
      this.d3 = this.d3Service.getD3(); // <-- obtain the d3 object from the D3 Service
      this.parentNativeElement = this.element.nativeElement;
   }

   ngOnDestroy(): void {
      this.unsubscribe();
   }   

   unsubscribe() {
      if(this.candleSubscription && this.candlesSnapshotSubscription) {
         this.candleSubscription.unsubscribe();
         this.candlesSnapshotSubscription.unsubscribe();
         this.currentExchange.unsubscribeFromCandles(this._symbolPair, this._timeframe);
      }
   }

   /** Load order book with the currently saved configuration */
   subscribeToCandles(): void {
      if (this._symbolPair && this._exchangeTickerType !== undefined && this._timeframe) {
         this.currentExchange = this.exchangeHandler.getExchangeTicker(this._exchangeTickerType);
         this.candles = [];

         this.currentExchange.websocketIsConnected.subscribe(isConnected => {
            if (isConnected) {
               //wait till snapshot is received
               this.candlesSnapshotSubscription = this.currentExchange.receivedCandlestickSnapshot(this._symbolPair, this.timeframe).filter(hasReceived => hasReceived).subscribe(received => {
                  //save snapshot
                  this.candles = this.currentExchange.getCandlesSnapshot(this._symbolPair, this.timeframe).slice();

                  //load candles
                  this.loadCandleSticks();

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
                     this.loadCandleSticks();
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

      this.draw(d3.select("#bigChart"));
      // Associate the zoom with the scale after a domain has been applied
      // Stash initial settings to store as baseline for zooming
      //this.zoomableInit = this.x.zoomable().clamp(false).copy();
   }

   ngOnInit(): void {

      this.x = techan.scale.financetime();
      this.y = d3.scaleLinear();
      this.yPercent = this.y.copy();
      this.indicatorTop = d3.scaleLinear();
      this.yVolume = d3.scaleLinear();
      this.candlestick = techan.plot.candlestick().xScale(this.x).yScale(this.y);
      this.sma0 = techan.plot.sma().xScale(this.x).yScale(this.y);
      this.sma1 = techan.plot.sma().xScale(this.x).yScale(this.y);
      this.ema2 = techan.plot.ema().xScale(this.x).yScale(this.y);
      this.volume = techan.plot.volume().accessor(this.candlestick.accessor()).xScale(this.x).yScale(this.yVolume);
      this.xAxis = d3.axisBottom(this.x);
      this.xAxisTop = d3.axisTop(this.x);
      this.timeAnnotation = techan.plot.axisannotation().orient('bottom').axis(this.xAxis).format(d3.timeFormat('%Y-%m-%d %H:%M')).width(95);
      this.timeAnnotationTop = techan.plot.axisannotation().orient('top').axis(this.xAxisTop).format(d3.timeFormat('%Y-%m-%d %H:%M')).width(95);
      this.yAxis = d3.axisRight(this.y);
      this.ohlcAnnotation = techan.plot.axisannotation().orient('right').axis(this.yAxis).format(d3.format(',.2f'));
      this.closeAnnotation = techan.plot.axisannotation().orient('right').accessor(this.candlestick.accessor()).axis(this.yAxis).format(d3.format(',.2f'));
      this.percentAxis = d3.axisLeft(this.yPercent).tickFormat(d3.format('+.1%'));
      this.percentAnnotation = techan.plot.axisannotation().orient('left').axis(this.percentAxis);
      this.volumeAxis = d3.axisRight(this.yVolume).ticks(3).tickFormat(d3.format(',.3s'));
      this.volumeAnnotation = techan.plot.axisannotation().orient('right').axis(this.volumeAxis).width(35);

      this.ohlcCrosshair = techan.plot.crosshair()
                                      .xScale(this.x)
                                      .yScale(this.y)
                                      .xAnnotation([this.timeAnnotation, this.timeAnnotationTop])
                                      .yAnnotation([this.ohlcAnnotation, this.percentAnnotation, this.volumeAnnotation])
                                      .on('move', this.ohlcCrosshairMove.bind(this));
      this.macdScale = d3.scaleLinear();
      this.rsiScale = d3.scaleLinear();
      this.macd = techan.plot.macd().xScale(this.x).yScale(this.macdScale);
      this.macdAxis = d3.axisRight(this.macdScale).ticks(3);
      this.macdAnnotation = techan.plot.axisannotation().orient('right').axis(this.macdAxis).format(d3.format(',.2s'));
      this.macdAxisLeft = d3.axisLeft(this.macdScale).ticks(3);
      this.macdAnnotationLeft = techan.plot.axisannotation().orient('left').axis(this.macdAxisLeft).format(d3.format(',.2s'));
      this.rsi = techan.plot.rsi().xScale(this.x).yScale(this.rsiScale);
      this.rsiAxis = d3.axisRight(this.rsiScale).ticks(3);
      this.rsiAnnotation = techan.plot.axisannotation().orient('right').axis(this.rsiAxis).format(d3.format(',.2s'));
      this.rsiAxisLeft = d3.axisLeft(this.rsiScale).ticks(3);
      this.rsiAnnotationLeft = techan.plot.axisannotation().orient('left').axis(this.rsiAxisLeft).format(d3.format(',.2s'));
      
      this.macdCrosshair = techan.plot.crosshair().xScale(this.x).yScale(this.macdScale).xAnnotation([this.timeAnnotation, this.timeAnnotationTop]).yAnnotation([this.macdAnnotation, this.macdAnnotationLeft]);
      this.rsiCrosshair = techan.plot.crosshair().xScale(this.x).yScale(this.rsiScale).xAnnotation([this.timeAnnotation, this.timeAnnotationTop]).yAnnotation([this.rsiAnnotation, this.rsiAnnotationLeft]);

      let selection = d3.select("#bigChart");

      var svg = selection.append("svg"),
         defs = svg.append("defs");

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

      svg.append('text')
         .attr("class", "version")
         .style("text-anchor", "end")
         .text("TechanJS v" + techan.version + ", D3 v" + d3.version);

      svg = svg.append("g")
         .attr("class", "chart")
         .attr("transform", "translate(" + this.dim.margin.left + "," + this.dim.margin.top + ")");

      svg.append('text')
         .attr("class", "symbol")
         .attr("x", 5)
         .attr("y", 15)
         .text("Stock name");

      svg.append("g")
         .attr("class", "x axis bottom");

      svg.append("g")
         .attr("class", "x axis top");

      var ohlcSelection = svg.append("g")
         .attr("class", "ohlc")
         .attr("transform", "translate(0,0)");

      ohlcSelection.append("g")
         .attr("class", "y axis");

      ohlcSelection.append("g")
         .attr("class", "closeValue annotation up");

      ohlcSelection.append("g")
         .attr("class", "volume")
         .attr("clip-path", "url(#ohlcClip)");

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

      ohlcSelection.append("g")
         .attr("class", "volume axis");

      var indicatorSelection = svg.selectAll("svg > g.indicator").data(["macd", "rsi"]).enter()
         .append("g")
         .attr("class", function (d) { return d + " indicator"; });

      indicatorSelection.append("g")
         .attr("class", "axis right");

      indicatorSelection.append("g")
         .attr("class", "axis left");

      indicatorSelection.append("g")
         .attr("class", "indicator-plot")
         .attr("clip-path", function (d, i) { return "url(#indicatorClip-" + i + ")"; });

      // Add trendlines and other interactions last to be above zoom pane
      svg.append('g')
         .attr("class", "crosshair ohlc");

      // svg.append('g')
      //    .attr("class", "crosshair macd");

      // svg.append('g')
      //    .attr("class", "crosshair rsi");

      this.updateValues(selection);
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
   }

   resize(selection) {
      this.dim.width = selection.node().clientWidth;
      this.dim.height = selection.node().clientHeight;

      let svgWrapper = document.querySelector('.svg-wrapper');

      this.dim.plot.width = this.dim.width - this.dim.margin.left - this.dim.margin.right;
      this.dim.plot.height = this.dim.height - this.dim.margin.top - this.dim.margin.bottom;
      this.dim.ohlc.height = this.dim.plot.height * (1-0.01111111111);//0.67777777;
      this.dim.indicator.height = this.dim.plot.height * 0.144444;
      this.dim.indicator.padding = this.dim.plot.height * 0.01111111111;
      this.dim.indicator.top = this.dim.ohlc.height + this.dim.indicator.padding;
      this.dim.indicator.bottom = this.dim.indicator.top + this.dim.indicator.height + this.dim.indicator.padding;

      var xRange = [0, this.dim.plot.width],
         yRange = [this.dim.ohlc.height, 0],
         ohlcVerticalTicks = Math.min(10, Math.round(this.dim.height / 70)),
         xTicks = Math.min(10, Math.round(this.dim.width / 130));

      this.indicatorTop.range([this.dim.indicator.top, this.dim.indicator.bottom]);
      this.x.range(xRange);
      this.xAxis.ticks(xTicks);
      this.xAxisTop.ticks(xTicks);
      this.y.range(yRange);
      this.yAxis.ticks(ohlcVerticalTicks);
      this.yPercent.range(this.y.range());
      this.percentAxis.ticks(ohlcVerticalTicks);
      this.yVolume.range([yRange[0], yRange[0] - 0.2 * yRange[0]]);
      this.volumeAxis.ticks(Math.min(3, Math.round(this.dim.height / 150)));
      this.timeAnnotation.translate([0, this.dim.plot.height]);
      this.ohlcAnnotation.translate([xRange[1], 0]);
      this.closeAnnotation.translate([xRange[1], 0]);

      // this.macdScale.range([this.indicatorTop(0) + this.dim.indicator.height, this.indicatorTop(0)]);
      // this.rsiScale.range([this.indicatorTop(1) + this.dim.indicator.height, this.indicatorTop(1)]);
      // this.macdAnnotation.translate([xRange[1], 0]);
      // this.rsiAnnotation.translate([xRange[1], 0]);
      // this.ohlcCrosshair.verticalWireRange([0, this.dim.plot.height]);
      // this.macdCrosshair.verticalWireRange([0, this.dim.plot.height]);
      // this.rsiCrosshair.verticalWireRange([0, this.dim.plot.height]);

      selection.select("svg")
         .attr("width", this.dim.width)
         .attr("height", this.dim.height);

      selection.select("text.version")
         .attr("x", this.dim.width - 5)
         .attr("y", this.dim.height);

      selection.selectAll("defs #ohlcClip > rect")
         .attr("width", this.dim.plot.width)
         .attr("height", this.dim.ohlc.height);

      // selection.selectAll("defs .indicatorClip > rect")
      //    .attr("y", function (d, i) {
      //       return this.indicatorTop(i);
      //    })
      //    .attr("width", this.dim.plot.width)
      //    .attr("height", this.dim.indicator.height);

      selection.select("g.x.axis.bottom")
         .attr("transform", "translate(0," + this.dim.plot.height + ")");

      selection.select("g.ohlc g.y.axis")
         .attr("transform", "translate(" + xRange[1] + ",0)");

      selection.selectAll("g.indicator g.axis.right")
         .attr("transform", "translate(" + xRange[1] + ",0)");
      selection.selectAll("g.indicator g.axis.left")
         .attr("transform", "translate(" + xRange[0] + ",0)");
   }

   updateValues(selection): void {
      var svg = selection.select("svg");
      var accessor = this.candlestick.accessor(),
         indicatorPreRoll = this.candles.length > this.candleLimit ? this.candles.length - this.candleLimit : 0,
         postRollData = this.candles.slice(indicatorPreRoll);  // Don't show where indicators don't have data

      this.x.domain(techan.scale.plot.time(this.candles).domain());
      this.y.domain(techan.scale.plot.ohlc(postRollData).domain());
      if (this.candles.length > 0) {
         this.updateLegendWithCandleInformation(this.candles[this.candles.length -1]);
         this.yPercent.domain(techan.scale.plot.percent(this.y, accessor(this.candles[indicatorPreRoll])).domain());
      }

      this.yVolume.domain(techan.scale.plot.volume(postRollData).domain());

      this.macdData = techan.indicator.macd()(this.candles);
      this.macdScale.domain(techan.scale.plot.macd(this.macdData).domain());
      this.rsiData = techan.indicator.rsi()(this.candles);
      this.rsiScale.domain(techan.scale.plot.rsi(this.rsiData).domain());

      this.x.zoomable().domain([indicatorPreRoll, this.candles.length]); // Zoom in a little to hide indicator preroll
      this.resize(selection);

      svg.select("g.candlestick").datum(this.candles).call(this.candlestick);
      if (this.candles.length > 0) {
         svg.select("g.closeValue.annotation").datum([this.candles[this.candles.length - 1]]).call(this.closeAnnotation);
      }
      svg.select("g.volume").datum(this.candles).call(this.volume);
      svg.select("g.sma.ma-0").datum(techan.indicator.sma().period(10)(this.candles)).call(this.sma0);
      svg.select("g.sma.ma-1").datum(techan.indicator.sma().period(20)(this.candles)).call(this.sma1);
      svg.select("g.ema.ma-2").datum(techan.indicator.ema().period(50)(this.candles)).call(this.ema2);

      svg.select("g.crosshair.ohlc").call(this.ohlcCrosshair);
      
      // svg.select("g.macd .indicator-plot").datum(this.macdData).call(this.macd);
      // svg.select("g.rsi .indicator-plot").datum(this.rsiData).call(this.rsi);

      // svg.select("g.crosshair.macd").call(this.macdCrosshair);
      // svg.select("g.crosshair.rsi").call(this.rsiCrosshair);
   }

   draw(selection): void {
      // debugger;
      var svg = selection.select("svg");
      svg.select("g.x.axis.bottom").call(this.xAxis);
      svg.select("g.x.axis.top").call(this.xAxisTop);
      svg.select("g.ohlc .axis").call(this.yAxis);
      svg.select("g.volume.axis").call(this.volumeAxis);
      svg.select("g.percent.axis").call(this.percentAxis);

      // svg.select("g.macd .axis.right").call(this.macdAxis);
      // svg.select("g.rsi .axis.right").call(this.rsiAxis);
      // svg.select("g.macd .axis.left").call(this.macdAxisLeft);
      // svg.select("g.rsi .axis.left").call(this.rsiAxisLeft);

      this.updateValues(selection);

      // Obsolete/not usable cause we're updating with live-values
      // We know the data does not change, a simple refresh that does not perform data joins will suffice.
      // svg.select("g.candlestick").call(candlestick.refresh);
      // svg.select("g.closeValue.annotation").call(closeAnnotation.refresh);
      // svg.select("g.volume").call(volume.refresh);
      // svg.select("g .sma.ma-0").call(sma0.refresh);
      // svg.select("g .sma.ma-1").call(sma1.refresh);
      // svg.select("g .ema.ma-2").call(ema2.refresh);
      // svg.select("g.macd .indicator-plot").call(macd.refresh);
      // svg.select("g.rsi .indicator-plot").call(rsi.refresh);
      // svg.select("g.crosshair.ohlc").call(ohlcCrosshair.refresh);
      // svg.select("g.crosshair.macd").call(macdCrosshair.refresh);
      // svg.select("g.crosshair.rsi").call(rsiCrosshair.refresh);
   }

   ohlcCrosshairMove(coords) {
      let candle = this.candles.find(x => x.date.getTime() == coords.x.getTime());
      if(candle) {
         this.updateLegendWithCandleInformation(candle);
      }
   }

   updateLegendWithCandleInformation(candle: CandleStick) {
      let legendText = d3.select("#bigChart svg text.symbol")["_groups"][0][0];
      legendText.innerHTML = `Close: ${candle.close} Volume: ${candle.volume.toFixed(3)}`;
   }
}
