(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var NpmModuleBcrypt = Package['npm-bcrypt'].NpmModuleBcrypt;
var Accounts = Package['accounts-base'].Accounts;
var SRP = Package.srp.SRP;
var SHA256 = Package.sha.SHA256;
var EJSON = Package.ejson.EJSON;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var Email = Package.email.Email;
var EmailInternals = Package.email.EmailInternals;
var Random = Package.random.Random;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-password":{"email_templates.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-password/email_templates.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const greet = welcomeMsg => (user, url) => {
  const greeting = user.profile && user.profile.name ? "Hello ".concat(user.profile.name, ",") : "Hello,";
  return "".concat(greeting, "\n\n").concat(welcomeMsg, ", simply click the link below.\n\n").concat(url, "\n\nThanks.\n");
};
/**
 * @summary Options to customize emails sent from the Accounts system.
 * @locus Server
 * @importFromPackage accounts-base
 */


Accounts.emailTemplates = {
  from: "Accounts Example <no-reply@example.com>",
  siteName: Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''),
  resetPassword: {
    subject: () => "How to reset your password on ".concat(Accounts.emailTemplates.siteName),
    text: greet("To reset your password")
  },
  verifyEmail: {
    subject: () => "How to verify email address on ".concat(Accounts.emailTemplates.siteName),
    text: greet("To verify your account email")
  },
  enrollAccount: {
    subject: () => "An account has been created for you on ".concat(Accounts.emailTemplates.siteName),
    text: greet("To start using the service")
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"password_server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-password/password_server.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
/// BCRYPT
const bcrypt = NpmModuleBcrypt;
const bcryptHash = Meteor.wrapAsync(bcrypt.hash);
const bcryptCompare = Meteor.wrapAsync(bcrypt.compare); // Utility for grabbing user

const getUserById = (id, options) => Meteor.users.findOne(id, Accounts._addDefaultFieldSelector(options)); // User records have a 'services.password.bcrypt' field on them to hold
// their hashed passwords (unless they have a 'services.password.srp'
// field, in which case they will be upgraded to bcrypt the next time
// they log in).
//
// When the client sends a password to the server, it can either be a
// string (the plaintext password) or an object with keys 'digest' and
// 'algorithm' (must be "sha-256" for now). The Meteor client always sends
// password objects { digest: *, algorithm: "sha-256" }, but DDP clients
// that don't have access to SHA can just send plaintext passwords as
// strings.
//
// When the server receives a plaintext password as a string, it always
// hashes it with SHA256 before passing it into bcrypt. When the server
// receives a password as an object, it asserts that the algorithm is
// "sha-256" and then passes the digest to bcrypt.


Accounts._bcryptRounds = () => Accounts._options.bcryptRounds || 10; // Given a 'password' from the client, extract the string that we should
// bcrypt. 'password' can be one of:
//  - String (the plaintext password)
//  - Object with 'digest' and 'algorithm' keys. 'algorithm' must be "sha-256".
//


const getPasswordString = password => {
  if (typeof password === "string") {
    password = SHA256(password);
  } else {
    // 'password' is an object
    if (password.algorithm !== "sha-256") {
      throw new Error("Invalid password hash algorithm. " + "Only 'sha-256' is allowed.");
    }

    password = password.digest;
  }

  return password;
}; // Use bcrypt to hash the password for storage in the database.
// `password` can be a string (in which case it will be run through
// SHA256 before bcrypt) or an object with properties `digest` and
// `algorithm` (in which case we bcrypt `password.digest`).
//


const hashPassword = password => {
  password = getPasswordString(password);
  return bcryptHash(password, Accounts._bcryptRounds());
}; // Extract the number of rounds used in the specified bcrypt hash.


const getRoundsFromBcryptHash = hash => {
  let rounds;

  if (hash) {
    const hashSegments = hash.split('$');

    if (hashSegments.length > 2) {
      rounds = parseInt(hashSegments[2], 10);
    }
  }

  return rounds;
}; // Check whether the provided password matches the bcrypt'ed password in
// the database user record. `password` can be a string (in which case
// it will be run through SHA256 before bcrypt) or an object with
// properties `digest` and `algorithm` (in which case we bcrypt
// `password.digest`).
//
// The user parameter needs at least user._id and user.services


Accounts._checkPasswordUserFields = {
  _id: 1,
  services: 1
}; //

Accounts._checkPassword = (user, password) => {
  const result = {
    userId: user._id
  };
  const formattedPassword = getPasswordString(password);
  const hash = user.services.password.bcrypt;
  const hashRounds = getRoundsFromBcryptHash(hash);

  if (!bcryptCompare(formattedPassword, hash)) {
    result.error = handleError("Incorrect password", false);
  } else if (hash && Accounts._bcryptRounds() != hashRounds) {
    // The password checks out, but the user's bcrypt hash needs to be updated.
    Meteor.defer(() => {
      Meteor.users.update({
        _id: user._id
      }, {
        $set: {
          'services.password.bcrypt': bcryptHash(formattedPassword, Accounts._bcryptRounds())
        }
      });
    });
  }

  return result;
};

const checkPassword = Accounts._checkPassword; ///
/// ERROR HANDLER
///

const handleError = function (msg) {
  let throwError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  const error = new Meteor.Error(403, Accounts._options.ambiguousErrorMessages ? "Something went wrong. Please check your credentials." : msg);

  if (throwError) {
    throw error;
  }

  return error;
}; ///
/// LOGIN
///


Accounts._findUserByQuery = (query, options) => {
  let user = null;

  if (query.id) {
    // default field selector is added within getUserById()
    user = getUserById(query.id, options);
  } else {
    options = Accounts._addDefaultFieldSelector(options);
    let fieldName;
    let fieldValue;

    if (query.username) {
      fieldName = 'username';
      fieldValue = query.username;
    } else if (query.email) {
      fieldName = 'emails.address';
      fieldValue = query.email;
    } else {
      throw new Error("shouldn't happen (validation missed something)");
    }

    let selector = {};
    selector[fieldName] = fieldValue;
    user = Meteor.users.findOne(selector, options); // If user is not found, try a case insensitive lookup

    if (!user) {
      selector = selectorForFastCaseInsensitiveLookup(fieldName, fieldValue);
      const candidateUsers = Meteor.users.find(selector, options).fetch(); // No match if multiple candidates are found

      if (candidateUsers.length === 1) {
        user = candidateUsers[0];
      }
    }
  }

  return user;
};
/**
 * @summary Finds the user with the specified username.
 * First tries to match username case sensitively; if that fails, it
 * tries case insensitively; but if more than one user matches the case
 * insensitive search, it returns null.
 * @locus Server
 * @param {String} username The username to look for
 * @param {Object} [options]
 * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
 * @returns {Object} A user if found, else null
 * @importFromPackage accounts-base
 */


Accounts.findUserByUsername = (username, options) => Accounts._findUserByQuery({
  username
}, options);
/**
 * @summary Finds the user with the specified email.
 * First tries to match email case sensitively; if that fails, it
 * tries case insensitively; but if more than one user matches the case
 * insensitive search, it returns null.
 * @locus Server
 * @param {String} email The email address to look for
 * @param {Object} [options]
 * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
 * @returns {Object} A user if found, else null
 * @importFromPackage accounts-base
 */


Accounts.findUserByEmail = (email, options) => Accounts._findUserByQuery({
  email
}, options); // Generates a MongoDB selector that can be used to perform a fast case
// insensitive lookup for the given fieldName and string. Since MongoDB does
// not support case insensitive indexes, and case insensitive regex queries
// are slow, we construct a set of prefix selectors for all permutations of
// the first 4 characters ourselves. We first attempt to matching against
// these, and because 'prefix expression' regex queries do use indexes (see
// http://docs.mongodb.org/v2.6/reference/operator/query/regex/#index-use),
// this has been found to greatly improve performance (from 1200ms to 5ms in a
// test with 1.000.000 users).


const selectorForFastCaseInsensitiveLookup = (fieldName, string) => {
  // Performance seems to improve up to 4 prefix characters
  const prefix = string.substring(0, Math.min(string.length, 4));
  const orClause = generateCasePermutationsForString(prefix).map(prefixPermutation => {
    const selector = {};
    selector[fieldName] = new RegExp("^".concat(Meteor._escapeRegExp(prefixPermutation)));
    return selector;
  });
  const caseInsensitiveClause = {};
  caseInsensitiveClause[fieldName] = new RegExp("^".concat(Meteor._escapeRegExp(string), "$"), 'i');
  return {
    $and: [{
      $or: orClause
    }, caseInsensitiveClause]
  };
}; // Generates permutations of all case variations of a given string.


const generateCasePermutationsForString = string => {
  let permutations = [''];

  for (let i = 0; i < string.length; i++) {
    const ch = string.charAt(i);
    permutations = [].concat(...permutations.map(prefix => {
      const lowerCaseChar = ch.toLowerCase();
      const upperCaseChar = ch.toUpperCase(); // Don't add unneccesary permutations when ch is not a letter

      if (lowerCaseChar === upperCaseChar) {
        return [prefix + ch];
      } else {
        return [prefix + lowerCaseChar, prefix + upperCaseChar];
      }
    }));
  }

  return permutations;
};

const checkForCaseInsensitiveDuplicates = (fieldName, displayName, fieldValue, ownUserId) => {
  // Some tests need the ability to add users with the same case insensitive
  // value, hence the _skipCaseInsensitiveChecksForTest check
  const skipCheck = Object.prototype.hasOwnProperty.call(Accounts._skipCaseInsensitiveChecksForTest, fieldValue);

  if (fieldValue && !skipCheck) {
    const matchedUsers = Meteor.users.find(selectorForFastCaseInsensitiveLookup(fieldName, fieldValue), {
      fields: {
        _id: 1
      },
      // we only need a maximum of 2 users for the logic below to work
      limit: 2
    }).fetch();

    if (matchedUsers.length > 0 && ( // If we don't have a userId yet, any match we find is a duplicate
    !ownUserId || // Otherwise, check to see if there are multiple matches or a match
    // that is not us
    matchedUsers.length > 1 || matchedUsers[0]._id !== ownUserId)) {
      handleError("".concat(displayName, " already exists."));
    }
  }
}; // XXX maybe this belongs in the check package


const NonEmptyString = Match.Where(x => {
  check(x, String);
  return x.length > 0;
});
const userQueryValidator = Match.Where(user => {
  check(user, {
    id: Match.Optional(NonEmptyString),
    username: Match.Optional(NonEmptyString),
    email: Match.Optional(NonEmptyString)
  });
  if (Object.keys(user).length !== 1) throw new Match.Error("User property must have exactly one field");
  return true;
});
const passwordValidator = Match.OneOf(String, {
  digest: String,
  algorithm: String
}); // Handler to login with a password.
//
// The Meteor client sets options.password to an object with keys
// 'digest' (set to SHA256(password)) and 'algorithm' ("sha-256").
//
// For other DDP clients which don't have access to SHA, the handler
// also accepts the plaintext password in options.password as a string.
//
// (It might be nice if servers could turn the plaintext password
// option off. Or maybe it should be opt-in, not opt-out?
// Accounts.config option?)
//
// Note that neither password option is secure without SSL.
//

Accounts.registerLoginHandler("password", options => {
  if (!options.password || options.srp) return undefined; // don't handle

  check(options, {
    user: userQueryValidator,
    password: passwordValidator
  });

  const user = Accounts._findUserByQuery(options.user, {
    fields: _objectSpread({
      services: 1
    }, Accounts._checkPasswordUserFields)
  });

  if (!user) {
    handleError("User not found");
  }

  if (!user.services || !user.services.password || !(user.services.password.bcrypt || user.services.password.srp)) {
    handleError("User has no password set");
  }

  if (!user.services.password.bcrypt) {
    if (typeof options.password === "string") {
      // The client has presented a plaintext password, and the user is
      // not upgraded to bcrypt yet. We don't attempt to tell the client
      // to upgrade to bcrypt, because it might be a standalone DDP
      // client doesn't know how to do such a thing.
      const verifier = user.services.password.srp;
      const newVerifier = SRP.generateVerifier(options.password, {
        identity: verifier.identity,
        salt: verifier.salt
      });

      if (verifier.verifier !== newVerifier.verifier) {
        return {
          userId: Accounts._options.ambiguousErrorMessages ? null : user._id,
          error: handleError("Incorrect password", false)
        };
      }

      return {
        userId: user._id
      };
    } else {
      // Tell the client to use the SRP upgrade process.
      throw new Meteor.Error(400, "old password format", EJSON.stringify({
        format: 'srp',
        identity: user.services.password.srp.identity
      }));
    }
  }

  return checkPassword(user, options.password);
}); // Handler to login using the SRP upgrade path. To use this login
// handler, the client must provide:
//   - srp: H(identity + ":" + password)
//   - password: a string or an object with properties 'digest' and 'algorithm'
//
// We use `options.srp` to verify that the client knows the correct
// password without doing a full SRP flow. Once we've checked that, we
// upgrade the user to bcrypt and remove the SRP information from the
// user document.
//
// The client ends up using this login handler after trying the normal
// login handler (above), which throws an error telling the client to
// try the SRP upgrade path.
//
// XXX COMPAT WITH 0.8.1.3

Accounts.registerLoginHandler("password", options => {
  if (!options.srp || !options.password) {
    return undefined; // don't handle
  }

  check(options, {
    user: userQueryValidator,
    srp: String,
    password: passwordValidator
  });

  const user = Accounts._findUserByQuery(options.user, {
    fields: _objectSpread({
      services: 1
    }, Accounts._checkPasswordUserFields)
  });

  if (!user) {
    handleError("User not found");
  } // Check to see if another simultaneous login has already upgraded
  // the user record to bcrypt.


  if (user.services && user.services.password && user.services.password.bcrypt) {
    return checkPassword(user, options.password);
  }

  if (!(user.services && user.services.password && user.services.password.srp)) {
    handleError("User has no password set");
  }

  const v1 = user.services.password.srp.verifier;
  const v2 = SRP.generateVerifier(null, {
    hashedIdentityAndPassword: options.srp,
    salt: user.services.password.srp.salt
  }).verifier;

  if (v1 !== v2) {
    return {
      userId: Accounts._options.ambiguousErrorMessages ? null : user._id,
      error: handleError("Incorrect password", false)
    };
  } // Upgrade to bcrypt on successful login.


  const salted = hashPassword(options.password);
  Meteor.users.update(user._id, {
    $unset: {
      'services.password.srp': 1
    },
    $set: {
      'services.password.bcrypt': salted
    }
  });
  return {
    userId: user._id
  };
}); ///
/// CHANGING
///

/**
 * @summary Change a user's username. Use this instead of updating the
 * database directly. The operation will fail if there is an existing user
 * with a username only differing in case.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} newUsername A new username for the user.
 * @importFromPackage accounts-base
 */

Accounts.setUsername = (userId, newUsername) => {
  check(userId, NonEmptyString);
  check(newUsername, NonEmptyString);
  const user = getUserById(userId, {
    fields: {
      username: 1
    }
  });

  if (!user) {
    handleError("User not found");
  }

  const oldUsername = user.username; // Perform a case insensitive check for duplicates before update

  checkForCaseInsensitiveDuplicates('username', 'Username', newUsername, user._id);
  Meteor.users.update({
    _id: user._id
  }, {
    $set: {
      username: newUsername
    }
  }); // Perform another check after update, in case a matching user has been
  // inserted in the meantime

  try {
    checkForCaseInsensitiveDuplicates('username', 'Username', newUsername, user._id);
  } catch (ex) {
    // Undo update if the check fails
    Meteor.users.update({
      _id: user._id
    }, {
      $set: {
        username: oldUsername
      }
    });
    throw ex;
  }
}; // Let the user change their own password if they know the old
// password. `oldPassword` and `newPassword` should be objects with keys
// `digest` and `algorithm` (representing the SHA256 of the password).
//
// XXX COMPAT WITH 0.8.1.3
// Like the login method, if the user hasn't been upgraded from SRP to
// bcrypt yet, then this method will throw an 'old password format'
// error. The client should call the SRP upgrade login handler and then
// retry this method again.
//
// UNLIKE the login method, there is no way to avoid getting SRP upgrade
// errors thrown. The reasoning for this is that clients using this
// method directly will need to be updated anyway because we no longer
// support the SRP flow that they would have been doing to use this
// method previously.


Meteor.methods({
  changePassword: function (oldPassword, newPassword) {
    check(oldPassword, passwordValidator);
    check(newPassword, passwordValidator);

    if (!this.userId) {
      throw new Meteor.Error(401, "Must be logged in");
    }

    const user = getUserById(this.userId, {
      fields: _objectSpread({
        services: 1
      }, Accounts._checkPasswordUserFields)
    });

    if (!user) {
      handleError("User not found");
    }

    if (!user.services || !user.services.password || !user.services.password.bcrypt && !user.services.password.srp) {
      handleError("User has no password set");
    }

    if (!user.services.password.bcrypt) {
      throw new Meteor.Error(400, "old password format", EJSON.stringify({
        format: 'srp',
        identity: user.services.password.srp.identity
      }));
    }

    const result = checkPassword(user, oldPassword);

    if (result.error) {
      throw result.error;
    }

    const hashed = hashPassword(newPassword); // It would be better if this removed ALL existing tokens and replaced
    // the token for the current connection with a new one, but that would
    // be tricky, so we'll settle for just replacing all tokens other than
    // the one for the current connection.

    const currentToken = Accounts._getLoginToken(this.connection.id);

    Meteor.users.update({
      _id: this.userId
    }, {
      $set: {
        'services.password.bcrypt': hashed
      },
      $pull: {
        'services.resume.loginTokens': {
          hashedToken: {
            $ne: currentToken
          }
        }
      },
      $unset: {
        'services.password.reset': 1
      }
    });
    return {
      passwordChanged: true
    };
  }
}); // Force change the users password.

/**
 * @summary Forcibly change the password for a user.
 * @locus Server
 * @param {String} userId The id of the user to update.
 * @param {String} newPassword A new password for the user.
 * @param {Object} [options]
 * @param {Object} options.logout Logout all current connections with this userId (default: true)
 * @importFromPackage accounts-base
 */

Accounts.setPassword = (userId, newPlaintextPassword, options) => {
  options = _objectSpread({
    logout: true
  }, options);
  const user = getUserById(userId, {
    fields: {
      _id: 1
    }
  });

  if (!user) {
    throw new Meteor.Error(403, "User not found");
  }

  const update = {
    $unset: {
      'services.password.srp': 1,
      // XXX COMPAT WITH 0.8.1.3
      'services.password.reset': 1
    },
    $set: {
      'services.password.bcrypt': hashPassword(newPlaintextPassword)
    }
  };

  if (options.logout) {
    update.$unset['services.resume.loginTokens'] = 1;
  }

  Meteor.users.update({
    _id: user._id
  }, update);
}; ///
/// RESETTING VIA EMAIL
///
// Utility for plucking addresses from emails


const pluckAddresses = function () {
  let emails = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return emails.map(email => email.address);
}; // Method called by a user to request a password reset email. This is
// the start of the reset process.


Meteor.methods({
  forgotPassword: options => {
    check(options, {
      email: String
    });
    const user = Accounts.findUserByEmail(options.email, {
      fields: {
        emails: 1
      }
    });

    if (!user) {
      handleError("User not found");
    }

    const emails = pluckAddresses(user.emails);
    const caseSensitiveEmail = emails.find(email => email.toLowerCase() === options.email.toLowerCase());
    Accounts.sendResetPasswordEmail(user._id, caseSensitiveEmail);
  }
});
/**
 * @summary Generates a reset token and saves it into the database.
 * @locus Server
 * @param {String} userId The id of the user to generate the reset token for.
 * @param {String} email Which address of the user to generate the reset token for. This address must be in the user's `emails` list. If `null`, defaults to the first email in the list.
 * @param {String} reason `resetPassword` or `enrollAccount`.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @returns {Object} Object with {email, user, token} values.
 * @importFromPackage accounts-base
 */

Accounts.generateResetToken = (userId, email, reason, extraTokenData) => {
  // Make sure the user exists, and email is one of their addresses.
  // Don't limit the fields in the user object since the user is returned
  // by the function and some other fields might be used elsewhere.
  const user = getUserById(userId);

  if (!user) {
    handleError("Can't find user");
  } // pick the first email if we weren't passed an email.


  if (!email && user.emails && user.emails[0]) {
    email = user.emails[0].address;
  } // make sure we have a valid email


  if (!email || !pluckAddresses(user.emails).includes(email)) {
    handleError("No such email for user.");
  }

  const token = Random.secret();
  const tokenRecord = {
    token,
    email,
    when: new Date()
  };

  if (reason === 'resetPassword') {
    tokenRecord.reason = 'reset';
  } else if (reason === 'enrollAccount') {
    tokenRecord.reason = 'enroll';
  } else if (reason) {
    // fallback so that this function can be used for unknown reasons as well
    tokenRecord.reason = reason;
  }

  if (extraTokenData) {
    Object.assign(tokenRecord, extraTokenData);
  }

  Meteor.users.update({
    _id: user._id
  }, {
    $set: {
      'services.password.reset': tokenRecord
    }
  }); // before passing to template, update user object with new token

  Meteor._ensure(user, 'services', 'password').reset = tokenRecord;
  return {
    email,
    user,
    token
  };
};
/**
 * @summary Generates an e-mail verification token and saves it into the database.
 * @locus Server
 * @param {String} userId The id of the user to generate the  e-mail verification token for.
 * @param {String} email Which address of the user to generate the e-mail verification token for. This address must be in the user's `emails` list. If `null`, defaults to the first unverified email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @returns {Object} Object with {email, user, token} values.
 * @importFromPackage accounts-base
 */


Accounts.generateVerificationToken = (userId, email, extraTokenData) => {
  // Make sure the user exists, and email is one of their addresses.
  // Don't limit the fields in the user object since the user is returned
  // by the function and some other fields might be used elsewhere.
  const user = getUserById(userId);

  if (!user) {
    handleError("Can't find user");
  } // pick the first unverified email if we weren't passed an email.


  if (!email) {
    const emailRecord = (user.emails || []).find(e => !e.verified);
    email = (emailRecord || {}).address;

    if (!email) {
      handleError("That user has no unverified email addresses.");
    }
  } // make sure we have a valid email


  if (!email || !pluckAddresses(user.emails).includes(email)) {
    handleError("No such email for user.");
  }

  const token = Random.secret();
  const tokenRecord = {
    token,
    // TODO: This should probably be renamed to "email" to match reset token record.
    address: email,
    when: new Date()
  };

  if (extraTokenData) {
    Object.assign(tokenRecord, extraTokenData);
  }

  Meteor.users.update({
    _id: user._id
  }, {
    $push: {
      'services.email.verificationTokens': tokenRecord
    }
  }); // before passing to template, update user object with new token

  Meteor._ensure(user, 'services', 'email');

  if (!user.services.email.verificationTokens) {
    user.services.email.verificationTokens = [];
  }

  user.services.email.verificationTokens.push(tokenRecord);
  return {
    email,
    user,
    token
  };
};
/**
 * @summary Creates options for email sending for reset password and enroll account emails.
 * You can use this function when customizing a reset password or enroll account email sending.
 * @locus Server
 * @param {Object} email Which address of the user's to send the email to.
 * @param {Object} user The user object to generate options for.
 * @param {String} url URL to which user is directed to confirm the email.
 * @param {String} reason `resetPassword` or `enrollAccount`.
 * @returns {Object} Options which can be passed to `Email.send`.
 * @importFromPackage accounts-base
 */


Accounts.generateOptionsForEmail = (email, user, url, reason) => {
  const options = {
    to: email,
    from: Accounts.emailTemplates[reason].from ? Accounts.emailTemplates[reason].from(user) : Accounts.emailTemplates.from,
    subject: Accounts.emailTemplates[reason].subject(user)
  };

  if (typeof Accounts.emailTemplates[reason].text === 'function') {
    options.text = Accounts.emailTemplates[reason].text(user, url);
  }

  if (typeof Accounts.emailTemplates[reason].html === 'function') {
    options.html = Accounts.emailTemplates[reason].html(user, url);
  }

  if (typeof Accounts.emailTemplates.headers === 'object') {
    options.headers = Accounts.emailTemplates.headers;
  }

  return options;
}; // send the user an email with a link that when opened allows the user
// to set a new password, without the old password.

/**
 * @summary Send an email with a link the user can use to reset their password.
 * @locus Server
 * @param {String} userId The id of the user to send email to.
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @param {Object} [extraParams] Optional additional params to be added to the reset url.
 * @returns {Object} Object with {email, user, token, url, options} values.
 * @importFromPackage accounts-base
 */


Accounts.sendResetPasswordEmail = (userId, email, extraTokenData, extraParams) => {
  const {
    email: realEmail,
    user,
    token
  } = Accounts.generateResetToken(userId, email, 'resetPassword', extraTokenData);
  const url = Accounts.urls.resetPassword(token, extraParams);
  const options = Accounts.generateOptionsForEmail(realEmail, user, url, 'resetPassword');
  Email.send(options);

  if (Meteor.isDevelopment) {
    console.log("\nReset password URL: ".concat(url));
  }

  return {
    email: realEmail,
    user,
    token,
    url,
    options
  };
}; // send the user an email informing them that their account was created, with
// a link that when opened both marks their email as verified and forces them
// to choose their password. The email must be one of the addresses in the
// user's emails field, or undefined to pick the first email automatically.
//
// This is not called automatically. It must be called manually if you
// want to use enrollment emails.

/**
 * @summary Send an email with a link the user can use to set their initial password.
 * @locus Server
 * @param {String} userId The id of the user to send email to.
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @param {Object} [extraParams] Optional additional params to be added to the enrollment url.
 * @returns {Object} Object with {email, user, token, url, options} values.
 * @importFromPackage accounts-base
 */


Accounts.sendEnrollmentEmail = (userId, email, extraTokenData, extraParams) => {
  const {
    email: realEmail,
    user,
    token
  } = Accounts.generateResetToken(userId, email, 'enrollAccount', extraTokenData);
  const url = Accounts.urls.enrollAccount(token, extraParams);
  const options = Accounts.generateOptionsForEmail(realEmail, user, url, 'enrollAccount');
  Email.send(options);

  if (Meteor.isDevelopment) {
    console.log("\nEnrollment email URL: ".concat(url));
  }

  return {
    email: realEmail,
    user,
    token,
    url,
    options
  };
}; // Take token from sendResetPasswordEmail or sendEnrollmentEmail, change
// the users password, and log them in.


Meteor.methods({
  resetPassword: function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    const token = args[0];
    const newPassword = args[1];
    return Accounts._loginMethod(this, "resetPassword", args, "password", () => {
      check(token, String);
      check(newPassword, passwordValidator);
      const user = Meteor.users.findOne({
        "services.password.reset.token": token
      }, {
        fields: {
          services: 1,
          emails: 1
        }
      });

      if (!user) {
        throw new Meteor.Error(403, "Token expired");
      }

      const {
        when,
        reason,
        email
      } = user.services.password.reset;

      let tokenLifetimeMs = Accounts._getPasswordResetTokenLifetimeMs();

      if (reason === "enroll") {
        tokenLifetimeMs = Accounts._getPasswordEnrollTokenLifetimeMs();
      }

      const currentTimeMs = Date.now();
      if (currentTimeMs - when > tokenLifetimeMs) throw new Meteor.Error(403, "Token expired");
      if (!pluckAddresses(user.emails).includes(email)) return {
        userId: user._id,
        error: new Meteor.Error(403, "Token has invalid email address")
      };
      const hashed = hashPassword(newPassword); // NOTE: We're about to invalidate tokens on the user, who we might be
      // logged in as. Make sure to avoid logging ourselves out if this
      // happens. But also make sure not to leave the connection in a state
      // of having a bad token set if things fail.

      const oldToken = Accounts._getLoginToken(this.connection.id);

      Accounts._setLoginToken(user._id, this.connection, null);

      const resetToOldToken = () => Accounts._setLoginToken(user._id, this.connection, oldToken);

      try {
        // Update the user record by:
        // - Changing the password to the new one
        // - Forgetting about the reset token that was just used
        // - Verifying their email, since they got the password reset via email.
        const affectedRecords = Meteor.users.update({
          _id: user._id,
          'emails.address': email,
          'services.password.reset.token': token
        }, {
          $set: {
            'services.password.bcrypt': hashed,
            'emails.$.verified': true
          },
          $unset: {
            'services.password.reset': 1,
            'services.password.srp': 1
          }
        });
        if (affectedRecords !== 1) return {
          userId: user._id,
          error: new Meteor.Error(403, "Invalid email")
        };
      } catch (err) {
        resetToOldToken();
        throw err;
      } // Replace all valid login tokens with new ones (changing
      // password should invalidate existing sessions).


      Accounts._clearAllLoginTokens(user._id);

      return {
        userId: user._id
      };
    });
  }
}); ///
/// EMAIL VERIFICATION
///
// send the user an email with a link that when opened marks that
// address as verified

/**
 * @summary Send an email with a link the user can use verify their email address.
 * @locus Server
 * @param {String} userId The id of the user to send email to.
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first unverified email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @param {Object} [extraParams] Optional additional params to be added to the verification url.
 *
 * @returns {Object} Object with {email, user, token, url, options} values.
 * @importFromPackage accounts-base
 */

Accounts.sendVerificationEmail = (userId, email, extraTokenData, extraParams) => {
  // XXX Also generate a link using which someone can delete this
  // account if they own said address but weren't those who created
  // this account.
  const {
    email: realEmail,
    user,
    token
  } = Accounts.generateVerificationToken(userId, email, extraTokenData);
  const url = Accounts.urls.verifyEmail(token, extraParams);
  const options = Accounts.generateOptionsForEmail(realEmail, user, url, 'verifyEmail');
  Email.send(options);

  if (Meteor.isDevelopment) {
    console.log("\nVerification email URL: ".concat(url));
  }

  return {
    email: realEmail,
    user,
    token,
    url,
    options
  };
}; // Take token from sendVerificationEmail, mark the email as verified,
// and log them in.


Meteor.methods({
  verifyEmail: function () {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    const token = args[0];
    return Accounts._loginMethod(this, "verifyEmail", args, "password", () => {
      check(token, String);
      const user = Meteor.users.findOne({
        'services.email.verificationTokens.token': token
      }, {
        fields: {
          services: 1,
          emails: 1
        }
      });
      if (!user) throw new Meteor.Error(403, "Verify email link expired");
      const tokenRecord = user.services.email.verificationTokens.find(t => t.token == token);
      if (!tokenRecord) return {
        userId: user._id,
        error: new Meteor.Error(403, "Verify email link expired")
      };
      const emailsRecord = user.emails.find(e => e.address == tokenRecord.address);
      if (!emailsRecord) return {
        userId: user._id,
        error: new Meteor.Error(403, "Verify email link is for unknown address")
      }; // By including the address in the query, we can use 'emails.$' in the
      // modifier to get a reference to the specific object in the emails
      // array. See
      // http://www.mongodb.org/display/DOCS/Updating/#Updating-The%24positionaloperator)
      // http://www.mongodb.org/display/DOCS/Updating#Updating-%24pull

      Meteor.users.update({
        _id: user._id,
        'emails.address': tokenRecord.address
      }, {
        $set: {
          'emails.$.verified': true
        },
        $pull: {
          'services.email.verificationTokens': {
            address: tokenRecord.address
          }
        }
      });
      return {
        userId: user._id
      };
    });
  }
});
/**
 * @summary Add an email address for a user. Use this instead of directly
 * updating the database. The operation will fail if there is a different user
 * with an email only differing in case. If the specified user has an existing
 * email only differing in case however, we replace it.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} newEmail A new email address for the user.
 * @param {Boolean} [verified] Optional - whether the new email address should
 * be marked as verified. Defaults to false.
 * @importFromPackage accounts-base
 */

Accounts.addEmail = (userId, newEmail, verified) => {
  check(userId, NonEmptyString);
  check(newEmail, NonEmptyString);
  check(verified, Match.Optional(Boolean));

  if (verified === void 0) {
    verified = false;
  }

  const user = getUserById(userId, {
    fields: {
      emails: 1
    }
  });
  if (!user) throw new Meteor.Error(403, "User not found"); // Allow users to change their own email to a version with a different case
  // We don't have to call checkForCaseInsensitiveDuplicates to do a case
  // insensitive check across all emails in the database here because: (1) if
  // there is no case-insensitive duplicate between this user and other users,
  // then we are OK and (2) if this would create a conflict with other users
  // then there would already be a case-insensitive duplicate and we can't fix
  // that in this code anyway.

  const caseInsensitiveRegExp = new RegExp("^".concat(Meteor._escapeRegExp(newEmail), "$"), 'i');
  const didUpdateOwnEmail = (user.emails || []).reduce((prev, email) => {
    if (caseInsensitiveRegExp.test(email.address)) {
      Meteor.users.update({
        _id: user._id,
        'emails.address': email.address
      }, {
        $set: {
          'emails.$.address': newEmail,
          'emails.$.verified': verified
        }
      });
      return true;
    } else {
      return prev;
    }
  }, false); // In the other updates below, we have to do another call to
  // checkForCaseInsensitiveDuplicates to make sure that no conflicting values
  // were added to the database in the meantime. We don't have to do this for
  // the case where the user is updating their email address to one that is the
  // same as before, but only different because of capitalization. Read the
  // big comment above to understand why.

  if (didUpdateOwnEmail) {
    return;
  } // Perform a case insensitive check for duplicates before update


  checkForCaseInsensitiveDuplicates('emails.address', 'Email', newEmail, user._id);
  Meteor.users.update({
    _id: user._id
  }, {
    $addToSet: {
      emails: {
        address: newEmail,
        verified: verified
      }
    }
  }); // Perform another check after update, in case a matching user has been
  // inserted in the meantime

  try {
    checkForCaseInsensitiveDuplicates('emails.address', 'Email', newEmail, user._id);
  } catch (ex) {
    // Undo update if the check fails
    Meteor.users.update({
      _id: user._id
    }, {
      $pull: {
        emails: {
          address: newEmail
        }
      }
    });
    throw ex;
  }
};
/**
 * @summary Remove an email address for a user. Use this instead of updating
 * the database directly.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} email The email address to remove.
 * @importFromPackage accounts-base
 */


Accounts.removeEmail = (userId, email) => {
  check(userId, NonEmptyString);
  check(email, NonEmptyString);
  const user = getUserById(userId, {
    fields: {
      _id: 1
    }
  });
  if (!user) throw new Meteor.Error(403, "User not found");
  Meteor.users.update({
    _id: user._id
  }, {
    $pull: {
      emails: {
        address: email
      }
    }
  });
}; ///
/// CREATING USERS
///
// Shared createUser function called from the createUser method, both
// if originates in client or server code. Calls user provided hooks,
// does the actual user insertion.
//
// returns the user id


const createUser = options => {
  // Unknown keys allowed, because a onCreateUserHook can take arbitrary
  // options.
  check(options, Match.ObjectIncluding({
    username: Match.Optional(String),
    email: Match.Optional(String),
    password: Match.Optional(passwordValidator)
  }));
  const {
    username,
    email,
    password
  } = options;
  if (!username && !email) throw new Meteor.Error(400, "Need to set a username or email");
  const user = {
    services: {}
  };

  if (password) {
    const hashed = hashPassword(password);
    user.services.password = {
      bcrypt: hashed
    };
  }

  if (username) user.username = username;
  if (email) user.emails = [{
    address: email,
    verified: false
  }]; // Perform a case insensitive check before insert

  checkForCaseInsensitiveDuplicates('username', 'Username', username);
  checkForCaseInsensitiveDuplicates('emails.address', 'Email', email);
  const userId = Accounts.insertUserDoc(options, user); // Perform another check after insert, in case a matching user has been
  // inserted in the meantime

  try {
    checkForCaseInsensitiveDuplicates('username', 'Username', username, userId);
    checkForCaseInsensitiveDuplicates('emails.address', 'Email', email, userId);
  } catch (ex) {
    // Remove inserted user if the check fails
    Meteor.users.remove(userId);
    throw ex;
  }

  return userId;
}; // method for create user. Requests come from the client.


Meteor.methods({
  createUser: function () {
    for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    const options = args[0];
    return Accounts._loginMethod(this, "createUser", args, "password", () => {
      // createUser() above does more checking.
      check(options, Object);
      if (Accounts._options.forbidClientAccountCreation) return {
        error: new Meteor.Error(403, "Signups forbidden")
      };
      const userId = Accounts.createUserVerifyingEmail(options); // client gets logged in as the new user afterwards.

      return {
        userId: userId
      };
    });
  }
}); // Create user directly on the server.
//
// Differently from Accounts.createUser(), this evaluates the Accounts package
// configurations and send a verification email if the user has been registered
// successfully.

Accounts.createUserVerifyingEmail = options => {
  options = _objectSpread({}, options); // Create user. result contains id and token.

  const userId = createUser(options); // safety belt. createUser is supposed to throw on error. send 500 error
  // instead of sending a verification email with empty userid.

  if (!userId) throw new Error("createUser failed to insert new user"); // If `Accounts._options.sendVerificationEmail` is set, register
  // a token to verify the user's primary email, and send it to
  // that address.

  if (options.email && Accounts._options.sendVerificationEmail) {
    if (options.password) {
      Accounts.sendVerificationEmail(userId, options.email);
    } else {
      Accounts.sendEnrollmentEmail(userId, options.email);
    }
  }

  return userId;
}; // Create user directly on the server.
//
// Unlike the client version, this does not log you in as this user
// after creation.
//
// returns userId or throws an error if it can't create
//
// XXX add another argument ("server options") that gets sent to onCreateUser,
// which is always empty when called from the createUser method? eg, "admin:
// true", which we want to prevent the client from setting, but which a custom
// method calling Accounts.createUser could set?
//


Accounts.createUser = (options, callback) => {
  options = _objectSpread({}, options); // XXX allow an optional callback?

  if (callback) {
    throw new Error("Accounts.createUser with callback not supported on the server yet.");
  }

  return createUser(options);
}; ///
/// PASSWORD-SPECIFIC INDEXES ON USERS
///


Meteor.users._ensureIndex('services.email.verificationTokens.token', {
  unique: true,
  sparse: true
});

Meteor.users._ensureIndex('services.password.reset.token', {
  unique: true,
  sparse: true
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/accounts-password/email_templates.js");
require("/node_modules/meteor/accounts-password/password_server.js");

/* Exports */
Package._define("accounts-password");

})();

//# sourceURL=meteor://💻app/packages/accounts-password.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtcGFzc3dvcmQvZW1haWxfdGVtcGxhdGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9hY2NvdW50cy1wYXNzd29yZC9wYXNzd29yZF9zZXJ2ZXIuanMiXSwibmFtZXMiOlsiZ3JlZXQiLCJ3ZWxjb21lTXNnIiwidXNlciIsInVybCIsImdyZWV0aW5nIiwicHJvZmlsZSIsIm5hbWUiLCJBY2NvdW50cyIsImVtYWlsVGVtcGxhdGVzIiwiZnJvbSIsInNpdGVOYW1lIiwiTWV0ZW9yIiwiYWJzb2x1dGVVcmwiLCJyZXBsYWNlIiwicmVzZXRQYXNzd29yZCIsInN1YmplY3QiLCJ0ZXh0IiwidmVyaWZ5RW1haWwiLCJlbnJvbGxBY2NvdW50IiwiX29iamVjdFNwcmVhZCIsIm1vZHVsZSIsImxpbmsiLCJkZWZhdWx0IiwidiIsImJjcnlwdCIsIk5wbU1vZHVsZUJjcnlwdCIsImJjcnlwdEhhc2giLCJ3cmFwQXN5bmMiLCJoYXNoIiwiYmNyeXB0Q29tcGFyZSIsImNvbXBhcmUiLCJnZXRVc2VyQnlJZCIsImlkIiwib3B0aW9ucyIsInVzZXJzIiwiZmluZE9uZSIsIl9hZGREZWZhdWx0RmllbGRTZWxlY3RvciIsIl9iY3J5cHRSb3VuZHMiLCJfb3B0aW9ucyIsImJjcnlwdFJvdW5kcyIsImdldFBhc3N3b3JkU3RyaW5nIiwicGFzc3dvcmQiLCJTSEEyNTYiLCJhbGdvcml0aG0iLCJFcnJvciIsImRpZ2VzdCIsImhhc2hQYXNzd29yZCIsImdldFJvdW5kc0Zyb21CY3J5cHRIYXNoIiwicm91bmRzIiwiaGFzaFNlZ21lbnRzIiwic3BsaXQiLCJsZW5ndGgiLCJwYXJzZUludCIsIl9jaGVja1Bhc3N3b3JkVXNlckZpZWxkcyIsIl9pZCIsInNlcnZpY2VzIiwiX2NoZWNrUGFzc3dvcmQiLCJyZXN1bHQiLCJ1c2VySWQiLCJmb3JtYXR0ZWRQYXNzd29yZCIsImhhc2hSb3VuZHMiLCJlcnJvciIsImhhbmRsZUVycm9yIiwiZGVmZXIiLCJ1cGRhdGUiLCIkc2V0IiwiY2hlY2tQYXNzd29yZCIsIm1zZyIsInRocm93RXJyb3IiLCJhbWJpZ3VvdXNFcnJvck1lc3NhZ2VzIiwiX2ZpbmRVc2VyQnlRdWVyeSIsInF1ZXJ5IiwiZmllbGROYW1lIiwiZmllbGRWYWx1ZSIsInVzZXJuYW1lIiwiZW1haWwiLCJzZWxlY3RvciIsInNlbGVjdG9yRm9yRmFzdENhc2VJbnNlbnNpdGl2ZUxvb2t1cCIsImNhbmRpZGF0ZVVzZXJzIiwiZmluZCIsImZldGNoIiwiZmluZFVzZXJCeVVzZXJuYW1lIiwiZmluZFVzZXJCeUVtYWlsIiwic3RyaW5nIiwicHJlZml4Iiwic3Vic3RyaW5nIiwiTWF0aCIsIm1pbiIsIm9yQ2xhdXNlIiwiZ2VuZXJhdGVDYXNlUGVybXV0YXRpb25zRm9yU3RyaW5nIiwibWFwIiwicHJlZml4UGVybXV0YXRpb24iLCJSZWdFeHAiLCJfZXNjYXBlUmVnRXhwIiwiY2FzZUluc2Vuc2l0aXZlQ2xhdXNlIiwiJGFuZCIsIiRvciIsInBlcm11dGF0aW9ucyIsImkiLCJjaCIsImNoYXJBdCIsImNvbmNhdCIsImxvd2VyQ2FzZUNoYXIiLCJ0b0xvd2VyQ2FzZSIsInVwcGVyQ2FzZUNoYXIiLCJ0b1VwcGVyQ2FzZSIsImNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcyIsImRpc3BsYXlOYW1lIiwib3duVXNlcklkIiwic2tpcENoZWNrIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiX3NraXBDYXNlSW5zZW5zaXRpdmVDaGVja3NGb3JUZXN0IiwibWF0Y2hlZFVzZXJzIiwiZmllbGRzIiwibGltaXQiLCJOb25FbXB0eVN0cmluZyIsIk1hdGNoIiwiV2hlcmUiLCJ4IiwiY2hlY2siLCJTdHJpbmciLCJ1c2VyUXVlcnlWYWxpZGF0b3IiLCJPcHRpb25hbCIsImtleXMiLCJwYXNzd29yZFZhbGlkYXRvciIsIk9uZU9mIiwicmVnaXN0ZXJMb2dpbkhhbmRsZXIiLCJzcnAiLCJ1bmRlZmluZWQiLCJ2ZXJpZmllciIsIm5ld1ZlcmlmaWVyIiwiU1JQIiwiZ2VuZXJhdGVWZXJpZmllciIsImlkZW50aXR5Iiwic2FsdCIsIkVKU09OIiwic3RyaW5naWZ5IiwiZm9ybWF0IiwidjEiLCJ2MiIsImhhc2hlZElkZW50aXR5QW5kUGFzc3dvcmQiLCJzYWx0ZWQiLCIkdW5zZXQiLCJzZXRVc2VybmFtZSIsIm5ld1VzZXJuYW1lIiwib2xkVXNlcm5hbWUiLCJleCIsIm1ldGhvZHMiLCJjaGFuZ2VQYXNzd29yZCIsIm9sZFBhc3N3b3JkIiwibmV3UGFzc3dvcmQiLCJoYXNoZWQiLCJjdXJyZW50VG9rZW4iLCJfZ2V0TG9naW5Ub2tlbiIsImNvbm5lY3Rpb24iLCIkcHVsbCIsImhhc2hlZFRva2VuIiwiJG5lIiwicGFzc3dvcmRDaGFuZ2VkIiwic2V0UGFzc3dvcmQiLCJuZXdQbGFpbnRleHRQYXNzd29yZCIsImxvZ291dCIsInBsdWNrQWRkcmVzc2VzIiwiZW1haWxzIiwiYWRkcmVzcyIsImZvcmdvdFBhc3N3b3JkIiwiY2FzZVNlbnNpdGl2ZUVtYWlsIiwic2VuZFJlc2V0UGFzc3dvcmRFbWFpbCIsImdlbmVyYXRlUmVzZXRUb2tlbiIsInJlYXNvbiIsImV4dHJhVG9rZW5EYXRhIiwiaW5jbHVkZXMiLCJ0b2tlbiIsIlJhbmRvbSIsInNlY3JldCIsInRva2VuUmVjb3JkIiwid2hlbiIsIkRhdGUiLCJhc3NpZ24iLCJfZW5zdXJlIiwicmVzZXQiLCJnZW5lcmF0ZVZlcmlmaWNhdGlvblRva2VuIiwiZW1haWxSZWNvcmQiLCJlIiwidmVyaWZpZWQiLCIkcHVzaCIsInZlcmlmaWNhdGlvblRva2VucyIsInB1c2giLCJnZW5lcmF0ZU9wdGlvbnNGb3JFbWFpbCIsInRvIiwiaHRtbCIsImhlYWRlcnMiLCJleHRyYVBhcmFtcyIsInJlYWxFbWFpbCIsInVybHMiLCJFbWFpbCIsInNlbmQiLCJpc0RldmVsb3BtZW50IiwiY29uc29sZSIsImxvZyIsInNlbmRFbnJvbGxtZW50RW1haWwiLCJhcmdzIiwiX2xvZ2luTWV0aG9kIiwidG9rZW5MaWZldGltZU1zIiwiX2dldFBhc3N3b3JkUmVzZXRUb2tlbkxpZmV0aW1lTXMiLCJfZ2V0UGFzc3dvcmRFbnJvbGxUb2tlbkxpZmV0aW1lTXMiLCJjdXJyZW50VGltZU1zIiwibm93Iiwib2xkVG9rZW4iLCJfc2V0TG9naW5Ub2tlbiIsInJlc2V0VG9PbGRUb2tlbiIsImFmZmVjdGVkUmVjb3JkcyIsImVyciIsIl9jbGVhckFsbExvZ2luVG9rZW5zIiwic2VuZFZlcmlmaWNhdGlvbkVtYWlsIiwidCIsImVtYWlsc1JlY29yZCIsImFkZEVtYWlsIiwibmV3RW1haWwiLCJCb29sZWFuIiwiY2FzZUluc2Vuc2l0aXZlUmVnRXhwIiwiZGlkVXBkYXRlT3duRW1haWwiLCJyZWR1Y2UiLCJwcmV2IiwidGVzdCIsIiRhZGRUb1NldCIsInJlbW92ZUVtYWlsIiwiY3JlYXRlVXNlciIsIk9iamVjdEluY2x1ZGluZyIsImluc2VydFVzZXJEb2MiLCJyZW1vdmUiLCJmb3JiaWRDbGllbnRBY2NvdW50Q3JlYXRpb24iLCJjcmVhdGVVc2VyVmVyaWZ5aW5nRW1haWwiLCJjYWxsYmFjayIsIl9lbnN1cmVJbmRleCIsInVuaXF1ZSIsInNwYXJzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTUEsS0FBSyxHQUFHQyxVQUFVLElBQUksQ0FBQ0MsSUFBRCxFQUFPQyxHQUFQLEtBQWU7QUFDckMsUUFBTUMsUUFBUSxHQUFJRixJQUFJLENBQUNHLE9BQUwsSUFBZ0JILElBQUksQ0FBQ0csT0FBTCxDQUFhQyxJQUE5QixtQkFDREosSUFBSSxDQUFDRyxPQUFMLENBQWFDLElBRFosU0FDdUIsUUFEeEM7QUFFQSxtQkFBVUYsUUFBVixpQkFFSkgsVUFGSSwrQ0FJSkUsR0FKSTtBQVFMLENBWEQ7QUFhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQUksUUFBUSxDQUFDQyxjQUFULEdBQTBCO0FBQ3hCQyxNQUFJLEVBQUUseUNBRGtC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RSxjQUFRLENBQUNvTSxtQkFBVCxDQUE2QmpKLE1BQTdCLEVBQXFDekIsT0FBTyxDQUFDMEMsS0FBN0M7QUFDRDtBQUNGOztBQUVELFNBQU9qQixNQUFQO0FBQ0QsQ0FyQkQsQyxDQXVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBbkQsUUFBUSxDQUFDK04sVUFBVCxHQUFzQixDQUFDck0sT0FBRCxFQUFVMk0sUUFBVixLQUF1QjtBQUMzQzNNLFNBQU8scUJBQVFBLE9BQVIsQ0FBUCxDQUQyQyxDQUczQzs7QUFDQSxNQUFJMk0sUUFBSixFQUFjO0FBQ1osVUFBTSxJQUFJaE0sS0FBSixDQUFVLG9FQUFWLENBQU47QUFDRDs7QUFFRCxTQUFPMEwsVUFBVSxDQUFDck0sT0FBRCxDQUFqQjtBQUNELENBVEQsQyxDQVdBO0FBQ0E7QUFDQTs7O0FBQ0F0QixNQUFNLENBQUN1QixLQUFQLENBQWEyTSxZQUFiLENBQTBCLHlDQUExQixFQUMwQjtBQUFFQyxRQUFNLEVBQUUsSUFBVjtBQUFnQkMsUUFBTSxFQUFFO0FBQXhCLENBRDFCOztBQUVBcE8sTUFBTSxDQUFDdUIsS0FBUCxDQUFhMk0sWUFBYixDQUEwQiwrQkFBMUIsRUFDMEI7QUFBRUMsUUFBTSxFQUFFLElBQVY7QUFBZ0JDLFFBQU0sRUFBRTtBQUF4QixDQUQxQixFIiwiZmlsZSI6Ii9wYWNrYWdlcy9hY2NvdW50cy1wYXNzd29yZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGdyZWV0ID0gd2VsY29tZU1zZyA9PiAodXNlciwgdXJsKSA9PiB7XG4gICAgICBjb25zdCBncmVldGluZyA9ICh1c2VyLnByb2ZpbGUgJiYgdXNlci5wcm9maWxlLm5hbWUpID9cbiAgICAgICAgICAgIChgSGVsbG8gJHt1c2VyLnByb2ZpbGUubmFtZX0sYCkgOiBcIkhlbGxvLFwiO1xuICAgICAgcmV0dXJuIGAke2dyZWV0aW5nfVxuXG4ke3dlbGNvbWVNc2d9LCBzaW1wbHkgY2xpY2sgdGhlIGxpbmsgYmVsb3cuXG5cbiR7dXJsfVxuXG5UaGFua3MuXG5gO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBPcHRpb25zIHRvIGN1c3RvbWl6ZSBlbWFpbHMgc2VudCBmcm9tIHRoZSBBY2NvdW50cyBzeXN0ZW0uXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5lbWFpbFRlbXBsYXRlcyA9IHtcbiAgZnJvbTogXCJBY2NvdW50cyBFeGFtcGxlIDxuby1yZXBseUBleGFtcGxlLmNvbT5cIixcbiAgc2l0ZU5hbWU6IE1ldGVvci5hYnNvbHV0ZVVybCgpLnJlcGxhY2UoL15odHRwcz86XFwvXFwvLywgJycpLnJlcGxhY2UoL1xcLyQvLCAnJyksXG5cbiAgcmVzZXRQYXNzd29yZDoge1xuICAgIHN1YmplY3Q6ICgpID0+IGBIb3cgdG8gcmVzZXQgeW91ciBwYXNzd29yZCBvbiAke0FjY291bnRzLmVtYWlsVGVtcGxhdGVzLnNpdGVOYW1lfWAsXG4gICAgdGV4dDogZ3JlZXQoXCJUbyByZXNldCB5b3VyIHBhc3N3b3JkXCIpLFxuICB9LFxuICB2ZXJpZnlFbWFpbDoge1xuICAgIHN1YmplY3Q6ICgpID0+IGBIb3cgdG8gdmVyaWZ5IGVtYWlsIGFkZHJlc3Mgb24gJHtBY2NvdW50cy5lbWFpbFRlbXBsYXRlcy5zaXRlTmFtZX1gLFxuICAgIHRleHQ6IGdyZWV0KFwiVG8gdmVyaWZ5IHlvdXIgYWNjb3VudCBlbWFpbFwiKSxcbiAgfSxcbiAgZW5yb2xsQWNjb3VudDoge1xuICAgIHN1YmplY3Q6ICgpID0+IGBBbiBhY2NvdW50IGhhcyBiZWVuIGNyZWF0ZWQgZm9yIHlvdSBvbiAke0FjY291bnRzLmVtYWlsVGVtcGxhdGVzLnNpdGVOYW1lfWAsXG4gICAgdGV4dDogZ3JlZXQoXCJUbyBzdGFydCB1c2luZyB0aGUgc2VydmljZVwiKSxcbiAgfSxcbn07XG4iLCIvLy8gQkNSWVBUXG5cbmNvbnN0IGJjcnlwdCA9IE5wbU1vZHVsZUJjcnlwdDtcbmNvbnN0IGJjcnlwdEhhc2ggPSBNZXRlb3Iud3JhcEFzeW5jKGJjcnlwdC5oYXNoKTtcbmNvbnN0IGJjcnlwdENvbXBhcmUgPSBNZXRlb3Iud3JhcEFzeW5jKGJjcnlwdC5jb21wYXJlKTtcblxuLy8gVXRpbGl0eSBmb3IgZ3JhYmJpbmcgdXNlclxuY29uc3QgZ2V0VXNlckJ5SWQgPSAoaWQsIG9wdGlvbnMpID0+IE1ldGVvci51c2Vycy5maW5kT25lKGlkLCBBY2NvdW50cy5fYWRkRGVmYXVsdEZpZWxkU2VsZWN0b3Iob3B0aW9ucykpO1xuXG4vLyBVc2VyIHJlY29yZHMgaGF2ZSBhICdzZXJ2aWNlcy5wYXNzd29yZC5iY3J5cHQnIGZpZWxkIG9uIHRoZW0gdG8gaG9sZFxuLy8gdGhlaXIgaGFzaGVkIHBhc3N3b3JkcyAodW5sZXNzIHRoZXkgaGF2ZSBhICdzZXJ2aWNlcy5wYXNzd29yZC5zcnAnXG4vLyBmaWVsZCwgaW4gd2hpY2ggY2FzZSB0aGV5IHdpbGwgYmUgdXBncmFkZWQgdG8gYmNyeXB0IHRoZSBuZXh0IHRpbWVcbi8vIHRoZXkgbG9nIGluKS5cbi8vXG4vLyBXaGVuIHRoZSBjbGllbnQgc2VuZHMgYSBwYXNzd29yZCB0byB0aGUgc2VydmVyLCBpdCBjYW4gZWl0aGVyIGJlIGFcbi8vIHN0cmluZyAodGhlIHBsYWludGV4dCBwYXNzd29yZCkgb3IgYW4gb2JqZWN0IHdpdGgga2V5cyAnZGlnZXN0JyBhbmRcbi8vICdhbGdvcml0aG0nIChtdXN0IGJlIFwic2hhLTI1NlwiIGZvciBub3cpLiBUaGUgTWV0ZW9yIGNsaWVudCBhbHdheXMgc2VuZHNcbi8vIHBhc3N3b3JkIG9iamVjdHMgeyBkaWdlc3Q6ICosIGFsZ29yaXRobTogXCJzaGEtMjU2XCIgfSwgYnV0IEREUCBjbGllbnRzXG4vLyB0aGF0IGRvbid0IGhhdmUgYWNjZXNzIHRvIFNIQSBjYW4ganVzdCBzZW5kIHBsYWludGV4dCBwYXNzd29yZHMgYXNcbi8vIHN0cmluZ3MuXG4vL1xuLy8gV2hlbiB0aGUgc2VydmVyIHJlY2VpdmVzIGEgcGxhaW50ZXh0IHBhc3N3b3JkIGFzIGEgc3RyaW5nLCBpdCBhbHdheXNcbi8vIGhhc2hlcyBpdCB3aXRoIFNIQTI1NiBiZWZvcmUgcGFzc2luZyBpdCBpbnRvIGJjcnlwdC4gV2hlbiB0aGUgc2VydmVyXG4vLyByZWNlaXZlcyBhIHBhc3N3b3JkIGFzIGFuIG9iamVjdCwgaXQgYXNzZXJ0cyB0aGF0IHRoZSBhbGdvcml0aG0gaXNcbi8vIFwic2hhLTI1NlwiIGFuZCB0aGVuIHBhc3NlcyB0aGUgZGlnZXN0IHRvIGJjcnlwdC5cblxuXG5BY2NvdW50cy5fYmNyeXB0Um91bmRzID0gKCkgPT4gQWNjb3VudHMuX29wdGlvbnMuYmNyeXB0Um91bmRzIHx8IDEwO1xuXG4vLyBHaXZlbiBhICdwYXNzd29yZCcgZnJvbSB0aGUgY2xpZW50LCBleHRyYWN0IHRoZSBzdHJpbmcgdGhhdCB3ZSBzaG91bGRcbi8vIGJjcnlwdC4gJ3Bhc3N3b3JkJyBjYW4gYmUgb25lIG9mOlxuLy8gIC0gU3RyaW5nICh0aGUgcGxhaW50ZXh0IHBhc3N3b3JkKVxuLy8gIC0gT2JqZWN0IHdpdGggJ2RpZ2VzdCcgYW5kICdhbGdvcml0aG0nIGtleXMuICdhbGdvcml0aG0nIG11c3QgYmUgXCJzaGEtMjU2XCIuXG4vL1xuY29uc3QgZ2V0UGFzc3dvcmRTdHJpbmcgPSBwYXNzd29yZCA9PiB7XG4gIGlmICh0eXBlb2YgcGFzc3dvcmQgPT09IFwic3RyaW5nXCIpIHtcbiAgICBwYXNzd29yZCA9IFNIQTI1NihwYXNzd29yZCk7XG4gIH0gZWxzZSB7IC8vICdwYXNzd29yZCcgaXMgYW4gb2JqZWN0XG4gICAgaWYgKHBhc3N3b3JkLmFsZ29yaXRobSAhPT0gXCJzaGEtMjU2XCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcGFzc3dvcmQgaGFzaCBhbGdvcml0aG0uIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcIk9ubHkgJ3NoYS0yNTYnIGlzIGFsbG93ZWQuXCIpO1xuICAgIH1cbiAgICBwYXNzd29yZCA9IHBhc3N3b3JkLmRpZ2VzdDtcbiAgfVxuICByZXR1cm4gcGFzc3dvcmQ7XG59O1xuXG4vLyBVc2UgYmNyeXB0IHRvIGhhc2ggdGhlIHBhc3N3b3JkIGZvciBzdG9yYWdlIGluIHRoZSBkYXRhYmFzZS5cbi8vIGBwYXNzd29yZGAgY2FuIGJlIGEgc3RyaW5nIChpbiB3aGljaCBjYXNlIGl0IHdpbGwgYmUgcnVuIHRocm91Z2hcbi8vIFNIQTI1NiBiZWZvcmUgYmNyeXB0KSBvciBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGBkaWdlc3RgIGFuZFxuLy8gYGFsZ29yaXRobWAgKGluIHdoaWNoIGNhc2Ugd2UgYmNyeXB0IGBwYXNzd29yZC5kaWdlc3RgKS5cbi8vXG5jb25zdCBoYXNoUGFzc3dvcmQgPSBwYXNzd29yZCA9PiB7XG4gIHBhc3N3b3JkID0gZ2V0UGFzc3dvcmRTdHJpbmcocGFzc3dvcmQpO1xuICByZXR1cm4gYmNyeXB0SGFzaChwYXNzd29yZCwgQWNjb3VudHMuX2JjcnlwdFJvdW5kcygpKTtcbn07XG5cbi8vIEV4dHJhY3QgdGhlIG51bWJlciBvZiByb3VuZHMgdXNlZCBpbiB0aGUgc3BlY2lmaWVkIGJjcnlwdCBoYXNoLlxuY29uc3QgZ2V0Um91bmRzRnJvbUJjcnlwdEhhc2ggPSBoYXNoID0+IHtcbiAgbGV0IHJvdW5kcztcbiAgaWYgKGhhc2gpIHtcbiAgICBjb25zdCBoYXNoU2VnbWVudHMgPSBoYXNoLnNwbGl0KCckJyk7XG4gICAgaWYgKGhhc2hTZWdtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICByb3VuZHMgPSBwYXJzZUludChoYXNoU2VnbWVudHNbMl0sIDEwKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJvdW5kcztcbn07XG5cbi8vIENoZWNrIHdoZXRoZXIgdGhlIHByb3ZpZGVkIHBhc3N3b3JkIG1hdGNoZXMgdGhlIGJjcnlwdCdlZCBwYXNzd29yZCBpblxuLy8gdGhlIGRhdGFiYXNlIHVzZXIgcmVjb3JkLiBgcGFzc3dvcmRgIGNhbiBiZSBhIHN0cmluZyAoaW4gd2hpY2ggY2FzZVxuLy8gaXQgd2lsbCBiZSBydW4gdGhyb3VnaCBTSEEyNTYgYmVmb3JlIGJjcnlwdCkgb3IgYW4gb2JqZWN0IHdpdGhcbi8vIHByb3BlcnRpZXMgYGRpZ2VzdGAgYW5kIGBhbGdvcml0aG1gIChpbiB3aGljaCBjYXNlIHdlIGJjcnlwdFxuLy8gYHBhc3N3b3JkLmRpZ2VzdGApLlxuLy9cbi8vIFRoZSB1c2VyIHBhcmFtZXRlciBuZWVkcyBhdCBsZWFzdCB1c2VyLl9pZCBhbmQgdXNlci5zZXJ2aWNlc1xuQWNjb3VudHMuX2NoZWNrUGFzc3dvcmRVc2VyRmllbGRzID0ge19pZDogMSwgc2VydmljZXM6IDF9O1xuLy9cbkFjY291bnRzLl9jaGVja1Bhc3N3b3JkID0gKHVzZXIsIHBhc3N3b3JkKSA9PiB7XG4gIGNvbnN0IHJlc3VsdCA9IHtcbiAgICB1c2VySWQ6IHVzZXIuX2lkXG4gIH07XG5cbiAgY29uc3QgZm9ybWF0dGVkUGFzc3dvcmQgPSBnZXRQYXNzd29yZFN0cmluZyhwYXNzd29yZCk7XG4gIGNvbnN0IGhhc2ggPSB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdDtcbiAgY29uc3QgaGFzaFJvdW5kcyA9IGdldFJvdW5kc0Zyb21CY3J5cHRIYXNoKGhhc2gpO1xuXG4gIGlmICghIGJjcnlwdENvbXBhcmUoZm9ybWF0dGVkUGFzc3dvcmQsIGhhc2gpKSB7XG4gICAgcmVzdWx0LmVycm9yID0gaGFuZGxlRXJyb3IoXCJJbmNvcnJlY3QgcGFzc3dvcmRcIiwgZmFsc2UpO1xuICB9IGVsc2UgaWYgKGhhc2ggJiYgQWNjb3VudHMuX2JjcnlwdFJvdW5kcygpICE9IGhhc2hSb3VuZHMpIHtcbiAgICAvLyBUaGUgcGFzc3dvcmQgY2hlY2tzIG91dCwgYnV0IHRoZSB1c2VyJ3MgYmNyeXB0IGhhc2ggbmVlZHMgdG8gYmUgdXBkYXRlZC5cbiAgICBNZXRlb3IuZGVmZXIoKCkgPT4ge1xuICAgICAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7IF9pZDogdXNlci5faWQgfSwge1xuICAgICAgICAkc2V0OiB7XG4gICAgICAgICAgJ3NlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCc6XG4gICAgICAgICAgICBiY3J5cHRIYXNoKGZvcm1hdHRlZFBhc3N3b3JkLCBBY2NvdW50cy5fYmNyeXB0Um91bmRzKCkpXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5jb25zdCBjaGVja1Bhc3N3b3JkID0gQWNjb3VudHMuX2NoZWNrUGFzc3dvcmQ7XG5cbi8vL1xuLy8vIEVSUk9SIEhBTkRMRVJcbi8vL1xuY29uc3QgaGFuZGxlRXJyb3IgPSAobXNnLCB0aHJvd0Vycm9yID0gdHJ1ZSkgPT4ge1xuICBjb25zdCBlcnJvciA9IG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgNDAzLFxuICAgIEFjY291bnRzLl9vcHRpb25zLmFtYmlndW91c0Vycm9yTWVzc2FnZXNcbiAgICAgID8gXCJTb21ldGhpbmcgd2VudCB3cm9uZy4gUGxlYXNlIGNoZWNrIHlvdXIgY3JlZGVudGlhbHMuXCJcbiAgICAgIDogbXNnXG4gICk7XG4gIGlmICh0aHJvd0Vycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbiAgcmV0dXJuIGVycm9yO1xufTtcblxuLy8vXG4vLy8gTE9HSU5cbi8vL1xuXG5BY2NvdW50cy5fZmluZFVzZXJCeVF1ZXJ5ID0gKHF1ZXJ5LCBvcHRpb25zKSA9PiB7XG4gIGxldCB1c2VyID0gbnVsbDtcblxuICBpZiAocXVlcnkuaWQpIHtcbiAgICAvLyBkZWZhdWx0IGZpZWxkIHNlbGVjdG9yIGlzIGFkZGVkIHdpdGhpbiBnZXRVc2VyQnlJZCgpXG4gICAgdXNlciA9IGdldFVzZXJCeUlkKHF1ZXJ5LmlkLCBvcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICBvcHRpb25zID0gQWNjb3VudHMuX2FkZERlZmF1bHRGaWVsZFNlbGVjdG9yKG9wdGlvbnMpO1xuICAgIGxldCBmaWVsZE5hbWU7XG4gICAgbGV0IGZpZWxkVmFsdWU7XG4gICAgaWYgKHF1ZXJ5LnVzZXJuYW1lKSB7XG4gICAgICBmaWVsZE5hbWUgPSAndXNlcm5hbWUnO1xuICAgICAgZmllbGRWYWx1ZSA9IHF1ZXJ5LnVzZXJuYW1lO1xuICAgIH0gZWxzZSBpZiAocXVlcnkuZW1haWwpIHtcbiAgICAgIGZpZWxkTmFtZSA9ICdlbWFpbHMuYWRkcmVzcyc7XG4gICAgICBmaWVsZFZhbHVlID0gcXVlcnkuZW1haWw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInNob3VsZG4ndCBoYXBwZW4gKHZhbGlkYXRpb24gbWlzc2VkIHNvbWV0aGluZylcIik7XG4gICAgfVxuICAgIGxldCBzZWxlY3RvciA9IHt9O1xuICAgIHNlbGVjdG9yW2ZpZWxkTmFtZV0gPSBmaWVsZFZhbHVlO1xuICAgIHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZShzZWxlY3Rvciwgb3B0aW9ucyk7XG4gICAgLy8gSWYgdXNlciBpcyBub3QgZm91bmQsIHRyeSBhIGNhc2UgaW5zZW5zaXRpdmUgbG9va3VwXG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBzZWxlY3RvciA9IHNlbGVjdG9yRm9yRmFzdENhc2VJbnNlbnNpdGl2ZUxvb2t1cChmaWVsZE5hbWUsIGZpZWxkVmFsdWUpO1xuICAgICAgY29uc3QgY2FuZGlkYXRlVXNlcnMgPSBNZXRlb3IudXNlcnMuZmluZChzZWxlY3Rvciwgb3B0aW9ucykuZmV0Y2goKTtcbiAgICAgIC8vIE5vIG1hdGNoIGlmIG11bHRpcGxlIGNhbmRpZGF0ZXMgYXJlIGZvdW5kXG4gICAgICBpZiAoY2FuZGlkYXRlVXNlcnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHVzZXIgPSBjYW5kaWRhdGVVc2Vyc1swXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdXNlcjtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgRmluZHMgdGhlIHVzZXIgd2l0aCB0aGUgc3BlY2lmaWVkIHVzZXJuYW1lLlxuICogRmlyc3QgdHJpZXMgdG8gbWF0Y2ggdXNlcm5hbWUgY2FzZSBzZW5zaXRpdmVseTsgaWYgdGhhdCBmYWlscywgaXRcbiAqIHRyaWVzIGNhc2UgaW5zZW5zaXRpdmVseTsgYnV0IGlmIG1vcmUgdGhhbiBvbmUgdXNlciBtYXRjaGVzIHRoZSBjYXNlXG4gKiBpbnNlbnNpdGl2ZSBzZWFyY2gsIGl0IHJldHVybnMgbnVsbC5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VybmFtZSBUaGUgdXNlcm5hbWUgdG8gbG9vayBmb3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7TW9uZ29GaWVsZFNwZWNpZmllcn0gb3B0aW9ucy5maWVsZHMgRGljdGlvbmFyeSBvZiBmaWVsZHMgdG8gcmV0dXJuIG9yIGV4Y2x1ZGUuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBBIHVzZXIgaWYgZm91bmQsIGVsc2UgbnVsbFxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuZmluZFVzZXJCeVVzZXJuYW1lID1cbiAgKHVzZXJuYW1lLCBvcHRpb25zKSA9PiBBY2NvdW50cy5fZmluZFVzZXJCeVF1ZXJ5KHsgdXNlcm5hbWUgfSwgb3B0aW9ucyk7XG5cbi8qKlxuICogQHN1bW1hcnkgRmluZHMgdGhlIHVzZXIgd2l0aCB0aGUgc3BlY2lmaWVkIGVtYWlsLlxuICogRmlyc3QgdHJpZXMgdG8gbWF0Y2ggZW1haWwgY2FzZSBzZW5zaXRpdmVseTsgaWYgdGhhdCBmYWlscywgaXRcbiAqIHRyaWVzIGNhc2UgaW5zZW5zaXRpdmVseTsgYnV0IGlmIG1vcmUgdGhhbiBvbmUgdXNlciBtYXRjaGVzIHRoZSBjYXNlXG4gKiBpbnNlbnNpdGl2ZSBzZWFyY2gsIGl0IHJldHVybnMgbnVsbC5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBlbWFpbCBUaGUgZW1haWwgYWRkcmVzcyB0byBsb29rIGZvclxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAqIEByZXR1cm5zIHtPYmplY3R9IEEgdXNlciBpZiBmb3VuZCwgZWxzZSBudWxsXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5maW5kVXNlckJ5RW1haWwgPVxuICAoZW1haWwsIG9wdGlvbnMpID0+IEFjY291bnRzLl9maW5kVXNlckJ5UXVlcnkoeyBlbWFpbCB9LCBvcHRpb25zKTtcblxuLy8gR2VuZXJhdGVzIGEgTW9uZ29EQiBzZWxlY3RvciB0aGF0IGNhbiBiZSB1c2VkIHRvIHBlcmZvcm0gYSBmYXN0IGNhc2Vcbi8vIGluc2Vuc2l0aXZlIGxvb2t1cCBmb3IgdGhlIGdpdmVuIGZpZWxkTmFtZSBhbmQgc3RyaW5nLiBTaW5jZSBNb25nb0RCIGRvZXNcbi8vIG5vdCBzdXBwb3J0IGNhc2UgaW5zZW5zaXRpdmUgaW5kZXhlcywgYW5kIGNhc2UgaW5zZW5zaXRpdmUgcmVnZXggcXVlcmllc1xuLy8gYXJlIHNsb3csIHdlIGNvbnN0cnVjdCBhIHNldCBvZiBwcmVmaXggc2VsZWN0b3JzIGZvciBhbGwgcGVybXV0YXRpb25zIG9mXG4vLyB0aGUgZmlyc3QgNCBjaGFyYWN0ZXJzIG91cnNlbHZlcy4gV2UgZmlyc3QgYXR0ZW1wdCB0byBtYXRjaGluZyBhZ2FpbnN0XG4vLyB0aGVzZSwgYW5kIGJlY2F1c2UgJ3ByZWZpeCBleHByZXNzaW9uJyByZWdleCBxdWVyaWVzIGRvIHVzZSBpbmRleGVzIChzZWVcbi8vIGh0dHA6Ly9kb2NzLm1vbmdvZGIub3JnL3YyLjYvcmVmZXJlbmNlL29wZXJhdG9yL3F1ZXJ5L3JlZ2V4LyNpbmRleC11c2UpLFxuLy8gdGhpcyBoYXMgYmVlbiBmb3VuZCB0byBncmVhdGx5IGltcHJvdmUgcGVyZm9ybWFuY2UgKGZyb20gMTIwMG1zIHRvIDVtcyBpbiBhXG4vLyB0ZXN0IHdpdGggMS4wMDAuMDAwIHVzZXJzKS5cbmNvbnN0IHNlbGVjdG9yRm9yRmFzdENhc2VJbnNlbnNpdGl2ZUxvb2t1cCA9IChmaWVsZE5hbWUsIHN0cmluZykgPT4ge1xuICAvLyBQZXJmb3JtYW5jZSBzZWVtcyB0byBpbXByb3ZlIHVwIHRvIDQgcHJlZml4IGNoYXJhY3RlcnNcbiAgY29uc3QgcHJlZml4ID0gc3RyaW5nLnN1YnN0cmluZygwLCBNYXRoLm1pbihzdHJpbmcubGVuZ3RoLCA0KSk7XG4gIGNvbnN0IG9yQ2xhdXNlID0gZ2VuZXJhdGVDYXNlUGVybXV0YXRpb25zRm9yU3RyaW5nKHByZWZpeCkubWFwKFxuICAgIHByZWZpeFBlcm11dGF0aW9uID0+IHtcbiAgICAgIGNvbnN0IHNlbGVjdG9yID0ge307XG4gICAgICBzZWxlY3RvcltmaWVsZE5hbWVdID1cbiAgICAgICAgbmV3IFJlZ0V4cChgXiR7TWV0ZW9yLl9lc2NhcGVSZWdFeHAocHJlZml4UGVybXV0YXRpb24pfWApO1xuICAgICAgcmV0dXJuIHNlbGVjdG9yO1xuICAgIH0pO1xuICBjb25zdCBjYXNlSW5zZW5zaXRpdmVDbGF1c2UgPSB7fTtcbiAgY2FzZUluc2Vuc2l0aXZlQ2xhdXNlW2ZpZWxkTmFtZV0gPVxuICAgIG5ldyBSZWdFeHAoYF4ke01ldGVvci5fZXNjYXBlUmVnRXhwKHN0cmluZyl9JGAsICdpJylcbiAgcmV0dXJuIHskYW5kOiBbeyRvcjogb3JDbGF1c2V9LCBjYXNlSW5zZW5zaXRpdmVDbGF1c2VdfTtcbn1cblxuLy8gR2VuZXJhdGVzIHBlcm11dGF0aW9ucyBvZiBhbGwgY2FzZSB2YXJpYXRpb25zIG9mIGEgZ2l2ZW4gc3RyaW5nLlxuY29uc3QgZ2VuZXJhdGVDYXNlUGVybXV0YXRpb25zRm9yU3RyaW5nID0gc3RyaW5nID0+IHtcbiAgbGV0IHBlcm11dGF0aW9ucyA9IFsnJ107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2ggPSBzdHJpbmcuY2hhckF0KGkpO1xuICAgIHBlcm11dGF0aW9ucyA9IFtdLmNvbmNhdCguLi4ocGVybXV0YXRpb25zLm1hcChwcmVmaXggPT4ge1xuICAgICAgY29uc3QgbG93ZXJDYXNlQ2hhciA9IGNoLnRvTG93ZXJDYXNlKCk7XG4gICAgICBjb25zdCB1cHBlckNhc2VDaGFyID0gY2gudG9VcHBlckNhc2UoKTtcbiAgICAgIC8vIERvbid0IGFkZCB1bm5lY2Nlc2FyeSBwZXJtdXRhdGlvbnMgd2hlbiBjaCBpcyBub3QgYSBsZXR0ZXJcbiAgICAgIGlmIChsb3dlckNhc2VDaGFyID09PSB1cHBlckNhc2VDaGFyKSB7XG4gICAgICAgIHJldHVybiBbcHJlZml4ICsgY2hdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFtwcmVmaXggKyBsb3dlckNhc2VDaGFyLCBwcmVmaXggKyB1cHBlckNhc2VDaGFyXTtcbiAgICAgIH1cbiAgICB9KSkpO1xuICB9XG4gIHJldHVybiBwZXJtdXRhdGlvbnM7XG59XG5cbmNvbnN0IGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcyA9IChmaWVsZE5hbWUsIGRpc3BsYXlOYW1lLCBmaWVsZFZhbHVlLCBvd25Vc2VySWQpID0+IHtcbiAgLy8gU29tZSB0ZXN0cyBuZWVkIHRoZSBhYmlsaXR5IHRvIGFkZCB1c2VycyB3aXRoIHRoZSBzYW1lIGNhc2UgaW5zZW5zaXRpdmVcbiAgLy8gdmFsdWUsIGhlbmNlIHRoZSBfc2tpcENhc2VJbnNlbnNpdGl2ZUNoZWNrc0ZvclRlc3QgY2hlY2tcbiAgY29uc3Qgc2tpcENoZWNrID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKEFjY291bnRzLl9za2lwQ2FzZUluc2Vuc2l0aXZlQ2hlY2tzRm9yVGVzdCwgZmllbGRWYWx1ZSk7XG5cbiAgaWYgKGZpZWxkVmFsdWUgJiYgIXNraXBDaGVjaykge1xuICAgIGNvbnN0IG1hdGNoZWRVc2VycyA9IE1ldGVvci51c2Vycy5maW5kKFxuICAgICAgc2VsZWN0b3JGb3JGYXN0Q2FzZUluc2Vuc2l0aXZlTG9va3VwKGZpZWxkTmFtZSwgZmllbGRWYWx1ZSksXG4gICAgICB7XG4gICAgICAgIGZpZWxkczoge19pZDogMX0sXG4gICAgICAgIC8vIHdlIG9ubHkgbmVlZCBhIG1heGltdW0gb2YgMiB1c2VycyBmb3IgdGhlIGxvZ2ljIGJlbG93IHRvIHdvcmtcbiAgICAgICAgbGltaXQ6IDIsXG4gICAgICB9XG4gICAgKS5mZXRjaCgpO1xuXG4gICAgaWYgKG1hdGNoZWRVc2Vycy5sZW5ndGggPiAwICYmXG4gICAgICAgIC8vIElmIHdlIGRvbid0IGhhdmUgYSB1c2VySWQgeWV0LCBhbnkgbWF0Y2ggd2UgZmluZCBpcyBhIGR1cGxpY2F0ZVxuICAgICAgICAoIW93blVzZXJJZCB8fFxuICAgICAgICAvLyBPdGhlcndpc2UsIGNoZWNrIHRvIHNlZSBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgbWF0Y2hlcyBvciBhIG1hdGNoXG4gICAgICAgIC8vIHRoYXQgaXMgbm90IHVzXG4gICAgICAgIChtYXRjaGVkVXNlcnMubGVuZ3RoID4gMSB8fCBtYXRjaGVkVXNlcnNbMF0uX2lkICE9PSBvd25Vc2VySWQpKSkge1xuICAgICAgaGFuZGxlRXJyb3IoYCR7ZGlzcGxheU5hbWV9IGFscmVhZHkgZXhpc3RzLmApO1xuICAgIH1cbiAgfVxufTtcblxuLy8gWFhYIG1heWJlIHRoaXMgYmVsb25ncyBpbiB0aGUgY2hlY2sgcGFja2FnZVxuY29uc3QgTm9uRW1wdHlTdHJpbmcgPSBNYXRjaC5XaGVyZSh4ID0+IHtcbiAgY2hlY2soeCwgU3RyaW5nKTtcbiAgcmV0dXJuIHgubGVuZ3RoID4gMDtcbn0pO1xuXG5jb25zdCB1c2VyUXVlcnlWYWxpZGF0b3IgPSBNYXRjaC5XaGVyZSh1c2VyID0+IHtcbiAgY2hlY2sodXNlciwge1xuICAgIGlkOiBNYXRjaC5PcHRpb25hbChOb25FbXB0eVN0cmluZyksXG4gICAgdXNlcm5hbWU6IE1hdGNoLk9wdGlvbmFsKE5vbkVtcHR5U3RyaW5nKSxcbiAgICBlbWFpbDogTWF0Y2guT3B0aW9uYWwoTm9uRW1wdHlTdHJpbmcpXG4gIH0pO1xuICBpZiAoT2JqZWN0LmtleXModXNlcikubGVuZ3RoICE9PSAxKVxuICAgIHRocm93IG5ldyBNYXRjaC5FcnJvcihcIlVzZXIgcHJvcGVydHkgbXVzdCBoYXZlIGV4YWN0bHkgb25lIGZpZWxkXCIpO1xuICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG5jb25zdCBwYXNzd29yZFZhbGlkYXRvciA9IE1hdGNoLk9uZU9mKFxuICBTdHJpbmcsXG4gIHsgZGlnZXN0OiBTdHJpbmcsIGFsZ29yaXRobTogU3RyaW5nIH1cbik7XG5cbi8vIEhhbmRsZXIgdG8gbG9naW4gd2l0aCBhIHBhc3N3b3JkLlxuLy9cbi8vIFRoZSBNZXRlb3IgY2xpZW50IHNldHMgb3B0aW9ucy5wYXNzd29yZCB0byBhbiBvYmplY3Qgd2l0aCBrZXlzXG4vLyAnZGlnZXN0JyAoc2V0IHRvIFNIQTI1NihwYXNzd29yZCkpIGFuZCAnYWxnb3JpdGhtJyAoXCJzaGEtMjU2XCIpLlxuLy9cbi8vIEZvciBvdGhlciBERFAgY2xpZW50cyB3aGljaCBkb24ndCBoYXZlIGFjY2VzcyB0byBTSEEsIHRoZSBoYW5kbGVyXG4vLyBhbHNvIGFjY2VwdHMgdGhlIHBsYWludGV4dCBwYXNzd29yZCBpbiBvcHRpb25zLnBhc3N3b3JkIGFzIGEgc3RyaW5nLlxuLy9cbi8vIChJdCBtaWdodCBiZSBuaWNlIGlmIHNlcnZlcnMgY291bGQgdHVybiB0aGUgcGxhaW50ZXh0IHBhc3N3b3JkXG4vLyBvcHRpb24gb2ZmLiBPciBtYXliZSBpdCBzaG91bGQgYmUgb3B0LWluLCBub3Qgb3B0LW91dD9cbi8vIEFjY291bnRzLmNvbmZpZyBvcHRpb24/KVxuLy9cbi8vIE5vdGUgdGhhdCBuZWl0aGVyIHBhc3N3b3JkIG9wdGlvbiBpcyBzZWN1cmUgd2l0aG91dCBTU0wuXG4vL1xuQWNjb3VudHMucmVnaXN0ZXJMb2dpbkhhbmRsZXIoXCJwYXNzd29yZFwiLCBvcHRpb25zID0+IHtcbiAgaWYgKCEgb3B0aW9ucy5wYXNzd29yZCB8fCBvcHRpb25zLnNycClcbiAgICByZXR1cm4gdW5kZWZpbmVkOyAvLyBkb24ndCBoYW5kbGVcblxuICBjaGVjayhvcHRpb25zLCB7XG4gICAgdXNlcjogdXNlclF1ZXJ5VmFsaWRhdG9yLFxuICAgIHBhc3N3b3JkOiBwYXNzd29yZFZhbGlkYXRvclxuICB9KTtcblxuXG4gIGNvbnN0IHVzZXIgPSBBY2NvdW50cy5fZmluZFVzZXJCeVF1ZXJ5KG9wdGlvbnMudXNlciwge2ZpZWxkczoge1xuICAgIHNlcnZpY2VzOiAxLFxuICAgIC4uLkFjY291bnRzLl9jaGVja1Bhc3N3b3JkVXNlckZpZWxkcyxcbiAgfX0pO1xuICBpZiAoIXVzZXIpIHtcbiAgICBoYW5kbGVFcnJvcihcIlVzZXIgbm90IGZvdW5kXCIpO1xuICB9XG5cbiAgaWYgKCF1c2VyLnNlcnZpY2VzIHx8ICF1c2VyLnNlcnZpY2VzLnBhc3N3b3JkIHx8XG4gICAgICAhKHVzZXIuc2VydmljZXMucGFzc3dvcmQuYmNyeXB0IHx8IHVzZXIuc2VydmljZXMucGFzc3dvcmQuc3JwKSkge1xuICAgIGhhbmRsZUVycm9yKFwiVXNlciBoYXMgbm8gcGFzc3dvcmQgc2V0XCIpO1xuICB9XG5cbiAgaWYgKCF1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCkge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5wYXNzd29yZCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgLy8gVGhlIGNsaWVudCBoYXMgcHJlc2VudGVkIGEgcGxhaW50ZXh0IHBhc3N3b3JkLCBhbmQgdGhlIHVzZXIgaXNcbiAgICAgIC8vIG5vdCB1cGdyYWRlZCB0byBiY3J5cHQgeWV0LiBXZSBkb24ndCBhdHRlbXB0IHRvIHRlbGwgdGhlIGNsaWVudFxuICAgICAgLy8gdG8gdXBncmFkZSB0byBiY3J5cHQsIGJlY2F1c2UgaXQgbWlnaHQgYmUgYSBzdGFuZGFsb25lIEREUFxuICAgICAgLy8gY2xpZW50IGRvZXNuJ3Qga25vdyBob3cgdG8gZG8gc3VjaCBhIHRoaW5nLlxuICAgICAgY29uc3QgdmVyaWZpZXIgPSB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycDtcbiAgICAgIGNvbnN0IG5ld1ZlcmlmaWVyID0gU1JQLmdlbmVyYXRlVmVyaWZpZXIob3B0aW9ucy5wYXNzd29yZCwge1xuICAgICAgICBpZGVudGl0eTogdmVyaWZpZXIuaWRlbnRpdHksIHNhbHQ6IHZlcmlmaWVyLnNhbHR9KTtcblxuICAgICAgaWYgKHZlcmlmaWVyLnZlcmlmaWVyICE9PSBuZXdWZXJpZmllci52ZXJpZmllcikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHVzZXJJZDogQWNjb3VudHMuX29wdGlvbnMuYW1iaWd1b3VzRXJyb3JNZXNzYWdlcyA/IG51bGwgOiB1c2VyLl9pZCxcbiAgICAgICAgICBlcnJvcjogaGFuZGxlRXJyb3IoXCJJbmNvcnJlY3QgcGFzc3dvcmRcIiwgZmFsc2UpXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7dXNlcklkOiB1c2VyLl9pZH07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRlbGwgdGhlIGNsaWVudCB0byB1c2UgdGhlIFNSUCB1cGdyYWRlIHByb2Nlc3MuXG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgXCJvbGQgcGFzc3dvcmQgZm9ybWF0XCIsIEVKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGZvcm1hdDogJ3NycCcsXG4gICAgICAgIGlkZW50aXR5OiB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycC5pZGVudGl0eVxuICAgICAgfSkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjaGVja1Bhc3N3b3JkKFxuICAgIHVzZXIsXG4gICAgb3B0aW9ucy5wYXNzd29yZFxuICApO1xufSk7XG5cbi8vIEhhbmRsZXIgdG8gbG9naW4gdXNpbmcgdGhlIFNSUCB1cGdyYWRlIHBhdGguIFRvIHVzZSB0aGlzIGxvZ2luXG4vLyBoYW5kbGVyLCB0aGUgY2xpZW50IG11c3QgcHJvdmlkZTpcbi8vICAgLSBzcnA6IEgoaWRlbnRpdHkgKyBcIjpcIiArIHBhc3N3b3JkKVxuLy8gICAtIHBhc3N3b3JkOiBhIHN0cmluZyBvciBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzICdkaWdlc3QnIGFuZCAnYWxnb3JpdGhtJ1xuLy9cbi8vIFdlIHVzZSBgb3B0aW9ucy5zcnBgIHRvIHZlcmlmeSB0aGF0IHRoZSBjbGllbnQga25vd3MgdGhlIGNvcnJlY3Rcbi8vIHBhc3N3b3JkIHdpdGhvdXQgZG9pbmcgYSBmdWxsIFNSUCBmbG93LiBPbmNlIHdlJ3ZlIGNoZWNrZWQgdGhhdCwgd2Vcbi8vIHVwZ3JhZGUgdGhlIHVzZXIgdG8gYmNyeXB0IGFuZCByZW1vdmUgdGhlIFNSUCBpbmZvcm1hdGlvbiBmcm9tIHRoZVxuLy8gdXNlciBkb2N1bWVudC5cbi8vXG4vLyBUaGUgY2xpZW50IGVuZHMgdXAgdXNpbmcgdGhpcyBsb2dpbiBoYW5kbGVyIGFmdGVyIHRyeWluZyB0aGUgbm9ybWFsXG4vLyBsb2dpbiBoYW5kbGVyIChhYm92ZSksIHdoaWNoIHRocm93cyBhbiBlcnJvciB0ZWxsaW5nIHRoZSBjbGllbnQgdG9cbi8vIHRyeSB0aGUgU1JQIHVwZ3JhZGUgcGF0aC5cbi8vXG4vLyBYWFggQ09NUEFUIFdJVEggMC44LjEuM1xuQWNjb3VudHMucmVnaXN0ZXJMb2dpbkhhbmRsZXIoXCJwYXNzd29yZFwiLCBvcHRpb25zID0+IHtcbiAgaWYgKCFvcHRpb25zLnNycCB8fCAhb3B0aW9ucy5wYXNzd29yZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7IC8vIGRvbid0IGhhbmRsZVxuICB9XG5cbiAgY2hlY2sob3B0aW9ucywge1xuICAgIHVzZXI6IHVzZXJRdWVyeVZhbGlkYXRvcixcbiAgICBzcnA6IFN0cmluZyxcbiAgICBwYXNzd29yZDogcGFzc3dvcmRWYWxpZGF0b3JcbiAgfSk7XG5cbiAgY29uc3QgdXNlciA9IEFjY291bnRzLl9maW5kVXNlckJ5UXVlcnkob3B0aW9ucy51c2VyLCB7ZmllbGRzOiB7XG4gICAgc2VydmljZXM6IDEsXG4gICAgLi4uQWNjb3VudHMuX2NoZWNrUGFzc3dvcmRVc2VyRmllbGRzLFxuICB9fSk7XG4gIGlmICghdXNlcikge1xuICAgIGhhbmRsZUVycm9yKFwiVXNlciBub3QgZm91bmRcIik7XG4gIH1cblxuICAvLyBDaGVjayB0byBzZWUgaWYgYW5vdGhlciBzaW11bHRhbmVvdXMgbG9naW4gaGFzIGFscmVhZHkgdXBncmFkZWRcbiAgLy8gdGhlIHVzZXIgcmVjb3JkIHRvIGJjcnlwdC5cbiAgaWYgKHVzZXIuc2VydmljZXMgJiYgdXNlci5zZXJ2aWNlcy5wYXNzd29yZCAmJiB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCkge1xuICAgIHJldHVybiBjaGVja1Bhc3N3b3JkKHVzZXIsIG9wdGlvbnMucGFzc3dvcmQpO1xuICB9XG5cbiAgaWYgKCEodXNlci5zZXJ2aWNlcyAmJiB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkICYmIHVzZXIuc2VydmljZXMucGFzc3dvcmQuc3JwKSkge1xuICAgIGhhbmRsZUVycm9yKFwiVXNlciBoYXMgbm8gcGFzc3dvcmQgc2V0XCIpO1xuICB9XG5cbiAgY29uc3QgdjEgPSB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycC52ZXJpZmllcjtcbiAgY29uc3QgdjIgPSBTUlAuZ2VuZXJhdGVWZXJpZmllcihcbiAgICBudWxsLFxuICAgIHtcbiAgICAgIGhhc2hlZElkZW50aXR5QW5kUGFzc3dvcmQ6IG9wdGlvbnMuc3JwLFxuICAgICAgc2FsdDogdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5zcnAuc2FsdFxuICAgIH1cbiAgKS52ZXJpZmllcjtcbiAgaWYgKHYxICE9PSB2Mikge1xuICAgIHJldHVybiB7XG4gICAgICB1c2VySWQ6IEFjY291bnRzLl9vcHRpb25zLmFtYmlndW91c0Vycm9yTWVzc2FnZXMgPyBudWxsIDogdXNlci5faWQsXG4gICAgICBlcnJvcjogaGFuZGxlRXJyb3IoXCJJbmNvcnJlY3QgcGFzc3dvcmRcIiwgZmFsc2UpXG4gICAgfTtcbiAgfVxuXG4gIC8vIFVwZ3JhZGUgdG8gYmNyeXB0IG9uIHN1Y2Nlc3NmdWwgbG9naW4uXG4gIGNvbnN0IHNhbHRlZCA9IGhhc2hQYXNzd29yZChvcHRpb25zLnBhc3N3b3JkKTtcbiAgTWV0ZW9yLnVzZXJzLnVwZGF0ZShcbiAgICB1c2VyLl9pZCxcbiAgICB7XG4gICAgICAkdW5zZXQ6IHsgJ3NlcnZpY2VzLnBhc3N3b3JkLnNycCc6IDEgfSxcbiAgICAgICRzZXQ6IHsgJ3NlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCc6IHNhbHRlZCB9XG4gICAgfVxuICApO1xuXG4gIHJldHVybiB7dXNlcklkOiB1c2VyLl9pZH07XG59KTtcblxuXG4vLy9cbi8vLyBDSEFOR0lOR1xuLy8vXG5cbi8qKlxuICogQHN1bW1hcnkgQ2hhbmdlIGEgdXNlcidzIHVzZXJuYW1lLiBVc2UgdGhpcyBpbnN0ZWFkIG9mIHVwZGF0aW5nIHRoZVxuICogZGF0YWJhc2UgZGlyZWN0bHkuIFRoZSBvcGVyYXRpb24gd2lsbCBmYWlsIGlmIHRoZXJlIGlzIGFuIGV4aXN0aW5nIHVzZXJcbiAqIHdpdGggYSB1c2VybmFtZSBvbmx5IGRpZmZlcmluZyBpbiBjYXNlLlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJJZCBUaGUgSUQgb2YgdGhlIHVzZXIgdG8gdXBkYXRlLlxuICogQHBhcmFtIHtTdHJpbmd9IG5ld1VzZXJuYW1lIEEgbmV3IHVzZXJuYW1lIGZvciB0aGUgdXNlci5cbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBhY2NvdW50cy1iYXNlXG4gKi9cbkFjY291bnRzLnNldFVzZXJuYW1lID0gKHVzZXJJZCwgbmV3VXNlcm5hbWUpID0+IHtcbiAgY2hlY2sodXNlcklkLCBOb25FbXB0eVN0cmluZyk7XG4gIGNoZWNrKG5ld1VzZXJuYW1lLCBOb25FbXB0eVN0cmluZyk7XG5cbiAgY29uc3QgdXNlciA9IGdldFVzZXJCeUlkKHVzZXJJZCwge2ZpZWxkczoge1xuICAgIHVzZXJuYW1lOiAxLFxuICB9fSk7XG4gIGlmICghdXNlcikge1xuICAgIGhhbmRsZUVycm9yKFwiVXNlciBub3QgZm91bmRcIik7XG4gIH1cblxuICBjb25zdCBvbGRVc2VybmFtZSA9IHVzZXIudXNlcm5hbWU7XG5cbiAgLy8gUGVyZm9ybSBhIGNhc2UgaW5zZW5zaXRpdmUgY2hlY2sgZm9yIGR1cGxpY2F0ZXMgYmVmb3JlIHVwZGF0ZVxuICBjaGVja0ZvckNhc2VJbnNlbnNpdGl2ZUR1cGxpY2F0ZXMoJ3VzZXJuYW1lJywgJ1VzZXJuYW1lJywgbmV3VXNlcm5hbWUsIHVzZXIuX2lkKTtcblxuICBNZXRlb3IudXNlcnMudXBkYXRlKHtfaWQ6IHVzZXIuX2lkfSwgeyRzZXQ6IHt1c2VybmFtZTogbmV3VXNlcm5hbWV9fSk7XG5cbiAgLy8gUGVyZm9ybSBhbm90aGVyIGNoZWNrIGFmdGVyIHVwZGF0ZSwgaW4gY2FzZSBhIG1hdGNoaW5nIHVzZXIgaGFzIGJlZW5cbiAgLy8gaW5zZXJ0ZWQgaW4gdGhlIG1lYW50aW1lXG4gIHRyeSB7XG4gICAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCd1c2VybmFtZScsICdVc2VybmFtZScsIG5ld1VzZXJuYW1lLCB1c2VyLl9pZCk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgLy8gVW5kbyB1cGRhdGUgaWYgdGhlIGNoZWNrIGZhaWxzXG4gICAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7X2lkOiB1c2VyLl9pZH0sIHskc2V0OiB7dXNlcm5hbWU6IG9sZFVzZXJuYW1lfX0pO1xuICAgIHRocm93IGV4O1xuICB9XG59O1xuXG4vLyBMZXQgdGhlIHVzZXIgY2hhbmdlIHRoZWlyIG93biBwYXNzd29yZCBpZiB0aGV5IGtub3cgdGhlIG9sZFxuLy8gcGFzc3dvcmQuIGBvbGRQYXNzd29yZGAgYW5kIGBuZXdQYXNzd29yZGAgc2hvdWxkIGJlIG9iamVjdHMgd2l0aCBrZXlzXG4vLyBgZGlnZXN0YCBhbmQgYGFsZ29yaXRobWAgKHJlcHJlc2VudGluZyB0aGUgU0hBMjU2IG9mIHRoZSBwYXNzd29yZCkuXG4vL1xuLy8gWFhYIENPTVBBVCBXSVRIIDAuOC4xLjNcbi8vIExpa2UgdGhlIGxvZ2luIG1ldGhvZCwgaWYgdGhlIHVzZXIgaGFzbid0IGJlZW4gdXBncmFkZWQgZnJvbSBTUlAgdG9cbi8vIGJjcnlwdCB5ZXQsIHRoZW4gdGhpcyBtZXRob2Qgd2lsbCB0aHJvdyBhbiAnb2xkIHBhc3N3b3JkIGZvcm1hdCdcbi8vIGVycm9yLiBUaGUgY2xpZW50IHNob3VsZCBjYWxsIHRoZSBTUlAgdXBncmFkZSBsb2dpbiBoYW5kbGVyIGFuZCB0aGVuXG4vLyByZXRyeSB0aGlzIG1ldGhvZCBhZ2Fpbi5cbi8vXG4vLyBVTkxJS0UgdGhlIGxvZ2luIG1ldGhvZCwgdGhlcmUgaXMgbm8gd2F5IHRvIGF2b2lkIGdldHRpbmcgU1JQIHVwZ3JhZGVcbi8vIGVycm9ycyB0aHJvd24uIFRoZSByZWFzb25pbmcgZm9yIHRoaXMgaXMgdGhhdCBjbGllbnRzIHVzaW5nIHRoaXNcbi8vIG1ldGhvZCBkaXJlY3RseSB3aWxsIG5lZWQgdG8gYmUgdXBkYXRlZCBhbnl3YXkgYmVjYXVzZSB3ZSBubyBsb25nZXJcbi8vIHN1cHBvcnQgdGhlIFNSUCBmbG93IHRoYXQgdGhleSB3b3VsZCBoYXZlIGJlZW4gZG9pbmcgdG8gdXNlIHRoaXNcbi8vIG1ldGhvZCBwcmV2aW91c2x5LlxuTWV0ZW9yLm1ldGhvZHMoe2NoYW5nZVBhc3N3b3JkOiBmdW5jdGlvbiAob2xkUGFzc3dvcmQsIG5ld1Bhc3N3b3JkKSB7XG4gIGNoZWNrKG9sZFBhc3N3b3JkLCBwYXNzd29yZFZhbGlkYXRvcik7XG4gIGNoZWNrKG5ld1Bhc3N3b3JkLCBwYXNzd29yZFZhbGlkYXRvcik7XG5cbiAgaWYgKCF0aGlzLnVzZXJJZCkge1xuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAxLCBcIk11c3QgYmUgbG9nZ2VkIGluXCIpO1xuICB9XG5cbiAgY29uc3QgdXNlciA9IGdldFVzZXJCeUlkKHRoaXMudXNlcklkLCB7ZmllbGRzOiB7XG4gICAgc2VydmljZXM6IDEsXG4gICAgLi4uQWNjb3VudHMuX2NoZWNrUGFzc3dvcmRVc2VyRmllbGRzLFxuICB9fSk7XG4gIGlmICghdXNlcikge1xuICAgIGhhbmRsZUVycm9yKFwiVXNlciBub3QgZm91bmRcIik7XG4gIH1cblxuICBpZiAoIXVzZXIuc2VydmljZXMgfHwgIXVzZXIuc2VydmljZXMucGFzc3dvcmQgfHxcbiAgICAgICghdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5iY3J5cHQgJiYgIXVzZXIuc2VydmljZXMucGFzc3dvcmQuc3JwKSkge1xuICAgIGhhbmRsZUVycm9yKFwiVXNlciBoYXMgbm8gcGFzc3dvcmQgc2V0XCIpO1xuICB9XG5cbiAgaWYgKCEgdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5iY3J5cHQpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgXCJvbGQgcGFzc3dvcmQgZm9ybWF0XCIsIEVKU09OLnN0cmluZ2lmeSh7XG4gICAgICBmb3JtYXQ6ICdzcnAnLFxuICAgICAgaWRlbnRpdHk6IHVzZXIuc2VydmljZXMucGFzc3dvcmQuc3JwLmlkZW50aXR5XG4gICAgfSkpO1xuICB9XG5cbiAgY29uc3QgcmVzdWx0ID0gY2hlY2tQYXNzd29yZCh1c2VyLCBvbGRQYXNzd29yZCk7XG4gIGlmIChyZXN1bHQuZXJyb3IpIHtcbiAgICB0aHJvdyByZXN1bHQuZXJyb3I7XG4gIH1cblxuICBjb25zdCBoYXNoZWQgPSBoYXNoUGFzc3dvcmQobmV3UGFzc3dvcmQpO1xuXG4gIC8vIEl0IHdvdWxkIGJlIGJldHRlciBpZiB0aGlzIHJlbW92ZWQgQUxMIGV4aXN0aW5nIHRva2VucyBhbmQgcmVwbGFjZWRcbiAgLy8gdGhlIHRva2VuIGZvciB0aGUgY3VycmVudCBjb25uZWN0aW9uIHdpdGggYSBuZXcgb25lLCBidXQgdGhhdCB3b3VsZFxuICAvLyBiZSB0cmlja3ksIHNvIHdlJ2xsIHNldHRsZSBmb3IganVzdCByZXBsYWNpbmcgYWxsIHRva2VucyBvdGhlciB0aGFuXG4gIC8vIHRoZSBvbmUgZm9yIHRoZSBjdXJyZW50IGNvbm5lY3Rpb24uXG4gIGNvbnN0IGN1cnJlbnRUb2tlbiA9IEFjY291bnRzLl9nZXRMb2dpblRva2VuKHRoaXMuY29ubmVjdGlvbi5pZCk7XG4gIE1ldGVvci51c2Vycy51cGRhdGUoXG4gICAgeyBfaWQ6IHRoaXMudXNlcklkIH0sXG4gICAge1xuICAgICAgJHNldDogeyAnc2VydmljZXMucGFzc3dvcmQuYmNyeXB0JzogaGFzaGVkIH0sXG4gICAgICAkcHVsbDoge1xuICAgICAgICAnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zJzogeyBoYXNoZWRUb2tlbjogeyAkbmU6IGN1cnJlbnRUb2tlbiB9IH1cbiAgICAgIH0sXG4gICAgICAkdW5zZXQ6IHsgJ3NlcnZpY2VzLnBhc3N3b3JkLnJlc2V0JzogMSB9XG4gICAgfVxuICApO1xuXG4gIHJldHVybiB7cGFzc3dvcmRDaGFuZ2VkOiB0cnVlfTtcbn19KTtcblxuXG4vLyBGb3JjZSBjaGFuZ2UgdGhlIHVzZXJzIHBhc3N3b3JkLlxuXG4vKipcbiAqIEBzdW1tYXJ5IEZvcmNpYmx5IGNoYW5nZSB0aGUgcGFzc3dvcmQgZm9yIGEgdXNlci5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VySWQgVGhlIGlkIG9mIHRoZSB1c2VyIHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuZXdQYXNzd29yZCBBIG5ldyBwYXNzd29yZCBmb3IgdGhlIHVzZXIuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucy5sb2dvdXQgTG9nb3V0IGFsbCBjdXJyZW50IGNvbm5lY3Rpb25zIHdpdGggdGhpcyB1c2VySWQgKGRlZmF1bHQ6IHRydWUpXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5zZXRQYXNzd29yZCA9ICh1c2VySWQsIG5ld1BsYWludGV4dFBhc3N3b3JkLCBvcHRpb25zKSA9PiB7XG4gIG9wdGlvbnMgPSB7IGxvZ291dDogdHJ1ZSAsIC4uLm9wdGlvbnMgfTtcblxuICBjb25zdCB1c2VyID0gZ2V0VXNlckJ5SWQodXNlcklkLCB7ZmllbGRzOiB7X2lkOiAxfX0pO1xuICBpZiAoIXVzZXIpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJVc2VyIG5vdCBmb3VuZFwiKTtcbiAgfVxuXG4gIGNvbnN0IHVwZGF0ZSA9IHtcbiAgICAkdW5zZXQ6IHtcbiAgICAgICdzZXJ2aWNlcy5wYXNzd29yZC5zcnAnOiAxLCAvLyBYWFggQ09NUEFUIFdJVEggMC44LjEuM1xuICAgICAgJ3NlcnZpY2VzLnBhc3N3b3JkLnJlc2V0JzogMVxuICAgIH0sXG4gICAgJHNldDogeydzZXJ2aWNlcy5wYXNzd29yZC5iY3J5cHQnOiBoYXNoUGFzc3dvcmQobmV3UGxhaW50ZXh0UGFzc3dvcmQpfVxuICB9O1xuXG4gIGlmIChvcHRpb25zLmxvZ291dCkge1xuICAgIHVwZGF0ZS4kdW5zZXRbJ3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2VucyddID0gMTtcbiAgfVxuXG4gIE1ldGVvci51c2Vycy51cGRhdGUoe19pZDogdXNlci5faWR9LCB1cGRhdGUpO1xufTtcblxuXG4vLy9cbi8vLyBSRVNFVFRJTkcgVklBIEVNQUlMXG4vLy9cblxuLy8gVXRpbGl0eSBmb3IgcGx1Y2tpbmcgYWRkcmVzc2VzIGZyb20gZW1haWxzXG5jb25zdCBwbHVja0FkZHJlc3NlcyA9IChlbWFpbHMgPSBbXSkgPT4gZW1haWxzLm1hcChlbWFpbCA9PiBlbWFpbC5hZGRyZXNzKTtcblxuLy8gTWV0aG9kIGNhbGxlZCBieSBhIHVzZXIgdG8gcmVxdWVzdCBhIHBhc3N3b3JkIHJlc2V0IGVtYWlsLiBUaGlzIGlzXG4vLyB0aGUgc3RhcnQgb2YgdGhlIHJlc2V0IHByb2Nlc3MuXG5NZXRlb3IubWV0aG9kcyh7Zm9yZ290UGFzc3dvcmQ6IG9wdGlvbnMgPT4ge1xuICBjaGVjayhvcHRpb25zLCB7ZW1haWw6IFN0cmluZ30pO1xuXG4gIGNvbnN0IHVzZXIgPSBBY2NvdW50cy5maW5kVXNlckJ5RW1haWwob3B0aW9ucy5lbWFpbCwge2ZpZWxkczoge2VtYWlsczogMX19KTtcbiAgaWYgKCF1c2VyKSB7XG4gICAgaGFuZGxlRXJyb3IoXCJVc2VyIG5vdCBmb3VuZFwiKTtcbiAgfVxuXG4gIGNvbnN0IGVtYWlscyA9IHBsdWNrQWRkcmVzc2VzKHVzZXIuZW1haWxzKTtcbiAgY29uc3QgY2FzZVNlbnNpdGl2ZUVtYWlsID0gZW1haWxzLmZpbmQoXG4gICAgZW1haWwgPT4gZW1haWwudG9Mb3dlckNhc2UoKSA9PT0gb3B0aW9ucy5lbWFpbC50b0xvd2VyQ2FzZSgpXG4gICk7XG5cbiAgQWNjb3VudHMuc2VuZFJlc2V0UGFzc3dvcmRFbWFpbCh1c2VyLl9pZCwgY2FzZVNlbnNpdGl2ZUVtYWlsKTtcbn19KTtcblxuLyoqXG4gKiBAc3VtbWFyeSBHZW5lcmF0ZXMgYSByZXNldCB0b2tlbiBhbmQgc2F2ZXMgaXQgaW50byB0aGUgZGF0YWJhc2UuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBpZCBvZiB0aGUgdXNlciB0byBnZW5lcmF0ZSB0aGUgcmVzZXQgdG9rZW4gZm9yLlxuICogQHBhcmFtIHtTdHJpbmd9IGVtYWlsIFdoaWNoIGFkZHJlc3Mgb2YgdGhlIHVzZXIgdG8gZ2VuZXJhdGUgdGhlIHJlc2V0IHRva2VuIGZvci4gVGhpcyBhZGRyZXNzIG11c3QgYmUgaW4gdGhlIHVzZXIncyBgZW1haWxzYCBsaXN0LiBJZiBgbnVsbGAsIGRlZmF1bHRzIHRvIHRoZSBmaXJzdCBlbWFpbCBpbiB0aGUgbGlzdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSByZWFzb24gYHJlc2V0UGFzc3dvcmRgIG9yIGBlbnJvbGxBY2NvdW50YC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbZXh0cmFUb2tlbkRhdGFdIE9wdGlvbmFsIGFkZGl0aW9uYWwgZGF0YSB0byBiZSBhZGRlZCBpbnRvIHRoZSB0b2tlbiByZWNvcmQuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB7ZW1haWwsIHVzZXIsIHRva2VufSB2YWx1ZXMuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5nZW5lcmF0ZVJlc2V0VG9rZW4gPSAodXNlcklkLCBlbWFpbCwgcmVhc29uLCBleHRyYVRva2VuRGF0YSkgPT4ge1xuICAvLyBNYWtlIHN1cmUgdGhlIHVzZXIgZXhpc3RzLCBhbmQgZW1haWwgaXMgb25lIG9mIHRoZWlyIGFkZHJlc3Nlcy5cbiAgLy8gRG9uJ3QgbGltaXQgdGhlIGZpZWxkcyBpbiB0aGUgdXNlciBvYmplY3Qgc2luY2UgdGhlIHVzZXIgaXMgcmV0dXJuZWRcbiAgLy8gYnkgdGhlIGZ1bmN0aW9uIGFuZCBzb21lIG90aGVyIGZpZWxkcyBtaWdodCBiZSB1c2VkIGVsc2V3aGVyZS5cbiAgY29uc3QgdXNlciA9IGdldFVzZXJCeUlkKHVzZXJJZCk7XG4gIGlmICghdXNlcikge1xuICAgIGhhbmRsZUVycm9yKFwiQ2FuJ3QgZmluZCB1c2VyXCIpO1xuICB9XG5cbiAgLy8gcGljayB0aGUgZmlyc3QgZW1haWwgaWYgd2Ugd2VyZW4ndCBwYXNzZWQgYW4gZW1haWwuXG4gIGlmICghZW1haWwgJiYgdXNlci5lbWFpbHMgJiYgdXNlci5lbWFpbHNbMF0pIHtcbiAgICBlbWFpbCA9IHVzZXIuZW1haWxzWzBdLmFkZHJlc3M7XG4gIH1cblxuICAvLyBtYWtlIHN1cmUgd2UgaGF2ZSBhIHZhbGlkIGVtYWlsXG4gIGlmICghZW1haWwgfHxcbiAgICAhKHBsdWNrQWRkcmVzc2VzKHVzZXIuZW1haWxzKS5pbmNsdWRlcyhlbWFpbCkpKSB7XG4gICAgaGFuZGxlRXJyb3IoXCJObyBzdWNoIGVtYWlsIGZvciB1c2VyLlwiKTtcbiAgfVxuXG4gIGNvbnN0IHRva2VuID0gUmFuZG9tLnNlY3JldCgpO1xuICBjb25zdCB0b2tlblJlY29yZCA9IHtcbiAgICB0b2tlbixcbiAgICBlbWFpbCxcbiAgICB3aGVuOiBuZXcgRGF0ZSgpXG4gIH07XG5cbiAgaWYgKHJlYXNvbiA9PT0gJ3Jlc2V0UGFzc3dvcmQnKSB7XG4gICAgdG9rZW5SZWNvcmQucmVhc29uID0gJ3Jlc2V0JztcbiAgfSBlbHNlIGlmIChyZWFzb24gPT09ICdlbnJvbGxBY2NvdW50Jykge1xuICAgIHRva2VuUmVjb3JkLnJlYXNvbiA9ICdlbnJvbGwnO1xuICB9IGVsc2UgaWYgKHJlYXNvbikge1xuICAgIC8vIGZhbGxiYWNrIHNvIHRoYXQgdGhpcyBmdW5jdGlvbiBjYW4gYmUgdXNlZCBmb3IgdW5rbm93biByZWFzb25zIGFzIHdlbGxcbiAgICB0b2tlblJlY29yZC5yZWFzb24gPSByZWFzb247XG4gIH1cblxuICBpZiAoZXh0cmFUb2tlbkRhdGEpIHtcbiAgICBPYmplY3QuYXNzaWduKHRva2VuUmVjb3JkLCBleHRyYVRva2VuRGF0YSk7XG4gIH1cblxuICBNZXRlb3IudXNlcnMudXBkYXRlKHtfaWQ6IHVzZXIuX2lkfSwgeyRzZXQ6IHtcbiAgICAnc2VydmljZXMucGFzc3dvcmQucmVzZXQnOiB0b2tlblJlY29yZFxuICB9fSk7XG5cbiAgLy8gYmVmb3JlIHBhc3NpbmcgdG8gdGVtcGxhdGUsIHVwZGF0ZSB1c2VyIG9iamVjdCB3aXRoIG5ldyB0b2tlblxuICBNZXRlb3IuX2Vuc3VyZSh1c2VyLCAnc2VydmljZXMnLCAncGFzc3dvcmQnKS5yZXNldCA9IHRva2VuUmVjb3JkO1xuXG4gIHJldHVybiB7ZW1haWwsIHVzZXIsIHRva2VufTtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgR2VuZXJhdGVzIGFuIGUtbWFpbCB2ZXJpZmljYXRpb24gdG9rZW4gYW5kIHNhdmVzIGl0IGludG8gdGhlIGRhdGFiYXNlLlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJJZCBUaGUgaWQgb2YgdGhlIHVzZXIgdG8gZ2VuZXJhdGUgdGhlICBlLW1haWwgdmVyaWZpY2F0aW9uIHRva2VuIGZvci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBlbWFpbCBXaGljaCBhZGRyZXNzIG9mIHRoZSB1c2VyIHRvIGdlbmVyYXRlIHRoZSBlLW1haWwgdmVyaWZpY2F0aW9uIHRva2VuIGZvci4gVGhpcyBhZGRyZXNzIG11c3QgYmUgaW4gdGhlIHVzZXIncyBgZW1haWxzYCBsaXN0LiBJZiBgbnVsbGAsIGRlZmF1bHRzIHRvIHRoZSBmaXJzdCB1bnZlcmlmaWVkIGVtYWlsIGluIHRoZSBsaXN0LlxuICogQHBhcmFtIHtPYmplY3R9IFtleHRyYVRva2VuRGF0YV0gT3B0aW9uYWwgYWRkaXRpb25hbCBkYXRhIHRvIGJlIGFkZGVkIGludG8gdGhlIHRva2VuIHJlY29yZC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHtlbWFpbCwgdXNlciwgdG9rZW59IHZhbHVlcy5cbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBhY2NvdW50cy1iYXNlXG4gKi9cbkFjY291bnRzLmdlbmVyYXRlVmVyaWZpY2F0aW9uVG9rZW4gPSAodXNlcklkLCBlbWFpbCwgZXh0cmFUb2tlbkRhdGEpID0+IHtcbiAgLy8gTWFrZSBzdXJlIHRoZSB1c2VyIGV4aXN0cywgYW5kIGVtYWlsIGlzIG9uZSBvZiB0aGVpciBhZGRyZXNzZXMuXG4gIC8vIERvbid0IGxpbWl0IHRoZSBmaWVsZHMgaW4gdGhlIHVzZXIgb2JqZWN0IHNpbmNlIHRoZSB1c2VyIGlzIHJldHVybmVkXG4gIC8vIGJ5IHRoZSBmdW5jdGlvbiBhbmQgc29tZSBvdGhlciBmaWVsZHMgbWlnaHQgYmUgdXNlZCBlbHNld2hlcmUuXG4gIGNvbnN0IHVzZXIgPSBnZXRVc2VyQnlJZCh1c2VySWQpO1xuICBpZiAoIXVzZXIpIHtcbiAgICBoYW5kbGVFcnJvcihcIkNhbid0IGZpbmQgdXNlclwiKTtcbiAgfVxuXG4gIC8vIHBpY2sgdGhlIGZpcnN0IHVudmVyaWZpZWQgZW1haWwgaWYgd2Ugd2VyZW4ndCBwYXNzZWQgYW4gZW1haWwuXG4gIGlmICghZW1haWwpIHtcbiAgICBjb25zdCBlbWFpbFJlY29yZCA9ICh1c2VyLmVtYWlscyB8fCBbXSkuZmluZChlID0+ICFlLnZlcmlmaWVkKTtcbiAgICBlbWFpbCA9IChlbWFpbFJlY29yZCB8fCB7fSkuYWRkcmVzcztcblxuICAgIGlmICghZW1haWwpIHtcbiAgICAgIGhhbmRsZUVycm9yKFwiVGhhdCB1c2VyIGhhcyBubyB1bnZlcmlmaWVkIGVtYWlsIGFkZHJlc3Nlcy5cIik7XG4gICAgfVxuICB9XG5cbiAgLy8gbWFrZSBzdXJlIHdlIGhhdmUgYSB2YWxpZCBlbWFpbFxuICBpZiAoIWVtYWlsIHx8XG4gICAgIShwbHVja0FkZHJlc3Nlcyh1c2VyLmVtYWlscykuaW5jbHVkZXMoZW1haWwpKSkge1xuICAgIGhhbmRsZUVycm9yKFwiTm8gc3VjaCBlbWFpbCBmb3IgdXNlci5cIik7XG4gIH1cblxuICBjb25zdCB0b2tlbiA9IFJhbmRvbS5zZWNyZXQoKTtcbiAgY29uc3QgdG9rZW5SZWNvcmQgPSB7XG4gICAgdG9rZW4sXG4gICAgLy8gVE9ETzogVGhpcyBzaG91bGQgcHJvYmFibHkgYmUgcmVuYW1lZCB0byBcImVtYWlsXCIgdG8gbWF0Y2ggcmVzZXQgdG9rZW4gcmVjb3JkLlxuICAgIGFkZHJlc3M6IGVtYWlsLFxuICAgIHdoZW46IG5ldyBEYXRlKClcbiAgfTtcblxuICBpZiAoZXh0cmFUb2tlbkRhdGEpIHtcbiAgICBPYmplY3QuYXNzaWduKHRva2VuUmVjb3JkLCBleHRyYVRva2VuRGF0YSk7XG4gIH1cblxuICBNZXRlb3IudXNlcnMudXBkYXRlKHtfaWQ6IHVzZXIuX2lkfSwgeyRwdXNoOiB7XG4gICAgJ3NlcnZpY2VzLmVtYWlsLnZlcmlmaWNhdGlvblRva2Vucyc6IHRva2VuUmVjb3JkXG4gIH19KTtcblxuICAvLyBiZWZvcmUgcGFzc2luZyB0byB0ZW1wbGF0ZSwgdXBkYXRlIHVzZXIgb2JqZWN0IHdpdGggbmV3IHRva2VuXG4gIE1ldGVvci5fZW5zdXJlKHVzZXIsICdzZXJ2aWNlcycsICdlbWFpbCcpO1xuICBpZiAoIXVzZXIuc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zKSB7XG4gICAgdXNlci5zZXJ2aWNlcy5lbWFpbC52ZXJpZmljYXRpb25Ub2tlbnMgPSBbXTtcbiAgfVxuICB1c2VyLnNlcnZpY2VzLmVtYWlsLnZlcmlmaWNhdGlvblRva2Vucy5wdXNoKHRva2VuUmVjb3JkKTtcblxuICByZXR1cm4ge2VtYWlsLCB1c2VyLCB0b2tlbn07XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IENyZWF0ZXMgb3B0aW9ucyBmb3IgZW1haWwgc2VuZGluZyBmb3IgcmVzZXQgcGFzc3dvcmQgYW5kIGVucm9sbCBhY2NvdW50IGVtYWlscy5cbiAqIFlvdSBjYW4gdXNlIHRoaXMgZnVuY3Rpb24gd2hlbiBjdXN0b21pemluZyBhIHJlc2V0IHBhc3N3b3JkIG9yIGVucm9sbCBhY2NvdW50IGVtYWlsIHNlbmRpbmcuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge09iamVjdH0gZW1haWwgV2hpY2ggYWRkcmVzcyBvZiB0aGUgdXNlcidzIHRvIHNlbmQgdGhlIGVtYWlsIHRvLlxuICogQHBhcmFtIHtPYmplY3R9IHVzZXIgVGhlIHVzZXIgb2JqZWN0IHRvIGdlbmVyYXRlIG9wdGlvbnMgZm9yLlxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBVUkwgdG8gd2hpY2ggdXNlciBpcyBkaXJlY3RlZCB0byBjb25maXJtIHRoZSBlbWFpbC5cbiAqIEBwYXJhbSB7U3RyaW5nfSByZWFzb24gYHJlc2V0UGFzc3dvcmRgIG9yIGBlbnJvbGxBY2NvdW50YC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IE9wdGlvbnMgd2hpY2ggY2FuIGJlIHBhc3NlZCB0byBgRW1haWwuc2VuZGAuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5nZW5lcmF0ZU9wdGlvbnNGb3JFbWFpbCA9IChlbWFpbCwgdXNlciwgdXJsLCByZWFzb24pID0+IHtcbiAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICB0bzogZW1haWwsXG4gICAgZnJvbTogQWNjb3VudHMuZW1haWxUZW1wbGF0ZXNbcmVhc29uXS5mcm9tXG4gICAgICA/IEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0uZnJvbSh1c2VyKVxuICAgICAgOiBBY2NvdW50cy5lbWFpbFRlbXBsYXRlcy5mcm9tLFxuICAgIHN1YmplY3Q6IEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0uc3ViamVjdCh1c2VyKVxuICB9O1xuXG4gIGlmICh0eXBlb2YgQWNjb3VudHMuZW1haWxUZW1wbGF0ZXNbcmVhc29uXS50ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgb3B0aW9ucy50ZXh0ID0gQWNjb3VudHMuZW1haWxUZW1wbGF0ZXNbcmVhc29uXS50ZXh0KHVzZXIsIHVybCk7XG4gIH1cblxuICBpZiAodHlwZW9mIEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0uaHRtbCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIG9wdGlvbnMuaHRtbCA9IEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0uaHRtbCh1c2VyLCB1cmwpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBBY2NvdW50cy5lbWFpbFRlbXBsYXRlcy5oZWFkZXJzID09PSAnb2JqZWN0Jykge1xuICAgIG9wdGlvbnMuaGVhZGVycyA9IEFjY291bnRzLmVtYWlsVGVtcGxhdGVzLmhlYWRlcnM7XG4gIH1cblxuICByZXR1cm4gb3B0aW9ucztcbn07XG5cbi8vIHNlbmQgdGhlIHVzZXIgYW4gZW1haWwgd2l0aCBhIGxpbmsgdGhhdCB3aGVuIG9wZW5lZCBhbGxvd3MgdGhlIHVzZXJcbi8vIHRvIHNldCBhIG5ldyBwYXNzd29yZCwgd2l0aG91dCB0aGUgb2xkIHBhc3N3b3JkLlxuXG4vKipcbiAqIEBzdW1tYXJ5IFNlbmQgYW4gZW1haWwgd2l0aCBhIGxpbmsgdGhlIHVzZXIgY2FuIHVzZSB0byByZXNldCB0aGVpciBwYXNzd29yZC5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VySWQgVGhlIGlkIG9mIHRoZSB1c2VyIHRvIHNlbmQgZW1haWwgdG8uXG4gKiBAcGFyYW0ge1N0cmluZ30gW2VtYWlsXSBPcHRpb25hbC4gV2hpY2ggYWRkcmVzcyBvZiB0aGUgdXNlcidzIHRvIHNlbmQgdGhlIGVtYWlsIHRvLiBUaGlzIGFkZHJlc3MgbXVzdCBiZSBpbiB0aGUgdXNlcidzIGBlbWFpbHNgIGxpc3QuIERlZmF1bHRzIHRvIHRoZSBmaXJzdCBlbWFpbCBpbiB0aGUgbGlzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbZXh0cmFUb2tlbkRhdGFdIE9wdGlvbmFsIGFkZGl0aW9uYWwgZGF0YSB0byBiZSBhZGRlZCBpbnRvIHRoZSB0b2tlbiByZWNvcmQuXG4gKiBAcGFyYW0ge09iamVjdH0gW2V4dHJhUGFyYW1zXSBPcHRpb25hbCBhZGRpdGlvbmFsIHBhcmFtcyB0byBiZSBhZGRlZCB0byB0aGUgcmVzZXQgdXJsLlxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGgge2VtYWlsLCB1c2VyLCB0b2tlbiwgdXJsLCBvcHRpb25zfSB2YWx1ZXMuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5zZW5kUmVzZXRQYXNzd29yZEVtYWlsID0gKHVzZXJJZCwgZW1haWwsIGV4dHJhVG9rZW5EYXRhLCBleHRyYVBhcmFtcykgPT4ge1xuICBjb25zdCB7ZW1haWw6IHJlYWxFbWFpbCwgdXNlciwgdG9rZW59ID1cbiAgICBBY2NvdW50cy5nZW5lcmF0ZVJlc2V0VG9rZW4odXNlcklkLCBlbWFpbCwgJ3Jlc2V0UGFzc3dvcmQnLCBleHRyYVRva2VuRGF0YSk7XG4gIGNvbnN0IHVybCA9IEFjY291bnRzLnVybHMucmVzZXRQYXNzd29yZCh0b2tlbiwgZXh0cmFQYXJhbXMpO1xuICBjb25zdCBvcHRpb25zID0gQWNjb3VudHMuZ2VuZXJhdGVPcHRpb25zRm9yRW1haWwocmVhbEVtYWlsLCB1c2VyLCB1cmwsICdyZXNldFBhc3N3b3JkJyk7XG4gIEVtYWlsLnNlbmQob3B0aW9ucyk7XG4gIGlmIChNZXRlb3IuaXNEZXZlbG9wbWVudCkge1xuICAgIGNvbnNvbGUubG9nKGBcXG5SZXNldCBwYXNzd29yZCBVUkw6ICR7dXJsfWApO1xuICB9XG4gIHJldHVybiB7ZW1haWw6IHJlYWxFbWFpbCwgdXNlciwgdG9rZW4sIHVybCwgb3B0aW9uc307XG59O1xuXG4vLyBzZW5kIHRoZSB1c2VyIGFuIGVtYWlsIGluZm9ybWluZyB0aGVtIHRoYXQgdGhlaXIgYWNjb3VudCB3YXMgY3JlYXRlZCwgd2l0aFxuLy8gYSBsaW5rIHRoYXQgd2hlbiBvcGVuZWQgYm90aCBtYXJrcyB0aGVpciBlbWFpbCBhcyB2ZXJpZmllZCBhbmQgZm9yY2VzIHRoZW1cbi8vIHRvIGNob29zZSB0aGVpciBwYXNzd29yZC4gVGhlIGVtYWlsIG11c3QgYmUgb25lIG9mIHRoZSBhZGRyZXNzZXMgaW4gdGhlXG4vLyB1c2VyJ3MgZW1haWxzIGZpZWxkLCBvciB1bmRlZmluZWQgdG8gcGljayB0aGUgZmlyc3QgZW1haWwgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUaGlzIGlzIG5vdCBjYWxsZWQgYXV0b21hdGljYWxseS4gSXQgbXVzdCBiZSBjYWxsZWQgbWFudWFsbHkgaWYgeW91XG4vLyB3YW50IHRvIHVzZSBlbnJvbGxtZW50IGVtYWlscy5cblxuLyoqXG4gKiBAc3VtbWFyeSBTZW5kIGFuIGVtYWlsIHdpdGggYSBsaW5rIHRoZSB1c2VyIGNhbiB1c2UgdG8gc2V0IHRoZWlyIGluaXRpYWwgcGFzc3dvcmQuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBpZCBvZiB0aGUgdXNlciB0byBzZW5kIGVtYWlsIHRvLlxuICogQHBhcmFtIHtTdHJpbmd9IFtlbWFpbF0gT3B0aW9uYWwuIFdoaWNoIGFkZHJlc3Mgb2YgdGhlIHVzZXIncyB0byBzZW5kIHRoZSBlbWFpbCB0by4gVGhpcyBhZGRyZXNzIG11c3QgYmUgaW4gdGhlIHVzZXIncyBgZW1haWxzYCBsaXN0LiBEZWZhdWx0cyB0byB0aGUgZmlyc3QgZW1haWwgaW4gdGhlIGxpc3QuXG4gKiBAcGFyYW0ge09iamVjdH0gW2V4dHJhVG9rZW5EYXRhXSBPcHRpb25hbCBhZGRpdGlvbmFsIGRhdGEgdG8gYmUgYWRkZWQgaW50byB0aGUgdG9rZW4gcmVjb3JkLlxuICogQHBhcmFtIHtPYmplY3R9IFtleHRyYVBhcmFtc10gT3B0aW9uYWwgYWRkaXRpb25hbCBwYXJhbXMgdG8gYmUgYWRkZWQgdG8gdGhlIGVucm9sbG1lbnQgdXJsLlxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGgge2VtYWlsLCB1c2VyLCB0b2tlbiwgdXJsLCBvcHRpb25zfSB2YWx1ZXMuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5zZW5kRW5yb2xsbWVudEVtYWlsID0gKHVzZXJJZCwgZW1haWwsIGV4dHJhVG9rZW5EYXRhLCBleHRyYVBhcmFtcykgPT4ge1xuICBjb25zdCB7ZW1haWw6IHJlYWxFbWFpbCwgdXNlciwgdG9rZW59ID1cbiAgICBBY2NvdW50cy5nZW5lcmF0ZVJlc2V0VG9rZW4odXNlcklkLCBlbWFpbCwgJ2Vucm9sbEFjY291bnQnLCBleHRyYVRva2VuRGF0YSk7XG4gIGNvbnN0IHVybCA9IEFjY291bnRzLnVybHMuZW5yb2xsQWNjb3VudCh0b2tlbiwgZXh0cmFQYXJhbXMpO1xuICBjb25zdCBvcHRpb25zID0gQWNjb3VudHMuZ2VuZXJhdGVPcHRpb25zRm9yRW1haWwocmVhbEVtYWlsLCB1c2VyLCB1cmwsICdlbnJvbGxBY2NvdW50Jyk7XG4gIEVtYWlsLnNlbmQob3B0aW9ucyk7XG4gIGlmIChNZXRlb3IuaXNEZXZlbG9wbWVudCkge1xuICAgIGNvbnNvbGUubG9nKGBcXG5FbnJvbGxtZW50IGVtYWlsIFVSTDogJHt1cmx9YCk7XG4gIH1cbiAgcmV0dXJuIHtlbWFpbDogcmVhbEVtYWlsLCB1c2VyLCB0b2tlbiwgdXJsLCBvcHRpb25zfTtcbn07XG5cblxuLy8gVGFrZSB0b2tlbiBmcm9tIHNlbmRSZXNldFBhc3N3b3JkRW1haWwgb3Igc2VuZEVucm9sbG1lbnRFbWFpbCwgY2hhbmdlXG4vLyB0aGUgdXNlcnMgcGFzc3dvcmQsIGFuZCBsb2cgdGhlbSBpbi5cbk1ldGVvci5tZXRob2RzKHtyZXNldFBhc3N3b3JkOiBmdW5jdGlvbiAoLi4uYXJncykge1xuICBjb25zdCB0b2tlbiA9IGFyZ3NbMF07XG4gIGNvbnN0IG5ld1Bhc3N3b3JkID0gYXJnc1sxXTtcbiAgcmV0dXJuIEFjY291bnRzLl9sb2dpbk1ldGhvZChcbiAgICB0aGlzLFxuICAgIFwicmVzZXRQYXNzd29yZFwiLFxuICAgIGFyZ3MsXG4gICAgXCJwYXNzd29yZFwiLFxuICAgICgpID0+IHtcbiAgICAgIGNoZWNrKHRva2VuLCBTdHJpbmcpO1xuICAgICAgY2hlY2sobmV3UGFzc3dvcmQsIHBhc3N3b3JkVmFsaWRhdG9yKTtcblxuICAgICAgY29uc3QgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKFxuICAgICAgICB7XCJzZXJ2aWNlcy5wYXNzd29yZC5yZXNldC50b2tlblwiOiB0b2tlbn0sXG4gICAgICAgIHtmaWVsZHM6IHtcbiAgICAgICAgICBzZXJ2aWNlczogMSxcbiAgICAgICAgICBlbWFpbHM6IDEsXG4gICAgICAgIH19XG4gICAgICApO1xuICAgICAgaWYgKCF1c2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlRva2VuIGV4cGlyZWRcIik7XG4gICAgICB9XG4gICAgICBjb25zdCB7IHdoZW4sIHJlYXNvbiwgZW1haWwgfSA9IHVzZXIuc2VydmljZXMucGFzc3dvcmQucmVzZXQ7XG4gICAgICBsZXQgdG9rZW5MaWZldGltZU1zID0gQWNjb3VudHMuX2dldFBhc3N3b3JkUmVzZXRUb2tlbkxpZmV0aW1lTXMoKTtcbiAgICAgIGlmIChyZWFzb24gPT09IFwiZW5yb2xsXCIpIHtcbiAgICAgICAgdG9rZW5MaWZldGltZU1zID0gQWNjb3VudHMuX2dldFBhc3N3b3JkRW5yb2xsVG9rZW5MaWZldGltZU1zKCk7XG4gICAgICB9XG4gICAgICBjb25zdCBjdXJyZW50VGltZU1zID0gRGF0ZS5ub3coKTtcbiAgICAgIGlmICgoY3VycmVudFRpbWVNcyAtIHdoZW4pID4gdG9rZW5MaWZldGltZU1zKVxuICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJUb2tlbiBleHBpcmVkXCIpO1xuICAgICAgaWYgKCEocGx1Y2tBZGRyZXNzZXModXNlci5lbWFpbHMpLmluY2x1ZGVzKGVtYWlsKSkpXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdXNlcklkOiB1c2VyLl9pZCxcbiAgICAgICAgICBlcnJvcjogbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVG9rZW4gaGFzIGludmFsaWQgZW1haWwgYWRkcmVzc1wiKVxuICAgICAgICB9O1xuXG4gICAgICBjb25zdCBoYXNoZWQgPSBoYXNoUGFzc3dvcmQobmV3UGFzc3dvcmQpO1xuXG4gICAgICAvLyBOT1RFOiBXZSdyZSBhYm91dCB0byBpbnZhbGlkYXRlIHRva2VucyBvbiB0aGUgdXNlciwgd2hvIHdlIG1pZ2h0IGJlXG4gICAgICAvLyBsb2dnZWQgaW4gYXMuIE1ha2Ugc3VyZSB0byBhdm9pZCBsb2dnaW5nIG91cnNlbHZlcyBvdXQgaWYgdGhpc1xuICAgICAgLy8gaGFwcGVucy4gQnV0IGFsc28gbWFrZSBzdXJlIG5vdCB0byBsZWF2ZSB0aGUgY29ubmVjdGlvbiBpbiBhIHN0YXRlXG4gICAgICAvLyBvZiBoYXZpbmcgYSBiYWQgdG9rZW4gc2V0IGlmIHRoaW5ncyBmYWlsLlxuICAgICAgY29uc3Qgb2xkVG9rZW4gPSBBY2NvdW50cy5fZ2V0TG9naW5Ub2tlbih0aGlzLmNvbm5lY3Rpb24uaWQpO1xuICAgICAgQWNjb3VudHMuX3NldExvZ2luVG9rZW4odXNlci5faWQsIHRoaXMuY29ubmVjdGlvbiwgbnVsbCk7XG4gICAgICBjb25zdCByZXNldFRvT2xkVG9rZW4gPSAoKSA9PlxuICAgICAgICBBY2NvdW50cy5fc2V0TG9naW5Ub2tlbih1c2VyLl9pZCwgdGhpcy5jb25uZWN0aW9uLCBvbGRUb2tlbik7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgdXNlciByZWNvcmQgYnk6XG4gICAgICAgIC8vIC0gQ2hhbmdpbmcgdGhlIHBhc3N3b3JkIHRvIHRoZSBuZXcgb25lXG4gICAgICAgIC8vIC0gRm9yZ2V0dGluZyBhYm91dCB0aGUgcmVzZXQgdG9rZW4gdGhhdCB3YXMganVzdCB1c2VkXG4gICAgICAgIC8vIC0gVmVyaWZ5aW5nIHRoZWlyIGVtYWlsLCBzaW5jZSB0aGV5IGdvdCB0aGUgcGFzc3dvcmQgcmVzZXQgdmlhIGVtYWlsLlxuICAgICAgICBjb25zdCBhZmZlY3RlZFJlY29yZHMgPSBNZXRlb3IudXNlcnMudXBkYXRlKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIF9pZDogdXNlci5faWQsXG4gICAgICAgICAgICAnZW1haWxzLmFkZHJlc3MnOiBlbWFpbCxcbiAgICAgICAgICAgICdzZXJ2aWNlcy5wYXNzd29yZC5yZXNldC50b2tlbic6IHRva2VuXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7JHNldDogeydzZXJ2aWNlcy5wYXNzd29yZC5iY3J5cHQnOiBoYXNoZWQsXG4gICAgICAgICAgICAgICAgICAnZW1haWxzLiQudmVyaWZpZWQnOiB0cnVlfSxcbiAgICAgICAgICAgJHVuc2V0OiB7J3NlcnZpY2VzLnBhc3N3b3JkLnJlc2V0JzogMSxcbiAgICAgICAgICAgICAgICAgICAgJ3NlcnZpY2VzLnBhc3N3b3JkLnNycCc6IDF9fSk7XG4gICAgICAgIGlmIChhZmZlY3RlZFJlY29yZHMgIT09IDEpXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHVzZXJJZDogdXNlci5faWQsXG4gICAgICAgICAgICBlcnJvcjogbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiSW52YWxpZCBlbWFpbFwiKVxuICAgICAgICAgIH07XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVzZXRUb09sZFRva2VuKCk7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cblxuICAgICAgLy8gUmVwbGFjZSBhbGwgdmFsaWQgbG9naW4gdG9rZW5zIHdpdGggbmV3IG9uZXMgKGNoYW5naW5nXG4gICAgICAvLyBwYXNzd29yZCBzaG91bGQgaW52YWxpZGF0ZSBleGlzdGluZyBzZXNzaW9ucykuXG4gICAgICBBY2NvdW50cy5fY2xlYXJBbGxMb2dpblRva2Vucyh1c2VyLl9pZCk7XG5cbiAgICAgIHJldHVybiB7dXNlcklkOiB1c2VyLl9pZH07XG4gICAgfVxuICApO1xufX0pO1xuXG4vLy9cbi8vLyBFTUFJTCBWRVJJRklDQVRJT05cbi8vL1xuXG5cbi8vIHNlbmQgdGhlIHVzZXIgYW4gZW1haWwgd2l0aCBhIGxpbmsgdGhhdCB3aGVuIG9wZW5lZCBtYXJrcyB0aGF0XG4vLyBhZGRyZXNzIGFzIHZlcmlmaWVkXG5cbi8qKlxuICogQHN1bW1hcnkgU2VuZCBhbiBlbWFpbCB3aXRoIGEgbGluayB0aGUgdXNlciBjYW4gdXNlIHZlcmlmeSB0aGVpciBlbWFpbCBhZGRyZXNzLlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJJZCBUaGUgaWQgb2YgdGhlIHVzZXIgdG8gc2VuZCBlbWFpbCB0by5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbZW1haWxdIE9wdGlvbmFsLiBXaGljaCBhZGRyZXNzIG9mIHRoZSB1c2VyJ3MgdG8gc2VuZCB0aGUgZW1haWwgdG8uIFRoaXMgYWRkcmVzcyBtdXN0IGJlIGluIHRoZSB1c2VyJ3MgYGVtYWlsc2AgbGlzdC4gRGVmYXVsdHMgdG8gdGhlIGZpcnN0IHVudmVyaWZpZWQgZW1haWwgaW4gdGhlIGxpc3QuXG4gKiBAcGFyYW0ge09iamVjdH0gW2V4dHJhVG9rZW5EYXRhXSBPcHRpb25hbCBhZGRpdGlvbmFsIGRhdGEgdG8gYmUgYWRkZWQgaW50byB0aGUgdG9rZW4gcmVjb3JkLlxuICogQHBhcmFtIHtPYmplY3R9IFtleHRyYVBhcmFtc10gT3B0aW9uYWwgYWRkaXRpb25hbCBwYXJhbXMgdG8gYmUgYWRkZWQgdG8gdGhlIHZlcmlmaWNhdGlvbiB1cmwuXG4gKlxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGgge2VtYWlsLCB1c2VyLCB0b2tlbiwgdXJsLCBvcHRpb25zfSB2YWx1ZXMuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5zZW5kVmVyaWZpY2F0aW9uRW1haWwgPSAodXNlcklkLCBlbWFpbCwgZXh0cmFUb2tlbkRhdGEsIGV4dHJhUGFyYW1zKSA9PiB7XG4gIC8vIFhYWCBBbHNvIGdlbmVyYXRlIGEgbGluayB1c2luZyB3aGljaCBzb21lb25lIGNhbiBkZWxldGUgdGhpc1xuICAvLyBhY2NvdW50IGlmIHRoZXkgb3duIHNhaWQgYWRkcmVzcyBidXQgd2VyZW4ndCB0aG9zZSB3aG8gY3JlYXRlZFxuICAvLyB0aGlzIGFjY291bnQuXG5cbiAgY29uc3Qge2VtYWlsOiByZWFsRW1haWwsIHVzZXIsIHRva2VufSA9XG4gICAgQWNjb3VudHMuZ2VuZXJhdGVWZXJpZmljYXRpb25Ub2tlbih1c2VySWQsIGVtYWlsLCBleHRyYVRva2VuRGF0YSk7XG4gIGNvbnN0IHVybCA9IEFjY291bnRzLnVybHMudmVyaWZ5RW1haWwodG9rZW4sIGV4dHJhUGFyYW1zKTtcbiAgY29uc3Qgb3B0aW9ucyA9IEFjY291bnRzLmdlbmVyYXRlT3B0aW9uc0ZvckVtYWlsKHJlYWxFbWFpbCwgdXNlciwgdXJsLCAndmVyaWZ5RW1haWwnKTtcbiAgRW1haWwuc2VuZChvcHRpb25zKTtcbiAgaWYgKE1ldGVvci5pc0RldmVsb3BtZW50KSB7XG4gICAgY29uc29sZS5sb2coYFxcblZlcmlmaWNhdGlvbiBlbWFpbCBVUkw6ICR7dXJsfWApO1xuICB9XG4gIHJldHVybiB7ZW1haWw6IHJlYWxFbWFpbCwgdXNlciwgdG9rZW4sIHVybCwgb3B0aW9uc307XG59O1xuXG4vLyBUYWtlIHRva2VuIGZyb20gc2VuZFZlcmlmaWNhdGlvbkVtYWlsLCBtYXJrIHRoZSBlbWFpbCBhcyB2ZXJpZmllZCxcbi8vIGFuZCBsb2cgdGhlbSBpbi5cbk1ldGVvci5tZXRob2RzKHt2ZXJpZnlFbWFpbDogZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgY29uc3QgdG9rZW4gPSBhcmdzWzBdO1xuICByZXR1cm4gQWNjb3VudHMuX2xvZ2luTWV0aG9kKFxuICAgIHRoaXMsXG4gICAgXCJ2ZXJpZnlFbWFpbFwiLFxuICAgIGFyZ3MsXG4gICAgXCJwYXNzd29yZFwiLFxuICAgICgpID0+IHtcbiAgICAgIGNoZWNrKHRva2VuLCBTdHJpbmcpO1xuXG4gICAgICBjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoXG4gICAgICAgIHsnc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zLnRva2VuJzogdG9rZW59LFxuICAgICAgICB7ZmllbGRzOiB7XG4gICAgICAgICAgc2VydmljZXM6IDEsXG4gICAgICAgICAgZW1haWxzOiAxLFxuICAgICAgICB9fVxuICAgICAgKTtcbiAgICAgIGlmICghdXNlcilcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVmVyaWZ5IGVtYWlsIGxpbmsgZXhwaXJlZFwiKTtcblxuICAgICAgICBjb25zdCB0b2tlblJlY29yZCA9IHVzZXIuc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zLmZpbmQoXG4gICAgICAgICAgdCA9PiB0LnRva2VuID09IHRva2VuXG4gICAgICAgICk7XG4gICAgICBpZiAoIXRva2VuUmVjb3JkKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHVzZXJJZDogdXNlci5faWQsXG4gICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlZlcmlmeSBlbWFpbCBsaW5rIGV4cGlyZWRcIilcbiAgICAgICAgfTtcblxuICAgICAgY29uc3QgZW1haWxzUmVjb3JkID0gdXNlci5lbWFpbHMuZmluZChcbiAgICAgICAgZSA9PiBlLmFkZHJlc3MgPT0gdG9rZW5SZWNvcmQuYWRkcmVzc1xuICAgICAgKTtcbiAgICAgIGlmICghZW1haWxzUmVjb3JkKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHVzZXJJZDogdXNlci5faWQsXG4gICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlZlcmlmeSBlbWFpbCBsaW5rIGlzIGZvciB1bmtub3duIGFkZHJlc3NcIilcbiAgICAgICAgfTtcblxuICAgICAgLy8gQnkgaW5jbHVkaW5nIHRoZSBhZGRyZXNzIGluIHRoZSBxdWVyeSwgd2UgY2FuIHVzZSAnZW1haWxzLiQnIGluIHRoZVxuICAgICAgLy8gbW9kaWZpZXIgdG8gZ2V0IGEgcmVmZXJlbmNlIHRvIHRoZSBzcGVjaWZpYyBvYmplY3QgaW4gdGhlIGVtYWlsc1xuICAgICAgLy8gYXJyYXkuIFNlZVxuICAgICAgLy8gaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvVXBkYXRpbmcvI1VwZGF0aW5nLVRoZSUyNHBvc2l0aW9uYWxvcGVyYXRvcilcbiAgICAgIC8vIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nI1VwZGF0aW5nLSUyNHB1bGxcbiAgICAgIE1ldGVvci51c2Vycy51cGRhdGUoXG4gICAgICAgIHtfaWQ6IHVzZXIuX2lkLFxuICAgICAgICAgJ2VtYWlscy5hZGRyZXNzJzogdG9rZW5SZWNvcmQuYWRkcmVzc30sXG4gICAgICAgIHskc2V0OiB7J2VtYWlscy4kLnZlcmlmaWVkJzogdHJ1ZX0sXG4gICAgICAgICAkcHVsbDogeydzZXJ2aWNlcy5lbWFpbC52ZXJpZmljYXRpb25Ub2tlbnMnOiB7YWRkcmVzczogdG9rZW5SZWNvcmQuYWRkcmVzc319fSk7XG5cbiAgICAgIHJldHVybiB7dXNlcklkOiB1c2VyLl9pZH07XG4gICAgfVxuICApO1xufX0pO1xuXG4vKipcbiAqIEBzdW1tYXJ5IEFkZCBhbiBlbWFpbCBhZGRyZXNzIGZvciBhIHVzZXIuIFVzZSB0aGlzIGluc3RlYWQgb2YgZGlyZWN0bHlcbiAqIHVwZGF0aW5nIHRoZSBkYXRhYmFzZS4gVGhlIG9wZXJhdGlvbiB3aWxsIGZhaWwgaWYgdGhlcmUgaXMgYSBkaWZmZXJlbnQgdXNlclxuICogd2l0aCBhbiBlbWFpbCBvbmx5IGRpZmZlcmluZyBpbiBjYXNlLiBJZiB0aGUgc3BlY2lmaWVkIHVzZXIgaGFzIGFuIGV4aXN0aW5nXG4gKiBlbWFpbCBvbmx5IGRpZmZlcmluZyBpbiBjYXNlIGhvd2V2ZXIsIHdlIHJlcGxhY2UgaXQuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBJRCBvZiB0aGUgdXNlciB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmV3RW1haWwgQSBuZXcgZW1haWwgYWRkcmVzcyBmb3IgdGhlIHVzZXIuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFt2ZXJpZmllZF0gT3B0aW9uYWwgLSB3aGV0aGVyIHRoZSBuZXcgZW1haWwgYWRkcmVzcyBzaG91bGRcbiAqIGJlIG1hcmtlZCBhcyB2ZXJpZmllZC4gRGVmYXVsdHMgdG8gZmFsc2UuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5hZGRFbWFpbCA9ICh1c2VySWQsIG5ld0VtYWlsLCB2ZXJpZmllZCkgPT4ge1xuICBjaGVjayh1c2VySWQsIE5vbkVtcHR5U3RyaW5nKTtcbiAgY2hlY2sobmV3RW1haWwsIE5vbkVtcHR5U3RyaW5nKTtcbiAgY2hlY2sodmVyaWZpZWQsIE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pKTtcblxuICBpZiAodmVyaWZpZWQgPT09IHZvaWQgMCkge1xuICAgIHZlcmlmaWVkID0gZmFsc2U7XG4gIH1cblxuICBjb25zdCB1c2VyID0gZ2V0VXNlckJ5SWQodXNlcklkLCB7ZmllbGRzOiB7ZW1haWxzOiAxfX0pO1xuICBpZiAoIXVzZXIpXG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVXNlciBub3QgZm91bmRcIik7XG5cbiAgLy8gQWxsb3cgdXNlcnMgdG8gY2hhbmdlIHRoZWlyIG93biBlbWFpbCB0byBhIHZlcnNpb24gd2l0aCBhIGRpZmZlcmVudCBjYXNlXG5cbiAgLy8gV2UgZG9uJ3QgaGF2ZSB0byBjYWxsIGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcyB0byBkbyBhIGNhc2VcbiAgLy8gaW5zZW5zaXRpdmUgY2hlY2sgYWNyb3NzIGFsbCBlbWFpbHMgaW4gdGhlIGRhdGFiYXNlIGhlcmUgYmVjYXVzZTogKDEpIGlmXG4gIC8vIHRoZXJlIGlzIG5vIGNhc2UtaW5zZW5zaXRpdmUgZHVwbGljYXRlIGJldHdlZW4gdGhpcyB1c2VyIGFuZCBvdGhlciB1c2VycyxcbiAgLy8gdGhlbiB3ZSBhcmUgT0sgYW5kICgyKSBpZiB0aGlzIHdvdWxkIGNyZWF0ZSBhIGNvbmZsaWN0IHdpdGggb3RoZXIgdXNlcnNcbiAgLy8gdGhlbiB0aGVyZSB3b3VsZCBhbHJlYWR5IGJlIGEgY2FzZS1pbnNlbnNpdGl2ZSBkdXBsaWNhdGUgYW5kIHdlIGNhbid0IGZpeFxuICAvLyB0aGF0IGluIHRoaXMgY29kZSBhbnl3YXkuXG4gIGNvbnN0IGNhc2VJbnNlbnNpdGl2ZVJlZ0V4cCA9XG4gICAgbmV3IFJlZ0V4cChgXiR7TWV0ZW9yLl9lc2NhcGVSZWdFeHAobmV3RW1haWwpfSRgLCAnaScpO1xuXG4gIGNvbnN0IGRpZFVwZGF0ZU93bkVtYWlsID0gKHVzZXIuZW1haWxzIHx8IFtdKS5yZWR1Y2UoXG4gICAgKHByZXYsIGVtYWlsKSA9PiB7XG4gICAgICBpZiAoY2FzZUluc2Vuc2l0aXZlUmVnRXhwLnRlc3QoZW1haWwuYWRkcmVzcykpIHtcbiAgICAgICAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7XG4gICAgICAgICAgX2lkOiB1c2VyLl9pZCxcbiAgICAgICAgICAnZW1haWxzLmFkZHJlc3MnOiBlbWFpbC5hZGRyZXNzXG4gICAgICAgIH0sIHskc2V0OiB7XG4gICAgICAgICAgJ2VtYWlscy4kLmFkZHJlc3MnOiBuZXdFbWFpbCxcbiAgICAgICAgICAnZW1haWxzLiQudmVyaWZpZWQnOiB2ZXJpZmllZFxuICAgICAgICB9fSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICB9XG4gICAgfSxcbiAgICBmYWxzZVxuICApO1xuXG4gIC8vIEluIHRoZSBvdGhlciB1cGRhdGVzIGJlbG93LCB3ZSBoYXZlIHRvIGRvIGFub3RoZXIgY2FsbCB0b1xuICAvLyBjaGVja0ZvckNhc2VJbnNlbnNpdGl2ZUR1cGxpY2F0ZXMgdG8gbWFrZSBzdXJlIHRoYXQgbm8gY29uZmxpY3RpbmcgdmFsdWVzXG4gIC8vIHdlcmUgYWRkZWQgdG8gdGhlIGRhdGFiYXNlIGluIHRoZSBtZWFudGltZS4gV2UgZG9uJ3QgaGF2ZSB0byBkbyB0aGlzIGZvclxuICAvLyB0aGUgY2FzZSB3aGVyZSB0aGUgdXNlciBpcyB1cGRhdGluZyB0aGVpciBlbWFpbCBhZGRyZXNzIHRvIG9uZSB0aGF0IGlzIHRoZVxuICAvLyBzYW1lIGFzIGJlZm9yZSwgYnV0IG9ubHkgZGlmZmVyZW50IGJlY2F1c2Ugb2YgY2FwaXRhbGl6YXRpb24uIFJlYWQgdGhlXG4gIC8vIGJpZyBjb21tZW50IGFib3ZlIHRvIHVuZGVyc3RhbmQgd2h5LlxuXG4gIGlmIChkaWRVcGRhdGVPd25FbWFpbCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFBlcmZvcm0gYSBjYXNlIGluc2Vuc2l0aXZlIGNoZWNrIGZvciBkdXBsaWNhdGVzIGJlZm9yZSB1cGRhdGVcbiAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCdlbWFpbHMuYWRkcmVzcycsICdFbWFpbCcsIG5ld0VtYWlsLCB1c2VyLl9pZCk7XG5cbiAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7XG4gICAgX2lkOiB1c2VyLl9pZFxuICB9LCB7XG4gICAgJGFkZFRvU2V0OiB7XG4gICAgICBlbWFpbHM6IHtcbiAgICAgICAgYWRkcmVzczogbmV3RW1haWwsXG4gICAgICAgIHZlcmlmaWVkOiB2ZXJpZmllZFxuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLy8gUGVyZm9ybSBhbm90aGVyIGNoZWNrIGFmdGVyIHVwZGF0ZSwgaW4gY2FzZSBhIG1hdGNoaW5nIHVzZXIgaGFzIGJlZW5cbiAgLy8gaW5zZXJ0ZWQgaW4gdGhlIG1lYW50aW1lXG4gIHRyeSB7XG4gICAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCdlbWFpbHMuYWRkcmVzcycsICdFbWFpbCcsIG5ld0VtYWlsLCB1c2VyLl9pZCk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgLy8gVW5kbyB1cGRhdGUgaWYgdGhlIGNoZWNrIGZhaWxzXG4gICAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7X2lkOiB1c2VyLl9pZH0sXG4gICAgICB7JHB1bGw6IHtlbWFpbHM6IHthZGRyZXNzOiBuZXdFbWFpbH19fSk7XG4gICAgdGhyb3cgZXg7XG4gIH1cbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBSZW1vdmUgYW4gZW1haWwgYWRkcmVzcyBmb3IgYSB1c2VyLiBVc2UgdGhpcyBpbnN0ZWFkIG9mIHVwZGF0aW5nXG4gKiB0aGUgZGF0YWJhc2UgZGlyZWN0bHkuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBJRCBvZiB0aGUgdXNlciB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gZW1haWwgVGhlIGVtYWlsIGFkZHJlc3MgdG8gcmVtb3ZlLlxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMucmVtb3ZlRW1haWwgPSAodXNlcklkLCBlbWFpbCkgPT4ge1xuICBjaGVjayh1c2VySWQsIE5vbkVtcHR5U3RyaW5nKTtcbiAgY2hlY2soZW1haWwsIE5vbkVtcHR5U3RyaW5nKTtcblxuICBjb25zdCB1c2VyID0gZ2V0VXNlckJ5SWQodXNlcklkLCB7ZmllbGRzOiB7X2lkOiAxfX0pO1xuICBpZiAoIXVzZXIpXG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVXNlciBub3QgZm91bmRcIik7XG5cbiAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7X2lkOiB1c2VyLl9pZH0sXG4gICAgeyRwdWxsOiB7ZW1haWxzOiB7YWRkcmVzczogZW1haWx9fX0pO1xufVxuXG4vLy9cbi8vLyBDUkVBVElORyBVU0VSU1xuLy8vXG5cbi8vIFNoYXJlZCBjcmVhdGVVc2VyIGZ1bmN0aW9uIGNhbGxlZCBmcm9tIHRoZSBjcmVhdGVVc2VyIG1ldGhvZCwgYm90aFxuLy8gaWYgb3JpZ2luYXRlcyBpbiBjbGllbnQgb3Igc2VydmVyIGNvZGUuIENhbGxzIHVzZXIgcHJvdmlkZWQgaG9va3MsXG4vLyBkb2VzIHRoZSBhY3R1YWwgdXNlciBpbnNlcnRpb24uXG4vL1xuLy8gcmV0dXJucyB0aGUgdXNlciBpZFxuY29uc3QgY3JlYXRlVXNlciA9IG9wdGlvbnMgPT4ge1xuICAvLyBVbmtub3duIGtleXMgYWxsb3dlZCwgYmVjYXVzZSBhIG9uQ3JlYXRlVXNlckhvb2sgY2FuIHRha2UgYXJiaXRyYXJ5XG4gIC8vIG9wdGlvbnMuXG4gIGNoZWNrKG9wdGlvbnMsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG4gICAgdXNlcm5hbWU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG4gICAgZW1haWw6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG4gICAgcGFzc3dvcmQ6IE1hdGNoLk9wdGlvbmFsKHBhc3N3b3JkVmFsaWRhdG9yKVxuICB9KSk7XG5cbiAgY29uc3QgeyB1c2VybmFtZSwgZW1haWwsIHBhc3N3b3JkIH0gPSBvcHRpb25zO1xuICBpZiAoIXVzZXJuYW1lICYmICFlbWFpbClcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgXCJOZWVkIHRvIHNldCBhIHVzZXJuYW1lIG9yIGVtYWlsXCIpO1xuXG4gIGNvbnN0IHVzZXIgPSB7c2VydmljZXM6IHt9fTtcbiAgaWYgKHBhc3N3b3JkKSB7XG4gICAgY29uc3QgaGFzaGVkID0gaGFzaFBhc3N3b3JkKHBhc3N3b3JkKTtcbiAgICB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkID0geyBiY3J5cHQ6IGhhc2hlZCB9O1xuICB9XG5cbiAgaWYgKHVzZXJuYW1lKVxuICAgIHVzZXIudXNlcm5hbWUgPSB1c2VybmFtZTtcbiAgaWYgKGVtYWlsKVxuICAgIHVzZXIuZW1haWxzID0gW3thZGRyZXNzOiBlbWFpbCwgdmVyaWZpZWQ6IGZhbHNlfV07XG5cbiAgLy8gUGVyZm9ybSBhIGNhc2UgaW5zZW5zaXRpdmUgY2hlY2sgYmVmb3JlIGluc2VydFxuICBjaGVja0ZvckNhc2VJbnNlbnNpdGl2ZUR1cGxpY2F0ZXMoJ3VzZXJuYW1lJywgJ1VzZXJuYW1lJywgdXNlcm5hbWUpO1xuICBjaGVja0ZvckNhc2VJbnNlbnNpdGl2ZUR1cGxpY2F0ZXMoJ2VtYWlscy5hZGRyZXNzJywgJ0VtYWlsJywgZW1haWwpO1xuXG4gIGNvbnN0IHVzZXJJZCA9IEFjY291bnRzLmluc2VydFVzZXJEb2Mob3B0aW9ucywgdXNlcik7XG4gIC8vIFBlcmZvcm0gYW5vdGhlciBjaGVjayBhZnRlciBpbnNlcnQsIGluIGNhc2UgYSBtYXRjaGluZyB1c2VyIGhhcyBiZWVuXG4gIC8vIGluc2VydGVkIGluIHRoZSBtZWFudGltZVxuICB0cnkge1xuICAgIGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcygndXNlcm5hbWUnLCAnVXNlcm5hbWUnLCB1c2VybmFtZSwgdXNlcklkKTtcbiAgICBjaGVja0ZvckNhc2VJbnNlbnNpdGl2ZUR1cGxpY2F0ZXMoJ2VtYWlscy5hZGRyZXNzJywgJ0VtYWlsJywgZW1haWwsIHVzZXJJZCk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgLy8gUmVtb3ZlIGluc2VydGVkIHVzZXIgaWYgdGhlIGNoZWNrIGZhaWxzXG4gICAgTWV0ZW9yLnVzZXJzLnJlbW92ZSh1c2VySWQpO1xuICAgIHRocm93IGV4O1xuICB9XG4gIHJldHVybiB1c2VySWQ7XG59O1xuXG4vLyBtZXRob2QgZm9yIGNyZWF0ZSB1c2VyLiBSZXF1ZXN0cyBjb21lIGZyb20gdGhlIGNsaWVudC5cbk1ldGVvci5tZXRob2RzKHtjcmVhdGVVc2VyOiBmdW5jdGlvbiAoLi4uYXJncykge1xuICBjb25zdCBvcHRpb25zID0gYXJnc1swXTtcbiAgcmV0dXJuIEFjY291bnRzLl9sb2dpbk1ldGhvZChcbiAgICB0aGlzLFxuICAgIFwiY3JlYXRlVXNlclwiLFxuICAgIGFyZ3MsXG4gICAgXCJwYXNzd29yZFwiLFxuICAgICgpID0+IHtcbiAgICAgIC8vIGNyZWF0ZVVzZXIoKSBhYm92ZSBkb2VzIG1vcmUgY2hlY2tpbmcuXG4gICAgICBjaGVjayhvcHRpb25zLCBPYmplY3QpO1xuICAgICAgaWYgKEFjY291bnRzLl9vcHRpb25zLmZvcmJpZENsaWVudEFjY291bnRDcmVhdGlvbilcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBlcnJvcjogbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiU2lnbnVwcyBmb3JiaWRkZW5cIilcbiAgICAgICAgfTtcblxuICAgICAgY29uc3QgdXNlcklkID0gQWNjb3VudHMuY3JlYXRlVXNlclZlcmlmeWluZ0VtYWlsKG9wdGlvbnMpO1xuXG4gICAgICAvLyBjbGllbnQgZ2V0cyBsb2dnZWQgaW4gYXMgdGhlIG5ldyB1c2VyIGFmdGVyd2FyZHMuXG4gICAgICByZXR1cm4ge3VzZXJJZDogdXNlcklkfTtcbiAgICB9XG4gICk7XG59fSk7XG5cbi8vIENyZWF0ZSB1c2VyIGRpcmVjdGx5IG9uIHRoZSBzZXJ2ZXIuXG4vL1xuLy8gRGlmZmVyZW50bHkgZnJvbSBBY2NvdW50cy5jcmVhdGVVc2VyKCksIHRoaXMgZXZhbHVhdGVzIHRoZSBBY2NvdW50cyBwYWNrYWdlXG4vLyBjb25maWd1cmF0aW9ucyBhbmQgc2VuZCBhIHZlcmlmaWNhdGlvbiBlbWFpbCBpZiB0aGUgdXNlciBoYXMgYmVlbiByZWdpc3RlcmVkXG4vLyBzdWNjZXNzZnVsbHkuXG5BY2NvdW50cy5jcmVhdGVVc2VyVmVyaWZ5aW5nRW1haWwgPSAob3B0aW9ucykgPT4ge1xuICBvcHRpb25zID0geyAuLi5vcHRpb25zIH07XG4gIC8vIENyZWF0ZSB1c2VyLiByZXN1bHQgY29udGFpbnMgaWQgYW5kIHRva2VuLlxuICBjb25zdCB1c2VySWQgPSBjcmVhdGVVc2VyKG9wdGlvbnMpO1xuICAvLyBzYWZldHkgYmVsdC4gY3JlYXRlVXNlciBpcyBzdXBwb3NlZCB0byB0aHJvdyBvbiBlcnJvci4gc2VuZCA1MDAgZXJyb3JcbiAgLy8gaW5zdGVhZCBvZiBzZW5kaW5nIGEgdmVyaWZpY2F0aW9uIGVtYWlsIHdpdGggZW1wdHkgdXNlcmlkLlxuICBpZiAoISB1c2VySWQpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiY3JlYXRlVXNlciBmYWlsZWQgdG8gaW5zZXJ0IG5ldyB1c2VyXCIpO1xuXG4gIC8vIElmIGBBY2NvdW50cy5fb3B0aW9ucy5zZW5kVmVyaWZpY2F0aW9uRW1haWxgIGlzIHNldCwgcmVnaXN0ZXJcbiAgLy8gYSB0b2tlbiB0byB2ZXJpZnkgdGhlIHVzZXIncyBwcmltYXJ5IGVtYWlsLCBhbmQgc2VuZCBpdCB0b1xuICAvLyB0aGF0IGFkZHJlc3MuXG4gIGlmIChvcHRpb25zLmVtYWlsICYmIEFjY291bnRzLl9vcHRpb25zLnNlbmRWZXJpZmljYXRpb25FbWFpbCkge1xuICAgIGlmIChvcHRpb25zLnBhc3N3b3JkKSB7XG4gICAgICBBY2NvdW50cy5zZW5kVmVyaWZpY2F0aW9uRW1haWwodXNlcklkLCBvcHRpb25zLmVtYWlsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgQWNjb3VudHMuc2VuZEVucm9sbG1lbnRFbWFpbCh1c2VySWQsIG9wdGlvbnMuZW1haWwpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB1c2VySWQ7XG59O1xuXG4vLyBDcmVhdGUgdXNlciBkaXJlY3RseSBvbiB0aGUgc2VydmVyLlxuLy9cbi8vIFVubGlrZSB0aGUgY2xpZW50IHZlcnNpb24sIHRoaXMgZG9lcyBub3QgbG9nIHlvdSBpbiBhcyB0aGlzIHVzZXJcbi8vIGFmdGVyIGNyZWF0aW9uLlxuLy9cbi8vIHJldHVybnMgdXNlcklkIG9yIHRocm93cyBhbiBlcnJvciBpZiBpdCBjYW4ndCBjcmVhdGVcbi8vXG4vLyBYWFggYWRkIGFub3RoZXIgYXJndW1lbnQgKFwic2VydmVyIG9wdGlvbnNcIikgdGhhdCBnZXRzIHNlbnQgdG8gb25DcmVhdGVVc2VyLFxuLy8gd2hpY2ggaXMgYWx3YXlzIGVtcHR5IHdoZW4gY2FsbGVkIGZyb20gdGhlIGNyZWF0ZVVzZXIgbWV0aG9kPyBlZywgXCJhZG1pbjpcbi8vIHRydWVcIiwgd2hpY2ggd2Ugd2FudCB0byBwcmV2ZW50IHRoZSBjbGllbnQgZnJvbSBzZXR0aW5nLCBidXQgd2hpY2ggYSBjdXN0b21cbi8vIG1ldGhvZCBjYWxsaW5nIEFjY291bnRzLmNyZWF0ZVVzZXIgY291bGQgc2V0P1xuLy9cbkFjY291bnRzLmNyZWF0ZVVzZXIgPSAob3B0aW9ucywgY2FsbGJhY2spID0+IHtcbiAgb3B0aW9ucyA9IHsgLi4ub3B0aW9ucyB9O1xuXG4gIC8vIFhYWCBhbGxvdyBhbiBvcHRpb25hbCBjYWxsYmFjaz9cbiAgaWYgKGNhbGxiYWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQWNjb3VudHMuY3JlYXRlVXNlciB3aXRoIGNhbGxiYWNrIG5vdCBzdXBwb3J0ZWQgb24gdGhlIHNlcnZlciB5ZXQuXCIpO1xuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZVVzZXIob3B0aW9ucyk7XG59O1xuXG4vLy9cbi8vLyBQQVNTV09SRC1TUEVDSUZJQyBJTkRFWEVTIE9OIFVTRVJTXG4vLy9cbk1ldGVvci51c2Vycy5fZW5zdXJlSW5kZXgoJ3NlcnZpY2VzLmVtYWlsLnZlcmlmaWNhdGlvblRva2Vucy50b2tlbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHsgdW5pcXVlOiB0cnVlLCBzcGFyc2U6IHRydWUgfSk7XG5NZXRlb3IudXNlcnMuX2Vuc3VyZUluZGV4KCdzZXJ2aWNlcy5wYXNzd29yZC5yZXNldC50b2tlbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHsgdW5pcXVlOiB0cnVlLCBzcGFyc2U6IHRydWUgfSk7XG4iXX0=
