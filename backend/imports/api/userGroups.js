import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { userIsInRole } from '../lib/utils/utils_account';


export default UserGroupsCollection = new Mongo.Collection('userGroups');

Meteor.methods({

    'userGroups.create'(userGroup, experimentId,algorithm="") {
        check(userGroup, String);
        check(experimentId, String);

        UserGroupsCollection.insert({
            experimentId,
            userGroup,
            algorithm,
        });
    },

    'userGroups.remove'(userGroupName, experimentId) {
        check(userGroupName, String);
        check(experimentId, String);

        //remove users in the group
        Meteor.users.remove({ participatesIn: experimentId,userGroup:userGroupName });

        //remove the group entity
        UserGroupsCollection.remove({ userGroup: userGroupName,experimentId:experimentId });

        //update the user's number of created account 
        const currentCreatedAccount = Meteor.users.find({ createdBy: Meteor.userId() }).count()
        Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.createdAccount": currentCreatedAccount}});
    },

    'userGroups.update'(userGroupId,experimentId, keyValueObject) {
        check(userGroupId, String);
        check(experimentId, String);
        check(keyValueObject,Object);
        check(keyValueObject.key, String);
        check(keyValueObject.value, String);
        
        if (keyValueObject.key=="userGroup"){
            const currentGroupName = UserGroupsCollection.findOne({_id: userGroupId}).userGroup;
            Meteor.users.update({participatesIn : experimentId, userGroup : currentGroupName },{
                $set: {
                    'userGroup':[keyValueObject.value]
                },
            },{multi:true});
        }

        UserGroupsCollection.update({ _id: userGroupId }, {
            $set: {
                [keyValueObject.key] : keyValueObject.value
            },
        });
    },

   

    'userGroups.get'(expId) {
        const user = Meteor.user();
        if (!user) {
            throw new Meteor.Error(403, 'Permission Denied');
        }
        if (!userIsInRole('admin')) {
            throw new Meteor.Error(403, 'Permission Denied');
        }
        return UserGroupsCollection.find({ experimentId: { $eq: expId }}).fetch();
    },
});
