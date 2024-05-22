import React from 'react';

export default function AdminsTableHead() {
    let headers = [
        'Email',
        'Role',
        'Created Time',
        'Headcount/Created',
        'initial password',
        'Operation',
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
