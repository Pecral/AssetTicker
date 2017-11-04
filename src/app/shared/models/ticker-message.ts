export class TickerMessage {
   /** Price of last highest bid */
   bid: number;
   
   /** Size of the last highest bid */
   bidSize: number;

   /** Price of last lowest ask */
   ask: number;

   /** Size of the last lowest ask */
   askSize: number;

   /** Amount that the last price has changed since yesterday */
   dailyChange: number;

   /** Amount that the price has changed expressed in percentage terms */
   dailyChangePercent: number;

   /** Price of the last trade. */
   lastPrice: number;

   /** Daily volume */
   volume: number;

   /** Daily high */
   high: number;

   /** Daily low */
   low: number;      
}