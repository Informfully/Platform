import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import {Fiber} from 'fibers';
import { Answers } from './answers';


Meteor.methods({

    /**
     * Send a verification email to the current user.
     *
     * @returns {any}
     *          return value of {@link Accounts#sendVerificationEmail}
     */
    'user.sendVerificationMail.test'() {
        const userId = Meteor.userId();
        if (!userId) {
            throw new Meteor.Error(500, 'Invalid User');
        }
        return Accounts.sendVerificationEmail(userId);
    },

    'user.surveys.rese.test'() {
        const { userId } = this;
        if (!userId) {
            throw new Meteor.Error(500, 'Invalid User');
        }

        // return Answers.remove({ userId }, { multi: true });
        return Answers.remove({ userId });
    },


    'user.create.test'(newUser) {
        return Accounts.createUser(newUser);
    },

    'user.remove.test'(userId) {
        check(userId, String);

        const user = Meteor.users.findOne({ _id: userId }, { fields: { participatesIn: 1 ,userGroup:1, roles:1} });

        if (!user) {
            throw new Meteor.Error(400, 'User does not exist')
        }

        // delete the userGroup if all users have been removed
        if (Meteor.users.find({experimentId:user.participatesIn,userGroup:user.userGroup}).count()===1) {
            Meteor.call('userGroups.remove', user.userGroup, experimentId);
        }

        return Meteor.users.remove({ _id: userId });
    },

    /*
     * Add notification id
     *
     */
    'user.savePushToken.test'(userId, pushToken) {

        const user = Meteor.users.findOne(userId);

        if (!user) {
            throw new Meteor.Error(400, 'User does not exist')
        }

        return Meteor.users.update(user, { $set: { pushNotificationToken: pushToken } });
    },

    'user.update.test'(userId, email, maxUserAccount) {
        check(userId, String);
        check(email, String);
        check(maxUserAccount, Number);

        Meteor.users.update({ _id: userId }, {
            $set: {
                'emails.0.address':email,
                'profile.maxUserAccount':maxUserAccount,
            },
        });
    },

    'user.update.test'(userId, email, maxUserAccount) {
        check(userId, String);
        check(email, String);
        check(maxUserAccount, Number);

        Meteor.users.update({ _id: userId }, {
            $set: {
                'emails.0.address':email,
                'profile.maxUserAccount':maxUserAccount,
            },
        });
    },

    'users.inUserGroup.test'(experimentId,userGroup) {
        const query = { participatesIn: { $eq: experimentId }, userGroup:{$eq: userGroup}};
        return Meteor.users.find(query).count();
    },


});
