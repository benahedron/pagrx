import {PageRxChunkData, PagRX, PagRXChunk, PagRxChunkLoadCallback, PagRXSlidingWindow} from '../src';
import {calendarCallback, Event, Day} from "../test/fixture_calendar";


const pagrx = new PagRX<Event>(calendarCallback);

// The size used to fetch events. Basically this is a hack.
// A cleaner solution would consume from pager until the date changes.
const FETCH_SIZE = 10;

/**
 * Packs events inside a day with the right top and bottom offset.
 * @param events The events to consumer in forward order.
 * @param itemOffset the
 * @param backward
 * @returns
 */
function createChunkData(events: Event[], itemOffset: number, backward: boolean) {
    if (backward) {
        events = events.reverse();
    }

    // We filter out events that match the current day. (This is specific to this example...)
    const date = new Date(events[0].start);
    date.setHours(0);
    date.setMinutes(0);
    let sameDayEvents = events.filter(e => {
        if (!e.start) {
            return false;
        }
        return e.start.getDate() == date.getDate();
    });
    if (backward) {
        // Events within the day should be forward order.
        sameDayEvents = sameDayEvents.reverse();
    }

    // Create the actual date wirth its events.
    const result = new Day(date, sameDayEvents);
    let bottomOffset = itemOffset;
    let topOffset = itemOffset + sameDayEvents.length - 1;
    if (backward) {
        // Compensate for the fetch size.
        topOffset = itemOffset + FETCH_SIZE - 1;
        bottomOffset = topOffset - (sameDayEvents.length - 1);
    }
    result.bottom = bottomOffset;
    result.top = topOffset;
    return new PageRxChunkData<Day>(result, bottomOffset, topOffset);
}

const chunkCallback: PagRxChunkLoadCallback<Day> = (
    direction: 'backward' | 'forward' | number,
    neighbour: PagRXChunk<Day>
): Promise<PageRxChunkData<Day>> => {
    return new Promise<PageRxChunkData<Day>>((chunkResolve, chunkReject) => {

        if (direction !== 'forward' && direction !== 'backward') {  // Is the root. Start here.
            const itemOffset = direction as number;
            pagrx.getRange(itemOffset, FETCH_SIZE).then((events: Event[]) => {
                chunkResolve(createChunkData(events, itemOffset, false));
            });
        } else {
            neighbour.data.then((data: PageRxChunkData<Day>) => {
                const backward = (direction == 'backward');
                let itemOffset = !backward ? data.topOffset + 1 : data.bottomOffset - 1;
                if (backward) {
                    itemOffset -= FETCH_SIZE;
                }
                pagrx.getRange(itemOffset, FETCH_SIZE).then((events: Event[]) => {

                    chunkResolve(createChunkData(events, itemOffset, backward));
                });

            });
        }
    });
}

const window = new PagRXSlidingWindow<Event, Day>(chunkCallback);
window.jumpTo(35); // Jump to a specific event.
window.getRelativeRange(-2, 3).then((days: Day[]) => {
    days.forEach(d => d.print())
})