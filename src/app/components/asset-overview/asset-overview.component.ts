import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { D3Service, D3 } from 'd3-ng2-service';
import { TickerMessage } from './../../shared/models/ticker-message';
import { ExchangeTickerType } from './../../shared/models/exchange-ticker-type';
import { AssetPair } from './../../shared/models/asset-pair';
import { ExchangeTickerHandlerService } from './../../shared/services/exchange-ticker-handler.service';
import { ExchangeTicker } from '../../shared/services/exchange-ticker';
import { Asset } from '../../shared/models/asset';
import { ExchangeAssetPair } from '../../shared/models/exchange-asset-pair';
import { fadeAnimation } from '../../styles/animations/angular/fade';

@Component({
   selector: 'asset-overview',
   templateUrl: './asset-overview.component.html',
   styleUrls: ['./asset-overview.component.scss'],
   animations: [fadeAnimation],
   encapsulation: ViewEncapsulation.None
})
export class AssetOverviewComponent implements OnInit {

   availableAssets: Asset[] = [];
   filteredAssets: Asset[] = [];

   availableExchanges: string[] = [];

   exchangeAssetPairs: ExchangeAssetPair[] = [];
   filteredExchangeAssetPairs: ExchangeAssetPair[] = [];

   /** Primarily traded asset pairs for a asset
    * Key: Asset's shortcode e.g. BTC
    */
   primaryAssetPairs = new Map<string, ExchangeAssetPair>();
   primaryAssetPairsSearchItem: SearchItem; //here we'll save for which search item the primary exchange asset pairs were calculated


   private exchangeServices: ExchangeTicker[] = [];

   searchItems: SearchItem[] = [];
   filteredSearchItems: any[];
   searchKey: string;
   currentSearchItem: SearchItem;

   constructor(private _exchangeHandler: ExchangeTickerHandlerService, private router: Router, private titleService: Title) {
   }

   ngOnInit() {

      this.titleService.setTitle("Asset Overview");
      this.availableExchanges = Array.from(this._exchangeHandler.exchangeServiceMap.keys()).map(x => ExchangeTickerType[x].toString());
      this.exchangeServices = Array.from(this._exchangeHandler.exchangeServiceMap.values());

      //at the start we don't apply any search filter
      this.resetSearchSettings();

      //save asset pairs
      for (let exchange of this.exchangeServices) {
         exchange.websocketIsConnected.filter(isConnected => isConnected).subscribe(isConnected => {
            exchange.getAvailableAssetPairs().subscribe(pairs => {
               for (let pair of pairs) {
                  // if(pair.symbol.startsWith("BTCUSD")) {
                  let exchangeAssetPair = new ExchangeAssetPair();
                  exchangeAssetPair.exchange = ExchangeTickerType[exchange.exchangeType];
                  exchangeAssetPair.pair = pair;

                  this.exchangeAssetPairs.push(exchangeAssetPair);
                  // }
               }

               // this.availableAssets = this.availableAssets.concat(pairs.filter(x => x.primaryAsset.shortcode.toUpperCase() == 'BTC').map(x => x.primaryAsset));
               this.availableAssets = this.availableAssets.concat(pairs.map(x => x.primaryAsset));
               //distinct
               this.availableAssets = this.availableAssets.filter((asset, index) => this.availableAssets.findIndex(as => as.shortcode == asset.shortcode) == index);

               //update list of search items
               this.updateSearchItems();
               this.resetSearchSettings();
            });
         })
      }
   }

   /** Update search items with the list of currently loaded asset pairs and exchanges */
   private updateSearchItems() {
      this.searchItems = this.exchangeServices.map(x => new SearchItem("EXCHANGE", ExchangeTickerType[x.exchangeType]));

      this.searchItems = this.searchItems.concat(this.availableAssets.map(x => new SearchItem("ASSET", x.shortcode)));

      //get distinct list of asset pairs through all exchanges
      let assetPairSymbols = this.exchangeAssetPairs.filter((eap, index) => this.exchangeAssetPairs.findIndex(as => as.pair.symbol == eap.pair.symbol) == index).map(eap => eap.pair.symbol);

      this.searchItems = this.searchItems.concat(assetPairSymbols.map(x => new SearchItem("ASSET_PAIR", x)));
   }

   /**
    * Get all exchange-asset pairs of a specific asset.
    * @param asset 
    * @param excludePrimaryTradedPair Specifies whether the primary exchange asset pair should be excluded from this list
    */
   getExchangeAssetPairs(asset: Asset, excludePrimaryTradedPair: boolean): ExchangeAssetPair[] {
      if (excludePrimaryTradedPair) {
         let primarilyTradedPair = this.getPrimaryAssetPair(asset);

         return this.filteredExchangeAssetPairs.filter(x => x.pair.primaryAsset.shortcode == asset.shortcode && !(x.exchange == primarilyTradedPair.exchange && x.pair.symbol == primarilyTradedPair.pair.symbol));
      }
      else {
         return this.filteredExchangeAssetPairs.filter(x => x.pair.primaryAsset.shortcode == asset.shortcode);
      }
   }

