import { Meteor } from 'meteor/meteor';
import { userIsInRole } from '../../../lib/utils/utils_account';
import Experiments from '../../experiments';

Meteor.publish('experiments', () => {

    const user = Meteor.user({ fields: { experiments: 1 } });
    if (!user) {
        return null;
    }

    if (!userIsInRole('admin')) {
        return null;
    }

    const ownedExperiments = user.experiments.map(experiment => experiment.experiment);

    return Experiments.find({ _id: { $in: ownedExperiments } });
});

Meteor.publish('activeExperiment', function activeExperimentPublication() {

    const user = Meteor.user({ fields: { participatesIn: 1 } });
    if (!user) {
        return null;
    }

    // a user can participate only in a single experiment
    const activeExperiment = Experiments.findOne({ _id: user.participatesIn });
    this.added('activeExperiment', activeExperiment._id, { ...activeExperiment });
});
