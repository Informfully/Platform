import { Meteor } from 'meteor/meteor';
import React from 'react';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { mount } from 'react-mounter';

import { firstGrantedRoute } from '../utils_routes';
import PublicPages from '../../../../ui/PublicPages';
import SignIn from '../../../../ui/pages/SignIn';
import ForgotPassword from '../../../../ui/pages/ForgotPassword';
import ResetPassword from '../../../../ui/pages/ResetPassword';
import PrivacyPolicy from '../../../../ui/pages/PrivacyPolicy';
import Info from '../../../../ui/pages/Info';
import TermsAndConditions from '../../../../ui/pages/TermsAndConditions';

// this is the route a user is redirected to after signing in
const ROUTE_DEFAULT_AFTER_SIGN_IN = 'experiments';

// collect the names of all routes that should be available for
// users that are not signed in
// this list is used in {@link firstGrantedRoute}
export const publicRouteNames = [
    'signin',
    'forgot-password',
    'reset-password',
];

/**
 * create a FlowRouter group and assign the function
 * that should be executed whener a route in this
 * group is entered.
 *
 * This is the place where we check if the user is
 * signed in and if the user is signed in, we redirect
 * the user to the private section of the application.
 *
 * @see firstGrantedRoute
 *          returns the first route the user is allowed
 *          to access. This is the route that the user
 *          is redirected to in the case that he is
 *          missing the permissions to access the given
 *          route.
 *
 * @see ROUTE_DEFAULT_AFTER_SIGN_IN
 *          this the route a user is redirected to after
 *          signing.
 */
const publicRoutes = FlowRouter.group({
    name: 'public',
    triggersEnter: [
        (context, redirect) => {
            if (Meteor.user()) {
                const redirectRoute = firstGrantedRoute(ROUTE_DEFAULT_AFTER_SIGN_IN);
                redirect(redirectRoute);
            }
        },
    ],
});


/**
 *  Definition of Routes
 *
 *  Please see the FlowRouter documentation for details on this.
 */
publicRoutes.route('/', {
    name: 'root',
    action() {
        FlowRouter.redirect('/signin');
    },
});

publicRoutes.route('/privacy-policy', {
    name: 'privacy-policy',
    action() {
        mount(PublicPages, {
            main: <PrivacyPolicy />,
            classes: ['page-document'],
        });
    },
});

publicRoutes.route('/info', {
    name: 'info',
    action() {
        mount(PublicPages, {
            main: <Info />,
            classes: ['page-document'],
        });
    },
});

publicRoutes.route('/terms-and-conditions', {
    name: 'terms-and-conditions',
    action() {
        mount(PublicPages, {
            main: <TermsAndConditions />,
            classes: ['page-document'],
        });
    },
});

publicRoutes.route('/signin', {
    name: 'signin',
    action() {
        mount(PublicPages, {
            main: <SignIn />,
            classes: ['page-sign-in'],
        });
    },
});

publicRoutes.route('/forgot-password', {
    name: 'forgot-password',
    action() {
        mount(PublicPages, {
            main: <ForgotPassword />,
        });
    },
});

publicRoutes.route('/reset-password/:token', {
    name: 'reset-password',
    action(params) {
        mount(PublicPages, {
            main: (
                <ResetPassword token={params.token} />
            ),
        });
    },
});
