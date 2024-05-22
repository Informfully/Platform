import React,{useState,useEffect} from 'react';
import PropTypes from 'prop-types';
import Button from '../../../elements/Button';
import FaIcon from '../../../elements/FaIcon';
import AdminsDeletePopup from '../AdminsDeletePopup';
import AdminsEditPopup from '../AdminsEditPopup';


export default function AdminsTableRow({
    key,userId, createdAt, emails, roles, maxUserAccount, createdAccount,plainTextInitialPassword,
}) {
    const email = emails[0].address;
    const role =  roles.includes('maintainer') ? 'Maintainer' : roles.includes('admin') ? 'Admin(Researcher)' : undefined;
    const isMe = Meteor.user() && email === Meteor.user().emails[0].address;
    const isMaxUserAccountUndefined = !maxUserAccount

    // edit popup
    const [editTrigger, setEditTrigger] = useState(false)
    // delete confirmation popup
    const [deleteTrigger, setDeleteTrigger] = useState(false);


    function handleDeleteConfirm(){
        //delete user
        Meteor.call('user.remove', userId);
        //close delete popup
        setDeleteTrigger(!deleteTrigger);
    }

    function handleEdit() {
        if (deleteTrigger==true){
            setDeleteTrigger(false)
        }
        setEditTrigger(!editTrigger);
    }

    function handleDelete() {
        if (editTrigger==true){
            setEditTrigger(false)
        }
        setDeleteTrigger(!deleteTrigger)
    }


    let cells = [
        (isMe &&  <div>{email} (me)</div>)||(!isMe && email),
        role,
        (new Date(createdAt)).toDateString(),
        isMaxUserAccountUndefined && <div><FaIcon icon="fa-solid fa-infinity" />/{createdAccount}</div> ||<div>{maxUserAccount}/{createdAccount}</div>,
        plainTextInitialPassword,
    ]


    return (
        <div>
            <div className="table-row columns">
                {
                    cells.map((cell) => (
                        <div className="column">
                            { cell }
                        </div>
                    ))
                    
                }
                <div className="column"  >
                    <a onClick={() => {handleDelete()}}>
                        <FaIcon icon="trash-alt" regular={true} />
                    </a>
                    <a onClick={() => {handleEdit()}}  style={{ marginLeft: '15px' }}>
                        <FaIcon icon="edit" regular={true}/>
                    </a>
                </div>
            </div>
            {deleteTrigger && 
                <AdminsDeletePopup 
                    isMe={isMe} 
                    email={email} 
                    onConfirm={()=>handleDeleteConfirm()} 
                    onCancel={()=>setDeleteTrigger(false)}
                />
            }
            {editTrigger && 
                <AdminsEditPopup 
                    userId={userId}
                    email={email} 
                    roles={roles} 
                    maxUserAccount={maxUserAccount}
                    onCancel={()=>setEditTrigger(false)}
                />
            }
        </div>    
    );
}

AdminsTableRow.propTypes = {
    userId: PropTypes.string.isRequired,
    createdAt: PropTypes.object.isRequired,
    emails: PropTypes.array.isRequired,
    roles: PropTypes.array.isRequired,
};
