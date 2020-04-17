import {TangoRestApi} from "./rest";
import {Observable} from "rxjs";
import {filter} from "rxjs/operators";

export class TangoDevice {
    constructor({rest, host, port, name, alias} = {}) {
        this.rest = rest;
        this.host = host;
        this.port = parseInt(port);
        this.name = name;
        this.alias = alias;

    }

    /**
     *
     * @returns {TangoHost}
     */
    tangoHost() {
        return new TangoHost({rest: this.rest, host:this.host, port: this.port})
    }

    newCommand(name){
        return new TangoCommand({rest: this.rest, host: this.host, port: this.port, device: this.name, name});
    }

    newAttribute(name){
        return new TangoAttribute({rest: this.rest, host: this.host, port: this.port, device: this.name, name});
    }

    newPipe(name){
        return new TangoPipe({rest: this.rest, host: this.host, port: this.port, device: this.name, name});
    }

    info(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.name)
            .get()
            .then(resp => resp.info);
    }

    properties(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.name)
            .properties()
            .get();
    }

    /**
     *
     * @param subscriptions
     * @return {Observable<*>}
     */
    observe(subscriptions){
        subscriptions.listen({host:`${this.host}:${this.port}`,device: this.name, attribute: 'state', type: 'change'})
        subscriptions.listen({host:`${this.host}:${this.port}`,device: this.name, attribute: 'status', type: 'change'})

        return subscriptions.asObservable().pipe(
            filter(msg => msg.host === `${this.host}:${this.port}` &&
                msg.device === this.name &&
                (msg.attribute === 'state' || msg.attribute === 'status'))
        )
    }

    /**
     *
     */
    toTangoRestApiRequest() {
        return this.rest.toTangoRestApiRequest().devices(this.name);
    }
}

export class TangoPipe {
    constructor({rest, host, port, device, name} = {}) {
        this.rest = rest;
        this.host = host;
        this.port = parseInt(port);
        this.device = device;
        this.name = name;
    }

    tangoHost(){
        return new TangoHost({rest: this.rest, host: this.host, port: this.port});
    }

    tangoDevice(){
        return new TangoDevice({rest: this.rest, host:this.host, port: this.port, name: this.device});
    }

    /**
     *
     * @param {*} argin
     * @returns {Promise}
     */
    read(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.device)
            .pipes(this.name)
            .get()
    }

    write(v){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.device)
            .pipes(this.name)
            .put('', v)
    }
}

export class TangoCommand {
    constructor({rest, host, port, device, name} = {port:10000}) {
        this.rest = rest;
        this.host = host;
        this.port = parseInt(port);
        this.device = device;
        this.name = name;
    }

    tangoHost(){
        return new TangoHost({rest: this.rest, host: this.host, port: this.port});
    }

    tangoDevice(){
        return new TangoDevice({rest: this.rest, host:this.host, port: this.port, name: this.device});
    }

    /**
     *
     * @param {*} argin
     * @returns {Promise}
     */
    execute(argin){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.device)
            .commands(this.name)
            .put('', argin)
    }
}

export class TangoAttribute {
    /**
     *
     * @constructor
     * @param {TangoRestApi} rest
     * @param host
     * @param port
     * @param device
     * @param name
     */
    constructor({rest, host, port, device, name}) {
        this.rest = rest;
        this.host = host;
        this.port = parseInt(port);
        this.device = device;
        this.name = name;
    }

    tangoHost(){
        return new TangoHost({rest: this.rest, host: this.host, port: this.port});
    }

    tangoDevice(){
        return new TangoDevice({rest: this.rest, host:this.host, port: this.port, name: this.device});
    }

    /**
     *
     * @returns {Promise}
     */
    read() {
        return this.toTangoRestApiRequest()
            .value()
            .get()
    }

    /**
     *
     * @param v
     * @returns {Promise}
     */
    write(v){
        return this.toTangoRestApiRequest()
            .value()
            .put(`?v=${v}`);
    }

