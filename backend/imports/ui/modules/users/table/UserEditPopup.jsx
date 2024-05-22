import React, { useState } from 'react';
import FaIcon from '../../../elements/FaIcon';

function UserEditPopup(props) {

    const [newUsergroup, setNewUsergroup] = useState(props.userGroup)

    function handleChangeUserGroup(newUsergroupName){
        setNewUsergroup(newUsergroupName);
    }

    function onConfirm(){
        Meteor.call('experiments.updateUsergroup', 
            localStorage.getItem('selectedExperiment'), 
            props.userId, 
            newUsergroup);
        props.onCancel();
    }

    return (
        <div className="table-row columns">
            
            <div className='Columne'>
                <div>
                <input
                    type="text"
                    placeholder={props.userGroup}
                    value={newUsergroup}
                    onChange={(event) => handleChangeUserGroup(event.target.value)}
                />
                </div>
            </div>
            <div className='level-item'>
                <a onClick={onConfirm}>
                    <FaIcon icon="fal fa-check red" />
                </a> 
                <a onClick={props.onCancel}>
                    <FaIcon icon="fal fa-times" />
                </a> 
            </div>
        </div>
    );
  }
  
  export default UserEditPopup;