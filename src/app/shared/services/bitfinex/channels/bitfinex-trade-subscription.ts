import { AssetTrade } from './../../../models/asset-trade';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { EventEmitter } from '@angular/core';
import { BitfinexChannelSubscription } from '../bitfinex-channel-subscription';
import { AssetOrderType } from '../../../models/asset-order-type';
import { Asset } from '../../../models/asset';
import { ExchangeInformationType } from '../../../models/exchange-information-type';

export class BitfinexTradeSubscription extends BitfinexChannelSubscription {
   exchangeInformationType: ExchangeInformationType = ExchangeInformationType.Trades;
   observable: BehaviorSubject<AssetTrade> = new BehaviorSubject<AssetTrade>(null);
   
   heartbeat = new EventEmitter();

   pushIntoSubscription(tradeInformationMessage: any): void {
      if(tradeInformationMessage[1] instanceof Array) {
         //the first message that we'll get from the channel is a snapshot/array of the last x trades
         //we'll iterate through it in reverse order because it's sent by ascending timestamp
         for(let i = tradeInformationMessage[1].length -1; i > 0; i--) {
            let trade = tradeInformationMessage[1][i]
            this.pushSingleTradeInSubscription(trade);
         } 
      }
      else {
         switch (tradeInformationMessage[1]) {
            case 'hb':
               this.heartbeat.emit();
               break;
            case 'te':
               //we can ignore it for now
               break;
            case 'tu':
               this.pushSingleTradeInSubscription(tradeInformationMessage[2]);
               break;
         }
      }
   }

   private pushSingleTradeInSubscription(tradeMessage:any):void {
      //parse trade message into usable model and push it into observable
      let tradeModel = new AssetTrade();

      tradeModel.price = tradeMessage[3];
      tradeModel.timestamp = new Date(tradeMessage[1]);

      tradeModel.dominantAsset = this.assetPair[0];
      tradeModel.secondaryAsset = this.assetPair[1];

      let rawVolume = tradeMessage[2];
      tradeModel.tradeType = rawVolume >= 0 ? AssetOrderType.Buy : AssetOrderType.Sell;
      tradeModel.volume = Math.abs(rawVolume);

      this.observable.next(tradeModel);
   }
}