    /**
     * Opens an event stream for this attribute
     *
     * @param {Subscriptions} subscriptions
     * @param {string} [type='change'] type
     * @return {Observable}
     */
    eventStream(subscriptions, type = 'change'){
        return subscriptions.observe({host:`${this.host}:${this.port}`,device: this.device, attribute: this.name, type})
    }

    info(){
        return this.toTangoRestApiRequest()
            .get(`info`);
    }

    properties(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.device)
            .attributes(this.name)
            .properties()
            .get();
    }

    toTangoRestApiRequest() {
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host)
            .devices(this.device)
            .attributes(this.name)
    }
}

export class TangoHost {
    constructor({rest, host, port} = {}) {
        this.rest = rest;
        this.host = host;
        this.port = parseInt(port);
    }

    info(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .get()
            .then(resp => resp.info);
    }

    device(name){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(name)
            .get(); //TODO convert to TangoDevice?
    }

    /**
     *
     * @returns {Promise<TangoDatabase>}
     */
    database(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .get('?filter=name')
            .then(resp => new TangoDatabase({rest: this.rest, host:this.host, port: this.port, name: resp.name}))
    }

    /**
     *
     * @param {TangoRestApiV10} rest
     * @param {string} wildcard
     * @returns {Promise<[{name, href}]>}
     *
     */
    devices(wildcard) {
        return this.toTangoRestApiRequest()
            .devices()
            .get(`?${wildcard}`)
    }

    /**
     *
     * @returns {TangoRestApiRequest}
     */
    toTangoRestApiRequest() {
        return this.rest.toTangoRestApiRequest().hosts(this.host, this.port);
    }
}

export class TangoDatabase extends TangoDevice {
    constructor({rest, host, port, name}){
        super({rest, host, port, name, alias: `${host}:${port}`})
    }

    /**
     * Returns error response if alias is not set - limitation of the native Tango API
     *
     * @param name
     * @return {Promise<string>}
     */
    deviceAlias(name) {
        return this.newCommand("DbGetDeviceAlias").execute(name)
            .then(function(resp){
                return resp.output;
            })
    }
    /**
     *
     * @return {Promise<string[]>}
     */
    deviceAliasList(){
        return this.newCommand("DbGetDeviceAliasList").execute("*")
            .then(function(resp){
                return resp.output;
            })
    }
    /**
     *
     * @param alias
     * @return {Promise<string>}
     */
    deviceByAlias(alias){
        return this.newCommand("DbGetAliasDevice").execute(alias)
            .then(function(resp){
                return resp.output;
            })
    }
    /**
     *
     * @param svalue
     */
    addDevice(svalue) {
        return this.newCommand("DbAddDevice").execute(svalue);
    }
    /**
     *
     * @param wildcard
     */
    deviceDomainList(wildcard = "*") {
        return this.newCommand("DbGetDeviceDomainList").execute(wildcard);
    }
    /**
     *
     * @param wildcard
     */
    deviceFamilyList(wildcard = "*/*") {
        return this.newCommand("DbGetDeviceFamilyList").execute(wildcard);
    }
    /**
     *
     * @param wildcard
     */
    deviceMemberList(wildcard = "*/*/*") {
        return this.newCommand("DbGetDeviceMemberList").execute(wildcard);
    }
    /**
     *
     * @param {[]} args
     * @returns {Promise}
     */
    deviceProperty(args) {
        return this.newCommand("DbGetDeviceProperty").execute(args);
    }
    /**
     *
     * @param {string} device
     * @return {Promise}
     */
    deleteDevice(device) {
        return this.newCommand("DbDeleteDevice").execute(device);
    }
    /**
     *
     * @param {string} device
     * @param {string} alias
     * @returns {Promise}
     */
    putDeviceAlias(device, alias){
        return this.newCommand("DbPutDeviceAlias").execute([device, alias]);
    }
    /**
     *
     * @param {string} alias
     * @returns {Promise}
     */
    deleteDeviceAlias(alias){
        return this.newCommand("DbDeleteDeviceAlias").execute(alias);
    }
}
