/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 27.11.2019
 */
import {kTangoIdSeparator, TangoAttribute, TangoCommand, TangoDevice, TangoHost, TangoId, TangoPipe} from "./tango";
import {from, throwError} from "rxjs";
import {catchError, switchMap} from "rxjs/operators";
import {fromFetch} from "rxjs/fetch";


/**
 * @class [TangoRestApi]
 */
export class TangoRestApi {
    constructor(host = '', options = {}) {
        this.host = host;
        this.url = `${host}/tango/rest/v11`;
        this.options = options;
    }

    ping() {
        return this.toTangoRestApiRequest().get();
    }

    newTangoHost({host='localhost', port=10000} = {}){
        return new TangoHost({rest: this, id: new TangoId().host(host).port(port)});
    }

    newTangoAttribute({host='localhost', port = 10000, domain, family, device, name} = {}){
        if(domain === undefined && family === undefined)
            [domain, family, device] = device.split(kTangoIdSeparator);
        return new TangoAttribute({rest: this, id: new TangoId().host(host).port(port).domain(domain).family(family).device(device).member(name)});
    }

    newTangoCommand({host='localhost', port = 10000, domain, family, device, name} = {}){
        if(domain === undefined && family === undefined)
            [domain, family, device] = device.split(kTangoIdSeparator);
        return new TangoCommand({rest: this, id: new TangoId().host(host).port(port).domain(domain).family(family).device(device).member(name)});
    }

    newTangoPipe({host='localhost', port = 10000, domain, family, device, name} = {}){
        if(domain === undefined && family === undefined)
            [domain, family, device] = device.split(kTangoIdSeparator);
        return new TangoPipe({rest: this, id: new TangoId().host(host).port(port).domain(domain).family(family).device(device).member(name)})
    }

    newTangoDevice({host='localhost', port=10000, domain, family, device} = {}){
        if(domain === undefined && family === undefined)
            [domain, family, device] = device.split(kTangoIdSeparator);
        return new TangoDevice({rest: this, id: new TangoId().host(host).port(port).domain(domain).family(family).device(device)});
    }

    /**
     *
     * @return {TangoRestApiRequest}
     */
    toTangoRestApiRequest(){
        return new TangoRestApiRequest(this.url, this.options);
    }
}

/**
 *
 * @private
 * @param resp
 * @return {Observable<*>}
 */
function onSuccess(resp){
    if(resp.ok)
        return from(resp.json());
    else {
        switch (resp.status) {
            case 400:
            case 404:
                return from(resp.json()).pipe(
                    switchMap(json => throwError(json))
                );
            default:
                return onFailure.call(resp, new Error(`${resp.status}: ${resp.statusText}`));
        }
    }
}

/**
 *
 * @private
 * @param {typeof Error} error
 * @return {Observable<*>}
 */
function onFailure(error){
    return throwError({
        errors: [
            {
                reason: error.toString(),
                description: error.message,
                severity: 'ERR',
                origin: this.url
            }
        ],
        quality: 'FAILURE',
        timestamp: +new Date()
    });
}

/**
 * Tango REST API client
 *
 * @class [TangoRestApiRequest]
 * @property {string} url
 * @property {object} [options={}] options
 * @property {object} [transport=fetch] transport. fetch by default
 */
export class TangoRestApiRequest
    /** @lends  TangoRestApiRequest */
{
    constructor(url, options = {}){
        this.url = url;
        this.options = options;
    }

    version(version){
        this.url += `/${version}`;
        return this;
    }

    subscriptions(id = 0){
        this.url += '/subscriptions';
        this.url += id ? `/${id}` : '';
        return this;
    }

    /**
     * @returns {TangoRestApiRequest}
     */
    hosts(host, port = 10000) {
        this.url += '/hosts/';
        this.url += host;
        if (port !== 10000) this.url += `;port=${port}`;
        return this;
    }

    /**
     * @returns {TangoRestApiRequest}
     */
    devices(name) {
        this.url += '/devices';
        if (name) this.url += `/${name}`;
        return this;
    }

    /**
     * @returns {TangoRestApiRequest}
     */
    properties(name) {
        this.url += '/properties';
        if (name) this.url += `/${name}`;
        return this;
    }

    /**
     * @returns {TangoRestApiRequest}
     */
    pipes(name) {
        this.url += '/pipes';
        if (name) this.url += `/${name}`;
        return this;
    }

    /**
     * @param name
     * @returns {TangoRestApiRequest}
     */
    commands(name) {
        this.url += '/commands';
        if (name) this.url += `/${name}`;
        return this;
    }

    /**
     * @param name
     * @returns {TangoRestApiRequest}
     */
    attributes(name) {
        this.url += '/attributes';
        if (name) this.url += `/${name}`;
        return this;
    }

    value() {
        this.url += '/value';
        return this;
    }

    /**
     *
     * @param {string} [what=''] what
     * @returns {Observable<*>}
     */
    get(what = '') {
        if (what) this.url += what;
        const options = {
            ...this.options,
            method: "GET"
        }

        return fromFetch(this.url, options).pipe(
            catchError(onFailure.bind(this)),
            switchMap(onSuccess)
        );
    }

    /**
     *
     * @param {string} [what=''] what
     * @param {*} [data] data
     * @returns {Observable<*>}
     */
    post(what = '', data) {
        if (what) this.url += what;//TODO if no what is provided data will be treated as what -> failure
        const options = {
            ...this.options,
            method: "POST",
            headers: {
                ...this.options.headers,
                "Content-type": "application/json"
            }
        };
        if(data)
            options.body = (typeof data == 'object') ? JSON.stringify(data) : data;

        return fromFetch(this.url, options).pipe(
            catchError(onFailure.bind(this)),
            switchMap(onSuccess)
        )
    }

    /**
     *
     * @param {string} [what=''] what
     * @param {*} [data] data
     * @returns {Observable<*>}
     */
    put(what = '', data = {}) {
        if (what) this.url += what;//TODO if no what is provided data will be treated as what -> failure
        const options = {
            ...this.options,
            method: 'put',
            headers: {
                ...this.options.headers,
                "Content-type": "application/json"
            },
            body: (typeof data == 'object') ? JSON.stringify(data) : data
        }

        return fromFetch(this.url, options).pipe(
            catchError(onFailure.bind(this)),
            switchMap(onSuccess)
        );
    }

    /**
     *
     * @param {string} [what=''] what
     * @returns {Observable<*>}
     */
    "delete"(what='') {
        if (what) this.url += what;
        const options = {
            ...this.options,
            method: "DELETE"
        }

        return fromFetch(this.url, options).pipe(
            catchError(onFailure.bind(this)),
            switchMap(onSuccess)
        );
    }
}