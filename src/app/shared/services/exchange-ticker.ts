import { AssetPair } from './../models/asset-pair';
import { TickerMessage } from './../models/ticker-message';
import { CandleStick } from './../models/candle-stick';
import { OrderBookMessage } from './../models/order-book-message';
import { OrderBook } from './../models/order-book';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { AssetTrade } from './../models/asset-trade';
import { Observable } from 'rxjs/Observable';
import { ExchangeTickerType } from '../models/exchange-ticker-type';

export interface ExchangeTicker {
    /** Use this observable to check whether we're connected to the exchange's websocket/API */
    websocketIsConnected: BehaviorSubject<boolean>;

    exchangeType: ExchangeTickerType;

    /** Get an observable for new trades of a specific asset pair e.g. XMRUSD */
    subscribeToAssetTrades(pair: string): Observable<AssetTrade>;
    unsubscribeFromAssetTrades(pair: string): void;

    /** Get a list of asset pairs which are traded on this exchange */
    getAvailableAssetPairs(): Observable<AssetPair[]>;

    getOrderBook(pair: string): OrderBook;
    getOrderBookMessages(pair: string): Observable<OrderBookMessage>;
    unsubscribeFromOrderBook(pair: string): void;

    /** Get trade candles for a specific time frame */
    getCandlesSnapshot(pair: string, timeFrame: string): CandleStick[];
    receivedCandlestickSnapshot(pair: string, timeFrame: string): BehaviorSubject<boolean>;
    subscribeToCandles(pair: string, timeFrame: string): Observable<CandleStick>;
    unsubscribeFromCandles(pair: string, timeFrame: string): void;

    subscribeToTickerMessages(pair: string): Observable<TickerMessage>;
    unsubscribeFromTickerMessages(pair: string): void;
}

