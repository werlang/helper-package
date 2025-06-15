import Pledge from '../../helper/pledge.js';

describe('Pledge', () => {
    test('creates a new pledge instance', () => {
        const pledge = new Pledge();
        expect(pledge).toBeInstanceOf(Pledge);
        expect(pledge.promise).toBeInstanceOf(Promise);
    });

    test('resolves with data', async () => {
        const pledge = new Pledge();
        const testData = { message: 'test data' };
        
        // Resolve the pledge
        pledge.resolve(testData);
        
        // Get the result
        const result = await pledge.get();
        expect(result).toEqual(testData);
    });

    test('rejects with error', async () => {
        const pledge = new Pledge();
        const testError = new Error('test error');
        
        // Reject the pledge
        pledge.reject(testError);
        
        // Expect rejection
        await expect(pledge.get()).rejects.toThrow('test error');
    });

    test('timeout resolves if promise resolves before timeout', async () => {
        const pledge = new Pledge();
        const testData = 'resolved data';
        
        // Resolve after 100ms
        setTimeout(() => pledge.resolve(testData), 100);
        
        // Should resolve before 1000ms timeout
        const result = await pledge.timeout(1000);
        expect(result).toBe(testData);
    });

    test('timeout rejects if timeout occurs before resolution', async () => {
        const pledge = new Pledge();
        
        // Never resolve the pledge
        
        // Should timeout after 100ms
        await expect(pledge.timeout(100)).rejects.toThrow('Request Timeout');
    });

    test('timeout rejects if promise rejects before timeout', async () => {
        const pledge = new Pledge();
        const testError = new Error('promise error');
        
        // Reject after 100ms
        setTimeout(() => pledge.reject(testError), 100);
        
        // Should reject with promise error before 1000ms timeout
        await expect(pledge.timeout(1000)).rejects.toThrow('promise error');
    });

    test('then method chains correctly', async () => {
        const pledge = new Pledge();
        const testData = 'test data';
        const callback = jest.fn();
        
        // Chain then callback
        const returnedPledge = pledge.then(callback);
        
        // Should return the pledge for chaining
        expect(returnedPledge).toBe(pledge);
        
        // Resolve the pledge
        pledge.resolve(testData);
        
        // Wait for the promise to resolve and callback to be called
        await pledge.get();
        
        // Callback should have been called with the data
        expect(callback).toHaveBeenCalledWith(testData);
    });

    test('static all method resolves when all pledges resolve', async () => {
        const pledge1 = new Pledge();
        const pledge2 = new Pledge();
        const pledge3 = new Pledge();
        
        const testData1 = 'data1';
        const testData2 = 'data2';
        const testData3 = 'data3';
        
        // Resolve pledges with delays
        setTimeout(() => pledge1.resolve(testData1), 50);
        setTimeout(() => pledge2.resolve(testData2), 100);
        setTimeout(() => pledge3.resolve(testData3), 150);
        
        const results = await Pledge.all([pledge1, pledge2, pledge3]);
        expect(results).toEqual([testData1, testData2, testData3]);
    });

    test('static all method rejects when any pledge rejects', async () => {
        const pledge1 = new Pledge();
        const pledge2 = new Pledge();
        const pledge3 = new Pledge();
        
        const testData1 = 'data1';
        const testError = new Error('test error');
        const testData3 = 'data3';
        
        // Resolve and reject pledges
        setTimeout(() => pledge1.resolve(testData1), 50);
        setTimeout(() => pledge2.reject(testError), 100);
        setTimeout(() => pledge3.resolve(testData3), 150);
        
        await expect(Pledge.all([pledge1, pledge2, pledge3])).rejects.toThrow('test error');
    });

    test('static all method works with mixed pledge and non-pledge values', async () => {
        const pledge = new Pledge();
        const promise = new Promise((resolve) => {
            setTimeout(() => resolve('promise value'), 50);
        });
        const nonPledgeValue = 'non-pledge value';

        const testData = 'pledge value';
        setTimeout(() => pledge.resolve(testData), 100);
        const results = await Pledge.all([pledge, promise, nonPledgeValue]);
        expect(results).toEqual([testData, 'promise value', nonPledgeValue]);
    });

    test('handles callback-style async operations', async () => {
        const pledge = new Pledge();
        
        // Simulate a callback-style function
        const callbackFunction = (callback) => {
            setTimeout(() => {
                callback(null, 'callback result');
            }, 100);
        };
        
        // Use pledge with callback
        callbackFunction((error, data) => {
            if (error) {
                pledge.reject(error);
            } else {
                pledge.resolve(data);
            }
        });
        
        const result = await pledge.get();
        expect(result).toBe('callback result');
    });

    test('handles callback-style async operations with error', async () => {
        const pledge = new Pledge();
        
        // Simulate a callback-style function that errors
        const callbackFunction = (callback) => {
            setTimeout(() => {
                callback(new Error('callback error'));
            }, 100);
        };
        
        // Use pledge with callback
        callbackFunction((error, data) => {
            if (error) {
                pledge.reject(error);
            } else {
                pledge.resolve(data);
            }
        });
        
        await expect(pledge.get()).rejects.toThrow('callback error');
    });

    test('can be used multiple times after resolution', async () => {
        const pledge = new Pledge();
        const testData = 'resolved once';
        
        pledge.resolve(testData);
        
        // Should return the same result multiple times
        const result1 = await pledge.get();
        const result2 = await pledge.get();
        
        expect(result1).toBe(testData);
        expect(result2).toBe(testData);
    });

    test('resolving multiple times only uses first resolution', async () => {
        const pledge = new Pledge();
        
        pledge.resolve('first');
        pledge.resolve('second');
        
        const result = await pledge.get();
        expect(result).toBe('first');
    });

    test('rejecting after resolving has no effect', async () => {
        const pledge = new Pledge();
        
        pledge.resolve('resolved');
        pledge.reject(new Error('should not reject'));
        
        const result = await pledge.get();
        expect(result).toBe('resolved');
    });

    test('complex timeout scenario with multiple operations', async () => {
        const pledge1 = new Pledge();
        const pledge2 = new Pledge();
        
        // One resolves quickly, one times out
        setTimeout(() => pledge1.resolve('quick'), 50);
        // pledge2 never resolves
        
        const results = await Promise.allSettled([
            pledge1.timeout(1000),
            pledge2.timeout(100)
        ]);
        
        expect(results[0].status).toBe('fulfilled');
        expect(results[0].value).toBe('quick');
        expect(results[1].status).toBe('rejected');
        expect(results[1].reason.message).toBe('Request Timeout');
    });
});
