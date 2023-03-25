import {PageRxChunkData, PagRX, PagRXChunk, PagRxChunkLoadCallback} from "./index";

export function simple_window_callback<Type>(pagrx: PagRX<Type>): PagRxChunkLoadCallback<Type> {
    return (
        direction: 'backward' | 'forward' | number,
        neighbour: PagRXChunk<Type>
    ): Promise<PageRxChunkData<Type>> => {
        return new Promise<PageRxChunkData<Type>>((chunkResolve, chunkReject) => {
            if (direction !== 'forward' && direction !== 'backward') {  // Is the root. Start here.
                const index = direction as number;
                pagrx.get(index).then(event => {
                    chunkResolve(new PageRxChunkData<Type>(event, index, index));
                });
            } else {

                neighbour.data.then((data: PageRxChunkData<Type>) => {
                    const backward = (direction === 'backward');
                    const index = !backward ? data.topOffset + 1 : data.bottomOffset - 1;
                    pagrx.get(index).then(event => {
                        chunkResolve(new PageRxChunkData<Type>(event, index, index));
                    });
                });
            }
        });
    }
}

export function array_window_callback<Type>(pagrx: PagRX<Type>, chunkSize: number): PagRxChunkLoadCallback<Type[]> {
    return (
        direction: 'backward' | 'forward' | number,
        neighbour: PagRXChunk<Type[]>
    ): Promise<PageRxChunkData<Type[]>> => {
        return new Promise<PageRxChunkData<Type[]>>((chunkResolve, chunkReject) => {
            if (direction !== 'forward' && direction !== 'backward') {  // Is the root. Start here.
                const index = direction as number;
                pagrx.getRange(index * chunkSize, (index + 1) * chunkSize).then(events => {
                    chunkResolve(new PageRxChunkData<Type[]>(events, index, index));
                });
            } else {
                neighbour.data.then((data: PageRxChunkData<Type[]>) => {
                    const backward = (direction === 'backward');
                    const index = !backward ? data.topOffset + 1 : data.bottomOffset - 1;
                    pagrx.getRange(index * chunkSize, (index + 1) * chunkSize).then(events => {
                        chunkResolve(new PageRxChunkData<Type[]>(events, index, index));
                    });
                });
            }
        });
    }
}
