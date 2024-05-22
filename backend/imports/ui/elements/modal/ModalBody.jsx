import React from 'react';
import PropTypes from 'prop-types';

export default function ModalBody({ className, children }) {
    const classes = `custom-modal__body ${className}`;
    return (
        <div className={classes}>
            { children }
        </div>
    );
}

ModalBody.defaultProps = {
    className: '',
};

ModalBody.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};
