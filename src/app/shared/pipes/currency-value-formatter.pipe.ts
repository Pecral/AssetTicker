import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
   name: 'currencyValueFormatter'
})
export class CurrencyValueFormatterPipe implements PipeTransform {

   fiatCurrency: string[] = ['EUR', 'USD', 'GBP', 'JPY', 'RUB', 'KRW', 'INR'];

   transform(value: number, symbol: string): string {
      if(!value) {
         return;
      }

      if(value == 0) {
         return value.toString();
      }

      //if it's fiat, we only want to display 2 decimal places
      if (this.fiatCurrency.indexOf(symbol) != -1) {
         return value.toFixed(2);
      }
      else {
         if (value < 1) {
            //if the number is e.g. 0.00123456, we want to display at least 5 non-zero digits
            return value.toFixed(20).match(/^-?\d*\.?0*\d{0,5}/)[0];
         }
         else if (value >= 1 && value < 100) {
            return value.toFixed(4);
         }
         else if (value >= 100 && value < 1000) {
            return value.toFixed(3);
         }
         else if(value > 10000) {
            return ((value / 10000).toFixed(0) + 'k');
         }
         else {
            return value.toFixed(2);
         }
      }
   }

}