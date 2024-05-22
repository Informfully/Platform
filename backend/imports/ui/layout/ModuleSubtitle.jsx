import React from 'react';
import PropTypes from 'prop-types';
import { useTheme }  from '../context/ThemeContext'

export default function ModuleSubtitle({ children }) {

    const {themeIsDark } = useTheme();

    return (
        <div className="level-left">
            <div className="level-item">
                <h2 className={`module-subtitle ${themeIsDark ? 'is-dark' : ''}`}>
                    { children }
                </h2>
            </div>
        </div>
    );

}

ModuleSubtitle.propTypes = {
    children: PropTypes.node.isRequired,
};