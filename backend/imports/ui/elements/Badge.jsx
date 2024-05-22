import React from 'react';
import PropTypes from 'prop-types';

export default function Badge({ children }) {
    return (
        <div className="badge">
            <div className="badge__content">
                { children }
            </div>
        </div>
    );
}

Badge.propTypes = {
    children: PropTypes.node.isRequired,
};
