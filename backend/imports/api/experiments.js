import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';
import { Random } from 'meteor/random';
import { userIsInRole, userOwnsExperiment } from '../lib/utils/utils_account';
import UserGroupsCollection from './userGroups';

export default Experiments = new Mongo.Collection('experiments');

Meteor.methods({

    'experiments.create'(name) {
        check(name, String);

        if (!userIsInRole('admin')) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        const email = Meteor.user().emails[0].address;

        let administrator = "";
        try {
            administrator = email.substring(0, email.indexOf("@"));
        } catch (error) {}

        experimentId = Experiments.insert({
            name,
            adminName:administrator,
            contactInfo:email,
            description:"",
            urlPP:"",
            urlTC:"",
            testingPhase: true,
            dislikeSurvey: {
                question: 'Default dislike question',
                answers: [
                    {
                        _id: Random.id(),
                        text: 'Default dislike answer',
                        value: 0,
                    },
                ],
            },
            likeSurvey: {
                question: 'Default like question',
                answers: [
                    {
                        _id: Random.id(),
                        text: 'Default like answer',
                        value: 0,
                    },
                ],
            },
        });

        Meteor.users.update({ _id: Meteor.userId() }, {
            $push: {
                experiments: {
                    experiment: experimentId,
                    accessLevel: 0,
                },
            },
        });

        return experimentId;
    },

    'experiments.remove'(experimentId) {
        check(experimentId, String);

        if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        Experiments.remove(experimentId);
    },

    'experiments.update'(experiment) {
        check(experiment, {
            _id: String,
            name: String,
            testingPhase: Boolean,
        });

        if (!userIsInRole('admin') || !userOwnsExperiment(experiment._id)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        Experiments.update({ _id: experiment._id }, {
            $set: {
                name: experiment.name,
                testingPhase: experiment.testingPhase,
            },
        });

    },

    'experiments.launch'(experimentId) {
        check(experimentId, String);

        if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        Experiments.update({ _id: experimentId }, {
            $set: {
                testingPhase: false,
            },
        });
    },

    'experiments.dislikeSurvey.update'(experimentId, dislikeSurvey) {
        check(experimentId, String);
        check(dislikeSurvey, {
            question: String,
            answers: [{
                _id: String,
                text: String,
                value: Number,
            }],
        });

        if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        Experiments.update({ _id: experimentId }, {
            $set: {
                dislikeSurvey,
            },
        });

    },
    'experiments.likeSurvey.update'(experimentId, likeSurvey) {

        check(experimentId, String);
        check(likeSurvey, {
            question: String,
            answers: [{
                _id: String,
                text: String,
                value: Number,
            }],
        });

        if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        Experiments.update({ _id: experimentId }, {
            $set: {
                likeSurvey,
            },
        });
    },

    'experiments.dislikeSurvey.remove'(experimentId) {
        if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        Experiments.update({ _id: experimentId }, {
            $set: {
                dislikeSurvey: null,
            },
        });
    },

    'experiments.likeSurvey.remove'(experimentId) {
        if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        Experiments.update({ _id: experimentId }, {
            $set: {
                likeSurvey: null,
            },
        });
    },

    'experiments.addUsers'(experimentId, amount, userGroup) {
        check(experimentId, String);
        check(amount, Match.Integer);
        check(userGroup, String);

        if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        // if the creator is a 'admin' but not 'maintainer',check if the admin is tring to create more user account than s/he is allowed to.
        if (userIsInRole('admin') && !userIsInRole('maintainer')) {
            const max = Meteor.user().profile.maxUserAccount;
            const current = Meteor.user().profile.createdAccount;
            const diff = max-current;
            if (amount>diff){
                throw new Meteor.Error(403, `Number of created account exceeded limit`);
            }
        }
        
        // manipulate userGroup collection
        if (UserGroupsCollection.find({experimentId:experimentId, userGroup:userGroup}).count() === 0) {
            Meteor.call('userGroups.create', userGroup, experimentId);
        }

        // manipulate users collection
        for (let i = 0; i < amount; i++) {
            const newUser = {
                username: Random.id(5),
                password: Random.id(5),
            };
            const newUserId = Accounts.createUser(newUser);
            Meteor.users.update({ _id: newUserId }, {
                $set: {
                    participatesIn: experimentId,
                    userGroup,
                    plaintextPassword: newUser.password,
                    createdBy:Meteor.userId(),//the current admin
                },
            });
        }
        const currentCreatedAccount = Meteor.users.find({ createdBy: Meteor.userId() }).count()
        console.log("currentCreatedAccount",currentCreatedAccount);
        Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.createdAccount": currentCreatedAccount}});
    },


    'experiments.updateUsergroup'(experimentId, userId, userGroup){
        check(experimentId, String);
        check(userId, String);
        check(userGroup, String);

        if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }
        // manipulate userGroup collection if this is a new userGroup
        const existingUserGroups = UserGroupsCollection.find({experimentId:experimentId}).fetch();
        if (!existingUserGroups.find(group => group.userGroup === userGroup)) {
            Meteor.call('userGroups.create', userGroup, experimentId);
        }
        Meteor.users.update({ _id: userId }, {
            $set: {
                userGroup:userGroup
            },
        });
    },

    'experiments.updateInformation'(experimentId, keyValueObject){
        check(experimentId, String);
        check(keyValueObject,Object);
        check(keyValueObject.key, String);
        check(keyValueObject.value, String);

        if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }
        
        Experiments.update({ _id: experimentId }, {
            $set: {
                [keyValueObject.key]:keyValueObject.value
            },
        });
    }

});
