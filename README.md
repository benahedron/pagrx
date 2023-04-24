# PagRX
![CI Status](https://github.com/benahedron/pagrx/actions/workflows/tests.yml/badge.svg?branch=main)

PagRX is a TypeScript library for accessing paged data with simple LRU caching support.

It aims to reduce the complexities that emerge from mixed (linear & non-linear) access to slow / asynchronous paged data
sources (e.g. REST APIs) in the frontend of web-applications. Memory usage and access times are optimized while avoiding
any unnecessary source requests (i.e. slow API calls). The interface aims to offer solutions for versatile use cases.

Feel encouraged to suggest enhancements!

## Installation
```
npm install pagrx
```

## Features
- [x] Simple integration into any frontend project
- [x] Sliding window support
- [x] Fast 
- [x] Efficient

## Usage
In the simple most case, you must simply include PagRX and provide a load callback that resolves the promise for
the requested data. PagRX takes care of linear access and cache control (if required). 

### Simple access
You can use PagRX for simple access to paginated data. Here is an example:

```typescript
import {
  PagRX,
  PagRxLoadCallback
} from "pagrx";

const userCallback: PagRxLoadCallback<User> = (
  pageIndex: number,
  pageSize: number,
  pageResolve: (value: User[] | PromiseLike<User[]>) => void,
) => {
  let users = new Array();
  // generate users for the current page.
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
pagrx.getRange(20, 30).then((users: User[]) => {
  // 30 users starting at 20. Will automaticaly userCallback when requird.
  // (See options PagRX constructo options for page & cache control.)    
});
```

### Windowed access
You can use PagRX for windowed access to paginated data. Here is an example:

```typescript
import { PagRX, PagRXSlidingWindow } from 'pagrx';

class Event {
  constructor(public start: Date, public end: Date, public index: number) {}

  print() {
    console.log(
      `   ${this.start.getHours()}:${this.start.getMinutes()}-${this.end.getHours()}:${this.end.getMinutes()}   (${this.start.getFullYear()}.${this.start.getMonth() + 1}.${this.start.getDate()})`
    );
  }
}

class Day {
  constructor(public date: Date, public events: Event[] = []) {}

  print() {
    console.log(
      `Events for: ${this.date.getFullYear()}.${this.date.getMonth() + 1}.${this.date.getDate()})`
    );
    this.events.forEach((e) => e.print());
  }
}

const calendarCallback: PagRxLoadCallback<Event> = (
  pageIndex: number,
  pageSize: number,
  pageResolve: (value: Event[] | PromiseLike<Event[]>) => void
) => {
  // Generate random events for the day
  let events = new Array();
  // ...
  pageResolve(events);
};

// Create your window
const window = new PagRXSlidingWindow<Event, Day>(calendarCallback);

// Jump to a specific event.
window.jumpTo(35);

// Get a range of days relative to the current position.
window.getRelativeRange(-2, 3).then((days: Day[]) => {
  days.forEach((d) => d.print());
});
```

## Features 

- [x] Customizable data retrival callback to support any data source.
- [x] Support to for paginated data.
- [x] LRU caching of data pages.
- [x] Simple sliding-window support.
- [x] Grouping abstraction

## Contributing
Pull requests are welcome! If you find a bug or have an idea for a new feature, please open an issue on the [GitHub repository](https://github.com/benahedron/pagrx).

## License
This library is released under the MIT License. See [LICENSE](LICENSE) for details.
