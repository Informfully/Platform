import React, { Component } from 'react';
import { withNavigation } from 'react-navigation';
import { FloatingAction } from 'react-native-floating-action';
import PropTypes from 'prop-types';
import { Linking } from 'react-native';
import { DynamicColors, withColor } from '../../styles/DynamicColors';
import I18n from '../../lib/i18n/i18n';
import { NAVIGATION_ICONS } from '../../lib/parameters/icons';

/**
 * Renders the floating navigation Button on the HomeScreen
 */
class ButtonRaw extends Component {

    get readingListNavAction() {
        return {
            icon: NAVIGATION_ICONS.readingList.active,
            name: 'ReadingList',
            position: 1,
            text: I18n.t('NAVIGATION.READING_LIST'),
            textBackground: DynamicColors.getColors().ACCENT_BACKGROUND,
            color: DynamicColors.getColors().ACCENT_BACKGROUND,
            textColor: DynamicColors.getColors().ACCENT_TEXT,
        };
    }

    get archiveNavAction() {
        return {
            icon: NAVIGATION_ICONS.favouritesList.active,
            name: 'FavouritesList',
            position: 2,
            text: I18n.t('NAVIGATION.FAVOURITES_LIST'),
            textBackground: DynamicColors.getColors().ACCENT_BACKGROUND,
            color: DynamicColors.getColors().ACCENT_BACKGROUND,
            textColor: DynamicColors.getColors().ACCENT_TEXT,
        };
    }

    get settingsNavAction() {
        return {
            icon: NAVIGATION_ICONS.settings.active,
            name: 'Settings',
            position: 3,
            text: I18n.t('NAVIGATION.SETTINGS'),
            textBackground: DynamicColors.getColors().ACCENT_BACKGROUND,
            color: DynamicColors.getColors().ACCENT_BACKGROUND,
            textColor: DynamicColors.getColors().ACCENT_TEXT,
        };
    }

    get contactNavAction() {
        return {
            icon: NAVIGATION_ICONS.explanation.active,
            name: 'Contact',
            position: 4,
            text: I18n.t('NAVIGATION.CONTACT'),
            textBackground: DynamicColors.getColors().ACCENT_BACKGROUND,
            color: DynamicColors.getColors().ACCENT_BACKGROUND,
            textColor: DynamicColors.getColors().ACCENT_TEXT,
        };
    }

    itemCallback = (name) => {
        if (this.props.deactivateButtons) {
            return;
        }

        this.props.navigation.navigate(name);
    }

    render() {
        const { distanceToEdge } = this.props;
        const actions = [];

        actions.push(this.contactNavAction, this.readingListNavAction, this.archiveNavAction, this.settingsNavAction);

        const floatingIcon = NAVIGATION_ICONS.menuBurger.active;


        return (
            <FloatingAction
                actions={actions}
                onPressItem={this.itemCallback}
                floatingIcon={floatingIcon}
                color={DynamicColors.getColors().ACCENT_BACKGROUND}
                distanceToEdge={distanceToEdge}

            />
        );
    }

}

ButtonRaw.propTypes = {
    distanceToEdge: PropTypes.object,
    deactivateButtons: PropTypes.bool,
};

export default withColor(withNavigation(ButtonRaw));
