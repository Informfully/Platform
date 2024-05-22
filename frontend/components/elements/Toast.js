import React from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
} from 'react-native';

import { FONT_FAMILY, FONT_SIZE } from '../../styles/globals';
import { DynamicColors, withColor } from '../../styles';

function Toast({
    error, onPress, children,
}) {
    const allStyles = [styles().toast];

    if (error) {
        allStyles.push(styles().error);
    }

    return (
        <TouchableOpacity
            style={styles().toastContainer}
            onPress={onPress}
            key="toast"
        >
            <Text style={allStyles}>
                {children}
            </Text>
        </TouchableOpacity>
    );
}

const styles = () => StyleSheet.create({
    toastContainer: {
        // flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    toast: {
        fontSize: FONT_SIZE.NORMAL,
        fontFamily: FONT_FAMILY.TEXT,
        color: DynamicColors.getColors().ACCENT_TEXT,
        backgroundColor: DynamicColors.getColors().ACCENT_BACKGROUND,
        padding: 16,
        borderRadius: 24,
        overflow: 'hidden',
        minWidth: '100%',
        textAlign: 'center',
    },
    error: {
        color: DynamicColors.getColors().PRIMARY_TEXT,
        backgroundColor: DynamicColors.getColors().ERROR_TEXT,
    },
});


Toast.propTypes = {
    children: PropTypes.node.isRequired,
    onPress: PropTypes.func,
    error: PropTypes.bool,
};

export default withColor(Toast);
