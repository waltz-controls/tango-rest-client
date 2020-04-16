/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 27.11.2019
 */
import {TangoAttribute, TangoCommand, TangoDevice, TangoHost, TangoPipe} from "./tango";
import {from, of} from "rxjs";
import {switchMap} from "rxjs/operators";


/**
 * @class [TangoRestApi]
 */
export class TangoRestApi {
    constructor(host = '', options = {}) {
        this.host = host;
        this.url = `${host}/tango/rest/v10`;
        this.options = options;
    }

    ping() {
        return this.toTangoRestApiRequest().get();
    }

    newTangoHost({host='localhost', port=10000}){
        return new TangoHost({rest: this, host, port})
    }

    newTangoAttribute({host, port = 10000, device, name}){
        return new TangoAttribute({rest: this, host, port, device, name});
    }

    newTangoCommand({host, port = 10000, device, name}){
        return new TangoCommand({rest: this, host, port, device, name});
    }

    newTangoPipe({host, port = 10000, device, name}){
        return new TangoPipe({rest: this, host, port, device, name})
    }

    newTangoDevice({host, port=10000, device}){
        return new TangoDevice({rest: this, host, port, device});
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
    constructor(url, options = {}, transport = fetch){
        this.url = url;
        this.transport = transport;
        this.options = options;
    }

    /**
     *
     * @param resp
     * @returns {*}
     * @private
     */
    onSuccess(resp) {
        if(resp.ok){
            return resp.json();
        } else {
            return resp.json().then(json => {
                throw json
            });
        }
    }

    /**
     *
     * @param {TypeError} resp
     * @private
     */
    onFailure(resp) {
        throw {
            errors: [
                {
                    reason: resp.toString(),
                    description: resp.message,
                    severity: 'ERR',
                    origin: this.url
                }
            ],
            quality: 'FAILURE',
            timestamp: +new Date()
        };
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
     * @returns {Promise<*>}
     */
    get(what = '') {
        if (what) this.url += what;
        const options = {
            ...this.options,
            method: "GET"
        }

        return this.transport.call(null, this.url, options)
            .catch((resp) => this.onFailure(resp))
            .then((resp) => this.onSuccess(resp));
    }

    /**
     *
     * @param {string} [what=''] what
     * @param {*} [data] data
     * @returns {Promise<*>}
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

        return this.transport.call(null, this.url, options)
            .catch((resp) => this.onFailure(resp))
            .then((resp) => this.onSuccess(resp));
    }

    /**
     *
     * @param {string} [what=''] what
     * @param {*} [data] data
     * @returns {Promise<*>}
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
        return this.transport.call(null,this.url,options)
            .catch((resp) => this.onFailure(resp))
            .then((resp) => this.onSuccess(resp));
    }

    /**
     *
     * @param {string} [what=''] what
     * @returns {Promise<*>}
     */
    "delete"(what='') {
        if (what) this.url += what;
        const options = {
            ...this.options,
            method: "DELETE"
        }
        return this.transport.call(null,this.url, options)
            .catch((resp) => this.onFailure(resp))
            .then((resp) => this.onSuccess(resp));
    }

    /**
     * Transforms this instance so that end methods ({@link this#get}, {@link this#put}, {@link this#post} ,{@link this#delete})
     * do return Observable<*> instead of Promise<*>
     *
     * @return {TangoRestApiRequest}
     */
    observe(){
        return new class extends TangoRestApiRequest {
            constructor(request) {
                super(request.url, request.options, request.transport);
            }

            get(what){
                return of(super.get).pipe(
                    switchMap(upstream => from(upstream.call(this, what)))
                );
            }

            put(what, data = {}) {
                return of(super.put).pipe(
                    switchMap(upstream => from(upstream.call(this, what, data)))
                );
            }

            post(what, data) {
                return of(super.post).pipe(
                    switchMap(upstream => from(upstream.call(this, what, data)))
                );
            }

            "delete"(what){
                return of(super.delete).pipe(
                    switchMap(upstream => from(upstream.call(this, what)))
                );
            }
        }(this);
    }
}