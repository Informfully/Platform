import { Meteor } from 'meteor/meteor';
import React from 'react';
import { useState } from 'react';
import Button from '../../elements/Button';
import UsersWarningModalExceedingLimit from './UsersWarningModalExceedingLimit';

export default function UsersCreation()  {

    const [userCount,setUserCount] = useState(1);
    const [userGroup,setUserGroup] = useState('baseline');
    const [showModal,setShowModal] = useState(false);

    function handleChangeUserGroup(event) {
        setUserGroup(event.target.value);
    }

    function handleChangeUserCount(event) {
        setUserCount(Number(event.target.value));
    }

    function handleSubmit() {
        Meteor.call('experiments.addUsers',
            localStorage.getItem('selectedExperiment'),
            userCount,
            userGroup,
            (err, res) => {
                if (err) {
                    console.log("err",err)
                    if (err.reason="'Number of created account exceeded limit'"){
                        console.log("reason match")
                    }
                    setShowModal(true);
                    console.log("showModal",showModal);
                }
            }
        );
    }

    function handleCloseModal() {
        setShowModal(false);
    }

    return  (
        <div>
            <div className="columns-userCreation">
                <div className="column is-one-quarter">
                    <div className="column has-text-weight-bold">
                        Amount
                    </div>
                    <input
                        type="number"
                        min="1"
                        max="30"
                        value={userCount}
                        onChange={(event)=>handleChangeUserCount(event)}
                    />
                </div>

                <div className="column">
                    <div className="column has-text-weight-bold">
                        User group
                    </div>
                    <input
                        type="text"
                        placeholder="User group"
                        value={userGroup}
                        onChange={(event)=>handleChangeUserGroup(event)}
                    />
                </div>

                <div className="column">
                    <Button onClick={()=>handleSubmit()} >
                        Submit
                    </Button>
                </div>
            </div>
            {showModal && <UsersWarningModalExceedingLimit onDismiss={()=>handleCloseModal()} />}
        </div>
    )
    
}