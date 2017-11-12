import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs/Subscription';

import { ExchangeTickerHandlerService } from '../../shared/services/exchange-ticker-handler.service';

import { ExchangeTicker } from '../../shared/services/exchange-ticker';
import { ExchangeTickerType } from '../../shared/models/exchange-ticker-type';
import { AssetTrade } from '../../shared/models/asset-trade';

@Component({
   selector: 'asset-detail',
   templateUrl: './asset-detail.component.html',
   styleUrls: ['./asset-detail.component.scss']
})
export class AssetDetailComponent implements OnInit, OnDestroy {


   /** search key for symbol pair search */
   symbolPairSearchKey: string;
   
   availableSymbolPairs: string[];

   /** current exchange */
   currentExchange: ExchangeTicker;

   /** current symbol pair */
   currentSymbolPair: string = '';

   /** current candle-stick timeframe */
   currentTimeframe: string;

   filteredSymbolPairs: string[] = [];   

   tradeSubscription: Subscription;
   
   lastTrade: AssetTrade;   

   constructor(
      private route: ActivatedRoute,
      private router: Router,
      private exchangeHandler: ExchangeTickerHandlerService,
      private titleService: Title) { }

   ngOnInit() {
      this.route.params.subscribe(params => {
         let exchangeParam:string = params['exchange'];
         let exchange = ExchangeTickerType[this.convertWordToPascalCase(exchangeParam.toLowerCase())];

         //if the requested exchange does not exist, we'll navigate to the start page
         if(exchange == undefined) {
            this.router.navigate(['']);
         }

         let symbolpair: string = params['symbolpair'];
         symbolpair = symbolpair.toUpperCase();

         let timeframeParam = params['timeframe'];

         if(timeframeParam) {
            this.currentTimeframe = timeframeParam;
         }
         else {
            this.currentTimeframe = '15m';
         }

         this.load(exchange, symbolpair, this.currentTimeframe);
      });
   }

   ngOnDestroy(): void {
      this.unsubscribe();
   }   

   /** Converts a single word to pascal case */
   convertWordToPascalCase(text:string):string {
      return text.charAt(0).toUpperCase() + text.slice(1);
   }

   load(exchange: ExchangeTickerType, symbol: string, timeframe: string) {
      this.currentExchange = this.exchangeHandler.getExchangeTicker(exchange);

      this.currentExchange.getAvailableAssetPairs().subscribe(result => {
         this.availableSymbolPairs = result.map(x => x.symbol);

         //check if requested pair exists
         if(this.availableSymbolPairs.findIndex(x => x.toUpperCase() == symbol.toUpperCase()) != -1) {
            //load btcusd as standard pair
            this.loadSymbolPair(symbol);
         }
         else {
            //navigate to start-page as a fallback
            this.router.navigate(['']);
         }
      });
   }

   switchSymbolPair(pair: string) {
      this.router.navigate([`${ExchangeTickerType[this.currentExchange.exchangeType]}/${pair}/${this.currentTimeframe}`]);
   }

   /** Load trades, orderbooks and candle sticks of specific symbol pair */
   loadSymbolPair(pair: string): void {
      //if the pair is not available or we're already subscribed to it, we'll do nothing
      //TODO: Alert window
      if (!this.availableSymbolPairs.find(availablePair => availablePair.toLowerCase() == pair.toLowerCase()) || this.currentSymbolPair.toLowerCase() == pair.toLowerCase()) {
         //console.error(`Requested asset pair ${pair} is not available for this exchange!`);
         return;
      }

      //unsubsribe from old pair
      this.unsubscribe();

      this.currentSymbolPair = pair.toUpperCase();
      this.symbolPairSearchKey = this.currentSymbolPair; //refresh search key for proper upper-case

      this.currentExchange.websocketIsConnected.filter(isOpen => isOpen).subscribe(isOpen => {
         //always save the latest subscripton
         this.tradeSubscription = this.currentExchange.subscribeToAssetTrades(pair).filter(trade => trade !== null).subscribe(assetTrade => {
            this.lastTrade = assetTrade;
            //update tab title
            this.titleService.setTitle(`${assetTrade.price} ${this.currentSymbolPair} - ${ExchangeTickerType[this.currentExchange.exchangeType]} Chart`);
         });
      })
   }   
   
   /** This method is called when the user presses enter in the symbol-pair search
    * We'll load the currently entered pair then.
    */
    symbolPairSearchKeyReleased(event) {
      if(event.keyCode == 13) {
         if(this.availableSymbolPairs.findIndex(x => x.toUpperCase() == this.symbolPairSearchKey.toUpperCase()) != -1) {
            this.currentSymbolPair = this.symbolPairSearchKey;
         }
      }
   }

   /** Filter symbol-pair search based on the current search-key */
   filterSymbolPairs(searchKey) {
      this.filteredSymbolPairs = [];

      for(let availablePair of this.availableSymbolPairs) {
         if (availablePair.toLowerCase().indexOf(searchKey.toLowerCase()) != -1) {
            this.filteredSymbolPairs.push(availablePair);
         }
      }     
   }

   /** unsubscribe from current trading pair */
   unsubscribe() {
      if (this.tradeSubscription) {
         this.tradeSubscription.unsubscribe();
         this.currentExchange.unsubscribeFromAssetTrades(this.currentSymbolPair);
         this.currentExchange.unsubscribeFromOrderBook(this.currentSymbolPair);
      }      
   }
}
