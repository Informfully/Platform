import { createSwitchNavigator, createAppContainer } from 'react-navigation';
import WelcomeScreen from '../survey/WelcomeScreen';
import Survey from '../screens/Survey';

export const SurveyNavigator = createAppContainer(
    createSwitchNavigator({
        Welcome: {
            screen: WelcomeScreen,
        },
        Survey: {
            screen: Survey,
        },
    }, {
        // WelcomeScreen has been disabled, uncomment next line to enable it again (and comment the next one)
        // initialRouteName: 'Welcome',
        initialRouteName: 'Survey',
    })
);
