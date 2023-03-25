/**
 * PagRX is a reactive sliding-window based paginated cache utility library that enables versatile use.
 */

export interface PagRXOptions {
    /**
     * Amount of items to load per page.
     */
    pageSize: number;

    /**
     * The number of pages allows in a PagRX instance. After this,
     * the pages will be dropped automatically based on a LRU policy.
     */
    pagesLRUThreshold: number;

    /**
     * Allowing islands of pages for non consecutive access.
     * Disable this if you are sure that your data is always in the right order
     * (default: enabled).
     */
    allowIslands: boolean;
}

export const defaultOptions: PagRXOptions = {
    pageSize: 20,

    pagesLRUThreshold: 1000,

    allowIslands: true,
};

export class PagRXError extends Error {
}

export type PagRxLoadCallback<Type> = (
    pageIndex: number,
    pageSize: number,
    pageResolve: (value: Type[] | PromiseLike<Type[]>) => void,
) => void;

class PagRXPage<Type> {
    constructor(public items: Promise<Type[]>, public lruCounter: number) {
    }
};

class PagRXIsland<Type> {
    private pageIndexOffset: number = 0;
    private pages: PagRXPage<Type>[] = [];

    constructor(pageIndexOffset: number, private loadPage: PagRxLoadCallback<Type>, private options: PagRXOptions) {
        this.pageIndexOffset = pageIndexOffset;
    }

    /**
     * The page indices available for this island.
     * @returns the page indices.
     */
    public getPageRange(): [number, number] {
        return [this.pageIndexOffset, this.pageIndexOffset + this.pages.length - 1];
    }

    /**
     * Access a precise page. If not prohibited, create a new page whenever it is missing (for consecutive pages).
     * @param pageIndex
     * @param createMissing
     * @returns a promise for the page items.
     */
    public getPage(pageIndex: number, lruCounter: number, createMissing: boolean = true): PagRXPage<Type> {
        const localPageIndex = pageIndex - this.pageIndexOffset;
        if (localPageIndex >= 0 && localPageIndex < this.pages.length) {
            // Update LRU access counter
            this.pages[localPageIndex].lruCounter = lruCounter;
            return this.pages[localPageIndex];
        } else if (!createMissing) {
            throw new Error(
                `Out of bounds page access at index: ${pageIndex} (local: ${localPageIndex}). Current top is: ${this.pageIndexOffset}`,
            );
        }

        // Create a new page or raise if not a neighbouring page.
        if (
            localPageIndex == this.pages.length || // next page
            localPageIndex == -1 || // previous page
            this.pages.length == 0 // first resp. initial page.
        ) {
            // create new page (is next)
            const page = new PagRXPage<Type>(new Promise<Type[]>((resolve, reject) => {
                const innerPromise = new Promise<Type[]>((innerResolve, innerReject) => {
                    this.loadPage(pageIndex, this.options.pageSize, innerResolve);
                });
                innerPromise.then((items: Type[]) => {
                    resolve(items);
                });
            }), lruCounter);

            if (localPageIndex <= 0 || this.pages.length == 0) {
                // Set the top page index in order to assert that it is correct.
                this.pageIndexOffset = pageIndex;
                this.pages.unshift(page);
            } else {
                this.pages.push(page);
            }

            return page;
        }
        throw new Error('Accessing page that is not a neighbouring page.');
    }

    /**
     * Verify if a page contains the given index. (or if it is a neighbouring page)
     * @param pageIndex
     * @param orTouchesPage
     * @returns
     */
    public containsPage(pageIndex: number, orTouchesPage: boolean): boolean {
        if (orTouchesPage) {
            if (pageIndex === this.pageIndexOffset - 1 || pageIndex == this.pages.length + this.pageIndexOffset) {
                return true;
            }
        }
        return (
            pageIndex === this.pageIndexOffset ||
            (pageIndex >= this.pageIndexOffset && pageIndex < this.pages.length + this.pageIndexOffset)
        );
    }

    /**
     *
     * @param island Append the pages of the given island to this island. The pages must be consecutive.
     */
    public append(island: PagRXIsland<Type>) {
        if (this.pageIndexOffset + this.pages.length != island.pageIndexOffset) {
            throw new PagRXError('You can only append the neighbouring island to this island!');
        }
        this.pages = this.pages.concat(island.pages);
    }

