import { createSwitchNavigator, createAppContainer } from 'react-navigation';
import SignIn from '../screens/public/SignIn';
import SignUp from '../screens/public/SignUp';
import { INITIAL_ROUTE_NAME_PUBLIC } from '../../lib/parameters/navigation';
import ForgotPassword from '../screens/public/ForgotPassword';

/**
 * Navigator for the public part of the application.
 * Includes only sign in and registration.
 */
export const PublicNavigator = createAppContainer(
    createSwitchNavigator({
        SignUp: {
            screen: SignUp,
        },
        SignIn: {
            screen: SignIn,
        },
        ForgotPassword: {
            screen: ForgotPassword,
        },
    }, {
        initialRouteName: INITIAL_ROUTE_NAME_PUBLIC,
    })
);
