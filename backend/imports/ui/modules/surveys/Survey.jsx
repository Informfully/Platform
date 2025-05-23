import React, { useState } from 'react';
import Button from '../../elements/Button';
import { useTheme } from '../../context/ThemeContext';
import FaIcon from '../../elements/FaIcon';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';


export default function Survey (props) {
    
    const {_id, name, experiment, questions, isActive} = props

    const [inputedName, setInputedName] = useState(name);
    const [isEditing, setIsEditing] = useState(false);

    const {themeIsDark} = useTheme();
    const theme = themeIsDark?'is-dark':'';


    function handleEdit(event){
        event.stopPropagation();
        setIsEditing(true);
    }

    function handleSave(event){
        event.stopPropagation()
        Meteor.call('surveys.changeName',_id, inputedName);
        setIsEditing(false);
    }

    function handleCancel(event){
        event.stopPropagation();
        setIsEditing(false);
    }
    

    function handleInputNewName(event){
        event.stopPropagation();
        // event.preventDefault()
        setInputedName(event.target.value)
    }

    function navigate(_id){
        FlowRouter.go(`/surveys/${_id}`);

    }


    return  (
            <div className={`userGroup-card ${theme} is-full-mobile`} key={_id}>
                <div className="link-reset" onClick={()=>navigate(_id)}>
                    {!isEditing?
                    (<div className='pb-2'>
                        <b className='pr-1'>  {name} </b>
                        <Button 
                            type='edit' 
                            onClick={(event)=>handleEdit(event)}
                        >
                            Rename
                        </Button>
                    </div>
                    )
                    :
                    (
                    <div className="level-left pb-2">
                        <input className="narrow"
                            type="text"
                            value={inputedName}
                            onClick={(event)=>event.stopPropagation()}
                            onChange={(event)=>handleInputNewName(event)}
                        />
                        <a className='pl-3' onClick={(event)=>handleSave(event)}>
                            <FaIcon icon="fal fa-check" />
                        </a> 
                        <a className='pl-3' onClick={(event)=>handleCancel(event)}>
                            <FaIcon icon="fal fa-times" />
                        </a> 
                    </div>
                    )}
                    <div className="level-left">
                        <b className='is-size-6 mr-2'>_Id </b><div className='is-size-7'>{ _id }</div>
                    </div>
                    <div className="level-left">
                        <FaIcon icon="users" className="mr-2"/><div className='is-size-7'>{ `Exp _Id:  ${experiment}` }</div>
                    </div>
                    <div className="level-left">
                        <FaIcon icon="question-circle" className="mr-2"/><div className='is-size-7'>{ `Number of questions:  ${questions.length}`}</div>
                    </div>
                    <div className="level-left">
                        {isActive?<FaIcon icon="toggle-on" className="mr-2"/>:<FaIcon icon="toggle-off" className="mr-2"/>}<div className='is-size-7'>{`Active:  ${isActive}`}</div>
                    </div>
                </div>
            </div>
        );
}