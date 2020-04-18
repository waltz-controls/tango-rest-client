/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 27.11.2019
 */
import {TangoAttribute, TangoDevice, TangoHost, TangoRestApi, TangoRestApiRequest} from "../src/rest";
import {retry, take, tap} from 'rxjs/operators';
import {EventStream, Subscription, Subscriptions} from "../src/subscriptions";
import {merge} from "rxjs";

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
            req.get().toPromise()
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
            req.get().toPromise()
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
            req.get().toPromise()
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
            req.get().toPromise()
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
                .toPromise()
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
                .toPromise()
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
                .toPromise()
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
                .toPromise()
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
                .toPromise()
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
                .toPromise()
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
                .toPromise()
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
                .toPromise()
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
                headers: {
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                }
            }, fetch);
            req.hosts('localhost')
                .devices('sys/tg_test/1')
                .attributes('double_scalar_w')
                .value()
                .put('?v=42')
                .toPromise()
                .then((resp) => {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);
                });
        })
    });

    describe('#subscriptions',function(){
        it('test RxTangoAttribute. See console...',function(){
            const rest = new TangoRestApi('http://localhost:10001',{
                mode:'cors',
                headers: {
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                }
            });


            const subscriptions = new Subscriptions('http://localhost:10001',{
                mode:'cors',
                headers: {
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                }
            });

            subscriptions.observe({host:'localhost:10000',device:'sys/tg_test/1',attribute:'ampli',type:'change'})
                .pipe(
                    take(100),
                    tap(msg => console.log(msg))
                ).subscribe(() => console.log('Done! See console output...'));


            setTimeout(() => {
                merge(
                    subscriptions.observe({host:'localhost:10000',device:'sys/tg_test/1',attribute:'double_scalar_w',type:'change'}),

                    subscriptions.observe({host:'localhost:10000',device:'sys/tg_test/1',attribute:'state',type:'change'} ),
                    subscriptions.observe({host:'localhost:10000',device:'sys/tg_test/1',attribute:'status',type:'change'} )
                ).pipe(
                    take(100),
                    tap(msg => console.log(msg))
                ).subscribe(() => console.log('Done! See console output...'));


            }, 5000)

            // setTimeout(() => {
            //     subcription.unsubscribe()
            // }, 10000)
            // subscriptions.connect('http://localhost:10001');
        });

        it('#subscribe TangoAttribute. See console...',function(){
            const rest = new TangoRestApi('http://localhost:10001',{
                mode:'cors',
                headers: {
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                }
            });


            const subscriptions = new Subscriptions('http://localhost:10001',{
                mode:'cors',
                headers: {
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                }
            });

            rest.newTangoAttribute({host:'xxx',device:'sys/tg_test/2',name:'state'})
                .eventStream(subscriptions).pipe(
                take(100),
                tap(msg => console.log(msg))
            ).subscribe({error: err => console.log('Errored!!!', err)})

            rest.newTangoAttribute({host:'localhost',device:'sys/tg_test/2',name:'state'})
                .eventStream(subscriptions).pipe(
                    take(100),
                    tap(msg => console.log(msg))
                ).subscribe(() => console.log('Done! See console output...'))



            // setTimeout(() => {
            //     subcription.unsubscribe()
            // }, 10000)
            // subscriptions.connect('http://localhost:10001');
        });
    })

    describe('#rxjs',function(){
        it('test TangoRestApiRequest',function(done){
            const req = new TangoRestApiRequest('http://localhost:10001/tango/rest/v10',{
                mode:'cors',
                headers: {
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                }
            });


            req.hosts('localhost').get().pipe(
                tap(resp => console.log(resp))
            ).subscribe(()=>done());
        });

        it('test TangoRestApiRequest fail/retry',function(done){
            const req = new TangoRestApiRequest('http://localhost:10001/tango/rest/v10',{
                mode:'cors',
                headers: {
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                }
            });


            req.hosts('xxx').get().pipe(
                retry(3)
            ).subscribe({
                error: (err) => {
                    console.error(err);
                    done()
                }
            });
        });

        it('test TangoRestApiRequest async/await', async function(){
            const rest = new TangoRestApi('http://localhost:10001',{
                mode:'cors',
                headers: {
                    'Authorization': 'Basic ' + btoa('tango-cs:tango')
                }
            });


            console.log(await rest.newTangoHost().info().toPromise());

        });

    })
});
