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
        return new TangoHost({rest: this, id: new TangoId({host,port})});
    }

    newTangoAttribute({host='localhost', port = 10000, domain, family, device, name} = {}){
        if(domain === undefined && family === undefined)
            [domain, family, device] = device.split(kTangoIdSeparator);
        return new TangoAttribute({rest: this, id: new TangoId({host,port,domain,family,device,name})});
    }

    newTangoCommand({host='localhost', port = 10000, domain, family, device, name} = {}){
        if(domain === undefined && family === undefined)
            [domain, family, device] = device.split(kTangoIdSeparator);
        return new TangoCommand({rest: this, id: new TangoId({host,port,domain,family,device,name})});
    }

    newTangoPipe({host='localhost', port = 10000, domain, family, device, name} = {}){
        if(domain === undefined && family === undefined)
            [domain, family, device] = device.split(kTangoIdSeparator);
        return new TangoPipe({rest: this, id: new TangoId({host, port, domain, family, device, name})})
    }

    newTangoDevice({host='localhost', port=10000, domain, family, device} = {}){
        if(domain === undefined && family === undefined)
            [domain, family, device] = device.split(kTangoIdSeparator);
        return new TangoDevice({rest: this, id: new TangoId({host, port, domain, family, device})});
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
 * @param accept
 * @return {Promise<string>|Promise<*>}
 */
function extract(resp, accept){
    if(accept && accept === "text/plain")
        return resp.text()
            .then(text => {
                try{
                    return JSON.parse(text)
                } catch (e) {
                    return text;
                }
            });
    else
        return resp.json();
}

/**
 *
 * @private
 * @param resp
 * @return {Observable<*>}
 */
function onSuccess(resp){
    const accept = this.headers["Accept"] || this.headers["accept"];
    if(resp.ok && resp.status === 200)
        return from(extract(resp, accept));
    else {
        switch (resp.status) {
            case 204:
                return of();
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
     * @param {*} [options={}] options
     * @returns {Observable<*>}
     */
    get(what = '', options = {}) {
        if (what) this.url += what;
        const finalOptions = {
            ...this.options,
            ...options,
            method: "GET",
            headers: {
                ...this.options.headers,
                "Accept": "application/json",
                ...options.headers
            }
        }

        return fromFetch(this.url, finalOptions).pipe(
            catchError(onFailure.bind(this)),
            switchMap(onSuccess.bind(finalOptions))
        );
    }

    /**
     *
     * @param {string} [what=''] what
     * @param {*} [data] data
     * @returns {Observable<*>}
     */
    post(what = '', data, options = {}) {
        if (what) this.url += what;//TODO if no what is provided data will be treated as what -> failure
        const finalOptions = {
            ...this.options,
            ...options,
            method: "POST",
            headers: {
                ...this.options.headers,
                ...options.headers,
                "Content-type": "application/json"
            }
        };
        if(data)
            finalOptions.body = (typeof data == 'object') ? JSON.stringify(data) : data;

        return fromFetch(this.url, finalOptions).pipe(
            catchError(onFailure.bind(this)),
            switchMap(onSuccess.bind(finalOptions))
        )
    }

    /**
     *
     * @param {string} [what=''] what
     * @param {*} [data] data
     * @param {*} [options={}] options
     * @returns {Observable<*>}
     */
    put(what = '', data = {}, options = {}) {
        if (what) this.url += what;//TODO if no what is provided data will be treated as what -> failure
        const finalOptions = {
            ...this.options,
            ...options,
            method: 'put',
            headers: {
                ...this.options.headers,
                ...options.headers,
                "Content-type": "application/json"
            },
            body: (typeof data == 'object') ? JSON.stringify(data) : data
        }

        return fromFetch(this.url, finalOptions).pipe(
            catchError(onFailure.bind(this)),
            switchMap(onSuccess.bind(finalOptions))
        );
    }

    /**
     *
     * @param {string} [what=''] what
     * @returns {Observable<*>}
     */
    "delete"(what='', options = {}) {
        if (what) this.url += what;
        const finalOptions = {
            ...this.options,
            ...options,
            method: "DELETE"
        }

        return fromFetch(this.url, finalOptions).pipe(
            catchError(onFailure.bind(this)),
            switchMap(onSuccess.bind(finalOptions))
        );
    }
}