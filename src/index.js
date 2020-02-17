/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 27.11.2019
 */
/**
 * @class [TangoRestApi]
 */
export class TangoRestApi {
    constructor(url){
        this.url = url;
    }

    ping(){
        return this.toTangoRestApiRequest().get();
    }

    /**
     *
     * @return {TangoRestApiRequest}
     */
    toTangoRestApiRequest(){
        return new TangoRestApiRequest(this.url)
            .version("v10")
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
            this.url += '/devices/';
            this.url += name;
            return this;
        }

        /**
         * @returns {TangoRestApiRequest}
         */
        properties(name) {
            this.url += '/properties/';
            if (name) this.url += name;
            return this;
        }

        /**
         * @returns {TangoRestApiRequest}
         */
        pipes(name) {
            this.url += '/pipes/';
            if (name) this.url += name;
            return this;
        }

        /**
         * @param name
         * @returns {TangoRestApiRequest}
         */
        commands(name) {
            //TODO check devices branch
            this.url += '/commands/';
            if (name) this.url += name;
            return this;
        }

        /**
         * @param name
         * @returns {TangoRestApiRequest}
         */
        attributes(name) {
            //TODO check devices branch
            this.url += '/attributes/';
            if (name) this.url += name;
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
         * @returns {webix.promise}
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