    /**
     * Make sure the lruCounter can handel wrapping.
     * This could be more precise.
     * @param lruCounter
     */
    private resetLRU(lruCounter: number) {
        for (const page of this.pages) {
            page.lruCounter = lruCounter;
        }
    }

    /**
     * Based on LRU counter, check if there is either a top or bottom page to be removed.
     * @param lruCounter the current LRU access counter.
     * @param index page index to analyse (must be 0 or last page of island; will raise otherwise)
     */
    private handlePageRemoval(lruCounter: number, index: number) {
        const pageLruCounter = this.pages[index].lruCounter
        if (pageLruCounter <= lruCounter - this.options.pagesLRUThreshold) {
            if (index === 0) {
                this.pages.shift();
                this.pageIndexOffset++;
            } else if (index === this.pages.length - 1) {
                this.pages.pop();
            } else {
                throw new PagRXError('Can only handle page removal for last or first page of an island!');
            }
        }
    }

    /**
     * Handle LRU counter update.
     * Remove least recently used pages, based on an LRU counter.
     * Skip & reset counters if there is a counter wrap.
     * @param lruCounter
     * @returns true is the island is empty, and it should be removed.
     */
    public updateLRU(lruCounter: number): boolean {
        if (lruCounter < 0) {    // Handle wrap around, reset all LRU counters
            this.resetLRU(lruCounter);
        } else {
            if (this.pages.length >= 1) {
                this.handlePageRemoval(lruCounter, 0);
                if (this.pages.length > 1) {
                    this.handlePageRemoval(lruCounter, this.pages.length - 1);
                }
            }
        }
        return this.pages.length == 0;
    }
}

export class PagRX<Type> {
    /**
     * Islands contains consecutive pages.
     */
    private islands: PagRXIsland<Type>[] = [];

    /** Counter, tracking LRU access */
    private lruCounter = 0;

    constructor(private loadPage: PagRxLoadCallback<Type>, private options: PagRXOptions = defaultOptions) {
    }

    get(itemIndex: number): Promise<Type> {
        const result = new Promise<Type>((resolve, reject) => {
            try {
                const [island, pageIndex, localItemIndex] = this.itemToLocation(itemIndex);
                const page = island.getPage(pageIndex, this.lruCounter++);
                this.updateLRU();
                this.optimzeIslands(island);
                page.items.then((items: Type[]) => {
                    if (items.length == 0) {
                        return;
                    }
                    const item = items[localItemIndex];
                    resolve(item);
                });
            } catch (error) {
                reject(error);
            }
        });
        return result;
    }

    getRange(startItemIndex: number, endItemIndex: number): Promise<Type[]> {
        const items = [];
        if (endItemIndex < startItemIndex){
            throw new Error('The start item index must be smaller or equal to the end item index')
        }
        for (let itemIndex = startItemIndex; itemIndex < endItemIndex; ++itemIndex) {
            items.push(this.get(itemIndex));
        }

        return Promise.all(items);
    }

    private itemToLocation(itemIndex: number): [PagRXIsland<Type>, number, number] {
        const pageIndex = Math.floor(itemIndex / this.options.pageSize);
        const localItemIndex = itemIndex - pageIndex * this.options.pageSize;
        const island = this.getIsland(pageIndex);
        return [island, pageIndex, localItemIndex];
    }

    private getIsland(pageIndex: number): PagRXIsland<Type> {
        for (const island of this.islands) {
            if (island.containsPage(pageIndex, true)) {
                return island;
            }
        }
        if (this.islands.length >= 1 && !this.options.allowIslands) {
            throw new PagRXError('Non consecutive page access. Enable option "allowIslands".');
        }
        const island = new PagRXIsland<Type>(pageIndex, this.loadPage, this.options);
        this.islands.push(island);
        return island;
    }

    /**
     * If the given island has a neighbouring island, merge them. (neighbouring as in "consecutive page.")
     * @param island the island to evaluate
     */
    private optimzeIslands(island: PagRXIsland<Type>) {
        const nextPage = island.getPageRange()[1] + 1;
        const mergableIsland = this.islands.find((candidate: PagRXIsland<Type>) => {
            return candidate.getPageRange()[0] == nextPage;
        });
        if (mergableIsland) {
            island.append(mergableIsland);
            this.islands.splice(this.islands.indexOf(mergableIsland), 1);
        }
    }

