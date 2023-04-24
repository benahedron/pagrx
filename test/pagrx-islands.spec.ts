import { assert } from 'chai';
import { PagRX, PagRXError, PagRxLoadCallback, PagRXOptions, defaultOptions } from '../src/index';
import {Fixture_user, userCallback} from "./fixture_user";

describe('PagRX Island Tests', () => {
  
  it('It should create an island if we load data from non consecutive pages, if islands are enabled.', (done) => {
    const pagrx = new PagRX<Fixture_user>(userCallback);

    pagrx.get(defaultOptions.pageSize * 0).then((res) => {
      assert.equal(res.index, defaultOptions.pageSize * 0);
      pagrx.get(defaultOptions.pageSize * 20).then((res) => {
        assert.equal(res.index, defaultOptions.pageSize * 20);
        assert.equal((pagrx as any).islands.length, 2);
        assert.equal((pagrx as any).islands[0].pageIndexOffset, 0);
        assert.equal((pagrx as any).islands[1].pageIndexOffset, 20);
        done();
      });
    });
  });

  it('It should use an existing island if we load data from non consecutive pages and then a consecutive next page again, assuming islands are enabled.', (done) => {
    const pagrx = new PagRX<Fixture_user>(userCallback);

    pagrx.get(defaultOptions.pageSize * 0).then((res) => {
      assert.equal(res.index, defaultOptions.pageSize * 0);
      pagrx.get(defaultOptions.pageSize * 20).then((res) => {
        assert.equal(res.index, defaultOptions.pageSize * 20);
        pagrx.get(defaultOptions.pageSize * 21).then((res) => {
          assert.equal((pagrx as any).islands.length, 2);
          assert.equal((pagrx as any).islands[0].pageIndexOffset, 0);
          assert.equal((pagrx as any).islands[1].pageIndexOffset, 20);
          assert.equal((pagrx as any).islands[1].pages.length, 2);
          done();
        });
      });
    });
  });

  it('It should throw if we load data from non consecutive pages, if islands are not enabled.', (done) => {
    const pagrx = new PagRX<Fixture_user>(userCallback, { allowIslands: false, pageSize: 20 } as PagRXOptions);
    pagrx.get(defaultOptions.pageSize * 0).then((res) => {
      pagrx
        .get(defaultOptions.pageSize * 3)
        .then((_) => {})
        .catch((error) => {
          assert.instanceOf(error, PagRXError);
          done();
        });
    });
  });

  it('It will merge islands and their pages if a new consecutive island emerges.', (done) => {
    const pagrx = new PagRX<Fixture_user>(userCallback);
    pagrx.get(defaultOptions.pageSize * 0).then((res) => {
      // 1st page 1st island
      pagrx.get(defaultOptions.pageSize * 2).then((res) => {
        // 1st page 2ns island
        assert.equal((pagrx as any).islands.length, 2);
        pagrx.get(defaultOptions.pageSize * 1).then((res) => {
          // Merge 2 islands => will have 3 consecutive pages.
          assert.equal((pagrx as any).islands.length, 1);
          assert.equal((pagrx as any).islands[0].pages.length, 3);
          done();
        });
      });
    });
  });

  it('It will merge islands and their pages if a new consecutive island emerges in a complex case.', (done) => {
    const pagrx = new PagRX<Fixture_user>(userCallback);
    pagrx.get(defaultOptions.pageSize * 0).then((res) => {
      // 1st page 1st island
      pagrx.get(defaultOptions.pageSize * 2).then((res) => {
        // 1st page 2ns island
        assert.equal((pagrx as any).islands.length, 2);
        pagrx.get(defaultOptions.pageSize * 4).then((res) => {
          // No merge yes... 3rd island
          assert.equal((pagrx as any).islands.length, 3);
          pagrx.get(defaultOptions.pageSize * 1).then((res) => {
            // 1st merge => 2 islands
            assert.equal((pagrx as any).islands.length, 2);
            pagrx.get(defaultOptions.pageSize * 3).then((res) => {
              // No merge yes...
              assert.equal((pagrx as any).islands.length, 1);
              done();
            });
          });
        });
      });
    });
  });
});
