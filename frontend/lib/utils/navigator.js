/**
 * Returns the route name to be used when the app is initialized.
 * If the current user is remembered and thus still signed in,
 * we redirect the user to the private section of the app and
 * otherwise to the public session.
 * If a user is signed in already and has not yet answered the
 * survey, that user will be sent to the survey screen.
 *
 * Note that the return values in this function are equivalent
 * with the keys in {@link createRootNavigation}.
 *
 * @see createRootNavigation
 *          function that uses this function
 *
 * @param signedIn
 *          boolean; whether the user is already signed in
 * @param hasAnsweredSurvey
 *          boolean; whether the user has already answered
 *          the survey
 *
 * @returns {string}
 *          name of the route to use
 */
export function getInitialRouteName(signedIn, hasAnsweredSurvey) {
    if (!signedIn) {
        return 'SignedOut';
    }

    // users that haven't answered the survey yet should be shown
    // the survey screen(s)
    if (!hasAnsweredSurvey) {
        return 'Survey';
    }

    // all signed in users that answered the survey will be able to
    // see the private routes of the application
    return 'SignedIn';
}

export function getActiveRouteName(navigationState) {
    if (!navigationState) {
        return null;
    }

    const route = navigationState.routes[navigationState.index];
    // dive into nested navigators
    if (route.routes) {
        return getActiveRouteName(route);
    }
    return route.routeName;
}

export function getActiveRouteParams(navigationState) {
    if (!navigationState) {
        return null;
    }

    const route = navigationState.routes[navigationState.index];

    // dive into nested navigators
    if (route.routes) {
        return getActiveRouteParams(route);
    }
    return route.params;
}
