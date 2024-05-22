import React from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, TextInput, Dimensions, ScrollView, Platform, StatusBar,
} from 'react-native';
import Meteor, { Accounts } from '@meteorrn/core';
import PropTypes from 'prop-types';
import ModalWebView from '../ModalWebView';
import {
    TERMS_AND_CONDITIONS_URL,
    TERMS_AND_CONDITIONS_HTML,
    PRIVACY_POLICY_URL,
    PRIVACY_POLICY_HTML,
} from '../../../config';
import { publicStyleGenerator, globalStyleGenerator, withColor, DynamicColors } from '../../../styles';
import Strong from '../../elements/Strong';
import I18n from '../../../lib/i18n/i18n';
import { validateEmail } from '../../../lib/utils/utils_email';
import * as NavigationBar from 'expo-navigation-bar';

class SignUp extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            fullName: '',
            email: '',
            password: '',
            error: '',
            termsAndConditionsVisible: false, // terms and conditions popup screen
            privacyPolicyVisible: false, // privacy policy popup screen
        };

        this.setTermsAndConditionsVisible = this.setTermsAndConditionsVisible.bind(this);
        this.setPrivacyPolicyVisible = this.setPrivacyPolicyVisible.bind(this);
        this.handleClickButton = this.handleClickButton.bind(this);
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

    isValid() {
        const { fullName, email, password } = this.state;

        if (!fullName) {
            this.setState({ error: I18n.t('SIGN_UP.EMPTY_NAME_MESSAGE') });
            return false;
        }

        if (!email) {
            this.setState({ error: I18n.t('SIGN_UP.EMPTY_EMAIL_MESSAGE') });
            return false;
        }

        if (!validateEmail(email)) {
            this.setState({ error: I18n.t('SIGN_UP.INVALID_EMAIL_MESSAGE') });
            return false;
        }

        if (!password) {
            this.setState({ error: I18n.t('SIGN_UP.EMPTY_PASSWORD_MESSAGE') });
            return false;
        }

        return true;
    }

    handleClickButton() {
        const { fullName, email, password } = this.state;

        if (this.isValid()) {
            Accounts.createUser({ fullName, email, password }, (err) => {
                if (err) {
                    const { reason } = err;
                    if (reason === 'Invalid User') {
                        this.setState({ error: I18n.t('SIGN_UP.EMAIL_ALREADY_EXISTS') });
                    } else {
                        this.setState({ error: err.reason });
                    }
                } else {
                    // for some reason, meteor won't update Meteor.userId()
                    // or Meteor.user() in react-native when registering.
                    // Thus, to reactively redirect the user and signing
                    // him in, we call this function manually here.
                    Meteor.loginWithPassword(email, password, (loginError) => {
                        if (err) {
                            this.setState({ error: loginError.reason });
                        }
                    });
                }
            });
        }
    }

    render() {
        const { termsAndConditionsVisible, privacyPolicyVisible, error } = this.state;
        const { navigation } = this.props;
        if(Platform.OS === 'android'){
            NavigationBar.setBackgroundColorAsync(DynamicColors.getColors().PRIMARY_BACKGROUND);
        }

        let content = (
            <View style={[publicStyleGenerator().container, styles().container]}>

                {Platform.OS === 'ios'
                                    ? <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} /> : <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} backgroundColor={DynamicColors.getColors().PRIMARY_BACKGROUND}/>}

                <View style={styles().header}>
                    <Text style={publicStyleGenerator().title}>{I18n.t('SIGN_UP.TITLE')}</Text>
                </View>

                <View style={styles().errorContainer}>
                    {error
                        ? (
                            <Text style={globalStyleGenerator().errorTextOnPrimary}>
                                {error}
                            </Text>
                        )
                        : null
                    }
                </View>

                <View style={styles().body}>

                    <TextInput
                        style={publicStyleGenerator().input}
                        onChangeText={fullName => this.setState({ fullName, error: '' })}
                        placeholder={I18n.t('SIGN_UP.FULLNAME_PLACEHOLDER')}
                        placeholderTextColor={DynamicColors.getColors().ACCENT_TEXT}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        underlineColorAndroid="transparent"
                    />

                    <TextInput
                        style={publicStyleGenerator().input}
                        onChangeText={email => this.setState({ email, error: '' })}
                        placeholder={I18n.t('SIGN_UP.EMAIL_PLACEHOLDER')}
                        placeholderTextColor={DynamicColors.getColors().ACCENT_TEXT}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        underlineColorAndroid="transparent"
                    />

                    <TextInput
                        style={publicStyleGenerator().input}
                        onChangeText={password => this.setState({ password, error: '' })}
                        placeholder={I18n.t('SIGN_UP.PASSWORD_PLACEHOLDER')}
                        placeholderTextColor={DynamicColors.getColors().ACCENT_TEXT}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                        underlineColorAndroid="transparent"
                    />

                    <TouchableOpacity
                        style={publicStyleGenerator().button}
                        onPress={this.handleClickButton}
                    >
                        <Text style={publicStyleGenerator().buttonText}>{I18n.t('SIGN_UP.CREATE_ACCOUNT')}</Text>
                    </TouchableOpacity>

                    <Text style={publicStyleGenerator().text}>
                        {I18n.t('SIGN_UP.ALREADY_HAVE_ACCOUNT')}
                    </Text>
                    <TouchableOpacity
                        style={styles().link}
                        onPress={() => navigation.navigate('SignIn')}
                    >
                        <Strong style={publicStyleGenerator().linkText}>
                            {I18n.t('SIGN_UP.SIGN_IN')}
                        </Strong>
                    </TouchableOpacity>

                </View>
                <View style={styles().footer}>
                    <Text style={styles().footerText}>
                        {I18n.t('SIGN_UP.DISCLAIMER_01')}
                        <Text
                            style={{ fontWeight: 'bold' }}
                            onPress={() => { this.setTermsAndConditionsVisible(true); }}
                        >
                            {I18n.t('SIGN_UP.TERMS_CONDITIONS')}
                        </Text>
                        {I18n.t('SIGN_UP.DISCLAIMER_02')}

                        <Text
                            style={{ fontWeight: 'bold' }}
                            onPress={() => { this.setPrivacyPolicyVisible(true); }}
                        >
                            {I18n.t('SIGN_UP.PRIVACY_POLICY')}
                        </Text>
                        .
                    </Text>
                </View>

                {/* pass in either 'url' or 'html' as a prop to the ModalWebView,
                    if 'html' is given it will take precedence over 'url' */}
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
            </View>
        );

        return Platform.OS == 'ios' ? content : (
            <ScrollView style={styles().scrollView}>
                {content}
            </ScrollView>
        );
    }

}

SignUp.propTypes = {
    navigation: PropTypes.object.isRequired,
};

const fullHeight = Dimensions.get('window').height;

const styles = () => {
    return StyleSheet.create({
        scrollView: {
            height: fullHeight
        },
        container: {
            paddingTop: '3%',
            paddingBottom: '5%',
            height: fullHeight,
        },
        header: {
            paddingTop: 60,
            flex: 0.8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        body: {
            flex: 6,
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
        footer: {
            flex: 1,
            justifyContent: 'flex-end',
        },
        errorContainer: {
            paddingTop: 15,
            flex: 0.4,
            alignItems: 'center',
        },
        footerText: {
            opacity: 0.85,
            color: DynamicColors.getColors().PRIMARY_TEXT,
        },
        link: {
            marginBottom: -3,
        },
    });
};

export default withColor(SignUp);
