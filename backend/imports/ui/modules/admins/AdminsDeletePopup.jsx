import React, { useState } from 'react';
import Button from '../../elements/Button';
import ModuleSection from '../../layout/ModuleSection';
import ConfirmationModal from '../../elements/modal/ConfirmationModal';
import ModalHead from '../../elements/modal/ModalHead';
import ModalBody from '../../elements/modal/ModalBody';
import ModalFoot from '../../elements/modal/ModalFoot';
import FaIcon from '../../elements/FaIcon';


function AdminsDeletePopup(props) {
  return (props.isMe)? 
    <ConfirmationModal isShown={true}>
      <ModalHead>
          Confirmation Required
      </ModalHead>
      <ModalBody>
          <p>It is not recommended to delete you account this way. Please contact the root Maintainers to do so.</p>
      </ModalBody>
      <ModalFoot>
          <div className="columns is-pulled-right">
              <div className="column is-narrow">
                  <Button flat onClick={props.onCancel}>
                      Ok
                  </Button>
              </div>
          </div>
      </ModalFoot>
    </ConfirmationModal>
    :
    <ConfirmationModal isShown={true}>
      <ModalHead>
          Confirmation Required
      </ModalHead>
      <ModalBody>
          <p>Are you sure you want to delete user {props.email}?</p>
      </ModalBody>
      <ModalFoot>
          <div className="columns is-pulled-right">
              <div className="column is-narrow">
                  <Button flat onClick={props.onCancel}>
                    Cancel
                  </Button>
              </div>
              <div className="column is-narrow">
                  <Button onClick={props.onConfirm}>
                    Confirm
                  </Button>
              </div>
          </div>
      </ModalFoot>
    </ConfirmationModal>
  ;
}

export default AdminsDeletePopup;




        