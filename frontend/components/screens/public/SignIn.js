import React from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet, Text, View, TouchableOpacity, TextInput, Dimensions, ScrollView, Platform, StatusBar,
} from 'react-native';
import Meteor from '@meteorrn/core';
import {
    publicStyleGenerator, globalStyleGenerator, DynamicColors, withColor,
} from '../../../styles';
import Strong from '../../elements/Strong';
import I18n from '../../../lib/i18n/i18n';
import * as NavigationBar from 'expo-navigation-bar';

class SignIn extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            error: '',
            email: '',
            password: '',
            isSigningIn: false,
        };

        this.handlePressButton = this.handlePressButton.bind(this);
        this.handlePressForgotPassword = this.handlePressForgotPassword.bind(this);
    }

    get buttonText() {
        const { isSigningIn } = this.state;

        if (isSigningIn) {
            return I18n.t('GLOBAL.LOADING');
        }

        return I18n.t('SIGN_IN.SIGN_IN');
    }

    isValid() {
        const { email, password } = this.state;
        let valid = false;

        if (email.length > 0 && password.length > 0) {
            valid = true;
        }

        if (email.length === 0) {
            this.setState({ error: I18n.t('SIGN_IN.INVALID_EMAIL_MESSAGE') });
        } else if (password.length === 0) {
            this.setState({ error: I18n.t('SIGN_IN.EMPTY_PASSWORD_MESSAGE') });
        }

        return valid;
    }

    handlePressButton() {
        const { email, password } = this.state;

        if (this.isValid()) {
            this.setState({ isSigningIn: true });

            Meteor.loginWithPassword(email, password, (error) => {
                if (error) {
                    this.setState({ error: error.reason, isSigningIn: false });
                }
            });
        }
    }

    handlePressForgotPassword() {
        const { navigation } = this.props;
        navigation.navigate('ForgotPassword');
    }

    render() {
        const { error } = this.state;
        const { navigation } = this.props;

        if(Platform.OS === 'android'){
            NavigationBar.setBackgroundColorAsync(DynamicColors.getColors().PRIMARY_BACKGROUND);
        }

        const content = (
            <View
                style={[ publicStyleGenerator().container, styles().container ]}
            >
                {Platform.OS === 'ios'
                    ? <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} /> : <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} backgroundColor={DynamicColors.getColors().PRIMARY_BACKGROUND}/>}
                <View style={styles().header}>
                    <Text style={publicStyleGenerator().title}>Informfully</Text>
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
                        onChangeText={email => this.setState({ email, error: '' })}
                        placeholder={I18n.t('SIGN_IN.EMAIL_PLACEHOLDER')}
                        placeholderTextColor={DynamicColors.getColors().ACCENT_TEXT}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        underlineColorAndroid="transparent"
                    />

                    <TextInput
                        style={publicStyleGenerator().input}
                        placeholder={I18n.t('SIGN_IN.PASSWORD_PLACEHOLDER')}
                        onChangeText={password => this.setState({ password, error: '' })}
                        placeholderTextColor={DynamicColors.getColors().ACCENT_TEXT}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                        underlineColorAndroid="transparent"
                    />

                    <TouchableOpacity
                        style={publicStyleGenerator().button}
                        onPress={this.handlePressButton}
                    >
                        <Text style={publicStyleGenerator().buttonText}>
                            {this.buttonText}
                        </Text>
                    </TouchableOpacity>

                    <Text style={publicStyleGenerator().text}>
                        {I18n.t('SIGN_IN.NO_ACCOUNT_YET')}
                    </Text>
                    {/* <TouchableOpacity
                        style={styles().linkContainer}
                        onPress={() => navigation.navigate('SignUp')}
                    >
                        <Strong style={publicStyleGenerator().linkText}>
                            {I18n.t('SIGN_IN.SIGN_UP')}
                        </Strong>
                    </TouchableOpacity> */}
                </View>
                {/* <View style={styles().footer}> */}
                {/*    <Text style={styles().footerText} onPress={this.handlePressForgotPassword}> */}
                {/*        {I18n.t('SIGN_IN.FORGOT_PASSWORD_BUTTON_TEXT')} */}
                {/*    </Text> */}
                {/* </View> */}
            </View>
        );

        return Platform.OS == 'ios' ? content : (
            <ScrollView style={styles().scrollView}>
                {content}
            </ScrollView>
        );
    }

}

SignIn.propTypes = {
    navigation: PropTypes.object.isRequired,
};

const fullHeight = Dimensions.get('window').height;

const styles = () => StyleSheet.create({
    scrollView: {
        height: fullHeight,
    },
    container: {
        paddingTop: '3%',
        paddingBottom: '5%',
        height: fullHeight,
    },
    header: {
        paddingTop: 60,
        flex: 1,
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
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    errorContainer: {
        paddingTop: 15,
        flex: 0.5,
        alignItems: 'center',
    },
    footerText: {
        opacity: 0.85,
        color: DynamicColors.getColors().PRIMARY_TEXT,
    },
    linkContainer: {
        marginBottom: -3,
    },
});

export default withColor(SignIn);
