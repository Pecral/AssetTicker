import { D3Service, D3 } from 'd3-ng2-service';
import { TickerMessage } from './../../shared/models/ticker-message';
import { ExchangeTickerType } from './../../shared/models/exchange-ticker-type';
import { AssetPair } from './../../shared/models/asset-pair';
import { ExchangeTickerHandlerService } from './../../shared/services/exchange-ticker-handler.service';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ExchangeTicker } from '../../shared/services/exchange-ticker';
import { Asset } from '../../shared/models/asset';
import { ExchangeAssetPair } from '../../shared/models/exchange-asset-pair';
import { Router } from '@angular/router';

@Component({
   selector: 'asset-overview',
   templateUrl: './asset-overview.component.html',
   styleUrls: ['./asset-overview.component.scss'],
   encapsulation: ViewEncapsulation.None
})
export class AssetOverviewComponent implements OnInit {

   availableAssets: Asset[] = [];

   availableExchanges: string[] = [];

   exchangeAssetPairs: ExchangeAssetPair[] = [];

   /** Primarily traded asset pairs for a asset
    * Key: Asset's shortcode e.g. BTC
    */
   primaryAssetPairs = new Map<string, ExchangeAssetPair>();

   private exchangeServices: ExchangeTicker[] = [];

   constructor(private _exchangeHandler: ExchangeTickerHandlerService, private router: Router) {
   }

   ngOnInit() {

      this.availableExchanges = Array.from(this._exchangeHandler.exchangeServiceMap.keys()).map(x => ExchangeTickerType[x].toString());

      this.exchangeServices = Array.from(this._exchangeHandler.exchangeServiceMap.values());

      //save asset pairs
      for (let exchange of this.exchangeServices) {
         exchange.websocketIsConnected.filter(isConnected => isConnected).subscribe(isConnected => {
            exchange.getAvailableAssetPairs().subscribe(pairs => {
               for (let pair of pairs) {
                  //if(pair.symbol.startsWith("BTCUSD")) {
                     let exchangeAssetPair = new ExchangeAssetPair();
                     exchangeAssetPair.exchange = ExchangeTickerType[exchange.exchangeType];
                     exchangeAssetPair.pair = pair;

                     this.exchangeAssetPairs.push(exchangeAssetPair);
                  //}
               }

               // this.availableAssets = this.availableAssets.concat(pairs.filter(x => x.primaryAsset.shortcode.toUpperCase() == 'BTC').map(x => x.primaryAsset));
               this.availableAssets = this.availableAssets.concat(pairs.map(x => x.primaryAsset));
               //distinct
               this.availableAssets = this.availableAssets.filter((asset, index) => this.availableAssets.findIndex(as => as.shortcode == asset.shortcode) == index);
            });
         })
      }
   }

   getExchangeAssetPairs(asset: Asset, excludePrimaryTradedPair: boolean): ExchangeAssetPair[] {
      if(excludePrimaryTradedPair) {
         let primarilyTradedPair = this.getPrimaryAssetPair(asset);

         return this.exchangeAssetPairs.filter(x => x.pair.primaryAsset.shortcode == asset.shortcode && !(x.exchange == primarilyTradedPair.exchange && x.pair.symbol == primarilyTradedPair.pair.symbol));
      }
      else {
         return this.exchangeAssetPairs.filter(x => x.pair.primaryAsset.shortcode == asset.shortcode);
      }
   }

   /** Returns the primarily traded asset pair for this asset (USD or EUR based)
    */
   getPrimaryAssetPair(asset: Asset): ExchangeAssetPair {
      if (this.primaryAssetPairs.has(asset.shortcode)) {
         this.primaryAssetPairs.get(asset.shortcode);
      }

      //filter for usd-based pairs --TODO: Priority by settings
      let importantFiat = ['USD', 'EUR'];

      let prioritizedAssets = this.exchangeAssetPairs.filter(x => x.pair.primaryAsset.shortcode == asset.shortcode).sort((assetA, assetB) => {
         let aIsFiat = importantFiat.indexOf(assetA.pair.secondaryAsset.shortcode.toUpperCase()) != -1 ? 1 : -1;
         let bIsFiat = importantFiat.indexOf(assetB.pair.secondaryAsset.shortcode.toUpperCase()) != -1 ? 1 : -1;

         //if only one of them is fiat, it is prioritized
         if(aIsFiat != bIsFiat) {
            return bIsFiat - aIsFiat;
         }
         //otherwise prioritize by volume
         else {
            return (assetA.latestTicker == null ? 0 : assetA.latestTicker.volume) - (assetB.latestTicker == null ? 0 : assetB.latestTicker.volume);
         }
      });;

      let priorityPair = prioritizedAssets[0];
      //save only if every asset pair already has received a ticker message
      if(this.exchangeAssetPairs.every(x => x.latestTicker !== undefined && x.latestTicker !== null)) {
         this.primaryAssetPairs.set(asset.shortcode, prioritizedAssets[0]);
      }
      
      return prioritizedAssets[0];
   }


}
