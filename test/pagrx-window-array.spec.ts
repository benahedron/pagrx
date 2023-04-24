import {PagRX, PagRXSlidingWindow} from '../src/index';
import {assert} from "chai";
import * as sinon from "sinon";
import {userCallback} from "./fixture_user";
import {array_window_callback} from "../src/utils";

class User {
    constructor(public name: string, public index: number) {
    }

    print() {
        console.log(` - ${this.name} (${this.index})`);
    }
}

const pagrx = new PagRX<User>(userCallback);
const chunkCallback = array_window_callback<User>(pagrx, 3);
describe('PagRX Array Window Tests', () => {

    it('It should load the expected pages when using a simple window.', (done) => {
        const window = new PagRXSlidingWindow<User[]>(chunkCallback);
        window.jumpTo(0);
        window.getRelativeRange(0, 1).then((usersArrays: User[][]) => {

            assert.equal(usersArrays.length, 2);
            assert.equal(usersArrays[0].length, 3);
            assert.equal(usersArrays[1].length, 3);
            assert.equal(usersArrays[0][0].index, 0);
            assert.equal(usersArrays[1][2].index, 5);
            done();
        })
    });

    it('It should handle single window load as expected.', (done) => {
        const window = new PagRXSlidingWindow<User[]>(chunkCallback);
        window.jumpTo(50); // 50 time 3!
        window.getRelativeRange(0, 0).then((usersArrays: User[][]) => {
            assert.equal(usersArrays.length, 1);
            assert.equal(usersArrays[0].length, 3);
            assert.equal(usersArrays[0][0].index, 150);
            done();
        })
    });

    it('It should handle jump of the window as expected.', (done) => {
        const window = new PagRXSlidingWindow<User[]>(chunkCallback);
        window.jumpTo(20);
        window.getRelativeRange(0, 0).then((usersArrays: User[][]) => {
            assert.equal(usersArrays.length, 1);
            assert.equal(usersArrays[0][0].index, 20 * 3);
            window.jumpTo(40);
            window.getRelativeRange(-1, 3).then((usersArrays: User[][]) => {
                assert.equal(usersArrays.length, 5);
                assert.equal(usersArrays[0][0].index, (40 - 1) * 3);
                assert.equal(usersArrays[4][2].index, (40 + 3) * 3 + 2);
                done();
            });
        })
    });

    it('It should reuse existing chunks.', (done) => {
        const chunkCallback_spy = sinon.spy(chunkCallback);
        const window = new PagRXSlidingWindow<User>(chunkCallback_spy);
        window.jumpTo(20);
        window.getRelativeRange(0, 0).then((usersArrays: User[][]) => {
            assert.equal(usersArrays.length, 1);
            assert(chunkCallback_spy.calledOnce);
            window.getRelativeRange(-1, 0).then((usersArrays: User[][]) => {
                assert.equal(usersArrays.length, 2);
                assert.equal(usersArrays[0][0].index, (20 - 1) * 3);
                assert(chunkCallback_spy.calledTwice); // 0 should be kept in the window...
                done();
            });
        })
    });

});
