import React from 'react';
import PropTypes from 'prop-types';
import AdminsTableRow from './AdminsTableRow';

export default function AdminsTableBody({ admins }) {
    
    const rows = admins.map(({
        _id,
        createdAt,
        emails,
        roles,
        profile,
    }) => (
        <AdminsTableRow
            key={_id}
            userId={_id}
            createdAt={createdAt}
            emails={emails}
            roles={roles}
            maxUserAccount={profile.maxUserAccount}
            createdAccount={profile.createdAccount}
            plainTextInitialPassword = {profile.plainTextInitialPassword}
        />
    ));

    return (
        <div className="table-body">
            { rows }
        </div>
    );

}

AdminsTableBody.propTypes = {
    admins: PropTypes.array.isRequired,
};
