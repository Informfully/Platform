import UserGroup from './UserGroup';
import { useTracker } from 'meteor/react-meteor-data';
import Module from '../../layout/Module';
import ModuleSection from '../../layout/ModuleSection';
import ModuleHead from '../../layout/ModuleHead';
import ModuleTitle from '../../layout/ModuleTitle';
import React, { Component,useEffect } from 'react';
import AlgorithmsCollection from '../../../api/algorithms';


export default function UserGroups({existingUserGroups}){

    const isLoading = useTracker(() => {
        const algorithmSubscription = Meteor.subscribe('algorithms');
        return !algorithmSubscription.ready();
    }, []);

    const getAlgorithmNames = ((algorithmId)=>{
        if (!isLoading){
            const algorithmFound = AlgorithmsCollection.findOne({ _id: algorithmId });
            if (algorithmFound){
                return algorithmFound.name
            }
            return "";
        }
    })

    const groups = existingUserGroups.map(({
        _id,
        userGroup,
        algorithm
    }) => (
        <UserGroup
            key={_id}
            _id={_id}
            name={userGroup}
            algorithmId={algorithm}
            algorithmName={getAlgorithmNames(algorithm)}
        />
    ));

    return(
        isLoading?
        (<div>
            isloading
        </div>)
        :
        (
        <div className="userGroups-Container is-full-desktop" >
            {groups}
        </div>
        )
        
    )
}
