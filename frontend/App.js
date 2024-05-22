/* eslint-disable global-require */
import React, { PureComponent } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, Appearance } from 'react-native';
import Meteor, { withTracker } from '@meteorrn/core';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';

import { createRootNavigation } from './components/navigator';
import Loading from './components/screens/Loading';
import { getActiveRouteName, getActiveRouteParams } from './lib/utils/navigator';
import MeteorOffline from './lib/meteorOffline/MeteorOffline';
import { DynamicColors } from './styles';
import { collectionManager } from './lib/utils/collectionManager';
import StorageKeys from './components/utils/StorageKeys';


// when running in Expo client, do not show yellow box for react-native-i18n linking warning
console.ignoredYellowBox = ['react-native-i18n module is not correctly linked'];

const SERVER = 'wss://your.domain/websocket';
// const SERVER = 'localhost';
// const SERVER = 'ws://192.168.0.22:3008/websocket';
// const SERVER = 'ws://192.168.43.24:3008/websocket';

if (SERVER === 'localhost' && Platform.OS === 'ios') {
    Meteor.connect('ws://localhost:3008/websocket');
} else if (SERVER === 'localhost') {
    Meteor.connect('ws://10.0.2.2:3008/websocket');
} else {
    Meteor.connect(SERVER);
}

class App extends PureComponent {

    constructor(props) {
        super(props);

        this.state = {
            expoFontsLoading: true,
            asyncStorageTutorialLoading: true,
            asyncStorageColorLoading: true,
        };

        AsyncStorage.getItem(StorageKeys.TUTORIAL).then((res) => {
            this.setState({ asyncStorageTutorialLoading: false, tutorialDone: JSON.parse(res) });
        }).catch((e) => {
            this.setState({ asyncStorageTutorialLoading: false, tutorialDone: false });
            console.warn(e);
        });

        AsyncStorage.getItem(StorageKeys.COLOR_MODE).then((res) => {
            const paresedRes = JSON.parse(res);
            if (!paresedRes || paresedRes === StorageKeys.COLOR_MODE_VALUES.AUTO) {
                DynamicColors.setDarkMode(Appearance.getColorScheme() === 'dark');
                DynamicColors.setDeviceControlled(true);
            } else {
                DynamicColors.setDarkMode(paresedRes === 'dark');
                DynamicColors.setDeviceControlled(false);
            }
            this.setState({ asyncStorageColorLoading: false });
        }).catch((e) => {
            this.setState({ asyncStorageColorLoading: false });
            DynamicColors.setDarkMode(Appearance.getColorScheme() === 'dark');
            DynamicColors.setDeviceControlled(true);
            console.warn(e);
        });

        DynamicColors.setDarkMode(Appearance.getColorScheme() === 'dark');

        Appearance.addChangeListener(() => {
            if (DynamicColors.getDeviceControlled()) {
                DynamicColors.setDarkMode(Appearance.getColorScheme() === 'dark');
            }
        });
    }

