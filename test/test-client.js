/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 27.11.2019
 */
import {TangoAttribute, TangoDevice, TangoHost, TangoRestApiRequest, TangoRestApi} from "../dist/index.esm.js";
import {EventBus} from "@waltz-controls/eventbus";
import {RxTangoAttribute, Subscription} from "../dist/index.esm";
import {take, tap, finalize} from 'rxjs/operators';

const tango_rest_api_url = "http://localhost:10001/tango/rest/v10";

describe('TangoRestApiRequest', function() {
    describe('#get()', function() {
        it('should get without error', function(done) {
            const req = new TangoRestApiRequest(tango_rest_api_url, {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            }, fetch);
            req.get()
                .then((resp)=> {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err)
                });
        });

        it('should receive an error', function(done) {
            const req = new TangoRestApiRequest(`${tango_rest_api_url}/hosts`, {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            }, fetch);
            req.get()
                .then((resp)=> {
                    console.log(resp);
                })
                .catch(err => {
                    console.error(err);
                    done();
                });
        });

        it('should get Tango host without error', function(done) {
            const req = new TangoRestApiRequest(`${tango_rest_api_url}/hosts/localhost`, {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            }, fetch);
            req.get()
                .then((resp)=> {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);
                });
        });

        it('should get Tango device without error', function(done) {
            const req = new TangoRestApiRequest(`${tango_rest_api_url}/hosts/localhost/devices/sys/tg_test/1`, {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            }, fetch);
            req.get()
                .then((resp)=> {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);
                });
        });

        it('should get sys/tg_test/1/double_scalar without error', function(done) {
            const req = new TangoRestApiRequest(`${tango_rest_api_url}`, {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            }, fetch);
            req.hosts('localhost')
                .devices('sys/tg_test/1')
                .attributes('double_scalar')
                .value()
                .get()
                .then((resp) => {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);
                });
        });

        it('should get sys/tg_test/1/double_scalar without error', function (done) {
            const req = new TangoRestApiRequest(`${tango_rest_api_url}`, {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            }, fetch);
            req.hosts('localhost', 10000)
                .devices('sys/tg_test/1')
                .attributes('double_scalar')
                .value()
                .get()
                .then((resp) => {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);
                });
        });

        it('should fail - unknown tango port', function (done) {
            const req = new TangoRestApiRequest(`${tango_rest_api_url}`, {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            },fetch);
            req.hosts('localhost', 12345)
                .devices('sys/tg_test/1')
                .attributes('double_scalar')
                .value()
                .get()
                .then((resp) => {
                    console.log(resp);
                })
                .catch(err => {
                    console.error(err);
                    done();
                });
        });

        it('should get localhost:10000 without error', function (done) {
            const req = new TangoRestApi('http://localhost:10001', {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            }, fetch);

            req.newTangoHost({host:'localhost', port:10000})
                .info()
                .then((resp) => {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);

                });
        });

        it('should get localhost:10000/sys/tg_test/1 without error', function (done) {
            const req = new TangoRestApi('http://localhost:10001', {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            }, fetch);

            req.newTangoDevice({host:'localhost', port: 10000, device: 'sys/tg_test/1'})
                .info()
                .then((resp) => {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);

                });
        });

        it('should get devices without error', function (done) {
            const req = new TangoRestApi('http://localhost:10001', {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            }, fetch);

            req.toTangoRestApiRequest()
                .hosts('localhost')
                .devices()
                .get("?wildcard=development/*/*&wildcard=test/*/*")
                .then((resp) => {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);

                });
        });

        it('should get sys/tg_test/1/double_scalar without error', function (done) {
            const req = new TangoRestApi('http://localhost:10001', {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic '+btoa('tango-cs:tango')
                })
            }, fetch);

            req.newTangoAttribute({host:'localhost', port:10000, device:'sys/tg_test/1', name:'double_scalar'})
                .read()
                .then((resp) => {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);

                });
        });
    });

    describe('#database', function(){
        it("get database", function(done){
            const req = new TangoRestApi('http://localhost:10001', {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                })
            }, fetch);

            req.newTangoHost({host:'localhost', port: 10000})
                .database()
                .then(resp => {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);
                })
        })
    });

    describe('#put()', function () {
        it("put 42 into localhost:10000/sys/tg_test/1/double_scalar_w", function (done) {
            const req = new TangoRestApiRequest(tango_rest_api_url, {
                mode: 'cors',
                headers: new Headers({
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                })
            }, fetch);
            req.hosts('localhost')
                .devices('sys/tg_test/1')
                .attributes('double_scalar_w')
                .value()
                .put('?v=42')
                .then((resp) => {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);
                });
        })
    });

    describe('#rxtango',function(){
        it('test RxTangoAttribute',function(done){
            const rest = new TangoRestApi('http://localhost:10001',{
                mode:'cors',
                headers: new Headers({
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                })
            });


            const attribute = rest.newTangoAttribute({host:'localhost',port:10000,device:'sys/tg_test/1',name:'double_scalar'});

            const eventbus = new EventBus();

            const subscription = new Subscription('http://localhost:10001');

            const rxTangoAttribute = new RxTangoAttribute({attribute,eventbus,subscription});



            rxTangoAttribute.observe()
                .pipe(take(5), finalize(() => done()))
                .subscribe(event => console.log(event));

            rxTangoAttribute.read();
            rxTangoAttribute.read();
            rxTangoAttribute.read();
            rxTangoAttribute.read();
            rxTangoAttribute.read();
            rxTangoAttribute.read();
            rxTangoAttribute.read();

        });

        it('test RxTangoAttribute write/event',function(done){
            const rest = new TangoRestApi('http://localhost:10001',{
                mode:'cors',
                headers: new Headers({
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                })
            });


            const attribute = rest.newTangoAttribute({host:'localhost',port:10000,device:'sys/tg_test/1',name:'double_scalar_w'});

            const eventbus = new EventBus();

            const subscription = new Subscription('http://localhost:10001');

            const rxTangoAttribute = new RxTangoAttribute({attribute,eventbus,subscription});

            subscription.connect()
                .then(subscription => subscription.open())
                .then(() => rxTangoAttribute.subscribe('change'));


            rxTangoAttribute.observe()
                .pipe(take(2), finalize(() => done()))
                .subscribe(event => console.log(event));

            attribute.write(200);
            attribute.write(300);

        })
    })
});
