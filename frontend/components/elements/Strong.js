import React from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet, Text,
} from 'react-native';

import { FONT_FAMILY, FONT_WEIGHT } from '../../styles/variables';

export default function Strong({ children, style }) {
    return (
        <Text style={[ style, styles.text ]}>
            { children}
        </Text>
    );
}

const styles = StyleSheet.create({
    text: {
        fontWeight: FONT_WEIGHT.BOLD,
        fontFamily: FONT_FAMILY.TEXT_BOLD,
    },
});

Strong.defaultProps = {
    style: styles.text,
};

Strong.propTypes = {
    children: PropTypes.node.isRequired,
    style: PropTypes.object,
};