   /** Returns the primarily traded asset pair for this asset (USD or EUR based)
    */
   getPrimaryAssetPair(asset: Asset): ExchangeAssetPair {
      if ((this.currentSearchItem == null || this.primaryAssetPairsSearchItem == this.currentSearchItem) && this.primaryAssetPairs.has(asset.shortcode)) {
         this.primaryAssetPairs.get(asset.shortcode);
      }

      //filter for usd-based pairs --TODO: Priority by settings
      let importantFiat = ['USD', 'EUR'];

      let prioritizedAssets = this.filteredExchangeAssetPairs.filter(x => x.pair.primaryAsset.shortcode == asset.shortcode).sort((assetA, assetB) => {
         let aIsFiat = importantFiat.indexOf(assetA.pair.secondaryAsset.shortcode.toUpperCase()) != -1 ? 1 : -1;
         let bIsFiat = importantFiat.indexOf(assetB.pair.secondaryAsset.shortcode.toUpperCase()) != -1 ? 1 : -1;

         //if only one of them is fiat, it is prioritized
         if (aIsFiat != bIsFiat) {
            return bIsFiat - aIsFiat;
         }
         //otherwise prioritize by volume
         else {
            return (assetA.latestTicker == null ? 0 : assetA.latestTicker.volume) - (assetB.latestTicker == null ? 0 : assetB.latestTicker.volume);
         }
      });;

      let priorityPair = prioritizedAssets[0];
      //save only if every asset pair already has received a ticker message
      if (this.getExchangeAssetPairs(asset, false).every(x => x.latestTicker !== undefined && x.latestTicker !== null)) {
         this.primaryAssetPairs.set(asset.shortcode, prioritizedAssets[0]);
         this.primaryAssetPairsSearchItem = this.currentSearchItem;
      }

      return prioritizedAssets[0];
   }

   /** Research search so that all exchange asset pairs will be displayed */
   resetSearchSettings() {
      this.filteredExchangeAssetPairs = this.exchangeAssetPairs;
      this.filteredAssets = this.availableAssets;
      this.currentSearchItem = null;
   }

   /** Filter search items (asset pairs and exchanges) by search key. */
   filterSearchItems(searchKey: string) {
      this.filteredSearchItems = [];
      for (let searchItem of this.searchItems) {
         if (searchItem.value.toLowerCase().startsWith(searchKey.toLowerCase())) {
            this.filteredSearchItems.push(searchItem);
         }
      }
   }

   /** Filter the exchange-asset-pairs with a specific search key. */
   searchWithSearchString(searchKey: string) {
      let searchItem = new SearchItem("CUSTOM", searchKey);
      this.filterAssetOverviewBySearchSettings(searchItem);
   }

   /** Filter the asset overview with a search item. */
   filterAssetOverviewBySearchSettings(searchItem: SearchItem) {
      this.currentSearchItem = searchItem;
      searchItem.value = searchItem.value.toLowerCase();

      switch(searchItem.type) {
         case 'EXCHANGE':
            this.filteredExchangeAssetPairs = this.exchangeAssetPairs.filter(x => x.exchange.toLowerCase() == searchItem.value.toLowerCase());
         break;

         case 'ASSET_PAIR':
            this.filteredExchangeAssetPairs = this.exchangeAssetPairs.filter(x => x.pair.symbol.toLowerCase() == searchItem.value.toLowerCase());
         break;

         case 'ASSET':
            this.filteredExchangeAssetPairs = this.exchangeAssetPairs.filter(x => x.pair.primaryAsset.shortcode.toLowerCase() == searchItem.value.toLowerCase());
         break;

         case 'CUSTOM': {
            this.filteredExchangeAssetPairs = this.exchangeAssetPairs.filter(eas => {
               //if exchange fits key, return true
               if(eas.exchange.toLowerCase().indexOf(searchItem.value) != -1) return true;

               //if asset pair symbol fits key, return ture
               if(eas.pair.symbol.toLowerCase().indexOf(searchItem.value) != -1) return true;

               return false;
            });
         }
         break;

      }

      //filter assets if it doesn't contain any exchange-asset-pair that fits the current search
      this.filteredAssets = this.availableAssets.filter(asset => this.getExchangeAssetPairs(asset, false).length > 0 );
   }
}

class SearchItem {
   constructor(public type: string, public value: string) { }
}
