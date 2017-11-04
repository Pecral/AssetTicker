export class CandleStick {
   date: Date;

   /**
    * First execution during the time frame
    */
   open: number;
   /**
    * Last execution during the time frame
    */
   close: number;
   /**
    * Highest execution during the time frame
    */
   high: number;

   /**
    * Lowest execution during the timeframe
    */
   low: number;

   /**
    * Quantity of symbol traded within the timeframe
    */
   volume: number;
}