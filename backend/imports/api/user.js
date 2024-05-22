import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { userIsInRole, userOwnsExperiment } from '../lib/utils/utils_account';
import {Fiber} from 'fibers';
import { Answers } from './answers';


Meteor.methods({

    /**
     * Send a verification email to the current user.
     *
     * @returns {any}
     *          return value of {@link Accounts#sendVerificationEmail}
     */
    'user.sendVerificationMail'() {
        const userId = Meteor.userId();
        if (!userId) {
            throw new Meteor.Error(500, 'Invalid User');
        }
        return Accounts.sendVerificationEmail(userId);
    },

    'user.surveys.reset'() {
        const { userId } = this;
        if (!userId) {
            throw new Meteor.Error(500, 'Invalid User');
        }
        return Answers.remove({ userId });
    },


    'user.create'(newUser) {
        return Accounts.createUser(newUser);
    },

    'user.remove'(userId) {
        check(userId, String);

        const user = Meteor.users.findOne({ _id: userId }, { fields: { participatesIn: 1 ,userGroup:1, roles:1} });

        if (!user) {
            throw new Meteor.Error(400, 'User does not exist')
        }

        //for deleting admins, maintainer
        if (user.roles.includes('admin')){
            if (!userIsInRole('maintainer')) {
                throw new Meteor.Error(403, 'Permission Denied');
            }
        }
        //remove user
        Meteor.users.remove({ _id: userId });

        //update the number of users an admin have created
        const currentCreatedAccount = Meteor.users.find({ createdBy: Meteor.userId() }).count()
        Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.createdAccount": currentCreatedAccount}});    
    },

    /*
     * Add notification id
     *
     */
    'user.savePushToken'(userId, pushToken) {

        const user = Meteor.users.findOne(userId);

        if (!user) {
            throw new Meteor.Error(400, 'User does not exist')
        }

        return Meteor.users.update(user, { $set: { pushNotificationToken: pushToken } });
    },

    'user.update'(userId, email, maxUserAccount) {
        check(userId, String);
        check(email, String);
        check(maxUserAccount, Number);

        if (!userIsInRole('maintainer')) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        Meteor.users.update({ _id: userId }, {
            $set: {
                'emails.0.address':email,
                'profile.maxUserAccount':maxUserAccount,
            },
        });
    },

    'users.inUserGroup'(experimentId,userGroup) {
        const query = { participatesIn: { $eq: experimentId }, userGroup:{$eq: userGroup}};
        return Meteor.users.find(query).count();
    },


});
