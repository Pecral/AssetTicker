import { Observable } from "rxjs/Observable";
import { ReplaySubject, Subject } from "rxjs";


export class WebSocketChannel {
   /**
    * The data feed which caches the last data-entry that was sent.
    */
   public feed: Subject<any> = new ReplaySubject<any>(1);

   /**
    * 
    * @param subscriptionIdentifier The subscription request which is sent to the server to subscribe for the channel
    * @param unsubscriptionIdentifier The subscription request which is sent to the server to unsubscribe from the channel
    * @param messageIdentifier An identifier to assign received websocket-messages to the correct channel 
    */
   constructor(public subscriptionIdentifier:string, public unsubscriptionIdentifier?:string, public messageIdentifier?:string) { }   
}