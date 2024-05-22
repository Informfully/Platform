import React, { useState } from 'react';
import Button from '../../elements/Button';
import ModuleSection from '../../layout/ModuleSection';
import ConfirmationModal from '../../elements/modal/ConfirmationModal';
import ModalHead from '../../elements/modal/ModalHead';
import ModalBody from '../../elements/modal/ModalBody';
import ModalFoot from '../../elements/modal/ModalFoot';


function AdminsEditPopup(props) {

  const [newEmail, setNewEmail] = useState(props.email)
  const [newMaxUserAccount, setNewMaxUserAccount] = useState(props.maxUserAccount)

  function handleChangeEmail(newEmailName){
    setNewEmail(newEmailName);
  }

  function handleChangeMaxUserAccount(newMaxUserAccount){
    setNewMaxUserAccount(newMaxUserAccount);
  }

  function handleConfirm(){
      const parsedMaxUserAccount = parseInt(newMaxUserAccount, 10);
      Meteor.call('user.update', props.userId, newEmail, parsedMaxUserAccount);
      props.onCancel();
  }

  return (
    <ConfirmationModal isShown={true}>
      <ModalHead>
          Edit
      </ModalHead>
      <ModalBody>
        <label>Email</label>
        <input
            type="text"
            placeholder={props.email}
            value={newEmail}
            onChange={(event) => handleChangeEmail(event.target.value)}
        />
        <br />
        <br />
        <label>Maximum User Account</label>
        <input
          type = "number" 
          placeholder={props.maxUserAccount}
          value={newMaxUserAccount}
          onChange={(event) => handleChangeMaxUserAccount(event.target.value)}
        />
      </ModalBody>
      <ModalFoot>
          <div className="columns is-pulled-right">
              <div className="column is-narrow">
                  <Button flat onClick={props.onCancel}>
                    Cancel
                  </Button>
              </div>
              <div className="column is-narrow">
                  <Button onClick={()=>handleConfirm()}>
                    Confirm
                  </Button>
              </div>
          </div>
      </ModalFoot>
    </ConfirmationModal>
  );
}

export default AdminsEditPopup;