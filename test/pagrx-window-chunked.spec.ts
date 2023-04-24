import {PageRxChunkData, PagRX, PagRXChunk, PagRxChunkLoadCallback, PagRXSlidingWindow} from '../src/index';
import {assert} from "chai";
import * as sinon from "sinon";
import {userCallback} from "./fixture_user";

class User {
    constructor(public name: string, public index: number) {
    }

    print() {
        console.log(` - ${this.name} (${this.index})`);
    }
};

class Group {
    constructor(public users: User[], public index: number) {
    }

    print() {
        console.log(`Group ${this.index}`);
        this.users.forEach(u => u.print());
    }
};

const pagrx = new PagRX<User>(userCallback);
const chunkCallback: PagRxChunkLoadCallback<Group> = (
    direction: 'backward' | 'forward' | number,
    neighbour: PagRXChunk<Group>
): Promise<PageRxChunkData<Group>> => {
    return new Promise<PageRxChunkData<Group>>((chunkResolve, chunkReject) => {
        let offset = 0;
        if (direction !== 'forward' && direction !== 'backward') {
            offset = direction;
            pagrx.getRange(offset, offset + 10).then(users => {
                chunkResolve(new PageRxChunkData<Group>(new Group(users, 0), offset, offset + 10));
            });
        } else {
            neighbour.data.then(chunkData => {
                const dx = (direction === 'backward') ? -1 : 1;
                const dxp = dx * 10;
                pagrx.getRange(chunkData.bottomOffset + dxp, chunkData.bottomOffset + dxp + 10).then(users => {
                    chunkResolve(new PageRxChunkData<Group>(
                        new Group(users, chunkData.chunk.index + dx),
                        chunkData.bottomOffset + dxp, chunkData.topOffset + dxp
                    ));
                })
            });
        }
    });
};

describe('PagRX Chunked Window Tests', () => {

    it('It should load the expected pages when using a simple window.', (done) => {
        const window = new PagRXSlidingWindow<User, Group>(chunkCallback);
        window.jumpTo(0);
        window.getRelativeRange(0, 1).then((groups: Group[]) => {
            assert.equal(groups.length, 2);
            assert.equal(groups[0].index, 0);
            assert.equal(groups[1].index, 1);
            assert.equal(groups[0].users.length, 10);
            assert.equal(groups[1].users.length, 10);
            assert.equal(groups[1].users[9].index, 19);
            done();
        })
    });

    it('It should handle single window load as expected.', (done) => {
        const window = new PagRXSlidingWindow<User, Group>(chunkCallback);
        window.jumpTo(50);
        window.getRelativeRange(0, 0).then((groups: Group[]) => {
            assert.equal(groups.length, 1);
            assert.equal(groups[0].index, 0);
            assert.equal(groups[0].users.length, 10);
            assert.equal(groups[0].users[0].index, 50);
            assert.equal(groups[0].users[9].index, 59);
            done();
        })
    });

    it('It should handle jump of the window as expected.', (done) => {
        const window = new PagRXSlidingWindow<User, Group>(chunkCallback);
        window.jumpTo(20);
        window.getRelativeRange(0, 0).then((groups: Group[]) => {
            assert.equal(groups.length, 1);
            assert.equal(groups[0].index, 0);
            assert.equal(groups[0].users.length, 10);
            assert.equal(groups[0].users[9].index, 29);
            window.jumpTo(40);
            window.getRelativeRange(-1, 3).then((groups: Group[]) => {
                assert.equal(groups.length, 5);
                assert.equal(groups[0].users[0].index, 30);
                assert.equal(groups[1].users[5].index, 45);
                assert.equal(groups[4].users[9].index, 79);
                done();
            });
        })
    });


    it('It should reuse existing chunks.', (done) => {

        const chunkCallback_spy = sinon.spy(chunkCallback);
        const window = new PagRXSlidingWindow<User, Group>(chunkCallback_spy);
        window.jumpTo(20);
        window.getRelativeRange(0, 0).then((groups: Group[]) => {
            assert.equal(groups.length, 1);
            assert(chunkCallback_spy.calledOnce);
            window.getRelativeRange(-1, 0).then((groups: Group[]) => {
                assert.equal(groups.length, 2);
                assert(chunkCallback_spy.calledTwice); // 0 should be kept in the window...
                done();
            });
        })
    });

});
