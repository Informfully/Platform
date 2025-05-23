import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';


// do not return anything before the subscription has finished loading.
// this is required because we are unable to tell if a user is signed in
// or not until we have received the data of that user.
FlowRouter.wait();
const userDataSubscription = Meteor.subscribe('userData');
Tracker.autorun(() => {
    if (userDataSubscription.ready() && !FlowRouter._initialized) {
        FlowRouter.initialize();
    }
});

/**
 * Tracks whenever the objects change which allows us to detect
 * when a user signs in/out.
 * Reload FlowRouter if the user signs in/out.
 */
Tracker.autorun(() => {
    const userId = Meteor.userId();
    const user = Meteor.user();
    const isLoggingIn = Meteor.loggingIn();

    if (isLoggingIn) return;

    if (userId && !user) {
        return;
    }

    const currentRoute = FlowRouter.current().route;

    if (currentRoute) {
        if (user) {
            // if the user is logged in but he is in a public route, we want to reload
            if (currentRoute.group.name === 'public') {
                FlowRouter.reload();
            }
        } else if (currentRoute.group.name !== 'public') {
            // if the user is not logged in but not in a public route, we want to reload
            FlowRouter.reload();
        }
    }
});
