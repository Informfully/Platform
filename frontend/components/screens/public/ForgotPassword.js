import React from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, TextInput, Dimensions, ScrollView, Platform, StatusBar,
} from 'react-native';
import { Accounts } from '@meteorrn/core';
import PropTypes from 'prop-types';
import * as NavigationBar from 'expo-navigation-bar';

import { publicStyleGenerator, globalStyleGenerator, DynamicColors, withColor } from '../../../styles';
import I18n from '../../../lib/i18n/i18n';

class ForgotPassword extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            email: '',
            errorMessage: '',
        };

        this.handleClickButton = this.handleClickButton.bind(this);
    }

    isValid() {
        const { email } = this.state;

        if (!email) {
            this.setState({ errorMessage: I18n.t('SIGN_UP.EMPTY_EMAIL_MESSAGE') });
            return false;
        }

        return true;
    }

    handleClickButton() {
        const { email } = this.state;

        if (this.isValid()) {
            Accounts.forgotPassword({ email }, (err) => {
                if (err) {
                    console.log(err);
                    if (err.reason === 'User not found') {
                        this.setState({ errorMessage: I18n.t('FORGOT_PASSWORD.USER_NOT_FOUND') });
                    } else {
                        this.setState({ errorMessage: err.reason });
                    }
                }
            });
        }
    }

    render() {
        const { errorMessage } = this.state;
        const { navigation } = this.props;

        if(Platform.OS === 'android'){
            NavigationBar.setBackgroundColorAsync(DynamicColors.getColors().PRIMARY_BACKGROUND);
        }

        let content = (
            <View style={[publicStyleGenerator().container, styles().container]}>

                {Platform.OS === 'ios'? <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} /> : <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} backgroundColor={DynamicColors.getColors().PRIMARY_BACKGROUND}/>}

                <View style={styles().header}>
                    <Text style={[publicStyleGenerator().title, styles().title]}>{I18n.t('FORGOT_PASSWORD.TITLE')}</Text>
                </View>

                <View style={styles().errorContainer}>
                    {errorMessage
                        ? (
                            <Text style={globalStyleGenerator().errorTextOnPrimary}>
                                {errorMessage}
                            </Text>
                        )
                        : null
                    }
                </View>

                <View style={styles().body}>

                    <TextInput
                        style={publicStyleGenerator().input}
                        onChangeText={email => this.setState({ email, errorMessage: '' })}
                        placeholder={I18n.t('FORGOT_PASSWORD.EMAIL_PLACEHOLDER')}
                        placeholderTextColor={DynamicColors.getColors().PRIMARY_TEXT}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        underlineColorAndroid="transparent"
                    />

                    <TouchableOpacity
                        style={publicStyleGenerator().button}
                        onPress={this.handleClickButton}
                    >
                        <Text style={publicStyleGenerator().buttonText}>{I18n.t('FORGOT_PASSWORD.BUTTON')}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles().footer}>
                    <Text style={styles().footerText} onPress={() => navigation.navigate('SignIn')}>
                        {I18n.t('FORGOT_PASSWORD.SIGN_IN')}
                    </Text>
                </View>
            </View>
        );

        return Platform.OS == 'ios' ? content : (
            <ScrollView style={styles().scrollView}>
                {content}
            </ScrollView>
        );
    }
}

ForgotPassword.propTypes = {
    navigation: PropTypes.object.isRequired,
};

const fullHeight = Dimensions.get('window').height;

const styles = () => {
    return StyleSheet.create({
        scrollView: {
            height: fullHeight,
        },
        container: {
            paddingTop: '3%',
            paddingBottom: '5%',
            height: fullHeight,
        },
        header: {
            paddingTop: 36,
            flex: 3,
            alignItems: 'center',
            justifyContent: 'center',
        },
        title: {
            textAlign: 'center',
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
            flex: 1,
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

export default withColor(ForgotPassword);