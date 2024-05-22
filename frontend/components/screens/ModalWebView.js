/*
    ModalWebView - How to use
    Place a ModalWebView component in any view component where you want to be able to display a modal web view popup.
    The position of the ModalWebView within said view does not matter because there will be no visible artifact from
    this view as long as it is not triggered. There are four props which can be passed to the ModalWebView
    component:
    - visible: bool
        Use this boolean prop to trigger and hide the webview. The ModalWebView will listen to changes to this prop, so
        if you set this prop to true in the parent component, the webview will appear, if you set it to false, it will
        disappear.
    - onWebviewClose: function (required)
        Callback function which is triggered when the close button on the webview is pressed. Important: use this
        callback to set the `visible` prop to false in the parent component, otherwise the webview will not disappear.
    - url: string
        URL to display in the webview. Will be ignored if the `html` prop has a value.
    - html: string
        HTML code to render inside the webview. Use this if you do not want to load HTML from a file (on the web or the
        app).
*/

import React, { Component } from 'react';
import {
    Modal, TouchableHighlight, View, StyleSheet, SafeAreaView, Image,
} from 'react-native';
import PropTypes from 'prop-types';
import WebView from 'react-native-webview';

const closeIcon = require('../../assets/icons/close-black.png');

export default class ModalWebView extends Component {
    constructor(props) {
        super(props);
    }

    // renders either the html element if one is passed, or loads the url,
    // html takes precedence over url, i.e., if both are given then the html will be rendered
    get renderWebView() {
        const { url, html } = this.props;
        // html given -> display html
        if (html) {
            return (
                // set scalesPageToFit to false so that user cannot pinch to zoom,
                // requires useWebKit to be false in order to work on iOS
                <WebView useWebKit={false} scalesPageToFit={false} source={{ html }} />
            );
        }
        // url given -> load url
        if (url) {
            return (
                // set scalesPageToFit to false so that user cannot pinch to zoom,
                // requires useWebKit to be false in order to work on iOS
                <WebView useWebKit={false} scalesPageToFit={false} source={{ uri: url }} />
            );
        }
        // whether html nor url given -> show error
        const errorHTML = '<h1>Could not load document.</h1>';
        return (
            // set scalesPageToFit to false so that user cannot pinch to zoom,
            // requires useWebKit to be false in order to work on iOS
            <WebView useWebKit={false} scalesPageToFit={false} source={{ html: errorHTML }} />
        );
    }

    render() {
        const { onWebviewClose, visible } = this.props;
        return (
            <Modal
                animationType="slide"
                transparent={false}
                visible={visible}
                // the onRequestClose callback is required on Android,
                // it is called when the user presses the physical back button
                onRequestClose={() => {
                    onWebviewClose();
                }}
            >
                <SafeAreaView style={styles.container}>
                    <View style={styles.buttonBar}>
                        <TouchableHighlight
                            style={styles.closeButton}
                            onPress={onWebviewClose}
                        >
                            <Image
                                style={styles.closeIcon}
                                source={closeIcon}
                            />
                        </TouchableHighlight>
                    </View>
                    {this.renderWebView}
                </SafeAreaView>
            </Modal>
        );
    }
}

ModalWebView.propTypes = {
    visible: PropTypes.bool,
    onWebviewClose: PropTypes.func.isRequired,
    url: PropTypes.string,
    html: PropTypes.string,
};

ModalWebView.defaultProps = {
    visible: false,
    url: '',
    html: '',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    buttonBar: {
        alignItems: 'flex-end',
    },
    closeButton: {
        height: 50,
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        width: 25,
        height: 25,
    },
});
