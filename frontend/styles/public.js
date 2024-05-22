import { StyleSheet } from 'react-native';
import {
    FONT_FAMILY,
    FONT_SIZE,
    FONT_WEIGHT,
} from './globals';
import { DynamicColors } from './DynamicColors';


const publicStyleGenerator = () => {
    const containerBackgroundColor = DynamicColors.getColors().PRIMARY_BACKGROUND;
    const inputBackgroundColor = DynamicColors.getColors().CARD_BACKGROUND;
    const textColor = DynamicColors.getColors().PRIMARY_TEXT;
    const textFontSize = FONT_SIZE.NORMAL;
    const textFontFamily = FONT_FAMILY.TEXT;
    const textFontWeight = FONT_WEIGHT.TEXT;
    const titleTextColor = textColor;
    const titleFontSize = FONT_SIZE.EXTRA_LARGE;
    const titleFontFamily = FONT_FAMILY.TITLE;
    const titleFontWeight = FONT_WEIGHT.BOLD;
    const subTitleColor = textColor;
    const subTitleFontSize = FONT_SIZE.SUBTITLE;
    const subTitleFontFamily = textFontFamily;
    const subTitleFontWeight = textFontWeight;
    const buttonTextColor = DynamicColors.getColors().ACCENT_TEXT;
    const buttonFontSize = FONT_SIZE.INPUT;
    const buttonFontFamily = textFontFamily;
    const buttonFontWeight = FONT_WEIGHT.MEDIUM;
    const inputTextColor = DynamicColors.getColors().CARD_TEXT;
    const inputFontSize = buttonFontSize;
    const inputFontFamily = buttonFontFamily;
    const inputFontWeight = textFontWeight;
    const linkTextColor = DynamicColors.getColors().PRIMARY_TEXT_MUTED;
    const linkFontSize = textFontSize;
    const linkFontFamily = textFontFamily;
    const linkFontWeight = FONT_WEIGHT.BOLD;

    return StyleSheet.create( {
        container: {
            backgroundColor: containerBackgroundColor,
            flex: 1,
            paddingLeft: '10%',
            paddingRight: '10%',
        },
        title: {
            marginBottom: 16,
            color: titleTextColor,
            fontSize: titleFontSize,
            fontWeight: titleFontWeight,
            fontFamily: titleFontFamily,
        },
        subTitle: {
            color: subTitleColor,
            fontSize: subTitleFontSize,
            fontFamily: subTitleFontFamily,
            fontWeight: subTitleFontWeight,
        },
        input: {
            width: '100%',
            // paddingVertical: 0,
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            backgroundColor: inputBackgroundColor,
            color: DynamicColors.getColors().CARD_TEXT,
            fontSize: inputFontSize,
            fontFamily: inputFontFamily,
            fontWeight: inputFontWeight,
        },
        button: {
            width: '100%',
            backgroundColor: DynamicColors.getColors().ACCENT_BACKGROUND,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
        },
        buttonText: {
            textAlign: 'center',
            color: buttonTextColor,
            fontSize: buttonFontSize,
            fontFamily: buttonFontFamily,
            fontWeight: buttonFontWeight,
        },
        linkText: {
            color: linkTextColor,
            fontSize: linkFontSize,
            fontFamily: linkFontFamily,
            fontWeight: linkFontWeight,
        },
        text: {
            color: textColor,
            fontSize: textFontSize,
            fontFamily: textFontFamily,
            fontWeight: textFontWeight,
        },
    } );
};

const PUBLIC_STYLES = publicStyleGenerator();


export {
    PUBLIC_STYLES,
    publicStyleGenerator
};