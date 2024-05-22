import { Meteor } from 'meteor/meteor';
import { privateRouteNames } from './routes/private';
import { publicRouteNames } from './routes/public';
import { ROUTE_NOT_FOUND } from './routes/general';


// define role requirements for routes
const roleMap = [
    { route: 'leads', roles: ['admin'] },
    { route: 'admins', roles:['maintainer']},
];

/**
 * Returns a boolean statement whether the user is allowed to connect to the given route.
 * This function only checks whether the user is allowed given his role and given a
 * role restriction for the given route.
 *
 * This function does not check whether the user has the right authentication for the
 * given route (i.e. if the user is signed in).
 *
 * @param route
 *          name of the route the user wants to access.
 *
 * @returns {boolean}
 *          true if the user is allowed to access the route
 */
export const routeGranted = (route) => {
    // no route defined -> deny access
    if (!route) {
        return false;
    }

    // no roles defined -> allow access
    if (!roleMap || roleMap.length === 0) {
        return true;
    }

    // this sets 'roleMapItem' to the item in roleMap that defines the given route
    const roleMapItem = roleMap.find(roleItem => roleItem.route === route); //e.g. const roleMapItem = {route:'admins',roles:['maintainer']}

    // if there is no such item, there is also no restriction on that route -> allow access
    if (!roleMapItem) {
        return true;
    }

    // user is not logged in or doesn't have any roles -> deny access
    if (!Meteor.user() || !Meteor.user().roles) {
        return false;
    }

    // this sets 'granted' to all roles that the user has and that the route allows
    // access to
    const granted = Meteor.user().roles.some(role => roleMapItem.roles.includes(role));


    // if there is no such role -> deny access
    if (!granted || granted.length === 0) {
        // user is not in any role that is required for restricted routes
        return false;
    }

    // if the current user passes all tests above -> allow access
    return true;
};

/**
 * Return the first route the user is allowed to access.
 * Ideally, this is the given route. If the user is not allowed to access
 * the given route, this function will search through {@link privateRouteNames}
 * and {@link publicRouteNames} and return the first route that user is
 * allowed to access considering only the {@link roleMap} using {@link routeGranted}
 *
 * @see routeGranted
 *          function that is used to check whether a route is granted.
 *
 * @param preferredRoute
 *          route the user wants to connect to
 *
 * @returns {*}
 */
export const firstGrantedRoute = (preferredRoute) => {
    // if the user is allowed to access the given route, return the given route
    if (preferredRoute && routeGranted(preferredRoute)) return preferredRoute;

    let grantedRoute = '';

    // otherwise, check all private routes
    privateRouteNames.forEach((route) => {
        if (routeGranted(route)) {
            grantedRoute = route;
            return false;
        }
        return true;
    });

    if (grantedRoute) return grantedRoute;

    // otherwise, check all public routes
    publicRouteNames.forEach((route) => {
        if (routeGranted(route)) {
            grantedRoute = route;
            return false;
        }
        return true;
    });

    if (grantedRoute) return grantedRoute;

    return ROUTE_NOT_FOUND;
};
