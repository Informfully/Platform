import React from 'react';
import PropTypes from 'prop-types';
import ModuleSection from './ModuleSection';

export default function ModuleHead({ children }) {

    return (
        <ModuleSection>
            <div className="level">
                { children }
            </div>
        </ModuleSection>
    );

}

ModuleHead.propTypes = {
    children: PropTypes.node.isRequired,
};
