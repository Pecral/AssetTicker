import { ExchangeAssetPair } from './../../../shared/models/exchange-asset-pair';
import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'exchange-asset-pair',
  templateUrl: './exchange-asset-pair.component.html',
  styleUrls: ['./exchange-asset-pair.component.scss']
})
export class ExchangeAssetPairComponent implements OnInit {

   @Input()
   exchangeAssetPair: ExchangeAssetPair;

  constructor() { }

  ngOnInit() {
  }

}
