import React from 'react';
import PropTypes from 'prop-types';

import ConfirmationModal from '../../elements/modal/ConfirmationModal';
import ModalHead from '../../elements/modal/ModalHead';
import ModalBody from '../../elements/modal/ModalBody';
import ModalFoot from '../../elements/modal/ModalFoot';
import Button from '../../elements/Button';

export default function DeleteConfirmationModal({ isShown, cancel, confirm }) {

    return (
        <ConfirmationModal isShown={isShown}>
            <ModalHead>
                Confirmation Required
            </ModalHead>
            <ModalBody>
                <p>Are you sure you want to delete this survey?</p>
                <p>This action cannot be undone!</p>
            </ModalBody>
            <ModalFoot>
                <div className="columns is-pulled-right">
                    <div className="column is-narrow">
                        <Button flat onClick={cancel}>
                            Cancel
                        </Button>
                    </div>
                    <div className="column is-narrow">
                        <Button onClick={confirm}>
                            Permanently delete survey
                        </Button>
                    </div>
                </div>
            </ModalFoot>
        </ConfirmationModal>
    );

}

DeleteConfirmationModal.propTypes = {
    isShown: PropTypes.bool.isRequired,
    cancel: PropTypes.func.isRequired,
    confirm: PropTypes.func.isRequired,
};
