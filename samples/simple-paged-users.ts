/**
 * This example shows the most basic use of PagRXs' paging and cache features.
 */
import {PagRX, PagRxLoadCallback} from '../src';
import {userNames} from "./data/names";

/**
 * Simple user class in order to have something to work with.
 */
class User {
    constructor(public name: string, public index: number) {

    }
}

/**
 * Pagination callback required for PagRX. It retrieves the data and fills 1 complete page.
 * As the result is asynchronous, you could easily produce pages with asynchronous data
 * (e.g. http get, ...) here.
 *
 * Here we simply generate user instances based on data loaded locally.
 *
 * @param pageIndex The index of tha page being loaded.
 * @param pageSize The size of the page. The number of items contained within the page.
 * @param pageResolve The promise that must be called with the resulting data, once it is ready.
 */
const userCallback: PagRxLoadCallback<User> = (
    pageIndex: number,
    pageSize: number,
    pageResolve: (value: User[] | PromiseLike<User[]>) => void,
) => {
    const users = new Array();
    for (let i = 0; i < pageSize; ++i) {
        const index = i + pageIndex * pageSize
        if (index < 0 || index > userNames.length){
            continue;
        }
        const source = userNames[index];
        const user = new User(`${source.firstName}, ${source.lastName}`, i + pageIndex * pageSize);
        users.push(user);
    }
    pageResolve(users);
};


/**
 * Our pagrx instance with the user callback. (And default options!)
 */
const pagrx = new PagRX<User>(userCallback);

/// Simply accessing the  2 first users
pagrx.get(0).then((res0) => {
    pagrx.get(1).then((res1) => {
        console.log(res0, res1);
    });
});



/**
 * There is not particular reason here to have a separate pagrx instance other than being able to debug it; due to
 * asynchronous behavior, stepping around might be less intuitive.
 */
const pagrxRange = new PagRX<User>(userCallback);
///Acess 10 then 20 iteams starting at index 20.
pagrxRange.getRange(20, 30).then((resA) => {
    pagrxRange.getRange(20, 40).then((resB) => {
        console.log(resA, resB);
    });
});

