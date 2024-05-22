import { Meteor } from 'meteor/meteor';
import React, { Component,useState } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';

import Module from '../../layout/Module';
import ModuleSection from '../../layout/ModuleSection';
import ModuleHead from '../../layout/ModuleHead';
import ModuleTitle from '../../layout/ModuleTitle';
import AlgorithmsTableHead from './table/AlgorithmsTableHead';
import AlgorithmsTableBody from './table/AlgorithmsTableBody';
import AlgorithmsTableRow from './table/AlgorithmsTableRow';
import Experiments from '../../../api/experiments';
import {userGroups} from '../../../api/userGroups';
import AlgorithmsCollection from '../../../api/algorithms';
import UserGroupsCollection from '../../../api/userGroups';
import Button from '../../elements/Button';


class Algorithms extends Component {


    render() {
        const {isLoading,existingUserGroups,availableAlgorithms} = this.props;
    

        if (isLoading) {
            return (<div>loading...</div>);
        }

        return (
            <Module>
                <ModuleHead>
                    <ModuleTitle>
                        {`Algorithms`}
                    </ModuleTitle>
                 </ModuleHead>

                <ModuleSection card content>
                    <AlgorithmsTableHead/>
                    <AlgorithmsTableBody existingUserGroups={existingUserGroups} availableAlgorithms={availableAlgorithms}/>
                </ModuleSection>
            </Module>
        );
    }
}
 
Algorithms.defaultProps = {
    isLoading: true,
    userGroups: [],
    algorithms: [],
    
};

Algorithms.propTypes = {
    isLoading: PropTypes.bool.isRequired,
    userGroups: PropTypes.array,
    algorithms: PropTypes.array,
};

export default withTracker(() => {
    const expId = localStorage.getItem('selectedExperiment');

    const algorithmsSubscription = Meteor.subscribe('algorithms');
    const userGroupsSubscription = Meteor.subscribe('userGroups',expId);
    const userSubscription = Meteor.subscribe('users.inUserGroup');

    const isLoading = !algorithmsSubscription.ready()||!userGroupsSubscription.ready()||!userSubscription.ready()
    
    const existingUserGroups = UserGroupsCollection.find({experimentId:{$eq:expId}}).fetch();
    const availableAlgorithms = AlgorithmsCollection.find().fetch();
    
    return {
        isLoading,
        existingUserGroups,
        availableAlgorithms,
    };
})(Algorithms);