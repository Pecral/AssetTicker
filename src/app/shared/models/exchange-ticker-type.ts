export enum ExchangeTickerType {
    Bitfinex,
    GDAX,
    Poloniex
}

export class ExchangeNameResolver {
   static Resolve(name: string): ExchangeTickerType {
      let nameNoCase = name.toLowerCase();
      switch(nameNoCase) {
         case "bitfinex":
         return ExchangeTickerType.Bitfinex;

         case "gdax":
         return ExchangeTickerType.GDAX;
         
         case "poloniex":
         return ExchangeTickerType.Poloniex;
      }

      return;
   }
}