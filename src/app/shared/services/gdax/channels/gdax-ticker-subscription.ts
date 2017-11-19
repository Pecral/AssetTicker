import { GdaxChannelSubscription, ChannelSubscriptionState } from "../gdax-channel-subscription";
import { AssetPair } from "../../../models/asset-pair";
import { ExchangeInformationType } from "../../../models/exchange-information-type";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { TickerMessage } from "../../../models/ticker-message";

export class GdaxTickerSubscription implements GdaxChannelSubscription {
   
   /** The asset pair symbol which is used in this channel e.g. BTCUSD */
   key: string;
   
   /** The asset pair of this subscription */
   assetPair: AssetPair;
   
   /** Information about the information type which is delivered in this channel (trades, order book etc.) */
   exchangeInformationType: ExchangeInformationType;
   
   /** Specifies the subscription's state to the channel (subscribed, unsubscribed, queued) */
   channelState: ChannelSubscriptionState;

   subject: BehaviorSubject<TickerMessage> = new BehaviorSubject<TickerMessage>(null);

   pushIntoSubscription(message: any): void {
      
   }

}

export class DailyTickerStats {

}