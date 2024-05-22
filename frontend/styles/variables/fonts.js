import { Platform } from 'react-native';

const CUSTOM_FONT_DISABLED = false;
const FONT_FAMILY = {
    SANS_SERIF: {
        THIN: 'Roboto-Thin',
        LIGHT: 'Roboto-Light',
        REGULAR: 'Roboto-Regular',
        MEDIUM: 'Roboto-Medium',
        BOLD: 'Roboto-Bold',
        BLACK: 'Roboto-Black',

        ITALIC: {
            THIN: 'Roboto-ThinItalic',
            LIGHT: 'Roboto-LightItalic',
            MEDIUM: 'Roboto-MediumItalic',
            BOLD: 'Roboto-BoldItalic',
            BLACK: 'Roboto-BlackItalic',
        },
    },

    SERIF: {
        THIN: 'RobotoSlab-Thin',
        LIGHT: 'RobotoSlab-Light',
        REGULAR: 'RobotoSlab-Regular',
        BOLD: 'RobotoSlab-Bold',
    },
};

if (CUSTOM_FONT_DISABLED) {
    Object.keys(FONT_FAMILY).forEach((outerKey) => {
        Object.keys(FONT_FAMILY[outerKey]).forEach((innerKey) => {
            FONT_FAMILY[outerKey][innerKey] = 'System';
        });
    });
}

const FONT_SIZE = {
    SMALL: 10,
    NORMAL: 15,
    MEDIUM: 20,
    LARGE: 24,
    EXTRA_LARGE: 32,
};

const FONT_WEIGHT = {
    THIN: !CUSTOM_FONT_DISABLED && Platform.OS === 'android' ? '400' : '100',
    LIGHT: !CUSTOM_FONT_DISABLED && Platform.OS === 'android' ? '400' : '300',
    NORMAL: !CUSTOM_FONT_DISABLED && Platform.OS === 'android' ? '400' : '400',
    MEDIUM: !CUSTOM_FONT_DISABLED && Platform.OS === 'android' ? '400' : '500',
    BOLD: !CUSTOM_FONT_DISABLED && Platform.OS === 'android' ? '400' : '700',
    BLACK: !CUSTOM_FONT_DISABLED && Platform.OS === 'android' ? '400' : '900',
};

const FONT_STYLE = {
    NORMAL: 'normal',
    ITALIC: 'italic',
};

export {
    FONT_FAMILY,
    FONT_SIZE,
    FONT_WEIGHT,
    FONT_STYLE,
};
