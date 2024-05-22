import React from 'react';
import PropTypes from 'prop-types';
import UsersTableHead from './UsersTableHead';
import UsersTableBody from './UsersTableBody';

export default function UsersTable({ users,experimentId, maxUserAccount,createdAccount }) {

    if (!users.length) {
        return (
            <p>No users for selected experiment</p>
        )
    }

    return (
        <div>
            <UsersTableHead />
            <UsersTableBody users={users} experimentId={experimentId}/>
            <br/>
            <br/>
            <a style={{ color: 'grey', fontStyle: 'italic'}}>
                {users.length} users in this experiment, {createdAccount} in all experiments, {maxUserAccount-createdAccount} more accounts can be created
            </a>
        </div>
    );

}

UsersTable.propTypes = {
    users: PropTypes.array.isRequired,
    experimentId:PropTypes.string.isRequired,
};
