import moment from 'moment/min/moment-with-locales';
import I18n from '../i18n/i18n';

let localeString = I18n.fullLocale;

// Change 'en_US' to 'en' because moment calls it that way. Otherwise, 'en_US' will turn into 'en-GB' as our defined default locale.
if (localeString === 'en_US') {
    localeString = 'en';
}

// Use 'en-GB' as fallback default
moment.locale([localeString, 'en-GB']);

export const formatDateTime = (date) => {
    const mom = moment(date);
    if (isToday(date)) {
        return I18n.t('DATE_FORMAT.TODAY') + ', ' + mom.format('HH:mm') + I18n.t('DATE_FORMAT.O_CLOCK');
    }
    if (wasYesterday(date)) {
        return I18n.t('DATE_FORMAT.YESTERDAY') + ', ' + mom.format('HH:mm') + I18n.t('DATE_FORMAT.O_CLOCK');
    }
    return mom.format('dd, DD.MM.YYYY, HH:mm [Uhr]');
};

export const formatDate = (date) => {
    const mom = moment(date);
    if (isToday(date)) {
        return I18n.t('DATE_FORMAT.TODAY')
    }
    if (wasYesterday(date)) {
        return I18n.t('DATE_FORMAT.YESTERDAY');
    }
    return mom.format('dd, l');
};

const isToday = (date) => {
    const today = moment();
    return moment(date).isSame(today, 'day');
};

const wasYesterday = (date) => {
    const yesterday = moment().subtract(1, 'day');
    return moment(date).isSame(yesterday, 'day');
};
