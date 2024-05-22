import React from 'react';
import PropTypes from 'prop-types';
import { useTheme }  from '../context/ThemeContext'

export default function ModuleTitle({ children }) {

    const {themeIsDark } = useTheme();

    return (
        <div className="level-left">
            <div className="level-item">
                <h1 className={`module-title ${themeIsDark ? 'is-dark' : ''}`}>
                    { children }
                </h1>
            </div>
        </div>
    );

}

ModuleTitle.propTypes = {
    children: PropTypes.node.isRequired,
};
