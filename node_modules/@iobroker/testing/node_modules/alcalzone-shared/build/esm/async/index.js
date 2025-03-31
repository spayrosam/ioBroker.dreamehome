export function promisify(fn, context) {
    return function (...args) {
        context = context || this;
        return new Promise((resolve, reject) => {
            fn.apply(context, [
                ...args,
                (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    else {
                        return resolve(result);
                    }
                },
            ]);
        });
    };
}
export function promisifyNoError(fn, context) {
    return function (...args) {
        context = context || this;
        return new Promise((resolve) => {
            fn.apply(context, [
                ...args,
                (result) => {
                    return resolve(result);
                },
            ]);
        });
    };
}
/* eslint-enable @typescript-eslint/no-unsafe-function-type */
/**
 * Creates a promise that waits for the specified time and then resolves
 * @param unref Whether `unref()` should be called on the timeout
 */
export function wait(ms, unref = false) {
    return new Promise((resolve) => {
        const timeout = setTimeout(resolve, ms);
        // In a browser context (Electron), unref is not necessary or possible
        if (unref && typeof timeout !== "number")
            timeout.unref();
    });
}
/**
 * Executes the given promise-returning functions in sequence
 * @param promiseFactories An array of promise-returning functions
 * @returns An array containing all return values of the executed promises
 */
export async function promiseSequence(promiseFactories) {
    const ret = [];
    for (const f of promiseFactories) {
        ret.push(await f());
    }
    return ret;
}
//# sourceMappingURL=index.js.map