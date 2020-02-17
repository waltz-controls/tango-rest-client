/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 27.11.2019
 */
import {TangoRestApiRequest} from "../src/index.js";

const tango_rest_api_url = "http://localhost:10001/tango/rest/v10";

describe('TangoRestApiRequest', function() {
    describe('#get()', function() {
        it('should get without error', function(done) {
            const req = new TangoRestApiRequest(tango_rest_api_url, {
                mode: 'cors'
            });
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
                mode: 'cors'
            });
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
                mode: 'cors'
            });
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
                mode: 'cors'
            });
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
                mode: 'cors'
            });
            req.hosts('localhost')
                .devices('sys/tg_test/1')
                .attributes('double_scalar')
                .value()
                .get()
                .then((resp)=> {
                    console.log(resp);
                    done();
                })
                .catch(err => {
                    console.error(err);
                });
        });
    });
});
