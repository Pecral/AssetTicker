import { GdaxChannelSubscription, ChannelSubscriptionState } from "../gdax-channel-subscription";
import { AssetPair } from "../../../models/asset-pair";
import { ExchangeInformationType } from "../../../models/exchange-information-type";

export class GdaxCandlesSubscription implements GdaxChannelSubscription { 
   key: string;
   assetPair: AssetPair;
   subscriptionType: string;
   exchangeInformationType: ExchangeInformationType;
   channelState: ChannelSubscriptionState;
   pushIntoSubscription(message: any): void {
      throw new Error("Method not implemented.");
   }
}