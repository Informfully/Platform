import React from 'react';
import PropTypes from 'prop-types';

export default function ModalHead({ className, children }) {
    const classes = `custom-modal__head ${className}`;
    return (
        <div className={classes}>
            { children }
        </div>
    );
}

ModalHead.defaultProps = {
    className: '',
};

ModalHead.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};
