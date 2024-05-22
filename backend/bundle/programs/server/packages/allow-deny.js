(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var check = Package.check.check;
var Match = Package.check.Match;
var EJSON = Package.ejson.EJSON;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var AllowDeny;

var require = meteorInstall({"node_modules":{"meteor":{"allow-deny":{"allow-deny.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/allow-deny/allow-deny.js                                                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
///
/// Remote methods and access control.
///
const hasOwn = Object.prototype.hasOwnProperty; // Restrict default mutators on collection. allow() and deny() take the
// same options:
//
// options.insert {Function(userId, doc)}
//   return true to allow/deny adding this document
//
// options.update {Function(userId, docs, fields, modifier)}
//   return true to allow/deny updating these documents.
//   `fields` is passed as an array of fields that are to be modified
//
// options.remove {Function(userId, docs)}
//   return true to allow/deny removing these documents
//
// options.fetch {Array}
//   Fields to fetch for these validators. If any call to allow or deny
//   does not have this option then all fields are loaded.
//
// allow and deny can be called multiple times. The validators are
// evaluated as follows:
// - If neither deny() nor allow() has been called on the collection,
//   then the request is allowed if and only if the "insecure" smart
//   package is in use.
// - Otherwise, if any deny() function returns true, the request is denied.
// - Otherwise, if any allow() function returns true, the request is allowed.
// - Otherwise, the request is denied.
//
// Meteor may call your deny() and allow() functions in any order, and may not
// call all of them if it is able to make a decision without calling them all
// (so don't include side effects).

AllowDeny = {
  CollectionPrototype: {}
}; // In the `mongo` package, we will extend Mongo.Collection.prototype with these
// methods

const CollectionPrototype = AllowDeny.CollectionPrototype;
/**
 * @summary Allow users to write directly to this collection from client code, subject to limitations you define.
 * @locus Server
 * @method allow
 * @memberOf Mongo.Collection
 * @instance
 * @param {Object} options
 * @param {Function} options.insert,update,remove Functions that look at a proposed modification to the database and return true if it should be allowed.
 * @param {String[]} options.fetch Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your `update` and `remove` functions.
 * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections).  Pass `null` to disable transformation.
 */

CollectionPrototype.allow = function (options) {
  addValidator(this, 'allow', options);
};
/**
 * @summary Override `allow` rules.
 * @locus Server
 * @method deny
 * @memberOf Mongo.Collection
 * @instance
 * @param {Object} options
 * @param {Function} options.insert,update,remove Functions that look at a proposed modification to the database and return true if it should be denied, even if an [allow](#allow) rule says otherwise.
 * @param {String[]} options.fetch Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your `update` and `remove` functions.
 * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections).  Pass `null` to disable transformation.
 */


CollectionPrototype.deny = function (options) {
  addValidator(this, 'deny', options);
};

CollectionPrototype._defineMutationMethods = function (options) {
  const self = this;
  options = options || {}; // set to true once we call any allow or deny methods. If true, use
  // allow/deny semantics. If false, use insecure mode semantics.

  self._restricted = false; // Insecure mode (default to allowing writes). Defaults to 'undefined' which
  // means insecure iff the insecure package is loaded. This property can be
  // overriden by tests or packages wishing to change insecure mode behavior of
  // their collections.

  self._insecure = undefined;
  self._validators = {
    insert: {
      allow: [],
      deny: []
    },
    update: {
      allow: [],
      deny: []
    },
    remove: {
      allow: [],
      deny: []
    },
    upsert: {
      allow: [],
      deny: []
    },
    // dummy arrays; can't set these!
    fetch: [],
    fetchAllFields: false
  };
  if (!self._name) return; // anonymous collection
  // XXX Think about method namespacing. Maybe methods should be
  // "Meteor:Mongo:insert/NAME"?

  self._prefix = '/' + self._name + '/'; // Mutation Methods
  // Minimongo on the server gets no stubs; instead, by default
  // it wait()s until its result is ready, yielding.
  // This matches the behavior of macromongo on the server better.
  // XXX see #MeteorServerNull

  if (self._connection && (self._connection === Meteor.server || Meteor.isClient)) {
    const m = {};
    ['insert', 'update', 'remove'].forEach(method => {
      const methodName = self._prefix + method;

      if (options.useExisting) {
        const handlerPropName = Meteor.isClient ? '_methodHandlers' : 'method_handlers'; // Do not try to create additional methods if this has already been called.
        // (Otherwise the .methods() call below will throw an error.)

        if (self._connection[handlerPropName] && typeof self._connection[handlerPropName][methodName] === 'function') return;
      }

      m[methodName] = function ()
      /* ... */
      {
        // All the methods do their own validation, instead of using check().
        check(arguments, [Match.Any]);
        const args = Array.from(arguments);

        try {
          // For an insert, if the client didn't specify an _id, generate one
          // now; because this uses DDP.randomStream, it will be consistent with
          // what the client generated. We generate it now rather than later so
          // that if (eg) an allow/deny rule does an insert to the same
          // collection (not that it really should), the generated _id will
          // still be the first use of the stream and will be consistent.
          //
          // However, we don't actually stick the _id onto the document yet,
          // because we want allow/deny rules to be able to differentiate
          // between arbitrary client-specified _id fields and merely
          // client-controlled-via-randomSeed fields.
          let generatedId = null;

          if (method === "insert" && !hasOwn.call(args[0], '_id')) {
            generatedId = self._makeNewID();
          }

          if (this.isSimulation) {
            // In a client simulation, you can do any mutation (even with a
            // complex selector).
            if (generatedId !== null) args[0]._id = generatedId;
            return self._collection[method].apply(self._collection, args);
          } // This is the server receiving a method call from the client.
          // We don't allow arbitrary selectors in mutations from the client: only
          // single-ID selectors.


          if (method !== 'insert') throwIfSelectorIsNotId(args[0], method);

          if (self._restricted) {
            // short circuit if there is no way it will pass.
            if (self._validators[method].allow.length === 0) {
              throw new Meteor.Error(403, "Access denied. No allow validators set on restricted " + "collection for method '" + method + "'.");
            }

            const validatedMethodName = '_validated' + method.charAt(0).toUpperCase() + method.slice(1);
            args.unshift(this.userId);
            method === 'insert' && args.push(generatedId);
            return self[validatedMethodName].apply(self, args);
          } else if (self._isInsecure()) {
            if (generatedId !== null) args[0]._id = generatedId; // In insecure mode, allow any mutation (with a simple selector).
            // XXX This is kind of bogus.  Instead of blindly passing whatever
            //     we get from the network to this function, we should actually
            //     know the correct arguments for the function and pass just
            //     them.  For example, if you have an extraneous extra null
            //     argument and this is Mongo on the server, the .wrapAsync'd
            //     functions like update will get confused and pass the
            //     "fut.resolver()" in the wrong slot, where _update will never
            //     invoke it. Bam, broken DDP connection.  Probably should just
            //     take this whole method and write it three times, invoking
            //     helpers for the common code.

            return self._collection[method].apply(self._collection, args);
          } else {
            // In secure mode, if we haven't called allow or deny, then nothing
            // is permitted.
            throw new Meteor.Error(403, "Access denied");
          }
        } catch (e) {
          if (e.name === 'MongoError' || e.name === 'MinimongoError') {
            throw new Meteor.Error(409, e.toString());
          } else {
            throw e;
          }
        }
      };
    });

    self._connection.methods(m);
  }
};

CollectionPrototype._updateFetch = function (fields) {
  const self = this;

  if (!self._validators.fetchAllFields) {
    if (fields) {
      const union = Object.create(null);

      const add = names => names && names.forEach(name => union[name] = 1);

      add(self._validators.fetch);
      add(fields);
      self._validators.fetch = Object.keys(union);
    } else {
      self._validators.fetchAllFields = true; // clear fetch just to make sure we don't accidentally read it

      self._validators.fetch = null;
    }
  }
};

CollectionPrototype._isInsecure = function () {
  const self = this;
  if (self._insecure === undefined) return !!Package.insecure;
  return self._insecure;
};

CollectionPrototype._validatedInsert = function (userId, doc, generatedId) {
  const self = this; // call user validators.
  // Any deny returns true means denied.

  if (self._validators.insert.deny.some(validator => {
    return validator(userId, docToValidate(validator, doc, generatedId));
  })) {
    throw new Meteor.Error(403, "Access denied");
  } // Any allow returns true means proceed. Throw error if they all fail.


  if (self._validators.insert.allow.every(validator => {
    return !validator(userId, docToValidate(validator, doc, generatedId));
  })) {
    throw new Meteor.Error(403, "Access denied");
  } // If we generated an ID above, insert it now: after the validation, but
  // before actually inserting.


  if (generatedId !== null) doc._id = generatedId;

  self._collection.insert.call(self._collection, doc);
}; // Simulate a mongo `update` operation while validating that the access
// control rules set by calls to `allow/deny` are satisfied. If all
// pass, rewrite the mongo operation to use $in to set the list of
// document ids to change ##ValidatedChange


CollectionPrototype._validatedUpdate = function (userId, selector, mutator, options) {
  const self = this;
  check(mutator, Object);
  options = Object.assign(Object.create(null), options);
  if (!LocalCollection._selectorIsIdPerhapsAsObject(selector)) throw new Error("validated update should be of a single ID"); // We don't support upserts because they don't fit nicely into allow/deny
  // rules.

  if (options.upsert) throw new Meteor.Error(403, "Access denied. Upserts not " + "allowed in a restricted collection.");
  const noReplaceError = "Access denied. In a restricted collection you can only" + " update documents, not replace them. Use a Mongo update operator, such " + "as '$set'.";
  const mutatorKeys = Object.keys(mutator); // compute modified fields

  const modifiedFields = {};

  if (mutatorKeys.length === 0) {
    throw new Meteor.Error(403, noReplaceError);
  }

  mutatorKeys.forEach(op => {
    const params = mutator[op];

    if (op.charAt(0) !== '$') {
      throw new Meteor.Error(403, noReplaceError);
    } else if (!hasOwn.call(ALLOWED_UPDATE_OPERATIONS, op)) {
      throw new Meteor.Error(403, "Access denied. Operator " + op + " not allowed in a restricted collection.");
    } else {
      Object.keys(params).forEach(field => {
        // treat dotted fields as if they are replacing their
        // top-level part
        if (field.indexOf('.') !== -1) field = field.substring(0, field.indexOf('.')); // record the field we are trying to change

        modifiedFields[field] = true;
      });
    }
  });
  const fields = Object.keys(modifiedFields);
  const findOptions = {
    transform: null
  };

  if (!self._validators.fetchAllFields) {
    findOptions.fields = {};

    self._validators.fetch.forEach(fieldName => {
      findOptions.fields[fieldName] = 1;
    });
  }

  const doc = self._collection.findOne(selector, findOptions);

  if (!doc) // none satisfied!
    return 0; // call user validators.
  // Any deny returns true means denied.

  if (self._validators.update.deny.some(validator => {
    const factoriedDoc = transformDoc(validator, doc);
    return validator(userId, factoriedDoc, fields, mutator);
  })) {
    throw new Meteor.Error(403, "Access denied");
  } // Any allow returns true means proceed. Throw error if they all fail.


  if (self._validators.update.allow.every(validator => {
    const factoriedDoc = transformDoc(validator, doc);
    return !validator(userId, factoriedDoc, fields, mutator);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }

  options._forbidReplace = true; // Back when we supported arbitrary client-provided selectors, we actually
  // rewrote the selector to include an _id clause before passing to Mongo to
  // avoid races, but since selector is guaranteed to already just be an ID, we
  // don't have to any more.

  return self._collection.update.call(self._collection, selector, mutator, options);
}; // Only allow these operations in validated updates. Specifically
// whitelist operations, rather than blacklist, so new complex
// operations that are added aren't automatically allowed. A complex
// operation is one that does more than just modify its target
// field. For now this contains all update operations except '$rename'.
// http://docs.mongodb.org/manual/reference/operators/#update


const ALLOWED_UPDATE_OPERATIONS = {
  $inc: 1,
  $set: 1,
  $unset: 1,
  $addToSet: 1,
  $pop: 1,
  $pullAll: 1,
  $pull: 1,
  $pushAll: 1,
  $push: 1,
  $bit: 1
}; // Simulate a mongo `remove` operation while validating access control
// rules. See #ValidatedChange

CollectionPrototype._validatedRemove = function (userId, selector) {
  const self = this;
  const findOptions = {
    transform: null
  };

  if (!self._validators.fetchAllFields) {
    findOptions.fields = {};

    self._validators.fetch.forEach(fieldName => {
      findOptions.fields[fieldName] = 1;
    });
  }

  const doc = self._collection.findOne(selector, findOptions);

  if (!doc) return 0; // call user validators.
  // Any deny returns true means denied.

  if (self._validators.remove.deny.some(validator => {
    return validator(userId, transformDoc(validator, doc));
  })) {
    throw new Meteor.Error(403, "Access denied");
  } // Any allow returns true means proceed. Throw error if they all fail.


  if (self._validators.remove.allow.every(validator => {
    return !validator(userId, transformDoc(validator, doc));
  })) {
    throw new Meteor.Error(403, "Access denied");
  } // Back when we supported arbitrary client-provided selectors, we actually
  // rewrote the selector to {_id: {$in: [ids that we found]}} before passing to
  // Mongo to avoid races, but since selector is guaranteed to already just be
  // an ID, we don't have to any more.


  return self._collection.remove.call(self._collection, selector);
};

CollectionPrototype._callMutatorMethod = function _callMutatorMethod(name, args, callback) {
  if (Meteor.isClient && !callback && !alreadyInSimulation()) {
    // Client can't block, so it can't report errors by exception,
    // only by callback. If they forget the callback, give them a
    // default one that logs the error, so they aren't totally
    // baffled if their writes don't work because their database is
    // down.
    // Don't give a default callback in simulation, because inside stubs we
    // want to return the results from the local collection immediately and
    // not force a callback.
    callback = function (err) {
      if (err) Meteor._debug(name + " failed: " + (err.reason || err.stack));
    };
  } // For two out of three mutator methods, the first argument is a selector


  const firstArgIsSelector = name === "update" || name === "remove";

  if (firstArgIsSelector && !alreadyInSimulation()) {
    // If we're about to actually send an RPC, we should throw an error if
    // this is a non-ID selector, because the mutation methods only allow
    // single-ID selectors. (If we don't throw here, we'll see flicker.)
    throwIfSelectorIsNotId(args[0], name);
  }

  const mutatorMethodName = this._prefix + name;
  return this._connection.apply(mutatorMethodName, args, {
    returnStubValue: true
  }, callback);
};

function transformDoc(validator, doc) {
  if (validator.transform) return validator.transform(doc);
  return doc;
}

function docToValidate(validator, doc, generatedId) {
  let ret = doc;

  if (validator.transform) {
    ret = EJSON.clone(doc); // If you set a server-side transform on your collection, then you don't get
    // to tell the difference between "client specified the ID" and "server
    // generated the ID", because transforms expect to get _id.  If you want to
    // do that check, you can do it with a specific
    // `C.allow({insert: f, transform: null})` validator.

    if (generatedId !== null) {
      ret._id = generatedId;
    }

    ret = validator.transform(ret);
  }

  return ret;
}

function addValidator(collection, allowOrDeny, options) {
  // validate keys
  const validKeysRegEx = /^(?:insert|update|remove|fetch|transform)$/;
  Object.keys(options).forEach(key => {
    if (!validKeysRegEx.test(key)) throw new Error(allowOrDeny + ": Invalid key: " + key);
  });
  collection._restricted = true;
  ['insert', 'update', 'remove'].forEach(name => {
    if (hasOwn.call(options, name)) {
      if (!(options[name] instanceof Function)) {
        throw new Error(allowOrDeny + ": Value for `" + name + "` must be a function");
      } // If the transform is specified at all (including as 'null') in this
      // call, then take that; otherwise, take the transform from the
      // collection.


      if (options.transform === undefined) {
        options[name].transform = collection._transform; // already wrapped
      } else {
        options[name].transform = LocalCollection.wrapTransform(options.transform);
      }

      collection._validators[name][allowOrDeny].push(options[name]);
    }
  }); // Only update the fetch fields if we're passed things that affect
  // fetching. This way allow({}) and allow({insert: f}) don't result in
  // setting fetchAllFields

  if (options.update || options.remove || options.fetch) {
    if (options.fetch && !(options.fetch instanceof Array)) {
      throw new Error(allowOrDeny + ": Value for `fetch` must be an array");
    }

    collection._updateFetch(options.fetch);
  }
}

function throwIfSelectorIsNotId(selector, methodName) {
  if (!LocalCollection._selectorIsIdPerhapsAsObject(selector)) {
    throw new Meteor.Error(403, "Not permitted. Untrusted code may only " + methodName + " documents by ID.");
  }
}

; // Determine if we are in a DDP method simulation

function alreadyInSimulation() {
  var CurrentInvocation = DDP._CurrentMethodInvocation || // For backwards compatibility, as explained in this issue:
  // https://github.com/meteor/meteor/issues/8947
  DDP._CurrentInvocation;
  const enclosing = CurrentInvocation.get();
  return enclosing && enclosing.isSimulation;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/allow-deny/allow-deny.js");

/* Exports */
Package._define("allow-deny", {
  AllowDeny: AllowDeny
});

})();

//# sourceURL=meteor://💻app/packages/allow-deny.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWxsb3ctZGVueS9hbGxvdy1kZW55LmpzIl0sIm5hbWVzIjpbImhhc093biIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiQWxsb3dEZW55IiwiQ29sbGVjdGlvblByb3RvdHlwZSIsImFsbG93Iiwib3B0aW9ucyIsImFkZFZhbGlkYXRvciIsImRlbnkiLCJfZGVmaW5lTXV0YXRpb25NZXRob2RzIiwic2VsZiIsIl9yZXN0cmljdGVkIiwiX2luc2VjdXJlIiwidW5kZWZpbmVkIiwiX3ZhbGlkYXRvcnMiLCJpbnNlcnQiLCJ1cGRhdGUiLCJyZW1vdmUiLCJ1cHNlcnQiLCJmZXRjaCIsImZldGNoQWxsRmllbGRzIiwiX25hbWUiLCJfcHJlZml4IiwiX2Nvbm5lY3Rpb24iLCJNZXRlb3IiLCJzZXJ2ZXIiLCJpc0NsaWVudCIsIm0iLCJmb3JFYWNoIiwibWV0aG9kIiwibWV0aG9kTmFtZSIsInVzZUV4aXN0aW5nIiwiaGFuZGxlclByb3BOYW1lIiwiY2hlY2siLCJhcmd1bWVudHMiLCJNYXRjaCIsIkFueSIsImFyZ3MiLCJBcnJheSIsImZyb20iLCJnZW5lcmF0ZWRJZCIsImNhbGwiLCJfbWFrZU5ld0lEIiwiaXNTaW11bGF0aW9uIiwiX2lkIiwiX2NvbGxlY3Rpb24iLCJhcHBseSIsInRocm93SWZTZWxlY3RvcklzTm90SWQiLCJsZW5ndGgiLCJFcnJvciIsInZhbGlkYXRlZE1ldGhvZE5hbWUiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwidW5zaGlmdCIsInVzZXJJZCIsInB1c2giLCJfaXNJbnNlY3VyZSIsImUiLCJuYW1lIiwidG9TdHJpbmciLCJtZXRob2RzIiwiX3VwZGF0ZUZldGNoIiwiZmllbGRzIiwidW5pb24iLCJjcmVhdGUiLCJhZGQiLCJuYW1lcyIsImtleXMiLCJQYWNrYWdlIiwiaW5zZWN1cmUiLCJfdmFsaWRhdGVkSW5zZXJ0IiwiZG9jIiwic29tZSIsInZhbGlkYXRvciIsImRvY1RvVmFsaWRhdGUiLCJldmVyeSIsIl92YWxpZGF0ZWRVcGRhdGUiLCJzZWxlY3RvciIsIm11dGF0b3IiLCJhc3NpZ24iLCJMb2NhbENvbGxlY3Rpb24iLCJfc2VsZWN0b3JJc0lkUGVyaGFwc0FzT2JqZWN0Iiwibm9SZXBsYWNlRXJyb3IiLCJtdXRhdG9yS2V5cyIsIm1vZGlmaWVkRmllbGRzIiwib3AiLCJwYXJhbXMiLCJBTExPV0VEX1VQREFURV9PUEVSQVRJT05TIiwiZmllbGQiLCJpbmRleE9mIiwic3Vic3RyaW5nIiwiZmluZE9wdGlvbnMiLCJ0cmFuc2Zvcm0iLCJmaWVsZE5hbWUiLCJmaW5kT25lIiwiZmFjdG9yaWVkRG9jIiwidHJhbnNmb3JtRG9jIiwiX2ZvcmJpZFJlcGxhY2UiLCIkaW5jIiwiJHNldCIsIiR1bnNldCIsIiRhZGRUb1NldCIsIiRwb3AiLCIkcHVsbEFsbCIsIiRwdWxsIiwiJHB1c2hBbGwiLCIkcHVzaCIsIiRiaXQiLCJfdmFsaWRhdGVkUmVtb3ZlIiwiX2NhbGxNdXRhdG9yTWV0aG9kIiwiY2FsbGJhY2siLCJhbHJlYWR5SW5TaW11bGF0aW9uIiwiZXJyIiwiX2RlYnVnIiwicmVhc29uIiwic3RhY2siLCJmaXJzdEFyZ0lzU2VsZWN0b3IiLCJtdXRhdG9yTWV0aG9kTmFtZSIsInJldHVyblN0dWJWYWx1ZSIsInJldCIsIkVKU09OIiwiY2xvbmUiLCJjb2xsZWN0aW9uIiwiYWxsb3dPckRlbnkiLCJ2YWxpZEtleXNSZWdFeCIsImtleSIsInRlc3QiLCJGdW5jdGlvbiIsIl90cmFuc2Zvcm0iLCJ3cmFwVHJhbnNmb3JtIiwiQ3VycmVudEludm9jYXRpb24iLCJERFAiLCJfQ3VycmVudE1ldGhvZEludm9jYXRpb24iLCJfQ3VycmVudEludm9jYXRpb24iLCJlbmNsb3NpbmciLCJnZXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFFQSxNQUFNQSxNQUFNLEdBQUdDLE1BQU0sQ0FBQ0MsU0FB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R0osaUJBQWlCLENBQUNLLEdBQWxCLEVBQWxCO0FBQ0EsU0FBT0QsU0FBUyxJQUFJQSxTQUFTLENBQUM1RixZQUE5QjtBQUNELEMiLCJmaWxlIjoiL3BhY2thZ2VzL2FsbG93LWRlbnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy9cbi8vLyBSZW1vdGUgbWV0aG9kcyBhbmQgYWNjZXNzIGNvbnRyb2wuXG4vLy9cblxuY29uc3QgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gUmVzdHJpY3QgZGVmYXVsdCBtdXRhdG9ycyBvbiBjb2xsZWN0aW9uLiBhbGxvdygpIGFuZCBkZW55KCkgdGFrZSB0aGVcbi8vIHNhbWUgb3B0aW9uczpcbi8vXG4vLyBvcHRpb25zLmluc2VydCB7RnVuY3Rpb24odXNlcklkLCBkb2MpfVxuLy8gICByZXR1cm4gdHJ1ZSB0byBhbGxvdy9kZW55IGFkZGluZyB0aGlzIGRvY3VtZW50XG4vL1xuLy8gb3B0aW9ucy51cGRhdGUge0Z1bmN0aW9uKHVzZXJJZCwgZG9jcywgZmllbGRzLCBtb2RpZmllcil9XG4vLyAgIHJldHVybiB0cnVlIHRvIGFsbG93L2RlbnkgdXBkYXRpbmcgdGhlc2UgZG9jdW1lbnRzLlxuLy8gICBgZmllbGRzYCBpcyBwYXNzZWQgYXMgYW4gYXJyYXkgb2YgZmllbGRzIHRoYXQgYXJlIHRvIGJlIG1vZGlmaWVkXG4vL1xuLy8gb3B0aW9ucy5yZW1vdmUge0Z1bmN0aW9uKHVzZXJJZCwgZG9jcyl9XG4vLyAgIHJldHVybiB0cnVlIHRvIGFsbG93L2RlbnkgcmVtb3ZpbmcgdGhlc2UgZG9jdW1lbnRzXG4vL1xuLy8gb3B0aW9ucy5mZXRjaCB7QXJyYXl9XG4vLyAgIEZpZWxkcyB0byBmZXRjaCBmb3IgdGhlc2UgdmFsaWRhdG9ycy4gSWYgYW55IGNhbGwgdG8gYWxsb3cgb3IgZGVueVxuLy8gICBkb2VzIG5vdCBoYXZlIHRoaXMgb3B0aW9uIHRoZW4gYWxsIGZpZWxkcyBhcmUgbG9hZGVkLlxuLy9cbi8vIGFsbG93IGFuZCBkZW55IGNhbiBiZSBjYWxsZWQgbXVsdGlwbGUgdGltZXMuIFRoZSB2YWxpZGF0b3JzIGFyZVxuLy8gZXZhbHVhdGVkIGFzIGZvbGxvd3M6XG4vLyAtIElmIG5laXRoZXIgZGVueSgpIG5vciBhbGxvdygpIGhhcyBiZWVuIGNhbGxlZCBvbiB0aGUgY29sbGVjdGlvbixcbi8vICAgdGhlbiB0aGUgcmVxdWVzdCBpcyBhbGxvd2VkIGlmIGFuZCBvbmx5IGlmIHRoZSBcImluc2VjdXJlXCIgc21hcnRcbi8vICAgcGFja2FnZSBpcyBpbiB1c2UuXG4vLyAtIE90aGVyd2lzZSwgaWYgYW55IGRlbnkoKSBmdW5jdGlvbiByZXR1cm5zIHRydWUsIHRoZSByZXF1ZXN0IGlzIGRlbmllZC5cbi8vIC0gT3RoZXJ3aXNlLCBpZiBhbnkgYWxsb3coKSBmdW5jdGlvbiByZXR1cm5zIHRydWUsIHRoZSByZXF1ZXN0IGlzIGFsbG93ZWQuXG4vLyAtIE90aGVyd2lzZSwgdGhlIHJlcXVlc3QgaXMgZGVuaWVkLlxuLy9cbi8vIE1ldGVvciBtYXkgY2FsbCB5b3VyIGRlbnkoKSBhbmQgYWxsb3coKSBmdW5jdGlvbnMgaW4gYW55IG9yZGVyLCBhbmQgbWF5IG5vdFxuLy8gY2FsbCBhbGwgb2YgdGhlbSBpZiBpdCBpcyBhYmxlIHRvIG1ha2UgYSBkZWNpc2lvbiB3aXRob3V0IGNhbGxpbmcgdGhlbSBhbGxcbi8vIChzbyBkb24ndCBpbmNsdWRlIHNpZGUgZWZmZWN0cykuXG5cbkFsbG93RGVueSA9IHtcbiAgQ29sbGVjdGlvblByb3RvdHlwZToge31cbn07XG5cbi8vIEluIHRoZSBgbW9uZ29gIHBhY2thZ2UsIHdlIHdpbGwgZXh0ZW5kIE1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlIHdpdGggdGhlc2Vcbi8vIG1ldGhvZHNcbmNvbnN0IENvbGxlY3Rpb25Qcm90b3R5cGUgPSBBbGxvd0RlbnkuQ29sbGVjdGlvblByb3RvdHlwZTtcblxuLyoqXG4gKiBAc3VtbWFyeSBBbGxvdyB1c2VycyB0byB3cml0ZSBkaXJlY3RseSB0byB0aGlzIGNvbGxlY3Rpb24gZnJvbSBjbGllbnQgY29kZSwgc3ViamVjdCB0byBsaW1pdGF0aW9ucyB5b3UgZGVmaW5lLlxuICogQGxvY3VzIFNlcnZlclxuICogQG1ldGhvZCBhbGxvd1xuICogQG1lbWJlck9mIE1vbmdvLkNvbGxlY3Rpb25cbiAqIEBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMuaW5zZXJ0LHVwZGF0ZSxyZW1vdmUgRnVuY3Rpb25zIHRoYXQgbG9vayBhdCBhIHByb3Bvc2VkIG1vZGlmaWNhdGlvbiB0byB0aGUgZGF0YWJhc2UgYW5kIHJldHVybiB0cnVlIGlmIGl0IHNob3VsZCBiZSBhbGxvd2VkLlxuICogQHBhcmFtIHtTdHJpbmdbXX0gb3B0aW9ucy5mZXRjaCBPcHRpb25hbCBwZXJmb3JtYW5jZSBlbmhhbmNlbWVudC4gTGltaXRzIHRoZSBmaWVsZHMgdGhhdCB3aWxsIGJlIGZldGNoZWQgZnJvbSB0aGUgZGF0YWJhc2UgZm9yIGluc3BlY3Rpb24gYnkgeW91ciBgdXBkYXRlYCBhbmQgYHJlbW92ZWAgZnVuY3Rpb25zLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gT3ZlcnJpZGVzIGB0cmFuc2Zvcm1gIG9uIHRoZSAgW2BDb2xsZWN0aW9uYF0oI2NvbGxlY3Rpb25zKS4gIFBhc3MgYG51bGxgIHRvIGRpc2FibGUgdHJhbnNmb3JtYXRpb24uXG4gKi9cbkNvbGxlY3Rpb25Qcm90b3R5cGUuYWxsb3cgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIGFkZFZhbGlkYXRvcih0aGlzLCAnYWxsb3cnLCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgT3ZlcnJpZGUgYGFsbG93YCBydWxlcy5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBtZXRob2QgZGVueVxuICogQG1lbWJlck9mIE1vbmdvLkNvbGxlY3Rpb25cbiAqIEBpbnN0YW5jZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMuaW5zZXJ0LHVwZGF0ZSxyZW1vdmUgRnVuY3Rpb25zIHRoYXQgbG9vayBhdCBhIHByb3Bvc2VkIG1vZGlmaWNhdGlvbiB0byB0aGUgZGF0YWJhc2UgYW5kIHJldHVybiB0cnVlIGlmIGl0IHNob3VsZCBiZSBkZW5pZWQsIGV2ZW4gaWYgYW4gW2FsbG93XSgjYWxsb3cpIHJ1bGUgc2F5cyBvdGhlcndpc2UuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBvcHRpb25zLmZldGNoIE9wdGlvbmFsIHBlcmZvcm1hbmNlIGVuaGFuY2VtZW50LiBMaW1pdHMgdGhlIGZpZWxkcyB0aGF0IHdpbGwgYmUgZmV0Y2hlZCBmcm9tIHRoZSBkYXRhYmFzZSBmb3IgaW5zcGVjdGlvbiBieSB5b3VyIGB1cGRhdGVgIGFuZCBgcmVtb3ZlYCBmdW5jdGlvbnMuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlICBbYENvbGxlY3Rpb25gXSgjY29sbGVjdGlvbnMpLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAqL1xuQ29sbGVjdGlvblByb3RvdHlwZS5kZW55ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBhZGRWYWxpZGF0b3IodGhpcywgJ2RlbnknLCBvcHRpb25zKTtcbn07XG5cbkNvbGxlY3Rpb25Qcm90b3R5cGUuX2RlZmluZU11dGF0aW9uTWV0aG9kcyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHNldCB0byB0cnVlIG9uY2Ugd2UgY2FsbCBhbnkgYWxsb3cgb3IgZGVueSBtZXRob2RzLiBJZiB0cnVlLCB1c2VcbiAgLy8gYWxsb3cvZGVueSBzZW1hbnRpY3MuIElmIGZhbHNlLCB1c2UgaW5zZWN1cmUgbW9kZSBzZW1hbnRpY3MuXG4gIHNlbGYuX3Jlc3RyaWN0ZWQgPSBmYWxzZTtcblxuICAvLyBJbnNlY3VyZSBtb2RlIChkZWZhdWx0IHRvIGFsbG93aW5nIHdyaXRlcykuIERlZmF1bHRzIHRvICd1bmRlZmluZWQnIHdoaWNoXG4gIC8vIG1lYW5zIGluc2VjdXJlIGlmZiB0aGUgaW5zZWN1cmUgcGFja2FnZSBpcyBsb2FkZWQuIFRoaXMgcHJvcGVydHkgY2FuIGJlXG4gIC8vIG92ZXJyaWRlbiBieSB0ZXN0cyBvciBwYWNrYWdlcyB3aXNoaW5nIHRvIGNoYW5nZSBpbnNlY3VyZSBtb2RlIGJlaGF2aW9yIG9mXG4gIC8vIHRoZWlyIGNvbGxlY3Rpb25zLlxuICBzZWxmLl9pbnNlY3VyZSA9IHVuZGVmaW5lZDtcblxuICBzZWxmLl92YWxpZGF0b3JzID0ge1xuICAgIGluc2VydDoge2FsbG93OiBbXSwgZGVueTogW119LFxuICAgIHVwZGF0ZToge2FsbG93OiBbXSwgZGVueTogW119LFxuICAgIHJlbW92ZToge2FsbG93OiBbXSwgZGVueTogW119LFxuICAgIHVwc2VydDoge2FsbG93OiBbXSwgZGVueTogW119LCAvLyBkdW1teSBhcnJheXM7IGNhbid0IHNldCB0aGVzZSFcbiAgICBmZXRjaDogW10sXG4gICAgZmV0Y2hBbGxGaWVsZHM6IGZhbHNlXG4gIH07XG5cbiAgaWYgKCFzZWxmLl9uYW1lKVxuICAgIHJldHVybjsgLy8gYW5vbnltb3VzIGNvbGxlY3Rpb25cblxuICAvLyBYWFggVGhpbmsgYWJvdXQgbWV0aG9kIG5hbWVzcGFjaW5nLiBNYXliZSBtZXRob2RzIHNob3VsZCBiZVxuICAvLyBcIk1ldGVvcjpNb25nbzppbnNlcnQvTkFNRVwiP1xuICBzZWxmLl9wcmVmaXggPSAnLycgKyBzZWxmLl9uYW1lICsgJy8nO1xuXG4gIC8vIE11dGF0aW9uIE1ldGhvZHNcbiAgLy8gTWluaW1vbmdvIG9uIHRoZSBzZXJ2ZXIgZ2V0cyBubyBzdHViczsgaW5zdGVhZCwgYnkgZGVmYXVsdFxuICAvLyBpdCB3YWl0KClzIHVudGlsIGl0cyByZXN1bHQgaXMgcmVhZHksIHlpZWxkaW5nLlxuICAvLyBUaGlzIG1hdGNoZXMgdGhlIGJlaGF2aW9yIG9mIG1hY3JvbW9uZ28gb24gdGhlIHNlcnZlciBiZXR0ZXIuXG4gIC8vIFhYWCBzZWUgI01ldGVvclNlcnZlck51bGxcbiAgaWYgKHNlbGYuX2Nvbm5lY3Rpb24gJiYgKHNlbGYuX2Nvbm5lY3Rpb24gPT09IE1ldGVvci5zZXJ2ZXIgfHwgTWV0ZW9yLmlzQ2xpZW50KSkge1xuICAgIGNvbnN0IG0gPSB7fTtcblxuICAgIFsnaW5zZXJ0JywgJ3VwZGF0ZScsICdyZW1vdmUnXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIGNvbnN0IG1ldGhvZE5hbWUgPSBzZWxmLl9wcmVmaXggKyBtZXRob2Q7XG5cbiAgICAgIGlmIChvcHRpb25zLnVzZUV4aXN0aW5nKSB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXJQcm9wTmFtZSA9IE1ldGVvci5pc0NsaWVudCA/ICdfbWV0aG9kSGFuZGxlcnMnIDogJ21ldGhvZF9oYW5kbGVycyc7XG4gICAgICAgIC8vIERvIG5vdCB0cnkgdG8gY3JlYXRlIGFkZGl0aW9uYWwgbWV0aG9kcyBpZiB0aGlzIGhhcyBhbHJlYWR5IGJlZW4gY2FsbGVkLlxuICAgICAgICAvLyAoT3RoZXJ3aXNlIHRoZSAubWV0aG9kcygpIGNhbGwgYmVsb3cgd2lsbCB0aHJvdyBhbiBlcnJvci4pXG4gICAgICAgIGlmIChzZWxmLl9jb25uZWN0aW9uW2hhbmRsZXJQcm9wTmFtZV0gJiZcbiAgICAgICAgICB0eXBlb2Ygc2VsZi5fY29ubmVjdGlvbltoYW5kbGVyUHJvcE5hbWVdW21ldGhvZE5hbWVdID09PSAnZnVuY3Rpb24nKSByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG1bbWV0aG9kTmFtZV0gPSBmdW5jdGlvbiAoLyogLi4uICovKSB7XG4gICAgICAgIC8vIEFsbCB0aGUgbWV0aG9kcyBkbyB0aGVpciBvd24gdmFsaWRhdGlvbiwgaW5zdGVhZCBvZiB1c2luZyBjaGVjaygpLlxuICAgICAgICBjaGVjayhhcmd1bWVudHMsIFtNYXRjaC5BbnldKTtcbiAgICAgICAgY29uc3QgYXJncyA9IEFycmF5LmZyb20oYXJndW1lbnRzKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBGb3IgYW4gaW5zZXJ0LCBpZiB0aGUgY2xpZW50IGRpZG4ndCBzcGVjaWZ5IGFuIF9pZCwgZ2VuZXJhdGUgb25lXG4gICAgICAgICAgLy8gbm93OyBiZWNhdXNlIHRoaXMgdXNlcyBERFAucmFuZG9tU3RyZWFtLCBpdCB3aWxsIGJlIGNvbnNpc3RlbnQgd2l0aFxuICAgICAgICAgIC8vIHdoYXQgdGhlIGNsaWVudCBnZW5lcmF0ZWQuIFdlIGdlbmVyYXRlIGl0IG5vdyByYXRoZXIgdGhhbiBsYXRlciBzb1xuICAgICAgICAgIC8vIHRoYXQgaWYgKGVnKSBhbiBhbGxvdy9kZW55IHJ1bGUgZG9lcyBhbiBpbnNlcnQgdG8gdGhlIHNhbWVcbiAgICAgICAgICAvLyBjb2xsZWN0aW9uIChub3QgdGhhdCBpdCByZWFsbHkgc2hvdWxkKSwgdGhlIGdlbmVyYXRlZCBfaWQgd2lsbFxuICAgICAgICAgIC8vIHN0aWxsIGJlIHRoZSBmaXJzdCB1c2Ugb2YgdGhlIHN0cmVhbSBhbmQgd2lsbCBiZSBjb25zaXN0ZW50LlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gSG93ZXZlciwgd2UgZG9uJ3QgYWN0dWFsbHkgc3RpY2sgdGhlIF9pZCBvbnRvIHRoZSBkb2N1bWVudCB5ZXQsXG4gICAgICAgICAgLy8gYmVjYXVzZSB3ZSB3YW50IGFsbG93L2RlbnkgcnVsZXMgdG8gYmUgYWJsZSB0byBkaWZmZXJlbnRpYXRlXG4gICAgICAgICAgLy8gYmV0d2VlbiBhcmJpdHJhcnkgY2xpZW50LXNwZWNpZmllZCBfaWQgZmllbGRzIGFuZCBtZXJlbHlcbiAgICAgICAgICAvLyBjbGllbnQtY29udHJvbGxlZC12aWEtcmFuZG9tU2VlZCBmaWVsZHMuXG4gICAgICAgICAgbGV0IGdlbmVyYXRlZElkID0gbnVsbDtcbiAgICAgICAgICBpZiAobWV0aG9kID09PSBcImluc2VydFwiICYmICFoYXNPd24uY2FsbChhcmdzWzBdLCAnX2lkJykpIHtcbiAgICAgICAgICAgIGdlbmVyYXRlZElkID0gc2VsZi5fbWFrZU5ld0lEKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRoaXMuaXNTaW11bGF0aW9uKSB7XG4gICAgICAgICAgICAvLyBJbiBhIGNsaWVudCBzaW11bGF0aW9uLCB5b3UgY2FuIGRvIGFueSBtdXRhdGlvbiAoZXZlbiB3aXRoIGFcbiAgICAgICAgICAgIC8vIGNvbXBsZXggc2VsZWN0b3IpLlxuICAgICAgICAgICAgaWYgKGdlbmVyYXRlZElkICE9PSBudWxsKVxuICAgICAgICAgICAgICBhcmdzWzBdLl9pZCA9IGdlbmVyYXRlZElkO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb25bbWV0aG9kXS5hcHBseShcbiAgICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbiwgYXJncyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVGhpcyBpcyB0aGUgc2VydmVyIHJlY2VpdmluZyBhIG1ldGhvZCBjYWxsIGZyb20gdGhlIGNsaWVudC5cblxuICAgICAgICAgIC8vIFdlIGRvbid0IGFsbG93IGFyYml0cmFyeSBzZWxlY3RvcnMgaW4gbXV0YXRpb25zIGZyb20gdGhlIGNsaWVudDogb25seVxuICAgICAgICAgIC8vIHNpbmdsZS1JRCBzZWxlY3RvcnMuXG4gICAgICAgICAgaWYgKG1ldGhvZCAhPT0gJ2luc2VydCcpXG4gICAgICAgICAgICB0aHJvd0lmU2VsZWN0b3JJc05vdElkKGFyZ3NbMF0sIG1ldGhvZCk7XG5cbiAgICAgICAgICBpZiAoc2VsZi5fcmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgLy8gc2hvcnQgY2lyY3VpdCBpZiB0aGVyZSBpcyBubyB3YXkgaXQgd2lsbCBwYXNzLlxuICAgICAgICAgICAgaWYgKHNlbGYuX3ZhbGlkYXRvcnNbbWV0aG9kXS5hbGxvdy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcihcbiAgICAgICAgICAgICAgICA0MDMsIFwiQWNjZXNzIGRlbmllZC4gTm8gYWxsb3cgdmFsaWRhdG9ycyBzZXQgb24gcmVzdHJpY3RlZCBcIiArXG4gICAgICAgICAgICAgICAgICBcImNvbGxlY3Rpb24gZm9yIG1ldGhvZCAnXCIgKyBtZXRob2QgKyBcIicuXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0ZWRNZXRob2ROYW1lID1cbiAgICAgICAgICAgICAgICAgICdfdmFsaWRhdGVkJyArIG1ldGhvZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG1ldGhvZC5zbGljZSgxKTtcbiAgICAgICAgICAgIGFyZ3MudW5zaGlmdCh0aGlzLnVzZXJJZCk7XG4gICAgICAgICAgICBtZXRob2QgPT09ICdpbnNlcnQnICYmIGFyZ3MucHVzaChnZW5lcmF0ZWRJZCk7XG4gICAgICAgICAgICByZXR1cm4gc2VsZlt2YWxpZGF0ZWRNZXRob2ROYW1lXS5hcHBseShzZWxmLCBhcmdzKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHNlbGYuX2lzSW5zZWN1cmUoKSkge1xuICAgICAgICAgICAgaWYgKGdlbmVyYXRlZElkICE9PSBudWxsKVxuICAgICAgICAgICAgICBhcmdzWzBdLl9pZCA9IGdlbmVyYXRlZElkO1xuICAgICAgICAgICAgLy8gSW4gaW5zZWN1cmUgbW9kZSwgYWxsb3cgYW55IG11dGF0aW9uICh3aXRoIGEgc2ltcGxlIHNlbGVjdG9yKS5cbiAgICAgICAgICAgIC8vIFhYWCBUaGlzIGlzIGtpbmQgb2YgYm9ndXMuICBJbnN0ZWFkIG9mIGJsaW5kbHkgcGFzc2luZyB3aGF0ZXZlclxuICAgICAgICAgICAgLy8gICAgIHdlIGdldCBmcm9tIHRoZSBuZXR3b3JrIHRvIHRoaXMgZnVuY3Rpb24sIHdlIHNob3VsZCBhY3R1YWxseVxuICAgICAgICAgICAgLy8gICAgIGtub3cgdGhlIGNvcnJlY3QgYXJndW1lbnRzIGZvciB0aGUgZnVuY3Rpb24gYW5kIHBhc3MganVzdFxuICAgICAgICAgICAgLy8gICAgIHRoZW0uICBGb3IgZXhhbXBsZSwgaWYgeW91IGhhdmUgYW4gZXh0cmFuZW91cyBleHRyYSBudWxsXG4gICAgICAgICAgICAvLyAgICAgYXJndW1lbnQgYW5kIHRoaXMgaXMgTW9uZ28gb24gdGhlIHNlcnZlciwgdGhlIC53cmFwQXN5bmMnZFxuICAgICAgICAgICAgLy8gICAgIGZ1bmN0aW9ucyBsaWtlIHVwZGF0ZSB3aWxsIGdldCBjb25mdXNlZCBhbmQgcGFzcyB0aGVcbiAgICAgICAgICAgIC8vICAgICBcImZ1dC5yZXNvbHZlcigpXCIgaW4gdGhlIHdyb25nIHNsb3QsIHdoZXJlIF91cGRhdGUgd2lsbCBuZXZlclxuICAgICAgICAgICAgLy8gICAgIGludm9rZSBpdC4gQmFtLCBicm9rZW4gRERQIGNvbm5lY3Rpb24uICBQcm9iYWJseSBzaG91bGQganVzdFxuICAgICAgICAgICAgLy8gICAgIHRha2UgdGhpcyB3aG9sZSBtZXRob2QgYW5kIHdyaXRlIGl0IHRocmVlIHRpbWVzLCBpbnZva2luZ1xuICAgICAgICAgICAgLy8gICAgIGhlbHBlcnMgZm9yIHRoZSBjb21tb24gY29kZS5cbiAgICAgICAgICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uW21ldGhvZF0uYXBwbHkoc2VsZi5fY29sbGVjdGlvbiwgYXJncyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEluIHNlY3VyZSBtb2RlLCBpZiB3ZSBoYXZlbid0IGNhbGxlZCBhbGxvdyBvciBkZW55LCB0aGVuIG5vdGhpbmdcbiAgICAgICAgICAgIC8vIGlzIHBlcm1pdHRlZC5cbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIkFjY2VzcyBkZW5pZWRcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUubmFtZSA9PT0gJ01vbmdvRXJyb3InIHx8IGUubmFtZSA9PT0gJ01pbmltb25nb0Vycm9yJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDksIGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgc2VsZi5fY29ubmVjdGlvbi5tZXRob2RzKG0pO1xuICB9XG59O1xuXG5Db2xsZWN0aW9uUHJvdG90eXBlLl91cGRhdGVGZXRjaCA9IGZ1bmN0aW9uIChmaWVsZHMpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCFzZWxmLl92YWxpZGF0b3JzLmZldGNoQWxsRmllbGRzKSB7XG4gICAgaWYgKGZpZWxkcykge1xuICAgICAgY29uc3QgdW5pb24gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgY29uc3QgYWRkID0gbmFtZXMgPT4gbmFtZXMgJiYgbmFtZXMuZm9yRWFjaChuYW1lID0+IHVuaW9uW25hbWVdID0gMSk7XG4gICAgICBhZGQoc2VsZi5fdmFsaWRhdG9ycy5mZXRjaCk7XG4gICAgICBhZGQoZmllbGRzKTtcbiAgICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2ggPSBPYmplY3Qua2V5cyh1bmlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2hBbGxGaWVsZHMgPSB0cnVlO1xuICAgICAgLy8gY2xlYXIgZmV0Y2gganVzdCB0byBtYWtlIHN1cmUgd2UgZG9uJ3QgYWNjaWRlbnRhbGx5IHJlYWQgaXRcbiAgICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2ggPSBudWxsO1xuICAgIH1cbiAgfVxufTtcblxuQ29sbGVjdGlvblByb3RvdHlwZS5faXNJbnNlY3VyZSA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLl9pbnNlY3VyZSA9PT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiAhIVBhY2thZ2UuaW5zZWN1cmU7XG4gIHJldHVybiBzZWxmLl9pbnNlY3VyZTtcbn07XG5cbkNvbGxlY3Rpb25Qcm90b3R5cGUuX3ZhbGlkYXRlZEluc2VydCA9IGZ1bmN0aW9uICh1c2VySWQsIGRvYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlZElkKSB7XG4gIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gIC8vIGNhbGwgdXNlciB2YWxpZGF0b3JzLlxuICAvLyBBbnkgZGVueSByZXR1cm5zIHRydWUgbWVhbnMgZGVuaWVkLlxuICBpZiAoc2VsZi5fdmFsaWRhdG9ycy5pbnNlcnQuZGVueS5zb21lKCh2YWxpZGF0b3IpID0+IHtcbiAgICByZXR1cm4gdmFsaWRhdG9yKHVzZXJJZCwgZG9jVG9WYWxpZGF0ZSh2YWxpZGF0b3IsIGRvYywgZ2VuZXJhdGVkSWQpKTtcbiAgfSkpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJBY2Nlc3MgZGVuaWVkXCIpO1xuICB9XG4gIC8vIEFueSBhbGxvdyByZXR1cm5zIHRydWUgbWVhbnMgcHJvY2VlZC4gVGhyb3cgZXJyb3IgaWYgdGhleSBhbGwgZmFpbC5cbiAgaWYgKHNlbGYuX3ZhbGlkYXRvcnMuaW5zZXJ0LmFsbG93LmV2ZXJ5KCh2YWxpZGF0b3IpID0+IHtcbiAgICByZXR1cm4gIXZhbGlkYXRvcih1c2VySWQsIGRvY1RvVmFsaWRhdGUodmFsaWRhdG9yLCBkb2MsIGdlbmVyYXRlZElkKSk7XG4gIH0pKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZFwiKTtcbiAgfVxuXG4gIC8vIElmIHdlIGdlbmVyYXRlZCBhbiBJRCBhYm92ZSwgaW5zZXJ0IGl0IG5vdzogYWZ0ZXIgdGhlIHZhbGlkYXRpb24sIGJ1dFxuICAvLyBiZWZvcmUgYWN0dWFsbHkgaW5zZXJ0aW5nLlxuICBpZiAoZ2VuZXJhdGVkSWQgIT09IG51bGwpXG4gICAgZG9jLl9pZCA9IGdlbmVyYXRlZElkO1xuXG4gIHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0LmNhbGwoc2VsZi5fY29sbGVjdGlvbiwgZG9jKTtcbn07XG5cbi8vIFNpbXVsYXRlIGEgbW9uZ28gYHVwZGF0ZWAgb3BlcmF0aW9uIHdoaWxlIHZhbGlkYXRpbmcgdGhhdCB0aGUgYWNjZXNzXG4vLyBjb250cm9sIHJ1bGVzIHNldCBieSBjYWxscyB0byBgYWxsb3cvZGVueWAgYXJlIHNhdGlzZmllZC4gSWYgYWxsXG4vLyBwYXNzLCByZXdyaXRlIHRoZSBtb25nbyBvcGVyYXRpb24gdG8gdXNlICRpbiB0byBzZXQgdGhlIGxpc3Qgb2Zcbi8vIGRvY3VtZW50IGlkcyB0byBjaGFuZ2UgIyNWYWxpZGF0ZWRDaGFuZ2VcbkNvbGxlY3Rpb25Qcm90b3R5cGUuX3ZhbGlkYXRlZFVwZGF0ZSA9IGZ1bmN0aW9uKFxuICAgIHVzZXJJZCwgc2VsZWN0b3IsIG11dGF0b3IsIG9wdGlvbnMpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgY2hlY2sobXV0YXRvciwgT2JqZWN0KTtcblxuICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKG51bGwpLCBvcHRpb25zKTtcblxuICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkUGVyaGFwc0FzT2JqZWN0KHNlbGVjdG9yKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJ2YWxpZGF0ZWQgdXBkYXRlIHNob3VsZCBiZSBvZiBhIHNpbmdsZSBJRFwiKTtcblxuICAvLyBXZSBkb24ndCBzdXBwb3J0IHVwc2VydHMgYmVjYXVzZSB0aGV5IGRvbid0IGZpdCBuaWNlbHkgaW50byBhbGxvdy9kZW55XG4gIC8vIHJ1bGVzLlxuICBpZiAob3B0aW9ucy51cHNlcnQpXG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZC4gVXBzZXJ0cyBub3QgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJhbGxvd2VkIGluIGEgcmVzdHJpY3RlZCBjb2xsZWN0aW9uLlwiKTtcblxuICBjb25zdCBub1JlcGxhY2VFcnJvciA9IFwiQWNjZXNzIGRlbmllZC4gSW4gYSByZXN0cmljdGVkIGNvbGxlY3Rpb24geW91IGNhbiBvbmx5XCIgK1xuICAgICAgICBcIiB1cGRhdGUgZG9jdW1lbnRzLCBub3QgcmVwbGFjZSB0aGVtLiBVc2UgYSBNb25nbyB1cGRhdGUgb3BlcmF0b3IsIHN1Y2ggXCIgK1xuICAgICAgICBcImFzICckc2V0Jy5cIjtcblxuICBjb25zdCBtdXRhdG9yS2V5cyA9IE9iamVjdC5rZXlzKG11dGF0b3IpO1xuXG4gIC8vIGNvbXB1dGUgbW9kaWZpZWQgZmllbGRzXG4gIGNvbnN0IG1vZGlmaWVkRmllbGRzID0ge307XG5cbiAgaWYgKG11dGF0b3JLZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBub1JlcGxhY2VFcnJvcik7XG4gIH1cbiAgbXV0YXRvcktleXMuZm9yRWFjaCgob3ApID0+IHtcbiAgICBjb25zdCBwYXJhbXMgPSBtdXRhdG9yW29wXTtcbiAgICBpZiAob3AuY2hhckF0KDApICE9PSAnJCcpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBub1JlcGxhY2VFcnJvcik7XG4gICAgfSBlbHNlIGlmICghaGFzT3duLmNhbGwoQUxMT1dFRF9VUERBVEVfT1BFUkFUSU9OUywgb3ApKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFxuICAgICAgICA0MDMsIFwiQWNjZXNzIGRlbmllZC4gT3BlcmF0b3IgXCIgKyBvcCArIFwiIG5vdCBhbGxvd2VkIGluIGEgcmVzdHJpY3RlZCBjb2xsZWN0aW9uLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmtleXMocGFyYW1zKS5mb3JFYWNoKChmaWVsZCkgPT4ge1xuICAgICAgICAvLyB0cmVhdCBkb3R0ZWQgZmllbGRzIGFzIGlmIHRoZXkgYXJlIHJlcGxhY2luZyB0aGVpclxuICAgICAgICAvLyB0b3AtbGV2ZWwgcGFydFxuICAgICAgICBpZiAoZmllbGQuaW5kZXhPZignLicpICE9PSAtMSlcbiAgICAgICAgICBmaWVsZCA9IGZpZWxkLnN1YnN0cmluZygwLCBmaWVsZC5pbmRleE9mKCcuJykpO1xuXG4gICAgICAgIC8vIHJlY29yZCB0aGUgZmllbGQgd2UgYXJlIHRyeWluZyB0byBjaGFuZ2VcbiAgICAgICAgbW9kaWZpZWRGaWVsZHNbZmllbGRdID0gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgZmllbGRzID0gT2JqZWN0LmtleXMobW9kaWZpZWRGaWVsZHMpO1xuXG4gIGNvbnN0IGZpbmRPcHRpb25zID0ge3RyYW5zZm9ybTogbnVsbH07XG4gIGlmICghc2VsZi5fdmFsaWRhdG9ycy5mZXRjaEFsbEZpZWxkcykge1xuICAgIGZpbmRPcHRpb25zLmZpZWxkcyA9IHt9O1xuICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2guZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICBmaW5kT3B0aW9ucy5maWVsZHNbZmllbGROYW1lXSA9IDE7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBkb2MgPSBzZWxmLl9jb2xsZWN0aW9uLmZpbmRPbmUoc2VsZWN0b3IsIGZpbmRPcHRpb25zKTtcbiAgaWYgKCFkb2MpICAvLyBub25lIHNhdGlzZmllZCFcbiAgICByZXR1cm4gMDtcblxuICAvLyBjYWxsIHVzZXIgdmFsaWRhdG9ycy5cbiAgLy8gQW55IGRlbnkgcmV0dXJucyB0cnVlIG1lYW5zIGRlbmllZC5cbiAgaWYgKHNlbGYuX3ZhbGlkYXRvcnMudXBkYXRlLmRlbnkuc29tZSgodmFsaWRhdG9yKSA9PiB7XG4gICAgY29uc3QgZmFjdG9yaWVkRG9jID0gdHJhbnNmb3JtRG9jKHZhbGlkYXRvciwgZG9jKTtcbiAgICByZXR1cm4gdmFsaWRhdG9yKHVzZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgIGZhY3RvcmllZERvYyxcbiAgICAgICAgICAgICAgICAgICAgIGZpZWxkcyxcbiAgICAgICAgICAgICAgICAgICAgIG11dGF0b3IpO1xuICB9KSkge1xuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIkFjY2VzcyBkZW5pZWRcIik7XG4gIH1cbiAgLy8gQW55IGFsbG93IHJldHVybnMgdHJ1ZSBtZWFucyBwcm9jZWVkLiBUaHJvdyBlcnJvciBpZiB0aGV5IGFsbCBmYWlsLlxuICBpZiAoc2VsZi5fdmFsaWRhdG9ycy51cGRhdGUuYWxsb3cuZXZlcnkoKHZhbGlkYXRvcikgPT4ge1xuICAgIGNvbnN0IGZhY3RvcmllZERvYyA9IHRyYW5zZm9ybURvYyh2YWxpZGF0b3IsIGRvYyk7XG4gICAgcmV0dXJuICF2YWxpZGF0b3IodXNlcklkLFxuICAgICAgICAgICAgICAgICAgICAgIGZhY3RvcmllZERvYyxcbiAgICAgICAgICAgICAgICAgICAgICBmaWVsZHMsXG4gICAgICAgICAgICAgICAgICAgICAgbXV0YXRvcik7XG4gIH0pKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZFwiKTtcbiAgfVxuXG4gIG9wdGlvbnMuX2ZvcmJpZFJlcGxhY2UgPSB0cnVlO1xuXG4gIC8vIEJhY2sgd2hlbiB3ZSBzdXBwb3J0ZWQgYXJiaXRyYXJ5IGNsaWVudC1wcm92aWRlZCBzZWxlY3RvcnMsIHdlIGFjdHVhbGx5XG4gIC8vIHJld3JvdGUgdGhlIHNlbGVjdG9yIHRvIGluY2x1ZGUgYW4gX2lkIGNsYXVzZSBiZWZvcmUgcGFzc2luZyB0byBNb25nbyB0b1xuICAvLyBhdm9pZCByYWNlcywgYnV0IHNpbmNlIHNlbGVjdG9yIGlzIGd1YXJhbnRlZWQgdG8gYWxyZWFkeSBqdXN0IGJlIGFuIElELCB3ZVxuICAvLyBkb24ndCBoYXZlIHRvIGFueSBtb3JlLlxuXG4gIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLnVwZGF0ZS5jYWxsKFxuICAgIHNlbGYuX2NvbGxlY3Rpb24sIHNlbGVjdG9yLCBtdXRhdG9yLCBvcHRpb25zKTtcbn07XG5cbi8vIE9ubHkgYWxsb3cgdGhlc2Ugb3BlcmF0aW9ucyBpbiB2YWxpZGF0ZWQgdXBkYXRlcy4gU3BlY2lmaWNhbGx5XG4vLyB3aGl0ZWxpc3Qgb3BlcmF0aW9ucywgcmF0aGVyIHRoYW4gYmxhY2tsaXN0LCBzbyBuZXcgY29tcGxleFxuLy8gb3BlcmF0aW9ucyB0aGF0IGFyZSBhZGRlZCBhcmVuJ3QgYXV0b21hdGljYWxseSBhbGxvd2VkLiBBIGNvbXBsZXhcbi8vIG9wZXJhdGlvbiBpcyBvbmUgdGhhdCBkb2VzIG1vcmUgdGhhbiBqdXN0IG1vZGlmeSBpdHMgdGFyZ2V0XG4vLyBmaWVsZC4gRm9yIG5vdyB0aGlzIGNvbnRhaW5zIGFsbCB1cGRhdGUgb3BlcmF0aW9ucyBleGNlcHQgJyRyZW5hbWUnLlxuLy8gaHR0cDovL2RvY3MubW9uZ29kYi5vcmcvbWFudWFsL3JlZmVyZW5jZS9vcGVyYXRvcnMvI3VwZGF0ZVxuY29uc3QgQUxMT1dFRF9VUERBVEVfT1BFUkFUSU9OUyA9IHtcbiAgJGluYzoxLCAkc2V0OjEsICR1bnNldDoxLCAkYWRkVG9TZXQ6MSwgJHBvcDoxLCAkcHVsbEFsbDoxLCAkcHVsbDoxLFxuICAkcHVzaEFsbDoxLCAkcHVzaDoxLCAkYml0OjFcbn07XG5cbi8vIFNpbXVsYXRlIGEgbW9uZ28gYHJlbW92ZWAgb3BlcmF0aW9uIHdoaWxlIHZhbGlkYXRpbmcgYWNjZXNzIGNvbnRyb2xcbi8vIHJ1bGVzLiBTZWUgI1ZhbGlkYXRlZENoYW5nZVxuQ29sbGVjdGlvblByb3RvdHlwZS5fdmFsaWRhdGVkUmVtb3ZlID0gZnVuY3Rpb24odXNlcklkLCBzZWxlY3Rvcikge1xuICBjb25zdCBzZWxmID0gdGhpcztcblxuICBjb25zdCBmaW5kT3B0aW9ucyA9IHt0cmFuc2Zvcm06IG51bGx9O1xuICBpZiAoIXNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2hBbGxGaWVsZHMpIHtcbiAgICBmaW5kT3B0aW9ucy5maWVsZHMgPSB7fTtcbiAgICBzZWxmLl92YWxpZGF0b3JzLmZldGNoLmZvckVhY2goKGZpZWxkTmFtZSkgPT4ge1xuICAgICAgZmluZE9wdGlvbnMuZmllbGRzW2ZpZWxkTmFtZV0gPSAxO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgZG9jID0gc2VsZi5fY29sbGVjdGlvbi5maW5kT25lKHNlbGVjdG9yLCBmaW5kT3B0aW9ucyk7XG4gIGlmICghZG9jKVxuICAgIHJldHVybiAwO1xuXG4gIC8vIGNhbGwgdXNlciB2YWxpZGF0b3JzLlxuICAvLyBBbnkgZGVueSByZXR1cm5zIHRydWUgbWVhbnMgZGVuaWVkLlxuICBpZiAoc2VsZi5fdmFsaWRhdG9ycy5yZW1vdmUuZGVueS5zb21lKCh2YWxpZGF0b3IpID0+IHtcbiAgICByZXR1cm4gdmFsaWRhdG9yKHVzZXJJZCwgdHJhbnNmb3JtRG9jKHZhbGlkYXRvciwgZG9jKSk7XG4gIH0pKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZFwiKTtcbiAgfVxuICAvLyBBbnkgYWxsb3cgcmV0dXJucyB0cnVlIG1lYW5zIHByb2NlZWQuIFRocm93IGVycm9yIGlmIHRoZXkgYWxsIGZhaWwuXG4gIGlmIChzZWxmLl92YWxpZGF0b3JzLnJlbW92ZS5hbGxvdy5ldmVyeSgodmFsaWRhdG9yKSA9PiB7XG4gICAgcmV0dXJuICF2YWxpZGF0b3IodXNlcklkLCB0cmFuc2Zvcm1Eb2ModmFsaWRhdG9yLCBkb2MpKTtcbiAgfSkpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJBY2Nlc3MgZGVuaWVkXCIpO1xuICB9XG5cbiAgLy8gQmFjayB3aGVuIHdlIHN1cHBvcnRlZCBhcmJpdHJhcnkgY2xpZW50LXByb3ZpZGVkIHNlbGVjdG9ycywgd2UgYWN0dWFsbHlcbiAgLy8gcmV3cm90ZSB0aGUgc2VsZWN0b3IgdG8ge19pZDogeyRpbjogW2lkcyB0aGF0IHdlIGZvdW5kXX19IGJlZm9yZSBwYXNzaW5nIHRvXG4gIC8vIE1vbmdvIHRvIGF2b2lkIHJhY2VzLCBidXQgc2luY2Ugc2VsZWN0b3IgaXMgZ3VhcmFudGVlZCB0byBhbHJlYWR5IGp1c3QgYmVcbiAgLy8gYW4gSUQsIHdlIGRvbid0IGhhdmUgdG8gYW55IG1vcmUuXG5cbiAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24ucmVtb3ZlLmNhbGwoc2VsZi5fY29sbGVjdGlvbiwgc2VsZWN0b3IpO1xufTtcblxuQ29sbGVjdGlvblByb3RvdHlwZS5fY2FsbE11dGF0b3JNZXRob2QgPSBmdW5jdGlvbiBfY2FsbE11dGF0b3JNZXRob2QobmFtZSwgYXJncywgY2FsbGJhY2spIHtcbiAgaWYgKE1ldGVvci5pc0NsaWVudCAmJiAhY2FsbGJhY2sgJiYgIWFscmVhZHlJblNpbXVsYXRpb24oKSkge1xuICAgIC8vIENsaWVudCBjYW4ndCBibG9jaywgc28gaXQgY2FuJ3QgcmVwb3J0IGVycm9ycyBieSBleGNlcHRpb24sXG4gICAgLy8gb25seSBieSBjYWxsYmFjay4gSWYgdGhleSBmb3JnZXQgdGhlIGNhbGxiYWNrLCBnaXZlIHRoZW0gYVxuICAgIC8vIGRlZmF1bHQgb25lIHRoYXQgbG9ncyB0aGUgZXJyb3IsIHNvIHRoZXkgYXJlbid0IHRvdGFsbHlcbiAgICAvLyBiYWZmbGVkIGlmIHRoZWlyIHdyaXRlcyBkb24ndCB3b3JrIGJlY2F1c2UgdGhlaXIgZGF0YWJhc2UgaXNcbiAgICAvLyBkb3duLlxuICAgIC8vIERvbid0IGdpdmUgYSBkZWZhdWx0IGNhbGxiYWNrIGluIHNpbXVsYXRpb24sIGJlY2F1c2UgaW5zaWRlIHN0dWJzIHdlXG4gICAgLy8gd2FudCB0byByZXR1cm4gdGhlIHJlc3VsdHMgZnJvbSB0aGUgbG9jYWwgY29sbGVjdGlvbiBpbW1lZGlhdGVseSBhbmRcbiAgICAvLyBub3QgZm9yY2UgYSBjYWxsYmFjay5cbiAgICBjYWxsYmFjayA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIGlmIChlcnIpXG4gICAgICAgIE1ldGVvci5fZGVidWcobmFtZSArIFwiIGZhaWxlZDogXCIgKyAoZXJyLnJlYXNvbiB8fCBlcnIuc3RhY2spKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gRm9yIHR3byBvdXQgb2YgdGhyZWUgbXV0YXRvciBtZXRob2RzLCB0aGUgZmlyc3QgYXJndW1lbnQgaXMgYSBzZWxlY3RvclxuICBjb25zdCBmaXJzdEFyZ0lzU2VsZWN0b3IgPSBuYW1lID09PSBcInVwZGF0ZVwiIHx8IG5hbWUgPT09IFwicmVtb3ZlXCI7XG4gIGlmIChmaXJzdEFyZ0lzU2VsZWN0b3IgJiYgIWFscmVhZHlJblNpbXVsYXRpb24oKSkge1xuICAgIC8vIElmIHdlJ3JlIGFib3V0IHRvIGFjdHVhbGx5IHNlbmQgYW4gUlBDLCB3ZSBzaG91bGQgdGhyb3cgYW4gZXJyb3IgaWZcbiAgICAvLyB0aGlzIGlzIGEgbm9uLUlEIHNlbGVjdG9yLCBiZWNhdXNlIHRoZSBtdXRhdGlvbiBtZXRob2RzIG9ubHkgYWxsb3dcbiAgICAvLyBzaW5nbGUtSUQgc2VsZWN0b3JzLiAoSWYgd2UgZG9uJ3QgdGhyb3cgaGVyZSwgd2UnbGwgc2VlIGZsaWNrZXIuKVxuICAgIHRocm93SWZTZWxlY3RvcklzTm90SWQoYXJnc1swXSwgbmFtZSk7XG4gIH1cblxuICBjb25zdCBtdXRhdG9yTWV0aG9kTmFtZSA9IHRoaXMuX3ByZWZpeCArIG5hbWU7XG4gIHJldHVybiB0aGlzLl9jb25uZWN0aW9uLmFwcGx5KFxuICAgIG11dGF0b3JNZXRob2ROYW1lLCBhcmdzLCB7IHJldHVyblN0dWJWYWx1ZTogdHJ1ZSB9LCBjYWxsYmFjayk7XG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybURvYyh2YWxpZGF0b3IsIGRvYykge1xuICBpZiAodmFsaWRhdG9yLnRyYW5zZm9ybSlcbiAgICByZXR1cm4gdmFsaWRhdG9yLnRyYW5zZm9ybShkb2MpO1xuICByZXR1cm4gZG9jO1xufVxuXG5mdW5jdGlvbiBkb2NUb1ZhbGlkYXRlKHZhbGlkYXRvciwgZG9jLCBnZW5lcmF0ZWRJZCkge1xuICBsZXQgcmV0ID0gZG9jO1xuICBpZiAodmFsaWRhdG9yLnRyYW5zZm9ybSkge1xuICAgIHJldCA9IEVKU09OLmNsb25lKGRvYyk7XG4gICAgLy8gSWYgeW91IHNldCBhIHNlcnZlci1zaWRlIHRyYW5zZm9ybSBvbiB5b3VyIGNvbGxlY3Rpb24sIHRoZW4geW91IGRvbid0IGdldFxuICAgIC8vIHRvIHRlbGwgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBcImNsaWVudCBzcGVjaWZpZWQgdGhlIElEXCIgYW5kIFwic2VydmVyXG4gICAgLy8gZ2VuZXJhdGVkIHRoZSBJRFwiLCBiZWNhdXNlIHRyYW5zZm9ybXMgZXhwZWN0IHRvIGdldCBfaWQuICBJZiB5b3Ugd2FudCB0b1xuICAgIC8vIGRvIHRoYXQgY2hlY2ssIHlvdSBjYW4gZG8gaXQgd2l0aCBhIHNwZWNpZmljXG4gICAgLy8gYEMuYWxsb3coe2luc2VydDogZiwgdHJhbnNmb3JtOiBudWxsfSlgIHZhbGlkYXRvci5cbiAgICBpZiAoZ2VuZXJhdGVkSWQgIT09IG51bGwpIHtcbiAgICAgIHJldC5faWQgPSBnZW5lcmF0ZWRJZDtcbiAgICB9XG4gICAgcmV0ID0gdmFsaWRhdG9yLnRyYW5zZm9ybShyZXQpO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGFkZFZhbGlkYXRvcihjb2xsZWN0aW9uLCBhbGxvd09yRGVueSwgb3B0aW9ucykge1xuICAvLyB2YWxpZGF0ZSBrZXlzXG4gIGNvbnN0IHZhbGlkS2V5c1JlZ0V4ID0gL14oPzppbnNlcnR8dXBkYXRlfHJlbW92ZXxmZXRjaHx0cmFuc2Zvcm0pJC87XG4gIE9iamVjdC5rZXlzKG9wdGlvbnMpLmZvckVhY2goKGtleSkgPT4ge1xuICAgIGlmICghdmFsaWRLZXlzUmVnRXgudGVzdChrZXkpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGFsbG93T3JEZW55ICsgXCI6IEludmFsaWQga2V5OiBcIiArIGtleSk7XG4gIH0pO1xuXG4gIGNvbGxlY3Rpb24uX3Jlc3RyaWN0ZWQgPSB0cnVlO1xuXG4gIFsnaW5zZXJ0JywgJ3VwZGF0ZScsICdyZW1vdmUnXS5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgaWYgKGhhc093bi5jYWxsKG9wdGlvbnMsIG5hbWUpKSB7XG4gICAgICBpZiAoIShvcHRpb25zW25hbWVdIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihhbGxvd09yRGVueSArIFwiOiBWYWx1ZSBmb3IgYFwiICsgbmFtZSArIFwiYCBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSB0cmFuc2Zvcm0gaXMgc3BlY2lmaWVkIGF0IGFsbCAoaW5jbHVkaW5nIGFzICdudWxsJykgaW4gdGhpc1xuICAgICAgLy8gY2FsbCwgdGhlbiB0YWtlIHRoYXQ7IG90aGVyd2lzZSwgdGFrZSB0aGUgdHJhbnNmb3JtIGZyb20gdGhlXG4gICAgICAvLyBjb2xsZWN0aW9uLlxuICAgICAgaWYgKG9wdGlvbnMudHJhbnNmb3JtID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3B0aW9uc1tuYW1lXS50cmFuc2Zvcm0gPSBjb2xsZWN0aW9uLl90cmFuc2Zvcm07ICAvLyBhbHJlYWR5IHdyYXBwZWRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9wdGlvbnNbbmFtZV0udHJhbnNmb3JtID0gTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0oXG4gICAgICAgICAgb3B0aW9ucy50cmFuc2Zvcm0pO1xuICAgICAgfVxuXG4gICAgICBjb2xsZWN0aW9uLl92YWxpZGF0b3JzW25hbWVdW2FsbG93T3JEZW55XS5wdXNoKG9wdGlvbnNbbmFtZV0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gT25seSB1cGRhdGUgdGhlIGZldGNoIGZpZWxkcyBpZiB3ZSdyZSBwYXNzZWQgdGhpbmdzIHRoYXQgYWZmZWN0XG4gIC8vIGZldGNoaW5nLiBUaGlzIHdheSBhbGxvdyh7fSkgYW5kIGFsbG93KHtpbnNlcnQ6IGZ9KSBkb24ndCByZXN1bHQgaW5cbiAgLy8gc2V0dGluZyBmZXRjaEFsbEZpZWxkc1xuICBpZiAob3B0aW9ucy51cGRhdGUgfHwgb3B0aW9ucy5yZW1vdmUgfHwgb3B0aW9ucy5mZXRjaCkge1xuICAgIGlmIChvcHRpb25zLmZldGNoICYmICEob3B0aW9ucy5mZXRjaCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGFsbG93T3JEZW55ICsgXCI6IFZhbHVlIGZvciBgZmV0Y2hgIG11c3QgYmUgYW4gYXJyYXlcIik7XG4gICAgfVxuICAgIGNvbGxlY3Rpb24uX3VwZGF0ZUZldGNoKG9wdGlvbnMuZmV0Y2gpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRocm93SWZTZWxlY3RvcklzTm90SWQoc2VsZWN0b3IsIG1ldGhvZE5hbWUpIHtcbiAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZFBlcmhhcHNBc09iamVjdChzZWxlY3RvcikpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFxuICAgICAgNDAzLCBcIk5vdCBwZXJtaXR0ZWQuIFVudHJ1c3RlZCBjb2RlIG1heSBvbmx5IFwiICsgbWV0aG9kTmFtZSArXG4gICAgICAgIFwiIGRvY3VtZW50cyBieSBJRC5cIik7XG4gIH1cbn07XG5cbi8vIERldGVybWluZSBpZiB3ZSBhcmUgaW4gYSBERFAgbWV0aG9kIHNpbXVsYXRpb25cbmZ1bmN0aW9uIGFscmVhZHlJblNpbXVsYXRpb24oKSB7XG4gIHZhciBDdXJyZW50SW52b2NhdGlvbiA9XG4gICAgRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbiB8fFxuICAgIC8vIEZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSwgYXMgZXhwbGFpbmVkIGluIHRoaXMgaXNzdWU6XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzg5NDdcbiAgICBERFAuX0N1cnJlbnRJbnZvY2F0aW9uO1xuXG4gIGNvbnN0IGVuY2xvc2luZyA9IEN1cnJlbnRJbnZvY2F0aW9uLmdldCgpO1xuICByZXR1cm4gZW5jbG9zaW5nICYmIGVuY2xvc2luZy5pc1NpbXVsYXRpb247XG59XG4iXX0=
