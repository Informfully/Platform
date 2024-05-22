import { StyleSheet } from 'react-native';
import { DynamicColors } from './DynamicColors';
import {
    COLORS,
    FONT_FAMILY,
    FONT_SIZE,
    FONT_WEIGHT,
    FONT_STYLE,
} from './variables';

FONT_FAMILY.TEXT = FONT_FAMILY.SANS_SERIF.REGULAR;
FONT_FAMILY.TEXT_BOLD = FONT_FAMILY.SANS_SERIF.BOLD;
FONT_FAMILY.TITLE = FONT_FAMILY.SERIF.BOLD;

FONT_SIZE.INPUT = FONT_SIZE.NORMAL;
FONT_SIZE.TEXT = FONT_SIZE.NORMAL;
FONT_SIZE.SUBTITLE = 16;

FONT_WEIGHT.TEXT = FONT_WEIGHT.NORMAL;
FONT_WEIGHT.TEXT = FONT_WEIGHT.NORMAL;

const textFontSize = FONT_SIZE.NORMAL;
const textFontFamily = FONT_FAMILY.TEXT;
const textFontWeight = FONT_WEIGHT.TEXT;

const errorTextFontSize = textFontSize;
const errorTextFontFamily = FONT_FAMILY.SANS_SERIF.BOLD;
const errorTextFontWeight = FONT_WEIGHT.BOLD;

const globalStyleGenerator = () => {
    return StyleSheet.create( {
        text: {
            color: DynamicColors.getColors().PRIMARY_TEXT,
            fontSize: textFontSize,
            fontWeight: textFontWeight,
            fontFamily: textFontFamily,
        },
        errorText: {
            marginBottom: 16,
            color: DynamicColors.getColors().ERROR_TEXT,
            fontFamily: errorTextFontFamily,
            fontSize: errorTextFontSize,
            fontWeight: errorTextFontWeight,
        },
        errorTextOnPrimary: {
            marginBottom: 16,
            color: DynamicColors.getColors().ERROR_TEXT,
            fontFamily: errorTextFontFamily,
            fontSize: errorTextFontSize,
            fontWeight: errorTextFontWeight,
        },
    } );
}

const GLOBAL_STYLES = globalStyleGenerator();

export {
    COLORS,
    FONT_WEIGHT,
    FONT_SIZE,
    FONT_FAMILY,
    FONT_STYLE,
    GLOBAL_STYLES,
    globalStyleGenerator,
};