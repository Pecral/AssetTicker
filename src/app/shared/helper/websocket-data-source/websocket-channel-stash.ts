import { WebSocketChannel } from "./websocket-channel";
import { Observable } from "rxjs/Observable";

export class WebSocketChannelStash {

   /** Array of queued channel subscriptions */
   queuedChannels: WebSocketChannel[] = [];

   /** Array of active channels  */
   activeChannels: WebSocketChannel[] = [];

   constructor(private websocket: WebSocket) {
      
      websocket.onopen = this.processQueuedChannelSubscriptions.bind(this);
   }

   processQueuedChannelSubscriptions() {
      for(let subscription of this.queuedChannels) {
         this.websocket.send(subscription.subscriptionIdentifier);
         this.activeChannels.push(subscription);
      }

      this.queuedChannels = [];
   }

   sendChannelSubscriptionRequest(channel: WebSocketChannel) {
      this.websocket.send(channel.subscriptionIdentifier);
      this.activeChannels.push(channel);
   }

   /**
    * Returns that you're subscribed to a specific websocket channel and returns its data feed as an observable.
    * @param subscriptionRequest The subscription request which is sent to the server to subscribe for the channel
    * @param messageIdentifier An identifier to assign received websocket-messages to the correct channel 
    */
   ensureChannel(subscriptionRequest:string, messageIdentifier?:any): Observable<any> {
      let channel : WebSocketChannel;

      //search in active channels
      channel = this.activeChannels.find(channel => channel.subscriptionIdentifier == subscriptionRequest);

      //return feed if channel exists
      if(channel) {
         return channel.feed;
      }
      else {
         //check if channel subscription is queued
         channel = this.queuedChannels.find(channel => channel.subscriptionIdentifier == subscriptionRequest);
         
         //if the subscription is not queued, create instance for it
         if(!channel) {
            channel = new WebSocketChannel(subscriptionRequest, messageIdentifier);

            //if it's not in active channels, we'll send a subscription request if the websocket is ready
            if(this.websocket.readyState == 1) {
               this.sendChannelSubscriptionRequest(channel);
            }
            //if websocket is not ready yet, we'll push subscription into queue
            else {
               this.queuedChannels.push(channel);
            }
         }
      }

      return channel.feed;
   }
}