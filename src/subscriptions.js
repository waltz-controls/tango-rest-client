import {TangoRestApiRequest} from "./rest";
import {from, fromEvent, Observable, of, Subject, throwError, using} from "rxjs";
import {delay, find, map, mergeMap, retryWhen, share, switchMap, tap} from "rxjs/operators";

const kEventSourceOpenTimeout = 3000;
const kOpenFailureThreshold = 5;


function findEventByTarget(target) {
    return el => el.target.host === target.host &&
        el.target.device === target.device &&
        el.target.attribute === target.attribute &&
        el.target.type === target.type;
}

/**
 * Creates shared Observable that is served as a connection to Subscriptions host
 *
 * @param {string} host
 * @param {{}} options
 */
function createConnection(host, options){
    return of(host).pipe(
        tap(host => console.debug(`Opening EventStream on ${host}`)),
        switchMap(host =>
            from(new TangoRestApiRequest(`${host}/tango/subscriptions`, {...options,mode:'cors'}, fetch)
                .post("", this.subscription.events.map(event => event.target)))),
        map(resp => this.subscription = new Subscription({...resp,url: `${host}/tango/subscriptions/${resp.id}`, source: new EventStream(`${host}/tango/subscriptions/${resp.id}/event-stream`)})),
        switchMap(subscription => subscription.source.open()),
        retryWhen(err => err.pipe(
            tap(err=> console.error("EventStream error!",err)),
            delay(kEventSourceOpenTimeout)
        )),
        tap(() => console.debug('EventStream is open')),
        tap(() => this.subscription.events.forEach(event => this.subscription.source.stream(event.id).subscribe(this.subject))),
        share()
    )
}

/**
 *
 * Entry point to TangoRestSubscriptions
 *
 * @class [Subscriptions]
 */
export class Subscriptions {
    constructor(host = '',options = {}) {
        this.options = options;
        this.subscription = new Subscription({events:[]});
        this.subject = new Subject();
        this.connection = createConnection.call(this, host, options);
    }

    /**
     *
     * @return {Observable<EventStream>}
     */
    connect(){
        return this.connection;
    }

    /**
     *
     * Start listening for a Tango event host/device/attribute/type
     *
     * @param host
     * @param device
     * @param attribute
     * @param type
     */
    listen({host, device, attribute, type}){
        const target = new Target(host, device, attribute, type);

        of(target).pipe(
            switchMap(() => this.subscription.source ? of(): this.connect()),
            map(() => this.subscription.events.find(findEventByTarget(target))),
            switchMap(event => event? of() : this.subscription.putTarget(target, this.options)),
            tap(event => this.subscription.events.push(event)),
            tap(event => console.debug('New subscription to:', event))
        ).subscribe({
                    next: event => {
                        this.subscription.source.stream(event.id)
                            .subscribe(this.subject)
                    },
                    error: err => {
                        console.error(err)
                        this.listen({host, device, attribute, type})
                    }
                });
    }

    /**
     *
     * @return {Observable<>}
     */
    asObservable(){
        return this.subject.pipe(
            map(msg => {
                const result = {
                    ...this.subscription.events.find(event => event.id == msg.type).target,
                    timestamp: parseInt(msg.lastEventId),
                }
                if(msg.data.startsWith("error")){
                    return {
                        ...result,
                        error: msg.data.substring(7)
                    };
                } else {
                    return {
                        ...result,
                        data: JSON.parse(msg.data)
                    };
                }
            })
        );
    }
}

/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 3/28/19
 */
class Subscription {
    constructor({url, id, events, failures, source}){
        this.url = url;
        this.source = source;
        this.id = id;
        this.events = events;
        this.failures = failures;
    }

    /**
     *
     * @param {Target} target
     * @param {{}} [options={}] options
     * @return {Observable<Event>}
     */
    putTarget(target, options = {}) {
        return of(this.url).pipe(
            switchMap( url => from(new TangoRestApiRequest(url, {...options,mode:'cors'}, fetch).put("", [target]))),
            mergeMap(response => from(response.map(event => new Event(event)))),
            find(findEventByTarget(target)),
            switchMap(event => event ? of(event) : throwError("Failed to subscribe"))
        )
    }
}

/**
 *
 */
class EventStream {
    constructor(url){
        this.url = url;
        this._stream = null;
    }

    /**
     *
     * @return {Observable<EventStream>}
     */
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
    }

    /**
     *
     * @param {string} id - Event's id
     * @return {Observable<*>}
     */
    stream(id = 'onmessage'){
        return fromEvent(this._stream, id);
    }


    /**
     * Effectively closes underlying EventSource
     *
     */
    unsubscribe() {
        this._stream.close();
    }
}



class Target {
    constructor(host, device, attribute, type) {
        this.host = host;
        this.device = device;
        this.attribute = attribute;
        this.type = type;
    }

}

class Event{
    constructor({id, target}){
        this.id = id;
        this.target = target;
    }
}