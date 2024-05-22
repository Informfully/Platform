import { COLORS, DARK_COLORS } from './variables/colors';
import { Appearance } from 'react-native';
import React from 'react';

/**
 * Singelton for managing current color mode, notifies listeners when the color mode changes
 */
class ColorClass {
    constructor() {
        this._COLORS = COLORS;
        this._DARK_COLORS = DARK_COLORS;
        this._DARK_MODE = Appearance.getColorScheme() == 'dark';
        this._deviceControlled = true;
        this._counter = 0;
        this._subscribers = {};
    }

    setDarkMode = (darkMode) => {
        this._DARK_MODE = darkMode;
        Object.keys(this._subscribers).forEach(key => {
            if (typeof this._subscribers[key] == 'function') {
                this._subscribers[key](darkMode);
            }
        })
    }

    setDeviceControlled = (deviceControled) => {
        this._deviceControlled = deviceControled;
    }

    getDeviceControlled = () => {
        return this._deviceControlled;
    }

    isDarkMode = () => {
        return this._DARK_MODE;
    }

    getColors = () => {
        return this._DARK_MODE ? this._DARK_COLORS : this._COLORS;
    }

    addListener = (callback) => {
        if (!callback || typeof callback != 'function') {
            return;
        }
        let id = 'a' + this._counter++;
        this._subscribers[id] = callback;
        return id;
    }

    removeListener = (id) => {
        if (!id) {
            return;
        }
        delete this._subscribers[id];
    }

    getStatusBarStyle = () => {
        return this._DARK_MODE ? 'light-content' : 'dark-content'
    }
}

const DynamicColors = new ColorClass();

/**
 * Higher order component that lets the provided component rerender when the color mode changes,
 * also forces potential navigations bars to rerender
 * @param {element} Elemement 
 * @returns 
 */
const withColor = (Elem) => {
    return class extends React.Component {
        constructor(props) {
            super(props);
            this.state = {darkMode: DynamicColors.isDarkMode()}
            this.subscription = DynamicColors.addListener((darkMode) => {
                this.setState({darkMode: darkMode});
                if (this.props.navigation) {
                    this.props.navigation.setParams({darkMode: darkMode});
                }
            })
        }

        componentWillUnmount() {
            DynamicColors.removeListener(this.subscription);
        }

        render() {
            return (
                <Elem
                    darkMode={this.state.darkMode}
                    {... this.props}
                />
            )
        }
    }
}

export  {DynamicColors, withColor};