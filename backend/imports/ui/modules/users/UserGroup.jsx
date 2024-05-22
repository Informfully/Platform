import FaIcon from '../../elements/FaIcon';
import React, { useState } from 'react';
import ModuleSection from '../../layout/ModuleSection';
import { Meteor } from 'meteor/meteor';
import Select from 'react-select/lib/Select';
import UserGroupDeletePopup from './UserGroupDeletePopup';
import Button from '../../elements/Button';

import { useTheme }  from '../../context/ThemeContext'



export default function UserGroup({_id,name,algorithmId,algorithmName}){

    const [isEditing, setIsEditing] = useState(false);
    const [inputedName, setInputedName] = useState(name);
    const [deleteTrigger, setDeleteTrigger] = useState(false);
    
    const { themeIsDark } = useTheme();

    const theme = themeIsDark?'is-dark':'';

    const experimentId = localStorage.getItem('selectedExperiment');
    const numUser = Meteor.users.find({participatesIn:experimentId,userGroup:name}).count();

    function handleEdit(){
        setIsEditing(true);
    }

    function handleSave(){
        Meteor.call('userGroups.update',_id, experimentId, {"key": "userGroup","value":inputedName})
        setIsEditing(false);
    }

    function handleCancel(){
        setIsEditing(false);
    }

    function handleDeleteTrigger() {
        setDeleteTrigger(!deleteTrigger)
    }
    

    function handleInputNewName(value){
        setInputedName(value)
    }

    return(
        <div className={`userGroup-card ${theme}`}>
            {
                !isEditing?
                (<div className='pb-2'>
                    <b className='pr-1'>  {name} </b>
                    <Button type='edit' onClick={()=>handleEdit()}>
                        Edit
                    </Button>
                </div>
                )
                :
                (
                <div className="level-left pb-2">
                    <input className="narrow"
                        type="text"
                        value={inputedName}
                        onChange={(event)=>handleInputNewName(event.target.value)}
                    />
                    <a className='pl-3' onClick={()=>handleSave()}>
                        <FaIcon icon="fal fa-check" />
                    </a> 
                    <a className='pl-3' onClick={()=>handleCancel()}>
                        <FaIcon icon="fal fa-times" />
                    </a> 
                </div>
                )
            
            }
            <div className="pb-2 is-size-7">
                <b className='mr-2'>_Id:</b> {_id}
            </div>
            <div className="pb-2 is-size-7">
                <b className='mr-2'>Algo Name:</b> {algorithmName}
            </div>
            <div className="pb-2 is-size-7">
                <b className='mr-2'>Algo _Id:</b> {algorithmId}
            </div>
            <div className="pb-2 is-size-7">
                <b className='mr-2'>Number of Users:</b> { numUser }
            </div>
            
        
            <span className='block'>
                <a className="is-pulled-right" onClick={()=>handleDeleteTrigger()}>
                    <FaIcon icon="trash" />
                </a>
            </span>
            {deleteTrigger&&<UserGroupDeletePopup expId={experimentId} groupName={name} numUser={numUser} onCancel={()=>handleDeleteTrigger()}/>}
        </div>
    )
}