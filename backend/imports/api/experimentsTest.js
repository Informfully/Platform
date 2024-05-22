import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';
import { Random } from 'meteor/random';
import UserGroupsCollectionTest from './userGroupsTest';

export default ExperimentsTest = new Mongo.Collection('experiments.test');

Meteor.methods({
    'experiments.create.test'(name) {
        check(name, String);

        const email = "test@your.domain"

        let administrator = "";
        try {
            administrator = email.substring(0, email.indexOf("@"));
        } catch (error) {}

        experimentId = ExperimentsTest.insert({
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

    'experiments.remove.test'(experimentId) {
        check(experimentId, String);

        ExperimentsTest.remove(experimentId);
    },

    'experiments.update.test'(experiment) {
        check(experiment, {
            _id: String,
            name: String,
            testingPhase: Boolean,
        });

        ExperimentsTest.update({ _id: experiment._id }, {
            $set: {
                name: experiment.name,
                testingPhase: experiment.testingPhase,
            },
        });

    },

    'experiments.launch.test'(experimentId) {
        check(experimentId, String);

        ExperimentsTest.update({ _id: experimentId }, {
            $set: {
                testingPhase: false,
            },
        });
    },

    'experiments.dislikeSurvey.update.test'(experimentId, dislikeSurvey) {
        check(experimentId, String);
        check(dislikeSurvey, {
            question: String,
            answers: [{
                _id: String,
                text: String,
                value: Number,
            }],
        });

        ExperimentsTest.update({ _id: experimentId }, {
            $set: {
                dislikeSurvey,
            },
        });

    },
    'experiments.likeSurvey.update.test'(experimentId, likeSurvey) {

        check(experimentId, String);
        check(likeSurvey, {
            question: String,
            answers: [{
                _id: String,
                text: String,
                value: Number,
            }],
        });


        ExperimentsTest.update({ _id: experimentId }, {
            $set: {
                likeSurvey,
            },
        });
    },

    'experiments.dislikeSurvey.remove.test'(experimentId) {
        ExperimentsTest.update({ _id: experimentId }, {
            $set: {
                dislikeSurvey: null,
            },
        });
    },

    'experiments.likeSurvey.remove.test'(experimentId) {
        ExperimentsTest.update({ _id: experimentId }, {
            $set: {
                likeSurvey: null,
            },
        });
    },

    'experiments.addUsers.test'(experimentId, amount, userGroup) {
        check(experimentId, String);
        check(amount, Match.Integer);
        check(userGroup, String);
        
        // if the creator is a 'admin' but not 'maintainer',check if the admin is tring to create more user account than s/he is allowed to.
        // if (userIsInRole('admin') && !userIsInRole('maintainer')) {
        const max = 10
        const current = 5
        const diff = max-current;

        if (amount>diff){
            throw new Meteor.Error(403, `Maximum user account number ${max} exceeded. You can create no more than ${diff} accounts.`);
        }
        // }
        //// The maximum account number created at once is first set to 30. 
        //// This limitation is removed by Hongjie Guan after meeting 25.April.2023

        
        // manipulate userGroup collection
        if (UserGroupsCollectionTest.find({experimentId:experimentId, userGroup:userGroup}).count() === 0) {
            Meteor.call('userGroups.create.test', userGroup, experimentId);
        }
        // const userGroupId = Meteor.call('userGroups.create', userGroup, experimentId);

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
        // Meteor.users.update({_id: Meteor.userId()}, {$inc: {'profile.createdAccount': amount}});
    },


    'experiments.updateUsergroup.test'(experimentId, userId, userGroup){
        check(experimentId, String);
        check(userId, String);
        check(userGroup, String);

        // manipulate userGroup collection if this is a new userGroup
        const existingUserGroups = UserGroupsCollection.find({experimentId:experimentId}).fetch();
        if (!existingUserGroups.find(group => group.userGroup === userGroup)) {
            Meteor.call('userGroups.create.test', userGroup, experimentId);
        }
        Meteor.users.update({ _id: userId }, {
            $set: {
                userGroup:userGroup
            },
        });
    },

    'experiments.updateInformation.test'(experimentId, keyValueObject){
        check(experimentId, String);
        check(keyValueObject,Object);
        check(keyValueObject.key, String);
        check(keyValueObject.value, String);

        ExperimentsTest.update({ _id: experimentId }, {
            $set: {
                [keyValueObject.key]:keyValueObject.value
            },
        });
    }

});
