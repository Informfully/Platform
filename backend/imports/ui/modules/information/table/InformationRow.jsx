import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../../../elements/Button';

function InformationRow(props) {

    const tag = props.tag;
    const value = props.value;
    const key = props.k
    const expId = props.experimentId
    const [isEditing, setIsEditing] = useState(false);
    const [editingValue,setEditingValue] = useState(value);
    const [newVal,setNewVal] = useState(editingValue);

    
    function handleEdit(newValue){
        setEditingValue(newValue);
    }

    function handleSave(){
        setNewVal(editingValue);
        Meteor.call('experiments.updateInformation',expId, {key:key, value:editingValue});
        setIsEditing(false);
    }

    function handleCancel(){
        // set the value in the box back to the original value
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
                                <i class="fas fa-check"/>
                                &nbsp;Save
                            </Button>
                            
                            <Button type="cancel" onClick={() => handleCancel()}>
                                <i class="fas fa-times"/>
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
export default InformationRow;

InformationRow.propTypes = {
    tag: PropTypes.string.isRequired,
    value:PropTypes.string.isRequired,
    k:PropTypes.string.isRequired,
    experimentId:PropTypes.string.isRequired,
};