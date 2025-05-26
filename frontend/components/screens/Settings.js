import React, { Fragment } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Appearance, Platform, StatusBar,
} from 'react-native';
import { withNavigation } from 'react-navigation';
import Meteor, { withTracker } from '@meteorrn/core';
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import I18n from '../../lib/i18n/i18n';
import ModalWebView from './ModalWebView';
import SimpleModal from '../elements/SimpleModal';
import Loading from './Loading';
import Selection from '../survey/answer/Selection';
import {
    TERMS_AND_CONDITIONS_URL,
    TERMS_AND_CONDITIONS_HTML,
    PRIVACY_POLICY_URL,
    PRIVACY_POLICY_HTML,
    HOMEPAGE_URL,
    HOMEPAGE_HTML,
    DELETEACCOUNT_URL,
    DELETEACCOUNT_HTML,
} from '../../config';
import MeteorOffline from '../../lib/meteorOffline/MeteorOffline';
import { userIsInRole } from '../../lib/utils/utils_user';
import { DynamicColors, withColor } from '../../styles';
import {
    FONT_FAMILY,
} from '../../styles/variables';
import StorageKeys from '../utils/StorageKeys';
import { collectionManager } from '../../lib/utils/collectionManager';
import { Collapse,CollapseHeader, CollapseBody } from 'accordion-collapse-react-native';
import * as NavigationBar from 'expo-navigation-bar';


/**
 * Returns the i18n string for a given color mode
 * @param {string} key
 * @returns
 */
const colorKeyToI18nKey = (key) => {
    if (key == StorageKeys.COLOR_MODE_VALUES.DARK) {
        return 'COLOR_SCHEME.DARK';
    } if (key == StorageKeys.COLOR_MODE_VALUES.LIGHT) {
        return 'COLOR_SCHEME.LIGHT';
    }
    return 'COLOR_SCHEME.AUTO';
};

class ColorShemeModal extends React.Component {

    constructor(props) {
        super(props);
        this.state = { selected: props.initValue || StorageKeys.COLOR_MODE_VALUES.AUTO };
    }

    get options() {
        return [ StorageKeys.COLOR_MODE_VALUES.AUTO, StorageKeys.COLOR_MODE_VALUES.LIGHT, StorageKeys.COLOR_MODE_VALUES.DARK ].map((key, index) => (
            <Selection
                key={key}
                index={index}
                text={I18n.t(colorKeyToI18nKey(key))}
                onPressItem={() => this.setState({ selected: key })}
                selected={this.state.selected == key}
                style={styles().modalItem}
                styleSelected={styles().modalItemSelected}
            >
                {key}
            </Selection>
        ));
    }

    render() {
        const { onConfirm, visible, onClose } = this.props;
        
        if(Platform.OS === 'android'){
            NavigationBar.setBackgroundColorAsync(DynamicColors.getColors().PRIMARY_BACKGROUND);
        }

        return (
            <SimpleModal
                isVisible={visible}
                closeModal={onClose}
                confirm={() => onConfirm(this.state.selected)}
                style={styles().modalContainer}
            >
                {this.options}
            </SimpleModal>
        );
    }

}

