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
    /** Sends the exchange-service the command that it should unsubscribe from the asset-trades. This will only happen if no other component is subscribed to it. */
    unsubscribeFromAssetTrades(pair: string): void;

    /** Get a list of asset pairs which are traded on this exchange */
    getAvailableAssetPairs(): Observable<AssetPair[]>;

    /** Get the order book instance of a specific symbol pair */
    getOrderBook(pair: string): OrderBook;
    /** Get order book update-messages for a specific symbol pair */
    getOrderBookMessages(pair: string): Observable<OrderBookMessage>;
    /** Unsubscribe from the order book */
    unsubscribeFromOrderBook(pair: string): void;

    /** Get trade candles for a specific time frame */
    getCandlesSnapshot(pair: string, timeFrame: string): Observable<CandleStick[]>;
    /** Returns candle stick updates */
    subscribeToCandles(pair: string, timeFrame: string): Observable<CandleStick>;
    /** Sends the exchange-service the command that it should unsubscribe from the candles. This will only happen if no other component is subscribed to it. */
    unsubscribeFromCandles(pair: string, timeFrame: string): void;

    /** Returns ticker messages for a specific asset pair */
    subscribeToTickerMessages(pair: string): Observable<TickerMessage>;
    /** Sends the exchange-service the command that it should unsubscribe from the ticker messages. This will only happen if no other component is subscribed to it. */
    unsubscribeFromTickerMessages(pair: string): void;
}

