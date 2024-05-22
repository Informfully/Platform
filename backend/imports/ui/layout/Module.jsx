import React from 'react';
import PropTypes from 'prop-types';

export default function Module({ children }) {

    return (
        <div className="module">
            { children }
        </div>
    );

}

Module.propTypes = {
    children: PropTypes.node.isRequired,
};
