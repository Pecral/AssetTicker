import { Injectable } from '@angular/core';
import { Http } from '@angular/http/src/http';
import { Subject } from 'rxjs/Subject';
import { Response } from '@angular/http/src/static_response';
import { IntervalObservable } from 'rxjs/observable/IntervalObservable';
import { Observable } from 'rxjs/Observable';
//import { setTimeout, clearTimeout } from 'timers';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

export class ThrottledRequestQueue {
   
   /** The number of requests that occurred in the current second */
   private processedRequestsInCurrentSecond: number = 0;

   /** 
    * This is the timeout which will reset the number of requests which happened in the current second. The timeout ends one second after the last request and will 
    * be restarted every time a request occurs.
   */
   private requestResetterTimeout: any;

   private requestQueue: QueueEntry[] = [];

   private isStopped: boolean = false;

   /**
    * @param http Http-instance to start http requests
    * @param requestsPerSecond Specifies the number of requests per second which are allowed before the endpoint or the api throttles us.
    */
   constructor(private http: Http, private requestsPerSecond: number) { }

   /** Enqueue a new api request. This request will be processed immediately if we didn't already succeed our limit, otherwise you have to wait till the next second */
   public enqueue(url: string): Observable<Response> {
      let queuedEntry = new QueueEntry(url);

      this.requestQueue.push(queuedEntry);
      this.isStopped = false;

      //run task async so that we can return our observable immediately
      this.process();

      return queuedEntry.requestResultSubject.filter(requestObservable => requestObservable != null).flatMap(resultObservable => resultObservable);
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

   public stop(): void {
      this.isStopped = true;
   }

   /** Try to process the first api request in our queue if we didn't already succeeded our limit. */
   private process() {
      if (!this.isStopped && this.requestQueue.length > 0) {
         if(this.processedRequestsInCurrentSecond < this.requestsPerSecond) {
            //execute the first request in the queue
            let entry: QueueEntry = this.requestQueue.shift();

            console.log(`## GDAX ## Throttled Queue - [${new Date().toLocaleTimeString()}] Process request '${entry.url}'`);
            
            this.processedRequestsInCurrentSecond++;
            
            //create api request
            entry.requestResultSubject.next(this.http.get(entry.url));
            //entry.requestResultSubject.complete();
      
            this.restartRequestResetter();
         }
         else {
            console.log('## GDAX ## Throttled Queue - Exceeded request limit for current second, wait..');
         }
      }
   }
}

class QueueEntry {
   public inProcess: boolean = false;

   public requestResultSubject: BehaviorSubject<Observable<Response>> = new BehaviorSubject<Observable<Response>>(null);

   constructor(public url: string) { }
}