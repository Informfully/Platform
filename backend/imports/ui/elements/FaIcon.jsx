import React from 'react';
import PropTypes from 'prop-types';
import { useTheme }  from '../context/ThemeContext'

export default function FaIcon({
    className, icon, regular,
}) {
    const { themeIsDark } = useTheme();

    const iconClass = regular ? 'far' : 'fa';
    const theme = themeIsDark?'is-dark':'';

    return (
        <span className={`symbol ${theme}`}>
            <i className={`${className} ${iconClass} fa-${icon}`} />
        </span>
    );
}

FaIcon.propTypes = {
    icon: PropTypes.string.isRequired,
    className: PropTypes.string,
    regular: PropTypes.bool,
};

FaIcon.defaultProps = {
    className: '',
    regular: false,
};
