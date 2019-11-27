/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 27.11.2019
 */
/**
 * Tango REST API client
 *
 * @class [TangoRestApiRequest]
 * @property {string} url
 * @property {string} type GET|POST|PUT|DELETE
 * @property {object} transport
 * @property {object} eventbus
 * @property {object} result
 * @property {object} failure
 */
export class TangoRestApiRequest
    /** @lends  TangoRestApiRequest */
    {
        constructor(url, transport = webix.ajax, eventbus = OpenAjax.hub){
            this.url = url;
            this.type = "";
            this.response = null;
            this.failure = null;
            this.transport = transport;
            this.eventbus = eventbus;
        }

        /**
         * @param {} resp
         */
        add_errors(resp){
            resp.errors = resp.errors.map(function(error){ return TangoWebappHelpers.newTangoError(error)});
            this._super(resp.errors);
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
            let json = {};
            if (resp.text().length > 0) {
                json = resp.json();

                if (json.quality === 'FAILURE') {
                    //TODO
                    // this.add_errors(json);
                    this.failure = json;
                    this.eventbus.publish("tango_rest_client.rest_failure", {data: this});
                    throw json;
                }
            }
            this.result = json;
            this.eventbus.publish("tango_rest_client.rest_success", {data: this});
            return json;
        }

        /**
         * @fires tango_webapp.rest_failure
         *
         * @param resp
         * @private
         */
        onFailure(resp) {
            let json;
            try {
                json = JSON.parse(resp.responseText);
            } catch (e) {
                json = {
                    errors: [
                        {
                            reason: resp.status,
                            description: resp.responseText ? resp.responseText : "Unspecified error",
                            severity: 'ERR',
                            origin: this.url
                        }
                    ],
                    quality: 'FAILURE',
                    timestamp: +new Date()
                }
            }
            //TODO
            //this.add_errors(json);
            this.failure = json;
            this.eventbus.publish("tango_rest_client.rest_failure", {data: this});
            throw json;

        }

        subscriptions(id = 0){
            this.url += '/subscriptions';
            this.url += id ? `/${id}` : '';
            return this;
        }

        /**
         * @returns {TangoRestApiRequest}
         */
        hosts(host) {
            this.url += '/hosts/';
            this.url += host;
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
            this.type = "GET";
            this.eventbus.publish("tango_rest_client.rest_send", {data: this});
            return this.transport().get(this.url).then(this._success.bind(this)).fail(this._failure.bind(this));
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
            this.type = "POST";
            this.eventbus.publish("tango_rest_client.rest_send", {data: this});
            if(data)
                return this.transport().headers({
                    "Content-type": "application/json"
                }).post(this.url, (typeof data == 'object') ? JSON.stringify(data) : data)
                    .then((resp) => this.onSuccess(resp))
                    .catch((resp) => this.onFailure(resp));
            else
                return this.transport().post(this.url)
                    .then((resp) => this.onSuccess(resp))
                    .catch((resp) => this.onFailure(resp));
        }

        /**
         * Fires event to OpenAjax
         * @fires tango_webapp.rest_success
         * @fires tango_webapp.rest_failure
         * @returns {webix.promise}
         */
        put(what, data) {
            if (this.result != null) return this.promise.resolve(this.result);
            if (this.failure != null) return this.promise.reject(this.failure);
            if (what) this.url += what;//TODO if no what is provided data will be treated as what -> failure
            this.type = "PUT";
            this.eventbus.publish("tango_rest_client.rest_send", {data: this});
            return this.transport().headers({
                "Content-type": "application/json"
            }).put(this.url, (typeof data == 'object') ? JSON.stringify(data) : data)
                .then((resp) => this.onSuccess(resp))
                .catch((resp) => this.onFailure(resp));
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
            this.type = "DELETE";
            this.eventbus.publish("tango_rest_client.rest_send", {data: this});
            return this.transport().del(this.url)
                .then((resp) => this.onSuccess(resp))
                .catch((resp) => this.onFailure(resp));
        }
    }