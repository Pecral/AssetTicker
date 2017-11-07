import { ExchangeTickerType } from './../../../shared/models/exchange-ticker-type';
import { ExchangeTickerHandlerService } from './../../../shared/services/exchange-ticker-handler.service';
import { Subscription } from 'rxjs/Subscription';
import { ExchangeAssetPair, PriceChangeState } from './../../../shared/models/exchange-asset-pair';
import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ChangeDetectorRef } from '@angular/core';

@Component({
   selector: 'exchange-asset-pair',
   templateUrl: './exchange-asset-pair.component.html',
   styleUrls: ['./exchange-asset-pair.component.scss'],
   animations: [
      trigger('priceChangeAnimation', [
         transition(`${PriceChangeState.Neutral} => ${PriceChangeState.Falling}`, [
            style({
               backgroundColor: '#631919',
               color: '#ff7f7f'
            }),
            animate('1500ms linear')
         ]),
         transition(`${PriceChangeState.Neutral} => ${PriceChangeState.Rising}`, [
            style({
               backgroundColor: '#044404',
               color: '#48dc48'
            }),
            animate('1500ms linear')
         ])
      ])
   ]
})
export class ExchangeAssetPairComponent implements OnInit, OnDestroy {

   @Input()
   exchangeAssetPair: ExchangeAssetPair;

   priceChangeState: PriceChangeState;

   /** The ticker subscription is saved globally so that we can unsubscribe from it once this component gets destroyed */
   private tickerSubscription: Subscription;

   constructor(private changeDetectorRef: ChangeDetectorRef, private exchangeHandler: ExchangeTickerHandlerService) { }

   ngOnInit() {
      let exchange =this.exchangeHandler.getExchangeTicker(ExchangeTickerType[this.exchangeAssetPair.exchange]);
      //subscribe for ticker
      this.tickerSubscription = exchange.subscribeToTickerMessages(this.exchangeAssetPair.pair.symbol).subscribe(tickerMessage => {
         if(this.exchangeAssetPair.latestTicker) {
            let previousPrice = this.exchangeAssetPair.latestTicker.lastPrice;

            //save new ticker message first because we don't want the coloring-animation to be triggered before the new price-number is displayed
            this.exchangeAssetPair.latestTicker = tickerMessage;            

            //reset to neutral price-change-state beforehand to trigger transition-animation
            this.priceChangeState = PriceChangeState.Neutral;

            if(previousPrice < tickerMessage.lastPrice) {
               //trigger change detection for fast switches
               this.changeDetectorRef.detectChanges();
               //set to rising price-change-state because the new price is higher
               this.priceChangeState = PriceChangeState.Rising;
            }
            else if(previousPrice > tickerMessage.lastPrice) {
               this.changeDetectorRef.detectChanges();
               //set to falling price-change-state because the new price is lower
               this.priceChangeState = PriceChangeState.Falling;
            }
         }
         else {
            //save new ticker message
            this.exchangeAssetPair.latestTicker = tickerMessage;
         }
      });
   }

   ngOnDestroy(): void {
      if(this.tickerSubscription) {
         this.tickerSubscription.unsubscribe();
      }
   }   

   
}

