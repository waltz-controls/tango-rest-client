import {TangoRestApi} from "./rest";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";

/** @module tango */


/**
 *
 * @type {string}
 */
const kTangoIdSeparator = '/';

/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 22.10.2019
 */
export class TangoId {
    constructor({host, port, domain, family, device, member}) {
        this.tango_host = host;
        this.tango_port = port;
        this.tango_domain = domain;
        this.tango_family = family;
        this.tango_device = device;
        this.tango_member = member;
    }


    /**
     *
     * @param {string} [host='localhost'] host
     * @return {TangoId}
     */
    host(host='localhost'){
        this.tango_host = host;
        return this;
    }

    /**
     *
     * @param {string|int} [port=10000] port
     * @return {TangoId}
     */
    port(port=10000){
        this.tango_port = port;
        return this;
    }

    /**
     * Returns TangoHost id i.e. tango_host:tango_port
     *
     * @return {string}
     */
    getTangoHostId(){
        return `${this.tango_host}:${this.tango_port}`;
    }

    /**
     *
     * @param {string} domain
     * @return {TangoId}
     */
    domain(domain){
        this.tango_domain = domain;
        return this;
    }

    /**
     *
     * @param {string} family
     * @return {TangoId}
     */
    family(family){
        this.tango_family = family;
        return this;
    }

    /**
     *
     * @param {string} device
     * @return {TangoId}
     */
    device(device){
        this.tango_device = device;
        return this;
    }

    /**
     * e.g. localhost:10000/sys/tg_test/1
     *
     * @return {string}
     */
    getTangoDeviceId(){
        return `${this.getTangoHostId()}/${this.getTangoDeviceName()}`
    }

    /**
     * e.g. sys/tg_test/1
     *
     * @return {string}
     */
    getTangoDeviceName(){
        return `${this.tango_domain}/${this.tango_family}/${this.tango_device}`
    }

    /**
     *
     * @param {string} member
     * @return {TangoId}
     */
    member(member){
        this.tango_member = member;
        return this;
    }

    /**
     * e.g. localhost:10000/sys/tg_test/1/state
     *
     * @return {string}
     */
    getTangoMemberId(){
        return `${this.getTangoHostId()}/${this.getTangoDeviceName()}/${this.tango_member}`
    }

    /**
     * e.g. tango://localhost:10000/sys/tg_test/1
     *
     * @return {string}
     */
    getTangoDeviceFQDN(){
        return `tango://${this.getTangoDeviceId()}`
    }

    /**
     * e.g. tango://localhost:10000/sys/tg_test/1/state
     *
     * @return {string}
     */
    getTangoMemberFQDN(){
        return `tango://${this.getTangoMemberId()}`
    }

    /**
     *
     * @param tangoHost
     * @return {TangoId}
     */
    static fromTangoHost(tangoHost){
        const [host, port] = tangoHost.split(":");
        return new TangoId({host, port})
    }

    /**
     *
     * @param deviceId
     * @return {TangoId}
     */
    static fromDeviceId(deviceId){
        const [host_port, domain, family, device] = deviceId.split(kTangoIdSeparator);
        const [host, port] = host_port.split(":");
        return new TangoId({
            host,
            port,
            domain,
            family,
            device
        })
    }

    /**
     *
     * @param memberId
     * @return {TangoId}
     */
    static fromMemberId(memberId){
        const member = memberId.split(kTangoIdSeparator).pop();

        return this.fromDeviceId(memberId)
                        .member(member)
    }
}

/**
 * @class [TangoDevice]
 * @memberof tango
 */
export class TangoDevice {
    /**
     *
     * @param rest
     * @param host
     * @param port
     * @param name
     * @param alias
     * @constructor
     */
    constructor({rest, host, port, name, alias} = {}) {
        this.rest = rest;
        this.host = host;
        this.port = parseInt(port);
        this.name = name;
        this.alias = alias;
    }

    /**
     *
     * @instance
     * @returns {TangoHost}
     * @memberof tango.TangoDevice
     */
    tangoHost() {
        return new TangoHost({...this})
    }

    /**
     *
     * @param name
     * @return {TangoCommand}
     */
    newCommand(name){
        return new TangoCommand({...this, device: this.name, name});
    }

    /**
     *
     * @param name
     * @return {TangoAttribute}
     */
    newAttribute(name){
        return new TangoAttribute({...this, device: this.name, name});
    }

    /**
     *
     * @param name
     * @return {TangoPipe}
     */
    newPipe(name){
        return new TangoPipe({...this, device: this.name, name});
    }

