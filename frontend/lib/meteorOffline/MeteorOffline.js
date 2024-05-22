import Meteor from '@meteorrn/core';
import { createStore, applyMiddleware } from 'redux';
import { createLogger } from 'redux-logger';
import {
    persistStore,
    persistReducer,
    autoRehydrate,
} from 'redux-persist';
import { initializeMeteorDDPListeners } from './MeteorDDPListeners';
import { MeteorOfflineReducer } from './MeteorOfflineReducer';
import { MeteorDDPEvents } from './MeteorDDPEvents';
import MeteorOfflinePersistConfig from './MeteorOfflinePersistConfig';
import { collectionManager } from '../utils/collectionManager';

const rehydrateMinimongo = (store) => {
    const data = Meteor.getData();
    const db = data && data.db;

    if (db) {
        const state = store.getState();

        Object.keys(state).forEach((collectionName) => {
            // skip persist
            if (
                collectionName === '_persist'
                || collectionName === 'userId'
                || collectionName === 'ready'
            ) {
                return false;
            }

            if (!db[collectionName]) {
                db.addCollection(collectionName);
            }

            const collectionArray = [];
            if (typeof state[collectionName] === 'object') {
                Object.keys(state[collectionName]).forEach((_id) => {
                    collectionArray.push({ _id, ...state[collectionName][_id] });
                });
                db[collectionName].upsert(collectionArray);
            }

        });
    }
    store.dispatch({ type: 'SET_READY', payload: { ready: true } });
};

const initMeteorOffline = (options = {}) => {
    const verbose = options.verbose || false;
    const persistedReducer = persistReducer(MeteorOfflinePersistConfig, MeteorOfflineReducer);
    const middlewares = [];
    const logger = createLogger();
    if (verbose) {
        middlewares.push(logger);
    }
    const store = createStore(
        persistedReducer,
        applyMiddleware(...middlewares),
        autoRehydrate
    );
    return store;
};


class MeteorOffline {
    constructor(options) {
        const verbose = options.verbose || false;
        this.isLoading = true;
        this.store = initMeteorOffline({ verbose });
        this.persistor = persistStore(this.store, {}, () => {
            rehydrateMinimongo(this.store);
            this.isLoading = false;
        });

        Meteor.waitDdpConnected(() => {
            if (Meteor.ddp.status === 'connected') {
                this.persistor.purge();
                initializeMeteorDDPListeners(this.store);
            }
        });
    }

    user() {
        if (Meteor.user()) {
            const id = Meteor.userId();
            const user = Meteor.user();
            this.store.dispatch({ type: 'SET_USERID', payload: { id } });
            this.store.dispatch({ type: MeteorDDPEvents.ADDED, payload: { id, collection: 'users', fields: user } });

            return Meteor.user();
        }
        const { userId, users } = this.store.getState();
        if (userId && users) {
            return { _id: userId, ...users[userId] };
        }
        return collectionManager.collection('users').findOne(userId);
    }

    logout() {
        const user = this.user();
        Meteor.logout(() => {
            this.store.dispatch({ type: 'UNSET_USERID', payload: { } });
            this.store.dispatch({
                type: MeteorDDPEvents.REMOVED,
                payload: {
                    id: user._id,
                    collection: 'users',
                    fields: user,
                },
            });
        });
    }

}

const verbose = false;
const MeteorOfflineInstance = new MeteorOffline({ verbose });
export default MeteorOfflineInstance;
