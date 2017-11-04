import { Asset } from './../../models/asset';
import { ExchangeInformationType } from "../../models/exchange-information-type";

export abstract class BitfinexChannelSubscription {
   /** The channel'si d */
   channelId: number;

   /** The asset pair symbol which is used in this channel e.g. BTCUSD */
   key: string;

   /** The asset pair itself */
   assetPair: [Asset, Asset];

   /** Information about the information type which is delivered in this channel (trades, order book etc.) */
   abstract exchangeInformationType: ExchangeInformationType;

   isSubscribed: boolean;

   abstract pushIntoSubscription(message: any): void;
}