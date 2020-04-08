import {EventBus} from "@waltz-controls/eventbus";
import {TangoAttribute} from "./tango";
import {fromEvent} from "rxjs";
import {Subscription, Target} from "./subscriptions";
import {map} from "rxjs/operators";

const kTangoChannel = "channel:tango";

export class RxTango{
    /**
     *
     * @param {EventBus} eventbus
     */
    constructor(eventbus) {
        this.eventbus = eventbus;

    }

    observeAttribute({host, port, device, attribute}){
        return fromEvent(this.eventbus._channels.get(kTangoChannel),`${host}:${port}/${device}/${attribute}`)
    }
}

export class RxTangoAttribute{
    /**
     *
     * @constructor
     * @param {TangoAttribute} attribute
     * @param {EventBus} eventbus
     * @param {Subscription} subscription
     */
    constructor({attribute, eventbus, subscription}){
        this.attribute = attribute;
        this.eventbus = eventbus;
        this.subscription = subscription;
        this.eventId = `${this.attribute.host}:${this.attribute.port}/${this.attribute.device}/${this.attribute.name}`;
    }

    read(){
        return this.attribute.read()
            .then(resp => {
                this.eventbus.publish(this.eventId,resp,kTangoChannel);
                return resp;
            })
            .catch(err => {
                this.eventbus.publish(this.eventId,err,kTangoChannel);
                throw err;
            });
    }

    write(v){
        return this.attribute.write(v)
            .then(resp => {
                this.eventbus.publish(this.eventId,resp,kTangoChannel);
                return resp;
            })
            .catch(err => {
                this.eventbus.publish(this.eventId,err,kTangoChannel);
                throw err;
            });
    }

    subscribe(type){
        return this.subscription.subscribe(new Target(`${this.attribute.host}:${this.attribute.port}`,this.attribute.device,this.attribute.name, type),
            (resp) => {
                this.eventbus.publish(this.eventId,resp,kTangoChannel);
            },
            (err) => {
                this.eventbus.publish(this.eventId,err,kTangoChannel);
            });
    }

    /**
     *
     * @returns {Observable<unknown>}
     */
    observe(){
        return fromEvent(this.eventbus._channels.get(kTangoChannel),this.eventId).pipe(map(event => event.detail));
    }
}