class Settings extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            termsAndConditionsVisible: false, // terms and conditions popup screen
            privacyPolicyVisible: false, // privacy policy popup screen
            homePageVisible: false, // app website popup screen
            deleteAccountVisible: false, // delete account popup screen
            colorShemeModalVisible: false,
            loadingColor: true,
            colorValue: '',
            expTermsAndConditionsVisible: false, // experiment terms and conditions popup screen
            expPrivacyPolicyVisible: false, // experiment privacy policy popup screen
        };

        AsyncStorage.getItem(StorageKeys.COLOR_MODE).then((res) => {
            this.setState({ colorValue: JSON.parse(res) || StorageKeys.COLOR_MODE_VALUES.AUTO, loadingColor: false });
        }).catch((err) => {
            this.setState({ colorValue: StorageKeys.COLOR_MODE_VALUES.AUTO, loadingColor: false });
            console.warn(err);
        });

        this.setTermsAndConditionsVisible = this.setTermsAndConditionsVisible.bind(this);
        this.setPrivacyPolicyVisible = this.setPrivacyPolicyVisible.bind(this);
        this.setExpTermsAndConditionsVisible = this.setExpTermsAndConditionsVisible.bind(this);
        this.setExpPrivacyPolicyVisible = this.setExpPrivacyPolicyVisible.bind(this);
        this.setHomePageVisible = this.setHomePageVisible.bind(this);
        this.setDeleteAccountVisible = this.setDeleteAccountVisible.bind(this);
    }

    get adminOptions() {
        return (
            <Fragment>
                <TouchableOpacity
                    style={styles().listItem}
                    onPress={() => { Meteor.call('user.surveys.reset'); }}
                >
                    <Text style={styles().listItemText}>{I18n.t('SETTINGS.RESET_SURVEY')}</Text>
                </TouchableOpacity>
                <View style={styles().itemSeparator} />
            </Fragment>
        );
    }

    getUserEmailAddress() {
        const { user } = this.props;
        if (user && user.emails && user.emails[0].address) {
            return user.emails[0].address;
        }
        return '';
    }

    getUserFullName() {
        const { user } = this.props;
        if (user && user.profile && user.profile.fullName) {
            return user.profile.fullName;
        } if (user.username) {
            return user.username;
        }
        return 'User';
    }

    setTermsAndConditionsVisible(visible) {
        this.setState({
            termsAndConditionsVisible: visible,
        });
    }

    setPrivacyPolicyVisible(visible) {
        this.setState({
            privacyPolicyVisible: visible,
        });
    }

    setExpTermsAndConditionsVisible(visible) {
        this.setState({
            expTermsAndConditionsVisible: visible,
        });
    }

    setExpPrivacyPolicyVisible(visible) {
        this.setState({
            expPrivacyPolicyVisible: visible,
        });
    }

    setHomePageVisible(visible) {
        this.setState({
            homePageVisible: visible,
        });
    }

    setDeleteAccountVisible(visible) {
        this.setState({
            deleteAccountVisible: visible,
        });
    }

    setColorSchemeModalVisible(visible) {
        this.setState({
            colorShemeModalVisible: visible,
        });
    }

    setColorValue(value) {
        if (value != StorageKeys.COLOR_MODE_VALUES.AUTO) {
            DynamicColors.setDarkMode(value == StorageKeys.COLOR_MODE_VALUES.DARK);
            DynamicColors.setDeviceControlled(false);
        } else {
            DynamicColors.setDarkMode(Appearance.getColorScheme() == 'dark');
            DynamicColors.setDeviceControlled(true);
        }
        AsyncStorage.setItem(StorageKeys.COLOR_MODE, JSON.stringify(value)).then((res) => {
            this.setState({ colorValue: value, colorShemeModalVisible: false });
        });
    }

    render() {
        const {
            termsAndConditionsVisible, expPrivacyPolicyVisible, expTermsAndConditionsVisible, privacyPolicyVisible, homePageVisible, deleteAccountVisible, colorShemeModalVisible, colorValue, loadingColor, logingOut,
        } = this.state;

        const {
            expName,
            expDescription,
            urlPP,
            urlTC
        } = this.props;

        if (loadingColor || logingOut) {
            return <Loading />;
        }

        return (
            <View style={styles().safeArea}>
                {Platform.OS === 'ios' ? <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} /> : <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} backgroundColor={DynamicColors.getColors().PRIMARY_BACKGROUND}/>}
                <ScrollView
                    style={styles().scrollView}

                    // FIX for bug in ios 13, scroll Views all over the place
                    scrollIndicatorInsets={{ right: 1 }}
                >
                    <View style={styles().header}>
                        <Text style={styles().userName}>{this.getUserFullName()}</Text>
                        <Text style={styles().userEmail}>{this.getUserEmailAddress()}</Text>
                    </View>

                    <Collapse>
                        <CollapseHeader>
                            <View style={styles().listItem}>
                                <Text style={styles().listHeader}>{I18n.t('SETTINGS.EXP_INFO')}</Text>
                            </View>
                            <View style={styles().itemSeparator} />
                        </CollapseHeader>
                        <CollapseBody>
                            <View style={styles().itemSeparator} />
                            <View
                                style={styles().listItem}
                            >
                                <Text style={styles().listItemText}>{I18n.t('SETTINGS.EXP_NAME')}{expName}</Text>
                            </View>
                            <View style={styles().itemSeparator} />
                            <View
                                style={styles().listItem}
                            >
                                <Text style={styles().listItemText}>{I18n.t('SETTINGS.EXP_DESCRIPTION')}{"\n"}{expDescription}</Text>
                            </View>
                            <View style={styles().itemSeparator} />
                            <TouchableOpacity
                                style={styles().listItem}
                                onPress={() => { this.setExpTermsAndConditionsVisible(true); }}
                            >
                                <Text style={styles().listItemText}>{I18n.t('SETTINGS.TERMS_CONDITIONS')}</Text>
                            </TouchableOpacity>
                            <View style={styles().itemSeparator} />
                            <TouchableOpacity
                                style={styles().listItem}
                                onPress={() => { this.setExpPrivacyPolicyVisible(true); }}
                            >
                                <Text style={styles().listItemText}>{I18n.t('SETTINGS.PRIVACY_POLICY')}</Text>
                            </TouchableOpacity>
                            <View style={styles().itemSeparator} />
                        </CollapseBody>
                    </Collapse>

                    <View style={styles().itemSpace} />

                    {/* <Collapse>
                        <CollapseHeader>
                            <View style={styles().listItem}>
                                <Text style={styles().listHeader}>{I18n.t('SETTINGS.APP_INFO')}</Text>
                            </View>
                            <View style={styles().itemSeparator} />
                        </CollapseHeader>
                        <CollapseBody>
                            <View style={styles().itemSeparator} />
                            <TouchableOpacity
                                style={styles().listItem}
                                onPress={() => { this.setHomePageVisible(true); }}
                            >
                                <Text style={styles().listItemText}>{I18n.t('SETTINGS.HOMEPAGE')}</Text>
                            </TouchableOpacity>
                            <View style={styles().itemSeparator} />
                            <TouchableOpacity
                                style={styles().listItem}
                                onPress={() => { this.setTermsAndConditionsVisible(true); }}
                            >
                                <Text style={styles().listItemText}>{I18n.t('SETTINGS.TERMS_CONDITIONS')}</Text>
                            </TouchableOpacity>
                            <View style={styles().itemSeparator} />
                            <TouchableOpacity
                                style={styles().listItem}
                                onPress={() => { this.setPrivacyPolicyVisible(true); }}
                            >
                                <Text style={styles().listItemText}>{I18n.t('SETTINGS.PRIVACY_POLICY')}</Text>
                            </TouchableOpacity>
                            <View style={styles().itemSeparator} />
                            <TouchableOpacity
                                style={styles().listItem}
                                onPress={() => { this.props.navigation.navigate('Contact'); }}

                            >
                                <Text style={styles().listItemText}>{I18n.t('SETTINGS.CONTACT')}</Text>
                        </TouchableOpacity>

                        <View style={styles().itemSeparator} />
                        </CollapseBody>
                    </Collapse> */}

                    <View style={styles().clickableItems}>
                        <View style={styles().itemSpace} />
                        <View style={styles().itemSeparator} />
                        <TouchableOpacity
                            style={styles().listItem}
                            onPress={() => { this.setColorSchemeModalVisible(true); }}
                        >
                            <Text style={styles().listItemText}>{I18n.t('SETTINGS.COLOR_SCHEME') + I18n.t(colorKeyToI18nKey(colorValue))}</Text>
                        </TouchableOpacity>
                        <View style={styles().itemSeparator} />

                        {/* <TouchableOpacity
                            style={styles().listItem}
                            onPress={() => { this.props.navigation.navigate('Tutorial'); }}
                        >
                            <Text style={styles().listItemText}>{I18n.t('SETTINGS.RETAKE_TUTORIAL')}</Text>
                        </TouchableOpacity> */}
                        <View style={styles().itemSeparator} />
                        
                        <View style={styles().itemSpace} />
                        <View style={styles().itemSeparator} />
                        <TouchableOpacity
                            style={styles().listItem}
                            onPress={() => {
                                MeteorOffline.logout();
                                this.setState({ logingOut: true });
                            }}
                        >
                            <Text style={styles().listItemText}>{I18n.t('SETTINGS.SIGN_OUT')}</Text>
                        </TouchableOpacity>
                        <View style={styles().itemSeparator} />
                        <TouchableOpacity
                            style={styles().listItem}
                            onPress={() => { this.setDeleteAccountVisible(true); }}
                        >
                            <Text style={styles().listItemText}>{I18n.t('SETTINGS.DELETE_ACCOUNT')}</Text>
                        </TouchableOpacity>
                        <View style={styles().itemSeparator} />

                        {userIsInRole(MeteorOffline.user(), 'admin') ? this.adminOptions : null}

                    </View>
                </ScrollView>

                {/* pass in either 'url' or 'html' as a prop to the ModalWebView,
                    if 'html' is given it will take precedence over 'url' */}
                <ModalWebView
                    visible={homePageVisible}
                    onWebviewClose={() => { this.setHomePageVisible(false); }}
                    url={HOMEPAGE_URL}
                    html={HOMEPAGE_HTML}
                />
                <ModalWebView
                    visible={deleteAccountVisible}
                    onWebviewClose={() => { this.setDeleteAccountVisible(false); }}
                    url={DELETEACCOUNT_URL}
                    html={DELETEACCOUNT_HTML}
                />
                <ModalWebView
                    visible={termsAndConditionsVisible}
                    onWebviewClose={() => { this.setTermsAndConditionsVisible(false); }}
                    url={TERMS_AND_CONDITIONS_URL}
                    html={TERMS_AND_CONDITIONS_HTML}
                />
                <ModalWebView
                    visible={privacyPolicyVisible}
                    onWebviewClose={() => { this.setPrivacyPolicyVisible(false); }}
                    url={PRIVACY_POLICY_URL}
                    html={PRIVACY_POLICY_HTML}
                />
                <ModalWebView
                    visible={expTermsAndConditionsVisible}
                    onWebviewClose={() => { this.setExpTermsAndConditionsVisible(false); }}
                    url={urlTC}
                />
                <ModalWebView
                    visible={expPrivacyPolicyVisible}
                    onWebviewClose={() => { this.setExpPrivacyPolicyVisible(false); }}
                    url={urlPP}
                />
                {colorShemeModalVisible && (
                    <ColorShemeModal
                        visible={colorShemeModalVisible}
                        onClose={() => this.setColorSchemeModalVisible(false)}
                        onConfirm={key => this.setColorValue(key)}
                        initValue={this.state.colorValue}
                    />
                )}
            </View>
        );
    }

}

