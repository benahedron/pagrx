# PagRX
![Tests](https://github.com/benahedron/pagrx/actions/workflows/tests.yml/badge.svg?branch=main)

PagRX is a TypeScript library for accessing paged data with simple LRU caching support. Further offering non-linear
re-grouping. 

It aims to reduce the complexities that emerge from mixed (linear & non-linear) access to slow / asynchronous paged data
sources (e.g. REST APIs) in the frontend of web-applications. Memory usage and access times are optimized while avoiding
any unnecessary source requests (i.e. slow API calls). The interface aims to offer solutions for versatile use cases.

*The data must be linearly accessible using an offset.*

Feel encouraged to suggest enhancements!

## Installation
```
npm install pagrx
```

## Features
- [x] Simple integration into any frontend project
  - Customizable data retrieval callback to support any data source.
- [x] Sliding window support
  - Useful re-grouping abstraction. Mapping linear pages *Events* to *Days* (where day is the window's grouping container).
- [x] Fast 
  - Optimized lookups.
- [x] Efficient
  - Configurable LRU caching per pages.

## Usage
In the simple most case, you simply include PagRX and provide a load callback that resolves the promise for
the requested data. PagRX takes care of linear access and cache control (if required).

### Simple access
You can use PagRX for simple access to paginated data. The most important bit is the load callback
that is passed as argument to the PagRX constructor. It is called for accessing a certain page (whenever necessary) and the
user __must__ call the resolve (pageResolve) callback with the loaded data once ready. 

Here is an example:

```typescript
import {
  PagRX,
  PagRxLoadCallback
} from "pagrx";

const userCallback: PagRxLoadCallback<User> = (
  pageIndex: number, // The requested page index
  pageSize: number, // The 
  pageResolve: (value: User[] | PromiseLike<User[]>) => void,
) => {
  let users = new Array();
  // generate users for the current page. (could be a HTTP request)
  pageResolve(users);
};

const pagrx = new PagRX<User>(userCallback);

// Get the first two pages of users
pagrx.get(0).then((user: User) => {
 // Get 1st user. Call userCallback.
});

pagrx.get(1).then((user: User) => {
 // Gets 2nd user => still on same page. No userCallback call. 
});

// Get a range of users
pagrx.getRange(20, 50).then((users: User[]) => {
  // 30 users starting at 20. Will automatically call the userCallback when required.
  // (See options PagRX constructor options for page & cache control.)    
});
```

### Windowed access
You can use PagRX for windowed access to paginated data. The advantage this offers apart from some utility methods, is that an additional 
grouping, which can be non-linear and thus distinct from the pages access, can be introduced here.
 
In the simple most version, the utility functions [simple_window_callback](src/utils.ts) or [array_window_callback](src/utils.ts) (See usage examples [here](samples/simple-window.ts) offer trivial
mappings. The simple window callback does nothing different from the getRange method of the PagRX class (it is a good example though to understand how to implement your own chunk callback though).
On the other hand you can provide the array window callback with a chunk size parameter in a way that the abstraction is a fix sized page. This allows for transparent page adaptations (e.g. your
pagrx load callback load in chunks of 100 elements because this somehow is optimal for the REST call, but you consume window chunks with each containing 5 elements).

The real power of the sliding window emerges when applying a non-linear mapping. In the example below, the paged data is of type *events*, but the window moves over *days*. Other applicable abstractions could
be *photos* with *lines* as sliding window data type or *pages* of *texts* etc.

Here the chunk callback must be implemented by you for the chunk type. It returns a promise that must be resolved in order for the data to become accessible. The chunk's inner data can come from a PagRX instance,
by loading the necessary data, knowing either the start index (if directionOrStart is a number) or based on the neighbour (that shares the top / bottom index) and the direction you are moving too.

```typescript
import { PagRX, PagRXSlidingWindow } from 'pagrx';

class Event {
  constructor(public start: Date, public end: Date) {}
}

class Day {
  constructor(public events: Event[], ...) {}
}

const chunkCallback: PagRxChunkLoadCallback<Day> = (
    directionOrStart: PagRXChunkDirection | number,
    neighbour: PagRXChunk<Day>
): Promise<PageRxChunkData<Day>> => {
    // Callback returns 
    return new Promise<PageRxChunkData<Day>>((chunkResolve, chunkReject) => {
        const date: Date = ...; // date based on neighbour and direction.
        const events: Event[] = ...; //generate events for day using pagrx instance.
        const bottomIndex:number = ...; // The index of the first event in the event list
        const topIndex:number = ...; // The index of the last event in the event list
        chunkResolve(new PageRxChunkData<Day>(new Day(events), bottomIndex, topIndex));
    });
}

// Create your window
const window = new PagRXSlidingWindow<Event, Day>(chunkCallback);

// Jump to a specific event.
window.jumpTo(35);

// Get a range of days relative to the current position.
window.getRelativeRange(-2, 3).then((days: Day[]) => {
  days.forEach((day: Day) => {
      console.log(day);
  });
});
```

## Configuration
The PagRX constructor takes a PagRXOptions instance with the field:
- pageSize (20): The size of each page, loaded via the callback.
- pagesLRUThreshold (1000):  The amount of cache misses to the page, before a page is discarded/freed up.
- allowIslands (true): An island holds a connected set of pages. If this is disabled, all pages in you pagrx instance must be consecutive; otherwise, loading non-consecutive data will throw an error. 

If you only want to override the page size you can call the constructor as follows:
```typescript
new PagRX<Type>(loadCallback, {...defaultOptions, ...{pageSize: 100}});
```

## Contributing
Pull requests are welcome! If you find a bug or have an idea for a new feature, please open an issue on the [GitHub repository](https://github.com/benahedron/pagrx).

## License
This library is released under the MIT License. See [LICENSE](LICENSE) for details.
