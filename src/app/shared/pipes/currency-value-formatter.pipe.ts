import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
   name: 'currencyValueFormatter'
})
export class CurrencyValueFormatterPipe implements PipeTransform {

   fiatCurrency: string[] = ['EUR', 'USD', 'GBP', 'JPY', 'RUB', 'KRW', 'INR'];

   transform(valueString: any, symbol: string): any {
      //sometimes we get a string as a value
      let value: number = +valueString;

      if(value == NaN) {
         return valueString;
      }

      if (!value || value == 0) {
         return value
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
         else if(value >= 1000000) {
            return ((value / 1000000).toFixed(1) + 'M');
         }

         else if (value >= 10000) {
            return ((value / 1000).toFixed(1) + 'k');
         }
         else {
            return value.toFixed(2);
         }
      }
   }

}