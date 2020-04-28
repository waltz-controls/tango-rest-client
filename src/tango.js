import {TangoRestApi} from "./rest";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";

/** @module tango */


/**
 *
 * @type {string}
 */
export const kTangoIdSeparator = '/';

/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 22.10.2019
 */
export class TangoId {
    constructor({host, port, domain, family, device, name} = {}) {
        this.host = host;
        this.port = port;
        this.domain = domain;
        this.family = family;
        this.device = device;
        this.name = name;
    }


    /**
     *
     * @param {string} [host='localhost'] host
     * @return {TangoId}
     */
    setHost(host='localhost'){
        this.host = host;
        return this;
    }

    /**
     *
     * @param {string|int} [port=10000] port
     * @return {TangoId}
     */
    setPort(port=10000){
        this.port = port;
        return this;
    }

    /**
     * Returns TangoHost id i.e. tango_host:tango_port
     *
     * @return {string}
     */
    getTangoHostId(){
        return `${this.host}:${this.port}`;
    }

    /**
     *
     * @param {string} domain
     * @return {TangoId}
     */
    setDomain(domain){
        this.domain = domain;
        return this;
    }

    /**
     *
     * @param {string} family
     * @return {TangoId}
     */
    setFamily(family){
        this.family = family;
        return this;
    }

    /**
     *
     * @param {string} device
     * @return {TangoId}
     */
    setDevice(device){
        this.device = device;
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
        return `${this.domain}/${this.family}/${this.device}`
    }

    /**
     *
     * @param {string} name
     * @return {TangoId}
     */
    setName(name){
        this.name = name;
        return this;
    }

    /**
     * e.g. localhost:10000/sys/tg_test/1/state
     *
     * @return {string}
     */
    getTangoMemberId(){
        return `${this.getTangoHostId()}/${this.getTangoDeviceName()}/${this.name}`
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
        const name = memberId.split(kTangoIdSeparator).pop();

        return this.fromDeviceId(memberId)
                        .setName(name)
    }
}

class TangoEntity {
    /**
     *
     * @param {TangoId} id
     */
    constructor(id) {
        this.id = id
    }

    get host(){
        return this.id.host;
    }

    get port(){
        return this.id.port;
    }

    get device(){
        return this.id.getTangoDeviceName();
    }

    get name(){
        return this.id.name;
    }
}

/**
 * @class [TangoDevice]
 * @memberof tango
 */
export class TangoDevice extends TangoEntity{
    /**
     *
     * @param {TangoRestApi} rest
     * @param {TangoId} id
     * @param {string} alias
     * @constructor
     */
    constructor({rest, id, alias= undefined}) {
        super(id);
        this.rest = rest;
        this.alias = alias;
    }

    get name(){
        return this.id.getTangoDeviceName();
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
        return new TangoCommand({rest: this.rest, id: this.id.setName(name)});
    }

    /**
     *
     * @param name
     * @return {TangoAttribute}
     */
    newAttribute(name){
        return new TangoAttribute({rest: this.rest, id: this.id.setName(name)});
    }

    /**
     *
     * @param name
     * @return {TangoPipe}
     */
    newPipe(name){
        return new TangoPipe({rest: this.rest, id: this.id.setName(name)});
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

    attributes(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.name)
            .attributes()
            .get();
    }

    commands(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.name)
            .commands()
            .get();
    }

    pipes(){
        return this.rest.toTangoRestApiRequest()
            .hosts(this.host, this.port)
            .devices(this.name)
            .pipes()
            .get();
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
        return this.rest.toTangoRestApiRequest().hosts(this.host, this.port).devices(this.name);
    }
}

/**
 * @memberOf tango
 * @class [TangoPipe]
 */
