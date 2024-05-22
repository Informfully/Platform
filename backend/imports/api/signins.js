import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

export const SignIns = new Mongo.Collection('signins');

Meteor.methods({

    'signins.add'() {
        const { userId } = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }

        return SignIns.insert({
            userId,
            createdAt: new Date(),
        });
    },

});
