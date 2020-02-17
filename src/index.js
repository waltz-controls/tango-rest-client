/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 27.11.2019
 */


export class TangoDevice {
    constructor(id, tango_host, name, alias, info) {
        this.id = id;
        let host, port;
        [host, port] = tango_host.split(':');
        this.host = host;
        this.port = parseInt(port);
        this.name = name;
        this.alias = alias;
        this.info = info;

    }

    static get(rest, host, port, name) {
        return rest
            .toTangoRestApiRequest()
            .hosts(host, port)
            .devices(name)
            .get()
            .then(resp => new TangoDevice(resp.id, resp.host, resp.name, resp.alias, resp.info));
    }

    /**
     *
     * @param rest
     * @returns {Promise<TangoHost>}
     */
    getTangoHost(rest) {
        return TangoHost.get(rest, this.host, this.port)
    }

    /**
     *
     * @param rest
     * @param name
     * @returns {Promise<TangoAttribute>}
     */
    getTangoAttribute(rest, name) {
        return TangoAttribute.get(rest, this.host, this.port, this.name, name);
    }

    getTangoCommand() {

    }

    getTangoPipe() {

    }

    getTangoDeviceProperty() {

    }

    /**
     *
     * @param {TangoRestApiV10} rest
     */
    toTangoRestApiRequest(rest) {
        return this.host.toTangoRestApiRequest(rest).devices(this.name);
    }
}

export class TangoAttribute {
    constructor(id, tango_host, device, name, info) {
        this.id = id;
        let host, port;
        [host, port] = tango_host.split(':');
        this.host = host;
        this.port = port;
        this.device = device;
        this.name = name;
        this.info = info;
    }

    /**
     *
     * @param rest
     * @param host
     * @param port
     * @param device
     * @param name
     * @returns {Promise<TangoAttribute>}
     */
    static get(rest, host, port, device, name) {
        return rest.toTangoRestApiRequest()
            .hosts(host, port)
            .devices(device)
            .attributes(name)
            .get()
            .then(resp => new TangoAttribute(resp.id, resp.host, resp.device, resp.name, resp.info))
    }

    /**
     *
     * @param rest
     * @returns {*}
     */
    read(rest) {
        return this.toTangoRestApiRequest(rest)
            .value()
            .get()
    }

    toTangoRestApiRequest(rest) {
        return rest.toTangoRestApiRequest()
            .hosts(this.host)
            .devices(this.device)
            .attributes(this.name)
    }
}

export class TangoHost {
    constructor(id, host, port, name, info) {
        this.id = id;
        this.host = host;
        this.port = port;
        this.name = name;
        this.info = info
    }

    static get(rest, host, port) {
        return rest
            .toTangoRestApiRequest()
            .hosts(host, port)
            .get()
            .then(resp => new TangoHost(resp.id, resp.host, parseInt(resp.port), resp.name, resp.info))
    }

    /**
     *
     * @param {TangoRestApiV10} rest
     * @param {string} wildcard
     * @returns {Promise<[{name, href}]>}
     *
     */
    devices(rest, wildcard) {
        return this.toTangoRestApiRequest(rest)
            .devices()
            .get(`?${wildcard}`)
    }

    /**
     *
     * @param {TangoRestApiV10} rest
     * @returns {TangoRestApiRequest}
     */
    toTangoRestApiRequest(rest) {
        return rest.toTangoRestApiRequest().hosts(this.host, this.port);
    }
}

/**
 * @class [TangoRestApiV10]
 */
export class TangoRestApiV10 {
    constructor(url = '', options = {}) {
        this.url = `${url}/tango/rest/v10`;
        this.options = options;
    }

    ping() {
        return this.toTangoRestApiRequest().get();
    }

    /**
     *
     * @return {TangoRestApiRequest}
     */
    toTangoRestApiRequest(){
        return new TangoRestApiRequest(this.url, this.options);
    }
}

let eventbus = {
    publish(channel, event, msg){
        console.log(`${channel.event}`, msg);
    }
};

/**
 * Tango REST API client
 *
 * @class [TangoRestApiRequest]
 * @property {string} url
 * @property {string} type GET|POST|PUT|DELETE
 * @property {object} transport. fetch by default
 * @property {object} result
 * @property {object} failure
 */
