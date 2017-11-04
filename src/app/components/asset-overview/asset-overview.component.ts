import { TickerMessage } from './../../shared/models/ticker-message';
import { ExchangeTickerType } from './../../shared/models/exchange-ticker-type';
import { AssetPair } from './../../shared/models/asset-pair';
import { ExchangeTickerHandlerService } from './../../shared/services/exchange-ticker-handler.service';
import { Component, OnInit } from '@angular/core';
import { ExchangeTicker } from '../../shared/services/exchange-ticker';
import { Asset } from '../../shared/models/asset';

@Component({
   selector: 'asset-overview',
   templateUrl: './asset-overview.component.html',
   styleUrls: ['./asset-overview.component.scss']
})
export class AssetOverviewComponent implements OnInit {

   availableAssets: Asset[] = [];

   availableExchanges: string[] = [];

   exchangeAssetPairs: ExchangeAssetPair[] = [];

   private primaryAssetPairs = new Map<Asset, ExchangeAssetPair>();

   private exchangeServices: ExchangeTicker[] = [];

   constructor(private _exchangeHandler: ExchangeTickerHandlerService) {

   }

   ngOnInit() {

      this.availableExchanges = Array.from(this._exchangeHandler.exchangeServiceMap.keys()).map(x => ExchangeTickerType[x].toString());

      this.exchangeServices = Array.from(this._exchangeHandler.exchangeServiceMap.values());

      //save asset pairs
      for (let exchange of this.exchangeServices) {
         exchange.websocketIsConnected.filter(isConnected => isConnected).subscribe(isConnected => {
            exchange.getAvailableAssetPairs().subscribe(pairs => {
               for (let pair of pairs) {
                  if(pair.symbol.startsWith("LTC")) {
                     let exchangeAssetPair = new ExchangeAssetPair();
                     exchangeAssetPair.exchange = ExchangeTickerType[exchange.exchangeType];
                     exchangeAssetPair.pair = pair;
   
                     //subscribe for ticker
                     exchange.subscribeToTickerMessages(pair.symbol).subscribe(tickerMessage => exchangeAssetPair.latestTicker = tickerMessage);
   
                     this.exchangeAssetPairs.push(exchangeAssetPair);
                  }
               }

               this.availableAssets = this.availableAssets.concat(pairs.filter(x => x.primaryAsset.shortcode.toUpperCase() == 'LTC').map(x => x.primaryAsset));
               //distinct
               this.availableAssets = this.availableAssets.filter((asset, index) => this.availableAssets.indexOf(asset) == index);
            });
         })
      }
   }

   getExchangeAssetPairs(asset: Asset): ExchangeAssetPair[] {
      return this.exchangeAssetPairs.filter(x => x.pair.primaryAsset.shortcode == asset.shortcode);
   }

   /** Returns the primarily traded asset pair for this asset (USD or EUR based)
    */
   getPrimaryAssetPair(asset: Asset): ExchangeAssetPair {
      if (this.primaryAssetPairs.has(asset)) {
         this.primaryAssetPairs.get(asset);
      }

      //filter for usd-based pairs --TODO: Priority by settings
      let importantFiat = ['USD', 'EUR'];

      let fiatPriority = this.exchangeAssetPairs.filter(x => x.pair.primaryAsset.shortcode == asset.shortcode && importantFiat.indexOf(x.pair.secondaryAsset.shortcode.toUpperCase()) != -1);
      let volumePriority = fiatPriority.sort((assetA, assetB) => (assetA.latestTicker == null ? 0 : assetA.latestTicker.volume) - (assetB.latestTicker == null ? 0 : assetB.latestTicker.volume));

      if (volumePriority.length > 0) {
         let priorityPair = volumePriority[0];
         //safe only if volume is already received
         if(priorityPair.latestTicker) {
            this.primaryAssetPairs.set(asset, volumePriority[0]);
         }
         
         return volumePriority[0];
      }
      else {
         //if it's not availe for the important fiat-currencies, we'll order by volume only
         volumePriority = this.exchangeAssetPairs.filter(x => x.pair.primaryAsset.shortcode == asset.shortcode).sort((assetA, assetB) => (assetA.latestTicker == null ? 0 : assetA.latestTicker.volume) - (assetB.latestTicker == null ? 0 : assetB.latestTicker.volume));

         let priorityPair = volumePriority[0];

         //safe only if volume is already received
         if(priorityPair.latestTicker) {
            this.primaryAssetPairs.set(asset, volumePriority[0]);
         }

         return priorityPair;
      }
   }

}

//component-specific class, could be moved to a separate file
class ExchangeAssetPair {
   exchange: string;

   pair: AssetPair;

   latestTicker: TickerMessage;
}