import React from 'react';
import PropTypes from 'prop-types';
import UsersTableRow from './UsersTableRow';

export default function UsersTableBody({ users,experimentId }) {

    const rows = users.map(({
        _id,
        username,
        createdAt,
        userGroup,
    }) => (
        <UsersTableRow
            key={_id}
            userId={_id}
            username={username}
            createdAt={createdAt}
            userGroup={userGroup}
            experimentId={experimentId}
        />
    ));

    return (
        <div className="table-body">
            { rows }
        </div>
    );

}

UsersTableBody.propTypes = {
    users: PropTypes.array.isRequired,
    experimentId:PropTypes.string.isRequired,
};
