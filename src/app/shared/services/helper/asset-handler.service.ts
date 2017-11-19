import { Asset } from './../../models/asset';
import { Injectable } from '@angular/core';

@Injectable()
export class AssetHandlerService {

   constructor() { }

   /** Try to split the symbol pair into the two assets..
    * Later we'll further advance this method
   */
   splitSymbolPair(symbolPair: string): [Asset, Asset] {
      let dominantAssetCode = symbolPair.substring(0, 3);
      let secondaryAssetCode = symbolPair.substring(3, symbolPair.length);

      let dominantAsset = new Asset();
      dominantAsset.shortcode = dominantAssetCode;

      let secondaryAsset = new Asset();
      secondaryAsset.shortcode = secondaryAssetCode;

      return [dominantAsset, secondaryAsset];
   }

}