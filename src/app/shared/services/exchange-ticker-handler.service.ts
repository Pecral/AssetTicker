import { AssetTrade } from './../models/asset-trade';
import { Observable } from 'rxjs/Observable';
import { ExchangeTicker } from './exchange-ticker';
import { BitfinexTickerService } from './bitfinex/bitfinex-ticker.service';
import { Injectable } from '@angular/core';
import { ExchangeTickerType } from '../models/exchange-ticker-type';

@Injectable()
export class ExchangeTickerHandlerService {

   exchangeServiceMap : Map<ExchangeTickerType, ExchangeTicker> = new Map<ExchangeTickerType, ExchangeTicker>();

   constructor(private bitfinexTicker: BitfinexTickerService) { 
      this.exchangeServiceMap.set(ExchangeTickerType.Bitfinex, bitfinexTicker);
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

