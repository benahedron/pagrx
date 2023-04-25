import {PagRxLoadCallback} from "../src";

export class Fixture_user {
    constructor(public name: string, public index: number) {
    }
}

export const userCallback: PagRxLoadCallback<Fixture_user> = (
    pageIndex: number,
    pageSize: number,
    pageResolve: (value: Type[] | PromiseLike<Type[]>) => void,
) => {
    let users = new Array();
    for (let i = 0; i < pageSize; ++i) {
        const user = new Fixture_user(`User ${i + pageIndex * pageSize}`, i + pageIndex * pageSize);
        users.push(user);
    }
    pageResolve(users);
};

export const delayedUserCallback: PagRxLoadCallback<Fixture_user> = (
    pageIndex: number,
    pageSize: number,
    pageResolve: (value: Type[] | PromiseLike<Type[]>) => void,
) => {
    let users = new Array();
    for (let i = 0; i < pageSize; ++i) {
        const user = new Fixture_user(`User ${i + pageIndex * pageSize}`, i + pageIndex * pageSize);
        users.push(user);
    }
    setTimeout(() => {
        pageResolve(users);
    }, 10);
}


class Group {
    constructor(public users: User[], public index: number) {
    }

    print() {
        console.log(`Group ${this.index}`);
        this.users.forEach(u => u.print());
    }
}


