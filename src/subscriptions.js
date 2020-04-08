import {TangoRestApiRequest} from "./rest";
import MultiMap from "./multimap";

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
    constructor(host = ''){
        this.url = `${host}/tango`;
        this.source = null;
        this.id = 0;
        this.events = [];
        this.failures = [];
        this.listeners = new MultiMap();
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

    async connect(){
        const subscription = await new TangoRestApiRequest(this.url, {mode:'cors'}, fetch)
            .subscriptions()
            .post("", this.events.map(event => event.target));
        let id, events, failures;
        ({id, events, failures} = subscription);
        this.id = id;
        this.events = events;
        this.failures = failures;
        this.source = new EventStream(`${this.url}/subscriptions/${id}/event-stream`, this);
        return this;
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
        const response = await new TangoRestApiRequest(this.url, {mode:'cors'}).subscriptions(this.id).put("", [target]);
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
    async subscribe(target, success, failure){
        let event = this.events.find(findEventByTarget(target));

        if(event === undefined){
            event = await this.putTarget(target);
            this.events.push(event);
        }

        const listener = function(event){
            if(event.data.startsWith("error")){
                failure({
                    timestamp: parseInt(event.lastEventId),
                    data: event.data
                });
            } else {
                success({
                    timestamp: parseInt(event.lastEventId),
                    data: JSON.parse(event.data)
                })
            }
        };

        //TODO return listener -> client preserves listener; client listens for open event and re-adds listeners
        this.listeners.put(event.id, listener);
        this.addEventListener(event, listener);
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
}

export class EventStream{
    constructor(url, subscription){
        this.url = url;
        this.subscription = subscription;
        this.stream = null;
    }

    open(){
        this.stream = new EventSource(this.url,{
            withCredentials: true
        });

        this.stream.onopen = function(){
            console.log("EventStream open!");
            this.subscription.open();
        }.bind(this);

        this.stream.onerror = function(error){
            console.error(error);
            this.stream.close();
            this.subscription.reconnect();
        }.bind(this);
    }

    addEventListener(id, listener){
        this.stream.addEventListener(id, listener)
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