    componentDidMount() {
        /*
        We only load fonts via expo so we can still debug the app via the expo client (i.e. using `npm start`).
        Make sure the variable has the same name as the file (without the .ttf ending) when adding new fonts.
        For the release version (installing the app on the device) the code below is not required. Instead you
        should run `react-native link` to add the fonts from the ./assets/fonts/ folder to the Android and Xcode
        projects. See https://link.medium.com/YNkCLtBtwT
        */
        try {
            // eslint-disable-next-line no-undef
            Font.loadAsync({
                // Roboto
                'Roboto-Black': require('./assets/fonts/Roboto/Roboto-Black.ttf'),
                'Roboto-BlackItalic': require('./assets/fonts/Roboto/Roboto-BlackItalic.ttf'),
                'Roboto-Bold': require('./assets/fonts/Roboto/Roboto-Bold.ttf'),
                'Roboto-BoldItalic': require('./assets/fonts/Roboto/Roboto-BoldItalic.ttf'),
                'Roboto-Italic': require('./assets/fonts/Roboto/Roboto-Italic.ttf'),
                'Roboto-Light': require('./assets/fonts/Roboto/Roboto-Light.ttf'),
                'Roboto-LightItalic': require('./assets/fonts/Roboto/Roboto-LightItalic.ttf'),
                'Roboto-Medium': require('./assets/fonts/Roboto/Roboto-Medium.ttf'),
                'Roboto-MediumItalic': require('./assets/fonts/Roboto/Roboto-MediumItalic.ttf'),
                'Roboto-Regular': require('./assets/fonts/Roboto/Roboto-Regular.ttf'),
                'Roboto-Thin': require('./assets/fonts/Roboto/Roboto-Thin.ttf'),
                'Roboto-ThinItalic': require('./assets/fonts/Roboto/Roboto-ThinItalic.ttf'),
                // Roboto_Slab
                'RobotoSlab-Bold': require('./assets/fonts/Roboto_Slab/RobotoSlab-Bold.ttf'),
                'RobotoSlab-Light': require('./assets/fonts/Roboto_Slab/RobotoSlab-Light.ttf'),
                'RobotoSlab-Regular': require('./assets/fonts/Roboto_Slab/RobotoSlab-Regular.ttf'),
                'RobotoSlab-Thin': require('./assets/fonts/Roboto_Slab/RobotoSlab-Thin.ttf'),
            }).then(() => {
                this.setState({ expoFontsLoading: false });
                console.log('Expo fonts loaded successfully.');
            });
        } catch (err) {
            console.log(
                'Could not load fonts via Expo. You are probably running the app outside the Expo client. Error: ',
                err.message
            );
            this.setState({ expoFontsLoading: false });
        }
    }

    handleNavigationStateChange(prevState, currentState) {
        const currentScreen = getActiveRouteName(currentState);
        const prevScreen = getActiveRouteName(prevState);
        let currentNrArticleRoutes = 0;
        let prevNrArticleRoutes = 0;

        if (prevScreen === currentScreen && currentScreen === 'Article') {
            currentNrArticleRoutes = currentState.routes[0].routes[0].index;
            prevNrArticleRoutes = prevState.routes[0].routes[0].index;
        }

        if (prevScreen !== currentScreen
            || (prevScreen === currentScreen && currentScreen === 'Article'
                && prevNrArticleRoutes !== currentNrArticleRoutes)
        ) {
            const currentParameters = getActiveRouteParams(currentState) || {};
            const prevParameters = getActiveRouteParams(prevState) || {};
            Meteor.call('pageViews.add', currentScreen, prevScreen, currentParameters, prevParameters);
            Meteor.call('pageViewsUpgrade.add', currentScreen, prevScreen, currentParameters, prevParameters);
        }
    }

    render() {
        const { isSignedIn, hasAnsweredSurvey } = this.props;
        const {
            expoFontsLoading, asyncStorageTutorialLoading, asyncStorageColorLoading, tutorialDone,
        } = this.state;

        if ( expoFontsLoading || asyncStorageTutorialLoading || asyncStorageColorLoading) {
            return <Loading />;
        }

        const Layout = createRootNavigation(isSignedIn, hasAnsweredSurvey, tutorialDone);
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <Provider store={MeteorOffline.store}>
                    <SafeAreaProvider>
                        <PersistGate loading={<Loading />} persistor={MeteorOffline.persistor}>
                            <Layout onNavigationStateChange={this.handleNavigationStateChange} />
                        </PersistGate>
                    </SafeAreaProvider>
                </Provider>
            </GestureHandlerRootView>
        );
    }

}

App.propTypes = {
    isSignedIn: PropTypes.bool.isRequired,
    hasAnsweredSurvey: PropTypes.bool.isRequired,
};

export default withTracker(() => {
    Meteor.subscribe('userData');
    Meteor.subscribe('surveys.unanswered');
    const hasAnsweredSurvey = !collectionManager.collection('unansweredSurveys').findOne();

    return {
        isSignedIn: !!MeteorOffline.user(),
        hasAnsweredSurvey,
    };
})(App);