export class TangoPipe extends TangoEntity {
    /**
     *
     * @param {TangoRestApi} rest
     * @param {TangoId} id
     */
    constructor({rest, id} = {}) {
        super(id);
        this.rest = rest;
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
        return new TangoDevice({...this});
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
export class TangoCommand extends TangoEntity {
    /**
     *
     * @param {TangoRestApi} rest
     * @param {TangoId} id
     */
    constructor({rest, id}) {
        super(id)
        this.rest = rest;
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
        return new TangoDevice({...this});
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
export class TangoAttribute extends TangoEntity {
    /**
     *
     * @constructor
     * @param {TangoRestApi} rest
     * @param {TangoId} id
     */
    constructor({rest, id}) {
        super(id);
        this.rest = rest;
    }

    tangoHost(){
        return new TangoHost({...this});
    }

    tangoDevice(){
        return new TangoDevice({...this});
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
            .hosts(this.host, this.port)
            .devices(this.device)
            .attributes(this.name)
    }
}

/**
 *
 * @memberOf tango
 * @class [TangoHost]
 */
export class TangoHost extends TangoEntity {
    /**
     *
     * @param {TangoRestApi} rest
     * @param {TangoId} id
     */
    constructor({rest, id}) {
        super(id);
        this.rest = rest;
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
                map(resp => new TangoDevice({rest: this.rest, id: TangoId.fromDeviceId(`${this.id.getTangoHostId()}/${name}`), alias:resp.alias}))
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
                map(resp => new TangoDatabase({rest: this.rest, id: TangoId.fromDeviceId(`${this.id.getTangoHostId()}/${resp.name}`)}))
            );
    }

    /**
     *
     * @param {string} wildcard
     * @returns {Promise<[{name, href}]>}
     *
     */
    devices(wildcard) {
        return this.toTangoRestApiRequest()
            .devices()
            .get(`?wildcard=${wildcard}`)
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
    constructor({rest, id}){
        super({rest, id, alias: `${id.tango_host}:${id.tango_port}`})
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
     * @return {Observable<*>}
     */
    addDevice(svalue) {
        return this.newCommand("DbAddDevice").execute(svalue);
    }
    /**
     *
     * @param wildcard
     * @return {Observable<*>}
     */
    deviceDomainList(wildcard = "*") {
        return this.newCommand("DbGetDeviceDomainList").execute(wildcard);
    }
    /**
     *
     * @param wildcard
     * @return {Observable<*>}
     */
    deviceFamilyList(wildcard = "*/*") {
        return this.newCommand("DbGetDeviceFamilyList").execute(wildcard);
    }
    /**
     *
     * @param wildcard
     * @return {Observable<*>}
     */
    deviceMemberList(wildcard = "*/*/*") {
        return this.newCommand("DbGetDeviceMemberList").execute(wildcard);
    }
    /**
     *
     * @param {[]} args
     * @returns {Observable<*>}
     */
    deviceProperty(args) {
        return this.newCommand("DbGetDeviceProperty").execute(args);
    }
    /**
     *
     * @param {string} device
     * @return {Observable<*>}
     */
    deleteDevice(device) {
        return this.newCommand("DbDeleteDevice").execute(device);
    }
    /**
     *
     * @param {string} device
     * @param {string} alias
     * @returns {Observable<*>}
     */
    putDeviceAlias(device, alias){
        return this.newCommand("DbPutDeviceAlias").execute([device, alias]);
    }
    /**
     *
     * @param {string} alias
     * @returns {Observable<*>}
     */
    deleteDeviceAlias(alias){
        return this.newCommand("DbDeleteDeviceAlias").execute(alias);
    }
}

export class TangoAdminDevice extends TangoDevice {
    constructor({rest, id}) {
        super({rest, id, alias: id.getTangoDeviceName()});
    }

    /**
     * @param longStringValue
     * @returns {Observable<*>}
     */
    addObjPolling(longStringValue) {
        return this.newCommand('AddObjPolling').execute(longStringValue);
    }
    /**
     * @param longStringValue
     * @returns {Observable<*>}
     */
    updObjPollingPeriod(longStringValue) {
        return this.newCommand('UpdObjPollingPeriod').execute(longStringValue);
    }
    /**
     * @param args
     * @returns {Observable<*>}
     */
    remObjPolling(args) {
        return this.newCommand('RemObjPolling').execute(args);
    }
    /**
     *
     * @param {string} device_name
     * @param {{polling_type:string, name:string,polled:boolean}} pollable
     * @param {boolean} polled - new polling state
     * @param {int} poll_rate - new poll rate
     * @return {polled:boolean, poll_rate:int} pollable
     */
    updatePolling(device_name, pollable, polled, poll_rate = 0){
        if (polled)
            if (!pollable.polled)
                return this.addObjPolling({
                    lvalue: [poll_rate],
                    svalue: [device_name, pollable.polling_type, pollable.name]
                });
            else
                return this.updObjPollingPeriod({
                    lvalue: [poll_rate],
                    svalue: [device_name, pollable.polling_type, pollable.name]
                });
        else if (pollable.polled)
            return this.remObjPolling([device_name, pollable.polling_type, pollable.name]);
    }
    /**
     * @param {} args
     * @returns {Observable<*>}
     */
    getLoggingLevel(args) {
        return this.newCommand("GetLoggingLevel").execute(args);
    }
    /**
     * @param {string} arg - device name
     * @returns {Observable<*>}
     */
    getLoggingTarget(arg) {
        return this.newCommand("GetLoggingTarget").execute(arg);
    }
    /**
     * @param device
     * @returns {Observable<*>}
     */
    devPollStatus(device) {
        return this.newCommand('DevPollStatus').execute(device);
    }
}
