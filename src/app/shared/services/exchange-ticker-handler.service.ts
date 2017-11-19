import { AssetTrade } from './../models/asset-trade';
import { Observable } from 'rxjs/Observable';
import { ExchangeTicker } from './exchange-ticker';
import { BitfinexTickerService } from './bitfinex/bitfinex-ticker.service';
import { Injectable } from '@angular/core';
import { ExchangeTickerType } from '../models/exchange-ticker-type';
import { GdaxExchangeService } from './gdax/gdax-exchange.service';

@Injectable()
export class ExchangeTickerHandlerService {

   exchangeServiceMap : Map<ExchangeTickerType, ExchangeTicker> = new Map<ExchangeTickerType, ExchangeTicker>();

   constructor(private bitfinexTicker: BitfinexTickerService, private gdaxService: GdaxExchangeService) { 
      this.exchangeServiceMap.set(ExchangeTickerType.Bitfinex, bitfinexTicker);
      // this.exchangeServiceMap.set(ExchangeTickerType.GDAX, gdaxService);
   }

   getExchangeTicker(exchange : ExchangeTickerType): ExchangeTicker {
      if(this.exchangeServiceMap.has(exchange)) {
         return this.exchangeServiceMap.get(exchange);
      }
      else {
         console.error(`Requested exchange ${exchange} is not supported!`);
      }
   }
}

