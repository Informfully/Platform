import { Meteor } from 'meteor/meteor';
import chai from 'chai';
import { Accounts } from 'meteor/accounts-base';
import  '../userTest';
import  '../experimentsTest';

const { expect } = chai;


describe('admins', () => {
    beforeEach(function () {
        Meteor.users.remove({});
        ExperimentsTest.remove({});
    });

    describe('create new admin accounts',  () => {
        it('creates a new admin in the users collection',async () => {

            const testUser = {
                email:"email_testing@your.domain",
                password: "password_testing",
                profile: {
                    roles:"Administrator",
                    maxUserAccount:10,
                    createdAccount:0,
                    plainTextInitialPassword:"password_testing",
                },
            }

            const initialStatus = Meteor.users.find({email:"email_testing"}).count();
            expect(initialStatus).to.equal(0);

            // Meteor.server.method_handlers['user.create'].apply(testUser)
            await new Promise((resolve, reject) => {
                Meteor.call('user.create.test', testUser, (error, result) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(result);
                  }
                });
            });

            const resultStatus = Meteor.users.find({'emails.address':"email_testing@your.domain"});
            expect(resultStatus.count()).to.equal(1);
            expect(resultStatus.fetch()[0].profile.roles).to.equal("Administrator");
            expect(resultStatus.fetch()[0].profile.maxUserAccount).to.equal(10);
        });
    });

    describe('create new maintainer accounts',  () => {
        it('create new maintainer accounts', async () => {
            const testUser = {
                email:"email_testing@your.domain",
                password: "password_testing",
                profile: {
                    roles:"Maintainer",
                    maxUserAccount:100,
                    createdAccount:0,
                    plainTextInitialPassword:"password_testing",
                },
            }

            const initialStatus = Meteor.users.find({email:"email_testing"}).count();
            expect(initialStatus).to.equal(0);

            // // Manually invoke Accounts.onCreateUser hook
            // const modifiedUser = Accounts._hooks.onCreateUser.reduce((result, hook) => {
            //     return hook(testUser);
            // }, testUser);

            await new Promise((resolve, reject) => {
                Meteor.call('user.create.test', testUser, (error, result) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(result);
                  }
                });
            });

            const resultStatus = Meteor.users.find({'emails.address':"email_testing@your.domain"});
            // should find exactly one entry
            expect(resultStatus.count()).to.equal(1);
            // the role of the entry should be the same as testUser's(Administrator)
            expect(resultStatus.fetch()[0].profile.roles).to.equal("Maintainer");
            // the maxUserAccount of the entry should be the same as testUser's(10)
            expect(resultStatus.fetch()[0].profile.maxUserAccount).to.equal(100);
        });
    });

    describe('modify maximum users account', function () {
        it('modify the number', async () => {
            const testUser = {
                email:"email_testing@your.domain",
                password: "password_testing",
                profile: {
                    roles:"Administrator",
                    maxUserAccount:100,
                    createdAccount:0,
                    plainTextInitialPassword:"password_testing",
                },
            }
            await new Promise((resolve, reject) => {
                Meteor.call('user.create.test', testUser, (error, result) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(result);
                  }
                });
            });
            let resultStatus = Meteor.users.find({'emails.address':"email_testing@your.domain"});

            expect(resultStatus.count()).to.equal(1);
            expect(resultStatus.fetch()[0].profile.maxUserAccount).to.equal(100);
            
            const _id = resultStatus.fetch()[0]._id

            await new Promise((resolve, reject) => {
                Meteor.call('user.update.test', _id, "new_email_testing@your.domain", 200, (error, result) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(result);
                  }
                });
            });
            
            resultStatus = Meteor.users.find({'emails.address':"new_email_testing@your.domain"});

            expect(resultStatus.count()).to.equal(1);
            expect(resultStatus.fetch()[0].profile.maxUserAccount).to.equal(200);
        });
    });

    describe('modify admins email', function () {
      it('modify email of admins in profile', async () => {
          const testUser = {
              email:"email_testing@your.domain",
              password: "password_testing",
              profile: {
                  roles:"Administrator",
                  maxUserAccount:100,
                  createdAccount:0,
                  plainTextInitialPassword:"password_testing",
              },
          }
          await new Promise((resolve, reject) => {
              Meteor.call('user.create.test', testUser, (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              });
          });
          let resultStatus = Meteor.users.find({'emails.address':"email_testing@your.domain"});

          expect(resultStatus.count()).to.equal(1);
          expect(resultStatus.fetch()[0].profile.maxUserAccount).to.equal(100);

          const _id = resultStatus.fetch()[0]._id

          await new Promise((resolve, reject) => {
              Meteor.call('user.update.test', _id, "new_email_testing@your.domain", 200, (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              });
          });
          
          resultStatus = Meteor.users.find({'emails.address':"new_email_testing@your.domain"});

          expect(resultStatus.count()).to.equal(1);
          expect(resultStatus.fetch()[0].profile.maxUserAccount).to.equal(200);
      });
  });
});
