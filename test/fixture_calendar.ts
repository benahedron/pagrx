import {PagRxLoadCallback} from "../src";

export class Event {
    constructor(public start: Date, public end: Date, public index: number) {
    }

    print() {
        console.log(`   ${this.start.getHours()}:${this.start.getMinutes()}-${this.end.getHours()}:${this.end.getMinutes()}   (${this.start.getFullYear()}.${this.start.getMonth() + 1}.${this.start.getDate()})`);
    }
}

export class Day {
    public top = -1;
    public bottom = -1;

    constructor(public date: Date, public events: Event[] = []) {

    }

    print() {
        console.log(`Events for: ${this.date.getFullYear()}.${this.date.getMonth() + 1}.${this.date.getDate()} (bottom: ${this.bottom}, top: ${this.top})`);
        this.events.forEach(e => e.print());
    }
}

export const sourceLength = 1000;
export const sourceDates: Date[] = [];
const currentYear = new Date().getFullYear();
for (let i = 0; i < sourceLength; i++) {
    const randomMonth = Math.floor(Math.random() * 12);
    const randomHour = Math.floor(Math.random() * 12 + 6); // from 6 am to pm
    const randomMinute = Math.floor(Math.random() * 6) * 10;
    const randomDay = Math.floor(Math.random() * 31) + 1;
    const randomDate = new Date(currentYear, randomMonth, randomDay, randomHour, randomMinute);

    sourceDates.push(randomDate);
}
sourceDates.sort((a, b) => a.getTime() - b.getTime());

export const calendarCallback: PagRxLoadCallback<Event> = (
    pageIndex: number,
    pageSize: number,
    pageResolve: (value: Event[] | PromiseLike<Event[]>) => void,
) => {
    let events = new Array();

    const pageOffset = pageIndex * pageSize;
    for (let i = 0; i < pageSize; ++i) {
        if (pageOffset + i >= sourceLength) {
            break;
        }
        const start = sourceDates[pageOffset + i];
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + (Math.floor(Math.random()) * 8 + 1) * 30)
        const event = new Event(start, end, pageOffset + i);
        events.push(event);
    }
    pageResolve(events);
};
