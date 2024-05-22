import { check, Match } from 'meteor/check';
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { userIsInRole, userOwnsExperiment } from '../lib/utils/utils_account';

export default AlgorithmsCollection = new Mongo.Collection('algorithms');

Meteor.methods({

    'algorithms.getAll'() {        
        return AlgorithmsCollection.find().fetch();
    },

    'algorithms.create'(name, path) {
        check(name, String);
        check(path, String);

        return AlgorithmsCollection.insert({
            name,
            path,
        });
    },

    'algorithms.remove'(algorithmId) {
        check(algorithmId, String);
        
        return AlgorithmsCollection.remove({ _id: algorithmId});
    },

    'algorithms.update'(algorithmId, keyValueObject) {
        check(algorithmId, String);
        check(keyValueObject,Object);
        check(keyValueObject.key, String);
        check(keyValueObject.value, String);

        if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        AlgorithmsCollection.update({ _id: algorithmId }, {
            $set: {
                [keyValueObject.key]:keyValueObject.value
            },
        });
    },
});
