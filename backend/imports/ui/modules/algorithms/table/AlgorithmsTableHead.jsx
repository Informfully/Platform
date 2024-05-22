import React from 'react';

export default function AlgorithmsTableHead() {
    let headers = [
        'User Groups',
        'Algorithms',
        'Number of Users',
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