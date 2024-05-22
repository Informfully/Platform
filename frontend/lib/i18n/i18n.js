import I18n from 'i18n-js';
import de from './locales/de';
import fr from './locales/fr';
import en from './locales/en';
import { NativeModules, Platform } from 'react-native';

const locale =
    Platform.OS == 'ios'
        ? NativeModules.SettingsManager.settings.AppleLocale
        : NativeModules.I18nManager.localeIdentifier;

// Set the used locale in the app
if (typeof locale === 'string' && locale.length > 2) {
    I18n.locale = locale.slice(0, 2);
    I18n.fullLocale = locale;
} else {
    I18n.locale = 'en';
    I18n.fullLocale = 'en_GB'
}

// if the string is not found for the applied locale, search for the string in other locales
I18n.fallbacks = true;
// this is the locale that will be used for fallbacks
I18n.defaultLocale = 'en';

// this will convert "SETTINGS.SOME_STRING" to "SOME STRING" if the value of
// SETTINGS.SOME_STRING cannot be found in the locale files
// I18n.missingBehaviour = 'guess';


I18n.translations = {
    de,
    fr,
    en,
};

export default I18n;
