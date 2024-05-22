import React from 'react';
import PropTypes from 'prop-types';
import { classNames } from '../../lib/utils/utils';
import { useTheme } from '../context/ThemeContext';


const Button = React.forwardRef(({
    circle, children, flat, href, onClick, round, text, iconWithLink, classes, className, type, ...props
}, ref) => {

    const { themeIsDark } = useTheme();

    const buttonClassNames = {
        'custom-button': true,
        'custom-button--circle': circle,
        'custom-button--flat': flat,
        'custom-button--round': round,
        'custom-button--link': text,
        'custom-button--icon-with-link': iconWithLink,
        'is-dark':themeIsDark,
        [className]: true,
    };

    if (type) {
        buttonClassNames[`custom-button--${type}`] = true;
    }

    if (href) {
        return (
            <a
                className={classNames(buttonClassNames)}
                href={href}
                onClick={onClick}
                ref={ref}
                {...props}
            >
                {children}
            </a>
        );
    }

    return (
        <button
            className={classNames(buttonClassNames)}
            type="button"
            onClick={onClick}
            ref={ref}
            {...props}
        >
            {children}
        </button>
    );
});

Button.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    href: PropTypes.string,
    flat: PropTypes.bool,
    circle: PropTypes.bool,
    round: PropTypes.bool,
    iconWithLink: PropTypes.bool,
    className: PropTypes.string,
    classes: PropTypes.string,
    type: PropTypes.string,
};

Button.defaultProps = {
    onClick: event => event.preventDefault(),
    href: '',
    circle: false,
    flat: false,
    round: false,
    iconWithLink: false,
    className: '',
    classes: '',
    type: '',
};

export default Button;
