export class TickerMessage {
   /** Price of last highest bid */
   bid: number = 0;
   
   /** Size of the last highest bid */
   bidSize: number = 0;

   /** Price of last lowest ask */
   ask: number = 0;

   /** Size of the last lowest ask */
   askSize: number = 0;

   /** Amount that the last price has changed since yesterday */
   dailyChange: number = 0;

   /** Amount that the price has changed expressed in percentage terms */
   dailyChangePercent: number = 0;

   /** Price of the last trade. */
   lastPrice: number = 0;

   /** Daily volume */
   volume: number = 0;

   /** Daily high */
   high: number = 0;

   /** Daily low */
   low: number = 0;      

   /** Daily open price */
   open: number = 0;

   timestamp: Date;
}