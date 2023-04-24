/**
 * This example shows the most basic use of PagRXs' simple & array sliding window features.
 */
import {PagRX, PagRXSlidingWindow} from '../src';
import {calendarCallback, Event, sourceDates} from "../test/fixture_calendar";
import {array_window_callback, simple_window_callback} from "../src/utils";

// Simple paged data source here.
const pagrx = new PagRX<Event>(calendarCallback);

console.log(sourceDates)

/**
 * In a first step, lets consume a pagrx instance using a normal simple window
 * callback
 *
 * The example below  is equivalent to:
 * pagrx.getRange(33, 6).then((events: Event[]) => {
 *     events.forEach(d => d.print())
 * })
 *
 * The only advantage here is the relative range access that might come in handy sometimes.
 * No absolut access is supported here. (You can however create your own chunk callback.)
 *
 */
const chunkCallback = simple_window_callback(pagrx);

const window = new PagRXSlidingWindow<Event>(chunkCallback);
window.jumpTo(35); // Jump to a specific event.
window.getRelativeRange(-2, 3).then((events: Event[]) => {
    console.log('Simple Version: ');
    events.forEach(d => d.print())
})


/**
 * If you want fixed size array access you can use the array_window_callback utility
 * funciton.
 */
const arrayChunkCallback = array_window_callback(pagrx, 3);
const arrayWindow = new PagRXSlidingWindow<Event[]>(arrayChunkCallback);
arrayWindow.jumpTo(35); // Jump to a specific event.
arrayWindow.getRelativeRange(-2, 3).then((eventsArray: Event[][]) => {
    console.log('Array Version: ');
    eventsArray.forEach(
        events => {
            console.log('Group : ');
            events.forEach(event => event.print()
            )
        }
    );
})
