import { AssetPair } from "../../../models/asset-pair";
import { ExchangeInformationType } from "../../../models/exchange-information-type";
import { ReplaySubject } from "rxjs/ReplaySubject";
import { AssetTrade } from "../../../models/asset-trade";
import { AssetOrderType } from "../../../models/asset-order-type";

export class BitstampTradeSubscription  {
   key: string;
   assetPair: AssetPair;
   exchangeInformationType: ExchangeInformationType = ExchangeInformationType.Trades;

   lastMatchTime: Date;
   subject: ReplaySubject<AssetTrade> = new ReplaySubject<AssetTrade>(25);

   pushIntoSubscription(match: any): void {
      if(match instanceof Array) {
         let matchTime = new Date(match[5]*1000);
         if(!this.lastMatchTime || this.lastMatchTime.getTime() <= matchTime.getTime()) {
            this.lastMatchTime = matchTime;
            let tradeMessage = new AssetTrade();
            tradeMessage.price = parseFloat(match[3]);
            tradeMessage.volume = parseFloat(match[4]);
            tradeMessage.dominantAsset = this.assetPair.primaryAsset;
            tradeMessage.secondaryAsset = this.assetPair.secondaryAsset;
            tradeMessage.timestamp = matchTime;
            tradeMessage.tradeType = match[2] == 1 ? AssetOrderType.Sell : AssetOrderType.Buy;
   
            this.subject.next(tradeMessage);
         }
      }
   }

   pushApiResultIntoSubscription(tradeApiResults:ApiTradeModel[]): void {
      let orderedMatches = tradeApiResults.sort((a, b) => new Date(Date.parse(a.date)).getTime() - new Date(Date.parse(b.date)).getTime())

      for(let trade of orderedMatches) {
         let tradeMessage = new AssetTrade();
         tradeMessage.dominantAsset = this.assetPair.primaryAsset;
         tradeMessage.secondaryAsset = this.assetPair.secondaryAsset;
         tradeMessage.timestamp = new Date(Date.parse(trade.date));
         tradeMessage.volume = parseFloat(trade.amount);
         tradeMessage.price = parseFloat(trade.rate);
         tradeMessage.tradeType = trade.type == "sell" ? AssetOrderType.Sell : AssetOrderType.Buy;

         if(!this.lastMatchTime || this.lastMatchTime.getTime() <= tradeMessage.timestamp.getTime()) {
            this.lastMatchTime = tradeMessage.timestamp;
            this.subject.next(tradeMessage);
         }
      }
   }

}