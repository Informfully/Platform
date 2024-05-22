import { Meteor } from 'meteor/meteor';
import chai from 'chai';
import { Accounts } from 'meteor/accounts-base';

import  '../profileTest';

const { expect } = chai;


describe('users', () => {
    beforeEach(function () {
        Meteor.users.remove({});
    });

    describe('admins update personal profile', function () {
        it('update name succefully', function () {
            const testUser = {
                email:"placeholder@your.domain",
                password: "password_testing",
                profile: {
                    roles:"Administrator",
                    maxUserAccount:10,
                    createdAccount:0,
                    plainTextInitialPassword:"password_testing",
                },
            }
            Meteor.call('user.create.test', testUser);
            const initialResult = Meteor.users.find().fetch();
            const userId = initialResult[0]._id;
            const newName = "new_name";
            Meteor.call('profile.update.test',
                userId,
                "name", 
                newName,
            );
            const result = Meteor.users.find({_id:userId}).fetch();
            expect(result[0].profile.name).to.equal(newName)
        });
        it('update address succefully', function () {
            const testUser = {
                email:"placeholder@your.domain",
                password: "password_testing",
                profile: {
                    roles:"Administrator",
                    maxUserAccount:10,
                    createdAccount:0,
                    plainTextInitialPassword:"password_testing",
                },
            }
            Meteor.call('user.create.test', testUser);
            const initialResult = Meteor.users.find().fetch();
            const userId = initialResult[0]._id;
            const address = "new_address";
            Meteor.call('profile.update.test',
                userId,
                "address", 
                address,
            );
            const result = Meteor.users.find({_id:userId}).fetch();
            expect(result[0].profile.address).to.equal(address)
        });
        it('update phone succefully', function () {
            const testUser = {
                email:"placeholder@your.domain",
                password: "password_testing",
                profile: {
                    roles:"Administrator",
                    maxUserAccount:10,
                    createdAccount:0,
                    plainTextInitialPassword:"password_testing",
                },
            }
            Meteor.call('user.create.test', testUser);
            const initialResult = Meteor.users.find().fetch();
            const userId = initialResult[0]._id;
            const phone = "new_phone";
            Meteor.call('profile.update.test',
                userId,
                "phone", 
                phone,
            );
            const result = Meteor.users.find({_id:userId}).fetch();
            expect(result[0].profile.phone).to.equal(phone)
        });
        it('update email succefully', function () {
            const testUser = {
                email:"placeholder@your.domain",
                password: "password_testing",
                profile: {
                    roles:"Administrator",
                    maxUserAccount:10,
                    createdAccount:0,
                    plainTextInitialPassword:"password_testing",
                },
            }
            Meteor.call('user.create.test', testUser);
            const initialResult = Meteor.users.find().fetch();
            const userId = initialResult[0]._id;
            const email = "new_email";
            Meteor.call('profile.update.test',
                userId,
                "email", 
                email,
            );
            const result = Meteor.users.find({_id:userId}).fetch();
            expect(result[0].profile.email).to.equal(email)
        });
        it('update selfIntro succefully', function () {
            const testUser = {
                email:"placeholder@your.domain",
                password: "password_testing",
                profile: {
                    roles:"Administrator",
                    maxUserAccount:10,
                    createdAccount:0,
                    plainTextInitialPassword:"password_testing",
                },
            }
            Meteor.call('user.create.test', testUser);
            const initialResult = Meteor.users.find().fetch();
            const userId = initialResult[0]._id;
            const selfIntro = "new_selfIntro";
            Meteor.call('profile.update.test',
                userId,
                "selfIntro", 
                selfIntro,
            );
            const result = Meteor.users.find({_id:userId}).fetch();
            expect(result[0].profile.selfIntro).to.equal(selfIntro)
        });
        
    });
});