    /**
     *
     * @return {Observable<*>}
     */
    info(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.name)
            .get()
            .pipe(map(resp => resp.info));
    }

    /**
     *
     * @return {Observable<*>}
     */
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
    eventStream(subscriptions){
        return merge(
            subscriptions.observe({host:`${this.host}:${this.port}`,device: this.name, attribute: 'state', type: 'change'}),
            subscriptions.observe({host:`${this.host}:${this.port}`,device: this.name, attribute: 'status', type: 'change'}),
        )
    }

    /**
     *
     */
    toTangoRestApiRequest() {
        return this.rest.toTangoRestApiRequest().devices(this.name);
    }
}

/**
 * @memberOf tango
 * @class [TangoPipe]
 */
export class TangoPipe {
    constructor({rest, host, port, device, name} = {}) {
        this.rest = rest;
        this.host = host;
        this.port = parseInt(port);
        this.device = device;
        this.name = name;
    }

    /**
     *
     * @return {TangoHost}
     */
    tangoHost(){
        return new TangoHost({...this});
    }

    /**
     *
     * @return {TangoDevice}
     */
    tangoDevice(){
        return new TangoDevice({...this, name: this.device});
    }

    /**
     *
     * @returns {Observable<*>}
     */
    read(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.device)
            .pipes(this.name)
            .get()
    }

    /**
     *
     * @param v
     * @return {Observable<*>}
     */
    write(v){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.device)
            .pipes(this.name)
            .put('', v)
    }
}

/**
 * @memberOf tango
 * @class [TangoCommand]
 */
export class TangoCommand {
    constructor({rest, host, port, device, name} = {port:10000}) {
        this.rest = rest;
        this.host = host;
        this.port = parseInt(port);
        this.device = device;
        this.name = name;
    }

    /**
     *
     * @return {TangoHost}
     */
    tangoHost(){
        return new TangoHost({...this});
    }

    /**
     *
     * @return {TangoDevice}
     */
    tangoDevice(){
        return new TangoDevice({...this, name: this.device});
    }

    /**
     *
     * @param {*} argin
     * @returns {Observable<*>}
     */
    execute(argin){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.device)
            .commands(this.name)
            .put('?filter=!input', {
                host: `${this.host}:${this.port}`,
                device: this.device,
                name: this.name,
                input: argin
            })
    }
}

/**
 * @memberOf tango
 * @class [TangoAttribute]
 */
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
        return new TangoHost({...this});
    }

    tangoDevice(){
        return new TangoDevice({...this, name: this.device});
    }

    /**
     *
     * @returns {Observable<*>}
     */
    read() {
        return this.toTangoRestApiRequest()
            .value()
            .get()
    }

    /**
     *
     * @param v
     * @returns {Observable<*>}
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

    /**
     *
     * @return {Observable<*>}
     */
    info(){
        return this.toTangoRestApiRequest()
            .get(`info`);
    }

    /**
     *
     * @return {Observable<*>}
     */
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

/**
 *
 * @memberOf tango
 * @class [TangoHost]
 */
export class TangoHost {
    constructor({rest, host, port} = {}) {
        this.rest = rest;
        this.host = host;
        this.port = parseInt(port);
    }

    /**
     *
     * @return {Observable<string[]>}
     */
    info(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .get()
            .pipe(map(resp => resp.info));
    }

    /**
     *
     * @param name
     * @return {Observable<TangoDevice>}
     */
    device(name){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(name)
            .get()
            .pipe(
                map(resp => new TangoDevice({...this,name, alias:resp.alias}))
            );
    }

    /**
     *
     * @returns {Observable<TangoDatabase>}
     */
    database(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .get('?filter=name')
            .pipe(
                map(resp => new TangoDatabase({rest: this.rest, host:this.host, port: this.port, name: resp.name}))
            );
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

/**
 * @memberOf tango
 */
export class TangoDatabase extends TangoDevice {
    constructor({rest, host, port, name}){
        super({rest, host, port, name, alias: `${host}:${port}`})
    }

    /**
     * Returns error response if alias is not set - limitation of the native Tango API
     *
     * @param name
     * @return {Observable<string>}
     */
    deviceAlias(name) {
        return this.newCommand("DbGetDeviceAlias").execute(name)
            .pipe(
                map(resp => resp.output)
            );
    }
    /**
     *
     * @return {Observable<string[]>}
     */
    deviceAliasList(){
        return this.newCommand("DbGetDeviceAliasList").execute("*")
            .pipe(
                map(resp => resp.output)
            );
    }
    /**
     *
     * @param alias
     * @return {Observable<string>}
     */
    deviceByAlias(alias){
        return this.newCommand("DbGetAliasDevice").pipe(
            map(resp => resp.output)
        );
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
