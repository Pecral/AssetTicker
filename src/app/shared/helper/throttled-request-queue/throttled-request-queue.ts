import { Injectable } from '@angular/core';
import { Http } from '@angular/http/src/http';
import { Response } from '@angular/http/src/static_response';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

export class ThrottledRequestQueue {
   
   /** The number of requests which occurred in the current second */
   private processedRequestsInCurrentSecond: number = 0;

   /** 
    * This is the timeout which will reset the number of requests which happened in the current second. The timeout ends one second after the last request and will 
    * be restarted every time a request occurs.
   */
   private requestResetterTimeout: any;

   /** This array saves our queued request-elements */
   private requestQueue: QueueEntry[] = [];

   /** Specifies whether the execution of our queue is currently stopped */
   private isStopped: boolean = false;

   /** Specifies whether the queue is currently in burst mode */
   private inBurstMode: boolean = false;

   /**
    * @param http Http-instance to start http requests
    * @param requestsPerSecond Specifies the number of requests per second which are allowed before the endpoint or the api throttles us.
    * @param requestsPerSecondBurstMode Specifies the number of requests per second which are allowed before the endpoint or the api throttles us (burst mode).
    */
   constructor(private http: Http, private requestsPerSecond: number, private requestsPerSecondBurstMode?: number) {
      if(requestsPerSecondBurstMode) {
         this.inBurstMode = true;
      }
    }

   /** Enqueue a new api request. This request will be processed immediately if we didn't already exceed our limit, otherwise you have to wait till the next second */
   public enqueue(url: string): Observable<Response> {
      let queuedEntry = new QueueEntry(url);

      this.requestQueue.push(queuedEntry);
      this.isStopped = false;

      //run task async so that we can return our observable immediately
      this.process();

      return queuedEntry.requestResultSubject.filter(requestObservable => requestObservable != null);
   }

   /** Restart the timeout which resets the number of requests which happened in the current second */
   private restartRequestResetter() {
      //stop timeout if it already exists
      if(!this.requestResetterTimeout) {
         clearTimeout(this.requestResetterTimeout);
      }

      this.requestResetterTimeout = setTimeout(() => {
         this.processedRequestsInCurrentSecond = 0;

         //try to process queue if something is in it
         this.process();
      }, 1000);
   }

   /** Stop further processing of request queue */
   public stop(): void {
      this.isStopped = true;
   }

   /** Try to process the first api request in our queue if we didn't already exceed our limit. */
   private process() {
      if (!this.isStopped && this.requestQueue.length > 0) {
         if(!this.exceededLimit()) {
            //execute the first request in the queue
            let entry: QueueEntry = this.requestQueue.shift();

            /** Sometimes it happens that we exceed our rate limit and want to retry our request in the next second. */
            if(entry.wasExceededRequest && entry.lastRequestTimestamp.getSeconds() == new Date().getSeconds()) {
               this.requestQueue.unshift(entry);
               return;
            }

            this.processedRequestsInCurrentSecond++;
            console.debug(`## Request Queue ## [${new Date().toLocaleTimeString()}] - Procces ${entry.url}...`);
            
            //create api request
            let request = this.http.get(entry.url).subscribe(
               response => entry.requestResultSubject.next(response),
               error => {
                  //disable burst mode if response code is 429 ("too many requests") and retry it
                  if(error.status == 429) {
                     this.inBurstMode = false;
                     entry.lastRequestTimestamp = new Date();
                     entry.wasExceededRequest = true;
                     this.requestQueue.unshift(entry);
                     this.restartRequestResetter();
                  }               
                  else {
                     console.error(`## Request Queue ## Uncatched HTTP response for url '${entry.url}' - response: ${JSON.stringify(error.body)}`);
                  }
                  return;
               }
            );

            //entry.requestResultSubject.complete();
      
            this.restartRequestResetter();
         }
         else {
            //console.log('## GDAX ## Throttled Queue - Exceeded request limit for current second, wait..');
         }
      }
   }

  /** Returns whether we've exceeded our current observable processing limit */
   private exceededLimit():boolean {
      return this.processedRequestsInCurrentSecond >= (this.inBurstMode ? this.requestsPerSecondBurstMode : this.requestsPerSecond);
   }   
}

class QueueEntry {
   public requestResultSubject: BehaviorSubject<Response> = new BehaviorSubject<Response>(null);

   /** Saves whether we did exceed our rate limit with this request */
   public wasExceededRequest: boolean = false;
   public lastRequestTimestamp: Date;

   constructor(public url: string) { }
}