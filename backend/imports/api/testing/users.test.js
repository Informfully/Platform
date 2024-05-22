import { Meteor } from 'meteor/meteor';
import chai from 'chai';
import { Accounts } from 'meteor/accounts-base';
import  '../userTest';
import  '../experimentsTest';

const { expect } = chai;


describe('users', () => {
    beforeEach(function () {
        Meteor.users.remove({});
        ExperimentsTest.remove({});
    });

    describe('admins creat, update, delete users', function () {
        //create a new experiement
        it('create new experiements', function () {
            Meteor.call('experiments.create.test',"test_experiement")
            const resultStatus = ExperimentsTest.find();
            expect(resultStatus.count()).to.equal(1);
        });
        it('admins create users successfully', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            Meteor.call('experiments.addUsers.test',
                experiement_id,
                5,
                "baseline_test",
                );
            const userResult = Meteor.users.find({participatesIn:experiement_id});
            expect(userResult.count()).to.equal(5);
        });
        // exceeding the maximum account number
        it('admins creating users fails', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            try{
                Meteor.call('experiments.addUsers.test',
                experiement_id,
                10,
                "baseline_test"
                );
            } catch (error) {
                expect(error.error).to.equal(403);
            }
        });
        //edit usergroup
        it('edit usergroup', function () {
            //create a new experiement
            Meteor.call('experiments.create.test',"test_experiement")
            const resultStatus = ExperimentsTest.find();
            expect(resultStatus.count()).to.equal(1);

            //create users
            const experiement_id = resultStatus.fetch()[0]._id;
            Meteor.call('experiments.addUsers.test',
                experiement_id,
                5,
                "originalGroupName",
            );
            const userResult = Meteor.users.find({participatesIn:experiement_id});
            expect(userResult.count()).to.equal(5);
            
            const userId = userResult.fetch()[0]._id
            Meteor.call('experiments.updateUsergroup.test',
                experiement_id,
                userId,
                "newGroupName",
            );
            const user = Meteor.users.find({_id:userId}).fetch();
            expect(user[0].userGroup).to.equal("newGroupName")
        });
        it('delete user', function () {
            //create a new experiement
            Meteor.call('experiments.create.test',"test_experiement")
            const resultStatus = ExperimentsTest.find();
            expect(resultStatus.count()).to.equal(1);

            //create users
            const experiement_id = resultStatus.fetch()[0]._id;
            Meteor.call('experiments.addUsers.test',
                experiement_id,
                5,
                "originalGroupName",
            );
            let userResult = Meteor.users.find({participatesIn:experiement_id});
            expect(userResult.count()).to.equal(5);
            
            const userId = userResult.fetch()[0]._id
            Meteor.call('user.remove.test',
                userId
            );
            userResult = Meteor.users.find({participatesIn:experiement_id});
            expect(userResult.count()).to.equal(4);
        });
    });
});
