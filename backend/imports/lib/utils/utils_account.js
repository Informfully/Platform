import { Meteor } from 'meteor/meteor';
import { Surveys } from '../../api/surveys'
import Experiments from '../../api/experiments'

/**
 * For a given user (signed in) return his email address.
 * Notice: If a user has multiple email addresses, this function returns the first email address.
 *
 * @returns {string}
 */
export const userEmail = (user = Meteor.user()) => {
    if (!user || !user.emails || !user.emails.length) {
        return '';
    }

    const email = user.emails[0];
    return email.address || '';
};

/**
 * For a given user, returns whether at least one email address is verified.
 *
 * @param user
 *          user object; default value Meteor.user()
 *
 * @returns {*}
 *          boolean
 */
export const isEmailVerified = (user = Meteor.user()) => {
    if (!user || !user.emails || user.emails.length === 0) {
        return false;
    }

    return user.emails.some(e => e.verified);
};

/**
 * Returns whether the given user is in the given role or in any of
 * the given roles if roleOrRoles is an array of roles.
 *
 * @param user
 *          user object to test; default value Meteor.user()
 *
 * @param roleOrRoles
 *          role string or array of role strings
 *
 * @returns {*}
 *          boolean;
 *          true if the user is in any of the given roles
 *          false otherwise
 */
export const userIsInRole = (roleOrRoles, user = Meteor.user()) => {
    // if the user is not null(after deleting a maintainer, meteor has a problem of fetching null user)
    // if (user){
            // the user has no roles at all: return false
    if (!user.roles || user.roles.length === 0) {
        return false;
    }

    // no any role is required: return true
    if (!roleOrRoles.length) {
        return true;
    }

    if (Array.isArray(roleOrRoles)) {
        return roleOrRoles.some(role => userIsInRole(user, role));
    }

    return user.roles.indexOf(roleOrRoles) !== -1;
    // }else{
    //     return false
    // }
        
};


export const userOwnsExperiment = (experimentId) => {
    const user = Meteor.user({ fields: { experiments: 1 } });

    if (!user || !user.experiments) {
        return false;
    }

    const experiments = user.experiments.map(experiment => experiment.experiment);

    if (experiments.includes(experimentId)) {
        return true;
    }

    return false;
}


export const userOwnsSurvey = (surveyId) => {
    const user = Meteor.user({ fields: { experiments: 1 } });

    if (!user || !user.experiments) {
        return false;
    }

    const experiments = user.experiments.map(experiment => experiment.experiment);
    const survey = Surveys.findOne({ _id: surveyId }, { fields: { experiment: 1 } });

    if (!experiments || !survey || !experiments.includes(survey.experiment) ) {
        return false;
    }

    return true;
}


export const hasExperimentLaunched = (experimentId) => {
    const experiment = Experiments.findOne({ _id: experimentId }, { fields: { testingPhase: 1 } });

    if (!experiment || experiment.testingPhase === undefined) {
        return false;
    }

    return !experiment.testingPhase;
}