export class TimeframeResolver {
   static resolveToMinutes(timeframe: string) {
      let regex = /(\d*)(\w)/;
      let [, timeframeString, period] = regex.exec(timeframe);
      let timeframeNumber = parseInt(timeframeString);
      let minutes: number = 0;

      switch(period) {
         //minutes
         case 'm': 
            minutes = timeframeNumber;
         break;

         //hours
         case 'h':
            minutes = timeframeNumber * 60;
         break;

         //days
         case 'D':
            minutes = timeframeNumber * 24 * 60;
         break;

         //months
         case 'M':
            minutes = timeframeNumber * 30 * 24 * 60;
         break;

         default:
            console.warn(`TimeframeStringResolver ## Unexpected period ${period}`);
         break;
      }

      return minutes;
   }
}