    public reset() {
        this.islands = [];
    }

    /**
     * Update LRU for each island.
     * Empty islands are removed.
     */
    public updateLRU() {
        const result = this.islands.filter((island: PagRXIsland<Type>) => !island.updateLRU(this.lruCounter));
        this.islands = result;
    }
}

export class PageRxChunkData<ChunkType> {
    constructor(public chunk: ChunkType,
                public bottomOffset: number,
                public topOffset: number) {
    }
}

/**
 * Simple utility to tie a chunk with its relative offset.
 */
export class PagRXChunk<ChunkType> {

    public previous?: PagRXChunk<ChunkType>;
    public next?: PagRXChunk<ChunkType>;

    constructor(public data: Promise<PageRxChunkData<ChunkType>>) {

    }
}

/**
 * The chunk callback type. The callback is always called with respect to a neighbour (or an index ).
 *
 * The chunkResolve callback is used to inject the loaded chunk into the window.
 * Its top and bottom offset indices do refer to the indices of the data loaded
 * inside the chunk.
 */
export type PagRxChunkLoadCallback<ChunkType> = (
    direction: 'backward' | 'forward' | number,
    neighbour: PagRXChunk<ChunkType>
) => Promise<PageRxChunkData<ChunkType>>;

/**
 * A sliding window, holding a range of data. It suports supports an __optional__ sub-type (ChunkType)
 * that consumes data maybe at a different, non-linear pace.
 */
export class PagRXSlidingWindow<Type, ChunkType=Type> {
    private topItemOffset: number = 0;
    private rootChunk?: PagRXChunk<ChunkType>;

    /**
     * Constructor taking a loadCallback for window chunks.
     * @param pagrx
     * @param loadCallback
     */
    constructor(private loadCallback: PagRxChunkLoadCallback<ChunkType>) {
    }

    public get root() {
        if (!this.rootChunk) {
            throw new PagRXError('Sliding window not properly initialized. Call jumpTo at least ony before consuming data.');

        }
        return this.rootChunk;
    }

    public jumpTo(itemOffset: number) {
        this.topItemOffset = itemOffset;
        this.rootChunk = new PagRXChunk<ChunkType>(this.loadCallback(itemOffset, null as any));
    }

    /**
     * Load a page in a certain direction, based on a neighbour.
     * @param direction Direction to continue.
     * @param neighbour
     * @returns
     */
    private load(direction: 'forward' | 'backward', neighbour: PagRXChunk<ChunkType>): PagRXChunk<ChunkType> {

        if ((direction == 'forward' && !neighbour.next) ||
            (direction == 'backward' && !neighbour.previous)) {

            const newChunk = new PagRXChunk<ChunkType>(new Promise<PageRxChunkData<ChunkType>>((resolve, reject) => {
                this.loadCallback(direction, neighbour).then(
                    (data) => {
                        resolve(data);
                    }
                );
            }));
            if (direction == 'forward') {
                neighbour.next = newChunk;
                newChunk.previous = neighbour;
            } else {
                neighbour.previous = newChunk;
                newChunk.next = neighbour;
            }

            return newChunk;
        } else if (direction == 'forward') {
            if (!neighbour.next) {
                throw new PagRXError('Next is not set in window, while this was assumed!');
            }
            return neighbour.next;
        } else {
            if (!neighbour.previous) {
                throw new PagRXError('Previous is not set in window, while this was assumed!');
            }
            return neighbour.previous;
        }
    }

    getRelativeRange(from: number, to: number): Promise<ChunkType[] | any> {
        if (from > to) {
            throw new PagRXError(`Invalid range: [${from}-${to}] given! To must be greater than from.`)
        }
        let start = this.root;
        for (let i = 0; i != from; i += ((from < 0) ? -1 : 1)) {
            const direction = (from < 0) ? 'backward' : 'forward'
            start = this.load(direction, start);
        }
        let promises = [start];
        let current = start;
        for (let i = from; i < to; i++) {
            current = this.load('forward', current);
            promises.push(current)
        }

        return new Promise<ChunkType[]>((resolve, reject) => {
            Promise.all(
                promises.map((p: PagRXChunk<ChunkType>) => p.data)
            ).then((chunkDatas: PageRxChunkData<ChunkType>[]) => {
                resolve(chunkDatas.map(d => d.chunk))
            });
        });
    }

};
