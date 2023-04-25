import {PagRX, PagRXSlidingWindow} from '../src/index';
import {assert} from "chai";
import * as sinon from "sinon";
import {userCallback} from "./fixture_user";
import {simple_window_callback} from "../src/utils";

class User {
    constructor(public name: string, public index: number) {
    }

    print() {
        console.log(` - ${this.name} (${this.index})`);
    }
}

const pagrx = new PagRX<User>(userCallback);
const chunkCallback = simple_window_callback<User>(pagrx);
describe('PagRX Simple Window Tests', () => {

    it('It should load the expected pages when using a simple window.', (done) => {
        const window = new PagRXSlidingWindow<User>(chunkCallback);
        window.jumpTo(0);
        window.getRelativeRange(0, 1).then((users: User[]) => {
            assert.equal(users.length, 2);
            assert.equal(users[0].index, 0);
            assert.equal(users[1].index, 1);
            done();
        })
    });

    it('It should handle single window load as expected.', (done) => {
        const window = new PagRXSlidingWindow<User>(chunkCallback);
        window.jumpTo(50);
        window.getRelativeRange(0, 0).then((users: User[]) => {
            assert.equal(users.length, 1);
            assert.equal(users[0].index, 50);
            done();
        })
    });

    it('It should handle jump of the window as expected.', (done) => {
        const window = new PagRXSlidingWindow<User>(chunkCallback);
        window.jumpTo(20);
        window.getRelativeRange(0, 0).then((users: User[]) => {
            assert.equal(users.length, 1);
            assert.equal(users[0].index, 20);
            window.jumpTo(40);
            window.getRelativeRange(-1, 3).then((users: User[]) => {
                assert.equal(users.length, 5);
                assert.equal(users[0].index, 39);
                done();
            });
        })
    });

    it('It should reuse existing chunks.', (done) => {

        const chunkCallback_spy = sinon.spy(chunkCallback);
        const window = new PagRXSlidingWindow<User>(chunkCallback_spy);
        window.jumpTo(20);
        window.getRelativeRange(0, 0).then((users: User[]) => {
            assert.equal(users.length, 1);
            assert(chunkCallback_spy.calledOnce);
            window.getRelativeRange(-1, 0).then((users: User[]) => {
                assert.equal(users.length, 2);
                assert.equal(users[0].index, 19);
                assert(chunkCallback_spy.calledTwice); // 0 should be kept in the window...
                done();
            });
        })
    });

});
