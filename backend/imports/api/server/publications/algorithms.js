import { Meteor } from 'meteor/meteor';
import { userIsInRole } from '../../../lib/utils/utils_account';
import  AlgorithmsCollection from '../../algorithms';

Meteor.publish('algorithms', () => {
    const user = Meteor.user();
    if (!user) {
        throw new Meteor.Error(403, 'Permission Denied');
    }

    if (!userIsInRole('admin')) {
        throw new Meteor.Error(403, 'Permission Denied');
    }

    return AlgorithmsCollection.find();
});

