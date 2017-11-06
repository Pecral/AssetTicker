import { ExchangeAssetPair, PriceChangeState } from './../../../shared/models/exchange-asset-pair';
import { Component, OnInit, Input } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ChangeDetectorRef } from '@angular/core';

@Component({
   selector: 'exchange-asset-pair',
   templateUrl: './exchange-asset-pair.component.html',
   styleUrls: ['./exchange-asset-pair.component.scss'],
   animations: [
      trigger('priceChangeAnimation', [
         transition(`${PriceChangeState.Neutral} => ${PriceChangeState.Dropped}`, [
            style({
               backgroundColor: '#631919',
               color: '#ff7f7f'
            }),
            animate('1000ms linear')
         ]),
         transition(`${PriceChangeState.Neutral} => ${PriceChangeState.Risen}`, [
            style({
               backgroundColor: '#044404',
               color: '#48dc48'
            }),
            animate('1000ms linear')
         ])
      ])
   ]
})
export class ExchangeAssetPairComponent implements OnInit {

   priceChangeState: PriceChangeState;

   @Input()
   exchangeAssetPair: ExchangeAssetPair;

   constructor(private changeDetectorRef: ChangeDetectorRef) { }

   ngOnInit() {
      //subscribe on price changes
      this.exchangeAssetPair.priceChangeState.subscribe(change => {
         //reset to neutral beforehand to trigger animation
         this.priceChangeState = PriceChangeState.Neutral;
         //trigger change detection for fast switches
         this.changeDetectorRef.detectChanges();
         //apply new price-change-state
         this.priceChangeState = change;
      });
   }
}

