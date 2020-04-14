import {TangoRestApiRequest} from "./rest";
import MultiMap from "./multimap";
import {fromEvent, Observable, Subject, throwError, using} from "rxjs";
import {fromPromise} from "rxjs/internal-compatibility";
import {concatMap, delay, retryWhen, take, tap} from "rxjs/operators";

const kEventSourceOpenTimeout = 3000;
const kOpenFailureThreshold = 5;


function findEventByTarget(target) {
    return el => el.target.host === target.host &&
        el.target.device === target.device &&
        el.target.attribute === target.attribute &&
        el.target.type === target.type;
}

/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 3/28/19
 */
export class Subscription {
    constructor({url, id, events, failures, source}){
        this.url = url;
        this.source = source;
        this.id = id;
        this.events = events;
        this.failures = failures;
        this.listeners = new MultiMap();
        this.subject = new Subject();
    }

    reconnect(){
        return this.connect()
            .then(()=> {
                this.source.open();
                return this;
            })
            .catch((err) => {
                console.error(`Failed to connect to ${this.url} due to ${err}! Retry in ${kEventSourceOpenTimeout}`);
                setTimeout(() => {
                    this.reconnect();
                },kEventSourceOpenTimeout);
            });
    }

    /**
     *
     * @param {string} [url = '/tango/subscriptions'] url
     * @param {object} [options = {}] options
     * @param {Event[]} [events = []] events
     * @returns {Promise<Subscription>}
     */
    static connect(host = '', options = {}, events = []){
        return new TangoRestApiRequest(`${host}/tango`, {...options,...{mode:'cors'}}, fetch)
            .subscriptions()
            .post("", events.map(event => event.target))
            .then(resp => new Subscription({...{url:`${host}/tango/subscriptions/${resp.id}`, events, source: new EventStream(`${host}/tango/subscriptions/${resp.id}/event-stream`)}, ...resp}))
            .then(subscription => {
                subscription.source.open()
                    .pipe(
                        retryWhen(errors => errors.pipe(tap(errors => console.error('EventStream error!',errors)), delay(3000), take(10), concatMap(throwError)))
                    ).subscribe({
                        next: () => {
                            console.debug('EventStream open!');
                        }
                    });

                return subscription;
            })
            .catch(console.error)

        // ;
        // this.source = using(() => new EventStream(`${url}/subscriptions/${id}/event-stream`),
        //         eventStream => new Observable(subscriber => {
        //             eventStream._stream.onopen = () => subscriber.next();
        //             eventStream._stream.onmessage = message => subscriber.next(message);
        //             eventStream._stream.onerror = err => subscriber.error(err);
        //         }));
        // return this;
    }

    async open(){
        this.events.forEach(event => {
            this.listeners.get(event.id).forEach(listener =>
                this.addEventListener(event, listener)
            )
        });
        return this;
    }

    /**
     *
     * @param {Target} target
     * @return {Promise<Event>}
     */
    async putTarget(target) {
        const response = await new TangoRestApiRequest(this.url, {mode:'cors', headers:{}}, fetch).put("", [target]);
        const events = response.map(event => new Event(event.id, event.target));
        const event = events.find(findEventByTarget(target));
        if (event === undefined) {
            console.error("Failed to subscribe");
            throw "Failed to subscribe";
        }
        return event;
    }

    /**
     *
     * @param {Target} target
     * @param {Function({timestamp, data}): void} success
     * @param {Function({timestamp, data}): void} failure
     * @return {Promise<Subscription>}
     */
    async subscribe({host, device, attribute, type}, success, failure){
        const target = new Target(host, device, attribute, type);
        let event = this.events.find(findEventByTarget(target));

        if(event === undefined){
            event = await this.putTarget(target);
            this.events.push(event);
        }

        this.source.stream(event.id)
            .subscribe(this.subject);

        // const listener = function(event){
        //     if(event.data.startsWith("error")){
        //         failure({
        //             timestamp: parseInt(event.lastEventId),
        //             data: event.data
        //         });
        //     } else {
        //         success({
        //             timestamp: parseInt(event.lastEventId),
        //             data: JSON.parse(event.data)
        //         })
        //     }
        // };
        //
        // //TODO return listener -> client preserves listener; client listens for open event and re-adds listeners
        // this.listeners.put(event.id, listener);
        // this.addEventListener(event, listener);
        return this;
    }

    unsubscribe(target){
        let event = this.events.find(findEventByTarget(target));

        if(event === undefined){
            return;
        }

        const listeners = this.listeners.get(event.id);
        listeners.forEach(listener =>
            this.source.stream.removeEventListener(event.id, listener)
        );

        //TODO delete event from subscriptions
    }

    addEventListener(event, listener){
        this.source.addEventListener(event.id, listener);
    }

    asObservable(){
        return this.subject;
    }
}

export class EventStream {
    constructor(url){
        this.url = url;
        this._stream = null;
    }

    open(){
        return using(() => {
                this._stream = new EventSource(this.url,{
                    withCredentials: true
                });
                return this;
            },
            eventStream => new Observable(subscriber => {
                eventStream._stream.onopen = () => subscriber.next();
                eventStream._stream.onerror = err => subscriber.error(err);
            }))

        // this.stream.onopen = function(){
        //     console.log("EventStream open!");
        //     this.subscription.open();
        // }.bind(this);
        //
        // this.stream.onerror = function(error){
        //     console.error(error);
        //     this.stream.close();
        //     this.subscription.reconnect();
        // }.bind(this);
    }

    stream(id = 'onmessage'){
        return fromEvent(this._stream, id);
    }


    unsubscribe() {
        this._stream.close();
    }
}



export class Target {
    constructor(host, device, attribute, type) {
        this.host = host;
        this.device = device;
        this.attribute = attribute;
        this.type = type;
    }

}

export class Event{
    constructor(id, target){
        this.id = id;
        this.target = target;
    }
}