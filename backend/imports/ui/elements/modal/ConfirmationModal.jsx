import React from 'react';
import PropTypes from 'prop-types';
import { Transition } from 'react-transition-group';
import Mounter from '../Mounter';
import Modal from './Modal';

export default function ConfirmationModal({ isShown, children }) {

    return (
        <Transition
            in={isShown}
            timeout={{
                enter: 0,
                exit: 300,
                appear: 0,
            }}
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
                            <div className={`confirmationModal-container confirmationModal-container--${state}`}>
                                <Modal className="confirmationModal">
                                    { isShown ? children : null}
                                </Modal>
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

ConfirmationModal.propTypes = {
    isShown: PropTypes.bool.isRequired,
    children: PropTypes.node.isRequired,
};
