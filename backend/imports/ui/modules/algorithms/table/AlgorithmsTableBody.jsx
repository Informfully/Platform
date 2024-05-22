import React,  {useState} from 'react';
import PropTypes from 'prop-types';
import AlgorithmsTableRow from './AlgorithmsTableRow';
import FaIcon from '../../../elements/FaIcon';
import Button from '../../../elements/Button';



export default function AlgorithmsTableBody({existingUserGroups,availableAlgorithms}) {

    const rows = existingUserGroups.map(({
        _id,
        userGroup,
        algorithm
    }) => (
        <AlgorithmsTableRow
            key = {_id}
            groupId={_id}
            name={userGroup}
            currentAlgorithm={algorithm}
            availableAlgorithms={availableAlgorithms}
        />
    ));

    return (
        <div className="table-body">
            { rows }
        </div>
    );
}

AlgorithmsTableBody.propTypes = {
    existingUserGroups: PropTypes.array.isRequired,
    availableAlgorithms: PropTypes.array.isRequired,
};
