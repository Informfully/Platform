import { Meteor } from 'meteor/meteor';
import chai from 'chai';
import { Accounts } from 'meteor/accounts-base';
import  '../userTest';
import  '../experimentsTest';
import '../userGroupsTest';

const { expect } = chai;


describe('userGroups', () => {
    beforeEach(function () {
        Meteor.users.remove({});
        ExperimentsTest.remove({});
        UserGroupsCollectionTest.remove({});
    });

    describe('usergroups update, remove algorithms allocation', function () {
        it('creates a new userGroup by add users', function () {
            //create a new experiement
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            expect(resultStatus.count()).to.equal(1);

            const groupName = "baseline_test";
            Meteor.call('experiments.addUsers.test',
                experiement_id,
                5,
                groupName,
                );
            
            const userGroupResult = UserGroupsCollectionTest.find({experimentId:experiement_id,userGroup:groupName});
            expect(userGroupResult.count()).to.equal(1);
        });
        it('creates a new userGroup by clicking the new userGroup button', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            const groupName = "baseline_test";
            Meteor.call('userGroups.create.test',
                groupName,
                experiement_id,
            );
            const userGroupResult = UserGroupsCollectionTest.find({experimentId:experiement_id,userGroup:groupName});
            expect(userGroupResult.count()).to.equal(1);
            // since the algorithm is not specified, it will be ""
            expect(userGroupResult.fetch()[0].algorithm).to.equal("")
        });
        it('creates a new userGroup by clicking the new userGroup button', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            const groupName = "baseline_test";
            const algorithmId = "006"
            Meteor.call('userGroups.create.test',
                groupName,
                experiement_id,
                algorithmId,
            );
            const userGroupResult = UserGroupsCollectionTest.find({experimentId:experiement_id,userGroup:groupName});
            expect(userGroupResult.count()).to.equal(1);
            // since the algorithm is specified, it will be the "algorithmId"
            expect(userGroupResult.fetch()[0].algorithm).to.equal(algorithmId)
        });
        it('changes group name', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            const groupName = "baseline_test";
            const algorithmId = "006"
            Meteor.call('userGroups.create.test',
                groupName,
                experiement_id,
                algorithmId,
            );
            const userGroupResult = UserGroupsCollectionTest.find({experimentId:experiement_id,userGroup:groupName});
            expect(userGroupResult.count()).to.equal(1);
            // since the algorithm is specified, it will be the "algorithmId"
            expect(userGroupResult.fetch()[0].algorithm).to.equal(algorithmId);

            const userGroupId = userGroupResult.fetch()[0]._id;
            
            //change algorithms allocation
            const newGroupName = "new_groupname"
            Meteor.call('userGroups.update.test',
                userGroupId,
                {key:"userGroup", value:newGroupName},
            );
            const newUserGroupResult = UserGroupsCollectionTest.find({_id:userGroupId});
            expect (newUserGroupResult.fetch()[0].userGroup).to.equal(newGroupName);
        });
        it('changes algorithms allocation', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            const groupName = "baseline_test";
            const algorithmId = "006"
            Meteor.call('userGroups.create.test',
                groupName,
                experiement_id,
                algorithmId,
            );
            const userGroupResult = UserGroupsCollectionTest.find({experimentId:experiement_id,userGroup:groupName});
            expect(userGroupResult.count()).to.equal(1);
            // since the algorithm is specified, it will be the "algorithmId"
            expect(userGroupResult.fetch()[0].algorithm).to.equal(algorithmId);
            const userGroupId = userGroupResult.fetch()[0]._id;
            
            //change algorithms allocation
            const newAlgorithmId = "007"
            Meteor.call('userGroups.update.test',
                userGroupId,
                {key:"algorithm", value:newAlgorithmId},
            );
            const newUserGroupResult = UserGroupsCollectionTest.find({_id:userGroupId});
            expect (newUserGroupResult.fetch()[0].algorithm).to.equal(newAlgorithmId);
        });
    })
})