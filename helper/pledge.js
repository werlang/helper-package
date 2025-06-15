// Pledge: a helper class to handle promises

// Usage:
// const pledge = new Pledge();
// someCallbackFunction((error, data) => {
//     if (error) {
//         pledge.reject(error);
//     }
//     pledge.resolve(data);
// });
// const response = await pledge.timeout(5000);


class Pledge {

    promise = null;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    static all(pledges) {
        return Promise.all(
            pledges.map(item =>
                item instanceof Pledge ? item.get() : item
            )
        );
    }

    resolve(data) {
        this._resolve(data);
    }

    reject(data) {
        this._reject(data);
    }

    async get() {
        return this.promise;
    }

    async timeout(time) {
        return Promise.race([
            this.promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request Timeout')), time)
            )
        ]);
    }

    then(callback) {
        this.promise.then(callback);
        return this;
    }
}

export default Pledge;