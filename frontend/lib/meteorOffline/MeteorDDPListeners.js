import Meteor from '@meteorrn/core';
import { MeteorDDPEvents } from './MeteorDDPEvents';

const initializeMeteorDDPListeners = (store) => {
    Meteor.waitDdpConnected(() => {
        let connected = true;
        Meteor.ddp.on('disconnected', () => {
            connected = false;
        });

        if (connected) {
            Meteor.ddp.on('added', (payload) => {
                store.dispatch({ type: MeteorDDPEvents.ADDED, payload });
            });

            Meteor.ddp.on('changed', (payload) => {
                store.dispatch({ type: MeteorDDPEvents.CHANGED, payload });
            });

            Meteor.ddp.on('removed', (payload) => {
                store.dispatch({ type: MeteorDDPEvents.REMOVED, payload });
            });

            Meteor.getData().on('onLoginFailure', () => {
                Meteor.logout(() => {
                    store.dispatch({ type: 'UNSET_USERID', payload: { } });
                    store.dispatch({ type: 'UNSET_USER', payload: { } });
                });
            });
        }
    });
};

export { initializeMeteorDDPListeners };
