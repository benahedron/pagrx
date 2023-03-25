import {assert} from 'chai';
import {defaultOptions, PagRX} from '../src/index';
import * as sinon from "sinon";
import {delayedUserCallback, Fixture_user, userCallback} from "./fixture_user";


describe('PagRX Range Tests', () => {
    it('It should be able to access a simple range of items', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);
        pagrx.getRange(0, 2).then((res) => {
            assert.equal(res.length, 2);
            assert.equal((pagrx as any).islands[0].pages.length, 1);
            done();
        });
    });

    it('It should be able to access a range of items spaning 2 pages', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);
        pagrx.getRange(0, defaultOptions.pageSize * 2).then((res) => {
            assert.equal(res.length, defaultOptions.pageSize * 2);
            assert.equal((pagrx as any).islands.length, 1); //Has 1 island because all is consecutive.
            assert.equal((pagrx as any).islands[0].pages.length, 2); //Has 2 pages because we start at zero index
            done();
        });
    });

    it('It should be able to access a range 2 x the page size of items spaning 3 pages', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);
        pagrx.getRange(5, 5+defaultOptions.pageSize * 2).then((res) => {
            assert.equal(res.length, defaultOptions.pageSize * 2);
            assert.equal((pagrx as any).islands.length, 1); //Has 1 islang because all is consecutive.
            assert.equal((pagrx as any).islands[0].pages.length, 3); //Has 3 pages, because we did not start at 0.
            done();
        });
    });

    it('It will merge islands when accessing items via range', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);
        pagrx.get(1).then((res) => {
            pagrx.get(defaultOptions.pageSize * 2).then((res) => {
                assert.equal((pagrx as any).islands.length, 2); //Has 2 islands
                pagrx.getRange(0, defaultOptions.pageSize * 3).then((res) => {
                    assert.equal((pagrx as any).islands.length, 1); //Has 1 islands
                    done();
                });
            });
        });
    });

    it('It should call the callback exactly once for each page, even if it is slow', (done) => {
        const delayedUserCallback_spy = sinon.spy(delayedUserCallback);
        const pagrx = new PagRX<Fixture_user>(delayedUserCallback_spy);
        pagrx.getRange(0, defaultOptions.pageSize+1).then((res) => { // load page 0 & 1
            pagrx.get(0).then((resA) => { // load page 0
                pagrx.get(defaultOptions.pageSize-1).then((resA) => { // load page 0 again... should return the same promise
                    // assert.equal(res.index, 0);
                    assert(delayedUserCallback_spy.calledTwice)
                    done();
                });
            });
        });
    });

});
