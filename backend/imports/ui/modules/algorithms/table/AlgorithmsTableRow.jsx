import React,{useState,useEffect} from 'react';
import PropTypes from 'prop-types';
import Button from '../../../elements/Button';
import FaIcon from '../../../elements/FaIcon';
import { Meteor } from 'meteor/meteor';




export default function AlgorithmsTableRow({
    groupId, name, currentAlgorithm, availableAlgorithms
}) {

    const [isEditing, setIsEditing] = useState(false);
    const [newVal,setNewVal] = useState("");

    const current = availableAlgorithms.find(availableAlgorithm=>availableAlgorithm._id===currentAlgorithm);

    const experimentId = localStorage.getItem('selectedExperiment');
    const numUser = Meteor.users.find({participatesIn:experimentId,userGroup:name}).count();


    function handleAlgorithmChange(algorithmId){
        setNewVal(algorithmId);
    }

    function handleSave(){
        Meteor.call('userGroups.update',groupId,experimentId, {key:'algorithm', value:newVal});
        setIsEditing(false);
    }

    function handleCancel(){
        setIsEditing(false);
    }


    let dropbox = (
        <div>
            {isEditing?
            <div className='level-left'>
                <select onChange={event=>handleAlgorithmChange(event.target.value)} className="narrow" defaultValue={currentAlgorithm}>
                    <option key="choose" value="" disabled hidden>Choose here</option>
                    {availableAlgorithms.map((a) => (
                    <option key={a._id} value={a._id}>
                        {a.name}
                    </option>
                    ))}
                </select>
                <a className='pl-3' onClick={()=>handleSave()}>
                    <FaIcon icon="fal fa-check" />
                </a> 
                <a className='pl-3' onClick={()=>handleCancel()}>
                    <FaIcon icon="fal fa-times" />
                </a> 
            </div>
            :
            <div>
                <span className='pr-2'>  {current ? current.name : "Unassigned"} </span>
                <Button type='edit' onClick={()=>{setIsEditing(true)}}>
                    Edit
                </Button>
            </div>
            }
            
        </div>
        
    )

    let cells = [
        name,
        dropbox,
        numUser,
    ]


    return (
        <div>
            <div className="table-row columns">
                {
                    cells.map((cell) => (
                        <div className="column" key={cell}>
                            { cell }
                        </div>
                    ))
                }
            </div>
        </div>
    );
}

AlgorithmsTableRow.propTypes = {
    groupId:PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    currentAlgorithm: PropTypes.string.isRequired,
    availableAlgorithms: PropTypes.array.isRequired,
};
