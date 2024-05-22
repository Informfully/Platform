import React,{useState} from 'react';
import PropTypes from 'prop-types';
import Button from '../../../elements/Button';
import FaIcon from '../../../elements/FaIcon';
import UserEditPopup from './UserEditPopup'

export default function UsersTableRow({
    userId, username, createdAt, userGroup,experimentId,
}) {
    const [isEditing, setIsEditing] = useState(false)

    let cells = [
        username,
        (new Date(createdAt)).toDateString(),
        // userGroup
    ]

    function handleDelete() {
        Meteor.call('user.remove', userId);
    }

    function handleEdit() {
        setIsEditing(true);
    }

    function onCancel(){
        setIsEditing(false);
    }


    return (
        <div>
            <div className="table-row columns">
                {
                    cells.map((cell) => (
                        <div className="column" key={cell}>
                            {cell}
                        </div>
                    ))
                }
                <div className="column" >
                    {isEditing?
                        (
                            <UserEditPopup userId={userId} username={username} userGroup={userGroup} experimentId={experimentId} onCancel={onCancel} />
                        )
                        :
                        (
                            <div>
                                <span style={{ marginRight: '30px' }}>{userGroup}</span>
                                <a onClick={() => { handleEdit() }}>
                                    <FaIcon icon="edit" regular={true} style={{ marginLeft: '10px' }}/>
                                </a>
                            </div>
                        )
                    }
                </div>
                <div className="column" >
                    <a onClick={ () => { handleDelete() }}>
                        <FaIcon icon="trash-alt" regular={true}/>
                    </a>
                </div>
            </div>
        </div>
    );
}

UsersTableRow.propTypes = {
    username: PropTypes.string.isRequired,
    createdAt: PropTypes.object.isRequired,
    experimentId:PropTypes.string.isRequired,
};
