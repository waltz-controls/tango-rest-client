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
    const streamId = +new Date();
    return of(host).pipe(
        tap(host => console.debug(`${streamId} Opening EventStream on ${host}`)),
        switchMap(host =>
            from(new TangoRestApiRequest(`${host}/tango/subscriptions`, {...options,mode:'cors'}, fetch)
                .post("", this.subscription.events.map(event => event.target)))),
        map(resp => this.subscription = new Subscription({...resp,url: `${host}/tango/subscriptions/${resp.id}`, source: new EventStream(`${host}/tango/subscriptions/${resp.id}/event-stream`)})),
        switchMap(subscription => subscription.source.open()),
        retryWhen(err => err.pipe(
            tap(err=> console.error(`${streamId} EventStream error!`,err)),
            delay(kEventSourceOpenTimeout)
        )),
        tap(() => console.debug(`${streamId} EventStream is open`)),
        tap(() => this.subscription.events
            .forEach(event => this.subscribe(event))),
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

        this.subjects = new Map();

        this.connection = createConnection.call(this, host, options);
        this.unload = fromEvent(window, "onbeforeunload").pipe(
            switchMap(()=>of(this.subscription.source)),
            tap(()=>console.debug("Closing EventStream!"))
        ).subscribe(source => source.unsubscribe());
    }

    /**
     *
     * @param event
     * @return {Subject}
     */
    subscribe(event){
        const key = JSON.stringify(event.target);
        const subject = this.subjects.get(key) || new Subject();
        this.subjects.set(key, subject);
        this.subscription.source.stream(event.id).subscribe(subject);
        return subject;
    }

    /**
     *
     * Start listening for a Tango event host/device/attribute/type
     *
     * @param host
     * @param device
     * @param attribute
     * @param type
     * @return {Observable}
     */
    observe({host, device, attribute, type}){
        const target = new Target(host, device, attribute, type);

        return of(target).pipe(
            switchMap(() => this.subscription.source ? of(target): this.connection),
            map(() => this.subscription.events.find(findEventByTarget(target))),
            switchMap(event => event? of(event) : this.subscription.putTarget(target, this.options)),
            switchMap(event => this.subjects.has(JSON.stringify(event.target)) ? this.subjects.get(JSON.stringify(event.target)): this.subscribe(event)),
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
        )
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
        const streamId = +new Date();
        return of(this.url).pipe(
            tap(url => console.debug(`${streamId} put new target to: ${url}`, target)),
            switchMap( url => from(new TangoRestApiRequest(url, {...options,mode:'cors'}, fetch).put("", [target]))),
            mergeMap(response => from(response.map(event => new Event(event)))),
            find(findEventByTarget(target)),
            tap(event => event ? console.debug(`${streamId} Success!`, event) : console.error(`${streamId} Failure!!! See server side logs...`)),
            switchMap(event => event ? of(event) : throwError(`Failed to put new target into subscriptions ${this.url}. See server side logs...`)),
            tap(event => this.events.push(event))
        )
    }
}

/**
 *
 */
class EventStream {
    constructor(url){
        this.url = url;
        this.eventSource = null;
    }

    /**
     *
     * @return {Observable<EventStream>}
     */
    open(){
        return using(() => {
                this.eventSource =new EventSource(this.url,{
                    withCredentials: true
                });
                return this;
            },
            eventStream => new Observable(subscriber => {
                eventStream.eventSource.onopen = () => subscriber.next();
                eventStream.eventSource.onerror = err => subscriber.error(err);
            }))
    }

    /**
     *
     * @param {string} id - Event's id
     * @return {Observable<*>}
     */
    stream(id = 'onmessage'){
        return fromEvent(this.eventSource, id);
    }


    /**
     * Effectively closes underlying EventSource
     *
     */
    unsubscribe() {
        this.eventSource.close();
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