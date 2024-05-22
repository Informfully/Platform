import { Meteor } from 'meteor/meteor';
import { isEmailVerified, userIsInRole } from '../../../lib/utils/utils_account';

const ADMIN_ROLE = 'admin';
const MAINTAINER_ROLE = 'maintainer'
const BLOCKED_ROLE = 'blocked';
const DEACTIVATED_ROLE = 'deactivated';
const LOCKED_ROLES = [ BLOCKED_ROLE, DEACTIVATED_ROLE ];

const EMAILTEMPLATES_SITENAME = 'placeholder';
const EMAILTEMPLATES_FROM = 'placeholder <placeholder@your.domain>';

const IS_EMAIL_VERIFICATION_REQUIRED = false;
const IS_REGISTRATION_OPEN = true;
const IS_SURVEY_REQUIRED = true;

// enable verification emails
Accounts.config({
    sendVerificationEmail: IS_EMAIL_VERIFICATION_REQUIRED,
    forbidClientAccountCreation: !IS_REGISTRATION_OPEN,
});

/**
 * Update the user's lastLogin field whenever he/she signs in.
 *
 * Notice: Accounts.onLogin appears to also be called to refresh login tokens.
 *         That is, whenever the user refreshes the browser tab. Hence, this metric
 *         might not reflect the actual timestamp at which a given user has signed in
 *         (meaning the action of initally signing in).
 *         In return, for users that hardly ever sign out and hence hardly ever sign in,
 *         it (more) correctly reflects the last time the user has used the application.
 *
 * Notice: onLogin gets called only iff the login attempt was successful.
 *         check {@link Accounts.validateLoginAttempt} to see when this is the case.
 *
 * @param info
 *          login object, contains the user document
 */
Accounts.onLogin((info) => {
    Meteor.call('signins.add');
    Meteor.call('signinsUpgrade.add');
    Meteor.users.update({ _id: info.user._id }, { $set: { 'profile.lastLogin': new Date() } });
});

/**
 * Add default roles to new users.
 *
 * Notice: Accounts.onCreateUser gets called whenever a user is created.
 *         Meteor user collections do not by default store a role field,
 *         therefore we add it.
 *
 * @param options
 *          options for this user account
 * @param user
 *          user object that is being created
 *
 * @returns {*}
 */
Accounts.onCreateUser((options, user) => { 
    const newUser = { ...user };
    newUser.roles = ['user'];

    // get other attributes beside email and password 
    if (options.profile) {
        newUser.profile = options.profile;
    }

    if (!newUser.profile) {
        newUser.profile = {};
    }

    // Maintainer and admins creation
    if (newUser.profile.roles){
        if (newUser.profile.roles=='Administrator'){
            //newUser is an admin
            newUser.roles.push(ADMIN_ROLE);
        }else{
            //newUser is a maintainer
            newUser.roles.push(ADMIN_ROLE);
            newUser.roles.push(MAINTAINER_ROLE);
        }
    }

    // Default users creation: the options.profile is not provided
    
    newUser.participatesIn = 'default-experiment';
    newUser.userGroup = 'baseline';
    newUser.score = [];
    newUser.experiments = [];
    newUser.notification = null;

    // THE VERY FIRST USER:
    // if there is no administrator in the system, make sure that
    // the next user that registers is an administrator.
    // this code exists only for convenience such that the first
    // user that registers is always an administrator.
    const isThereAtLeastOneMaintainer = !!Meteor.users.findOne({ roles: MAINTAINER_ROLE });
    const isNewUserAnMaintainer = newUser.roles.indexOf(MAINTAINER_ROLE) !== -1;
    if (!isThereAtLeastOneMaintainer && !isNewUserAnMaintainer) {
        newUser.roles.push(ADMIN_ROLE);
        newUser.roles.push(MAINTAINER_ROLE);
    }

    return newUser;
});


/**
 * Validate a login attempt.
 * Check whether a user account that is being used for signing in is allowed to
 * be used. That is, check whether it is blocked and whether it's email address
 * was verified.
 *
 * @param info
 *          Login information. Contains user object
 *
 * @returns {boolean}
 *          Boolean value that represents whether the login attempt was successful
 */
Accounts.validateLoginAttempt((info) => {
    const { user } = info;

    if (!user) {
        throw new Meteor.Error(400, 'Invalid User');
    }

    // reject users with role "blocked" and throw an error
    if (userIsInRole(LOCKED_ROLES, user)) {
        throw new Meteor.Error(403, 'Your account is blocked.');
    }

    // reject user without a verified email address
    if (IS_EMAIL_VERIFICATION_REQUIRED && !isEmailVerified(user)) {
        throw new Meteor.Error(499, 'E-mail not verified.');
    }

    return true;
});

// define sender and site name for verification emails
Accounts.emailTemplates.siteName = EMAILTEMPLATES_SITENAME;
Accounts.emailTemplates.from = EMAILTEMPLATES_FROM;

/**
 * Define the email template that is used for verification emails.
 * In this function we define the subject and the content.
 *
 * @type {{subject: (function()), text: (function(*, *))}}
 */
Accounts.emailTemplates.verifyEmail = {
    subject() {
        return 'DDIS News - Verify your email address';
    },
};

Accounts.emailTemplates.resetPassword = {
    subject() {
        return 'DDIS News - Reset your password';
    },

    text(user, url) {
        return `Hey ${user}! Reset your password with following this link: ${url}`;
    },
};

Accounts.urls.resetPassword = token => Meteor.absoluteUrl(`reset-password/${token}`);
Accounts.urls.verifyEmail = token => Meteor.absoluteUrl(`verify-email/${token}`);
