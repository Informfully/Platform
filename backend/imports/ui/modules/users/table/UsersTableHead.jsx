import React from 'react';

export default function UsersTableHead() {

    let headers = [
        'Username',
        'Joined',
        'User group',
        'Delete',
    ]

    return (
        <div className="table-head columns is-hidden-mobile">
            {
                headers.map((header) => (
                    <div className="column" key={header}>
                        {header}
                    </div>
                ))
            }
        </div>
    );

}
