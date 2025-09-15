import React from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Platform, StatusBar,
} from 'react-native';
import { withNavigation } from 'react-navigation';
import PropTypes from 'prop-types';
import { withTracker } from '@meteorrn/core';
import I18n from '../../lib/i18n/i18n';
import { DynamicColors, withColor } from '../../styles';
import {
    FONT_FAMILY,
} from '../../styles/variables';
import { collectionManager } from '../../lib/utils/collectionManager';
import * as NavigationBar from 'expo-navigation-bar';

class Contact extends React.Component {

    constructor(props) {
        super(props);

        this.state = {};
    }

    render() {
        if(Platform.OS === 'android'){
            NavigationBar.setBackgroundColorAsync(DynamicColors.getColors().PRIMARY_BACKGROUND);
        }

        return (
            <View style={styles().safeArea}>
                {Platform.OS === 'ios'
                    ? <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} /> : <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} backgroundColor={DynamicColors.getColors().PRIMARY_BACKGROUND}/>
                }
                <ScrollView
                    style={styles().scrollView}
                    // FIX for bug in ios 13, scroll Views all over the place
                    scrollIndicatorInsets={{ right: 1 }}
                >
                    <View style={styles().header}>
                        <Text style={styles().userName}>{I18n.t('CONTACT.TITLE')}</Text>

                    </View>

                    {/* <View style={styles().clickableItems}>


                        <View style={styles().itemSeparator} />
                        <TouchableOpacity
                            style={styles().listItem}
                            onPress={() => { Linking.openURL(`mailto:${this.props.feedbackEmail}?subject=Feedback`); }}
                        >
                            <Text style={styles().listItemText}>{I18n.t('CONTACT.FEEDBACK')}</Text>
                        </TouchableOpacity>
                        <View style={styles().itemSeparator} />

                        <View style={styles().itemSpace} />
                        <View style={styles().itemSeparator} />
                        <View style={styles().itemSpace} />


                    </View> */}


                    <Text style={styles().addressText}>{this.props.addressTitle}</Text>
                    <View style={styles().itemSpace} />
                    <Text style={styles().addressText}>{this.props.addressName}</Text>
                    <Text style={styles().addressText}>{this.props.addressStreet}</Text>
                    <Text style={styles().addressText}>{this.props.addressCity}</Text>
                    <Text style={styles().addressText}>{this.props.addressCountry}</Text>
                    <View style={styles().itemSpace} />

                    {/* <Text style={styles().addressText}>{this.props.phoneNumber}</Text> */}
                    {/* <View style={styles().itemSpace} /> */}
                    <Text style={styles().addressText}>{this.props.feedbackEmail}</Text>


                    <View style={styles().itemSpace} />
                    <View style={styles().itemSeparator} />

                    <View style={styles().itemSpace} />

                </ScrollView>

            </View>
        );
    }

}

Contact.propTypes = {
    feedbackEmail: PropTypes.string,
    addressTitle: PropTypes.string,
    addressName: PropTypes.string,
    addressStreet: PropTypes.string,
    addressCity: PropTypes.string,
    addressCountry: PropTypes.string,
    phoneNumber: PropTypes.string,
};

Contact.defaultProps = {
    feedbackEmail: 'placeholder@your.domain',
    addressTitle: 'Name',
    addressName: 'Details',
    addressStreet: 'Street',
    addressCity: 'City',
    addressCountry: 'Country',
    phoneNumber: '+98 76 654 32 10',
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
        fontSize: 22,
        color: DynamicColors.getColors().PRIMARY_TEXT,
    },
    userEmail: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: '500',
        color: DynamicColors.getColors().PRIMARY_TEXT,
    },
    addressText: {
        marginLeft: 10,
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
        const config = collectionManager.collection('activeExperiment').findOne()
            || collectionManager.collection('experiments').findOne()
            || {};

        return {
            feedbackEmail: config.feedbackEmail,
        };
    })(withColor(Contact))
);
