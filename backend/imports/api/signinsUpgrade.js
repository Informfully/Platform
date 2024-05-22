import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

export const SignInsUpgrade = new Mongo.Collection('signinsUpgrade');

Meteor.methods({

    'signinsUpgrade.add'() {
        const { userId } = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }

        return SignInsUpgrade.update(
            {
                userId,
            },
            {
                $addToSet:{
                    SignInTimes:{
                        signInTime: new Date(),
                    }
                }
            },
            {
                upsert: true,
            }
        );
    },

});
