import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { userIsInRole, userOwnsExperiment } from '../lib/utils/utils_account';
import {Fiber} from 'fibers';
import { Answers } from './answers';


Meteor.methods({

    'profile.update'(userId, key, newValue) {
        check(userId, String);
        check(key, String);
        check(newValue, String);
        console.log("newValue at the backend");
        console.log(newValue);

        if (!userIsInRole('admin')) {
            throw new Meteor.Error(403, 'Permission Denied');
        }
        try{
            const user = Meteor.users.findOne({ _id: userId });
            const profile = user.profile || {};
            const existingValue = profile[key];
            if (existingValue !== undefined) {
                // The key already exists, update its value
                Meteor.users.update({ _id: userId }, {
                    $set: { [`profile.${key}`]: newValue },
                });
            } else {
                // The key doesn't exist, create it with the new value
                Meteor.users.update({ _id: userId }, {
                    $set: { profile: { ...profile, [key]: newValue } },
                });
            }
        }catch(error){
            console.log("error:")
            console.error;
        } 
    },

});
