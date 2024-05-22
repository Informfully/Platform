/* eslint-disable no-undef */
import chai from 'chai';
import { isEmailVerified, userEmail, userIsInRole } from './utils_account';

describe('utils_account', () => {

    describe('userEmail', () => {

        it('returns the email address of a user given he has one', () => {
            const testUser = { emails: [{ address: 'email@address.com' }] };
            const expected = 'email@address.com';
            const actual = userEmail(testUser);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('returns the first email address of a user with multiple email addresses', () => {
            const testUser = {
                emails: [
                    { address: 'email@address.com' },
                    { address: 'email2@address.com' },
                ],
            };
            const expected = 'email@address.com';
            const actual = userEmail(testUser);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('returns an empty string if the user has no email address', () => {
            const testUser = { emails: [] };
            const expected = '';
            const actual = userEmail(testUser);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

    });

    describe('isEmailVerified', () => {

        it('returns true if the user has one verified email address', () => {
            const testUser = { emails: [{ address: 'email@address.com', verified: true }] };
            const expected = true;
            const actual = isEmailVerified(testUser);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });

        it('returns true if the user has more than one verified email address', () => {
            const testUser = {
                emails: [
                    { address: 'email1@address.com', verified: true },
                    { address: 'email2@address.com', verified: true },
                    { address: 'email3@address.com', verified: true },
                ],
            };
            const expected = true;
            const actual = isEmailVerified(testUser);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });

        it('returns true if the user has a verified and an unverified email address', () => {
            const testUser = {
                emails: [
                    { address: 'email1@address.com', verified: true },
                    { address: 'email2@address.com', verified: false },
                ],
            };
            const expected = true;
            const actual = isEmailVerified(testUser);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });

        it('returns true if the verified email address is not the first email address in the array', () => {
            const testUser = {
                emails: [
                    { address: 'email1@address.com', verified: false },
                    { address: 'email2@address.com', verified: true },
                ],
            };
            const expected = true;
            const actual = isEmailVerified(testUser);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });

        it('returns false if the user has an unverified email address', () => {
            const testUser = { emails: [{ address: 'email1@address.com', verified: false }] };
            const expected = false;
            const actual = isEmailVerified(testUser);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });

        it('returns false if the user has no email address', () => {
            const testUser = { emails: [] };
            const expected = false;
            const actual = isEmailVerified(testUser);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });

        it('returns false if the user has multiple unverified addresses', () => {
            const testUser = {
                emails: [
                    { address: 'email1@address.com', verified: false },
                    { address: 'email2@address.com', verified: false },
                    { address: 'email3@address.com', verified: false },
                ],
            };
            const expected = false;
            const actual = isEmailVerified(testUser);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });

    });

    // describe('userIsInRole', () => {

        // it('returns true if a user is in a given role', () => {
        //     const testUser = { roles: [ 'testRole', 'testRole2', 'testRole3' ] };
        //     const testRole = 'testRole';

        //     const expected = true;
        //     const actual = userIsInRole(testUser, testRole);

        //     chai.assert.typeOf(actual, 'boolean');
        //     chai.assert.equal(actual, expected);
        // });

        // it('returns true if a user is in any of the given roles', () => {
        //     const testUser = { roles: [ 'testRole1', 'testRole2', 'testRole3' ] };
        //     const testRoles = [ 'testRole1', 'anotherTestRole' ];

        //     const expected = true;
        //     const actual = userIsInRole(testUser, testRoles);

        //     chai.assert.typeOf(actual, 'boolean');
        //     chai.assert.equal(actual, expected);
        // });

        // it('returns true if the given role is an empty string', () => {
        //     const testUser = { roles: [ 'testRole1', 'testRole2', 'testRole3' ] };
        //     const testRole = '';

        //     const expected = true;
        //     const actual = userIsInRole(testUser, testRole);

        //     chai.assert.typeOf(actual, 'boolean');
        //     chai.assert.equal(actual, expected);
        // });

        // it('returns true if the given roles is an empty array', () => {
        //     const testUser = { roles: [ 'testRole1', 'testRole2', 'testRole3' ] };
        //     const testRoles = [];

        //     const expected = true;
        //     const actual = userIsInRole(testUser, testRoles);

        //     chai.assert.typeOf(actual, 'boolean');
        //     chai.assert.equal(actual, expected);
        // });

        // it('returns false if a user is in not in the given role', () => {
        //     const testUser = { roles: ['notTestRole'] };
        //     const testRole = 'testRole';

        //     const expected = false;
        //     const actual = userIsInRole(testUser, testRole);

        //     chai.assert.typeOf(actual, 'boolean');
        //     chai.assert.equal(actual, expected);
        // });

        // it('returns false if a user is in not in any of the given roles', () => {
        //     const testUser = { roles: [ 'notTestRole', 'notTestRole2' ] };
        //     const testRoles = [ 'testRole', 'testRole2' ];

        //     const expected = false;
        //     const actual = userIsInRole(testUser, testRoles);

        //     chai.assert.typeOf(actual, 'boolean');
        //     chai.assert.equal(actual, expected);
        // });

        // it('returns false if a user is in no role', () => {
        //     const testUser = { roles: [] };
        //     const testRole = 'testRole';

        //     const expected = false;
        //     const actual = userIsInRole(testUser, testRole);

        //     chai.assert.typeOf(actual, 'boolean');
        //     chai.assert.equal(actual, expected);
        // });

        // it('returns false if a user object is missing the field roles', () => {
        //     const testUser = {};
        //     const testRole = 'testRole';

        //     const expected = false;
        //     const actual = userIsInRole(testUser, testRole);

        //     chai.assert.typeOf(actual, 'boolean');
        //     chai.assert.equal(actual, expected);
        // });

    // });

});
