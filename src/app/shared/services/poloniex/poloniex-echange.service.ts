import { ExchangeTicker } from "../exchange-ticker";
import { BehaviorSubject } from "rxjs";
import { ExchangeTickerType } from "../../models/exchange-ticker-type";
import { Observable } from "rxjs/Observable";
import { AssetTrade } from "../../models/asset-trade";
import { AssetPair } from "../../models/asset-pair";
import { OrderBook } from "../../models/order-book";
import { OrderBookMessage } from "../../models/order-book-message";
import { CandleStick } from "../../models/candle-stick";
import { TickerMessage } from "../../models/ticker-message";
import { Asset } from "../../models/asset";
import { Http } from "@angular/http";
import { Injectable } from "@angular/core";

@Injectable()
export class PoloniexExchangeService implements ExchangeTicker {

   websocketIsConnected: BehaviorSubject<boolean> = new BehaviorSubject(true);
   exchangeType: ExchangeTickerType = ExchangeTickerType.Poloniex;

   private websocket: WebSocket;
   
   private readonly websocketUrl: string = 'wss://ws-feed.gdax.com';
   private readonly apiUrl: string = ' https://poloniex.com/public?command=';

   /** Saves the mapping from asset pair symbols to product keys */
   private symbolToProductMapping = new Map<string, string>();

   private tickerCache = new Map<string, TickerMessage>();
   
   constructor(private http: Http) {
      
   }

   subscribeToAssetTrades(pair: string): Observable<AssetTrade> {
      return Observable.empty<AssetTrade>();
   }
   unsubscribeFromAssetTrades(pair: string): void {
      
   }
   getAvailableAssetPairs(): Observable<AssetPair[]> {
      return this.http.get(this.apiUrl + 'returnTicker').map(result => {
         let assetPairs: AssetPair[] = [];
         let resultJson = result.json();

         //return empty array if request failed, log error
         if(result.status != 200 ) {
            console.log(`## Poloniex ## Error - Failed to request '/products'. Status code: ${result.statusText}`);
         }
         else {
            for(let pairKey in resultJson) {
               let assetPair = new AssetPair();

               let splitSymbol = pairKey.indexOf('_');
               let primarySymbol  = pairKey.substring(0, splitSymbol);
               let secondarySymbol = pairKey.substring(splitSymbol + 1);

               //in poloniex, every asset is grouped under either BTC, ETH, XMR or USDT (e.g. BTC_ETH, BTC_XMR)
               //their website lists them in a switched order (ETC/BTC instead of BTC_ETH), so we have to switch the symbols, too

               let baseAsset = new Asset();
               baseAsset.shortcode = secondarySymbol;
               assetPair.primaryAsset = baseAsset;

               let quoteAsset = new Asset();
               quoteAsset.shortcode = primarySymbol;
               assetPair.secondaryAsset = quoteAsset;

               assetPair.symbol = secondarySymbol + primarySymbol;

               this.symbolToProductMapping.set(assetPair.symbol, pairKey);

               assetPairs.push(assetPair);

               //temporary & dirty, cache ticker
               let tickerMessage = new TickerMessage();
               let tickerJson = resultJson[pairKey];

               tickerMessage.high = parseFloat(tickerJson.high24hr);
               tickerMessage.low = parseFloat(tickerJson.low24hr);
               tickerMessage.volume = parseFloat(tickerJson.quoteVolume);
               tickerMessage.dailyChangePercent = parseFloat(tickerJson.percentChange) * 100;
               tickerMessage.lastPrice = parseFloat(tickerJson.last);

               this.tickerCache.set(assetPair.symbol, tickerMessage);
            }
         }

         assetPairs = assetPairs.sort((a, b) => {
            let firstTicker = this.tickerCache.get(a.symbol);
            let secondTicker = this.tickerCache.get(b.symbol);

            return secondTicker.volume * secondTicker.lastPrice - firstTicker.volume * firstTicker.lastPrice;
         });
         
         return assetPairs;
      });

   }
   getOrderBook(pair: string): OrderBook {
      return new OrderBook();
   }
   getOrderBookMessages(pair: string): Observable<OrderBookMessage> {
      return Observable.empty<OrderBookMessage>();
   }
   unsubscribeFromOrderBook(pair: string): void {

   }
   getCandlesSnapshot(pair: string, timeFrame: string): Observable<CandleStick[]> {
      return Observable.empty<CandleStick[]>();
   }
   subscribeToCandles(pair: string, timeFrame: string): Observable<CandleStick> {
      return Observable.empty<CandleStick>();
   }
   unsubscribeFromCandles(pair: string, timeFrame: string): void {
      
   }
   subscribeToTickerMessages(pair: string): Observable<TickerMessage> {
      if(this.tickerCache.has(pair)) {
         return Observable.of(this.tickerCache.get(pair));
      }
      else {
         return Observable.empty<TickerMessage>();
      }
   }
   unsubscribeFromTickerMessages(pair: string): void {
   }
   
}