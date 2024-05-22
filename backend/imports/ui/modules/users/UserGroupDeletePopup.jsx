import React, { useState } from 'react';
import ModuleSection from '../../layout/ModuleSection';
import { Meteor } from 'meteor/meteor';
import Button from '../../elements/Button';
import PropTypes from 'prop-types';
import ConfirmationModal from '../../elements/modal/ConfirmationModal';
import ModalHead from '../../elements/modal/ModalHead';
import ModalBody from '../../elements/modal/ModalBody';
import ModalFoot from '../../elements/modal/ModalFoot';



export default function UserGroupDeletePopup({expId,groupName,numUser,onCancel}) {

    function handleConfirm(){
        Meteor.call("userGroups.remove",groupName,expId);
        onCancel()
    }

    return (!numUser==0)? 

        <ConfirmationModal isShown>
            <ModalHead>
                Confirmation Required
            </ModalHead>
            <ModalBody>
                <p>There {numUser==1?"is":"are"} still {numUser} user{numUser==1?"":"s"} in {groupName}. </p>
                <p>Deleting this group will also remove these users. </p>
                <p>Are you sure to proceed?</p>
                <br/>
            </ModalBody>
            <ModalFoot>
                <div className="level is-pulled-right">
                    <div className="pl-3">
                        <Button  flat onClick={()=>handleConfirm()}>
                            Confirm
                        </Button>
                    </div>
                    <div className="pl-3">
                        <Button onClick={()=>onCancel()}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </ModalFoot>
        </ConfirmationModal>
        :
        <ConfirmationModal isShown>
            <ModalHead>
                Confirmation Required
            </ModalHead>
            <ModalBody>
                <p>Are you sure you want to delete user group {groupName}?</p>
                <br/>
            </ModalBody>
            <ModalFoot>
                <div className="columns is-pulled-right">
                    <div className="column is-narrow">
                        <Button flat onClick={()=>onCancel()}>
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
  ;
}


UserGroupDeletePopup.propTypes = {
    groupName:PropTypes.string.isRequired,
    expId:PropTypes.string.isRequired,
};
