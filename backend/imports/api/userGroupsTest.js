import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { userIsInRole } from '../lib/utils/utils_account';

export default UserGroupsCollectionTest = new Mongo.Collection('userGroups.test');

Meteor.methods({

    'userGroups.create.test'(userGroup, experimentId,algorithm="") {
        check(userGroup, String);
        check(experimentId, String);

        UserGroupsCollectionTest.insert({
            experimentId,
            userGroup,
            algorithm,
        });
    },

    'userGroups.remove.test'(userGroupName, experimentId) {
        check(userGroupName, String);
        check(experimentId, String);
        UserGroupsCollectionTest.remove({ userGroup: userGroupName,experimentId:experimentId });
    },

    'userGroups.update.test'(userGroupId, keyValueObject) {
        check(userGroupId, String);
        check(keyValueObject,Object);
        check(keyValueObject.key, String);
        check(keyValueObject.value, String);

        UserGroupsCollectionTest.update({ _id: userGroupId }, {
            $set: {
                [keyValueObject.key]:keyValueObject.value
            },
        });
    },


    'userGroups.get.test'(expId) {
        const user = Meteor.user();
        if (!user) {
            throw new Meteor.Error(403, 'Permission Denied');
        }
        if (!userIsInRole('admin')) {
            throw new Meteor.Error(403, 'Permission Denied');
        }
        return UserGroupsCollectionTest.find({ experimentId: { $eq: expId }}).fetch();
    },
});
