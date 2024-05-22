import React from 'react';
import Button from '../../elements/Button';
import PropTypes from 'prop-types';
import ConfirmationModal from '../../elements/modal/ConfirmationModal';
import ModalHead from '../../elements/modal/ModalHead';
import ModalBody from '../../elements/modal/ModalBody';
import ModalFoot from '../../elements/modal/ModalFoot';

export default function UsersWarningModalExceedingLimit({onDismiss}) {
    console.log("render")
    return (
        <ConfirmationModal isShown>
            <ModalHead>
                Confirmation Required
            </ModalHead>
            <ModalBody>
                <p>The number of created account has reached to a limit. </p>
                <p>Please contack the app maintainer for more information.</p>
                <br/>
            </ModalBody>
            <ModalFoot>
                <div className="level is-pulled-right">
                    <div className="pl-3">
                        <Button onClick={()=>onDismiss()}>
                            Ok
                        </Button>
                    </div>
                </div>
            </ModalFoot>
        </ConfirmationModal>
    )
}