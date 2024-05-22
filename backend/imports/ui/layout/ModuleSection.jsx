import React from 'react';
import PropTypes from 'prop-types';
import { classNames } from '../../lib/utils/utils';
import { useTheme }  from '../context/ThemeContext'

export default function ModuleSection({
    between, card, content, children, boxed,isExperiment, onClick
}) {
    const { themeIsDark } = useTheme();

    const containerClasses = {
        'module-section': true,
        'module-section--between': between,
    };

    const contentClasses = {
        'module-section-content': content && !between,
        'module-section-card': card,
        'module-section--boxed': boxed,
        'module-section-isExperiment':isExperiment,
        'is-dark':themeIsDark,
    };

    return (
        <div className={classNames(containerClasses)} onClick={onClick}>
            <div className={classNames(contentClasses)}>
                { children }
            </div>
        </div>
    );

}

ModuleSection.defaultProps = {
    between: false,
    card: false,
    content: false,
    boxed: false,
};

ModuleSection.propTypes = {
    children: PropTypes.node.isRequired,
    between: PropTypes.bool,
    card: PropTypes.bool,
    content: PropTypes.bool,
    boxed: PropTypes.bool,
};
