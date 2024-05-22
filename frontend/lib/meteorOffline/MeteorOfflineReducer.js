import Meteor from '@meteorrn/core';
import _ from 'lodash';
import { REHYDRATE, PURGE } from 'redux-persist';
import { MeteorDDPEvents } from './MeteorDDPEvents';

const fieldsToIgnoreDuringPurge = [ 'ready', '_persist', 'users', 'userId' ];

const MeteorOfflineReducer = (previousState = {}, action) => {
    const state = { ...previousState };
    const {
        collection,
        id,
        fields,
        ready,
    } = action.payload || {};

    switch (action.type) {
    case MeteorDDPEvents.ADDED:
        // if there is no entry in our store for the collection we are updating,
        // simply create an entry and store the payload
        if (!state[collection]) {
            state[collection] = {};
            return {
                ...state,
                [collection]: {
                    [id]: fields,
                },
            };
        }

        // if there is a collection but not an entry for the given document in the
        // store, update the collection with the new document
        if (!state[collection][id]) {
            return {
                ...state,
                [collection]: {
                    ...state[collection],
                    [id]: fields,
                },
            };
        }

        return {
            ...state,
            [collection]: {
                ...state[collection],
                [id]: { ...fields, ...state[collection][id] },
            },
        };

    case MeteorDDPEvents.CHANGED:
        // if there is no entry in our store for the collection we are updating,
        // simply create an entry and store the payload
        if (!state[collection]) {
            state[collection] = {};
            return {
                ...state,
                [collection]: {
                    [id]: fields,
                },
            };
        }

        // if there is a collection but not an entry for the given document in the
        // store, update the collection with the new document
        if (!state[collection][id]) {
            return {
                ...state,
                [collection]: {
                    ...state[collection],
                    [id]: fields,
                },
            };
        }
        return {
            ...state,
            [collection]: {
                ...state[collection],
                [id]: _.merge(state[collection][id], fields),
            },
        };

    case MeteorDDPEvents.REMOVED:
        if (state[collection] && state[collection][id]) {
            if (collection === 'users') {
                return {
                    ..._.omit(_.omit(state, 'userId'), 'users'),
                };
            }

            return {
                ...state,
                [collection]: _.omit(state[collection], id),
            };
        }
        return state;

    case 'SET_USERID':
        return {
            ...state,
            userId: id,
        };

    case 'UNSET_USERID':
        return {
            ..._.omit(state, 'userId'),
        };

    case 'UNSET_USER':
        return {
            ..._.omit(state, 'users'),
        };

    case 'SET_READY':
        return {
            ...state,
            ready,
        };

    case PURGE:
        // eslint-disable-next-line no-case-declarations
        const newState = {};
        fieldsToIgnoreDuringPurge.forEach((field) => {
            if (state[field]) {
                newState[field] = state[field];
            }
        });
        return newState;

    case REHYDRATE:
        if (
            typeof Meteor.ddp === 'undefined'
            || Meteor.ddp.status === 'disconnected'
        ) {
            return action.payload;
        }
        return state;
    default:
        return state;
    }
};

export { MeteorOfflineReducer };
