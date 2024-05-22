import {
    StyleSheet, View, TouchableWithoutFeedback, Platform,
} from 'react-native';
import React from 'react';
import { createStackNavigator } from 'react-navigation-stack';
import ReadingList from '../screens/ReadingList';
import FavouritesList from '../screens/FavouritesList';
import Settings from '../screens/Settings';
import Home from '../screens/Home';
import Article from '../screens/Article';
import Contact from '../screens/Contact';
import { DynamicColors } from '../../styles';
import I18n from '../../lib/i18n/i18n';

/**
 * Navigator used for the home screen of the application.
 * Contains all Views that the user would normally visit during the usage of the app
 */
export const HomeScreenNavigator = createStackNavigator({
    Home: {
        screen: Home,
        navigationOptions: {
            headerShown: false,
        },
    },
    ReadingList: {
        screen: ReadingList,
        navigationOptions: ({ navigation }) => ({
            headerShown: true,
            title: I18n.translate('NAVIGATION.READING_LIST'),
            headerStyle: {
                backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
            },
            headerTitleStyle: {
                color: DynamicColors.getColors().CARD_TEXT,
            },
            headerTintColor: DynamicColors.getColors().CARD_TEXT,
        }),
    },
    FavouritesList: {
        screen: FavouritesList,
        navigationOptions: ({ navigation }) => ({
            headerShown: true,
            title: I18n.translate('NAVIGATION.FAVOURITES_LIST'),
            headerStyle: {
                backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
            },
            headerTitleStyle: {
                color: DynamicColors.getColors().CARD_TEXT,
            },
            headerTintColor: DynamicColors.getColors().CARD_TEXT,
        }),
    },
    Settings: {
        screen: Settings,
        navigationOptions: ({ navigation }) => ({
            headerShown: true,
            title: I18n.translate('NAVIGATION.SETTINGS'),
            headerStyle: {
                backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
            },
            headerTitleStyle: {
                color: DynamicColors.getColors().PRIMARY_TEXT,
            },
            headerTintColor: DynamicColors.getColors().CARD_TEXT,
        }),
    },
    Contact: {
        screen: Contact,
        navigationOptions: ({ navigation }) => ({
            headerShown: true,
            title: I18n.translate('NAVIGATION.CONTACT'),
            headerStyle: {
                backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
            },
            headerTitleStyle: {
                color: DynamicColors.getColors().PRIMARY_TEXT,
            },
            headerTintColor: DynamicColors.getColors().CARD_TEXT,
        }),
    },
    Article: {
        screen: Article,
        navigationOptions: ({ navigation }) => ({
            headerShown: true,
            title: '',
            headerStyle: {
                backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
            },
            headerTitleStyle: {
                color: DynamicColors.getColors().CARD_TEXT,
            },
            headerTintColor: DynamicColors.getColors().CARD_TEXT,
            headerRight: () => (
                <View style={styles().container}>
                    {navigation.getParam('showExplanationIcon')
                        ? (navigation.getParam('showExplanationIcon')()
                                    && (
                                        <TouchableWithoutFeedback
                                            onPress={() => navigation.getParam('explanationCallback')()}
                                            hitSlop={{
                                                top: 15, bottom: 15, left: 15, right: 15,
                                            }}
                                        >
                                            <View>
                                                {navigation.getParam('getExplanationElement') ? navigation.getParam('getExplanationElement')() : undefined}
                                            </View>
                                        </TouchableWithoutFeedback>
                                    )) : undefined
                    }

                    <TouchableWithoutFeedback
                        onPress={() => navigation.getParam('starCallback')()}
                        hitSlop={{
                            top: 15, bottom: 15, left: 15, right: 15,
                        }}
                    >
                        <View
                            style={styles().middleButtonContainer}
                        >
                            {navigation.getParam('getStarElement') ? navigation.getParam('getStarElement')() : undefined}
                        </View>
                    </TouchableWithoutFeedback>

                    <TouchableWithoutFeedback
                        onPress={() => navigation.getParam('bookmarkCallback')()}
                        hitSlop={{
                            top: 15, bottom: 15, left: 15, right: 15,
                        }}
                    >
                        <View>
                            {navigation.getParam('getBookmarkElement') ? navigation.getParam('getBookmarkElement')() : undefined}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            ),
        }),
    },
}, {
    initialRouteName: 'Home',
    headerMode: 'screen',
});

const styles = () => StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    middleButtonContainer: {
        marginLeft: 30,
        marginRight: 30,
    },
});