Settings.propTypes = {
    user: PropTypes.object,
    feedbackEmail: PropTypes.string,
    expName: PropTypes.string,
    expDescription: PropTypes.string,
    urlPP: PropTypes.string,
    urlTC: PropTypes.string
};

Settings.defaultProps = {
    user: null,
    feedbackEmail: 'placeholder@your.domain',
    expName: 'default experiment',
    expDescription: 'This is efault experiment',
    urlPP: 'https://your.domain/privacy',
    urlTC: 'https://your.domain/terms'
};

const styles = () => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
    },
    scrollView: {
        paddingTop: 0,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    clickableItems: {
        alignItems: 'center',
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 32,
        color: DynamicColors.getColors().PRIMARY_TEXT,
    },
    userEmail: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: '500',
        color: DynamicColors.getColors().PRIMARY_TEXT,
    },
    listHeader: {
        fontWeight: 'bold',
        fontStyle: 'italic',
        fontSize: 16,
        fontWeight: '500',
        color: DynamicColors.getColors().PRIMARY_TEXT,
    },
    listItem: {
        flexDirection: 'row',
        backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
        width: '100%',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    itemSeparator: {
        backgroundColor: DynamicColors.getColors().CARD_TEXT,
        height: 0.5,
        width: '100%',
    },
    itemSpace: {
        height: 20,
    },
    listItemText: {
        color: DynamicColors.getColors().CARD_TEXT,
    },
    modalItem: {
        color: DynamicColors.getColors().CARD_TEXT,
        textAlign: 'center',
        paddingTop: 12,
        paddingBottom: 12,
        fontFamily: FONT_FAMILY.TEXT,
        borderWidth: 1,
        borderColor: DynamicColors.getColors().CARD_TEXT,
        backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
        borderRadius: 22,
        marginBottom: 8,
    },

    modalItemSelected: {
        color: DynamicColors.getColors().ACCENT_TEXT,
        backgroundColor: DynamicColors.getColors().ACCENT_BACKGROUND,
        borderColor: DynamicColors.getColors().ACCENT_TEXT,
    },
    modalContainer: {
        flexDirection: 'column',
        maxWidth: '100%',
    },
});

export default withNavigation(
    withTracker(() => {
        // Reuse subscription from Home.js for activeExperiment or experiments
        const config = collectionManager.collection('activeExperiment').findOne() || collectionManager.collection('experiments').findOne() || {};

        return {
            user: MeteorOffline.user(),
            feedbackEmail: config.feedbackEmail,
            expName: config.name,
            expDescription: config.description,
            urlPP: config.urlPP,
            urlTC: config.urlTC
        };
    })(withColor(Settings))
);
