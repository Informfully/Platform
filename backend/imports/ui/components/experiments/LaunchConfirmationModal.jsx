import React from 'react';
import PropTypes from 'prop-types';

import ConfirmationModal from '../../elements/modal/ConfirmationModal';
import ModalHead from '../../elements/modal/ModalHead';
import ModalBody from '../../elements/modal/ModalBody';
import ModalFoot from '../../elements/modal/ModalFoot';
import Button from '../../elements/Button';
import FaIcon from '../../elements/FaIcon';

export default function LaunchConfirmationModal({ isShown, cancel, confirm }) {

    return (
        <ConfirmationModal isShown={isShown}>
            <ModalHead>
                Confirmation Required
            </ModalHead>
            <ModalBody>
                <p>Are you sure you want to launch this experiment?</p>
                <p>Following actions can not be done after launching:</p>
                <br/>
                <ul>
                    <li>&#8594; Reversing the experiment back to the design phase</li>
                    <li>&#8594; Adding additional users</li>
                    <li>&#8594; Editing survey questions</li>
                    <li>&#8594; Editing feedback surveys</li>
                </ul>
            </ModalBody>
            <ModalFoot>
                <div className="level is-pulled-right">
                    <div className="pl-2">
                        <Button flat onClick={cancel}>
                            Cancel
                        </Button>
                    </div>
                    <div className="pl-2">
                        <Button onClick={confirm}>
                            Launch experiment
                        </Button>
                    </div>
                </div>
            </ModalFoot>
        </ConfirmationModal>
    );

}

LaunchConfirmationModal.propTypes = {
    isShown: PropTypes.bool.isRequired,
    cancel: PropTypes.func.isRequired,
    confirm: PropTypes.func.isRequired,
};
