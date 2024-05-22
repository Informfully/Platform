import { createStackNavigator } from 'react-navigation-stack';
import { createAppContainer } from 'react-navigation';
import { INITIAL_ROUTE_NAME_PRIVATE } from '../../lib/parameters/navigation';
import { HomeScreenNavigator } from './HomeScreenNavigator';
import Tutorial from '../screens/Tutorial';

/**
 * Navigator that includes all screens that are hidden and for which
 * to access a user must be authenticated.
 * This navigator also includes further sub navigators inside the screens
 * of this navigator.
 *
 * @see HomeScreenNavigator
 *          the navigator that is used starting from the HomeScreen
 *
 * @param tutorialDone
 *          Indicates whether the user completed the tutorial already or not
 */
export const PrivateNavigator = (tutorialDone = false) => createAppContainer(
    createStackNavigator({
        Home: {
            screen: HomeScreenNavigator,
            navigationOptions: {
                headerShown: false,
            },
        },
        Tutorial: {
            screen: Tutorial,
            navigationOptions: {
                headerShown: false,
            },
        },
    },
    {
        initialRouteName: INITIAL_ROUTE_NAME_PRIVATE,
        // WARNING: Tutorial at beginning of app has been disabled. Uncomment next line to enable it again. Be aware
        // that in that case, there is a small bug in the navigation: "after completing the survey, when you first use
        // the floating menu button and press "back" in the Android navigation bar you get sent back to the first page
        // of the Tutorial"
        // initialRouteName: !tutorialDone ? "Tutorial" : INITIAL_ROUTE_NAME_PRIVATE,
        headerMode: 'screen',
    })
);
