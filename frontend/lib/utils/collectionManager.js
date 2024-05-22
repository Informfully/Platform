import { Mongo } from '@meteorrn/core';

/**
 * Caches collections so they can be used in mutltiple places
 */
class CollectionManager {
    constructor() {
        this._collections = {};
    }

    collection = (name) => {
        if (this._collections[name] === undefined) {
            this._collections[name] = new Mongo.Collection(name);
        }
        return this._collections[name];
    }
}

const collectionManager = new CollectionManager();

export {collectionManager};
