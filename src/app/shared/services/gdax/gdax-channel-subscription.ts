import { AssetPair } from "../../models/asset-pair";
import { ExchangeInformationType } from "../../models/exchange-information-type";

export abstract class GdaxChannelSubscription {
   /** The asset pair symbol which is used in this channel e.g. BTCUSD */
   key: string;

   /** The asset pair itself */
   assetPair: AssetPair;

   /** Information about the information type which is delivered in this channel (trades, order book etc.) */
   abstract exchangeInformationType: ExchangeInformationType;

   /** Specifies the subscription's state to the channel (subscribed, unsubscribed, queued) */
   channelState: ChannelSubscriptionState;

   abstract pushIntoSubscription(message: any): void;
}

export enum ChannelSubscriptionState {
   QueuedSubscribe,
   Subscribed,
   Unsubscribed
}