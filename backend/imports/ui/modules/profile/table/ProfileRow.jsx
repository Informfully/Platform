import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import Button from '../../../elements/Button';

function ProfileRow(props) {
    
    const userId = Meteor.userId();
    const tag = props.tag;
    const k = props.k;
    const value = props.value;

    const [isEditing, setIsEditing] = useState(false);
    const [editingValue,setEditingValue] = useState(value);
    const [newVal,setNewVal] = useState(editingValue);

    
    function handleEdit(newValue){
        setEditingValue(newValue);
    }

    function handleSave(){
        setNewVal(editingValue);
        Meteor.call('profile.update',userId, k, editingValue);
        setIsEditing(false);
    }

    function handleCancel(){
        setEditingValue(newVal);
        setIsEditing(false);
    }

    return(
        <div className='pb-6'>
            <div>
                <b className='pr-2'>  {tag} </b>
                {!isEditing && 
                    <Button type='edit' onClick={() => setIsEditing(true)}>
                        {editingValue === ''?"Add":"Edit"}
                    </Button>
                }
            </div>
            <div className="table-row">
                <div>
                    {isEditing? 
                        <div className='pt-1'>
                            {tag==='Description'?
                            <textarea value={editingValue} onChange={(event)=>handleEdit(event.target.value)} rows="10"/>
                            : 
                            <textarea value={editingValue} onChange={(event)=>handleEdit(event.target.value)}/> }
                        </div>
                        :
                        <div>
                            {editingValue}
                        </div>
                    }
                </div>
                <div>
                    {isEditing ? 
                        (<div className='pt-1'>
                            <Button type="save" onClick={() => handleSave()}>
                                <i className="fas fa-check"/>
                                &nbsp;Save
                            </Button>
                            
                            <Button type="cancel" onClick={() => handleCancel()}>
                                <i className="fas fa-times"/>
                                &nbsp;Cancel
                            </Button>
                        </div>
                        ):
                        <div></div>
                    }
                </div>
            </div>
        </div>
    );
}
export default ProfileRow;

ProfileRow.propTypes = {
    tag: PropTypes.string.isRequired,
    value:PropTypes.string.isRequired,
    k:PropTypes.string.isRequired,
};