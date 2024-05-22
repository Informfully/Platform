import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
    Text, StyleSheet, SafeAreaView, View, Dimensions,
} from 'react-native';
import { DynamicColors, withColor } from '../../styles';
import Button from '../elements/Button';
import MeteorOffline from '../../lib/meteorOffline/MeteorOffline';
import I18n from '../../lib/i18n/i18n';

const fullWidth = Dimensions.get('window').width;
const fullHeight = Dimensions.get('window').height;

class WelcomeScreen extends Component {
    constructor(props) {
        super(props);
        this.handlePressStart = this.handlePressStart.bind(this);
    }

    handlePressCancel() {
        MeteorOffline.logout();
    }

    handlePressStart() {
        const { navigation: { navigate } } = this.props;
        navigate('Survey');
    }

    render() {
        return (
            <View style={styles().fullScreen}>
                <SafeAreaView style={styles().container}>
                    <View style={styles().head} />
                    <View style={styles().body}>
                        <Text style={styles().title}>
                            {I18n.t('WELCOME.TITLE')}
                        </Text>
                        <Text style={styles().text}>
                            {I18n.t('WELCOME.DISCLAIMER_01')}
                        </Text>
                        <Text style={styles().text}>
                            {I18n.t('WELCOME.DISCLAIMER_02')}
                        </Text>
                    </View>

                    <View style={styles().footer}>
                        <Button
                            onPress={this.handlePressCancel}
                            contentContainerStyle={styles().navigationButton}
                            style={styles().navigationButtonText}
                        >
                            {I18n.t('WELCOME.REJECT')}
                        </Button>
                        <Button
                            onPress={this.handlePressStart}
                            contentContainerStyle={styles().navigationButton}
                            style={styles().navigationButtonText}
                        >
                            {I18n.t('WELCOME.ACCEPT')}
                        </Button>
                    </View>
                </SafeAreaView>
            </View>
        );
    }
}

WelcomeScreen.propTypes = {
    navigation: PropTypes.object.isRequired,
};

const styles = () => {
    return StyleSheet.create({
        fullScreen: {
            backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
            width: fullWidth,
            height: fullHeight,
            flex: 1,
        },
        container: {
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'flex-start',
        },
        head: {
            flex: 1,
        },
        body: {
            flex: 7,
            paddingLeft: '6%',
            paddingRight: '6%',
        },
        footer: {
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            flexDirection: 'row',
            paddingLeft: '6%',
            paddingRight: '6%',
            paddingBottom: 16,
            paddingTop: 16,
        },
        navigationButton: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        navigationButtonText: {
            color: DynamicColors.getColors().CARD_TEXT,
            fontSize: 16,
        },
        information: {
            color: '#434e5a',
            fontSize: 10,
            marginTop: 12,
            textAlign: 'center',
        },
        listContainer: {
            marginTop: 32,
        },

        contentContainer: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
        },
        title: {
            color: DynamicColors.getColors().PRIMARY_TEXT,
            fontSize: 48,
            marginTop: 35,
            // fontFamily: FONT_FAMILY.SERIF.BOLD,
        },
        text: {
            color: DynamicColors.getColors().PRIMARY_TEXT,
            fontSize: 16,
            marginTop: 24,
        },
    });
};

export default withColor(WelcomeScreen);