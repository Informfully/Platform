import React from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    Dimensions,
} from 'react-native';

import { FONT_FAMILY, FONT_SIZE } from '../../styles/globals';
import { DynamicColors, withColor } from '../../styles';

function Button({
    colored, inverted, round, flat, onPress, children, text, narrow, style, contentContainerStyle,
}) {
    const allStyles = [styles().button];

    if (colored) {
        allStyles.push(styles().colored);
    }

    if (inverted) {
        allStyles.push(styles().inverted);
    }

    if (round) {
        allStyles.push(styles().round);
    }

    if (flat) {
        allStyles.push(styles().flat);
    }

    if (text) {
        allStyles.push(styles().text);
    }

    if (!narrow) {
        allStyles.push(styles().fullWidth);
    }

    allStyles.push(style);

    return (
        <TouchableOpacity
            style={[ styles().buttonContainer, contentContainerStyle ]}
            onPress={onPress}
            key="survey-navigationButton-next"
        >
            <Text style={allStyles}>
                {children}
            </Text>
        </TouchableOpacity>
    );
}

const styles = () => StyleSheet.create({
    buttonContainer: {
        // flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    button: {
        fontSize: FONT_SIZE.NORMAL,
        fontFamily: FONT_FAMILY.TEXT,
        color: DynamicColors.getColors().CARD_TEXT,
        backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
        padding: 16,
        borderRadius: 24,
        overflow: 'hidden',
    },
    fullWidth: {
        width: '100%',
        textAlign: 'center',
    },
    colored: {
        color: DynamicColors.getColors().ACCENT_TEXT,
        backgroundColor: DynamicColors.getColors().ACCENT_BACKGROUND,
    },
    inverted: {
        color: DynamicColors.getColors().ACCENT_BACKGROUND,
        backgroundColor: DynamicColors.getColors().ACCENT_TEXT,
        borderWidth: 1,
        borderColor: DynamicColors.getColors().ACCENT_BACKGROUND,
    },
    text: {
        color: DynamicColors.getColors().PRIMARY_TEXT,
        backgroundColor: 'transparent',
    },
    round: {
        borderRadius: Math.round(Dimensions.get('window').width + Dimensions.get('window').height) / 2,
    },
    flat: {
        borderRadius: 0,
    },

});

Button.defaultProps = {
    round: false,
    flat: false,
    text: false,
    style: null,
    narrow: false,
    colored: false,
    inverted: false,
    contentContainerStyle: null,
};

Button.propTypes = {
    children: PropTypes.node.isRequired,
    onPress: PropTypes.func.isRequired,
    style: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.array,
        PropTypes.object,
    ]),
    contentContainerStyle: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.array,
        PropTypes.object,
    ]),
    colored: PropTypes.bool,
    inverted: PropTypes.bool,
    round: PropTypes.bool,
    flat: PropTypes.bool,
    narrow: PropTypes.bool,
    text: PropTypes.bool,
};

export default withColor(Button);
