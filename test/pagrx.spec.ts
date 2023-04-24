import {assert} from 'chai';
import * as sinon from 'sinon';
import {defaultOptions, PagRX, PagRxLoadCallback} from '../src/index';
import {delayedUserCallback, Fixture_user, userCallback} from "./fixture_user";



describe('PagRX Basic Tests', () => {
    it('It should be able to access the first item of the first page', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);

        pagrx.get(0).then((res) => {
            assert.equal(res.index, 0);
            assert.equal((pagrx as any).islands[0].pages.length, 1);
            done();
        });
    });

    it('It should be able to access the second item of the first page', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);

        pagrx.get(1).then((res) => {
            assert.equal(res.index, 1);
            done();
        });
    });

    it('It should be able to call access the first, then the second item of the first page', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);

        pagrx.get(0).then((res) => {
            assert.equal(res.index, 0);
            pagrx.get(1).then((res) => {
                assert.equal(res.index, 1);
                done();
            });
        });
    });

    it('It should be able to access the first item of the second page', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);

        pagrx.get(defaultOptions.pageSize).then((res) => {
            assert.equal(res.index, defaultOptions.pageSize);
            assert.equal((pagrx as any).islands[0].pageIndexOffset, 1);
            done();
        });
    });

    it(
        'It should be able to call access the last item from the current page, ' + 'then the first item of the next page',
        (done) => {
            const pagrx = new PagRX<Fixture_user>(userCallback);

            pagrx.get(defaultOptions.pageSize - 1).then((res) => {
                assert.equal(res.index, defaultOptions.pageSize - 1);
                assert.equal((pagrx as any).islands[0].pageIndexOffset, 0);
                pagrx.get(defaultOptions.pageSize).then((res) => {
                    assert.equal(res.index, defaultOptions.pageSize);
                    assert.equal((pagrx as any).islands.length, 1);
                    assert.equal((pagrx as any).islands[0].pages.length, 2);
                    assert.equal((pagrx as any).islands[0].pageIndexOffset, 0);
                    done();
                });
            });
        },
    );

    it('It should be able to load the second page first and then the previous page', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);

        pagrx.get(defaultOptions.pageSize).then((res) => {
            assert.equal(res.index, defaultOptions.pageSize);
            assert.equal((pagrx as any).islands[0].pageIndexOffset, 1);

            pagrx.get(defaultOptions.pageSize - 1).then((res) => {
                assert.equal(res.index, defaultOptions.pageSize - 1);
                assert.equal((pagrx as any).islands[0].pages.length, 2);
                assert.equal((pagrx as any).islands[0].pageIndexOffset, 0);
                done();
            });
        });
    });

    it('It should be possible to access the same item multiple times when multiple pages are loaded', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback);

        pagrx.get(defaultOptions.pageSize).then((res) => {
            assert.equal(res.index, defaultOptions.pageSize);

            pagrx.get(defaultOptions.pageSize - 1).then((res) => {
                assert.equal(res.index, defaultOptions.pageSize - 1);
                pagrx.get(defaultOptions.pageSize).then((res) => {
                    assert.equal(res.index, defaultOptions.pageSize);
                    assert.equal((pagrx as any).islands[0].pages.length, 2);
                    assert.equal((pagrx as any).islands[0].pageIndexOffset, 0);
                    done();
                });
            });
        });
    });


    it('It should call the callback as expected', (done) => {
        const userCallback_spy = sinon.spy(userCallback);
        const pagrx = new PagRX<Fixture_user>(userCallback_spy);

        pagrx.get(1).then((res) => {
            pagrx.get(0).then((res) => {
                pagrx.get(0).then((res) => {
                    assert.equal(res.index, 0);
                    assert(userCallback_spy.calledOnce)
                    done();
                });
            });
        });
    });

    it('It should call the callback exactly once for each page, even if it is slow', (done) => {
        const delayedUserCallback_spy = sinon.spy(delayedUserCallback);
        const pagrx = new PagRX<Fixture_user>(delayedUserCallback_spy);

        pagrx.get(defaultOptions.pageSize).then((res) => { // load page 1
            pagrx.get(0).then((resA) => { // load page 0
                pagrx.get(defaultOptions.pageSize-1).then((resA) => { // load page 0 again... should return the same promise
                    // assert.equal(res.index, 0);
                    assert(delayedUserCallback_spy.calledTwice)
                    done();
                });
            });
        });
    });

    it('It should call the callback as expected, when accessing multiple pages at a mixed order', (done) => {
        const userCallback_spy = sinon.spy(userCallback);
        const pagrx = new PagRX<Fixture_user>(userCallback_spy);

        pagrx.get(defaultOptions.pageSize - 1).then((res) => {
            pagrx.get(defaultOptions.pageSize).then((res) => {
                pagrx.get(defaultOptions.pageSize).then((res) => {
                    pagrx.get(defaultOptions.pageSize - 2).then((res) => {
                        assert.equal(res.index, defaultOptions.pageSize - 2);
                        assert(userCallback_spy.calledTwice)
                        done();
                    });
                });
            });
        });
    });

});
