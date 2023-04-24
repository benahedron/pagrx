import {assert} from 'chai';
import {defaultOptions, PagRX} from '../src/index';
import {Fixture_user, userCallback} from "./fixture_user";


describe('PagRX Cache Tests', () => {

    it('It should remove first page, not accessed for a while.', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback, {...defaultOptions, ...{pagesLRUThreshold: 10}});
        pagrx.get(0).then((res) => {
            const promises: Promise<Fixture_user>[] = [];
            for (let i = 0; i < 8; ++i) {
                promises.push(pagrx.get(defaultOptions.pageSize + i));
            }
            Promise.all(promises).then((allitems) => {
                assert.equal((pagrx as any).islands[0].pages.length, 2); // 9 access, nothing removed yet

                pagrx.get(defaultOptions.pageSize).then((user) => { // 10th access. Will remove 1st page
                    // the first page was acceeded mor than 10 "gets" ago. it should have been dropped.
                    assert.equal((pagrx as any).islands[0].pages.length, 1);
                    assert.equal((pagrx as any).islands[0].pageIndexOffset, 1); // Page offset must have been increased!
                    done();
                });
            })
        });
    });

    it('It should remove first page, not acceeded for a while, version 2.', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback, {...defaultOptions, ...{pagesLRUThreshold: 10}});
        let itemPromises = [
            pagrx.getRange(0, 5), // 5 x access to page 0
            pagrx.getRange(defaultOptions.pageSize, defaultOptions.pageSize+5), // 5 x access to page 1
            pagrx.getRange(defaultOptions.pageSize * 2, defaultOptions.pageSize*2+5), // 5 x access to page 2 // page 0 is removed here
            pagrx.getRange(defaultOptions.pageSize, defaultOptions.pageSize+5)// 5 x access to page 1
        ]

        Promise.all(itemPromises).then(items => {
            assert.equal((pagrx as any).islands[0].pages.length, 2);
            itemPromises = [pagrx.getRange(defaultOptions.pageSize * 2, defaultOptions.pageSize * 2+5), // 5 access to page 2
                pagrx.getRange(defaultOptions.pageSize, defaultOptions.pageSize+5)] // 5 access to page 1
            Promise.all(itemPromises).then(items => {
                assert.equal((pagrx as any).islands[0].pages.length, 2);
                assert.equal((pagrx as any).islands[0].pageIndexOffset, 1);
                done();
            })
        })
    });

    it('It should remove the last page, not acceeded for a while.', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback, {...defaultOptions, ...{pagesLRUThreshold: 10}});
        pagrx.get(defaultOptions.pageSize).then((user) => {
            const promises: Promise<Fixture_user>[] = [];
            for (let i = 0; i < 8; ++i) {
                promises.push(pagrx.get(i));
            }

            Promise.all(promises).then((allitems) => {
                assert.equal((pagrx as any).islands[0].pages.length, 2);
                pagrx.get(0).then((allitems) => {
                    // the last page was acceeded more than 10 "gets" ago. it should have been dropped.
                    assert.equal((pagrx as any).islands[0].pages.length, 1);
                    assert.equal((pagrx as any).islands[0].pageIndexOffset, 0);
                    done();
                });
            })
        });
    });

    it('It should remove first and last page, if they were not acceeded for a while.', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback, {...defaultOptions, ...{pagesLRUThreshold: 10}});
        // Will create 3 pages
        const initialRequets = [
            pagrx.get(defaultOptions.pageSize * 0),
            pagrx.get(defaultOptions.pageSize * 1),
            pagrx.get(defaultOptions.pageSize * 2),
        ];
        Promise.all(initialRequets).then((res) => {

            // Further access some of the middel page
            const promises: Promise<Fixture_user>[] = [];
            for (let i = 0; i < 10; ++i) {
                promises.push(pagrx.get(defaultOptions.pageSize * 1 + i));
            }

            Promise.all(promises).then((allitems) => {
                // the last page was acceeded more than 10 "gets" ago. it should have been dropped.
                assert.equal((pagrx as any).islands[0].pages.length, 1);
                assert.equal((pagrx as any).islands[0].pageIndexOffset, 1);
                done();

            })
        });
    });


    it('It should remove empty islands.', (done) => {
        const pagrx = new PagRX<Fixture_user>(userCallback, {...defaultOptions, ...{pagesLRUThreshold: 10}});
        // Will create 3 pages
        const initialRequets = [
            pagrx.get(defaultOptions.pageSize * 0),
            pagrx.get(defaultOptions.pageSize * 2),
            pagrx.get(defaultOptions.pageSize * 4),
        ];
        Promise.all(initialRequets).then((res) => {

            assert.equal((pagrx as any).islands.length, 3);

            // Further access some of the middel page
            const promises: Promise<Fixture_user>[] = [];
            for (let i = 0; i < 5; ++i) {
                promises.push(pagrx.get(defaultOptions.pageSize * 0 + i));
                promises.push(pagrx.get(defaultOptions.pageSize * 4 + i));
            }

            Promise.all(promises).then((allitems) => {
                // the last page of the middle island was acceeded more than 10 "gets" ago. it should have been dropped.
                assert.equal((pagrx as any).islands.length, 2);
                assert.equal((pagrx as any).islands[0].pageIndexOffset, 0);
                assert.equal((pagrx as any).islands[1].pageIndexOffset, 4);
                done();

            })
        });
    });
});