export class TangoRestApiRequest
    /** @lends  TangoRestApiRequest */
    {
        static registerEventBus(v){
            eventbus = v;
        }

        constructor(url, options = {}, transport = fetch){
            this.url = url;
            this.response = null;
            this.failure = null;
            this.transport = transport;
            this.options = options;
        }

        /**
         *
         * @event tango_rest_client.rest_failure
         * @type {OpenAjax}
         * @property {TangoRestApiRequest} data
         * @memberof TangoWebappPlatform
         */
        /**
         *
         * @event tango_rest_client.rest_success
         * @type {OpenAjax}
         * @property {TangoRestApiRequest} data
         * @memberof TangoWebappPlatform
         */
        /**
         * @fires tango_rest_client.rest_failure
         * @fires tango_rest_client.rest_success
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
         * @fires tango_webapp.rest_failure
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
            //TODO check devices branch
            this.url += '/commands';
            if (name) this.url += `/${name}`;
            return this;
        }

        /**
         * @param name
         * @returns {TangoRestApiRequest}
         */
        attributes(name) {
            //TODO check devices branch
            this.url += '/attributes';
            if (name) this.url += `/${name}`;
            return this;
        }

        value() {
            //TODO check devices branch
            this.url += '/value';
            return this;
        }

        /**
         * Fires event to OpenAjax
         * @fires tango_webapp.rest_success
         * @fires tango_webapp.rest_failure
         * @returns {webix.promise}
         */
        exec(argin) {
            return this.put("", argin);
        }


        /**
         * Fires event to OpenAjax
         * @fires tango_webapp.rest_success
         * @fires tango_webapp.rest_failure
         * @returns {promise}
         */
        get(what) {
            if (this.result != null) return this.promise.resolve(this.result);
            if (this.failure != null) return this.promise.reject(this.failure);
            if (what) this.url += what;

            return this.transport.call(window, this.url,Object.assign(this.options,{
                method: "GET",
                credentials: "include"
            }))
                .catch((resp) => this.onFailure(resp))
                .then((resp) => this.onSuccess(resp));
        }

        /**
         * Fires event to OpenAjax
         * @fires tango_webapp.rest_success
         * @fires tango_webapp.rest_failure
         * @returns {webix.promise}
         */
        post(what, data) {
            if (this.result != null) return this.promise.resolve(this.result);
            if (this.failure != null) return this.promise.reject(this.failure);
            if (what) this.url += what;//TODO if no what is provided data will be treated as what -> failure
            const params = Object.assign(this.options,{
                method: "POST",
                credentials: "include"
            });
            if(data)
                Object.assign(params, {
                    headers:{
                        "Content-type": "application/json"
                    },
                    body: (typeof data == 'object') ? JSON.stringify(data) : data
                    //TODO credentials
                });

            return this.transport.call(window, this.url, params)
                .catch((resp) => this.onFailure(resp))
                .then((resp) => this.onSuccess(resp));
        }

        /**
         * Fires event to OpenAjax
         * @fires tango_webapp.rest_success
         * @fires tango_webapp.rest_failure
         * @returns {webix.promise}
         */
        put(what, data = {}) {
            if (this.result != null) return this.promise.resolve(this.result);
            if (this.failure != null) return this.promise.reject(this.failure);
            if (what) this.url += what;//TODO if no what is provided data will be treated as what -> failure
            return this.transport.call(window,this.url,Object.assign(this.options,{
                method: "PUT",
                headers:{
                            "Content-type": "application/json"
                        },
                body: (typeof data == 'object') ? JSON.stringify(data) : data,
                credentials: "include"
            }))
                .catch((resp) => this.onFailure(resp))
                .then((resp) => this.onSuccess(resp));
        }

        /**
         * Fires event to OpenAjax
         * @fires tango_webapp.rest_success
         * @fires tango_webapp.rest_failure
         * @returns {webix.promise}
         */
        "delete"(what) {
            if (this.result != null) return this.promise.resolve(this.result);
            if (this.failure != null) return this.promise.reject(this.failure);
            if (what) this.url += what;
            return this.transport.call(window,this.url, Object.assign(this.options,{
                method: "DELETE",
                credentials: "include"
            }))
                .catch((resp) => this.onFailure(resp))
                .then((resp) => this.onSuccess(resp));
        }
    }