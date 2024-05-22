import I18n from '../i18n/i18n';

/**
 * Returns an info text string that can be used in survey components to display
 * a natural language info to describe how many answers must or can be selected
 * given two integers for the minimum number of answers that must be selected
 * and the maximum number of answers that can be selected.
 *
 * @returns {string}
 *          information text
 */
export const getSelectionTextFromMinAndMaxSelect = (minSelect, maxSelect) => {
    // covers all cases { min: 0, max: 0 } and { min: > 0, max: 0 }
    if (maxSelect === 0) {
        return I18n.t('UTILS_SURVEY.SELECT_ALL');
    }

    // covers all cases { min: A, max: A }
    if (minSelect === maxSelect) {
        if (minSelect === 1) {
            return I18n.t('UTILS_SURVEY.SELECT_ONE');
        }

        return `${I18n.t('UTILS_SURVEY.SELECT_EXACTLY_01')} ${minSelect} ${I18n.t('UTILS_SURVEY.SELECT_EXACTLY_02')}`;
    }

    // covers all cases min < max
    if (minSelect < maxSelect) {
        let text = `${I18n.t('UTILS_SURVEY.SELECT_MIN_MAX_01')}`;
        text += ' ';
        text += `${minSelect}`;
        text += ' ';
        text += `${I18n.t('UTILS_SURVEY.SELECT_MIN_MAX_02')}`;
        text += ' ';
        text += `${maxSelect}`;
        text += ' ';
        text += `${I18n.t('UTILS_SURVEY.SELECT_MIN_MAX_03')}`;
        return text;
    }

    // covers all cases min > max
    return `${I18n.t('UTILS_SURVEY.SELECT_MAX_01')} ${maxSelect} ${I18n.t('UTILS_SURVEY.SELECT_MAX_02')}`;
};
