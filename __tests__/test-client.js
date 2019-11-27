/**
 *
 * @author Igor Khokhriakov <igor.khokhriakov@hzg.de>
 * @since 27.11.2019
 */
import {TangoRestApiRequest} from "../dist/index";

const tango_rest_api_url = process.env['TANGO_REST_API_URL'];

describe('TangoRestApiRequest', function() {
    describe('#get()', function() {
        it('should save without error', function(done) {
            const req = new TangoRestApiRequest(tango_rest_api_url);
            req.get().then((resp)=> {
                console.log(resp);
                done();
            });
        });
    });
});
