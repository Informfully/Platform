import { Meteor } from 'meteor/meteor';
import React, { Component } from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';
import { hasExperimentLaunched } from '../../../lib/utils/utils_account';

import Module from '../../layout/Module';
import ModuleSection from '../../layout/ModuleSection';
import ModuleHead from '../../layout/ModuleHead';
import ModuleTitle from '../../layout/ModuleTitle';
import UsersTable from './table/UsersTable';
import UsersCreation from './UsersCreation';
import UsersWarningModal from './UsersWarningModal';
import UserGroups from './UserGroups';
import Button from '../../elements/Button';

import { useState, startTransition } from 'react';


export default function Users () {

    const experimentId = localStorage.getItem('selectedExperiment');
    const [searchString,setSearchString] = useState("");
    const [showAddUsers,setShowAddUsers] = useState(false);
    const [showModal,setShowModal] = useState(false);

    const maxUserAccount = Meteor.user().profile.maxUserAccount;
    const createdAccount = Meteor.user().profile.createdAccount;

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    const { isLoading, users, existingUserGroups} = useTracker(() => {

        const experimentSubscription = Meteor.subscribe('experiments');
        const userSubscription = Meteor.subscribe('users.all');
        const userGroupsSubscription = Meteor.subscribe('userGroups',experimentId);
        
        const isLoading = !userSubscription.ready() || !experimentSubscription.ready() || !userGroupsSubscription.ready();

        const existingUserGroups=UserGroupsCollection.find({experimentId:{$eq:experimentId}}).fetch()

        const escapedSearchString = escapeRegExp(searchString);
        const regexp = new RegExp(escapedSearchString, 'i');
        const query = {
            participatesIn: experimentId,
            $or: [
                { 'emails.address': regexp },
                { userGroup: regexp },
                { username: regexp },
            ],
        };

        const users = Meteor.users.find(query).fetch();

        return {users, isLoading, existingUserGroups};
        
    },[experimentId, searchString]);

    function handleChangeSearchField(value) {
        startTransition(()=>{
            setSearchString(value);
        })
    }

    function handleExportUsers() {
        const header = 'username,password,usergroup\n';
        const csv = users.map(
            user => [ user.username, user.plaintextPassword, user.userGroup ].join(',')
        ).join('\n');

        const file = new Blob([ header, csv, '\n' ], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = 'userdata.csv';
        a.click();
        window.URL.revokeObjectURL(a.href);
    }

    function handleCloseModal() {
        setShowModal(false);
    }

    function handleExpandAddUsers() {
        if (hasExperimentLaunched(experimentId)) {
            setShowModal(true);
        } else {
            setShowAddUsers(!showAddUsers);
        }
    }
 

    return (
        isLoading?
        <div>
            is loading...
        </div>
        :
        <Module>
            <ModuleHead>
                <ModuleTitle>
                    {`User Groups (${existingUserGroups.length})`}
                </ModuleTitle>
            </ModuleHead>
            <ModuleSection>
                <UserGroups existingUserGroups={existingUserGroups}/>
            </ModuleSection>
        
            <UsersWarningModal isActive={showModal} onDismiss={()=>handleCloseModal()} />
            <ModuleHead>
                <ModuleTitle>
                    {`Users (${users.length})`}
                </ModuleTitle>
                <div className="level-right">
                    <div className="level-item">
                        <input
                            autoFocus
                            type="search"
                            placeholder="Search User..."
                            value={searchString}
                            onChange={(event)=>handleChangeSearchField(event.target.value)}
                        />
                    </div>
                    <div className="level-item">
                        <Button onClick={()=>handleExpandAddUsers()} >
                            + Add users
                        </Button>
                    </div>
                    <div className="level-item">
                        <Button onClick={()=>handleExportUsers()}>
                            CSV Export
                        </Button>
                    </div>
                </div>
            </ModuleHead>

            {showAddUsers
                && (
                    <ModuleSection card content>
                        <UsersCreation onSubmit={() =>setShowAddUsers(false )} />
                    </ModuleSection>
                )
            }

            <ModuleSection card content>
                <UsersTable users={users} 
                experimentId={experimentId} 
                maxUserAccount={maxUserAccount}
                createdAccount={createdAccount}/>
            </ModuleSection>
            <div>
            
        </div>
        </Module>
    );
}

Users.defaultProps = {
    isLoading: true,
    users: [],
};

Users.propTypes = {
    isLoading: PropTypes.bool.isRequired,
    users: PropTypes.array,
};
