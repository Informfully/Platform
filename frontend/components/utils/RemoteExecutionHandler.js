import NetInfo from "@react-native-community/netinfo";

/**
 * Singleton that queues remote calls while the device is offline and executes them once the device is online again
 * Does not expose the singleton, only the relevant methods
 */
class ConnectionUtil {
    constructor() {
        this.connected = false;
        this.queueCounter = 0;
        this.queue = {};
        NetInfo.fetch().then(state => {
            this.connected = state.isConnected;
        });

        NetInfo.addEventListener(state => {
            if (!this.connected && state.isConnected) {

                // Wait till meteor sorts stuff out, TODO: fix meteor
                setTimeout(this.workQueue, 500);
            }
            this.connected = state.isConnected;
        });
    }

    isConnected = () => {
        return this.connected;
    }

    /**
     * Returns undefined if the function was executed, the id in the queue otherwise
     * @param {function} func 
     */
    execute = (func) => {
        if (typeof func !=  'function') {
            return;
        }
        if (this.isConnected()) {
            func();
        } else {
            return this.addQueue(func);
        }
    }

    /**
     * Executes all functions currently in the queue
     */
    workQueue = () => {
        Object.keys(this.queue).forEach(key => {
            let func = this.queue[key];
            if (typeof func ==  'function') {
                func();
            }
            delete this.queue[key];
        });
    }

    /**
     * Adds a function to tthe queue and returns its key
     * @param {function} func 
     * @returns {string}
     */
    addQueue = (func) => {
        if (typeof func !=  'function') {
            return undefined;
        }
        let key = 'key_' + this.queueCounter;
        this.queueCounter += 1;
        this.queue[key] = func;
        return key;
    }
}

const instance = new ConnectionUtil();

const addQueue = instance.addQueue;
const execute = instance.execute;
const isConnected = instance.isConnected;


export {
    addQueue,
    execute,
    isConnected,
};