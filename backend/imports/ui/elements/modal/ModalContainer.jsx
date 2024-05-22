import React from 'react';
import PropTypes from 'prop-types';
import { Transition } from 'react-transition-group';
import Mounter from '../Mounter';

export default function ModalContainer({ children, isShown, delay }) {
    return (
        <Transition
            in={isShown}
            timeout={delay}
            unmountOnExit
        >
            {(state) => {
                switch (state) {
                case 'entering':
                case 'entered':
                case 'exiting':
                case 'exited':
                    return (
                        <Mounter>
                            <div className={`modal-container modal-container--${state}`}>
                                { children }
                            </div>
                        </Mounter>
                    );
                default:
                    return null;
                }
            }}
        </Transition>
    );
}

ModalContainer.propTypes = {
    children: PropTypes.node,
    isShown: PropTypes.bool.isRequired,
    delay: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.number,
    ]),
};

ModalContainer.defaultProps = {
    children: null,
    delay: {
        enter: 0,
        exit: 300,
        appear: 0,
    },
};
