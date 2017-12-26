import { GdaxChannelSubscription, ChannelSubscriptionState } from "../gdax-channel-subscription";
import { AssetPair } from "../../../models/asset-pair";
import { ExchangeInformationType } from "../../../models/exchange-information-type";
import { ReplaySubject } from "rxjs/ReplaySubject";
import { AssetTrade } from "../../../models/asset-trade";
import { AssetOrderType } from "../../../models/asset-order-type";

export class GdaxMatchSubscription implements GdaxChannelSubscription {
   key: string;
   assetPair: AssetPair;
   exchangeInformationType: ExchangeInformationType = ExchangeInformationType.Trades;
   channelState: ChannelSubscriptionState;

   lastMatchTime: Date;
   subject: ReplaySubject<AssetTrade> = new ReplaySubject<AssetTrade>(25);

   pushIntoSubscription(match: GdaxMatch): void {
      let matchTime = new Date(Date.parse(match.time));
      if(!this.lastMatchTime || this.lastMatchTime.getTime() <= matchTime.getTime()) {
         this.lastMatchTime = matchTime;
         let tradeMessage = new AssetTrade();
         tradeMessage.price = parseFloat(match.price);
         tradeMessage.volume = parseFloat(match.size);
         tradeMessage.dominantAsset = this.assetPair.primaryAsset;
         tradeMessage.secondaryAsset = this.assetPair.secondaryAsset;
         tradeMessage.timestamp = matchTime;
         tradeMessage.tradeType = match.side == "sell" ? AssetOrderType.Sell : AssetOrderType.Buy;

         this.subject.next(tradeMessage);
      }
   }

   pushApiResultIntoSubscription(tradeApiResults:GdaxApiTrade[]): void {
      let orderedMatches = tradeApiResults.sort((a, b) => new Date(Date.parse(a.time)).getTime() - new Date(Date.parse(b.time)).getTime())

      for(let trade of orderedMatches) {
         let tradeMessage = new AssetTrade();
         tradeMessage.dominantAsset = this.assetPair.primaryAsset;
         tradeMessage.secondaryAsset = this.assetPair.secondaryAsset;
         tradeMessage.timestamp = new Date(Date.parse(trade.time));
         tradeMessage.volume = parseFloat(trade.size);
         tradeMessage.price = parseFloat(trade.price);
         tradeMessage.tradeType = trade.side == "sell" ? AssetOrderType.Sell : AssetOrderType.Buy;

         if(!this.lastMatchTime || this.lastMatchTime.getTime() <= tradeMessage.timestamp.getTime()) {
            this.lastMatchTime = tradeMessage.timestamp;
            this.subject.next(tradeMessage);
         }
      }
   }

}