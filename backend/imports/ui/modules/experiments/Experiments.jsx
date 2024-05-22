import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';

import ExperimentsCollection from '../../../api/experiments';

import ModuleSection from '../../layout/ModuleSection';
import Button from '../../elements/Button';
import FaIcon from '../../elements/FaIcon';
import ExperimentsModule from './Experiment';
import Module from '../../layout/Module';

class Experiments extends Component {

    userNumbers(experimentId){
        return Meteor.users.find({participatesIn:experimentId}).count();
    }

    get experiments() {
        const { experiments } = this.props;

        if (!experiments.length) {
            return <div className="column">No available experiments...</div>;
        }

        return experiments.map(experiment => (
            <div className="" key={experiment._id}>
                <ExperimentsModule
                    experiment={experiment}
                    userNumber={this.userNumbers(experiment._id)}
                />
            </div>
        ));
    }

    render() {
        if (this.props.isLoading) {
            return <div>loading...</div>;
        }

        return (
            <Module>
                <div className="is-flex is-flex-direction-column p-6">
                    <Button href="/experiments/create" text={false} type="new">
                        <FaIcon icon="plus" />
                        {' '}
                        New Experiment
                    </Button>
                </div>
                { this.experiments }
            </Module>
        );
    }
}

Experiments.defaultProps = {
    isLoading: true,
    experiments: [],
};

Experiments.propTypes = {
    isLoading: PropTypes.bool,
    experiments: PropTypes.array,
};

export default withTracker(() => {
    const experimentSubscription = Meteor.subscribe('experiments');
    const userSubscription = Meteor.subscribe('users.all');

    const isLoading = !userSubscription.ready() || !experimentSubscription.ready();

    const experiments = ExperimentsCollection.find({}, { fields: { likeSurvey: 0, dislikeSurvey: 0 } }).fetch();

    return {
        isLoading,
        experiments,
    };

})(Experiments);
