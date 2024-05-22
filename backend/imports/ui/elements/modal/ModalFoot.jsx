import React from 'react';
import PropTypes from 'prop-types';

export default function ModalFoot({ className, children }) {
    const classes = `custom-modal__foot ${className}`;
    return (
        <div className={classes}>
            { children }
        </div>
    );
}

ModalFoot.defaultProps = {
    className: '',
};

ModalFoot.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};
