import React from 'react';
import PropTypes from 'prop-types';
import AdminsTableHead from './AdminsTableHead';
import AdminsTableBody from './AdminsTableBody';


export default function AdminsTable({admins}) {
    if (!admins.length) {
        return (
            <p>No admins Found</p>
        )
    }

    return (
        <div>
            <AdminsTableHead />
            <AdminsTableBody admins={admins} />
            <br/>
            <br/>
            <a style={{ color: 'grey', fontStyle: 'italic'}}>
                {admins.length} admins and maintainer in total
            </a>
        </div>
    );

}

AdminsTable.propTypes = {
    admins: PropTypes.array.isRequired,
};
