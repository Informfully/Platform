import MeteorOffline from '../meteorOffline/MeteorOffline';

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
export const userIsInRole = (user = MeteorOffline.user(), roleOrRoles) => {
    // console.log(user, roleOrRoles);
    if (!user.roles || user.roles.length === 0) {
        return false;
    }

    if (!roleOrRoles.length) {
        return true;
    }

    if (Array.isArray(roleOrRoles)) {
        return roleOrRoles.some(role => userIsInRole(user, role));
    }

    return user.roles.indexOf(roleOrRoles) !== -1;
};
