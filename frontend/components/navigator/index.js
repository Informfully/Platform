import { createSwitchNavigator, createAppContainer } from 'react-navigation';
import { PublicNavigator } from './PublicNavigator';
import { getInitialRouteName } from '../../lib/utils/navigator';
import { PrivateNavigator } from './PrivateNavigator';
import { SurveyNavigator } from './SurveyNavigator';

/**
 * Navigator that is used as the root navigator of the application.
 * This is the entry point of the application. Every navigation that
 * is used in the application is initially added here.
 *
 * This navigator also applies the authentication flow using two diff-
 * erent navigators as screens.
 *
 *
 * @see PrivateNavigator
 *          Navigator used for authenticated users. Every screen that
 *          is hidden and requires a user to be authenticated is in-
 *          side the {@link PrivateNavigator}.
 *
 * @see PublicNavigator
 *          Navigator used for non-authenticated users. Every screen
 *          that is public and can be opened without being authenti-
 *          cated is inside the {@link PublicNavigator}.
 *
 * @param signedIn
 *          Boolean that indicates whether the current user is signed
 *          in. By default, this value is set to false and will be set
 *          automatically whenever a user signs in or out.
 *
 *          This parameter is provided by {@link App#withTracker} and
 *          is reactively updated inside the component.
 *
 * @param hasAnsweredSurvey
 *          Boolean that indicates whether the currently signed in user
 *          has answered the registration survey. By default, this value
 *          is set to true and will be set automatically whenever a user
 *          signs in.
 *
 * @see getInitialRouteName
 *          The function that returns the navigator that is used. It is
 *          given the boolean parameters signedIn and hasAnsweredSurvey.
 */
export const createRootNavigation = (signedIn = false, hasAnsweredSurvey = true, tutorialDone = false) => createAppContainer(
    createSwitchNavigator({
        SignedIn: {
            screen: PrivateNavigator(tutorialDone),
        },
        SignedOut: {
            screen: PublicNavigator,
        },
        Survey: {
            screen: SurveyNavigator,
        },
    }, {
        initialRouteName: getInitialRouteName(signedIn, hasAnsweredSurvey),
    })
);
