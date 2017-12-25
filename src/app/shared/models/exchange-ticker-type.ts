export enum ExchangeTickerType {
    Bitfinex,
    GDAX
}

export class ExchangeNameResolver {
   static Resolve(name: string): ExchangeTickerType {
      let nameNoCase = name.toLowerCase();
      switch(nameNoCase) {
         case "bitfinex":
            return ExchangeTickerType.Bitfinex;

         case "gdax":
         return ExchangeTickerType.GDAX;
      }

      return;
   }
}