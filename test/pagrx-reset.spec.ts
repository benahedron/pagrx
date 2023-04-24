import {assert} from 'chai';
import * as sinon from 'sinon';
import {PagRX} from '../src/index';
import {Fixture_user, userCallback} from "./fixture_user";


describe('PagRX Resets Tests', () => {
    it('It should be able to delete the islands.', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);
        pagrx.get(0).then((res) => {
            assert.equal(res.index, 0);
            assert.equal((pagrx as any).islands.length, 1);
            pagrx.reset();
            assert.equal((pagrx as any).islands.length, 0);
            done();
        });
    });

    it('It should re-call the callback with the right page after a reset.', (done) => {
        const userCallback_spy = sinon.spy(userCallback);
        const pagrx = new PagRX<Fixture_user>(userCallback_spy as any);
        pagrx.get(0).then((res) => {
            assert(userCallback_spy.calledOnce);
            pagrx.reset();
            pagrx.get(0).then((res) => {
                assert(userCallback_spy.calledTwice);
                assert.equal((pagrx as any).islands.length, 1);
                pagrx.get(0).then((res) => {
                    assert(userCallback_spy.calledTwice);
                    done();
                });
            });
        });
    });
});
