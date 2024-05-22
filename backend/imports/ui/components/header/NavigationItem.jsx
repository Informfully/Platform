import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '../../../lib/utils/utils';

export default class NavigationItem extends Component {

    constructor(props) {
        super(props);
    }

    get classes() {
        const classes = [{
            'navbar-item': true,
            'is-selected': this.props.isSelected,
            'is-disabled': this.props.isDisabled,
        }];

        return classNames(classes);
    }

    get icon() {
        const { icon } = this.props;
        return (
            <span className="navigation-item__icon">
                { icon }
            </span>
        );
    }

    render() {
        const { href, text, icon, isDisabled } = this.props;
        return (
            <a href={ isDisabled ? '' : href } onClick={this.props.onClick} className={this.classes}>
                { icon ? this.icon : null }
                { text }
            </a>
        );
    }

}

NavigationItem.propTypes = {
    name: PropTypes.string.isRequired,
    href: PropTypes.string,
    text: PropTypes.string,
    onClick: PropTypes.func,
    icon: PropTypes.node,
    isDisabled: PropTypes.bool,
};

NavigationItem.defaultProps = {
    href: '',
    onClick: null,
    icon: null,
};
