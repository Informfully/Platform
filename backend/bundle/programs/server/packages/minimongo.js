(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var GeoJSON = Package['geojson-utils'].GeoJSON;
var IdMap = Package['id-map'].IdMap;
var MongoID = Package['mongo-id'].MongoID;
var OrderedDict = Package['ordered-dict'].OrderedDict;
var Random = Package.random.Random;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Decimal = Package['mongo-decimal'].Decimal;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var operand, selectorValue, MinimongoTest, MinimongoError, selector, doc, callback, options, oldResults, a, b, LocalCollection, Minimongo;

var require = meteorInstall({"node_modules":{"meteor":{"minimongo":{"minimongo_server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_server.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("./minimongo_common.js");
let hasOwn, isNumericKey, isOperatorObject, pathsToTree, projectionDetails;
module.link("./common.js", {
  hasOwn(v) {
    hasOwn = v;
  },

  isNumericKey(v) {
    isNumericKey = v;
  },

  isOperatorObject(v) {
    isOperatorObject = v;
  },

  pathsToTree(v) {
    pathsToTree = v;
  },

  projectionDetails(v) {
    projectionDetails = v;
  }

}, 0);

Minimongo._pathsElidingNumericKeys = paths => paths.map(path => path.split('.').filter(part => !isNumericKey(part)).join('.')); // Returns true if the modifier applied to some document may change the result
// of matching the document by selector
// The modifier is always in a form of Object:
//  - $set
//    - 'a.b.22.z': value
//    - 'foo.bar': 42
//  - $unset
//    - 'abc.d': 1


Minimongo.Matcher.prototype.affectedByModifier = function (modifier) {
  // safe check for $set/$unset being objects
  modifier = Object.assign({
    $set: {},
    $unset: {}
  }, modifier);

  const meaningfulPaths = this._getPaths();

  const modifiedPaths = [].concat(Object.keys(modifier.$set), Object.keys(modifier.$unset));
  return modifiedPaths.some(path => {
    const mod = path.split('.');
    return meaningfulPaths.some(meaningfulPath => {
      const sel = meaningfulPath.split('.');
      let i = 0,
          j = 0;

      while (i < sel.length && j < mod.length) {
        if (isNumericKey(sel[i]) && isNumericKey(mod[j])) {
          // foo.4.bar selector affected by foo.4 modifier
          // foo.3.bar selector unaffected by foo.4 modifier
          if (sel[i] === mod[j]) {
            i++;
            j++;
          } else {
            return false;
          }
        } else if (isNumericKey(sel[i])) {
          // foo.4.bar selector unaffected by foo.bar modifier
          return false;
        } else if (isNumericKey(mod[j])) {
          j++;
        } else if (sel[i] === mod[j]) {
          i++;
          j++;
        } else {
          return false;
        }
      } // One is a prefix of another, taking numeric fields into account


      return true;
    });
  });
}; // @param modifier - Object: MongoDB-styled modifier with `$set`s and `$unsets`
//                           only. (assumed to come from oplog)
// @returns - Boolean: if after applying the modifier, selector can start
//                     accepting the modified value.
// NOTE: assumes that document affected by modifier didn't match this Matcher
// before, so if modifier can't convince selector in a positive change it would
// stay 'false'.
// Currently doesn't support $-operators and numeric indices precisely.


Minimongo.Matcher.prototype.canBecomeTrueByModifier = function (modifier) {
  if (!this.affectedByModifier(modifier)) {
    return false;
  }

  if (!this.isSimple()) {
    return true;
  }

  modifier = Object.assign({
    $set: {},
    $unset: {}
  }, modifier);
  const modifierPaths = [].concat(Object.keys(modifier.$set), Object.keys(modifier.$unset));

  if (this._getPaths().some(pathHasNumericKeys) || modifierPaths.some(pathHasNumericKeys)) {
    return true;
  } // check if there is a $set or $unset that indicates something is an
  // object rather than a scalar in the actual object where we saw $-operator
  // NOTE: it is correct since we allow only scalars in $-operators
  // Example: for selector {'a.b': {$gt: 5}} the modifier {'a.b.c':7} would
  // definitely set the result to false as 'a.b' appears to be an object.


  const expectedScalarIsObject = Object.keys(this._selector).some(path => {
    if (!isOperatorObject(this._selector[path])) {
      return false;
    }

    return modifierPaths.some(modifierPath => modifierPath.startsWith("".concat(path, ".")));
  });

  if (expectedScalarIsObject) {
    return false;
  } // See if we can apply the modifier on the ideally matching object. If it
  // still matches the selector, then the modifier could have turned the real
  // object in the database into something matching.


  const matchingDocument = EJSON.clone(this.matchingDocument()); // The selector is too complex, anything can happen.

  if (matchingDocument === null) {
    return true;
  }

  try {
    LocalCollection._modify(matchingDocument, modifier);
  } catch (error) {
    // Couldn't set a property on a field which is a scalar or null in the
    // selector.
    // Example:
    // real document: { 'a.b': 3 }
    // selector: { 'a': 12 }
    // converted selector (ideal document): { 'a': 12 }
    // modifier: { $set: { 'a.b': 4 } }
    // We don't know what real document was like but from the error raised by
    // $set on a scalar field we can reason that the structure of real document
    // is completely different.
    if (error.name === 'MinimongoError' && error.setPropertyError) {
      return false;
    }

    throw error;
  }

  return this.documentMatches(matchingDocument).result;
}; // Knows how to combine a mongo selector and a fields projection to a new fields
// projection taking into account active fields from the passed selector.
// @returns Object - projection object (same as fields option of mongo cursor)


Minimongo.Matcher.prototype.combineIntoProjection = function (projection) {
  const selectorPaths = Minimongo._pathsElidingNumericKeys(this._getPaths()); // Special case for $where operator in the selector - projection should depend
  // on all fields of the document. getSelectorPaths returns a list of paths
  // selector depends on. If one of the paths is '' (empty string) representing
  // the root or the whole document, complete projection should be returned.


  if (selectorPaths.includes('')) {
    return {};
  }

  return combineImportantPathsIntoProjection(selectorPaths, projection);
}; // Returns an object that would match the selector if possible or null if the
// selector is too complex for us to analyze
// { 'a.b': { ans: 42 }, 'foo.bar': null, 'foo.baz': "something" }
// => { a: { b: { ans: 42 } }, foo: { bar: null, baz: "something" } }


Minimongo.Matcher.prototype.matchingDocument = function () {
  // check if it was computed before
  if (this._matchingDocument !== undefined) {
    return this._matchingDocument;
  } // If the analysis of this selector is too hard for our implementation
  // fallback to "YES"


  let fallback = false;
  this._matchingDocument = pathsToTree(this._getPaths(), path => {
    const valueSelector = this._selector[path];

    if (isOperatorObject(valueSelector)) {
      // if there is a strict equality, there is a good
      // chance we can use one of those as "matching"
      // dummy value
      if (valueSelector.$eq) {
        return valueSelector.$eq;
      }

      if (valueSelector.$in) {
        const matcher = new Minimongo.Matcher({
          placeholder: valueSelector
        }); // Return anything from $in that matches the whole selector for this
        // path. If nothing matches, returns `undefined` as nothing can make
        // this selector into `true`.

        return valueSelector.$in.find(placeholder => matcher.documentMatches({
          placeholder
        }).result);
      }

      if (onlyContainsKeys(valueSelector, ['$gt', '$gte', '$lt', '$lte'])) {
        let lowerBound = -Infinity;
        let upperBound = Infinity;
        ['$lte', '$lt'].forEach(op => {
          if (hasOwn.call(valueSelector, op) && valueSelector[op] < upperBound) {
            upperBound = valueSelector[op];
          }
        });
        ['$gte', '$gt'].forEach(op => {
          if (hasOwn.call(valueSelector, op) && valueSelector[op] > lowerBound) {
            lowerBound = valueSelector[op];
          }
        });
        const middle = (lowerBound + upperBound) / 2;
        const matcher = new Minimongo.Matcher({
          placeholder: valueSelector
        });

        if (!matcher.documentMatches({
          placeholder: middle
        }).result && (middle === lowerBound || middle === upperBound)) {
          fallback = true;
        }

        return middle;
      }

      if (onlyContainsKeys(valueSelector, ['$nin', '$ne'])) {
        // Since this._isSimple makes sure $nin and $ne are not combined with
        // objects or arrays, we can confidently return an empty object as it
        // never matches any scalar.
        return {};
      }

      fallback = true;
    }

    return this._selector[path];
  }, x => x);

  if (fallback) {
    this._matchingDocument = null;
  }

  return this._matchingDocument;
}; // Minimongo.Sorter gets a similar method, which delegates to a Matcher it made
// for this exact purpose.


Minimongo.Sorter.prototype.affectedByModifier = function (modifier) {
  return this._selectorForAffectedByModifier.affectedByModifier(modifier);
};

Minimongo.Sorter.prototype.combineIntoProjection = function (projection) {
  return combineImportantPathsIntoProjection(Minimongo._pathsElidingNumericKeys(this._getPaths()), projection);
};

function combineImportantPathsIntoProjection(paths, projection) {
  const details = projectionDetails(projection); // merge the paths to include

  const tree = pathsToTree(paths, path => true, (node, path, fullPath) => true, details.tree);
  const mergedProjection = treeToPaths(tree);

  if (details.including) {
    // both selector and projection are pointing on fields to include
    // so we can just return the merged tree
    return mergedProjection;
  } // selector is pointing at fields to include
  // projection is pointing at fields to exclude
  // make sure we don't exclude important paths


  const mergedExclProjection = {};
  Object.keys(mergedProjection).forEach(path => {
    if (!mergedProjection[path]) {
      mergedExclProjection[path] = false;
    }
  });
  return mergedExclProjection;
}

function getPaths(selector) {
  return Object.keys(new Minimongo.Matcher(selector)._paths); // XXX remove it?
  // return Object.keys(selector).map(k => {
  //   // we don't know how to handle $where because it can be anything
  //   if (k === '$where') {
  //     return ''; // matches everything
  //   }
  //   // we branch from $or/$and/$nor operator
  //   if (['$or', '$and', '$nor'].includes(k)) {
  //     return selector[k].map(getPaths);
  //   }
  //   // the value is a literal or some comparison operator
  //   return k;
  // })
  //   .reduce((a, b) => a.concat(b), [])
  //   .filter((a, b, c) => c.indexOf(a) === b);
} // A helper to ensure object has only certain keys


function onlyContainsKeys(obj, keys) {
  return Object.keys(obj).every(k => keys.includes(k));
}

function pathHasNumericKeys(path) {
  return path.split('.').some(isNumericKey);
} // Returns a set of key paths similar to
// { 'foo.bar': 1, 'a.b.c': 1 }


function treeToPaths(tree) {
  let prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  const result = {};
  Object.keys(tree).forEach(key => {
    const value = tree[key];

    if (value === Object(value)) {
      Object.assign(result, treeToPaths(value, "".concat(prefix + key, ".")));
    } else {
      result[prefix + key] = value;
    }
  });
  return result;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"common.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/common.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  hasOwn: () => hasOwn,
  ELEMENT_OPERATORS: () => ELEMENT_OPERATORS,
  compileDocumentSelector: () => compileDocumentSelector,
  equalityElementMatcher: () => equalityElementMatcher,
  expandArraysInBranches: () => expandArraysInBranches,
  isIndexable: () => isIndexable,
  isNumericKey: () => isNumericKey,
  isOperatorObject: () => isOperatorObject,
  makeLookupFunction: () => makeLookupFunction,
  nothingMatcher: () => nothingMatcher,
  pathsToTree: () => pathsToTree,
  populateDocumentWithQueryFields: () => populateDocumentWithQueryFields,
  projectionDetails: () => projectionDetails,
  regexpElementMatcher: () => regexpElementMatcher
});
let LocalCollection;
module.link("./local_collection.js", {
  default(v) {
    LocalCollection = v;
  }

}, 0);
const hasOwn = Object.prototype.hasOwnProperty;
const ELEMENT_OPERATORS = {
  $lt: makeInequality(cmpValue => cmpValue < 0),
  $gt: makeInequality(cmpValue => cmpValue > 0),
  $lte: makeInequality(cmpValue => cmpValue <= 0),
  $gte: makeInequality(cmpValue => cmpValue >= 0),
  $mod: {
    compileElementSelector(operand) {
      if (!(Array.isArray(operand) && operand.length === 2 && typeof operand[0] === 'number' && typeof operand[1] === 'number')) {
        throw Error('argument to $mod must be an array of two numbers');
      } // XXX could require to be ints or round or something


      const divisor = operand[0];
      const remainder = operand[1];
      return value => typeof value === 'number' && value % divisor === remainder;
    }

  },
  $in: {
    compileElementSelector(operand) {
      if (!Array.isArray(operand)) {
        throw Error('$in needs an array');
      }

      const elementMatchers = operand.map(option => {
        if (option instanceof RegExp) {
          return regexpElementMatcher(option);
        }

        if (isOperatorObject(option)) {
          throw Error('cannot nest $ under $in');
        }

        return equalityElementMatcher(option);
      });
      return value => {
        // Allow {a: {$in: [null]}} to match when 'a' does not exist.
        if (value === undefined) {
          value = null;
        }

        return elementMatchers.some(matcher => matcher(value));
      };
    }

  },
  $size: {
    // {a: [[5, 5]]} must match {a: {$size: 1}} but not {a: {$size: 2}}, so we
    // don't want to consider the element [5,5] in the leaf array [[5,5]] as a
    // possible value.
    dontExpandLeafArrays: true,

    compileElementSelector(operand) {
      if (typeof operand === 'string') {
        // Don't ask me why, but by experimentation, this seems to be what Mongo
        // does.
        operand = 0;
      } else if (typeof operand !== 'number') {
        throw Error('$size needs a number');
      }

      return value => Array.isArray(value) && value.length === operand;
    }

  },
  $type: {
    // {a: [5]} must not match {a: {$type: 4}} (4 means array), but it should
    // match {a: {$type: 1}} (1 means number), and {a: [[5]]} must match {$a:
    // {$type: 4}}. Thus, when we see a leaf array, we *should* expand it but
    // should *not* include it itself.
    dontIncludeLeafArrays: true,

    compileElementSelector(operand) {
      if (typeof operand === 'string') {
        const operandAliasMap = {
          'double': 1,
          'string': 2,
          'object': 3,
          'array': 4,
          'binData': 5,
          'undefined': 6,
          'objectId': 7,
          'bool': 8,
          'date': 9,
          'null': 10,
          'regex': 11,
          'dbPointer': 12,
          'javascript': 13,
          'symbol': 14,
          'javascriptWithScope': 15,
          'int': 16,
          'timestamp': 17,
          'long': 18,
          'decimal': 19,
          'minKey': -1,
          'maxKey': 127
        };

        if (!hasOwn.call(operandAliasMap, operand)) {
          throw Error("unknown string alias for $type: ".concat(operand));
        }

        operand = operandAliasMap[operand];
      } else if (typeof operand === 'number') {
        if (operand === 0 || operand < -1 || operand > 19 && operand !== 127) {
          throw Error("Invalid numerical $type code: ".concat(operand));
        }
      } else {
        throw Error('argument to $type is not a number or a string');
      }

      return value => value !== undefined && LocalCollection._f._type(value) === operand;
    }

  },
  $bitsAllSet: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAllSet');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.every((byte, i) => (bitmask[i] & byte) === byte);
      };
    }

  },
  $bitsAnySet: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAnySet');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.some((byte, i) => (~bitmask[i] & byte) !== byte);
      };
    }

  },
  $bitsAllClear: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAllClear');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.every((byte, i) => !(bitmask[i] & byte));
      };
    }

  },
  $bitsAnyClear: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAnyClear');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.some((byte, i) => (bitmask[i] & byte) !== byte);
      };
    }

  },
  $regex: {
    compileElementSelector(operand, valueSelector) {
      if (!(typeof operand === 'string' || operand instanceof RegExp)) {
        throw Error('$regex has to be a string or RegExp');
      }

      let regexp;

      if (valueSelector.$options !== undefined) {
        // Options passed in $options (even the empty string) always overrides
        // options in the RegExp object itself.
        // Be clear that we only support the JS-supported options, not extended
        // ones (eg, Mongo supports x and s). Ideally we would implement x and s
        // by transforming the regexp, but not today...
        if (/[^gim]/.test(valueSelector.$options)) {
          throw new Error('Only the i, m, and g regexp options are supported');
        }

        const source = operand instanceof RegExp ? operand.source : operand;
        regexp = new RegExp(source, valueSelector.$options);
      } else if (operand instanceof RegExp) {
        regexp = operand;
      } else {
        regexp = new RegExp(operand);
      }

      return regexpElementMatcher(regexp);
    }

  },
  $elemMatch: {
    dontExpandLeafArrays: true,

    compileElementSelector(operand, valueSelector, matcher) {
      if (!LocalCollection._isPlainObject(operand)) {
        throw Error('$elemMatch need an object');
      }

      const isDocMatcher = !isOperatorObject(Object.keys(operand).filter(key => !hasOwn.call(LOGICAL_OPERATORS, key)).reduce((a, b) => Object.assign(a, {
        [b]: operand[b]
      }), {}), true);
      let subMatcher;

      if (isDocMatcher) {
        // This is NOT the same as compileValueSelector(operand), and not just
        // because of the slightly different calling convention.
        // {$elemMatch: {x: 3}} means "an element has a field x:3", not
        // "consists only of a field x:3". Also, regexps and sub-$ are allowed.
        subMatcher = compileDocumentSelector(operand, matcher, {
          inElemMatch: true
        });
      } else {
        subMatcher = compileValueSelector(operand, matcher);
      }

      return value => {
        if (!Array.isArray(value)) {
          return false;
        }

        for (let i = 0; i < value.length; ++i) {
          const arrayElement = value[i];
          let arg;

          if (isDocMatcher) {
            // We can only match {$elemMatch: {b: 3}} against objects.
            // (We can also match against arrays, if there's numeric indices,
            // eg {$elemMatch: {'0.b': 3}} or {$elemMatch: {0: 3}}.)
            if (!isIndexable(arrayElement)) {
              return false;
            }

            arg = arrayElement;
          } else {
            // dontIterate ensures that {a: {$elemMatch: {$gt: 5}}} matches
            // {a: [8]} but not {a: [[8]]}
            arg = [{
              value: arrayElement,
              dontIterate: true
            }];
          } // XXX support $near in $elemMatch by propagating $distance?


          if (subMatcher(arg).result) {
            return i; // specially understood to mean "use as arrayIndices"
          }
        }

        return false;
      };
    }

  }
};
// Operators that appear at the top level of a document selector.
const LOGICAL_OPERATORS = {
  $and(subSelector, matcher, inElemMatch) {
    return andDocumentMatchers(compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch));
  },

  $or(subSelector, matcher, inElemMatch) {
    const matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch); // Special case: if there is only one matcher, use it directly, *preserving*
    // any arrayIndices it returns.

    if (matchers.length === 1) {
      return matchers[0];
    }

    return doc => {
      const result = matchers.some(fn => fn(doc).result); // $or does NOT set arrayIndices when it has multiple
      // sub-expressions. (Tested against MongoDB.)

      return {
        result
      };
    };
  },

  $nor(subSelector, matcher, inElemMatch) {
    const matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);
    return doc => {
      const result = matchers.every(fn => !fn(doc).result); // Never set arrayIndices, because we only match if nothing in particular
      // 'matched' (and because this is consistent with MongoDB).

      return {
        result
      };
    };
  },

  $where(selectorValue, matcher) {
    // Record that *any* path may be used.
    matcher._recordPathUsed('');

    matcher._hasWhere = true;

    if (!(selectorValue instanceof Function)) {
      // XXX MongoDB seems to have more complex logic to decide where or or not
      // to add 'return'; not sure exactly what it is.
      selectorValue = Function('obj', "return ".concat(selectorValue));
    } // We make the document available as both `this` and `obj`.
    // // XXX not sure what we should do if this throws


    return doc => ({
      result: selectorValue.call(doc, doc)
    });
  },

  // This is just used as a comment in the query (in MongoDB, it also ends up in
  // query logs); it has no effect on the actual selection.
  $comment() {
    return () => ({
      result: true
    });
  }

}; // Operators that (unlike LOGICAL_OPERATORS) pertain to individual paths in a
// document, but (unlike ELEMENT_OPERATORS) do not have a simple definition as
// "match each branched value independently and combine with
// convertElementMatcherToBranchedMatcher".

const VALUE_OPERATORS = {
  $eq(operand) {
    return convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand));
  },

  $not(operand, valueSelector, matcher) {
    return invertBranchedMatcher(compileValueSelector(operand, matcher));
  },

  $ne(operand) {
    return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand)));
  },

  $nin(operand) {
    return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(ELEMENT_OPERATORS.$in.compileElementSelector(operand)));
  },

  $exists(operand) {
    const exists = convertElementMatcherToBranchedMatcher(value => value !== undefined);
    return operand ? exists : invertBranchedMatcher(exists);
  },

  // $options just provides options for $regex; its logic is inside $regex
  $options(operand, valueSelector) {
    if (!hasOwn.call(valueSelector, '$regex')) {
      throw Error('$options needs a $regex');
    }

    return everythingMatcher;
  },

  // $maxDistance is basically an argument to $near
  $maxDistance(operand, valueSelector) {
    if (!valueSelector.$near) {
      throw Error('$maxDistance needs a $near');
    }

    return everythingMatcher;
  },

  $all(operand, valueSelector, matcher) {
    if (!Array.isArray(operand)) {
      throw Error('$all requires array');
    } // Not sure why, but this seems to be what MongoDB does.


    if (operand.length === 0) {
      return nothingMatcher;
    }

    const branchedMatchers = operand.map(criterion => {
      // XXX handle $all/$elemMatch combination
      if (isOperatorObject(criterion)) {
        throw Error('no $ expressions in $all');
      } // This is always a regexp or equality selector.


      return compileValueSelector(criterion, matcher);
    }); // andBranchedMatchers does NOT require all selectors to return true on the
    // SAME branch.

    return andBranchedMatchers(branchedMatchers);
  },

  $near(operand, valueSelector, matcher, isRoot) {
    if (!isRoot) {
      throw Error('$near can\'t be inside another $ operator');
    }

    matcher._hasGeoQuery = true; // There are two kinds of geodata in MongoDB: legacy coordinate pairs and
    // GeoJSON. They use different distance metrics, too. GeoJSON queries are
    // marked with a $geometry property, though legacy coordinates can be
    // matched using $geometry.

    let maxDistance, point, distance;

    if (LocalCollection._isPlainObject(operand) && hasOwn.call(operand, '$geometry')) {
      // GeoJSON "2dsphere" mode.
      maxDistance = operand.$maxDistance;
      point = operand.$geometry;

      distance = value => {
        // XXX: for now, we don't calculate the actual distance between, say,
        // polygon and circle. If people care about this use-case it will get
        // a priority.
        if (!value) {
          return null;
        }

        if (!value.type) {
          return GeoJSON.pointDistance(point, {
            type: 'Point',
            coordinates: pointToArray(value)
          });
        }

        if (value.type === 'Point') {
          return GeoJSON.pointDistance(point, value);
        }

        return GeoJSON.geometryWithinRadius(value, point, maxDistance) ? 0 : maxDistance + 1;
      };
    } else {
      maxDistance = valueSelector.$maxDistance;

      if (!isIndexable(operand)) {
        throw Error('$near argument must be coordinate pair or GeoJSON');
      }

      point = pointToArray(operand);

      distance = value => {
        if (!isIndexable(value)) {
          return null;
        }

        return distanceCoordinatePairs(point, value);
      };
    }

    return branchedValues => {
      // There might be multiple points in the document that match the given
      // field. Only one of them needs to be within $maxDistance, but we need to
      // evaluate all of them and use the nearest one for the implicit sort
      // specifier. (That's why we can't just use ELEMENT_OPERATORS here.)
      //
      // Note: This differs from MongoDB's implementation, where a document will
      // actually show up *multiple times* in the result set, with one entry for
      // each within-$maxDistance branching point.
      const result = {
        result: false
      };
      expandArraysInBranches(branchedValues).every(branch => {
        // if operation is an update, don't skip branches, just return the first
        // one (#3599)
        let curDistance;

        if (!matcher._isUpdate) {
          if (!(typeof branch.value === 'object')) {
            return true;
          }

          curDistance = distance(branch.value); // Skip branches that aren't real points or are too far away.

          if (curDistance === null || curDistance > maxDistance) {
            return true;
          } // Skip anything that's a tie.


          if (result.distance !== undefined && result.distance <= curDistance) {
            return true;
          }
        }

        result.result = true;
        result.distance = curDistance;

        if (branch.arrayIndices) {
          result.arrayIndices = branch.arrayIndices;
        } else {
          delete result.arrayIndices;
        }

        return !matcher._isUpdate;
      });
      return result;
    };
  }

}; // NB: We are cheating and using this function to implement 'AND' for both
// 'document matchers' and 'branched matchers'. They both return result objects
// but the argument is different: for the former it's a whole doc, whereas for
// the latter it's an array of 'branched values'.

function andSomeMatchers(subMatchers) {
  if (subMatchers.length === 0) {
    return everythingMatcher;
  }

  if (subMatchers.length === 1) {
    return subMatchers[0];
  }

  return docOrBranches => {
    const match = {};
    match.result = subMatchers.every(fn => {
      const subResult = fn(docOrBranches); // Copy a 'distance' number out of the first sub-matcher that has
      // one. Yes, this means that if there are multiple $near fields in a
      // query, something arbitrary happens; this appears to be consistent with
      // Mongo.

      if (subResult.result && subResult.distance !== undefined && match.distance === undefined) {
        match.distance = subResult.distance;
      } // Similarly, propagate arrayIndices from sub-matchers... but to match
      // MongoDB behavior, this time the *last* sub-matcher with arrayIndices
      // wins.


      if (subResult.result && subResult.arrayIndices) {
        match.arrayIndices = subResult.arrayIndices;
      }

      return subResult.result;
    }); // If we didn't actually match, forget any extra metadata we came up with.

    if (!match.result) {
      delete match.distance;
      delete match.arrayIndices;
    }

    return match;
  };
}

const andDocumentMatchers = andSomeMatchers;
const andBranchedMatchers = andSomeMatchers;

function compileArrayOfDocumentSelectors(selectors, matcher, inElemMatch) {
  if (!Array.isArray(selectors) || selectors.length === 0) {
    throw Error('$and/$or/$nor must be nonempty array');
  }

  return selectors.map(subSelector => {
    if (!LocalCollection._isPlainObject(subSelector)) {
      throw Error('$or/$and/$nor entries need to be full objects');
    }

    return compileDocumentSelector(subSelector, matcher, {
      inElemMatch
    });
  });
} // Takes in a selector that could match a full document (eg, the original
// selector). Returns a function mapping document->result object.
//
// matcher is the Matcher object we are compiling.
//
// If this is the root document selector (ie, not wrapped in $and or the like),
// then isRoot is true. (This is used by $near.)


function compileDocumentSelector(docSelector, matcher) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const docMatchers = Object.keys(docSelector).map(key => {
    const subSelector = docSelector[key];

    if (key.substr(0, 1) === '$') {
      // Outer operators are either logical operators (they recurse back into
      // this function), or $where.
      if (!hasOwn.call(LOGICAL_OPERATORS, key)) {
        throw new Error("Unrecognized logical operator: ".concat(key));
      }

      matcher._isSimple = false;
      return LOGICAL_OPERATORS[key](subSelector, matcher, options.inElemMatch);
    } // Record this path, but only if we aren't in an elemMatcher, since in an
    // elemMatch this is a path inside an object in an array, not in the doc
    // root.


    if (!options.inElemMatch) {
      matcher._recordPathUsed(key);
    } // Don't add a matcher if subSelector is a function -- this is to match
    // the behavior of Meteor on the server (inherited from the node mongodb
    // driver), which is to ignore any part of a selector which is a function.


    if (typeof subSelector === 'function') {
      return undefined;
    }

    const lookUpByIndex = makeLookupFunction(key);
    const valueMatcher = compileValueSelector(subSelector, matcher, options.isRoot);
    return doc => valueMatcher(lookUpByIndex(doc));
  }).filter(Boolean);
  return andDocumentMatchers(docMatchers);
}

// Takes in a selector that could match a key-indexed value in a document; eg,
// {$gt: 5, $lt: 9}, or a regular expression, or any non-expression object (to
// indicate equality).  Returns a branched matcher: a function mapping
// [branched value]->result object.
function compileValueSelector(valueSelector, matcher, isRoot) {
  if (valueSelector instanceof RegExp) {
    matcher._isSimple = false;
    return convertElementMatcherToBranchedMatcher(regexpElementMatcher(valueSelector));
  }

  if (isOperatorObject(valueSelector)) {
    return operatorBranchedMatcher(valueSelector, matcher, isRoot);
  }

  return convertElementMatcherToBranchedMatcher(equalityElementMatcher(valueSelector));
} // Given an element matcher (which evaluates a single value), returns a branched
// value (which evaluates the element matcher on all the branches and returns a
// more structured return value possibly including arrayIndices).


function convertElementMatcherToBranchedMatcher(elementMatcher) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return branches => {
    const expanded = options.dontExpandLeafArrays ? branches : expandArraysInBranches(branches, options.dontIncludeLeafArrays);
    const match = {};
    match.result = expanded.some(element => {
      let matched = elementMatcher(element.value); // Special case for $elemMatch: it means "true, and use this as an array
      // index if I didn't already have one".

      if (typeof matched === 'number') {
        // XXX This code dates from when we only stored a single array index
        // (for the outermost array). Should we be also including deeper array
        // indices from the $elemMatch match?
        if (!element.arrayIndices) {
          element.arrayIndices = [matched];
        }

        matched = true;
      } // If some element matched, and it's tagged with array indices, include
      // those indices in our result object.


      if (matched && element.arrayIndices) {
        match.arrayIndices = element.arrayIndices;
      }

      return matched;
    });
    return match;
  };
} // Helpers for $near.


function distanceCoordinatePairs(a, b) {
  const pointA = pointToArray(a);
  const pointB = pointToArray(b);
  return Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]);
} // Takes something that is not an operator object and returns an element matcher
// for equality with that thing.


function equalityElementMatcher(elementSelector) {
  if (isOperatorObject(elementSelector)) {
    throw Error('Can\'t create equalityValueSelector for operator object');
  } // Special-case: null and undefined are equal (if you got undefined in there
  // somewhere, or if you got it due to some branch being non-existent in the
  // weird special case), even though they aren't with EJSON.equals.
  // undefined or null


  if (elementSelector == null) {
    return value => value == null;
  }

  return value => LocalCollection._f._equal(elementSelector, value);
}

function everythingMatcher(docOrBranchedValues) {
  return {
    result: true
  };
}

function expandArraysInBranches(branches, skipTheArrays) {
  const branchesOut = [];
  branches.forEach(branch => {
    const thisIsArray = Array.isArray(branch.value); // We include the branch itself, *UNLESS* we it's an array that we're going
    // to iterate and we're told to skip arrays.  (That's right, we include some
    // arrays even skipTheArrays is true: these are arrays that were found via
    // explicit numerical indices.)

    if (!(skipTheArrays && thisIsArray && !branch.dontIterate)) {
      branchesOut.push({
        arrayIndices: branch.arrayIndices,
        value: branch.value
      });
    }

    if (thisIsArray && !branch.dontIterate) {
      branch.value.forEach((value, i) => {
        branchesOut.push({
          arrayIndices: (branch.arrayIndices || []).concat(i),
          value
        });
      });
    }
  });
  return branchesOut;
}

// Helpers for $bitsAllSet/$bitsAnySet/$bitsAllClear/$bitsAnyClear.
function getOperandBitmask(operand, selector) {
  // numeric bitmask
  // You can provide a numeric bitmask to be matched against the operand field.
  // It must be representable as a non-negative 32-bit signed integer.
  // Otherwise, $bitsAllSet will return an error.
  if (Number.isInteger(operand) && operand >= 0) {
    return new Uint8Array(new Int32Array([operand]).buffer);
  } // bindata bitmask
  // You can also use an arbitrarily large BinData instance as a bitmask.


  if (EJSON.isBinary(operand)) {
    return new Uint8Array(operand.buffer);
  } // position list
  // If querying a list of bit positions, each <position> must be a non-negative
  // integer. Bit positions start at 0 from the least significant bit.


  if (Array.isArray(operand) && operand.every(x => Number.isInteger(x) && x >= 0)) {
    const buffer = new ArrayBuffer((Math.max(...operand) >> 3) + 1);
    const view = new Uint8Array(buffer);
    operand.forEach(x => {
      view[x >> 3] |= 1 << (x & 0x7);
    });
    return view;
  } // bad operand


  throw Error("operand to ".concat(selector, " must be a numeric bitmask (representable as a ") + 'non-negative 32-bit signed integer), a bindata bitmask or an array with ' + 'bit positions (non-negative integers)');
}

function getValueBitmask(value, length) {
  // The field value must be either numerical or a BinData instance. Otherwise,
  // $bits... will not match the current document.
  // numerical
  if (Number.isSafeInteger(value)) {
    // $bits... will not match numerical values that cannot be represented as a
    // signed 64-bit integer. This can be the case if a value is either too
    // large or small to fit in a signed 64-bit integer, or if it has a
    // fractional component.
    const buffer = new ArrayBuffer(Math.max(length, 2 * Uint32Array.BYTES_PER_ELEMENT));
    let view = new Uint32Array(buffer, 0, 2);
    view[0] = value % ((1 << 16) * (1 << 16)) | 0;
    view[1] = value / ((1 << 16) * (1 << 16)) | 0; // sign extension

    if (value < 0) {
      view = new Uint8Array(buffer, 2);
      view.forEach((byte, i) => {
        view[i] = 0xff;
      });
    }

    return new Uint8Array(buffer);
  } // bindata


  if (EJSON.isBinary(value)) {
    return new Uint8Array(value.buffer);
  } // no match


  return false;
} // Actually inserts a key value into the selector document
// However, this checks there is no ambiguity in setting
// the value for the given key, throws otherwise


function insertIntoDocument(document, key, value) {
  Object.keys(document).forEach(existingKey => {
    if (existingKey.length > key.length && existingKey.indexOf("".concat(key, ".")) === 0 || key.length > existingKey.length && key.indexOf("".concat(existingKey, ".")) === 0) {
      throw new Error("cannot infer query fields to set, both paths '".concat(existingKey, "' and ") + "'".concat(key, "' are matched"));
    } else if (existingKey === key) {
      throw new Error("cannot infer query fields to set, path '".concat(key, "' is matched twice"));
    }
  });
  document[key] = value;
} // Returns a branched matcher that matches iff the given matcher does not.
// Note that this implicitly "deMorganizes" the wrapped function.  ie, it
// means that ALL branch values need to fail to match innerBranchedMatcher.


function invertBranchedMatcher(branchedMatcher) {
  return branchValues => {
    // We explicitly choose to strip arrayIndices here: it doesn't make sense to
    // say "update the array element that does not match something", at least
    // in mongo-land.
    return {
      result: !branchedMatcher(branchValues).result
    };
  };
}

function isIndexable(obj) {
  return Array.isArray(obj) || LocalCollection._isPlainObject(obj);
}

function isNumericKey(s) {
  return /^[0-9]+$/.test(s);
}

function isOperatorObject(valueSelector, inconsistentOK) {
  if (!LocalCollection._isPlainObject(valueSelector)) {
    return false;
  }

  let theseAreOperators = undefined;
  Object.keys(valueSelector).forEach(selKey => {
    const thisIsOperator = selKey.substr(0, 1) === '$';

    if (theseAreOperators === undefined) {
      theseAreOperators = thisIsOperator;
    } else if (theseAreOperators !== thisIsOperator) {
      if (!inconsistentOK) {
        throw new Error("Inconsistent operator: ".concat(JSON.stringify(valueSelector)));
      }

      theseAreOperators = false;
    }
  });
  return !!theseAreOperators; // {} has no operators
}

// Helper for $lt/$gt/$lte/$gte.
function makeInequality(cmpValueComparator) {
  return {
    compileElementSelector(operand) {
      // Arrays never compare false with non-arrays for any inequality.
      // XXX This was behavior we observed in pre-release MongoDB 2.5, but
      //     it seems to have been reverted.
      //     See https://jira.mongodb.org/browse/SERVER-11444
      if (Array.isArray(operand)) {
        return () => false;
      } // Special case: consider undefined and null the same (so true with
      // $gte/$lte).


      if (operand === undefined) {
        operand = null;
      }

      const operandType = LocalCollection._f._type(operand);

      return value => {
        if (value === undefined) {
          value = null;
        } // Comparisons are never true among things of different type (except
        // null vs undefined).


        if (LocalCollection._f._type(value) !== operandType) {
          return false;
        }

        return cmpValueComparator(LocalCollection._f._cmp(value, operand));
      };
    }

  };
} // makeLookupFunction(key) returns a lookup function.
//
// A lookup function takes in a document and returns an array of matching
// branches.  If no arrays are found while looking up the key, this array will
// have exactly one branches (possibly 'undefined', if some segment of the key
// was not found).
//
// If arrays are found in the middle, this can have more than one element, since
// we 'branch'. When we 'branch', if there are more key segments to look up,
// then we only pursue branches that are plain objects (not arrays or scalars).
// This means we can actually end up with no branches!
//
// We do *NOT* branch on arrays that are found at the end (ie, at the last
// dotted member of the key). We just return that array; if you want to
// effectively 'branch' over the array's values, post-process the lookup
// function with expandArraysInBranches.
//
// Each branch is an object with keys:
//  - value: the value at the branch
//  - dontIterate: an optional bool; if true, it means that 'value' is an array
//    that expandArraysInBranches should NOT expand. This specifically happens
//    when there is a numeric index in the key, and ensures the
//    perhaps-surprising MongoDB behavior where {'a.0': 5} does NOT
//    match {a: [[5]]}.
//  - arrayIndices: if any array indexing was done during lookup (either due to
//    explicit numeric indices or implicit branching), this will be an array of
//    the array indices used, from outermost to innermost; it is falsey or
//    absent if no array index is used. If an explicit numeric index is used,
//    the index will be followed in arrayIndices by the string 'x'.
//
//    Note: arrayIndices is used for two purposes. First, it is used to
//    implement the '$' modifier feature, which only ever looks at its first
//    element.
//
//    Second, it is used for sort key generation, which needs to be able to tell
//    the difference between different paths. Moreover, it needs to
//    differentiate between explicit and implicit branching, which is why
//    there's the somewhat hacky 'x' entry: this means that explicit and
//    implicit array lookups will have different full arrayIndices paths. (That
//    code only requires that different paths have different arrayIndices; it
//    doesn't actually 'parse' arrayIndices. As an alternative, arrayIndices
//    could contain objects with flags like 'implicit', but I think that only
//    makes the code surrounding them more complex.)
//
//    (By the way, this field ends up getting passed around a lot without
//    cloning, so never mutate any arrayIndices field/var in this package!)
//
//
// At the top level, you may only pass in a plain object or array.
//
// See the test 'minimongo - lookup' for some examples of what lookup functions
// return.


function makeLookupFunction(key) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const parts = key.split('.');
  const firstPart = parts.length ? parts[0] : '';
  const lookupRest = parts.length > 1 && makeLookupFunction(parts.slice(1).join('.'), options);

  const omitUnnecessaryFields = result => {
    if (!result.dontIterate) {
      delete result.dontIterate;
    }

    if (result.arrayIndices && !result.arrayIndices.length) {
      delete result.arrayIndices;
    }

    return result;
  }; // Doc will always be a plain object or an array.
  // apply an explicit numeric index, an array.


  return function (doc) {
    let arrayIndices = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    if (Array.isArray(doc)) {
      // If we're being asked to do an invalid lookup into an array (non-integer
      // or out-of-bounds), return no results (which is different from returning
      // a single undefined result, in that `null` equality checks won't match).
      if (!(isNumericKey(firstPart) && firstPart < doc.length)) {
        return [];
      } // Remember that we used this array index. Include an 'x' to indicate that
      // the previous index came from being considered as an explicit array
      // index (not branching).


      arrayIndices = arrayIndices.concat(+firstPart, 'x');
    } // Do our first lookup.


    const firstLevel = doc[firstPart]; // If there is no deeper to dig, return what we found.
    //
    // If what we found is an array, most value selectors will choose to treat
    // the elements of the array as matchable values in their own right, but
    // that's done outside of the lookup function. (Exceptions to this are $size
    // and stuff relating to $elemMatch.  eg, {a: {$size: 2}} does not match {a:
    // [[1, 2]]}.)
    //
    // That said, if we just did an *explicit* array lookup (on doc) to find
    // firstLevel, and firstLevel is an array too, we do NOT want value
    // selectors to iterate over it.  eg, {'a.0': 5} does not match {a: [[5]]}.
    // So in that case, we mark the return value as 'don't iterate'.

    if (!lookupRest) {
      return [omitUnnecessaryFields({
        arrayIndices,
        dontIterate: Array.isArray(doc) && Array.isArray(firstLevel),
        value: firstLevel
      })];
    } // We need to dig deeper.  But if we can't, because what we've found is not
    // an array or plain object, we're done. If we just did a numeric index into
    // an array, we return nothing here (this is a change in Mongo 2.5 from
    // Mongo 2.4, where {'a.0.b': null} stopped matching {a: [5]}). Otherwise,
    // return a single `undefined` (which can, for example, match via equality
    // with `null`).


    if (!isIndexable(firstLevel)) {
      if (Array.isArray(doc)) {
        return [];
      }

      return [omitUnnecessaryFields({
        arrayIndices,
        value: undefined
      })];
    }

    const result = [];

    const appendToResult = more => {
      result.push(...more);
    }; // Dig deeper: look up the rest of the parts on whatever we've found.
    // (lookupRest is smart enough to not try to do invalid lookups into
    // firstLevel if it's an array.)


    appendToResult(lookupRest(firstLevel, arrayIndices)); // If we found an array, then in *addition* to potentially treating the next
    // part as a literal integer lookup, we should also 'branch': try to look up
    // the rest of the parts on each array element in parallel.
    //
    // In this case, we *only* dig deeper into array elements that are plain
    // objects. (Recall that we only got this far if we have further to dig.)
    // This makes sense: we certainly don't dig deeper into non-indexable
    // objects. And it would be weird to dig into an array: it's simpler to have
    // a rule that explicit integer indexes only apply to an outer array, not to
    // an array you find after a branching search.
    //
    // In the special case of a numeric part in a *sort selector* (not a query
    // selector), we skip the branching: we ONLY allow the numeric part to mean
    // 'look up this index' in that case, not 'also look up this index in all
    // the elements of the array'.

    if (Array.isArray(firstLevel) && !(isNumericKey(parts[1]) && options.forSort)) {
      firstLevel.forEach((branch, arrayIndex) => {
        if (LocalCollection._isPlainObject(branch)) {
          appendToResult(lookupRest(branch, arrayIndices.concat(arrayIndex)));
        }
      });
    }

    return result;
  };
}

// Object exported only for unit testing.
// Use it to export private functions to test in Tinytest.
MinimongoTest = {
  makeLookupFunction
};

MinimongoError = function (message) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (typeof message === 'string' && options.field) {
    message += " for field '".concat(options.field, "'");
  }

  const error = new Error(message);
  error.name = 'MinimongoError';
  return error;
};

function nothingMatcher(docOrBranchedValues) {
  return {
    result: false
  };
}

// Takes an operator object (an object with $ keys) and returns a branched
// matcher for it.
function operatorBranchedMatcher(valueSelector, matcher, isRoot) {
  // Each valueSelector works separately on the various branches.  So one
  // operator can match one branch and another can match another branch.  This
  // is OK.
  const operatorMatchers = Object.keys(valueSelector).map(operator => {
    const operand = valueSelector[operator];
    const simpleRange = ['$lt', '$lte', '$gt', '$gte'].includes(operator) && typeof operand === 'number';
    const simpleEquality = ['$ne', '$eq'].includes(operator) && operand !== Object(operand);
    const simpleInclusion = ['$in', '$nin'].includes(operator) && Array.isArray(operand) && !operand.some(x => x === Object(x));

    if (!(simpleRange || simpleInclusion || simpleEquality)) {
      matcher._isSimple = false;
    }

    if (hasOwn.call(VALUE_OPERATORS, operator)) {
      return VALUE_OPERATORS[operator](operand, valueSelector, matcher, isRoot);
    }

    if (hasOwn.call(ELEMENT_OPERATORS, operator)) {
      const options = ELEMENT_OPERATORS[operator];
      return convertElementMatcherToBranchedMatcher(options.compileElementSelector(operand, valueSelector, matcher), options);
    }

    throw new Error("Unrecognized operator: ".concat(operator));
  });
  return andBranchedMatchers(operatorMatchers);
} // paths - Array: list of mongo style paths
// newLeafFn - Function: of form function(path) should return a scalar value to
//                       put into list created for that path
// conflictFn - Function: of form function(node, path, fullPath) is called
//                        when building a tree path for 'fullPath' node on
//                        'path' was already a leaf with a value. Must return a
//                        conflict resolution.
// initial tree - Optional Object: starting tree.
// @returns - Object: tree represented as a set of nested objects


function pathsToTree(paths, newLeafFn, conflictFn) {
  let root = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  paths.forEach(path => {
    const pathArray = path.split('.');
    let tree = root; // use .every just for iteration with break

    const success = pathArray.slice(0, -1).every((key, i) => {
      if (!hasOwn.call(tree, key)) {
        tree[key] = {};
      } else if (tree[key] !== Object(tree[key])) {
        tree[key] = conflictFn(tree[key], pathArray.slice(0, i + 1).join('.'), path); // break out of loop if we are failing for this path

        if (tree[key] !== Object(tree[key])) {
          return false;
        }
      }

      tree = tree[key];
      return true;
    });

    if (success) {
      const lastKey = pathArray[pathArray.length - 1];

      if (hasOwn.call(tree, lastKey)) {
        tree[lastKey] = conflictFn(tree[lastKey], path, path);
      } else {
        tree[lastKey] = newLeafFn(path);
      }
    }
  });
  return root;
}

// Makes sure we get 2 elements array and assume the first one to be x and
// the second one to y no matter what user passes.
// In case user passes { lon: x, lat: y } returns [x, y]
function pointToArray(point) {
  return Array.isArray(point) ? point.slice() : [point.x, point.y];
} // Creating a document from an upsert is quite tricky.
// E.g. this selector: {"$or": [{"b.foo": {"$all": ["bar"]}}]}, should result
// in: {"b.foo": "bar"}
// But this selector: {"$or": [{"b": {"foo": {"$all": ["bar"]}}}]} should throw
// an error
// Some rules (found mainly with trial & error, so there might be more):
// - handle all childs of $and (or implicit $and)
// - handle $or nodes with exactly 1 child
// - ignore $or nodes with more than 1 child
// - ignore $nor and $not nodes
// - throw when a value can not be set unambiguously
// - every value for $all should be dealt with as separate $eq-s
// - threat all children of $all as $eq setters (=> set if $all.length === 1,
//   otherwise throw error)
// - you can not mix '$'-prefixed keys and non-'$'-prefixed keys
// - you can only have dotted keys on a root-level
// - you can not have '$'-prefixed keys more than one-level deep in an object
// Handles one key/value pair to put in the selector document


function populateDocumentWithKeyValue(document, key, value) {
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    populateDocumentWithObject(document, key, value);
  } else if (!(value instanceof RegExp)) {
    insertIntoDocument(document, key, value);
  }
} // Handles a key, value pair to put in the selector document
// if the value is an object


function populateDocumentWithObject(document, key, value) {
  const keys = Object.keys(value);
  const unprefixedKeys = keys.filter(op => op[0] !== '$');

  if (unprefixedKeys.length > 0 || !keys.length) {
    // Literal (possibly empty) object ( or empty object )
    // Don't allow mixing '$'-prefixed with non-'$'-prefixed fields
    if (keys.length !== unprefixedKeys.length) {
      throw new Error("unknown operator: ".concat(unprefixedKeys[0]));
    }

    validateObject(value, key);
    insertIntoDocument(document, key, value);
  } else {
    Object.keys(value).forEach(op => {
      const object = value[op];

      if (op === '$eq') {
        populateDocumentWithKeyValue(document, key, object);
      } else if (op === '$all') {
        // every value for $all should be dealt with as separate $eq-s
        object.forEach(element => populateDocumentWithKeyValue(document, key, element));
      }
    });
  }
} // Fills a document with certain fields from an upsert selector


function populateDocumentWithQueryFields(query) {
  let document = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (Object.getPrototypeOf(query) === Object.prototype) {
    // handle implicit $and
    Object.keys(query).forEach(key => {
      const value = query[key];

      if (key === '$and') {
        // handle explicit $and
        value.forEach(element => populateDocumentWithQueryFields(element, document));
      } else if (key === '$or') {
        // handle $or nodes with exactly 1 child
        if (value.length === 1) {
          populateDocumentWithQueryFields(value[0], document);
        }
      } else if (key[0] !== '$') {
        // Ignore other '$'-prefixed logical selectors
        populateDocumentWithKeyValue(document, key, value);
      }
    });
  } else {
    // Handle meteor-specific shortcut for selecting _id
    if (LocalCollection._selectorIsId(query)) {
      insertIntoDocument(document, '_id', query);
    }
  }

  return document;
}

function projectionDetails(fields) {
  // Find the non-_id keys (_id is handled specially because it is included
  // unless explicitly excluded). Sort the keys, so that our code to detect
  // overlaps like 'foo' and 'foo.bar' can assume that 'foo' comes first.
  let fieldsKeys = Object.keys(fields).sort(); // If _id is the only field in the projection, do not remove it, since it is
  // required to determine if this is an exclusion or exclusion. Also keep an
  // inclusive _id, since inclusive _id follows the normal rules about mixing
  // inclusive and exclusive fields. If _id is not the only field in the
  // projection and is exclusive, remove it so it can be handled later by a
  // special case, since exclusive _id is always allowed.

  if (!(fieldsKeys.length === 1 && fieldsKeys[0] === '_id') && !(fieldsKeys.includes('_id') && fields._id)) {
    fieldsKeys = fieldsKeys.filter(key => key !== '_id');
  }

  let including = null; // Unknown

  fieldsKeys.forEach(keyPath => {
    const rule = !!fields[keyPath];

    if (including === null) {
      including = rule;
    } // This error message is copied from MongoDB shell


    if (including !== rule) {
      throw MinimongoError('You cannot currently mix including and excluding fields.');
    }
  });
  const projectionRulesTree = pathsToTree(fieldsKeys, path => including, (node, path, fullPath) => {
    // Check passed projection fields' keys: If you have two rules such as
    // 'foo.bar' and 'foo.bar.baz', then the result becomes ambiguous. If
    // that happens, there is a probability you are doing something wrong,
    // framework should notify you about such mistake earlier on cursor
    // compilation step than later during runtime.  Note, that real mongo
    // doesn't do anything about it and the later rule appears in projection
    // project, more priority it takes.
    //
    // Example, assume following in mongo shell:
    // > db.coll.insert({ a: { b: 23, c: 44 } })
    // > db.coll.find({}, { 'a': 1, 'a.b': 1 })
    // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23}}
    // > db.coll.find({}, { 'a.b': 1, 'a': 1 })
    // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23, "c": 44}}
    //
    // Note, how second time the return set of keys is different.
    const currentPath = fullPath;
    const anotherPath = path;
    throw MinimongoError("both ".concat(currentPath, " and ").concat(anotherPath, " found in fields option, ") + 'using both of them may trigger unexpected behavior. Did you mean to ' + 'use only one of them?');
  });
  return {
    including,
    tree: projectionRulesTree
  };
}

function regexpElementMatcher(regexp) {
  return value => {
    if (value instanceof RegExp) {
      return value.toString() === regexp.toString();
    } // Regexps only work against strings.


    if (typeof value !== 'string') {
      return false;
    } // Reset regexp's state to avoid inconsistent matching for objects with the
    // same value on consecutive calls of regexp.test. This happens only if the
    // regexp has the 'g' flag. Also note that ES6 introduces a new flag 'y' for
    // which we should *not* change the lastIndex but MongoDB doesn't support
    // either of these flags.


    regexp.lastIndex = 0;
    return regexp.test(value);
  };
}

// Validates the key in a path.
// Objects that are nested more then 1 level cannot have dotted fields
// or fields starting with '$'
function validateKeyInPath(key, path) {
  if (key.includes('.')) {
    throw new Error("The dotted field '".concat(key, "' in '").concat(path, ".").concat(key, " is not valid for storage."));
  }

  if (key[0] === '$') {
    throw new Error("The dollar ($) prefixed field  '".concat(path, ".").concat(key, " is not valid for storage."));
  }
} // Recursively validates an object that is nested more than one level deep


function validateObject(object, path) {
  if (object && Object.getPrototypeOf(object) === Object.prototype) {
    Object.keys(object).forEach(key => {
      validateKeyInPath(key, path);
      validateObject(object[key], path + '.' + key);
    });
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/cursor.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => Cursor
});
let LocalCollection;
module.link("./local_collection.js", {
  default(v) {
    LocalCollection = v;
  }

}, 0);
let hasOwn;
module.link("./common.js", {
  hasOwn(v) {
    hasOwn = v;
  }

}, 1);

class Cursor {
  // don't call this ctor directly.  use LocalCollection.find().
  constructor(collection, selector) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    this.collection = collection;
    this.sorter = null;
    this.matcher = new Minimongo.Matcher(selector);

    if (LocalCollection._selectorIsIdPerhapsAsObject(selector)) {
      // stash for fast _id and { _id }
      this._selectorId = hasOwn.call(selector, '_id') ? selector._id : selector;
    } else {
      this._selectorId = undefined;

      if (this.matcher.hasGeoQuery() || options.sort) {
        this.sorter = new Minimongo.Sorter(options.sort || []);
      }
    }

    this.skip = options.skip || 0;
    this.limit = options.limit;
    this.fields = options.fields;
    this._projectionFn = LocalCollection._compileProjection(this.fields || {});
    this._transform = LocalCollection.wrapTransform(options.transform); // by default, queries register w/ Tracker when it is available.

    if (typeof Tracker !== 'undefined') {
      this.reactive = options.reactive === undefined ? true : options.reactive;
    }
  }
  /**
   * @summary Returns the number of documents that match a query.
   * @memberOf Mongo.Cursor
   * @method  count
   * @param {boolean} [applySkipLimit=true] If set to `false`, the value
   *                                         returned will reflect the total
   *                                         number of matching documents,
   *                                         ignoring any value supplied for
   *                                         limit
   * @instance
   * @locus Anywhere
   * @returns {Number}
   */


  count() {
    let applySkipLimit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

    if (this.reactive) {
      // allow the observe to be unordered
      this._depend({
        added: true,
        removed: true
      }, true);
    }

    return this._getRawObjects({
      ordered: true,
      applySkipLimit
    }).length;
  }
  /**
   * @summary Return all matching documents as an Array.
   * @memberOf Mongo.Cursor
   * @method  fetch
   * @instance
   * @locus Anywhere
   * @returns {Object[]}
   */


  fetch() {
    const result = [];
    this.forEach(doc => {
      result.push(doc);
    });
    return result;
  }

  [Symbol.iterator]() {
    if (this.reactive) {
      this._depend({
        addedBefore: true,
        removed: true,
        changed: true,
        movedBefore: true
      });
    }

    let index = 0;

    const objects = this._getRawObjects({
      ordered: true
    });

    return {
      next: () => {
        if (index < objects.length) {
          // This doubles as a clone operation.
          let element = this._projectionFn(objects[index++]);

          if (this._transform) element = this._transform(element);
          return {
            value: element
          };
        }

        return {
          done: true
        };
      }
    };
  }
  /**
   * @callback IterationCallback
   * @param {Object} doc
   * @param {Number} index
   */

  /**
   * @summary Call `callback` once for each matching document, sequentially and
   *          synchronously.
   * @locus Anywhere
   * @method  forEach
   * @instance
   * @memberOf Mongo.Cursor
   * @param {IterationCallback} callback Function to call. It will be called
   *                                     with three arguments: the document, a
   *                                     0-based index, and <em>cursor</em>
   *                                     itself.
   * @param {Any} [thisArg] An object which will be the value of `this` inside
   *                        `callback`.
   */


  forEach(callback, thisArg) {
    if (this.reactive) {
      this._depend({
        addedBefore: true,
        removed: true,
        changed: true,
        movedBefore: true
      });
    }

    this._getRawObjects({
      ordered: true
    }).forEach((element, i) => {
      // This doubles as a clone operation.
      element = this._projectionFn(element);

      if (this._transform) {
        element = this._transform(element);
      }

      callback.call(thisArg, element, i, this);
    });
  }

  getTransform() {
    return this._transform;
  }
  /**
   * @summary Map callback over all matching documents.  Returns an Array.
   * @locus Anywhere
   * @method map
   * @instance
   * @memberOf Mongo.Cursor
   * @param {IterationCallback} callback Function to call. It will be called
   *                                     with three arguments: the document, a
   *                                     0-based index, and <em>cursor</em>
   *                                     itself.
   * @param {Any} [thisArg] An object which will be the value of `this` inside
   *                        `callback`.
   */


  map(callback, thisArg) {
    const result = [];
    this.forEach((doc, i) => {
      result.push(callback.call(thisArg, doc, i, this));
    });
    return result;
  } // options to contain:
  //  * callbacks for observe():
  //    - addedAt (document, atIndex)
  //    - added (document)
  //    - changedAt (newDocument, oldDocument, atIndex)
  //    - changed (newDocument, oldDocument)
  //    - removedAt (document, atIndex)
  //    - removed (document)
  //    - movedTo (document, oldIndex, newIndex)
  //
  // attributes available on returned query handle:
  //  * stop(): end updates
  //  * collection: the collection this query is querying
  //
  // iff x is a returned query handle, (x instanceof
  // LocalCollection.ObserveHandle) is true
  //
  // initial results delivered through added callback
  // XXX maybe callbacks should take a list of objects, to expose transactions?
  // XXX maybe support field limiting (to limit what you're notified on)

  /**
   * @summary Watch a query.  Receive callbacks as the result set changes.
   * @locus Anywhere
   * @memberOf Mongo.Cursor
   * @instance
   * @param {Object} callbacks Functions to call to deliver the result set as it
   *                           changes
   */


  observe(options) {
    return LocalCollection._observeFromObserveChanges(this, options);
  }
  /**
   * @summary Watch a query. Receive callbacks as the result set changes. Only
   *          the differences between the old and new documents are passed to
   *          the callbacks.
   * @locus Anywhere
   * @memberOf Mongo.Cursor
   * @instance
   * @param {Object} callbacks Functions to call to deliver the result set as it
   *                           changes
   */


  observeChanges(options) {
    const ordered = LocalCollection._observeChangesCallbacksAreOrdered(options); // there are several places that assume you aren't combining skip/limit with
    // unordered observe.  eg, update's EJSON.clone, and the "there are several"
    // comment in _modifyAndNotify
    // XXX allow skip/limit with unordered observe


    if (!options._allow_unordered && !ordered && (this.skip || this.limit)) {
      throw new Error("Must use an ordered observe with skip or limit (i.e. 'addedBefore' " + "for observeChanges or 'addedAt' for observe, instead of 'added').");
    }

    if (this.fields && (this.fields._id === 0 || this.fields._id === false)) {
      throw Error('You may not observe a cursor with {fields: {_id: 0}}');
    }

    const distances = this.matcher.hasGeoQuery() && ordered && new LocalCollection._IdMap();
    const query = {
      cursor: this,
      dirty: false,
      distances,
      matcher: this.matcher,
      // not fast pathed
      ordered,
      projectionFn: this._projectionFn,
      resultsSnapshot: null,
      sorter: ordered && this.sorter
    };
    let qid; // Non-reactive queries call added[Before] and then never call anything
    // else.

    if (this.reactive) {
      qid = this.collection.next_qid++;
      this.collection.queries[qid] = query;
    }

    query.results = this._getRawObjects({
      ordered,
      distances: query.distances
    });

    if (this.collection.paused) {
      query.resultsSnapshot = ordered ? [] : new LocalCollection._IdMap();
    } // wrap callbacks we were passed. callbacks only fire when not paused and
    // are never undefined
    // Filters out blacklisted fields according to cursor's projection.
    // XXX wrong place for this?
    // furthermore, callbacks enqueue until the operation we're working on is
    // done.


    const wrapCallback = fn => {
      if (!fn) {
        return () => {};
      }

      const self = this;
      return function ()
      /* args*/
      {
        if (self.collection.paused) {
          return;
        }

        const args = arguments;

        self.collection._observeQueue.queueTask(() => {
          fn.apply(this, args);
        });
      };
    };

    query.added = wrapCallback(options.added);
    query.changed = wrapCallback(options.changed);
    query.removed = wrapCallback(options.removed);

    if (ordered) {
      query.addedBefore = wrapCallback(options.addedBefore);
      query.movedBefore = wrapCallback(options.movedBefore);
    }

    if (!options._suppress_initial && !this.collection.paused) {
      query.results.forEach(doc => {
        const fields = EJSON.clone(doc);
        delete fields._id;

        if (ordered) {
          query.addedBefore(doc._id, this._projectionFn(fields), null);
        }

        query.added(doc._id, this._projectionFn(fields));
      });
    }

    const handle = Object.assign(new LocalCollection.ObserveHandle(), {
      collection: this.collection,
      stop: () => {
        if (this.reactive) {
          delete this.collection.queries[qid];
        }
      }
    });

    if (this.reactive && Tracker.active) {
      // XXX in many cases, the same observe will be recreated when
      // the current autorun is rerun.  we could save work by
      // letting it linger across rerun and potentially get
      // repurposed if the same observe is performed, using logic
      // similar to that of Meteor.subscribe.
      Tracker.onInvalidate(() => {
        handle.stop();
      });
    } // run the observe callbacks resulting from the initial contents
    // before we leave the observe.


    this.collection._observeQueue.drain();

    return handle;
  } // Since we don't actually have a "nextObject" interface, there's really no
  // reason to have a "rewind" interface.  All it did was make multiple calls
  // to fetch/map/forEach return nothing the second time.
  // XXX COMPAT WITH 0.8.1


  rewind() {} // XXX Maybe we need a version of observe that just calls a callback if
  // anything changed.


  _depend(changers, _allow_unordered) {
    if (Tracker.active) {
      const dependency = new Tracker.Dependency();
      const notify = dependency.changed.bind(dependency);
      dependency.depend();
      const options = {
        _allow_unordered,
        _suppress_initial: true
      };
      ['added', 'addedBefore', 'changed', 'movedBefore', 'removed'].forEach(fn => {
        if (changers[fn]) {
          options[fn] = notify;
        }
      }); // observeChanges will stop() when this computation is invalidated

      this.observeChanges(options);
    }
  }

  _getCollectionName() {
    return this.collection.name;
  } // Returns a collection of matching objects, but doesn't deep copy them.
  //
  // If ordered is set, returns a sorted array, respecting sorter, skip, and
  // limit properties of the query provided that options.applySkipLimit is
  // not set to false (#1201). If sorter is falsey, no sort -- you get the
  // natural order.
  //
  // If ordered is not set, returns an object mapping from ID to doc (sorter,
  // skip and limit should not be set).
  //
  // If ordered is set and this cursor is a $near geoquery, then this function
  // will use an _IdMap to track each distance from the $near argument point in
  // order to use it as a sort key. If an _IdMap is passed in the 'distances'
  // argument, this function will clear it and use it for this purpose
  // (otherwise it will just create its own _IdMap). The observeChanges
  // implementation uses this to remember the distances after this function
  // returns.


  _getRawObjects() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    // By default this method will respect skip and limit because .fetch(),
    // .forEach() etc... expect this behaviour. It can be forced to ignore
    // skip and limit by setting applySkipLimit to false (.count() does this,
    // for example)
    const applySkipLimit = options.applySkipLimit !== false; // XXX use OrderedDict instead of array, and make IdMap and OrderedDict
    // compatible

    const results = options.ordered ? [] : new LocalCollection._IdMap(); // fast path for single ID value

    if (this._selectorId !== undefined) {
      // If you have non-zero skip and ask for a single id, you get nothing.
      // This is so it matches the behavior of the '{_id: foo}' path.
      if (applySkipLimit && this.skip) {
        return results;
      }

      const selectedDoc = this.collection._docs.get(this._selectorId);

      if (selectedDoc) {
        if (options.ordered) {
          results.push(selectedDoc);
        } else {
          results.set(this._selectorId, selectedDoc);
        }
      }

      return results;
    } // slow path for arbitrary selector, sort, skip, limit
    // in the observeChanges case, distances is actually part of the "query"
    // (ie, live results set) object.  in other cases, distances is only used
    // inside this function.


    let distances;

    if (this.matcher.hasGeoQuery() && options.ordered) {
      if (options.distances) {
        distances = options.distances;
        distances.clear();
      } else {
        distances = new LocalCollection._IdMap();
      }
    }

    this.collection._docs.forEach((doc, id) => {
      const matchResult = this.matcher.documentMatches(doc);

      if (matchResult.result) {
        if (options.ordered) {
          results.push(doc);

          if (distances && matchResult.distance !== undefined) {
            distances.set(id, matchResult.distance);
          }
        } else {
          results.set(id, doc);
        }
      } // Override to ensure all docs are matched if ignoring skip & limit


      if (!applySkipLimit) {
        return true;
      } // Fast path for limited unsorted queries.
      // XXX 'length' check here seems wrong for ordered


      return !this.limit || this.skip || this.sorter || results.length !== this.limit;
    });

    if (!options.ordered) {
      return results;
    }

    if (this.sorter) {
      results.sort(this.sorter.getComparator({
        distances
      }));
    } // Return the full set of results if there is no skip or limit or if we're
    // ignoring them


    if (!applySkipLimit || !this.limit && !this.skip) {
      return results;
    }

    return results.slice(this.skip, this.limit ? this.limit + this.skip : results.length);
  }

  _publishCursor(subscription) {
    // XXX minimongo should not depend on mongo-livedata!
    if (!Package.mongo) {
      throw new Error('Can\'t publish from Minimongo without the `mongo` package.');
    }

    if (!this.collection.name) {
      throw new Error('Can\'t publish a cursor from a collection without a name.');
    }

    return Package.mongo.Mongo.Collection._publishCursor(this, subscription, this.collection.name);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/local_collection.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
module.export({
  default: () => LocalCollection
});
let Cursor;
module.link("./cursor.js", {
  default(v) {
    Cursor = v;
  }

}, 0);
let ObserveHandle;
module.link("./observe_handle.js", {
  default(v) {
    ObserveHandle = v;
  }

}, 1);
let hasOwn, isIndexable, isNumericKey, isOperatorObject, populateDocumentWithQueryFields, projectionDetails;
module.link("./common.js", {
  hasOwn(v) {
    hasOwn = v;
  },

  isIndexable(v) {
    isIndexable = v;
  },

  isNumericKey(v) {
    isNumericKey = v;
  },

  isOperatorObject(v) {
    isOperatorObject = v;
  },

  populateDocumentWithQueryFields(v) {
    populateDocumentWithQueryFields = v;
  },

  projectionDetails(v) {
    projectionDetails = v;
  }

}, 2);

class LocalCollection {
  constructor(name) {
    this.name = name; // _id -> document (also containing id)

    this._docs = new LocalCollection._IdMap();
    this._observeQueue = new Meteor._SynchronousQueue();
    this.next_qid = 1; // live query id generator
    // qid -> live query object. keys:
    //  ordered: bool. ordered queries have addedBefore/movedBefore callbacks.
    //  results: array (ordered) or object (unordered) of current results
    //    (aliased with this._docs!)
    //  resultsSnapshot: snapshot of results. null if not paused.
    //  cursor: Cursor object for the query.
    //  selector, sorter, (callbacks): functions

    this.queries = Object.create(null); // null if not saving originals; an IdMap from id to original document value
    // if saving originals. See comments before saveOriginals().

    this._savedOriginals = null; // True when observers are paused and we should not send callbacks.

    this.paused = false;
  } // options may include sort, skip, limit, reactive
  // sort may be any of these forms:
  //     {a: 1, b: -1}
  //     [["a", "asc"], ["b", "desc"]]
  //     ["a", ["b", "desc"]]
  //   (in the first form you're beholden to key enumeration order in
  //   your javascript VM)
  //
  // reactive: if given, and false, don't register with Tracker (default
  // is true)
  //
  // XXX possibly should support retrieving a subset of fields? and
  // have it be a hint (ignored on the client, when not copying the
  // doc?)
  //
  // XXX sort does not yet support subkeys ('a.b') .. fix that!
  // XXX add one more sort form: "key"
  // XXX tests


  find(selector, options) {
    // default syntax for everything is to omit the selector argument.
    // but if selector is explicitly passed in as false or undefined, we
    // want a selector that matches nothing.
    if (arguments.length === 0) {
      selector = {};
    }

    return new LocalCollection.Cursor(this, selector, options);
  }

  findOne(selector) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (arguments.length === 0) {
      selector = {};
    } // NOTE: by setting limit 1 here, we end up using very inefficient
    // code that recomputes the whole query on each update. The upside is
    // that when you reactively depend on a findOne you only get
    // invalidated when the found object changes, not any object in the
    // collection. Most findOne will be by id, which has a fast path, so
    // this might not be a big deal. In most cases, invalidation causes
    // the called to re-query anyway, so this should be a net performance
    // improvement.


    options.limit = 1;
    return this.find(selector, options).fetch()[0];
  } // XXX possibly enforce that 'undefined' does not appear (we assume
  // this in our handling of null and $exists)


  insert(doc, callback) {
    doc = EJSON.clone(doc);
    assertHasValidFieldNames(doc); // if you really want to use ObjectIDs, set this global.
    // Mongo.Collection specifies its own ids and does not use this code.

    if (!hasOwn.call(doc, '_id')) {
      doc._id = LocalCollection._useOID ? new MongoID.ObjectID() : Random.id();
    }

    const id = doc._id;

    if (this._docs.has(id)) {
      throw MinimongoError("Duplicate _id '".concat(id, "'"));
    }

    this._saveOriginal(id, undefined);

    this._docs.set(id, doc);

    const queriesToRecompute = []; // trigger live queries that match

    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];

      if (query.dirty) {
        return;
      }

      const matchResult = query.matcher.documentMatches(doc);

      if (matchResult.result) {
        if (query.distances && matchResult.distance !== undefined) {
          query.distances.set(id, matchResult.distance);
        }

        if (query.cursor.skip || query.cursor.limit) {
          queriesToRecompute.push(qid);
        } else {
          LocalCollection._insertInResults(query, doc);
        }
      }
    });
    queriesToRecompute.forEach(qid => {
      if (this.queries[qid]) {
        this._recomputeResults(this.queries[qid]);
      }
    });

    this._observeQueue.drain(); // Defer because the caller likely doesn't expect the callback to be run
    // immediately.


    if (callback) {
      Meteor.defer(() => {
        callback(null, id);
      });
    }

    return id;
  } // Pause the observers. No callbacks from observers will fire until
  // 'resumeObservers' is called.


  pauseObservers() {
    // No-op if already paused.
    if (this.paused) {
      return;
    } // Set the 'paused' flag such that new observer messages don't fire.


    this.paused = true; // Take a snapshot of the query results for each query.

    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];
      query.resultsSnapshot = EJSON.clone(query.results);
    });
  }

  remove(selector, callback) {
    // Easy special case: if we're not calling observeChanges callbacks and
    // we're not saving originals and we got asked to remove everything, then
    // just empty everything directly.
    if (this.paused && !this._savedOriginals && EJSON.equals(selector, {})) {
      const result = this._docs.size();

      this._docs.clear();

      Object.keys(this.queries).forEach(qid => {
        const query = this.queries[qid];

        if (query.ordered) {
          query.results = [];
        } else {
          query.results.clear();
        }
      });

      if (callback) {
        Meteor.defer(() => {
          callback(null, result);
        });
      }

      return result;
    }

    const matcher = new Minimongo.Matcher(selector);
    const remove = [];

    this._eachPossiblyMatchingDoc(selector, (doc, id) => {
      if (matcher.documentMatches(doc).result) {
        remove.push(id);
      }
    });

    const queriesToRecompute = [];
    const queryRemove = [];

    for (let i = 0; i < remove.length; i++) {
      const removeId = remove[i];

      const removeDoc = this._docs.get(removeId);

      Object.keys(this.queries).forEach(qid => {
        const query = this.queries[qid];

        if (query.dirty) {
          return;
        }

        if (query.matcher.documentMatches(removeDoc).result) {
          if (query.cursor.skip || query.cursor.limit) {
            queriesToRecompute.push(qid);
          } else {
            queryRemove.push({
              qid,
              doc: removeDoc
            });
          }
        }
      });

      this._saveOriginal(removeId, removeDoc);

      this._docs.remove(removeId);
    } // run live query callbacks _after_ we've removed the documents.


    queryRemove.forEach(remove => {
      const query = this.queries[remove.qid];

      if (query) {
        query.distances && query.distances.remove(remove.doc._id);

        LocalCollection._removeFromResults(query, remove.doc);
      }
    });
    queriesToRecompute.forEach(qid => {
      const query = this.queries[qid];

      if (query) {
        this._recomputeResults(query);
      }
    });

    this._observeQueue.drain();

    const result = remove.length;

    if (callback) {
      Meteor.defer(() => {
        callback(null, result);
      });
    }

    return result;
  } // Resume the observers. Observers immediately receive change
  // notifications to bring them to the current state of the
  // database. Note that this is not just replaying all the changes that
  // happened during the pause, it is a smarter 'coalesced' diff.


  resumeObservers() {
    // No-op if not paused.
    if (!this.paused) {
      return;
    } // Unset the 'paused' flag. Make sure to do this first, otherwise
    // observer methods won't actually fire when we trigger them.


    this.paused = false;
    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];

      if (query.dirty) {
        query.dirty = false; // re-compute results will perform `LocalCollection._diffQueryChanges`
        // automatically.

        this._recomputeResults(query, query.resultsSnapshot);
      } else {
        // Diff the current results against the snapshot and send to observers.
        // pass the query object for its observer callbacks.
        LocalCollection._diffQueryChanges(query.ordered, query.resultsSnapshot, query.results, query, {
          projectionFn: query.projectionFn
        });
      }

      query.resultsSnapshot = null;
    });

    this._observeQueue.drain();
  }

  retrieveOriginals() {
    if (!this._savedOriginals) {
      throw new Error('Called retrieveOriginals without saveOriginals');
    }

    const originals = this._savedOriginals;
    this._savedOriginals = null;
    return originals;
  } // To track what documents are affected by a piece of code, call
  // saveOriginals() before it and retrieveOriginals() after it.
  // retrieveOriginals returns an object whose keys are the ids of the documents
  // that were affected since the call to saveOriginals(), and the values are
  // equal to the document's contents at the time of saveOriginals. (In the case
  // of an inserted document, undefined is the value.) You must alternate
  // between calls to saveOriginals() and retrieveOriginals().


  saveOriginals() {
    if (this._savedOriginals) {
      throw new Error('Called saveOriginals twice without retrieveOriginals');
    }

    this._savedOriginals = new LocalCollection._IdMap();
  } // XXX atomicity: if multi is true, and one modification fails, do
  // we rollback the whole operation, or what?


  update(selector, mod, options, callback) {
    if (!callback && options instanceof Function) {
      callback = options;
      options = null;
    }

    if (!options) {
      options = {};
    }

    const matcher = new Minimongo.Matcher(selector, true); // Save the original results of any query that we might need to
    // _recomputeResults on, because _modifyAndNotify will mutate the objects in
    // it. (We don't need to save the original results of paused queries because
    // they already have a resultsSnapshot and we won't be diffing in
    // _recomputeResults.)

    const qidToOriginalResults = {}; // We should only clone each document once, even if it appears in multiple
    // queries

    const docMap = new LocalCollection._IdMap();

    const idsMatched = LocalCollection._idsMatchedBySelector(selector);

    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];

      if ((query.cursor.skip || query.cursor.limit) && !this.paused) {
        // Catch the case of a reactive `count()` on a cursor with skip
        // or limit, which registers an unordered observe. This is a
        // pretty rare case, so we just clone the entire result set with
        // no optimizations for documents that appear in these result
        // sets and other queries.
        if (query.results instanceof LocalCollection._IdMap) {
          qidToOriginalResults[qid] = query.results.clone();
          return;
        }

        if (!(query.results instanceof Array)) {
          throw new Error('Assertion failed: query.results not an array');
        } // Clones a document to be stored in `qidToOriginalResults`
        // because it may be modified before the new and old result sets
        // are diffed. But if we know exactly which document IDs we're
        // going to modify, then we only need to clone those.


        const memoizedCloneIfNeeded = doc => {
          if (docMap.has(doc._id)) {
            return docMap.get(doc._id);
          }

          const docToMemoize = idsMatched && !idsMatched.some(id => EJSON.equals(id, doc._id)) ? doc : EJSON.clone(doc);
          docMap.set(doc._id, docToMemoize);
          return docToMemoize;
        };

        qidToOriginalResults[qid] = query.results.map(memoizedCloneIfNeeded);
      }
    });
    const recomputeQids = {};
    let updateCount = 0;

    this._eachPossiblyMatchingDoc(selector, (doc, id) => {
      const queryResult = matcher.documentMatches(doc);

      if (queryResult.result) {
        // XXX Should we save the original even if mod ends up being a no-op?
        this._saveOriginal(id, doc);

        this._modifyAndNotify(doc, mod, recomputeQids, queryResult.arrayIndices);

        ++updateCount;

        if (!options.multi) {
          return false; // break
        }
      }

      return true;
    });

    Object.keys(recomputeQids).forEach(qid => {
      const query = this.queries[qid];

      if (query) {
        this._recomputeResults(query, qidToOriginalResults[qid]);
      }
    });

    this._observeQueue.drain(); // If we are doing an upsert, and we didn't modify any documents yet, then
    // it's time to do an insert. Figure out what document we are inserting, and
    // generate an id for it.


    let insertedId;

    if (updateCount === 0 && options.upsert) {
      const doc = LocalCollection._createUpsertDocument(selector, mod);

      if (!doc._id && options.insertedId) {
        doc._id = options.insertedId;
      }

      insertedId = this.insert(doc);
      updateCount = 1;
    } // Return the number of affected documents, or in the upsert case, an object
    // containing the number of affected docs and the id of the doc that was
    // inserted, if any.


    let result;

    if (options._returnObject) {
      result = {
        numberAffected: updateCount
      };

      if (insertedId !== undefined) {
        result.insertedId = insertedId;
      }
    } else {
      result = updateCount;
    }

    if (callback) {
      Meteor.defer(() => {
        callback(null, result);
      });
    }

    return result;
  } // A convenience wrapper on update. LocalCollection.upsert(sel, mod) is
  // equivalent to LocalCollection.update(sel, mod, {upsert: true,
  // _returnObject: true}).


  upsert(selector, mod, options, callback) {
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }

    return this.update(selector, mod, Object.assign({}, options, {
      upsert: true,
      _returnObject: true
    }), callback);
  } // Iterates over a subset of documents that could match selector; calls
  // fn(doc, id) on each of them.  Specifically, if selector specifies
  // specific _id's, it only looks at those.  doc is *not* cloned: it is the
  // same object that is in _docs.


  _eachPossiblyMatchingDoc(selector, fn) {
    const specificIds = LocalCollection._idsMatchedBySelector(selector);

    if (specificIds) {
      specificIds.some(id => {
        const doc = this._docs.get(id);

        if (doc) {
          return fn(doc, id) === false;
        }
      });
    } else {
      this._docs.forEach(fn);
    }
  }

  _modifyAndNotify(doc, mod, recomputeQids, arrayIndices) {
    const matched_before = {};
    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];

      if (query.dirty) {
        return;
      }

      if (query.ordered) {
        matched_before[qid] = query.matcher.documentMatches(doc).result;
      } else {
        // Because we don't support skip or limit (yet) in unordered queries, we
        // can just do a direct lookup.
        matched_before[qid] = query.results.has(doc._id);
      }
    });
    const old_doc = EJSON.clone(doc);

    LocalCollection._modify(doc, mod, {
      arrayIndices
    });

    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];

      if (query.dirty) {
        return;
      }

      const afterMatch = query.matcher.documentMatches(doc);
      const after = afterMatch.result;
      const before = matched_before[qid];

      if (after && query.distances && afterMatch.distance !== undefined) {
        query.distances.set(doc._id, afterMatch.distance);
      }

      if (query.cursor.skip || query.cursor.limit) {
        // We need to recompute any query where the doc may have been in the
        // cursor's window either before or after the update. (Note that if skip
        // or limit is set, "before" and "after" being true do not necessarily
        // mean that the document is in the cursor's output after skip/limit is
        // applied... but if they are false, then the document definitely is NOT
        // in the output. So it's safe to skip recompute if neither before or
        // after are true.)
        if (before || after) {
          recomputeQids[qid] = true;
        }
      } else if (before && !after) {
        LocalCollection._removeFromResults(query, doc);
      } else if (!before && after) {
        LocalCollection._insertInResults(query, doc);
      } else if (before && after) {
        LocalCollection._updateInResults(query, doc, old_doc);
      }
    });
  } // Recomputes the results of a query and runs observe callbacks for the
  // difference between the previous results and the current results (unless
  // paused). Used for skip/limit queries.
  //
  // When this is used by insert or remove, it can just use query.results for
  // the old results (and there's no need to pass in oldResults), because these
  // operations don't mutate the documents in the collection. Update needs to
  // pass in an oldResults which was deep-copied before the modifier was
  // applied.
  //
  // oldResults is guaranteed to be ignored if the query is not paused.


  _recomputeResults(query, oldResults) {
    if (this.paused) {
      // There's no reason to recompute the results now as we're still paused.
      // By flagging the query as "dirty", the recompute will be performed
      // when resumeObservers is called.
      query.dirty = true;
      return;
    }

    if (!this.paused && !oldResults) {
      oldResults = query.results;
    }

    if (query.distances) {
      query.distances.clear();
    }

    query.results = query.cursor._getRawObjects({
      distances: query.distances,
      ordered: query.ordered
    });

    if (!this.paused) {
      LocalCollection._diffQueryChanges(query.ordered, oldResults, query.results, query, {
        projectionFn: query.projectionFn
      });
    }
  }

  _saveOriginal(id, doc) {
    // Are we even trying to save originals?
    if (!this._savedOriginals) {
      return;
    } // Have we previously mutated the original (and so 'doc' is not actually
    // original)?  (Note the 'has' check rather than truth: we store undefined
    // here for inserted docs!)


    if (this._savedOriginals.has(id)) {
      return;
    }

    this._savedOriginals.set(id, EJSON.clone(doc));
  }

}

LocalCollection.Cursor = Cursor;
LocalCollection.ObserveHandle = ObserveHandle; // XXX maybe move these into another ObserveHelpers package or something
// _CachingChangeObserver is an object which receives observeChanges callbacks
// and keeps a cache of the current cursor state up to date in this.docs. Users
// of this class should read the docs field but not modify it. You should pass
// the "applyChange" field as the callbacks to the underlying observeChanges
// call. Optionally, you can specify your own observeChanges callbacks which are
// invoked immediately before the docs field is updated; this object is made
// available as `this` to those callbacks.

LocalCollection._CachingChangeObserver = class _CachingChangeObserver {
  constructor() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    const orderedFromCallbacks = options.callbacks && LocalCollection._observeChangesCallbacksAreOrdered(options.callbacks);

    if (hasOwn.call(options, 'ordered')) {
      this.ordered = options.ordered;

      if (options.callbacks && options.ordered !== orderedFromCallbacks) {
        throw Error('ordered option doesn\'t match callbacks');
      }
    } else if (options.callbacks) {
      this.ordered = orderedFromCallbacks;
    } else {
      throw Error('must provide ordered or callbacks');
    }

    const callbacks = options.callbacks || {};

    if (this.ordered) {
      this.docs = new OrderedDict(MongoID.idStringify);
      this.applyChange = {
        addedBefore: (id, fields, before) => {
          // Take a shallow copy since the top-level properties can be changed
          const doc = _objectSpread({}, fields);

          doc._id = id;

          if (callbacks.addedBefore) {
            callbacks.addedBefore.call(this, id, EJSON.clone(fields), before);
          } // This line triggers if we provide added with movedBefore.


          if (callbacks.added) {
            callbacks.added.call(this, id, EJSON.clone(fields));
          } // XXX could `before` be a falsy ID?  Technically
          // idStringify seems to allow for them -- though
          // OrderedDict won't call stringify on a falsy arg.


          this.docs.putBefore(id, doc, before || null);
        },
        movedBefore: (id, before) => {
          const doc = this.docs.get(id);

          if (callbacks.movedBefore) {
            callbacks.movedBefore.call(this, id, before);
          }

          this.docs.moveBefore(id, before || null);
        }
      };
    } else {
      this.docs = new LocalCollection._IdMap();
      this.applyChange = {
        added: (id, fields) => {
          // Take a shallow copy since the top-level properties can be changed
          const doc = _objectSpread({}, fields);

          if (callbacks.added) {
            callbacks.added.call(this, id, EJSON.clone(fields));
          }

          doc._id = id;
          this.docs.set(id, doc);
        }
      };
    } // The methods in _IdMap and OrderedDict used by these callbacks are
    // identical.


    this.applyChange.changed = (id, fields) => {
      const doc = this.docs.get(id);

      if (!doc) {
        throw new Error("Unknown id for changed: ".concat(id));
      }

      if (callbacks.changed) {
        callbacks.changed.call(this, id, EJSON.clone(fields));
      }

      DiffSequence.applyChanges(doc, fields);
    };

    this.applyChange.removed = id => {
      if (callbacks.removed) {
        callbacks.removed.call(this, id);
      }

      this.docs.remove(id);
    };
  }

};
LocalCollection._IdMap = class _IdMap extends IdMap {
  constructor() {
    super(MongoID.idStringify, MongoID.idParse);
  }

}; // Wrap a transform function to return objects that have the _id field
// of the untransformed document. This ensures that subsystems such as
// the observe-sequence package that call `observe` can keep track of
// the documents identities.
//
// - Require that it returns objects
// - If the return value has an _id field, verify that it matches the
//   original _id field
// - If the return value doesn't have an _id field, add it back.

LocalCollection.wrapTransform = transform => {
  if (!transform) {
    return null;
  } // No need to doubly-wrap transforms.


  if (transform.__wrappedTransform__) {
    return transform;
  }

  const wrapped = doc => {
    if (!hasOwn.call(doc, '_id')) {
      // XXX do we ever have a transform on the oplog's collection? because that
      // collection has no _id.
      throw new Error('can only transform documents with _id');
    }

    const id = doc._id; // XXX consider making tracker a weak dependency and checking
    // Package.tracker here

    const transformed = Tracker.nonreactive(() => transform(doc));

    if (!LocalCollection._isPlainObject(transformed)) {
      throw new Error('transform must return object');
    }

    if (hasOwn.call(transformed, '_id')) {
      if (!EJSON.equals(transformed._id, id)) {
        throw new Error('transformed document can\'t have different _id');
      }
    } else {
      transformed._id = id;
    }

    return transformed;
  };

  wrapped.__wrappedTransform__ = true;
  return wrapped;
}; // XXX the sorted-query logic below is laughably inefficient. we'll
// need to come up with a better datastructure for this.
//
// XXX the logic for observing with a skip or a limit is even more
// laughably inefficient. we recompute the whole results every time!
// This binary search puts a value between any equal values, and the first
// lesser value.


LocalCollection._binarySearch = (cmp, array, value) => {
  let first = 0;
  let range = array.length;

  while (range > 0) {
    const halfRange = Math.floor(range / 2);

    if (cmp(value, array[first + halfRange]) >= 0) {
      first += halfRange + 1;
      range -= halfRange + 1;
    } else {
      range = halfRange;
    }
  }

  return first;
};

LocalCollection._checkSupportedProjection = fields => {
  if (fields !== Object(fields) || Array.isArray(fields)) {
    throw MinimongoError('fields option must be an object');
  }

  Object.keys(fields).forEach(keyPath => {
    if (keyPath.split('.').includes('$')) {
      throw MinimongoError('Minimongo doesn\'t support $ operator in projections yet.');
    }

    const value = fields[keyPath];

    if (typeof value === 'object' && ['$elemMatch', '$meta', '$slice'].some(key => hasOwn.call(value, key))) {
      throw MinimongoError('Minimongo doesn\'t support operators in projections yet.');
    }

    if (![1, 0, true, false].includes(value)) {
      throw MinimongoError('Projection values should be one of 1, 0, true, or false');
    }
  });
}; // Knows how to compile a fields projection to a predicate function.
// @returns - Function: a closure that filters out an object according to the
//            fields projection rules:
//            @param obj - Object: MongoDB-styled document
//            @returns - Object: a document with the fields filtered out
//                       according to projection rules. Doesn't retain subfields
//                       of passed argument.


LocalCollection._compileProjection = fields => {
  LocalCollection._checkSupportedProjection(fields);

  const _idProjection = fields._id === undefined ? true : fields._id;

  const details = projectionDetails(fields); // returns transformed doc according to ruleTree

  const transform = (doc, ruleTree) => {
    // Special case for "sets"
    if (Array.isArray(doc)) {
      return doc.map(subdoc => transform(subdoc, ruleTree));
    }

    const result = details.including ? {} : EJSON.clone(doc);
    Object.keys(ruleTree).forEach(key => {
      if (doc == null || !hasOwn.call(doc, key)) {
        return;
      }

      const rule = ruleTree[key];

      if (rule === Object(rule)) {
        // For sub-objects/subsets we branch
        if (doc[key] === Object(doc[key])) {
          result[key] = transform(doc[key], rule);
        }
      } else if (details.including) {
        // Otherwise we don't even touch this subfield
        result[key] = EJSON.clone(doc[key]);
      } else {
        delete result[key];
      }
    });
    return doc != null ? result : doc;
  };

  return doc => {
    const result = transform(doc, details.tree);

    if (_idProjection && hasOwn.call(doc, '_id')) {
      result._id = doc._id;
    }

    if (!_idProjection && hasOwn.call(result, '_id')) {
      delete result._id;
    }

    return result;
  };
}; // Calculates the document to insert in case we're doing an upsert and the
// selector does not match any elements


LocalCollection._createUpsertDocument = (selector, modifier) => {
  const selectorDocument = populateDocumentWithQueryFields(selector);

  const isModify = LocalCollection._isModificationMod(modifier);

  const newDoc = {};

  if (selectorDocument._id) {
    newDoc._id = selectorDocument._id;
    delete selectorDocument._id;
  } // This double _modify call is made to help with nested properties (see issue
  // #8631). We do this even if it's a replacement for validation purposes (e.g.
  // ambiguous id's)


  LocalCollection._modify(newDoc, {
    $set: selectorDocument
  });

  LocalCollection._modify(newDoc, modifier, {
    isInsert: true
  });

  if (isModify) {
    return newDoc;
  } // Replacement can take _id from query document


  const replacement = Object.assign({}, modifier);

  if (newDoc._id) {
    replacement._id = newDoc._id;
  }

  return replacement;
};

LocalCollection._diffObjects = (left, right, callbacks) => {
  return DiffSequence.diffObjects(left, right, callbacks);
}; // ordered: bool.
// old_results and new_results: collections of documents.
//    if ordered, they are arrays.
//    if unordered, they are IdMaps


LocalCollection._diffQueryChanges = (ordered, oldResults, newResults, observer, options) => DiffSequence.diffQueryChanges(ordered, oldResults, newResults, observer, options);

LocalCollection._diffQueryOrderedChanges = (oldResults, newResults, observer, options) => DiffSequence.diffQueryOrderedChanges(oldResults, newResults, observer, options);

LocalCollection._diffQueryUnorderedChanges = (oldResults, newResults, observer, options) => DiffSequence.diffQueryUnorderedChanges(oldResults, newResults, observer, options);

LocalCollection._findInOrderedResults = (query, doc) => {
  if (!query.ordered) {
    throw new Error('Can\'t call _findInOrderedResults on unordered query');
  }

  for (let i = 0; i < query.results.length; i++) {
    if (query.results[i] === doc) {
      return i;
    }
  }

  throw Error('object missing from query');
}; // If this is a selector which explicitly constrains the match by ID to a finite
// number of documents, returns a list of their IDs.  Otherwise returns
// null. Note that the selector may have other restrictions so it may not even
// match those document!  We care about $in and $and since those are generated
// access-controlled update and remove.


LocalCollection._idsMatchedBySelector = selector => {
  // Is the selector just an ID?
  if (LocalCollection._selectorIsId(selector)) {
    return [selector];
  }

  if (!selector) {
    return null;
  } // Do we have an _id clause?


  if (hasOwn.call(selector, '_id')) {
    // Is the _id clause just an ID?
    if (LocalCollection._selectorIsId(selector._id)) {
      return [selector._id];
    } // Is the _id clause {_id: {$in: ["x", "y", "z"]}}?


    if (selector._id && Array.isArray(selector._id.$in) && selector._id.$in.length && selector._id.$in.every(LocalCollection._selectorIsId)) {
      return selector._id.$in;
    }

    return null;
  } // If this is a top-level $and, and any of the clauses constrain their
  // documents, then the whole selector is constrained by any one clause's
  // constraint. (Well, by their intersection, but that seems unlikely.)


  if (Array.isArray(selector.$and)) {
    for (let i = 0; i < selector.$and.length; ++i) {
      const subIds = LocalCollection._idsMatchedBySelector(selector.$and[i]);

      if (subIds) {
        return subIds;
      }
    }
  }

  return null;
};

LocalCollection._insertInResults = (query, doc) => {
  const fields = EJSON.clone(doc);
  delete fields._id;

  if (query.ordered) {
    if (!query.sorter) {
      query.addedBefore(doc._id, query.projectionFn(fields), null);
      query.results.push(doc);
    } else {
      const i = LocalCollection._insertInSortedList(query.sorter.getComparator({
        distances: query.distances
      }), query.results, doc);

      let next = query.results[i + 1];

      if (next) {
        next = next._id;
      } else {
        next = null;
      }

      query.addedBefore(doc._id, query.projectionFn(fields), next);
    }

    query.added(doc._id, query.projectionFn(fields));
  } else {
    query.added(doc._id, query.projectionFn(fields));
    query.results.set(doc._id, doc);
  }
};

LocalCollection._insertInSortedList = (cmp, array, value) => {
  if (array.length === 0) {
    array.push(value);
    return 0;
  }

  const i = LocalCollection._binarySearch(cmp, array, value);

  array.splice(i, 0, value);
  return i;
};

LocalCollection._isModificationMod = mod => {
  let isModify = false;
  let isReplace = false;
  Object.keys(mod).forEach(key => {
    if (key.substr(0, 1) === '$') {
      isModify = true;
    } else {
      isReplace = true;
    }
  });

  if (isModify && isReplace) {
    throw new Error('Update parameter cannot have both modifier and non-modifier fields.');
  }

  return isModify;
}; // XXX maybe this should be EJSON.isObject, though EJSON doesn't know about
// RegExp
// XXX note that _type(undefined) === 3!!!!


LocalCollection._isPlainObject = x => {
  return x && LocalCollection._f._type(x) === 3;
}; // XXX need a strategy for passing the binding of $ into this
// function, from the compiled selector
//
// maybe just {key.up.to.just.before.dollarsign: array_index}
//
// XXX atomicity: if one modification fails, do we roll back the whole
// change?
//
// options:
//   - isInsert is set when _modify is being called to compute the document to
//     insert as part of an upsert operation. We use this primarily to figure
//     out when to set the fields in $setOnInsert, if present.


LocalCollection._modify = function (doc, modifier) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  if (!LocalCollection._isPlainObject(modifier)) {
    throw MinimongoError('Modifier must be an object');
  } // Make sure the caller can't mutate our data structures.


  modifier = EJSON.clone(modifier);
  const isModifier = isOperatorObject(modifier);
  const newDoc = isModifier ? EJSON.clone(doc) : modifier;

  if (isModifier) {
    // apply modifiers to the doc.
    Object.keys(modifier).forEach(operator => {
      // Treat $setOnInsert as $set if this is an insert.
      const setOnInsert = options.isInsert && operator === '$setOnInsert';
      const modFunc = MODIFIERS[setOnInsert ? '$set' : operator];
      const operand = modifier[operator];

      if (!modFunc) {
        throw MinimongoError("Invalid modifier specified ".concat(operator));
      }

      Object.keys(operand).forEach(keypath => {
        const arg = operand[keypath];

        if (keypath === '') {
          throw MinimongoError('An empty update path is not valid.');
        }

        const keyparts = keypath.split('.');

        if (!keyparts.every(Boolean)) {
          throw MinimongoError("The update path '".concat(keypath, "' contains an empty field name, ") + 'which is not allowed.');
        }

        const target = findModTarget(newDoc, keyparts, {
          arrayIndices: options.arrayIndices,
          forbidArray: operator === '$rename',
          noCreate: NO_CREATE_MODIFIERS[operator]
        });
        modFunc(target, keyparts.pop(), arg, keypath, newDoc);
      });
    });

    if (doc._id && !EJSON.equals(doc._id, newDoc._id)) {
      throw MinimongoError("After applying the update to the document {_id: \"".concat(doc._id, "\", ...},") + ' the (immutable) field \'_id\' was found to have been altered to ' + "_id: \"".concat(newDoc._id, "\""));
    }
  } else {
    if (doc._id && modifier._id && !EJSON.equals(doc._id, modifier._id)) {
      throw MinimongoError("The _id field cannot be changed from {_id: \"".concat(doc._id, "\"} to ") + "{_id: \"".concat(modifier._id, "\"}"));
    } // replace the whole document


    assertHasValidFieldNames(modifier);
  } // move new document into place.


  Object.keys(doc).forEach(key => {
    // Note: this used to be for (var key in doc) however, this does not
    // work right in Opera. Deleting from a doc while iterating over it
    // would sometimes cause opera to skip some keys.
    if (key !== '_id') {
      delete doc[key];
    }
  });
  Object.keys(newDoc).forEach(key => {
    doc[key] = newDoc[key];
  });
};

LocalCollection._observeFromObserveChanges = (cursor, observeCallbacks) => {
  const transform = cursor.getTransform() || (doc => doc);

  let suppressed = !!observeCallbacks._suppress_initial;
  let observeChangesCallbacks;

  if (LocalCollection._observeCallbacksAreOrdered(observeCallbacks)) {
    // The "_no_indices" option sets all index arguments to -1 and skips the
    // linear scans required to generate them.  This lets observers that don't
    // need absolute indices benefit from the other features of this API --
    // relative order, transforms, and applyChanges -- without the speed hit.
    const indices = !observeCallbacks._no_indices;
    observeChangesCallbacks = {
      addedBefore(id, fields, before) {
        if (suppressed || !(observeCallbacks.addedAt || observeCallbacks.added)) {
          return;
        }

        const doc = transform(Object.assign(fields, {
          _id: id
        }));

        if (observeCallbacks.addedAt) {
          observeCallbacks.addedAt(doc, indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1, before);
        } else {
          observeCallbacks.added(doc);
        }
      },

      changed(id, fields) {
        if (!(observeCallbacks.changedAt || observeCallbacks.changed)) {
          return;
        }

        let doc = EJSON.clone(this.docs.get(id));

        if (!doc) {
          throw new Error("Unknown id for changed: ".concat(id));
        }

        const oldDoc = transform(EJSON.clone(doc));
        DiffSequence.applyChanges(doc, fields);

        if (observeCallbacks.changedAt) {
          observeCallbacks.changedAt(transform(doc), oldDoc, indices ? this.docs.indexOf(id) : -1);
        } else {
          observeCallbacks.changed(transform(doc), oldDoc);
        }
      },

      movedBefore(id, before) {
        if (!observeCallbacks.movedTo) {
          return;
        }

        const from = indices ? this.docs.indexOf(id) : -1;
        let to = indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1; // When not moving backwards, adjust for the fact that removing the
        // document slides everything back one slot.

        if (to > from) {
          --to;
        }

        observeCallbacks.movedTo(transform(EJSON.clone(this.docs.get(id))), from, to, before || null);
      },

      removed(id) {
        if (!(observeCallbacks.removedAt || observeCallbacks.removed)) {
          return;
        } // technically maybe there should be an EJSON.clone here, but it's about
        // to be removed from this.docs!


        const doc = transform(this.docs.get(id));

        if (observeCallbacks.removedAt) {
          observeCallbacks.removedAt(doc, indices ? this.docs.indexOf(id) : -1);
        } else {
          observeCallbacks.removed(doc);
        }
      }

    };
  } else {
    observeChangesCallbacks = {
      added(id, fields) {
        if (!suppressed && observeCallbacks.added) {
          observeCallbacks.added(transform(Object.assign(fields, {
            _id: id
          })));
        }
      },

      changed(id, fields) {
        if (observeCallbacks.changed) {
          const oldDoc = this.docs.get(id);
          const doc = EJSON.clone(oldDoc);
          DiffSequence.applyChanges(doc, fields);
          observeCallbacks.changed(transform(doc), transform(EJSON.clone(oldDoc)));
        }
      },

      removed(id) {
        if (observeCallbacks.removed) {
          observeCallbacks.removed(transform(this.docs.get(id)));
        }
      }

    };
  }

  const changeObserver = new LocalCollection._CachingChangeObserver({
    callbacks: observeChangesCallbacks
  }); // CachingChangeObserver clones all received input on its callbacks
  // So we can mark it as safe to reduce the ejson clones.
  // This is tested by the `mongo-livedata - (extended) scribbling` tests

  changeObserver.applyChange._fromObserve = true;
  const handle = cursor.observeChanges(changeObserver.applyChange, {
    nonMutatingCallbacks: true
  });
  suppressed = false;
  return handle;
};

LocalCollection._observeCallbacksAreOrdered = callbacks => {
  if (callbacks.added && callbacks.addedAt) {
    throw new Error('Please specify only one of added() and addedAt()');
  }

  if (callbacks.changed && callbacks.changedAt) {
    throw new Error('Please specify only one of changed() and changedAt()');
  }

  if (callbacks.removed && callbacks.removedAt) {
    throw new Error('Please specify only one of removed() and removedAt()');
  }

  return !!(callbacks.addedAt || callbacks.changedAt || callbacks.movedTo || callbacks.removedAt);
};

LocalCollection._observeChangesCallbacksAreOrdered = callbacks => {
  if (callbacks.added && callbacks.addedBefore) {
    throw new Error('Please specify only one of added() and addedBefore()');
  }

  return !!(callbacks.addedBefore || callbacks.movedBefore);
};

LocalCollection._removeFromResults = (query, doc) => {
  if (query.ordered) {
    const i = LocalCollection._findInOrderedResults(query, doc);

    query.removed(doc._id);
    query.results.splice(i, 1);
  } else {
    const id = doc._id; // in case callback mutates doc

    query.removed(doc._id);
    query.results.remove(id);
  }
}; // Is this selector just shorthand for lookup by _id?


LocalCollection._selectorIsId = selector => typeof selector === 'number' || typeof selector === 'string' || selector instanceof MongoID.ObjectID; // Is the selector just lookup by _id (shorthand or not)?


LocalCollection._selectorIsIdPerhapsAsObject = selector => LocalCollection._selectorIsId(selector) || LocalCollection._selectorIsId(selector && selector._id) && Object.keys(selector).length === 1;

LocalCollection._updateInResults = (query, doc, old_doc) => {
  if (!EJSON.equals(doc._id, old_doc._id)) {
    throw new Error('Can\'t change a doc\'s _id while updating');
  }

  const projectionFn = query.projectionFn;
  const changedFields = DiffSequence.makeChangedFields(projectionFn(doc), projectionFn(old_doc));

  if (!query.ordered) {
    if (Object.keys(changedFields).length) {
      query.changed(doc._id, changedFields);
      query.results.set(doc._id, doc);
    }

    return;
  }

  const old_idx = LocalCollection._findInOrderedResults(query, doc);

  if (Object.keys(changedFields).length) {
    query.changed(doc._id, changedFields);
  }

  if (!query.sorter) {
    return;
  } // just take it out and put it back in again, and see if the index changes


  query.results.splice(old_idx, 1);

  const new_idx = LocalCollection._insertInSortedList(query.sorter.getComparator({
    distances: query.distances
  }), query.results, doc);

  if (old_idx !== new_idx) {
    let next = query.results[new_idx + 1];

    if (next) {
      next = next._id;
    } else {
      next = null;
    }

    query.movedBefore && query.movedBefore(doc._id, next);
  }
};

const MODIFIERS = {
  $currentDate(target, field, arg) {
    if (typeof arg === 'object' && hasOwn.call(arg, '$type')) {
      if (arg.$type !== 'date') {
        throw MinimongoError('Minimongo does currently only support the date type in ' + '$currentDate modifiers', {
          field
        });
      }
    } else if (arg !== true) {
      throw MinimongoError('Invalid $currentDate modifier', {
        field
      });
    }

    target[field] = new Date();
  },

  $min(target, field, arg) {
    if (typeof arg !== 'number') {
      throw MinimongoError('Modifier $min allowed for numbers only', {
        field
      });
    }

    if (field in target) {
      if (typeof target[field] !== 'number') {
        throw MinimongoError('Cannot apply $min modifier to non-number', {
          field
        });
      }

      if (target[field] > arg) {
        target[field] = arg;
      }
    } else {
      target[field] = arg;
    }
  },

  $max(target, field, arg) {
    if (typeof arg !== 'number') {
      throw MinimongoError('Modifier $max allowed for numbers only', {
        field
      });
    }

    if (field in target) {
      if (typeof target[field] !== 'number') {
        throw MinimongoError('Cannot apply $max modifier to non-number', {
          field
        });
      }

      if (target[field] < arg) {
        target[field] = arg;
      }
    } else {
      target[field] = arg;
    }
  },

  $inc(target, field, arg) {
    if (typeof arg !== 'number') {
      throw MinimongoError('Modifier $inc allowed for numbers only', {
        field
      });
    }

    if (field in target) {
      if (typeof target[field] !== 'number') {
        throw MinimongoError('Cannot apply $inc modifier to non-number', {
          field
        });
      }

      target[field] += arg;
    } else {
      target[field] = arg;
    }
  },

  $set(target, field, arg) {
    if (target !== Object(target)) {
      // not an array or an object
      const error = MinimongoError('Cannot set property on non-object field', {
        field
      });
      error.setPropertyError = true;
      throw error;
    }

    if (target === null) {
      const error = MinimongoError('Cannot set property on null', {
        field
      });
      error.setPropertyError = true;
      throw error;
    }

    assertHasValidFieldNames(arg);
    target[field] = arg;
  },

  $setOnInsert(target, field, arg) {// converted to `$set` in `_modify`
  },

  $unset(target, field, arg) {
    if (target !== undefined) {
      if (target instanceof Array) {
        if (field in target) {
          target[field] = null;
        }
      } else {
        delete target[field];
      }
    }
  },

  $push(target, field, arg) {
    if (target[field] === undefined) {
      target[field] = [];
    }

    if (!(target[field] instanceof Array)) {
      throw MinimongoError('Cannot apply $push modifier to non-array', {
        field
      });
    }

    if (!(arg && arg.$each)) {
      // Simple mode: not $each
      assertHasValidFieldNames(arg);
      target[field].push(arg);
      return;
    } // Fancy mode: $each (and maybe $slice and $sort and $position)


    const toPush = arg.$each;

    if (!(toPush instanceof Array)) {
      throw MinimongoError('$each must be an array', {
        field
      });
    }

    assertHasValidFieldNames(toPush); // Parse $position

    let position = undefined;

    if ('$position' in arg) {
      if (typeof arg.$position !== 'number') {
        throw MinimongoError('$position must be a numeric value', {
          field
        });
      } // XXX should check to make sure integer


      if (arg.$position < 0) {
        throw MinimongoError('$position in $push must be zero or positive', {
          field
        });
      }

      position = arg.$position;
    } // Parse $slice.


    let slice = undefined;

    if ('$slice' in arg) {
      if (typeof arg.$slice !== 'number') {
        throw MinimongoError('$slice must be a numeric value', {
          field
        });
      } // XXX should check to make sure integer


      slice = arg.$slice;
    } // Parse $sort.


    let sortFunction = undefined;

    if (arg.$sort) {
      if (slice === undefined) {
        throw MinimongoError('$sort requires $slice to be present', {
          field
        });
      } // XXX this allows us to use a $sort whose value is an array, but that's
      // actually an extension of the Node driver, so it won't work
      // server-side. Could be confusing!
      // XXX is it correct that we don't do geo-stuff here?


      sortFunction = new Minimongo.Sorter(arg.$sort).getComparator();
      toPush.forEach(element => {
        if (LocalCollection._f._type(element) !== 3) {
          throw MinimongoError('$push like modifiers using $sort require all elements to be ' + 'objects', {
            field
          });
        }
      });
    } // Actually push.


    if (position === undefined) {
      toPush.forEach(element => {
        target[field].push(element);
      });
    } else {
      const spliceArguments = [position, 0];
      toPush.forEach(element => {
        spliceArguments.push(element);
      });
      target[field].splice(...spliceArguments);
    } // Actually sort.


    if (sortFunction) {
      target[field].sort(sortFunction);
    } // Actually slice.


    if (slice !== undefined) {
      if (slice === 0) {
        target[field] = []; // differs from Array.slice!
      } else if (slice < 0) {
        target[field] = target[field].slice(slice);
      } else {
        target[field] = target[field].slice(0, slice);
      }
    }
  },

  $pushAll(target, field, arg) {
    if (!(typeof arg === 'object' && arg instanceof Array)) {
      throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only');
    }

    assertHasValidFieldNames(arg);
    const toPush = target[field];

    if (toPush === undefined) {
      target[field] = arg;
    } else if (!(toPush instanceof Array)) {
      throw MinimongoError('Cannot apply $pushAll modifier to non-array', {
        field
      });
    } else {
      toPush.push(...arg);
    }
  },

  $addToSet(target, field, arg) {
    let isEach = false;

    if (typeof arg === 'object') {
      // check if first key is '$each'
      const keys = Object.keys(arg);

      if (keys[0] === '$each') {
        isEach = true;
      }
    }

    const values = isEach ? arg.$each : [arg];
    assertHasValidFieldNames(values);
    const toAdd = target[field];

    if (toAdd === undefined) {
      target[field] = values;
    } else if (!(toAdd instanceof Array)) {
      throw MinimongoError('Cannot apply $addToSet modifier to non-array', {
        field
      });
    } else {
      values.forEach(value => {
        if (toAdd.some(element => LocalCollection._f._equal(value, element))) {
          return;
        }

        toAdd.push(value);
      });
    }
  },

  $pop(target, field, arg) {
    if (target === undefined) {
      return;
    }

    const toPop = target[field];

    if (toPop === undefined) {
      return;
    }

    if (!(toPop instanceof Array)) {
      throw MinimongoError('Cannot apply $pop modifier to non-array', {
        field
      });
    }

    if (typeof arg === 'number' && arg < 0) {
      toPop.splice(0, 1);
    } else {
      toPop.pop();
    }
  },

  $pull(target, field, arg) {
    if (target === undefined) {
      return;
    }

    const toPull = target[field];

    if (toPull === undefined) {
      return;
    }

    if (!(toPull instanceof Array)) {
      throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {
        field
      });
    }

    let out;

    if (arg != null && typeof arg === 'object' && !(arg instanceof Array)) {
      // XXX would be much nicer to compile this once, rather than
      // for each document we modify.. but usually we're not
      // modifying that many documents, so we'll let it slide for
      // now
      // XXX Minimongo.Matcher isn't up for the job, because we need
      // to permit stuff like {$pull: {a: {$gt: 4}}}.. something
      // like {$gt: 4} is not normally a complete selector.
      // same issue as $elemMatch possibly?
      const matcher = new Minimongo.Matcher(arg);
      out = toPull.filter(element => !matcher.documentMatches(element).result);
    } else {
      out = toPull.filter(element => !LocalCollection._f._equal(element, arg));
    }

    target[field] = out;
  },

  $pullAll(target, field, arg) {
    if (!(typeof arg === 'object' && arg instanceof Array)) {
      throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only', {
        field
      });
    }

    if (target === undefined) {
      return;
    }

    const toPull = target[field];

    if (toPull === undefined) {
      return;
    }

    if (!(toPull instanceof Array)) {
      throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {
        field
      });
    }

    target[field] = toPull.filter(object => !arg.some(element => LocalCollection._f._equal(object, element)));
  },

  $rename(target, field, arg, keypath, doc) {
    // no idea why mongo has this restriction..
    if (keypath === arg) {
      throw MinimongoError('$rename source must differ from target', {
        field
      });
    }

    if (target === null) {
      throw MinimongoError('$rename source field invalid', {
        field
      });
    }

    if (typeof arg !== 'string') {
      throw MinimongoError('$rename target must be a string', {
        field
      });
    }

    if (arg.includes('\0')) {
      // Null bytes are not allowed in Mongo field names
      // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names
      throw MinimongoError('The \'to\' field for $rename cannot contain an embedded null byte', {
        field
      });
    }

    if (target === undefined) {
      return;
    }

    const object = target[field];
    delete target[field];
    const keyparts = arg.split('.');
    const target2 = findModTarget(doc, keyparts, {
      forbidArray: true
    });

    if (target2 === null) {
      throw MinimongoError('$rename target field invalid', {
        field
      });
    }

    target2[keyparts.pop()] = object;
  },

  $bit(target, field, arg) {
    // XXX mongo only supports $bit on integers, and we only support
    // native javascript numbers (doubles) so far, so we can't support $bit
    throw MinimongoError('$bit is not supported', {
      field
    });
  },

  $v() {// As discussed in https://github.com/meteor/meteor/issues/9623,
    // the `$v` operator is not needed by Meteor, but problems can occur if
    // it's not at least callable (as of Mongo >= 3.6). It's defined here as
    // a no-op to work around these problems.
  }

};
const NO_CREATE_MODIFIERS = {
  $pop: true,
  $pull: true,
  $pullAll: true,
  $rename: true,
  $unset: true
}; // Make sure field names do not contain Mongo restricted
// characters ('.', '$', '\0').
// https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names

const invalidCharMsg = {
  $: 'start with \'$\'',
  '.': 'contain \'.\'',
  '\0': 'contain null bytes'
}; // checks if all field names in an object are valid

function assertHasValidFieldNames(doc) {
  if (doc && typeof doc === 'object') {
    JSON.stringify(doc, (key, value) => {
      assertIsValidFieldName(key);
      return value;
    });
  }
}

function assertIsValidFieldName(key) {
  let match;

  if (typeof key === 'string' && (match = key.match(/^\$|\.|\0/))) {
    throw MinimongoError("Key ".concat(key, " must not ").concat(invalidCharMsg[match[0]]));
  }
} // for a.b.c.2.d.e, keyparts should be ['a', 'b', 'c', '2', 'd', 'e'],
// and then you would operate on the 'e' property of the returned
// object.
//
// if options.noCreate is falsey, creates intermediate levels of
// structure as necessary, like mkdir -p (and raises an exception if
// that would mean giving a non-numeric property to an array.) if
// options.noCreate is true, return undefined instead.
//
// may modify the last element of keyparts to signal to the caller that it needs
// to use a different value to index into the returned object (for example,
// ['a', '01'] -> ['a', 1]).
//
// if forbidArray is true, return null if the keypath goes through an array.
//
// if options.arrayIndices is set, use its first element for the (first) '$' in
// the path.


function findModTarget(doc, keyparts) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let usedArrayIndex = false;

  for (let i = 0; i < keyparts.length; i++) {
    const last = i === keyparts.length - 1;
    let keypart = keyparts[i];

    if (!isIndexable(doc)) {
      if (options.noCreate) {
        return undefined;
      }

      const error = MinimongoError("cannot use the part '".concat(keypart, "' to traverse ").concat(doc));
      error.setPropertyError = true;
      throw error;
    }

    if (doc instanceof Array) {
      if (options.forbidArray) {
        return null;
      }

      if (keypart === '$') {
        if (usedArrayIndex) {
          throw MinimongoError('Too many positional (i.e. \'$\') elements');
        }

        if (!options.arrayIndices || !options.arrayIndices.length) {
          throw MinimongoError('The positional operator did not find the match needed from the ' + 'query');
        }

        keypart = options.arrayIndices[0];
        usedArrayIndex = true;
      } else if (isNumericKey(keypart)) {
        keypart = parseInt(keypart);
      } else {
        if (options.noCreate) {
          return undefined;
        }

        throw MinimongoError("can't append to array using string field name [".concat(keypart, "]"));
      }

      if (last) {
        keyparts[i] = keypart; // handle 'a.01'
      }

      if (options.noCreate && keypart >= doc.length) {
        return undefined;
      }

      while (doc.length < keypart) {
        doc.push(null);
      }

      if (!last) {
        if (doc.length === keypart) {
          doc.push({});
        } else if (typeof doc[keypart] !== 'object') {
          throw MinimongoError("can't modify field '".concat(keyparts[i + 1], "' of list value ") + JSON.stringify(doc[keypart]));
        }
      }
    } else {
      assertIsValidFieldName(keypart);

      if (!(keypart in doc)) {
        if (options.noCreate) {
          return undefined;
        }

        if (!last) {
          doc[keypart] = {};
        }
      }
    }

    if (last) {
      return doc;
    }

    doc = doc[keypart];
  } // notreached

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"matcher.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/matcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _Package$mongoDecima;

module.export({
  default: () => Matcher
});
let LocalCollection;
module.link("./local_collection.js", {
  default(v) {
    LocalCollection = v;
  }

}, 0);
let compileDocumentSelector, hasOwn, nothingMatcher;
module.link("./common.js", {
  compileDocumentSelector(v) {
    compileDocumentSelector = v;
  },

  hasOwn(v) {
    hasOwn = v;
  },

  nothingMatcher(v) {
    nothingMatcher = v;
  }

}, 1);
const Decimal = ((_Package$mongoDecima = Package['mongo-decimal']) === null || _Package$mongoDecima === void 0 ? void 0 : _Package$mongoDecima.Decimal) || class DecimalStub {}; // The minimongo selector compiler!
// Terminology:
//  - a 'selector' is the EJSON object representing a selector
//  - a 'matcher' is its compiled form (whether a full Minimongo.Matcher
//    object or one of the component lambdas that matches parts of it)
//  - a 'result object' is an object with a 'result' field and maybe
//    distance and arrayIndices.
//  - a 'branched value' is an object with a 'value' field and maybe
//    'dontIterate' and 'arrayIndices'.
//  - a 'document' is a top-level object that can be stored in a collection.
//  - a 'lookup function' is a function that takes in a document and returns
//    an array of 'branched values'.
//  - a 'branched matcher' maps from an array of branched values to a result
//    object.
//  - an 'element matcher' maps from a single value to a bool.
// Main entry point.
//   var matcher = new Minimongo.Matcher({a: {$gt: 5}});
//   if (matcher.documentMatches({a: 7})) ...

class Matcher {
  constructor(selector, isUpdate) {
    // A set (object mapping string -> *) of all of the document paths looked
    // at by the selector. Also includes the empty string if it may look at any
    // path (eg, $where).
    this._paths = {}; // Set to true if compilation finds a $near.

    this._hasGeoQuery = false; // Set to true if compilation finds a $where.

    this._hasWhere = false; // Set to false if compilation finds anything other than a simple equality
    // or one or more of '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin' used
    // with scalars as operands.

    this._isSimple = true; // Set to a dummy document which always matches this Matcher. Or set to null
    // if such document is too hard to find.

    this._matchingDocument = undefined; // A clone of the original selector. It may just be a function if the user
    // passed in a function; otherwise is definitely an object (eg, IDs are
    // translated into {_id: ID} first. Used by canBecomeTrueByModifier and
    // Sorter._useWithMatcher.

    this._selector = null;
    this._docMatcher = this._compileSelector(selector); // Set to true if selection is done for an update operation
    // Default is false
    // Used for $near array update (issue #3599)

    this._isUpdate = isUpdate;
  }

  documentMatches(doc) {
    if (doc !== Object(doc)) {
      throw Error('documentMatches needs a document');
    }

    return this._docMatcher(doc);
  }

  hasGeoQuery() {
    return this._hasGeoQuery;
  }

  hasWhere() {
    return this._hasWhere;
  }

  isSimple() {
    return this._isSimple;
  } // Given a selector, return a function that takes one argument, a
  // document. It returns a result object.


  _compileSelector(selector) {
    // you can pass a literal function instead of a selector
    if (selector instanceof Function) {
      this._isSimple = false;
      this._selector = selector;

      this._recordPathUsed('');

      return doc => ({
        result: !!selector.call(doc)
      });
    } // shorthand -- scalar _id


    if (LocalCollection._selectorIsId(selector)) {
      this._selector = {
        _id: selector
      };

      this._recordPathUsed('_id');

      return doc => ({
        result: EJSON.equals(doc._id, selector)
      });
    } // protect against dangerous selectors.  falsey and {_id: falsey} are both
    // likely programmer error, and not what you want, particularly for
    // destructive operations.


    if (!selector || hasOwn.call(selector, '_id') && !selector._id) {
      this._isSimple = false;
      return nothingMatcher;
    } // Top level can't be an array or true or binary.


    if (Array.isArray(selector) || EJSON.isBinary(selector) || typeof selector === 'boolean') {
      throw new Error("Invalid selector: ".concat(selector));
    }

    this._selector = EJSON.clone(selector);
    return compileDocumentSelector(selector, this, {
      isRoot: true
    });
  } // Returns a list of key paths the given selector is looking for. It includes
  // the empty string if there is a $where.


  _getPaths() {
    return Object.keys(this._paths);
  }

  _recordPathUsed(path) {
    this._paths[path] = true;
  }

}

// helpers used by compiled selector code
LocalCollection._f = {
  // XXX for _all and _in, consider building 'inquery' at compile time..
  _type(v) {
    if (typeof v === 'number') {
      return 1;
    }

    if (typeof v === 'string') {
      return 2;
    }

    if (typeof v === 'boolean') {
      return 8;
    }

    if (Array.isArray(v)) {
      return 4;
    }

    if (v === null) {
      return 10;
    } // note that typeof(/x/) === "object"


    if (v instanceof RegExp) {
      return 11;
    }

    if (typeof v === 'function') {
      return 13;
    }

    if (v instanceof Date) {
      return 9;
    }

    if (EJSON.isBinary(v)) {
      return 5;
    }

    if (v instanceof MongoID.ObjectID) {
      return 7;
    }

    if (v instanceof Decimal) {
      return 1;
    } // object


    return 3; // XXX support some/all of these:
    // 14, symbol
    // 15, javascript code with scope
    // 16, 18: 32-bit/64-bit integer
    // 17, timestamp
    // 255, minkey
    // 127, maxkey
  },

  // deep equality test: use for literal document and array matches
  _equal(a, b) {
    return EJSON.equals(a, b, {
      keyOrderSensitive: true
    });
  },

  // maps a type code to a value that can be used to sort values of different
  // types
  _typeorder(t) {
    // http://www.mongodb.org/display/DOCS/What+is+the+Compare+Order+for+BSON+Types
    // XXX what is the correct sort position for Javascript code?
    // ('100' in the matrix below)
    // XXX minkey/maxkey
    return [-1, // (not a type)
    1, // number
    2, // string
    3, // object
    4, // array
    5, // binary
    -1, // deprecated
    6, // ObjectID
    7, // bool
    8, // Date
    0, // null
    9, // RegExp
    -1, // deprecated
    100, // JS code
    2, // deprecated (symbol)
    100, // JS code
    1, // 32-bit int
    8, // Mongo timestamp
    1 // 64-bit int
    ][t];
  },

  // compare two values of unknown type according to BSON ordering
  // semantics. (as an extension, consider 'undefined' to be less than
  // any other value.) return negative if a is less, positive if b is
  // less, or 0 if equal
  _cmp(a, b) {
    if (a === undefined) {
      return b === undefined ? 0 : -1;
    }

    if (b === undefined) {
      return 1;
    }

    let ta = LocalCollection._f._type(a);

    let tb = LocalCollection._f._type(b);

    const oa = LocalCollection._f._typeorder(ta);

    const ob = LocalCollection._f._typeorder(tb);

    if (oa !== ob) {
      return oa < ob ? -1 : 1;
    } // XXX need to implement this if we implement Symbol or integers, or
    // Timestamp


    if (ta !== tb) {
      throw Error('Missing type coercion logic in _cmp');
    }

    if (ta === 7) {
      // ObjectID
      // Convert to string.
      ta = tb = 2;
      a = a.toHexString();
      b = b.toHexString();
    }

    if (ta === 9) {
      // Date
      // Convert to millis.
      ta = tb = 1;
      a = a.getTime();
      b = b.getTime();
    }

    if (ta === 1) {
      // double
      if (a instanceof Decimal) {
        return a.minus(b).toNumber();
      } else {
        return a - b;
      }
    }

    if (tb === 2) // string
      return a < b ? -1 : a === b ? 0 : 1;

    if (ta === 3) {
      // Object
      // this could be much more efficient in the expected case ...
      const toArray = object => {
        const result = [];
        Object.keys(object).forEach(key => {
          result.push(key, object[key]);
        });
        return result;
      };

      return LocalCollection._f._cmp(toArray(a), toArray(b));
    }

    if (ta === 4) {
      // Array
      for (let i = 0;; i++) {
        if (i === a.length) {
          return i === b.length ? 0 : -1;
        }

        if (i === b.length) {
          return 1;
        }

        const s = LocalCollection._f._cmp(a[i], b[i]);

        if (s !== 0) {
          return s;
        }
      }
    }

    if (ta === 5) {
      // binary
      // Surprisingly, a small binary blob is always less than a large one in
      // Mongo.
      if (a.length !== b.length) {
        return a.length - b.length;
      }

      for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) {
          return -1;
        }

        if (a[i] > b[i]) {
          return 1;
        }
      }

      return 0;
    }

    if (ta === 8) {
      // boolean
      if (a) {
        return b ? 0 : 1;
      }

      return b ? -1 : 0;
    }

    if (ta === 10) // null
      return 0;
    if (ta === 11) // regexp
      throw Error('Sorting not supported on regular expression'); // XXX
    // 13: javascript code
    // 14: symbol
    // 15: javascript code with scope
    // 16: 32-bit integer
    // 17: timestamp
    // 18: 64-bit integer
    // 255: minkey
    // 127: maxkey

    if (ta === 13) // javascript code
      throw Error('Sorting not supported on Javascript code'); // XXX

    throw Error('Unknown type to sort');
  }

};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"minimongo_common.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_common.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LocalCollection_;
module.link("./local_collection.js", {
  default(v) {
    LocalCollection_ = v;
  }

}, 0);
let Matcher;
module.link("./matcher.js", {
  default(v) {
    Matcher = v;
  }

}, 1);
let Sorter;
module.link("./sorter.js", {
  default(v) {
    Sorter = v;
  }

}, 2);
LocalCollection = LocalCollection_;
Minimongo = {
  LocalCollection: LocalCollection_,
  Matcher,
  Sorter
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_handle.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/observe_handle.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => ObserveHandle
});

class ObserveHandle {}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sorter.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/sorter.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => Sorter
});
let ELEMENT_OPERATORS, equalityElementMatcher, expandArraysInBranches, hasOwn, isOperatorObject, makeLookupFunction, regexpElementMatcher;
module.link("./common.js", {
  ELEMENT_OPERATORS(v) {
    ELEMENT_OPERATORS = v;
  },

  equalityElementMatcher(v) {
    equalityElementMatcher = v;
  },

  expandArraysInBranches(v) {
    expandArraysInBranches = v;
  },

  hasOwn(v) {
    hasOwn = v;
  },

  isOperatorObject(v) {
    isOperatorObject = v;
  },

  makeLookupFunction(v) {
    makeLookupFunction = v;
  },

  regexpElementMatcher(v) {
    regexpElementMatcher = v;
  }

}, 0);

class Sorter {
  constructor(spec) {
    this._sortSpecParts = [];
    this._sortFunction = null;

    const addSpecPart = (path, ascending) => {
      if (!path) {
        throw Error('sort keys must be non-empty');
      }

      if (path.charAt(0) === '$') {
        throw Error("unsupported sort key: ".concat(path));
      }

      this._sortSpecParts.push({
        ascending,
        lookup: makeLookupFunction(path, {
          forSort: true
        }),
        path
      });
    };

    if (spec instanceof Array) {
      spec.forEach(element => {
        if (typeof element === 'string') {
          addSpecPart(element, true);
        } else {
          addSpecPart(element[0], element[1] !== 'desc');
        }
      });
    } else if (typeof spec === 'object') {
      Object.keys(spec).forEach(key => {
        addSpecPart(key, spec[key] >= 0);
      });
    } else if (typeof spec === 'function') {
      this._sortFunction = spec;
    } else {
      throw Error("Bad sort specification: ".concat(JSON.stringify(spec)));
    } // If a function is specified for sorting, we skip the rest.


    if (this._sortFunction) {
      return;
    } // To implement affectedByModifier, we piggy-back on top of Matcher's
    // affectedByModifier code; we create a selector that is affected by the
    // same modifiers as this sort order. This is only implemented on the
    // server.


    if (this.affectedByModifier) {
      const selector = {};

      this._sortSpecParts.forEach(spec => {
        selector[spec.path] = 1;
      });

      this._selectorForAffectedByModifier = new Minimongo.Matcher(selector);
    }

    this._keyComparator = composeComparators(this._sortSpecParts.map((spec, i) => this._keyFieldComparator(i)));
  }

  getComparator(options) {
    // If sort is specified or have no distances, just use the comparator from
    // the source specification (which defaults to "everything is equal".
    // issue #3599
    // https://docs.mongodb.com/manual/reference/operator/query/near/#sort-operation
    // sort effectively overrides $near
    if (this._sortSpecParts.length || !options || !options.distances) {
      return this._getBaseComparator();
    }

    const distances = options.distances; // Return a comparator which compares using $near distances.

    return (a, b) => {
      if (!distances.has(a._id)) {
        throw Error("Missing distance for ".concat(a._id));
      }

      if (!distances.has(b._id)) {
        throw Error("Missing distance for ".concat(b._id));
      }

      return distances.get(a._id) - distances.get(b._id);
    };
  } // Takes in two keys: arrays whose lengths match the number of spec
  // parts. Returns negative, 0, or positive based on using the sort spec to
  // compare fields.


  _compareKeys(key1, key2) {
    if (key1.length !== this._sortSpecParts.length || key2.length !== this._sortSpecParts.length) {
      throw Error('Key has wrong length');
    }

    return this._keyComparator(key1, key2);
  } // Iterates over each possible "key" from doc (ie, over each branch), calling
  // 'cb' with the key.


  _generateKeysFromDoc(doc, cb) {
    if (this._sortSpecParts.length === 0) {
      throw new Error('can\'t generate keys without a spec');
    }

    const pathFromIndices = indices => "".concat(indices.join(','), ",");

    let knownPaths = null; // maps index -> ({'' -> value} or {path -> value})

    const valuesByIndexAndPath = this._sortSpecParts.map(spec => {
      // Expand any leaf arrays that we find, and ignore those arrays
      // themselves.  (We never sort based on an array itself.)
      let branches = expandArraysInBranches(spec.lookup(doc), true); // If there are no values for a key (eg, key goes to an empty array),
      // pretend we found one undefined value.

      if (!branches.length) {
        branches = [{
          value: void 0
        }];
      }

      const element = Object.create(null);
      let usedPaths = false;
      branches.forEach(branch => {
        if (!branch.arrayIndices) {
          // If there are no array indices for a branch, then it must be the
          // only branch, because the only thing that produces multiple branches
          // is the use of arrays.
          if (branches.length > 1) {
            throw Error('multiple branches but no array used?');
          }

          element[''] = branch.value;
          return;
        }

        usedPaths = true;
        const path = pathFromIndices(branch.arrayIndices);

        if (hasOwn.call(element, path)) {
          throw Error("duplicate path: ".concat(path));
        }

        element[path] = branch.value; // If two sort fields both go into arrays, they have to go into the
        // exact same arrays and we have to find the same paths.  This is
        // roughly the same condition that makes MongoDB throw this strange
        // error message.  eg, the main thing is that if sort spec is {a: 1,
        // b:1} then a and b cannot both be arrays.
        //
        // (In MongoDB it seems to be OK to have {a: 1, 'a.x.y': 1} where 'a'
        // and 'a.x.y' are both arrays, but we don't allow this for now.
        // #NestedArraySort
        // XXX achieve full compatibility here

        if (knownPaths && !hasOwn.call(knownPaths, path)) {
          throw Error('cannot index parallel arrays');
        }
      });

      if (knownPaths) {
        // Similarly to above, paths must match everywhere, unless this is a
        // non-array field.
        if (!hasOwn.call(element, '') && Object.keys(knownPaths).length !== Object.keys(element).length) {
          throw Error('cannot index parallel arrays!');
        }
      } else if (usedPaths) {
        knownPaths = {};
        Object.keys(element).forEach(path => {
          knownPaths[path] = true;
        });
      }

      return element;
    });

    if (!knownPaths) {
      // Easy case: no use of arrays.
      const soleKey = valuesByIndexAndPath.map(values => {
        if (!hasOwn.call(values, '')) {
          throw Error('no value in sole key case?');
        }

        return values[''];
      });
      cb(soleKey);
      return;
    }

    Object.keys(knownPaths).forEach(path => {
      const key = valuesByIndexAndPath.map(values => {
        if (hasOwn.call(values, '')) {
          return values[''];
        }

        if (!hasOwn.call(values, path)) {
          throw Error('missing path?');
        }

        return values[path];
      });
      cb(key);
    });
  } // Returns a comparator that represents the sort specification (but not
  // including a possible geoquery distance tie-breaker).


  _getBaseComparator() {
    if (this._sortFunction) {
      return this._sortFunction;
    } // If we're only sorting on geoquery distance and no specs, just say
    // everything is equal.


    if (!this._sortSpecParts.length) {
      return (doc1, doc2) => 0;
    }

    return (doc1, doc2) => {
      const key1 = this._getMinKeyFromDoc(doc1);

      const key2 = this._getMinKeyFromDoc(doc2);

      return this._compareKeys(key1, key2);
    };
  } // Finds the minimum key from the doc, according to the sort specs.  (We say
  // "minimum" here but this is with respect to the sort spec, so "descending"
  // sort fields mean we're finding the max for that field.)
  //
  // Note that this is NOT "find the minimum value of the first field, the
  // minimum value of the second field, etc"... it's "choose the
  // lexicographically minimum value of the key vector, allowing only keys which
  // you can find along the same paths".  ie, for a doc {a: [{x: 0, y: 5}, {x:
  // 1, y: 3}]} with sort spec {'a.x': 1, 'a.y': 1}, the only keys are [0,5] and
  // [1,3], and the minimum key is [0,5]; notably, [0,3] is NOT a key.


  _getMinKeyFromDoc(doc) {
    let minKey = null;

    this._generateKeysFromDoc(doc, key => {
      if (minKey === null) {
        minKey = key;
        return;
      }

      if (this._compareKeys(key, minKey) < 0) {
        minKey = key;
      }
    });

    return minKey;
  }

  _getPaths() {
    return this._sortSpecParts.map(part => part.path);
  } // Given an index 'i', returns a comparator that compares two key arrays based
  // on field 'i'.


  _keyFieldComparator(i) {
    const invert = !this._sortSpecParts[i].ascending;
    return (key1, key2) => {
      const compare = LocalCollection._f._cmp(key1[i], key2[i]);

      return invert ? -compare : compare;
    };
  }

}

// Given an array of comparators
// (functions (a,b)->(negative or positive or zero)), returns a single
// comparator which uses each comparator in order and returns the first
// non-zero value.
function composeComparators(comparatorArray) {
  return (a, b) => {
    for (let i = 0; i < comparatorArray.length; ++i) {
      const compare = comparatorArray[i](a, b);

      if (compare !== 0) {
        return compare;
      }
    }

    return 0;
  };
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/minimongo/minimongo_server.js");

/* Exports */
Package._define("minimongo", exports, {
  LocalCollection: LocalCollection,
  Minimongo: Minimongo,
  MinimongoTest: MinimongoTest,
  MinimongoError: MinimongoError
});

})();

//# sourceURL=meteor://💻app/packages/minimongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9sb2NhbF9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9taW5pbW9uZ28vbWF0Y2hlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9vYnNlcnZlX2hhbmRsZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL3NvcnRlci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJsaW5rIiwiaGFzT3duIiwiaXNOdW1lcmljS2V5IiwiaXNPcGVyYXRvck9iamVjdCIsInBhdGhzVG9UcmVlIiwicHJvamVjdGlvbkRldGFpbHMiLCJ2IiwiTWluaW1vbmdvIiwiX3BhdGhzRWxpZGluZ051bWVyaWNLZXlzIiwicGF0aHMiLCJtYXAiLCJwYXRoIiwic3BsaXQiLCJmaWx0ZXIiLCJwYXJ0Iiwiam9pbiIsIk1hdGNoZXIiLCJwcm90b3R5cGUiLCJhZmZlY3RlZEJ5TW9kaWZpZXIiLCJtb2RpZmllciIsIk9iamVjdCIsImFzc2lnbiIsIiRzZXQiLCIkdW5zZXQiLCJtZWFuaW5nZnVsUGF0aHMiLCJfZ2V0UGF0aHMiLCJtb2RpZmllZFBhdGhzIiwiY29uY2F0Iiwia2V5cyIsInNvbWUiLCJtb2QiLCJtZWFuaW5nZnVsUGF0aCIsInNlbCIsImkiLCJqIiwibGVuZ3RoIiwiY2FuQmVjb21lVHJ1ZUJ5TW9kaWZpZXIiLCJpc1NpbXBsZSIsIm1vZGlmaWVyUGF0aHMiLCJwYXRoSGFzTnVtZXJpY0tleXMiLCJleHBlY3RlZFNjYWxhcklzT2JqZWN0IiwiX3NlbGVjdG9yIiwibW9kaWZpZXJQYXRoIiwic3RhcnRzV2l0aCIsIm1hdGNoaW5nRG9jdW1lbnQiLCJFSlNPTiIsImNsb25lIiwiTG9jYWxDb2xsZWN0aW9uIiwiX21vZGlmeSIsImVycm9yIiwibmFtZSIsInNldFByb3BlcnR5RXJyb3IiLCJkb2N1bWVudE1hdGNoZXMiLCJyZXN1bHQiLCJjb21iaW5lSW50b1Byb2plY3Rpb24iLCJwcm9qZWN0aW9uIiwic2VsZWN0b3JQYXRocyIsImluY2x1ZGVzIiwiY29tYmluZUltcG9ydGFudFBhdGhzSW50b1Byb2plY3Rpb24iLCJfbWF0Y2hpbmdEb2N1bWVudCIsInVuZGVmaW5lZCIsImZhbGxiYWNrIiwidmFsdWVTZWxlY3RvciIsIiRlcSIsIiRpbiIsIm1hdGNoZXIiLCJwbGFjZWhvbGRlciIsImZpbmQiLCJvbmx5Q29udGFpbnNLZXlzIiwibG93ZXJCb3VuZCIsIkluZmluaXR5IiwidXBwZXJCb3VuZCIsImZvckVhY2giLCJvcCIsImNhbGwiLCJtaWRkbGUiLCJ4IiwiU29ydGVyIiwiX3NlbGVjdG9yRm9yQWZmZWN0ZWRCeU1vZGlmaWVyIiwiZGV0YWlscyIsInRyZWUiLCJub2RlIiwiZnVsbFBhdGgiLCJtZXJnZWRQcm9qZWN0aW9uIiwidHJlZVRvUGF0aHMiLCJpbmNsdWRpbmciLCJtZXJnZWRFeGNsUHJvamVjdGlvbiIsImdldFBhdGhzIiwic2VsZWN0b3IiLCJfcGF0aHMiLCJvYmoiLCJldmVyeSIsImsiLCJwcmVmaXgiLCJrZXkiLCJ2YWx1ZSIsImV4cG9ydCIsIkVMRU1FTlRfT1BFUkFUT1JTIiwiY29tcGlsZURvY3VtZW50U2VsZWN0b3IiLCJlcXVhbGl0eUVsZW1lbnRNYXRjaGVyIiwiZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyIsImlzSW5kZXhhYmxlIiwibWFrZUxvb2t1cEZ1bmN0aW9uIiwibm90aGluZ01hdGNoZXIiLCJwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzIiwicmVnZXhwRWxlbWVudE1hdGNoZXIiLCJkZWZhdWx0IiwiaGFzT3duUHJvcGVydHkiLCIkbHQiLCJtYWtlSW5lcXVhbGl0eSIsImNtcFZhbHVlIiwiJGd0IiwiJGx0ZSIsIiRndGUiLCIkbW9kIiwiY29tcGlsZUVsZW1lbnRTZWxlY3RvciIsIm9wZXJhbmQiLCJBcnJheSIsImlzQXJyYXkiLCJFcnJvciIsImRpdmlzb3IiLCJyZW1haW5kZXIiLCJlbGVtZW50TWF0Y2hlcnMiLCJvcHRpb24iLCJSZWdFeHAiLCIkc2l6ZSIsImRvbnRFeHBhbmRMZWFmQXJyYXlzIiwiJHR5cGUiLCJkb250SW5jbHVkZUxlYWZBcnJheXMiLCJvcGVyYW5kQWxpYXNNYXAiLCJfZiIsIl90eXBlIiwiJGJpdHNBbGxTZXQiLCJtYXNrIiwiZ2V0T3BlcmFuZEJpdG1hc2siLCJiaXRtYXNrIiwiZ2V0VmFsdWVCaXRtYXNrIiwiYnl0ZSIsIiRiaXRzQW55U2V0IiwiJGJpdHNBbGxDbGVhciIsIiRiaXRzQW55Q2xlYXIiLCIkcmVnZXgiLCJyZWdleHAiLCIkb3B0aW9ucyIsInRlc3QiLCJzb3VyY2UiLCIkZWxlbU1hdGNoIiwiX2lzUGxhaW5PYmplY3QiLCJpc0RvY01hdGNoZXIiLCJMT0dJQ0FMX09QRVJBVE9SUyIsInJlZHVjZSIsImEiLCJiIiwic3ViTWF0Y2hlciIsImluRWxlbU1hdGNoIiwiY29tcGlsZVZhbHVlU2VsZWN0b3IiLCJhcnJheUVsZW1lbnQiLCJhcmciLCJkb250SXRlcmF0ZSIsIiRhbmQiLCJzdWJTZWxlY3RvciIsImFuZERvY3VtZW50TWF0Y2hlcnMiLCJjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzIiwiJG9yIiwibWF0Y2hlcnMiLCJkb2MiLCJmbiIsIiRub3IiLCIkd2hlcmUiLCJzZWxlY3RvclZhbHVlIiwiX3JlY29yZFBhdGhVc2VkIiwiX2hhc1doZXJlIiwiRnVuY3Rpb24iLCIkY29tbWVudCIsIlZBTFVFX09QRVJBVE9SUyIsImNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyIiwiJG5vdCIsImludmVydEJyYW5jaGVkTWF0Y2hlciIsIiRuZSIsIiRuaW4iLCIkZXhpc3RzIiwiZXhpc3RzIiwiZXZlcnl0aGluZ01hdGNoZXIiLCIkbWF4RGlzdGFuY2UiLCIkbmVhciIsIiRhbGwiLCJicmFuY2hlZE1hdGNoZXJzIiwiY3JpdGVyaW9uIiwiYW5kQnJhbmNoZWRNYXRjaGVycyIsImlzUm9vdCIsIl9oYXNHZW9RdWVyeSIsIm1heERpc3RhbmNlIiwicG9pbnQiLCJkaXN0YW5jZSIsIiRnZW9tZXRyeSIsInR5cGUiLCJHZW9KU09OIiwicG9pbnREaXN0YW5jZSIsImNvb3JkaW5hdGVzIiwicG9pbnRUb0FycmF5IiwiZ2VvbWV0cnlXaXRoaW5SYWRpdXMiLCJkaXN0YW5jZUNvb3JkaW5hdGVQYWlycyIsImJyYW5jaGVkVmFsdWVzIiwiYnJhbmNoIiwiY3VyRGlzdGFuY2UiLCJfaXNVcGRhdGUiLCJhcnJheUluZGljZXMiLCJhbmRTb21lTWF0Y2hlcnMiLCJzdWJNYXRjaGVycyIsImRvY09yQnJhbmNoZXMiLCJtYXRjaCIsInN1YlJlc3VsdCIsInNlbGVjdG9ycyIsImRvY1NlbGVjdG9yIiwib3B0aW9ucyIsImRvY01hdGNoZXJzIiwic3Vic3RyIiwiX2lzU2ltcGxlIiwibG9va1VwQnlJbmRleCIsInZhbHVlTWF0Y2hlciIsIkJvb2xlYW4iLCJvcGVyYXRvckJyYW5jaGVkTWF0Y2hlciIsImVsZW1lbnRNYXRjaGVyIiwiYnJhbmNoZXMiLCJleHBhbmRlZCIsImVsZW1lbnQiLCJtYXRjaGVkIiwicG9pbnRBIiwicG9pbnRCIiwiTWF0aCIsImh5cG90IiwiZWxlbWVudFNlbGVjdG9yIiwiX2VxdWFsIiwiZG9jT3JCcmFuY2hlZFZhbHVlcyIsInNraXBUaGVBcnJheXMiLCJicmFuY2hlc091dCIsInRoaXNJc0FycmF5IiwicHVzaCIsIk51bWJlciIsImlzSW50ZWdlciIsIlVpbnQ4QXJyYXkiLCJJbnQzMkFycmF5IiwiYnVmZmVyIiwiaXNCaW5hcnkiLCJBcnJheUJ1ZmZlciIsIm1heCIsInZpZXciLCJpc1NhZmVJbnRlZ2VyIiwiVWludDMyQXJyYXkiLCJCWVRFU19QRVJfRUxFTUVOVCIsImluc2VydEludG9Eb2N1bWVudCIsImRvY3VtZW50IiwiZXhpc3RpbmdLZXkiLCJpbmRleE9mIiwiYnJhbmNoZWRNYXRjaGVyIiwiYnJhbmNoVmFsdWVzIiwicyIsImluY29uc2lzdGVudE9LIiwidGhlc2VBcmVPcGVyYXRvcnMiLCJzZWxLZXkiLCJ0aGlzSXNPcGVyYXRvciIsIkpTT04iLCJzdHJpbmdpZnkiLCJjbXBWYWx1ZUNvbXBhcmF0b3IiLCJvcGVyYW5kVHlwZSIsIl9jbXAiLCJwYXJ0cyIsImZpcnN0UGFydCIsImxvb2t1cFJlc3QiLCJzbGljZSIsIm9taXRVbm5lY2Vzc2FyeUZpZWxkcyIsImZpcnN0TGV2ZWwiLCJhcHBlbmRUb1Jlc3VsdCIsIm1vcmUiLCJmb3JTb3J0IiwiYXJyYXlJbmRleCIsIk1pbmltb25nb1Rlc3QiLCJNaW5pbW9uZ29FcnJvciIsIm1lc3NhZ2UiLCJmaWVsZCIsIm9wZXJhdG9yTWF0Y2hlcnMiLCJvcGVyYXRvciIsInNpbXBsZVJhbmdlIiwic2ltcGxlRXF1YWxpdHkiLCJzaW1wbGVJbmNsdXNpb24iLCJuZXdMZWFmRm4iLCJjb25mbGljdEZuIiwicm9vdCIsInBhdGhBcnJheSIsInN1Y2Nlc3MiLCJsYXN0S2V5IiwieSIsInBvcHVsYXRlRG9jdW1lbnRXaXRoS2V5VmFsdWUiLCJnZXRQcm90b3R5cGVPZiIsInBvcHVsYXRlRG9jdW1lbnRXaXRoT2JqZWN0IiwidW5wcmVmaXhlZEtleXMiLCJ2YWxpZGF0ZU9iamVjdCIsIm9iamVjdCIsInF1ZXJ5IiwiX3NlbGVjdG9ySXNJZCIsImZpZWxkcyIsImZpZWxkc0tleXMiLCJzb3J0IiwiX2lkIiwia2V5UGF0aCIsInJ1bGUiLCJwcm9qZWN0aW9uUnVsZXNUcmVlIiwiY3VycmVudFBhdGgiLCJhbm90aGVyUGF0aCIsInRvU3RyaW5nIiwibGFzdEluZGV4IiwidmFsaWRhdGVLZXlJblBhdGgiLCJDdXJzb3IiLCJjb25zdHJ1Y3RvciIsImNvbGxlY3Rpb24iLCJzb3J0ZXIiLCJfc2VsZWN0b3JJc0lkUGVyaGFwc0FzT2JqZWN0IiwiX3NlbGVjdG9ySWQiLCJoYXNHZW9RdWVyeSIsInNraXAiLCJsaW1pdCIsIl9wcm9qZWN0aW9uRm4iLCJfY29tcGlsZVByb2plY3Rpb24iLCJfdHJhbnNmb3JtIiwid3JhcFRyYW5zZm9ybSIsInRyYW5zZm9ybSIsIlRyYWNrZXIiLCJyZWFjdGl2ZSIsImNvdW50IiwiYXBwbHlTa2lwTGltaXQiLCJfZGVwZW5kIiwiYWRkZWQiLCJyZW1vdmVkIiwiX2dldFJhd09iamVjdHMiLCJvcmRlcmVkIiwiZmV0Y2giLCJTeW1ib2wiLCJpdGVyYXRvciIsImFkZGVkQmVmb3JlIiwiY2hhbmdlZCIsIm1vdmVkQmVmb3JlIiwiaW5kZXgiLCJvYmplY3RzIiwibmV4dCIsImRvbmUiLCJjYWxsYmFjayIsInRoaXNBcmciLCJnZXRUcmFuc2Zvcm0iLCJvYnNlcnZlIiwiX29ic2VydmVGcm9tT2JzZXJ2ZUNoYW5nZXMiLCJvYnNlcnZlQ2hhbmdlcyIsIl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQiLCJfYWxsb3dfdW5vcmRlcmVkIiwiZGlzdGFuY2VzIiwiX0lkTWFwIiwiY3Vyc29yIiwiZGlydHkiLCJwcm9qZWN0aW9uRm4iLCJyZXN1bHRzU25hcHNob3QiLCJxaWQiLCJuZXh0X3FpZCIsInF1ZXJpZXMiLCJyZXN1bHRzIiwicGF1c2VkIiwid3JhcENhbGxiYWNrIiwic2VsZiIsImFyZ3MiLCJhcmd1bWVudHMiLCJfb2JzZXJ2ZVF1ZXVlIiwicXVldWVUYXNrIiwiYXBwbHkiLCJfc3VwcHJlc3NfaW5pdGlhbCIsImhhbmRsZSIsIk9ic2VydmVIYW5kbGUiLCJzdG9wIiwiYWN0aXZlIiwib25JbnZhbGlkYXRlIiwiZHJhaW4iLCJyZXdpbmQiLCJjaGFuZ2VycyIsImRlcGVuZGVuY3kiLCJEZXBlbmRlbmN5Iiwibm90aWZ5IiwiYmluZCIsImRlcGVuZCIsIl9nZXRDb2xsZWN0aW9uTmFtZSIsInNlbGVjdGVkRG9jIiwiX2RvY3MiLCJnZXQiLCJzZXQiLCJjbGVhciIsImlkIiwibWF0Y2hSZXN1bHQiLCJnZXRDb21wYXJhdG9yIiwiX3B1Ymxpc2hDdXJzb3IiLCJzdWJzY3JpcHRpb24iLCJQYWNrYWdlIiwibW9uZ28iLCJNb25nbyIsIkNvbGxlY3Rpb24iLCJfb2JqZWN0U3ByZWFkIiwiTWV0ZW9yIiwiX1N5bmNocm9ub3VzUXVldWUiLCJjcmVhdGUiLCJfc2F2ZWRPcmlnaW5hbHMiLCJmaW5kT25lIiwiaW5zZXJ0IiwiYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzIiwiX3VzZU9JRCIsIk1vbmdvSUQiLCJPYmplY3RJRCIsIlJhbmRvbSIsImhhcyIsIl9zYXZlT3JpZ2luYWwiLCJxdWVyaWVzVG9SZWNvbXB1dGUiLCJfaW5zZXJ0SW5SZXN1bHRzIiwiX3JlY29tcHV0ZVJlc3VsdHMiLCJkZWZlciIsInBhdXNlT2JzZXJ2ZXJzIiwicmVtb3ZlIiwiZXF1YWxzIiwic2l6ZSIsIl9lYWNoUG9zc2libHlNYXRjaGluZ0RvYyIsInF1ZXJ5UmVtb3ZlIiwicmVtb3ZlSWQiLCJyZW1vdmVEb2MiLCJfcmVtb3ZlRnJvbVJlc3VsdHMiLCJyZXN1bWVPYnNlcnZlcnMiLCJfZGlmZlF1ZXJ5Q2hhbmdlcyIsInJldHJpZXZlT3JpZ2luYWxzIiwib3JpZ2luYWxzIiwic2F2ZU9yaWdpbmFscyIsInVwZGF0ZSIsInFpZFRvT3JpZ2luYWxSZXN1bHRzIiwiZG9jTWFwIiwiaWRzTWF0Y2hlZCIsIl9pZHNNYXRjaGVkQnlTZWxlY3RvciIsIm1lbW9pemVkQ2xvbmVJZk5lZWRlZCIsImRvY1RvTWVtb2l6ZSIsInJlY29tcHV0ZVFpZHMiLCJ1cGRhdGVDb3VudCIsInF1ZXJ5UmVzdWx0IiwiX21vZGlmeUFuZE5vdGlmeSIsIm11bHRpIiwiaW5zZXJ0ZWRJZCIsInVwc2VydCIsIl9jcmVhdGVVcHNlcnREb2N1bWVudCIsIl9yZXR1cm5PYmplY3QiLCJudW1iZXJBZmZlY3RlZCIsInNwZWNpZmljSWRzIiwibWF0Y2hlZF9iZWZvcmUiLCJvbGRfZG9jIiwiYWZ0ZXJNYXRjaCIsImFmdGVyIiwiYmVmb3JlIiwiX3VwZGF0ZUluUmVzdWx0cyIsIm9sZFJlc3VsdHMiLCJfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIiwib3JkZXJlZEZyb21DYWxsYmFja3MiLCJjYWxsYmFja3MiLCJkb2NzIiwiT3JkZXJlZERpY3QiLCJpZFN0cmluZ2lmeSIsImFwcGx5Q2hhbmdlIiwicHV0QmVmb3JlIiwibW92ZUJlZm9yZSIsIkRpZmZTZXF1ZW5jZSIsImFwcGx5Q2hhbmdlcyIsIklkTWFwIiwiaWRQYXJzZSIsIl9fd3JhcHBlZFRyYW5zZm9ybV9fIiwid3JhcHBlZCIsInRyYW5zZm9ybWVkIiwibm9ucmVhY3RpdmUiLCJfYmluYXJ5U2VhcmNoIiwiY21wIiwiYXJyYXkiLCJmaXJzdCIsInJhbmdlIiwiaGFsZlJhbmdlIiwiZmxvb3IiLCJfY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uIiwiX2lkUHJvamVjdGlvbiIsInJ1bGVUcmVlIiwic3ViZG9jIiwic2VsZWN0b3JEb2N1bWVudCIsImlzTW9kaWZ5IiwiX2lzTW9kaWZpY2F0aW9uTW9kIiwibmV3RG9jIiwiaXNJbnNlcnQiLCJyZXBsYWNlbWVudCIsIl9kaWZmT2JqZWN0cyIsImxlZnQiLCJyaWdodCIsImRpZmZPYmplY3RzIiwibmV3UmVzdWx0cyIsIm9ic2VydmVyIiwiZGlmZlF1ZXJ5Q2hhbmdlcyIsIl9kaWZmUXVlcnlPcmRlcmVkQ2hhbmdlcyIsImRpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzIiwiX2RpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMiLCJkaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzIiwiX2ZpbmRJbk9yZGVyZWRSZXN1bHRzIiwic3ViSWRzIiwiX2luc2VydEluU29ydGVkTGlzdCIsInNwbGljZSIsImlzUmVwbGFjZSIsImlzTW9kaWZpZXIiLCJzZXRPbkluc2VydCIsIm1vZEZ1bmMiLCJNT0RJRklFUlMiLCJrZXlwYXRoIiwia2V5cGFydHMiLCJ0YXJnZXQiLCJmaW5kTW9kVGFyZ2V0IiwiZm9yYmlkQXJyYXkiLCJub0NyZWF0ZSIsIk5PX0NSRUFURV9NT0RJRklFUlMiLCJwb3AiLCJvYnNlcnZlQ2FsbGJhY2tzIiwic3VwcHJlc3NlZCIsIm9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzIiwiX29ic2VydmVDYWxsYmFja3NBcmVPcmRlcmVkIiwiaW5kaWNlcyIsIl9ub19pbmRpY2VzIiwiYWRkZWRBdCIsImNoYW5nZWRBdCIsIm9sZERvYyIsIm1vdmVkVG8iLCJmcm9tIiwidG8iLCJyZW1vdmVkQXQiLCJjaGFuZ2VPYnNlcnZlciIsIl9mcm9tT2JzZXJ2ZSIsIm5vbk11dGF0aW5nQ2FsbGJhY2tzIiwiY2hhbmdlZEZpZWxkcyIsIm1ha2VDaGFuZ2VkRmllbGRzIiwib2xkX2lkeCIsIm5ld19pZHgiLCIkY3VycmVudERhdGUiLCJEYXRlIiwiJG1pbiIsIiRtYXgiLCIkaW5jIiwiJHNldE9uSW5zZXJ0IiwiJHB1c2giLCIkZWFjaCIsInRvUHVzaCIsInBvc2l0aW9uIiwiJHBvc2l0aW9uIiwiJHNsaWNlIiwic29ydEZ1bmN0aW9uIiwiJHNvcnQiLCJzcGxpY2VBcmd1bWVudHMiLCIkcHVzaEFsbCIsIiRhZGRUb1NldCIsImlzRWFjaCIsInZhbHVlcyIsInRvQWRkIiwiJHBvcCIsInRvUG9wIiwiJHB1bGwiLCJ0b1B1bGwiLCJvdXQiLCIkcHVsbEFsbCIsIiRyZW5hbWUiLCJ0YXJnZXQyIiwiJGJpdCIsIiR2IiwiaW52YWxpZENoYXJNc2ciLCIkIiwiYXNzZXJ0SXNWYWxpZEZpZWxkTmFtZSIsInVzZWRBcnJheUluZGV4IiwibGFzdCIsImtleXBhcnQiLCJwYXJzZUludCIsIkRlY2ltYWwiLCJEZWNpbWFsU3R1YiIsImlzVXBkYXRlIiwiX2RvY01hdGNoZXIiLCJfY29tcGlsZVNlbGVjdG9yIiwiaGFzV2hlcmUiLCJrZXlPcmRlclNlbnNpdGl2ZSIsIl90eXBlb3JkZXIiLCJ0IiwidGEiLCJ0YiIsIm9hIiwib2IiLCJ0b0hleFN0cmluZyIsImdldFRpbWUiLCJtaW51cyIsInRvTnVtYmVyIiwidG9BcnJheSIsIkxvY2FsQ29sbGVjdGlvbl8iLCJzcGVjIiwiX3NvcnRTcGVjUGFydHMiLCJfc29ydEZ1bmN0aW9uIiwiYWRkU3BlY1BhcnQiLCJhc2NlbmRpbmciLCJjaGFyQXQiLCJsb29rdXAiLCJfa2V5Q29tcGFyYXRvciIsImNvbXBvc2VDb21wYXJhdG9ycyIsIl9rZXlGaWVsZENvbXBhcmF0b3IiLCJfZ2V0QmFzZUNvbXBhcmF0b3IiLCJfY29tcGFyZUtleXMiLCJrZXkxIiwia2V5MiIsIl9nZW5lcmF0ZUtleXNGcm9tRG9jIiwiY2IiLCJwYXRoRnJvbUluZGljZXMiLCJrbm93blBhdGhzIiwidmFsdWVzQnlJbmRleEFuZFBhdGgiLCJ1c2VkUGF0aHMiLCJzb2xlS2V5IiwiZG9jMSIsImRvYzIiLCJfZ2V0TWluS2V5RnJvbURvYyIsIm1pbktleSIsImludmVydCIsImNvbXBhcmUiLCJjb21wYXJhdG9yQXJyYXkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVksdUJBQVo7QUFBcUMsSUFBSUMsTUFBSixFQUFXQyxZQUFYLEVBQXdCQyxnQkFBeEIsRUFBeUNDLFdBQXpDLEVBQXFEQyxpQkFBckQ7QUFBdUVOLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZLGFBQVosRUFBMEI7QUFBQ0MsUUFBTSxDQUFDSyxDQUFELEVBQUc7QUFBQ0wsVUFBTSxHQUFDSyxDQUFQO0FBQVMsR0FBcEI7O0FBQXFCSixjQUFZLENBQUNJLENBQUQsRUFBRztBQUFDSixnQkFBWSxHQUFDSSxDQUFiO0FBQWUsR0FBcEQ7O0FBQXFESCxrQkFBZ0IsQ0FBQ0csQ0FBRCxFQUFHO0FBQUNILG9CQUFnQixHQUFDRyxDQUFqQjtBQUFtQixHQUE1Rjs7QUFBNkZGLGFBQVcsQ0FBQ0UsQ0FBRCxFQUFHO0FBQUNGLGVBQVcsR0FBQ0UsQ0FBWjtBQUFjLEdBQTFIOztBQUEySEQsbUJBQWlCLENBQUNDLENBQUQsRUFBRztBQUFD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QixZQUFNYSxPQUFPLEdBQUc5akIsZUFBZSxDQUFDbUYsRUFBaEIsQ0FBbUJ1SSxJQUFuQixDQUF3QnNWLElBQUksQ0FBQzlqQixDQUFELENBQTVCLEVBQWlDK2pCLElBQUksQ0FBQy9qQixDQUFELENBQXJDLENBQWhCOztBQUNBLGFBQU8ya0IsTUFBTSxHQUFHLENBQUNDLE9BQUosR0FBY0EsT0FBM0I7QUFDRCxLQUhEO0FBSUQ7O0FBblJ5Qjs7QUFzUjVCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBU2xCLGtCQUFULENBQTRCbUIsZUFBNUIsRUFBNkM7QUFDM0MsU0FBTyxDQUFDdmQsQ0FBRCxFQUFJQyxDQUFKLEtBQVU7QUFDZixTQUFLLElBQUl2SCxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHNmtCLGVBQWUsQ0FBQzNrQixNQUFwQyxFQUE0QyxFQUFFRixDQUE5QyxFQUFpRDtBQUMvQyxZQUFNNGtCLE9BQU8sR0FBR0MsZUFBZSxDQUFDN2tCLENBQUQsQ0FBZixDQUFtQnNILENBQW5CLEVBQXNCQyxDQUF0QixDQUFoQjs7QUFDQSxVQUFJcWQsT0FBTyxLQUFLLENBQWhCLEVBQW1CO0FBQ2pCLGVBQU9BLE9BQVA7QUFDRDtBQUNGOztBQUVELFdBQU8sQ0FBUDtBQUNELEdBVEQ7QUFVRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9taW5pbW9uZ28uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4vbWluaW1vbmdvX2NvbW1vbi5qcyc7XG5pbXBvcnQge1xuICBoYXNPd24sXG4gIGlzTnVtZXJpY0tleSxcbiAgaXNPcGVyYXRvck9iamVjdCxcbiAgcGF0aHNUb1RyZWUsXG4gIHByb2plY3Rpb25EZXRhaWxzLFxufSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbk1pbmltb25nby5fcGF0aHNFbGlkaW5nTnVtZXJpY0tleXMgPSBwYXRocyA9PiBwYXRocy5tYXAocGF0aCA9PlxuICBwYXRoLnNwbGl0KCcuJykuZmlsdGVyKHBhcnQgPT4gIWlzTnVtZXJpY0tleShwYXJ0KSkuam9pbignLicpXG4pO1xuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIG1vZGlmaWVyIGFwcGxpZWQgdG8gc29tZSBkb2N1bWVudCBtYXkgY2hhbmdlIHRoZSByZXN1bHRcbi8vIG9mIG1hdGNoaW5nIHRoZSBkb2N1bWVudCBieSBzZWxlY3RvclxuLy8gVGhlIG1vZGlmaWVyIGlzIGFsd2F5cyBpbiBhIGZvcm0gb2YgT2JqZWN0OlxuLy8gIC0gJHNldFxuLy8gICAgLSAnYS5iLjIyLnonOiB2YWx1ZVxuLy8gICAgLSAnZm9vLmJhcic6IDQyXG4vLyAgLSAkdW5zZXRcbi8vICAgIC0gJ2FiYy5kJzogMVxuTWluaW1vbmdvLk1hdGNoZXIucHJvdG90eXBlLmFmZmVjdGVkQnlNb2RpZmllciA9IGZ1bmN0aW9uKG1vZGlmaWVyKSB7XG4gIC8vIHNhZmUgY2hlY2sgZm9yICRzZXQvJHVuc2V0IGJlaW5nIG9iamVjdHNcbiAgbW9kaWZpZXIgPSBPYmplY3QuYXNzaWduKHskc2V0OiB7fSwgJHVuc2V0OiB7fX0sIG1vZGlmaWVyKTtcblxuICBjb25zdCBtZWFuaW5nZnVsUGF0aHMgPSB0aGlzLl9nZXRQYXRocygpO1xuICBjb25zdCBtb2RpZmllZFBhdGhzID0gW10uY29uY2F0KFxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyLiRzZXQpLFxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyLiR1bnNldClcbiAgKTtcblxuICByZXR1cm4gbW9kaWZpZWRQYXRocy5zb21lKHBhdGggPT4ge1xuICAgIGNvbnN0IG1vZCA9IHBhdGguc3BsaXQoJy4nKTtcblxuICAgIHJldHVybiBtZWFuaW5nZnVsUGF0aHMuc29tZShtZWFuaW5nZnVsUGF0aCA9PiB7XG4gICAgICBjb25zdCBzZWwgPSBtZWFuaW5nZnVsUGF0aC5zcGxpdCgnLicpO1xuXG4gICAgICBsZXQgaSA9IDAsIGogPSAwO1xuXG4gICAgICB3aGlsZSAoaSA8IHNlbC5sZW5ndGggJiYgaiA8IG1vZC5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGlzTnVtZXJpY0tleShzZWxbaV0pICYmIGlzTnVtZXJpY0tleShtb2Rbal0pKSB7XG4gICAgICAgICAgLy8gZm9vLjQuYmFyIHNlbGVjdG9yIGFmZmVjdGVkIGJ5IGZvby40IG1vZGlmaWVyXG4gICAgICAgICAgLy8gZm9vLjMuYmFyIHNlbGVjdG9yIHVuYWZmZWN0ZWQgYnkgZm9vLjQgbW9kaWZpZXJcbiAgICAgICAgICBpZiAoc2VsW2ldID09PSBtb2Rbal0pIHtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc051bWVyaWNLZXkoc2VsW2ldKSkge1xuICAgICAgICAgIC8vIGZvby40LmJhciBzZWxlY3RvciB1bmFmZmVjdGVkIGJ5IGZvby5iYXIgbW9kaWZpZXJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOdW1lcmljS2V5KG1vZFtqXSkpIHtcbiAgICAgICAgICBqKys7XG4gICAgICAgIH0gZWxzZSBpZiAoc2VsW2ldID09PSBtb2Rbal0pIHtcbiAgICAgICAgICBpKys7XG4gICAgICAgICAgaisrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBPbmUgaXMgYSBwcmVmaXggb2YgYW5vdGhlciwgdGFraW5nIG51bWVyaWMgZmllbGRzIGludG8gYWNjb3VudFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuLy8gQHBhcmFtIG1vZGlmaWVyIC0gT2JqZWN0OiBNb25nb0RCLXN0eWxlZCBtb2RpZmllciB3aXRoIGAkc2V0YHMgYW5kIGAkdW5zZXRzYFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICBvbmx5LiAoYXNzdW1lZCB0byBjb21lIGZyb20gb3Bsb2cpXG4vLyBAcmV0dXJucyAtIEJvb2xlYW46IGlmIGFmdGVyIGFwcGx5aW5nIHRoZSBtb2RpZmllciwgc2VsZWN0b3IgY2FuIHN0YXJ0XG4vLyAgICAgICAgICAgICAgICAgICAgIGFjY2VwdGluZyB0aGUgbW9kaWZpZWQgdmFsdWUuXG4vLyBOT1RFOiBhc3N1bWVzIHRoYXQgZG9jdW1lbnQgYWZmZWN0ZWQgYnkgbW9kaWZpZXIgZGlkbid0IG1hdGNoIHRoaXMgTWF0Y2hlclxuLy8gYmVmb3JlLCBzbyBpZiBtb2RpZmllciBjYW4ndCBjb252aW5jZSBzZWxlY3RvciBpbiBhIHBvc2l0aXZlIGNoYW5nZSBpdCB3b3VsZFxuLy8gc3RheSAnZmFsc2UnLlxuLy8gQ3VycmVudGx5IGRvZXNuJ3Qgc3VwcG9ydCAkLW9wZXJhdG9ycyBhbmQgbnVtZXJpYyBpbmRpY2VzIHByZWNpc2VseS5cbk1pbmltb25nby5NYXRjaGVyLnByb3RvdHlwZS5jYW5CZWNvbWVUcnVlQnlNb2RpZmllciA9IGZ1bmN0aW9uKG1vZGlmaWVyKSB7XG4gIGlmICghdGhpcy5hZmZlY3RlZEJ5TW9kaWZpZXIobW9kaWZpZXIpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCF0aGlzLmlzU2ltcGxlKCkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIG1vZGlmaWVyID0gT2JqZWN0LmFzc2lnbih7JHNldDoge30sICR1bnNldDoge319LCBtb2RpZmllcik7XG5cbiAgY29uc3QgbW9kaWZpZXJQYXRocyA9IFtdLmNvbmNhdChcbiAgICBPYmplY3Qua2V5cyhtb2RpZmllci4kc2V0KSxcbiAgICBPYmplY3Qua2V5cyhtb2RpZmllci4kdW5zZXQpXG4gICk7XG5cbiAgaWYgKHRoaXMuX2dldFBhdGhzKCkuc29tZShwYXRoSGFzTnVtZXJpY0tleXMpIHx8XG4gICAgICBtb2RpZmllclBhdGhzLnNvbWUocGF0aEhhc051bWVyaWNLZXlzKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gY2hlY2sgaWYgdGhlcmUgaXMgYSAkc2V0IG9yICR1bnNldCB0aGF0IGluZGljYXRlcyBzb21ldGhpbmcgaXMgYW5cbiAgLy8gb2JqZWN0IHJhdGhlciB0aGFuIGEgc2NhbGFyIGluIHRoZSBhY3R1YWwgb2JqZWN0IHdoZXJlIHdlIHNhdyAkLW9wZXJhdG9yXG4gIC8vIE5PVEU6IGl0IGlzIGNvcnJlY3Qgc2luY2Ugd2UgYWxsb3cgb25seSBzY2FsYXJzIGluICQtb3BlcmF0b3JzXG4gIC8vIEV4YW1wbGU6IGZvciBzZWxlY3RvciB7J2EuYic6IHskZ3Q6IDV9fSB0aGUgbW9kaWZpZXIgeydhLmIuYyc6N30gd291bGRcbiAgLy8gZGVmaW5pdGVseSBzZXQgdGhlIHJlc3VsdCB0byBmYWxzZSBhcyAnYS5iJyBhcHBlYXJzIHRvIGJlIGFuIG9iamVjdC5cbiAgY29uc3QgZXhwZWN0ZWRTY2FsYXJJc09iamVjdCA9IE9iamVjdC5rZXlzKHRoaXMuX3NlbGVjdG9yKS5zb21lKHBhdGggPT4ge1xuICAgIGlmICghaXNPcGVyYXRvck9iamVjdCh0aGlzLl9zZWxlY3RvcltwYXRoXSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gbW9kaWZpZXJQYXRocy5zb21lKG1vZGlmaWVyUGF0aCA9PlxuICAgICAgbW9kaWZpZXJQYXRoLnN0YXJ0c1dpdGgoYCR7cGF0aH0uYClcbiAgICApO1xuICB9KTtcblxuICBpZiAoZXhwZWN0ZWRTY2FsYXJJc09iamVjdCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFNlZSBpZiB3ZSBjYW4gYXBwbHkgdGhlIG1vZGlmaWVyIG9uIHRoZSBpZGVhbGx5IG1hdGNoaW5nIG9iamVjdC4gSWYgaXRcbiAgLy8gc3RpbGwgbWF0Y2hlcyB0aGUgc2VsZWN0b3IsIHRoZW4gdGhlIG1vZGlmaWVyIGNvdWxkIGhhdmUgdHVybmVkIHRoZSByZWFsXG4gIC8vIG9iamVjdCBpbiB0aGUgZGF0YWJhc2UgaW50byBzb21ldGhpbmcgbWF0Y2hpbmcuXG4gIGNvbnN0IG1hdGNoaW5nRG9jdW1lbnQgPSBFSlNPTi5jbG9uZSh0aGlzLm1hdGNoaW5nRG9jdW1lbnQoKSk7XG5cbiAgLy8gVGhlIHNlbGVjdG9yIGlzIHRvbyBjb21wbGV4LCBhbnl0aGluZyBjYW4gaGFwcGVuLlxuICBpZiAobWF0Y2hpbmdEb2N1bWVudCA9PT0gbnVsbCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShtYXRjaGluZ0RvY3VtZW50LCBtb2RpZmllcik7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gQ291bGRuJ3Qgc2V0IGEgcHJvcGVydHkgb24gYSBmaWVsZCB3aGljaCBpcyBhIHNjYWxhciBvciBudWxsIGluIHRoZVxuICAgIC8vIHNlbGVjdG9yLlxuICAgIC8vIEV4YW1wbGU6XG4gICAgLy8gcmVhbCBkb2N1bWVudDogeyAnYS5iJzogMyB9XG4gICAgLy8gc2VsZWN0b3I6IHsgJ2EnOiAxMiB9XG4gICAgLy8gY29udmVydGVkIHNlbGVjdG9yIChpZGVhbCBkb2N1bWVudCk6IHsgJ2EnOiAxMiB9XG4gICAgLy8gbW9kaWZpZXI6IHsgJHNldDogeyAnYS5iJzogNCB9IH1cbiAgICAvLyBXZSBkb24ndCBrbm93IHdoYXQgcmVhbCBkb2N1bWVudCB3YXMgbGlrZSBidXQgZnJvbSB0aGUgZXJyb3IgcmFpc2VkIGJ5XG4gICAgLy8gJHNldCBvbiBhIHNjYWxhciBmaWVsZCB3ZSBjYW4gcmVhc29uIHRoYXQgdGhlIHN0cnVjdHVyZSBvZiByZWFsIGRvY3VtZW50XG4gICAgLy8gaXMgY29tcGxldGVseSBkaWZmZXJlbnQuXG4gICAgaWYgKGVycm9yLm5hbWUgPT09ICdNaW5pbW9uZ29FcnJvcicgJiYgZXJyb3Iuc2V0UHJvcGVydHlFcnJvcikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZG9jdW1lbnRNYXRjaGVzKG1hdGNoaW5nRG9jdW1lbnQpLnJlc3VsdDtcbn07XG5cbi8vIEtub3dzIGhvdyB0byBjb21iaW5lIGEgbW9uZ28gc2VsZWN0b3IgYW5kIGEgZmllbGRzIHByb2plY3Rpb24gdG8gYSBuZXcgZmllbGRzXG4vLyBwcm9qZWN0aW9uIHRha2luZyBpbnRvIGFjY291bnQgYWN0aXZlIGZpZWxkcyBmcm9tIHRoZSBwYXNzZWQgc2VsZWN0b3IuXG4vLyBAcmV0dXJucyBPYmplY3QgLSBwcm9qZWN0aW9uIG9iamVjdCAoc2FtZSBhcyBmaWVsZHMgb3B0aW9uIG9mIG1vbmdvIGN1cnNvcilcbk1pbmltb25nby5NYXRjaGVyLnByb3RvdHlwZS5jb21iaW5lSW50b1Byb2plY3Rpb24gPSBmdW5jdGlvbihwcm9qZWN0aW9uKSB7XG4gIGNvbnN0IHNlbGVjdG9yUGF0aHMgPSBNaW5pbW9uZ28uX3BhdGhzRWxpZGluZ051bWVyaWNLZXlzKHRoaXMuX2dldFBhdGhzKCkpO1xuXG4gIC8vIFNwZWNpYWwgY2FzZSBmb3IgJHdoZXJlIG9wZXJhdG9yIGluIHRoZSBzZWxlY3RvciAtIHByb2plY3Rpb24gc2hvdWxkIGRlcGVuZFxuICAvLyBvbiBhbGwgZmllbGRzIG9mIHRoZSBkb2N1bWVudC4gZ2V0U2VsZWN0b3JQYXRocyByZXR1cm5zIGEgbGlzdCBvZiBwYXRoc1xuICAvLyBzZWxlY3RvciBkZXBlbmRzIG9uLiBJZiBvbmUgb2YgdGhlIHBhdGhzIGlzICcnIChlbXB0eSBzdHJpbmcpIHJlcHJlc2VudGluZ1xuICAvLyB0aGUgcm9vdCBvciB0aGUgd2hvbGUgZG9jdW1lbnQsIGNvbXBsZXRlIHByb2plY3Rpb24gc2hvdWxkIGJlIHJldHVybmVkLlxuICBpZiAoc2VsZWN0b3JQYXRocy5pbmNsdWRlcygnJykpIHtcbiAgICByZXR1cm4ge307XG4gIH1cblxuICByZXR1cm4gY29tYmluZUltcG9ydGFudFBhdGhzSW50b1Byb2plY3Rpb24oc2VsZWN0b3JQYXRocywgcHJvamVjdGlvbik7XG59O1xuXG4vLyBSZXR1cm5zIGFuIG9iamVjdCB0aGF0IHdvdWxkIG1hdGNoIHRoZSBzZWxlY3RvciBpZiBwb3NzaWJsZSBvciBudWxsIGlmIHRoZVxuLy8gc2VsZWN0b3IgaXMgdG9vIGNvbXBsZXggZm9yIHVzIHRvIGFuYWx5emVcbi8vIHsgJ2EuYic6IHsgYW5zOiA0MiB9LCAnZm9vLmJhcic6IG51bGwsICdmb28uYmF6JzogXCJzb21ldGhpbmdcIiB9XG4vLyA9PiB7IGE6IHsgYjogeyBhbnM6IDQyIH0gfSwgZm9vOiB7IGJhcjogbnVsbCwgYmF6OiBcInNvbWV0aGluZ1wiIH0gfVxuTWluaW1vbmdvLk1hdGNoZXIucHJvdG90eXBlLm1hdGNoaW5nRG9jdW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgLy8gY2hlY2sgaWYgaXQgd2FzIGNvbXB1dGVkIGJlZm9yZVxuICBpZiAodGhpcy5fbWF0Y2hpbmdEb2N1bWVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHRoaXMuX21hdGNoaW5nRG9jdW1lbnQ7XG4gIH1cblxuICAvLyBJZiB0aGUgYW5hbHlzaXMgb2YgdGhpcyBzZWxlY3RvciBpcyB0b28gaGFyZCBmb3Igb3VyIGltcGxlbWVudGF0aW9uXG4gIC8vIGZhbGxiYWNrIHRvIFwiWUVTXCJcbiAgbGV0IGZhbGxiYWNrID0gZmFsc2U7XG5cbiAgdGhpcy5fbWF0Y2hpbmdEb2N1bWVudCA9IHBhdGhzVG9UcmVlKFxuICAgIHRoaXMuX2dldFBhdGhzKCksXG4gICAgcGF0aCA9PiB7XG4gICAgICBjb25zdCB2YWx1ZVNlbGVjdG9yID0gdGhpcy5fc2VsZWN0b3JbcGF0aF07XG5cbiAgICAgIGlmIChpc09wZXJhdG9yT2JqZWN0KHZhbHVlU2VsZWN0b3IpKSB7XG4gICAgICAgIC8vIGlmIHRoZXJlIGlzIGEgc3RyaWN0IGVxdWFsaXR5LCB0aGVyZSBpcyBhIGdvb2RcbiAgICAgICAgLy8gY2hhbmNlIHdlIGNhbiB1c2Ugb25lIG9mIHRob3NlIGFzIFwibWF0Y2hpbmdcIlxuICAgICAgICAvLyBkdW1teSB2YWx1ZVxuICAgICAgICBpZiAodmFsdWVTZWxlY3Rvci4kZXEpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWVTZWxlY3Rvci4kZXE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsdWVTZWxlY3Rvci4kaW4pIHtcbiAgICAgICAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHtwbGFjZWhvbGRlcjogdmFsdWVTZWxlY3Rvcn0pO1xuXG4gICAgICAgICAgLy8gUmV0dXJuIGFueXRoaW5nIGZyb20gJGluIHRoYXQgbWF0Y2hlcyB0aGUgd2hvbGUgc2VsZWN0b3IgZm9yIHRoaXNcbiAgICAgICAgICAvLyBwYXRoLiBJZiBub3RoaW5nIG1hdGNoZXMsIHJldHVybnMgYHVuZGVmaW5lZGAgYXMgbm90aGluZyBjYW4gbWFrZVxuICAgICAgICAgIC8vIHRoaXMgc2VsZWN0b3IgaW50byBgdHJ1ZWAuXG4gICAgICAgICAgcmV0dXJuIHZhbHVlU2VsZWN0b3IuJGluLmZpbmQocGxhY2Vob2xkZXIgPT5cbiAgICAgICAgICAgIG1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKHtwbGFjZWhvbGRlcn0pLnJlc3VsdFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob25seUNvbnRhaW5zS2V5cyh2YWx1ZVNlbGVjdG9yLCBbJyRndCcsICckZ3RlJywgJyRsdCcsICckbHRlJ10pKSB7XG4gICAgICAgICAgbGV0IGxvd2VyQm91bmQgPSAtSW5maW5pdHk7XG4gICAgICAgICAgbGV0IHVwcGVyQm91bmQgPSBJbmZpbml0eTtcblxuICAgICAgICAgIFsnJGx0ZScsICckbHQnXS5mb3JFYWNoKG9wID0+IHtcbiAgICAgICAgICAgIGlmIChoYXNPd24uY2FsbCh2YWx1ZVNlbGVjdG9yLCBvcCkgJiZcbiAgICAgICAgICAgICAgICB2YWx1ZVNlbGVjdG9yW29wXSA8IHVwcGVyQm91bmQpIHtcbiAgICAgICAgICAgICAgdXBwZXJCb3VuZCA9IHZhbHVlU2VsZWN0b3Jbb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgWyckZ3RlJywgJyRndCddLmZvckVhY2gob3AgPT4ge1xuICAgICAgICAgICAgaWYgKGhhc093bi5jYWxsKHZhbHVlU2VsZWN0b3IsIG9wKSAmJlxuICAgICAgICAgICAgICAgIHZhbHVlU2VsZWN0b3Jbb3BdID4gbG93ZXJCb3VuZCkge1xuICAgICAgICAgICAgICBsb3dlckJvdW5kID0gdmFsdWVTZWxlY3RvcltvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjb25zdCBtaWRkbGUgPSAobG93ZXJCb3VuZCArIHVwcGVyQm91bmQpIC8gMjtcbiAgICAgICAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHtwbGFjZWhvbGRlcjogdmFsdWVTZWxlY3Rvcn0pO1xuXG4gICAgICAgICAgaWYgKCFtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyh7cGxhY2Vob2xkZXI6IG1pZGRsZX0pLnJlc3VsdCAmJlxuICAgICAgICAgICAgICAobWlkZGxlID09PSBsb3dlckJvdW5kIHx8IG1pZGRsZSA9PT0gdXBwZXJCb3VuZCkpIHtcbiAgICAgICAgICAgIGZhbGxiYWNrID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbWlkZGxlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9ubHlDb250YWluc0tleXModmFsdWVTZWxlY3RvciwgWyckbmluJywgJyRuZSddKSkge1xuICAgICAgICAgIC8vIFNpbmNlIHRoaXMuX2lzU2ltcGxlIG1ha2VzIHN1cmUgJG5pbiBhbmQgJG5lIGFyZSBub3QgY29tYmluZWQgd2l0aFxuICAgICAgICAgIC8vIG9iamVjdHMgb3IgYXJyYXlzLCB3ZSBjYW4gY29uZmlkZW50bHkgcmV0dXJuIGFuIGVtcHR5IG9iamVjdCBhcyBpdFxuICAgICAgICAgIC8vIG5ldmVyIG1hdGNoZXMgYW55IHNjYWxhci5cbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cblxuICAgICAgICBmYWxsYmFjayA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl9zZWxlY3RvcltwYXRoXTtcbiAgICB9LFxuICAgIHggPT4geCk7XG5cbiAgaWYgKGZhbGxiYWNrKSB7XG4gICAgdGhpcy5fbWF0Y2hpbmdEb2N1bWVudCA9IG51bGw7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fbWF0Y2hpbmdEb2N1bWVudDtcbn07XG5cbi8vIE1pbmltb25nby5Tb3J0ZXIgZ2V0cyBhIHNpbWlsYXIgbWV0aG9kLCB3aGljaCBkZWxlZ2F0ZXMgdG8gYSBNYXRjaGVyIGl0IG1hZGVcbi8vIGZvciB0aGlzIGV4YWN0IHB1cnBvc2UuXG5NaW5pbW9uZ28uU29ydGVyLnByb3RvdHlwZS5hZmZlY3RlZEJ5TW9kaWZpZXIgPSBmdW5jdGlvbihtb2RpZmllcikge1xuICByZXR1cm4gdGhpcy5fc2VsZWN0b3JGb3JBZmZlY3RlZEJ5TW9kaWZpZXIuYWZmZWN0ZWRCeU1vZGlmaWVyKG1vZGlmaWVyKTtcbn07XG5cbk1pbmltb25nby5Tb3J0ZXIucHJvdG90eXBlLmNvbWJpbmVJbnRvUHJvamVjdGlvbiA9IGZ1bmN0aW9uKHByb2plY3Rpb24pIHtcbiAgcmV0dXJuIGNvbWJpbmVJbXBvcnRhbnRQYXRoc0ludG9Qcm9qZWN0aW9uKFxuICAgIE1pbmltb25nby5fcGF0aHNFbGlkaW5nTnVtZXJpY0tleXModGhpcy5fZ2V0UGF0aHMoKSksXG4gICAgcHJvamVjdGlvblxuICApO1xufTtcblxuZnVuY3Rpb24gY29tYmluZUltcG9ydGFudFBhdGhzSW50b1Byb2plY3Rpb24ocGF0aHMsIHByb2plY3Rpb24pIHtcbiAgY29uc3QgZGV0YWlscyA9IHByb2plY3Rpb25EZXRhaWxzKHByb2plY3Rpb24pO1xuXG4gIC8vIG1lcmdlIHRoZSBwYXRocyB0byBpbmNsdWRlXG4gIGNvbnN0IHRyZWUgPSBwYXRoc1RvVHJlZShcbiAgICBwYXRocyxcbiAgICBwYXRoID0+IHRydWUsXG4gICAgKG5vZGUsIHBhdGgsIGZ1bGxQYXRoKSA9PiB0cnVlLFxuICAgIGRldGFpbHMudHJlZVxuICApO1xuICBjb25zdCBtZXJnZWRQcm9qZWN0aW9uID0gdHJlZVRvUGF0aHModHJlZSk7XG5cbiAgaWYgKGRldGFpbHMuaW5jbHVkaW5nKSB7XG4gICAgLy8gYm90aCBzZWxlY3RvciBhbmQgcHJvamVjdGlvbiBhcmUgcG9pbnRpbmcgb24gZmllbGRzIHRvIGluY2x1ZGVcbiAgICAvLyBzbyB3ZSBjYW4ganVzdCByZXR1cm4gdGhlIG1lcmdlZCB0cmVlXG4gICAgcmV0dXJuIG1lcmdlZFByb2plY3Rpb247XG4gIH1cblxuICAvLyBzZWxlY3RvciBpcyBwb2ludGluZyBhdCBmaWVsZHMgdG8gaW5jbHVkZVxuICAvLyBwcm9qZWN0aW9uIGlzIHBvaW50aW5nIGF0IGZpZWxkcyB0byBleGNsdWRlXG4gIC8vIG1ha2Ugc3VyZSB3ZSBkb24ndCBleGNsdWRlIGltcG9ydGFudCBwYXRoc1xuICBjb25zdCBtZXJnZWRFeGNsUHJvamVjdGlvbiA9IHt9O1xuXG4gIE9iamVjdC5rZXlzKG1lcmdlZFByb2plY3Rpb24pLmZvckVhY2gocGF0aCA9PiB7XG4gICAgaWYgKCFtZXJnZWRQcm9qZWN0aW9uW3BhdGhdKSB7XG4gICAgICBtZXJnZWRFeGNsUHJvamVjdGlvbltwYXRoXSA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIG1lcmdlZEV4Y2xQcm9qZWN0aW9uO1xufVxuXG5mdW5jdGlvbiBnZXRQYXRocyhzZWxlY3Rvcikge1xuICByZXR1cm4gT2JqZWN0LmtleXMobmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yKS5fcGF0aHMpO1xuXG4gIC8vIFhYWCByZW1vdmUgaXQ/XG4gIC8vIHJldHVybiBPYmplY3Qua2V5cyhzZWxlY3RvcikubWFwKGsgPT4ge1xuICAvLyAgIC8vIHdlIGRvbid0IGtub3cgaG93IHRvIGhhbmRsZSAkd2hlcmUgYmVjYXVzZSBpdCBjYW4gYmUgYW55dGhpbmdcbiAgLy8gICBpZiAoayA9PT0gJyR3aGVyZScpIHtcbiAgLy8gICAgIHJldHVybiAnJzsgLy8gbWF0Y2hlcyBldmVyeXRoaW5nXG4gIC8vICAgfVxuXG4gIC8vICAgLy8gd2UgYnJhbmNoIGZyb20gJG9yLyRhbmQvJG5vciBvcGVyYXRvclxuICAvLyAgIGlmIChbJyRvcicsICckYW5kJywgJyRub3InXS5pbmNsdWRlcyhrKSkge1xuICAvLyAgICAgcmV0dXJuIHNlbGVjdG9yW2tdLm1hcChnZXRQYXRocyk7XG4gIC8vICAgfVxuXG4gIC8vICAgLy8gdGhlIHZhbHVlIGlzIGEgbGl0ZXJhbCBvciBzb21lIGNvbXBhcmlzb24gb3BlcmF0b3JcbiAgLy8gICByZXR1cm4gaztcbiAgLy8gfSlcbiAgLy8gICAucmVkdWNlKChhLCBiKSA9PiBhLmNvbmNhdChiKSwgW10pXG4gIC8vICAgLmZpbHRlcigoYSwgYiwgYykgPT4gYy5pbmRleE9mKGEpID09PSBiKTtcbn1cblxuLy8gQSBoZWxwZXIgdG8gZW5zdXJlIG9iamVjdCBoYXMgb25seSBjZXJ0YWluIGtleXNcbmZ1bmN0aW9uIG9ubHlDb250YWluc0tleXMob2JqLCBrZXlzKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmopLmV2ZXJ5KGsgPT4ga2V5cy5pbmNsdWRlcyhrKSk7XG59XG5cbmZ1bmN0aW9uIHBhdGhIYXNOdW1lcmljS2V5cyhwYXRoKSB7XG4gIHJldHVybiBwYXRoLnNwbGl0KCcuJykuc29tZShpc051bWVyaWNLZXkpO1xufVxuXG4vLyBSZXR1cm5zIGEgc2V0IG9mIGtleSBwYXRocyBzaW1pbGFyIHRvXG4vLyB7ICdmb28uYmFyJzogMSwgJ2EuYi5jJzogMSB9XG5mdW5jdGlvbiB0cmVlVG9QYXRocyh0cmVlLCBwcmVmaXggPSAnJykge1xuICBjb25zdCByZXN1bHQgPSB7fTtcblxuICBPYmplY3Qua2V5cyh0cmVlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSB0cmVlW2tleV07XG4gICAgaWYgKHZhbHVlID09PSBPYmplY3QodmFsdWUpKSB7XG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdCwgdHJlZVRvUGF0aHModmFsdWUsIGAke3ByZWZpeCArIGtleX0uYCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRbcHJlZml4ICsga2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiIsImltcG9ydCBMb2NhbENvbGxlY3Rpb24gZnJvbSAnLi9sb2NhbF9jb2xsZWN0aW9uLmpzJztcblxuZXhwb3J0IGNvbnN0IGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vIEVhY2ggZWxlbWVudCBzZWxlY3RvciBjb250YWluczpcbi8vICAtIGNvbXBpbGVFbGVtZW50U2VsZWN0b3IsIGEgZnVuY3Rpb24gd2l0aCBhcmdzOlxuLy8gICAgLSBvcGVyYW5kIC0gdGhlIFwicmlnaHQgaGFuZCBzaWRlXCIgb2YgdGhlIG9wZXJhdG9yXG4vLyAgICAtIHZhbHVlU2VsZWN0b3IgLSB0aGUgXCJjb250ZXh0XCIgZm9yIHRoZSBvcGVyYXRvciAoc28gdGhhdCAkcmVnZXggY2FuIGZpbmRcbi8vICAgICAgJG9wdGlvbnMpXG4vLyAgICAtIG1hdGNoZXIgLSB0aGUgTWF0Y2hlciB0aGlzIGlzIGdvaW5nIGludG8gKHNvIHRoYXQgJGVsZW1NYXRjaCBjYW4gY29tcGlsZVxuLy8gICAgICBtb3JlIHRoaW5ncylcbi8vICAgIHJldHVybmluZyBhIGZ1bmN0aW9uIG1hcHBpbmcgYSBzaW5nbGUgdmFsdWUgdG8gYm9vbC5cbi8vICAtIGRvbnRFeHBhbmRMZWFmQXJyYXlzLCBhIGJvb2wgd2hpY2ggcHJldmVudHMgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyBmcm9tXG4vLyAgICBiZWluZyBjYWxsZWRcbi8vICAtIGRvbnRJbmNsdWRlTGVhZkFycmF5cywgYSBib29sIHdoaWNoIGNhdXNlcyBhbiBhcmd1bWVudCB0byBiZSBwYXNzZWQgdG9cbi8vICAgIGV4cGFuZEFycmF5c0luQnJhbmNoZXMgaWYgaXQgaXMgY2FsbGVkXG5leHBvcnQgY29uc3QgRUxFTUVOVF9PUEVSQVRPUlMgPSB7XG4gICRsdDogbWFrZUluZXF1YWxpdHkoY21wVmFsdWUgPT4gY21wVmFsdWUgPCAwKSxcbiAgJGd0OiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZSA9PiBjbXBWYWx1ZSA+IDApLFxuICAkbHRlOiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZSA9PiBjbXBWYWx1ZSA8PSAwKSxcbiAgJGd0ZTogbWFrZUluZXF1YWxpdHkoY21wVmFsdWUgPT4gY21wVmFsdWUgPj0gMCksXG4gICRtb2Q6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGlmICghKEFycmF5LmlzQXJyYXkob3BlcmFuZCkgJiYgb3BlcmFuZC5sZW5ndGggPT09IDJcbiAgICAgICAgICAgICYmIHR5cGVvZiBvcGVyYW5kWzBdID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgJiYgdHlwZW9mIG9wZXJhbmRbMV0gPT09ICdudW1iZXInKSkge1xuICAgICAgICB0aHJvdyBFcnJvcignYXJndW1lbnQgdG8gJG1vZCBtdXN0IGJlIGFuIGFycmF5IG9mIHR3byBudW1iZXJzJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFhYWCBjb3VsZCByZXF1aXJlIHRvIGJlIGludHMgb3Igcm91bmQgb3Igc29tZXRoaW5nXG4gICAgICBjb25zdCBkaXZpc29yID0gb3BlcmFuZFswXTtcbiAgICAgIGNvbnN0IHJlbWFpbmRlciA9IG9wZXJhbmRbMV07XG4gICAgICByZXR1cm4gdmFsdWUgPT4gKFxuICAgICAgICB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIHZhbHVlICUgZGl2aXNvciA9PT0gcmVtYWluZGVyXG4gICAgICApO1xuICAgIH0sXG4gIH0sXG4gICRpbjoge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG9wZXJhbmQpKSB7XG4gICAgICAgIHRocm93IEVycm9yKCckaW4gbmVlZHMgYW4gYXJyYXknKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZWxlbWVudE1hdGNoZXJzID0gb3BlcmFuZC5tYXAob3B0aW9uID0+IHtcbiAgICAgICAgaWYgKG9wdGlvbiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAgIHJldHVybiByZWdleHBFbGVtZW50TWF0Y2hlcihvcHRpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzT3BlcmF0b3JPYmplY3Qob3B0aW9uKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdjYW5ub3QgbmVzdCAkIHVuZGVyICRpbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVxdWFsaXR5RWxlbWVudE1hdGNoZXIob3B0aW9uKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdmFsdWUgPT4ge1xuICAgICAgICAvLyBBbGxvdyB7YTogeyRpbjogW251bGxdfX0gdG8gbWF0Y2ggd2hlbiAnYScgZG9lcyBub3QgZXhpc3QuXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVsZW1lbnRNYXRjaGVycy5zb21lKG1hdGNoZXIgPT4gbWF0Y2hlcih2YWx1ZSkpO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAkc2l6ZToge1xuICAgIC8vIHthOiBbWzUsIDVdXX0gbXVzdCBtYXRjaCB7YTogeyRzaXplOiAxfX0gYnV0IG5vdCB7YTogeyRzaXplOiAyfX0sIHNvIHdlXG4gICAgLy8gZG9uJ3Qgd2FudCB0byBjb25zaWRlciB0aGUgZWxlbWVudCBbNSw1XSBpbiB0aGUgbGVhZiBhcnJheSBbWzUsNV1dIGFzIGFcbiAgICAvLyBwb3NzaWJsZSB2YWx1ZS5cbiAgICBkb250RXhwYW5kTGVhZkFycmF5czogdHJ1ZSxcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGlmICh0eXBlb2Ygb3BlcmFuZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8gRG9uJ3QgYXNrIG1lIHdoeSwgYnV0IGJ5IGV4cGVyaW1lbnRhdGlvbiwgdGhpcyBzZWVtcyB0byBiZSB3aGF0IE1vbmdvXG4gICAgICAgIC8vIGRvZXMuXG4gICAgICAgIG9wZXJhbmQgPSAwO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb3BlcmFuZCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJyRzaXplIG5lZWRzIGEgbnVtYmVyJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiBBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IG9wZXJhbmQ7XG4gICAgfSxcbiAgfSxcbiAgJHR5cGU6IHtcbiAgICAvLyB7YTogWzVdfSBtdXN0IG5vdCBtYXRjaCB7YTogeyR0eXBlOiA0fX0gKDQgbWVhbnMgYXJyYXkpLCBidXQgaXQgc2hvdWxkXG4gICAgLy8gbWF0Y2gge2E6IHskdHlwZTogMX19ICgxIG1lYW5zIG51bWJlciksIGFuZCB7YTogW1s1XV19IG11c3QgbWF0Y2ggeyRhOlxuICAgIC8vIHskdHlwZTogNH19LiBUaHVzLCB3aGVuIHdlIHNlZSBhIGxlYWYgYXJyYXksIHdlICpzaG91bGQqIGV4cGFuZCBpdCBidXRcbiAgICAvLyBzaG91bGQgKm5vdCogaW5jbHVkZSBpdCBpdHNlbGYuXG4gICAgZG9udEluY2x1ZGVMZWFmQXJyYXlzOiB0cnVlLFxuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgaWYgKHR5cGVvZiBvcGVyYW5kID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb25zdCBvcGVyYW5kQWxpYXNNYXAgPSB7XG4gICAgICAgICAgJ2RvdWJsZSc6IDEsXG4gICAgICAgICAgJ3N0cmluZyc6IDIsXG4gICAgICAgICAgJ29iamVjdCc6IDMsXG4gICAgICAgICAgJ2FycmF5JzogNCxcbiAgICAgICAgICAnYmluRGF0YSc6IDUsXG4gICAgICAgICAgJ3VuZGVmaW5lZCc6IDYsXG4gICAgICAgICAgJ29iamVjdElkJzogNyxcbiAgICAgICAgICAnYm9vbCc6IDgsXG4gICAgICAgICAgJ2RhdGUnOiA5LFxuICAgICAgICAgICdudWxsJzogMTAsXG4gICAgICAgICAgJ3JlZ2V4JzogMTEsXG4gICAgICAgICAgJ2RiUG9pbnRlcic6IDEyLFxuICAgICAgICAgICdqYXZhc2NyaXB0JzogMTMsXG4gICAgICAgICAgJ3N5bWJvbCc6IDE0LFxuICAgICAgICAgICdqYXZhc2NyaXB0V2l0aFNjb3BlJzogMTUsXG4gICAgICAgICAgJ2ludCc6IDE2LFxuICAgICAgICAgICd0aW1lc3RhbXAnOiAxNyxcbiAgICAgICAgICAnbG9uZyc6IDE4LFxuICAgICAgICAgICdkZWNpbWFsJzogMTksXG4gICAgICAgICAgJ21pbktleSc6IC0xLFxuICAgICAgICAgICdtYXhLZXknOiAxMjcsXG4gICAgICAgIH07XG4gICAgICAgIGlmICghaGFzT3duLmNhbGwob3BlcmFuZEFsaWFzTWFwLCBvcGVyYW5kKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKGB1bmtub3duIHN0cmluZyBhbGlhcyBmb3IgJHR5cGU6ICR7b3BlcmFuZH1gKTtcbiAgICAgICAgfVxuICAgICAgICBvcGVyYW5kID0gb3BlcmFuZEFsaWFzTWFwW29wZXJhbmRdO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb3BlcmFuZCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgaWYgKG9wZXJhbmQgPT09IDAgfHwgb3BlcmFuZCA8IC0xXG4gICAgICAgICAgfHwgKG9wZXJhbmQgPiAxOSAmJiBvcGVyYW5kICE9PSAxMjcpKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoYEludmFsaWQgbnVtZXJpY2FsICR0eXBlIGNvZGU6ICR7b3BlcmFuZH1gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2FyZ3VtZW50IHRvICR0eXBlIGlzIG5vdCBhIG51bWJlciBvciBhIHN0cmluZycpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdmFsdWUgPT4gKFxuICAgICAgICB2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZSh2YWx1ZSkgPT09IG9wZXJhbmRcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcbiAgJGJpdHNBbGxTZXQ6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbGxTZXQnKTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IGJpdG1hc2sgPSBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIG1hc2subGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJpdG1hc2sgJiYgbWFzay5ldmVyeSgoYnl0ZSwgaSkgPT4gKGJpdG1hc2tbaV0gJiBieXRlKSA9PT0gYnl0ZSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRiaXRzQW55U2V0OiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBjb25zdCBtYXNrID0gZ2V0T3BlcmFuZEJpdG1hc2sob3BlcmFuZCwgJyRiaXRzQW55U2V0Jyk7XG4gICAgICByZXR1cm4gdmFsdWUgPT4ge1xuICAgICAgICBjb25zdCBiaXRtYXNrID0gZ2V0VmFsdWVCaXRtYXNrKHZhbHVlLCBtYXNrLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiBiaXRtYXNrICYmIG1hc2suc29tZSgoYnl0ZSwgaSkgPT4gKH5iaXRtYXNrW2ldICYgYnl0ZSkgIT09IGJ5dGUpO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAkYml0c0FsbENsZWFyOiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBjb25zdCBtYXNrID0gZ2V0T3BlcmFuZEJpdG1hc2sob3BlcmFuZCwgJyRiaXRzQWxsQ2xlYXInKTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IGJpdG1hc2sgPSBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIG1hc2subGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJpdG1hc2sgJiYgbWFzay5ldmVyeSgoYnl0ZSwgaSkgPT4gIShiaXRtYXNrW2ldICYgYnl0ZSkpO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAkYml0c0FueUNsZWFyOiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBjb25zdCBtYXNrID0gZ2V0T3BlcmFuZEJpdG1hc2sob3BlcmFuZCwgJyRiaXRzQW55Q2xlYXInKTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IGJpdG1hc2sgPSBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIG1hc2subGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJpdG1hc2sgJiYgbWFzay5zb21lKChieXRlLCBpKSA9PiAoYml0bWFza1tpXSAmIGJ5dGUpICE9PSBieXRlKTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgJHJlZ2V4OiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yKSB7XG4gICAgICBpZiAoISh0eXBlb2Ygb3BlcmFuZCA9PT0gJ3N0cmluZycgfHwgb3BlcmFuZCBpbnN0YW5jZW9mIFJlZ0V4cCkpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJyRyZWdleCBoYXMgdG8gYmUgYSBzdHJpbmcgb3IgUmVnRXhwJyk7XG4gICAgICB9XG5cbiAgICAgIGxldCByZWdleHA7XG4gICAgICBpZiAodmFsdWVTZWxlY3Rvci4kb3B0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIE9wdGlvbnMgcGFzc2VkIGluICRvcHRpb25zIChldmVuIHRoZSBlbXB0eSBzdHJpbmcpIGFsd2F5cyBvdmVycmlkZXNcbiAgICAgICAgLy8gb3B0aW9ucyBpbiB0aGUgUmVnRXhwIG9iamVjdCBpdHNlbGYuXG5cbiAgICAgICAgLy8gQmUgY2xlYXIgdGhhdCB3ZSBvbmx5IHN1cHBvcnQgdGhlIEpTLXN1cHBvcnRlZCBvcHRpb25zLCBub3QgZXh0ZW5kZWRcbiAgICAgICAgLy8gb25lcyAoZWcsIE1vbmdvIHN1cHBvcnRzIHggYW5kIHMpLiBJZGVhbGx5IHdlIHdvdWxkIGltcGxlbWVudCB4IGFuZCBzXG4gICAgICAgIC8vIGJ5IHRyYW5zZm9ybWluZyB0aGUgcmVnZXhwLCBidXQgbm90IHRvZGF5Li4uXG4gICAgICAgIGlmICgvW15naW1dLy50ZXN0KHZhbHVlU2VsZWN0b3IuJG9wdGlvbnMpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IHRoZSBpLCBtLCBhbmQgZyByZWdleHAgb3B0aW9ucyBhcmUgc3VwcG9ydGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzb3VyY2UgPSBvcGVyYW5kIGluc3RhbmNlb2YgUmVnRXhwID8gb3BlcmFuZC5zb3VyY2UgOiBvcGVyYW5kO1xuICAgICAgICByZWdleHAgPSBuZXcgUmVnRXhwKHNvdXJjZSwgdmFsdWVTZWxlY3Rvci4kb3B0aW9ucyk7XG4gICAgICB9IGVsc2UgaWYgKG9wZXJhbmQgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmVnZXhwID0gb3BlcmFuZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAob3BlcmFuZCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWdleHBFbGVtZW50TWF0Y2hlcihyZWdleHApO1xuICAgIH0sXG4gIH0sXG4gICRlbGVtTWF0Y2g6IHtcbiAgICBkb250RXhwYW5kTGVhZkFycmF5czogdHJ1ZSxcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIpIHtcbiAgICAgIGlmICghTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KG9wZXJhbmQpKSB7XG4gICAgICAgIHRocm93IEVycm9yKCckZWxlbU1hdGNoIG5lZWQgYW4gb2JqZWN0Jyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzRG9jTWF0Y2hlciA9ICFpc09wZXJhdG9yT2JqZWN0KFxuICAgICAgICBPYmplY3Qua2V5cyhvcGVyYW5kKVxuICAgICAgICAgIC5maWx0ZXIoa2V5ID0+ICFoYXNPd24uY2FsbChMT0dJQ0FMX09QRVJBVE9SUywga2V5KSlcbiAgICAgICAgICAucmVkdWNlKChhLCBiKSA9PiBPYmplY3QuYXNzaWduKGEsIHtbYl06IG9wZXJhbmRbYl19KSwge30pLFxuICAgICAgICB0cnVlKTtcblxuICAgICAgbGV0IHN1Yk1hdGNoZXI7XG4gICAgICBpZiAoaXNEb2NNYXRjaGVyKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgTk9UIHRoZSBzYW1lIGFzIGNvbXBpbGVWYWx1ZVNlbGVjdG9yKG9wZXJhbmQpLCBhbmQgbm90IGp1c3RcbiAgICAgICAgLy8gYmVjYXVzZSBvZiB0aGUgc2xpZ2h0bHkgZGlmZmVyZW50IGNhbGxpbmcgY29udmVudGlvbi5cbiAgICAgICAgLy8geyRlbGVtTWF0Y2g6IHt4OiAzfX0gbWVhbnMgXCJhbiBlbGVtZW50IGhhcyBhIGZpZWxkIHg6M1wiLCBub3RcbiAgICAgICAgLy8gXCJjb25zaXN0cyBvbmx5IG9mIGEgZmllbGQgeDozXCIuIEFsc28sIHJlZ2V4cHMgYW5kIHN1Yi0kIGFyZSBhbGxvd2VkLlxuICAgICAgICBzdWJNYXRjaGVyID1cbiAgICAgICAgICBjb21waWxlRG9jdW1lbnRTZWxlY3RvcihvcGVyYW5kLCBtYXRjaGVyLCB7aW5FbGVtTWF0Y2g6IHRydWV9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN1Yk1hdGNoZXIgPSBjb21waWxlVmFsdWVTZWxlY3RvcihvcGVyYW5kLCBtYXRjaGVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBjb25zdCBhcnJheUVsZW1lbnQgPSB2YWx1ZVtpXTtcbiAgICAgICAgICBsZXQgYXJnO1xuICAgICAgICAgIGlmIChpc0RvY01hdGNoZXIpIHtcbiAgICAgICAgICAgIC8vIFdlIGNhbiBvbmx5IG1hdGNoIHskZWxlbU1hdGNoOiB7YjogM319IGFnYWluc3Qgb2JqZWN0cy5cbiAgICAgICAgICAgIC8vIChXZSBjYW4gYWxzbyBtYXRjaCBhZ2FpbnN0IGFycmF5cywgaWYgdGhlcmUncyBudW1lcmljIGluZGljZXMsXG4gICAgICAgICAgICAvLyBlZyB7JGVsZW1NYXRjaDogeycwLmInOiAzfX0gb3IgeyRlbGVtTWF0Y2g6IHswOiAzfX0uKVxuICAgICAgICAgICAgaWYgKCFpc0luZGV4YWJsZShhcnJheUVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXJnID0gYXJyYXlFbGVtZW50O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBkb250SXRlcmF0ZSBlbnN1cmVzIHRoYXQge2E6IHskZWxlbU1hdGNoOiB7JGd0OiA1fX19IG1hdGNoZXNcbiAgICAgICAgICAgIC8vIHthOiBbOF19IGJ1dCBub3Qge2E6IFtbOF1dfVxuICAgICAgICAgICAgYXJnID0gW3t2YWx1ZTogYXJyYXlFbGVtZW50LCBkb250SXRlcmF0ZTogdHJ1ZX1dO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBYWFggc3VwcG9ydCAkbmVhciBpbiAkZWxlbU1hdGNoIGJ5IHByb3BhZ2F0aW5nICRkaXN0YW5jZT9cbiAgICAgICAgICBpZiAoc3ViTWF0Y2hlcihhcmcpLnJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIGk7IC8vIHNwZWNpYWxseSB1bmRlcnN0b29kIHRvIG1lYW4gXCJ1c2UgYXMgYXJyYXlJbmRpY2VzXCJcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG59O1xuXG4vLyBPcGVyYXRvcnMgdGhhdCBhcHBlYXIgYXQgdGhlIHRvcCBsZXZlbCBvZiBhIGRvY3VtZW50IHNlbGVjdG9yLlxuY29uc3QgTE9HSUNBTF9PUEVSQVRPUlMgPSB7XG4gICRhbmQoc3ViU2VsZWN0b3IsIG1hdGNoZXIsIGluRWxlbU1hdGNoKSB7XG4gICAgcmV0dXJuIGFuZERvY3VtZW50TWF0Y2hlcnMoXG4gICAgICBjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBpbkVsZW1NYXRjaClcbiAgICApO1xuICB9LFxuXG4gICRvcihzdWJTZWxlY3RvciwgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpIHtcbiAgICBjb25zdCBtYXRjaGVycyA9IGNvbXBpbGVBcnJheU9mRG9jdW1lbnRTZWxlY3RvcnMoXG4gICAgICBzdWJTZWxlY3RvcixcbiAgICAgIG1hdGNoZXIsXG4gICAgICBpbkVsZW1NYXRjaFxuICAgICk7XG5cbiAgICAvLyBTcGVjaWFsIGNhc2U6IGlmIHRoZXJlIGlzIG9ubHkgb25lIG1hdGNoZXIsIHVzZSBpdCBkaXJlY3RseSwgKnByZXNlcnZpbmcqXG4gICAgLy8gYW55IGFycmF5SW5kaWNlcyBpdCByZXR1cm5zLlxuICAgIGlmIChtYXRjaGVycy5sZW5ndGggPT09IDEpIHtcbiAgICAgIHJldHVybiBtYXRjaGVyc1swXTtcbiAgICB9XG5cbiAgICByZXR1cm4gZG9jID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoZXJzLnNvbWUoZm4gPT4gZm4oZG9jKS5yZXN1bHQpO1xuICAgICAgLy8gJG9yIGRvZXMgTk9UIHNldCBhcnJheUluZGljZXMgd2hlbiBpdCBoYXMgbXVsdGlwbGVcbiAgICAgIC8vIHN1Yi1leHByZXNzaW9ucy4gKFRlc3RlZCBhZ2FpbnN0IE1vbmdvREIuKVxuICAgICAgcmV0dXJuIHtyZXN1bHR9O1xuICAgIH07XG4gIH0sXG5cbiAgJG5vcihzdWJTZWxlY3RvciwgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpIHtcbiAgICBjb25zdCBtYXRjaGVycyA9IGNvbXBpbGVBcnJheU9mRG9jdW1lbnRTZWxlY3RvcnMoXG4gICAgICBzdWJTZWxlY3RvcixcbiAgICAgIG1hdGNoZXIsXG4gICAgICBpbkVsZW1NYXRjaFxuICAgICk7XG4gICAgcmV0dXJuIGRvYyA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBtYXRjaGVycy5ldmVyeShmbiA9PiAhZm4oZG9jKS5yZXN1bHQpO1xuICAgICAgLy8gTmV2ZXIgc2V0IGFycmF5SW5kaWNlcywgYmVjYXVzZSB3ZSBvbmx5IG1hdGNoIGlmIG5vdGhpbmcgaW4gcGFydGljdWxhclxuICAgICAgLy8gJ21hdGNoZWQnIChhbmQgYmVjYXVzZSB0aGlzIGlzIGNvbnNpc3RlbnQgd2l0aCBNb25nb0RCKS5cbiAgICAgIHJldHVybiB7cmVzdWx0fTtcbiAgICB9O1xuICB9LFxuXG4gICR3aGVyZShzZWxlY3RvclZhbHVlLCBtYXRjaGVyKSB7XG4gICAgLy8gUmVjb3JkIHRoYXQgKmFueSogcGF0aCBtYXkgYmUgdXNlZC5cbiAgICBtYXRjaGVyLl9yZWNvcmRQYXRoVXNlZCgnJyk7XG4gICAgbWF0Y2hlci5faGFzV2hlcmUgPSB0cnVlO1xuXG4gICAgaWYgKCEoc2VsZWN0b3JWYWx1ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgLy8gWFhYIE1vbmdvREIgc2VlbXMgdG8gaGF2ZSBtb3JlIGNvbXBsZXggbG9naWMgdG8gZGVjaWRlIHdoZXJlIG9yIG9yIG5vdFxuICAgICAgLy8gdG8gYWRkICdyZXR1cm4nOyBub3Qgc3VyZSBleGFjdGx5IHdoYXQgaXQgaXMuXG4gICAgICBzZWxlY3RvclZhbHVlID0gRnVuY3Rpb24oJ29iaicsIGByZXR1cm4gJHtzZWxlY3RvclZhbHVlfWApO1xuICAgIH1cblxuICAgIC8vIFdlIG1ha2UgdGhlIGRvY3VtZW50IGF2YWlsYWJsZSBhcyBib3RoIGB0aGlzYCBhbmQgYG9iamAuXG4gICAgLy8gLy8gWFhYIG5vdCBzdXJlIHdoYXQgd2Ugc2hvdWxkIGRvIGlmIHRoaXMgdGhyb3dzXG4gICAgcmV0dXJuIGRvYyA9PiAoe3Jlc3VsdDogc2VsZWN0b3JWYWx1ZS5jYWxsKGRvYywgZG9jKX0pO1xuICB9LFxuXG4gIC8vIFRoaXMgaXMganVzdCB1c2VkIGFzIGEgY29tbWVudCBpbiB0aGUgcXVlcnkgKGluIE1vbmdvREIsIGl0IGFsc28gZW5kcyB1cCBpblxuICAvLyBxdWVyeSBsb2dzKTsgaXQgaGFzIG5vIGVmZmVjdCBvbiB0aGUgYWN0dWFsIHNlbGVjdGlvbi5cbiAgJGNvbW1lbnQoKSB7XG4gICAgcmV0dXJuICgpID0+ICh7cmVzdWx0OiB0cnVlfSk7XG4gIH0sXG59O1xuXG4vLyBPcGVyYXRvcnMgdGhhdCAodW5saWtlIExPR0lDQUxfT1BFUkFUT1JTKSBwZXJ0YWluIHRvIGluZGl2aWR1YWwgcGF0aHMgaW4gYVxuLy8gZG9jdW1lbnQsIGJ1dCAodW5saWtlIEVMRU1FTlRfT1BFUkFUT1JTKSBkbyBub3QgaGF2ZSBhIHNpbXBsZSBkZWZpbml0aW9uIGFzXG4vLyBcIm1hdGNoIGVhY2ggYnJhbmNoZWQgdmFsdWUgaW5kZXBlbmRlbnRseSBhbmQgY29tYmluZSB3aXRoXG4vLyBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlclwiLlxuY29uc3QgVkFMVUVfT1BFUkFUT1JTID0ge1xuICAkZXEob3BlcmFuZCkge1xuICAgIHJldHVybiBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgIGVxdWFsaXR5RWxlbWVudE1hdGNoZXIob3BlcmFuZClcbiAgICApO1xuICB9LFxuICAkbm90KG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIpIHtcbiAgICByZXR1cm4gaW52ZXJ0QnJhbmNoZWRNYXRjaGVyKGNvbXBpbGVWYWx1ZVNlbGVjdG9yKG9wZXJhbmQsIG1hdGNoZXIpKTtcbiAgfSxcbiAgJG5lKG9wZXJhbmQpIHtcbiAgICByZXR1cm4gaW52ZXJ0QnJhbmNoZWRNYXRjaGVyKFxuICAgICAgY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoZXF1YWxpdHlFbGVtZW50TWF0Y2hlcihvcGVyYW5kKSlcbiAgICApO1xuICB9LFxuICAkbmluKG9wZXJhbmQpIHtcbiAgICByZXR1cm4gaW52ZXJ0QnJhbmNoZWRNYXRjaGVyKFxuICAgICAgY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoXG4gICAgICAgIEVMRU1FTlRfT1BFUkFUT1JTLiRpbi5jb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpXG4gICAgICApXG4gICAgKTtcbiAgfSxcbiAgJGV4aXN0cyhvcGVyYW5kKSB7XG4gICAgY29uc3QgZXhpc3RzID0gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoXG4gICAgICB2YWx1ZSA9PiB2YWx1ZSAhPT0gdW5kZWZpbmVkXG4gICAgKTtcbiAgICByZXR1cm4gb3BlcmFuZCA/IGV4aXN0cyA6IGludmVydEJyYW5jaGVkTWF0Y2hlcihleGlzdHMpO1xuICB9LFxuICAvLyAkb3B0aW9ucyBqdXN0IHByb3ZpZGVzIG9wdGlvbnMgZm9yICRyZWdleDsgaXRzIGxvZ2ljIGlzIGluc2lkZSAkcmVnZXhcbiAgJG9wdGlvbnMob3BlcmFuZCwgdmFsdWVTZWxlY3Rvcikge1xuICAgIGlmICghaGFzT3duLmNhbGwodmFsdWVTZWxlY3RvciwgJyRyZWdleCcpKSB7XG4gICAgICB0aHJvdyBFcnJvcignJG9wdGlvbnMgbmVlZHMgYSAkcmVnZXgnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZXZlcnl0aGluZ01hdGNoZXI7XG4gIH0sXG4gIC8vICRtYXhEaXN0YW5jZSBpcyBiYXNpY2FsbHkgYW4gYXJndW1lbnQgdG8gJG5lYXJcbiAgJG1heERpc3RhbmNlKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IpIHtcbiAgICBpZiAoIXZhbHVlU2VsZWN0b3IuJG5lYXIpIHtcbiAgICAgIHRocm93IEVycm9yKCckbWF4RGlzdGFuY2UgbmVlZHMgYSAkbmVhcicpO1xuICAgIH1cblxuICAgIHJldHVybiBldmVyeXRoaW5nTWF0Y2hlcjtcbiAgfSxcbiAgJGFsbChvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KG9wZXJhbmQpKSB7XG4gICAgICB0aHJvdyBFcnJvcignJGFsbCByZXF1aXJlcyBhcnJheScpO1xuICAgIH1cblxuICAgIC8vIE5vdCBzdXJlIHdoeSwgYnV0IHRoaXMgc2VlbXMgdG8gYmUgd2hhdCBNb25nb0RCIGRvZXMuXG4gICAgaWYgKG9wZXJhbmQubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbm90aGluZ01hdGNoZXI7XG4gICAgfVxuXG4gICAgY29uc3QgYnJhbmNoZWRNYXRjaGVycyA9IG9wZXJhbmQubWFwKGNyaXRlcmlvbiA9PiB7XG4gICAgICAvLyBYWFggaGFuZGxlICRhbGwvJGVsZW1NYXRjaCBjb21iaW5hdGlvblxuICAgICAgaWYgKGlzT3BlcmF0b3JPYmplY3QoY3JpdGVyaW9uKSkge1xuICAgICAgICB0aHJvdyBFcnJvcignbm8gJCBleHByZXNzaW9ucyBpbiAkYWxsJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoaXMgaXMgYWx3YXlzIGEgcmVnZXhwIG9yIGVxdWFsaXR5IHNlbGVjdG9yLlxuICAgICAgcmV0dXJuIGNvbXBpbGVWYWx1ZVNlbGVjdG9yKGNyaXRlcmlvbiwgbWF0Y2hlcik7XG4gICAgfSk7XG5cbiAgICAvLyBhbmRCcmFuY2hlZE1hdGNoZXJzIGRvZXMgTk9UIHJlcXVpcmUgYWxsIHNlbGVjdG9ycyB0byByZXR1cm4gdHJ1ZSBvbiB0aGVcbiAgICAvLyBTQU1FIGJyYW5jaC5cbiAgICByZXR1cm4gYW5kQnJhbmNoZWRNYXRjaGVycyhicmFuY2hlZE1hdGNoZXJzKTtcbiAgfSxcbiAgJG5lYXIob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlciwgaXNSb290KSB7XG4gICAgaWYgKCFpc1Jvb3QpIHtcbiAgICAgIHRocm93IEVycm9yKCckbmVhciBjYW5cXCd0IGJlIGluc2lkZSBhbm90aGVyICQgb3BlcmF0b3InKTtcbiAgICB9XG5cbiAgICBtYXRjaGVyLl9oYXNHZW9RdWVyeSA9IHRydWU7XG5cbiAgICAvLyBUaGVyZSBhcmUgdHdvIGtpbmRzIG9mIGdlb2RhdGEgaW4gTW9uZ29EQjogbGVnYWN5IGNvb3JkaW5hdGUgcGFpcnMgYW5kXG4gICAgLy8gR2VvSlNPTi4gVGhleSB1c2UgZGlmZmVyZW50IGRpc3RhbmNlIG1ldHJpY3MsIHRvby4gR2VvSlNPTiBxdWVyaWVzIGFyZVxuICAgIC8vIG1hcmtlZCB3aXRoIGEgJGdlb21ldHJ5IHByb3BlcnR5LCB0aG91Z2ggbGVnYWN5IGNvb3JkaW5hdGVzIGNhbiBiZVxuICAgIC8vIG1hdGNoZWQgdXNpbmcgJGdlb21ldHJ5LlxuICAgIGxldCBtYXhEaXN0YW5jZSwgcG9pbnQsIGRpc3RhbmNlO1xuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3Qob3BlcmFuZCkgJiYgaGFzT3duLmNhbGwob3BlcmFuZCwgJyRnZW9tZXRyeScpKSB7XG4gICAgICAvLyBHZW9KU09OIFwiMmRzcGhlcmVcIiBtb2RlLlxuICAgICAgbWF4RGlzdGFuY2UgPSBvcGVyYW5kLiRtYXhEaXN0YW5jZTtcbiAgICAgIHBvaW50ID0gb3BlcmFuZC4kZ2VvbWV0cnk7XG4gICAgICBkaXN0YW5jZSA9IHZhbHVlID0+IHtcbiAgICAgICAgLy8gWFhYOiBmb3Igbm93LCB3ZSBkb24ndCBjYWxjdWxhdGUgdGhlIGFjdHVhbCBkaXN0YW5jZSBiZXR3ZWVuLCBzYXksXG4gICAgICAgIC8vIHBvbHlnb24gYW5kIGNpcmNsZS4gSWYgcGVvcGxlIGNhcmUgYWJvdXQgdGhpcyB1c2UtY2FzZSBpdCB3aWxsIGdldFxuICAgICAgICAvLyBhIHByaW9yaXR5LlxuICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXZhbHVlLnR5cGUpIHtcbiAgICAgICAgICByZXR1cm4gR2VvSlNPTi5wb2ludERpc3RhbmNlKFxuICAgICAgICAgICAgcG9pbnQsXG4gICAgICAgICAgICB7dHlwZTogJ1BvaW50JywgY29vcmRpbmF0ZXM6IHBvaW50VG9BcnJheSh2YWx1ZSl9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZS50eXBlID09PSAnUG9pbnQnKSB7XG4gICAgICAgICAgcmV0dXJuIEdlb0pTT04ucG9pbnREaXN0YW5jZShwb2ludCwgdmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIEdlb0pTT04uZ2VvbWV0cnlXaXRoaW5SYWRpdXModmFsdWUsIHBvaW50LCBtYXhEaXN0YW5jZSlcbiAgICAgICAgICA/IDBcbiAgICAgICAgICA6IG1heERpc3RhbmNlICsgMTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIG1heERpc3RhbmNlID0gdmFsdWVTZWxlY3Rvci4kbWF4RGlzdGFuY2U7XG5cbiAgICAgIGlmICghaXNJbmRleGFibGUob3BlcmFuZCkpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJyRuZWFyIGFyZ3VtZW50IG11c3QgYmUgY29vcmRpbmF0ZSBwYWlyIG9yIEdlb0pTT04nKTtcbiAgICAgIH1cblxuICAgICAgcG9pbnQgPSBwb2ludFRvQXJyYXkob3BlcmFuZCk7XG5cbiAgICAgIGRpc3RhbmNlID0gdmFsdWUgPT4ge1xuICAgICAgICBpZiAoIWlzSW5kZXhhYmxlKHZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRpc3RhbmNlQ29vcmRpbmF0ZVBhaXJzKHBvaW50LCB2YWx1ZSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBicmFuY2hlZFZhbHVlcyA9PiB7XG4gICAgICAvLyBUaGVyZSBtaWdodCBiZSBtdWx0aXBsZSBwb2ludHMgaW4gdGhlIGRvY3VtZW50IHRoYXQgbWF0Y2ggdGhlIGdpdmVuXG4gICAgICAvLyBmaWVsZC4gT25seSBvbmUgb2YgdGhlbSBuZWVkcyB0byBiZSB3aXRoaW4gJG1heERpc3RhbmNlLCBidXQgd2UgbmVlZCB0b1xuICAgICAgLy8gZXZhbHVhdGUgYWxsIG9mIHRoZW0gYW5kIHVzZSB0aGUgbmVhcmVzdCBvbmUgZm9yIHRoZSBpbXBsaWNpdCBzb3J0XG4gICAgICAvLyBzcGVjaWZpZXIuIChUaGF0J3Mgd2h5IHdlIGNhbid0IGp1c3QgdXNlIEVMRU1FTlRfT1BFUkFUT1JTIGhlcmUuKVxuICAgICAgLy9cbiAgICAgIC8vIE5vdGU6IFRoaXMgZGlmZmVycyBmcm9tIE1vbmdvREIncyBpbXBsZW1lbnRhdGlvbiwgd2hlcmUgYSBkb2N1bWVudCB3aWxsXG4gICAgICAvLyBhY3R1YWxseSBzaG93IHVwICptdWx0aXBsZSB0aW1lcyogaW4gdGhlIHJlc3VsdCBzZXQsIHdpdGggb25lIGVudHJ5IGZvclxuICAgICAgLy8gZWFjaCB3aXRoaW4tJG1heERpc3RhbmNlIGJyYW5jaGluZyBwb2ludC5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IHtyZXN1bHQ6IGZhbHNlfTtcbiAgICAgIGV4cGFuZEFycmF5c0luQnJhbmNoZXMoYnJhbmNoZWRWYWx1ZXMpLmV2ZXJ5KGJyYW5jaCA9PiB7XG4gICAgICAgIC8vIGlmIG9wZXJhdGlvbiBpcyBhbiB1cGRhdGUsIGRvbid0IHNraXAgYnJhbmNoZXMsIGp1c3QgcmV0dXJuIHRoZSBmaXJzdFxuICAgICAgICAvLyBvbmUgKCMzNTk5KVxuICAgICAgICBsZXQgY3VyRGlzdGFuY2U7XG4gICAgICAgIGlmICghbWF0Y2hlci5faXNVcGRhdGUpIHtcbiAgICAgICAgICBpZiAoISh0eXBlb2YgYnJhbmNoLnZhbHVlID09PSAnb2JqZWN0JykpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGN1ckRpc3RhbmNlID0gZGlzdGFuY2UoYnJhbmNoLnZhbHVlKTtcblxuICAgICAgICAgIC8vIFNraXAgYnJhbmNoZXMgdGhhdCBhcmVuJ3QgcmVhbCBwb2ludHMgb3IgYXJlIHRvbyBmYXIgYXdheS5cbiAgICAgICAgICBpZiAoY3VyRGlzdGFuY2UgPT09IG51bGwgfHwgY3VyRGlzdGFuY2UgPiBtYXhEaXN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2tpcCBhbnl0aGluZyB0aGF0J3MgYSB0aWUuXG4gICAgICAgICAgaWYgKHJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkICYmIHJlc3VsdC5kaXN0YW5jZSA8PSBjdXJEaXN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0LnJlc3VsdCA9IHRydWU7XG4gICAgICAgIHJlc3VsdC5kaXN0YW5jZSA9IGN1ckRpc3RhbmNlO1xuXG4gICAgICAgIGlmIChicmFuY2guYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgICAgcmVzdWx0LmFycmF5SW5kaWNlcyA9IGJyYW5jaC5hcnJheUluZGljZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHJlc3VsdC5hcnJheUluZGljZXM7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gIW1hdGNoZXIuX2lzVXBkYXRlO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfSxcbn07XG5cbi8vIE5COiBXZSBhcmUgY2hlYXRpbmcgYW5kIHVzaW5nIHRoaXMgZnVuY3Rpb24gdG8gaW1wbGVtZW50ICdBTkQnIGZvciBib3RoXG4vLyAnZG9jdW1lbnQgbWF0Y2hlcnMnIGFuZCAnYnJhbmNoZWQgbWF0Y2hlcnMnLiBUaGV5IGJvdGggcmV0dXJuIHJlc3VsdCBvYmplY3RzXG4vLyBidXQgdGhlIGFyZ3VtZW50IGlzIGRpZmZlcmVudDogZm9yIHRoZSBmb3JtZXIgaXQncyBhIHdob2xlIGRvYywgd2hlcmVhcyBmb3Jcbi8vIHRoZSBsYXR0ZXIgaXQncyBhbiBhcnJheSBvZiAnYnJhbmNoZWQgdmFsdWVzJy5cbmZ1bmN0aW9uIGFuZFNvbWVNYXRjaGVycyhzdWJNYXRjaGVycykge1xuICBpZiAoc3ViTWF0Y2hlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGV2ZXJ5dGhpbmdNYXRjaGVyO1xuICB9XG5cbiAgaWYgKHN1Yk1hdGNoZXJzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBzdWJNYXRjaGVyc1swXTtcbiAgfVxuXG4gIHJldHVybiBkb2NPckJyYW5jaGVzID0+IHtcbiAgICBjb25zdCBtYXRjaCA9IHt9O1xuICAgIG1hdGNoLnJlc3VsdCA9IHN1Yk1hdGNoZXJzLmV2ZXJ5KGZuID0+IHtcbiAgICAgIGNvbnN0IHN1YlJlc3VsdCA9IGZuKGRvY09yQnJhbmNoZXMpO1xuXG4gICAgICAvLyBDb3B5IGEgJ2Rpc3RhbmNlJyBudW1iZXIgb3V0IG9mIHRoZSBmaXJzdCBzdWItbWF0Y2hlciB0aGF0IGhhc1xuICAgICAgLy8gb25lLiBZZXMsIHRoaXMgbWVhbnMgdGhhdCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgJG5lYXIgZmllbGRzIGluIGFcbiAgICAgIC8vIHF1ZXJ5LCBzb21ldGhpbmcgYXJiaXRyYXJ5IGhhcHBlbnM7IHRoaXMgYXBwZWFycyB0byBiZSBjb25zaXN0ZW50IHdpdGhcbiAgICAgIC8vIE1vbmdvLlxuICAgICAgaWYgKHN1YlJlc3VsdC5yZXN1bHQgJiZcbiAgICAgICAgICBzdWJSZXN1bHQuZGlzdGFuY2UgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIG1hdGNoLmRpc3RhbmNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbWF0Y2guZGlzdGFuY2UgPSBzdWJSZXN1bHQuZGlzdGFuY2U7XG4gICAgICB9XG5cbiAgICAgIC8vIFNpbWlsYXJseSwgcHJvcGFnYXRlIGFycmF5SW5kaWNlcyBmcm9tIHN1Yi1tYXRjaGVycy4uLiBidXQgdG8gbWF0Y2hcbiAgICAgIC8vIE1vbmdvREIgYmVoYXZpb3IsIHRoaXMgdGltZSB0aGUgKmxhc3QqIHN1Yi1tYXRjaGVyIHdpdGggYXJyYXlJbmRpY2VzXG4gICAgICAvLyB3aW5zLlxuICAgICAgaWYgKHN1YlJlc3VsdC5yZXN1bHQgJiYgc3ViUmVzdWx0LmFycmF5SW5kaWNlcykge1xuICAgICAgICBtYXRjaC5hcnJheUluZGljZXMgPSBzdWJSZXN1bHQuYXJyYXlJbmRpY2VzO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3ViUmVzdWx0LnJlc3VsdDtcbiAgICB9KTtcblxuICAgIC8vIElmIHdlIGRpZG4ndCBhY3R1YWxseSBtYXRjaCwgZm9yZ2V0IGFueSBleHRyYSBtZXRhZGF0YSB3ZSBjYW1lIHVwIHdpdGguXG4gICAgaWYgKCFtYXRjaC5yZXN1bHQpIHtcbiAgICAgIGRlbGV0ZSBtYXRjaC5kaXN0YW5jZTtcbiAgICAgIGRlbGV0ZSBtYXRjaC5hcnJheUluZGljZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hdGNoO1xuICB9O1xufVxuXG5jb25zdCBhbmREb2N1bWVudE1hdGNoZXJzID0gYW5kU29tZU1hdGNoZXJzO1xuY29uc3QgYW5kQnJhbmNoZWRNYXRjaGVycyA9IGFuZFNvbWVNYXRjaGVycztcblxuZnVuY3Rpb24gY29tcGlsZUFycmF5T2ZEb2N1bWVudFNlbGVjdG9ycyhzZWxlY3RvcnMsIG1hdGNoZXIsIGluRWxlbU1hdGNoKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShzZWxlY3RvcnMpIHx8IHNlbGVjdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBFcnJvcignJGFuZC8kb3IvJG5vciBtdXN0IGJlIG5vbmVtcHR5IGFycmF5Jyk7XG4gIH1cblxuICByZXR1cm4gc2VsZWN0b3JzLm1hcChzdWJTZWxlY3RvciA9PiB7XG4gICAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3Qoc3ViU2VsZWN0b3IpKSB7XG4gICAgICB0aHJvdyBFcnJvcignJG9yLyRhbmQvJG5vciBlbnRyaWVzIG5lZWQgdG8gYmUgZnVsbCBvYmplY3RzJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCB7aW5FbGVtTWF0Y2h9KTtcbiAgfSk7XG59XG5cbi8vIFRha2VzIGluIGEgc2VsZWN0b3IgdGhhdCBjb3VsZCBtYXRjaCBhIGZ1bGwgZG9jdW1lbnQgKGVnLCB0aGUgb3JpZ2luYWxcbi8vIHNlbGVjdG9yKS4gUmV0dXJucyBhIGZ1bmN0aW9uIG1hcHBpbmcgZG9jdW1lbnQtPnJlc3VsdCBvYmplY3QuXG4vL1xuLy8gbWF0Y2hlciBpcyB0aGUgTWF0Y2hlciBvYmplY3Qgd2UgYXJlIGNvbXBpbGluZy5cbi8vXG4vLyBJZiB0aGlzIGlzIHRoZSByb290IGRvY3VtZW50IHNlbGVjdG9yIChpZSwgbm90IHdyYXBwZWQgaW4gJGFuZCBvciB0aGUgbGlrZSksXG4vLyB0aGVuIGlzUm9vdCBpcyB0cnVlLiAoVGhpcyBpcyB1c2VkIGJ5ICRuZWFyLilcbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlRG9jdW1lbnRTZWxlY3Rvcihkb2NTZWxlY3RvciwgbWF0Y2hlciwgb3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IGRvY01hdGNoZXJzID0gT2JqZWN0LmtleXMoZG9jU2VsZWN0b3IpLm1hcChrZXkgPT4ge1xuICAgIGNvbnN0IHN1YlNlbGVjdG9yID0gZG9jU2VsZWN0b3Jba2V5XTtcblxuICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgIC8vIE91dGVyIG9wZXJhdG9ycyBhcmUgZWl0aGVyIGxvZ2ljYWwgb3BlcmF0b3JzICh0aGV5IHJlY3Vyc2UgYmFjayBpbnRvXG4gICAgICAvLyB0aGlzIGZ1bmN0aW9uKSwgb3IgJHdoZXJlLlxuICAgICAgaWYgKCFoYXNPd24uY2FsbChMT0dJQ0FMX09QRVJBVE9SUywga2V5KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBsb2dpY2FsIG9wZXJhdG9yOiAke2tleX1gKTtcbiAgICAgIH1cblxuICAgICAgbWF0Y2hlci5faXNTaW1wbGUgPSBmYWxzZTtcbiAgICAgIHJldHVybiBMT0dJQ0FMX09QRVJBVE9SU1trZXldKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBvcHRpb25zLmluRWxlbU1hdGNoKTtcbiAgICB9XG5cbiAgICAvLyBSZWNvcmQgdGhpcyBwYXRoLCBidXQgb25seSBpZiB3ZSBhcmVuJ3QgaW4gYW4gZWxlbU1hdGNoZXIsIHNpbmNlIGluIGFuXG4gICAgLy8gZWxlbU1hdGNoIHRoaXMgaXMgYSBwYXRoIGluc2lkZSBhbiBvYmplY3QgaW4gYW4gYXJyYXksIG5vdCBpbiB0aGUgZG9jXG4gICAgLy8gcm9vdC5cbiAgICBpZiAoIW9wdGlvbnMuaW5FbGVtTWF0Y2gpIHtcbiAgICAgIG1hdGNoZXIuX3JlY29yZFBhdGhVc2VkKGtleSk7XG4gICAgfVxuXG4gICAgLy8gRG9uJ3QgYWRkIGEgbWF0Y2hlciBpZiBzdWJTZWxlY3RvciBpcyBhIGZ1bmN0aW9uIC0tIHRoaXMgaXMgdG8gbWF0Y2hcbiAgICAvLyB0aGUgYmVoYXZpb3Igb2YgTWV0ZW9yIG9uIHRoZSBzZXJ2ZXIgKGluaGVyaXRlZCBmcm9tIHRoZSBub2RlIG1vbmdvZGJcbiAgICAvLyBkcml2ZXIpLCB3aGljaCBpcyB0byBpZ25vcmUgYW55IHBhcnQgb2YgYSBzZWxlY3RvciB3aGljaCBpcyBhIGZ1bmN0aW9uLlxuICAgIGlmICh0eXBlb2Ygc3ViU2VsZWN0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgbG9va1VwQnlJbmRleCA9IG1ha2VMb29rdXBGdW5jdGlvbihrZXkpO1xuICAgIGNvbnN0IHZhbHVlTWF0Y2hlciA9IGNvbXBpbGVWYWx1ZVNlbGVjdG9yKFxuICAgICAgc3ViU2VsZWN0b3IsXG4gICAgICBtYXRjaGVyLFxuICAgICAgb3B0aW9ucy5pc1Jvb3RcbiAgICApO1xuXG4gICAgcmV0dXJuIGRvYyA9PiB2YWx1ZU1hdGNoZXIobG9va1VwQnlJbmRleChkb2MpKTtcbiAgfSkuZmlsdGVyKEJvb2xlYW4pO1xuXG4gIHJldHVybiBhbmREb2N1bWVudE1hdGNoZXJzKGRvY01hdGNoZXJzKTtcbn1cblxuLy8gVGFrZXMgaW4gYSBzZWxlY3RvciB0aGF0IGNvdWxkIG1hdGNoIGEga2V5LWluZGV4ZWQgdmFsdWUgaW4gYSBkb2N1bWVudDsgZWcsXG4vLyB7JGd0OiA1LCAkbHQ6IDl9LCBvciBhIHJlZ3VsYXIgZXhwcmVzc2lvbiwgb3IgYW55IG5vbi1leHByZXNzaW9uIG9iamVjdCAodG9cbi8vIGluZGljYXRlIGVxdWFsaXR5KS4gIFJldHVybnMgYSBicmFuY2hlZCBtYXRjaGVyOiBhIGZ1bmN0aW9uIG1hcHBpbmdcbi8vIFticmFuY2hlZCB2YWx1ZV0tPnJlc3VsdCBvYmplY3QuXG5mdW5jdGlvbiBjb21waWxlVmFsdWVTZWxlY3Rvcih2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpIHtcbiAgaWYgKHZhbHVlU2VsZWN0b3IgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICBtYXRjaGVyLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgIHJldHVybiBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKHZhbHVlU2VsZWN0b3IpXG4gICAgKTtcbiAgfVxuXG4gIGlmIChpc09wZXJhdG9yT2JqZWN0KHZhbHVlU2VsZWN0b3IpKSB7XG4gICAgcmV0dXJuIG9wZXJhdG9yQnJhbmNoZWRNYXRjaGVyKHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIsIGlzUm9vdCk7XG4gIH1cblxuICByZXR1cm4gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoXG4gICAgZXF1YWxpdHlFbGVtZW50TWF0Y2hlcih2YWx1ZVNlbGVjdG9yKVxuICApO1xufVxuXG4vLyBHaXZlbiBhbiBlbGVtZW50IG1hdGNoZXIgKHdoaWNoIGV2YWx1YXRlcyBhIHNpbmdsZSB2YWx1ZSksIHJldHVybnMgYSBicmFuY2hlZFxuLy8gdmFsdWUgKHdoaWNoIGV2YWx1YXRlcyB0aGUgZWxlbWVudCBtYXRjaGVyIG9uIGFsbCB0aGUgYnJhbmNoZXMgYW5kIHJldHVybnMgYVxuLy8gbW9yZSBzdHJ1Y3R1cmVkIHJldHVybiB2YWx1ZSBwb3NzaWJseSBpbmNsdWRpbmcgYXJyYXlJbmRpY2VzKS5cbmZ1bmN0aW9uIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKGVsZW1lbnRNYXRjaGVyLCBvcHRpb25zID0ge30pIHtcbiAgcmV0dXJuIGJyYW5jaGVzID0+IHtcbiAgICBjb25zdCBleHBhbmRlZCA9IG9wdGlvbnMuZG9udEV4cGFuZExlYWZBcnJheXNcbiAgICAgID8gYnJhbmNoZXNcbiAgICAgIDogZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyhicmFuY2hlcywgb3B0aW9ucy5kb250SW5jbHVkZUxlYWZBcnJheXMpO1xuXG4gICAgY29uc3QgbWF0Y2ggPSB7fTtcbiAgICBtYXRjaC5yZXN1bHQgPSBleHBhbmRlZC5zb21lKGVsZW1lbnQgPT4ge1xuICAgICAgbGV0IG1hdGNoZWQgPSBlbGVtZW50TWF0Y2hlcihlbGVtZW50LnZhbHVlKTtcblxuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciAkZWxlbU1hdGNoOiBpdCBtZWFucyBcInRydWUsIGFuZCB1c2UgdGhpcyBhcyBhbiBhcnJheVxuICAgICAgLy8gaW5kZXggaWYgSSBkaWRuJ3QgYWxyZWFkeSBoYXZlIG9uZVwiLlxuICAgICAgaWYgKHR5cGVvZiBtYXRjaGVkID09PSAnbnVtYmVyJykge1xuICAgICAgICAvLyBYWFggVGhpcyBjb2RlIGRhdGVzIGZyb20gd2hlbiB3ZSBvbmx5IHN0b3JlZCBhIHNpbmdsZSBhcnJheSBpbmRleFxuICAgICAgICAvLyAoZm9yIHRoZSBvdXRlcm1vc3QgYXJyYXkpLiBTaG91bGQgd2UgYmUgYWxzbyBpbmNsdWRpbmcgZGVlcGVyIGFycmF5XG4gICAgICAgIC8vIGluZGljZXMgZnJvbSB0aGUgJGVsZW1NYXRjaCBtYXRjaD9cbiAgICAgICAgaWYgKCFlbGVtZW50LmFycmF5SW5kaWNlcykge1xuICAgICAgICAgIGVsZW1lbnQuYXJyYXlJbmRpY2VzID0gW21hdGNoZWRdO1xuICAgICAgICB9XG5cbiAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHNvbWUgZWxlbWVudCBtYXRjaGVkLCBhbmQgaXQncyB0YWdnZWQgd2l0aCBhcnJheSBpbmRpY2VzLCBpbmNsdWRlXG4gICAgICAvLyB0aG9zZSBpbmRpY2VzIGluIG91ciByZXN1bHQgb2JqZWN0LlxuICAgICAgaWYgKG1hdGNoZWQgJiYgZWxlbWVudC5hcnJheUluZGljZXMpIHtcbiAgICAgICAgbWF0Y2guYXJyYXlJbmRpY2VzID0gZWxlbWVudC5hcnJheUluZGljZXM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtYXRjaGVkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1hdGNoO1xuICB9O1xufVxuXG4vLyBIZWxwZXJzIGZvciAkbmVhci5cbmZ1bmN0aW9uIGRpc3RhbmNlQ29vcmRpbmF0ZVBhaXJzKGEsIGIpIHtcbiAgY29uc3QgcG9pbnRBID0gcG9pbnRUb0FycmF5KGEpO1xuICBjb25zdCBwb2ludEIgPSBwb2ludFRvQXJyYXkoYik7XG5cbiAgcmV0dXJuIE1hdGguaHlwb3QocG9pbnRBWzBdIC0gcG9pbnRCWzBdLCBwb2ludEFbMV0gLSBwb2ludEJbMV0pO1xufVxuXG4vLyBUYWtlcyBzb21ldGhpbmcgdGhhdCBpcyBub3QgYW4gb3BlcmF0b3Igb2JqZWN0IGFuZCByZXR1cm5zIGFuIGVsZW1lbnQgbWF0Y2hlclxuLy8gZm9yIGVxdWFsaXR5IHdpdGggdGhhdCB0aGluZy5cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKGVsZW1lbnRTZWxlY3Rvcikge1xuICBpZiAoaXNPcGVyYXRvck9iamVjdChlbGVtZW50U2VsZWN0b3IpKSB7XG4gICAgdGhyb3cgRXJyb3IoJ0NhblxcJ3QgY3JlYXRlIGVxdWFsaXR5VmFsdWVTZWxlY3RvciBmb3Igb3BlcmF0b3Igb2JqZWN0Jyk7XG4gIH1cblxuICAvLyBTcGVjaWFsLWNhc2U6IG51bGwgYW5kIHVuZGVmaW5lZCBhcmUgZXF1YWwgKGlmIHlvdSBnb3QgdW5kZWZpbmVkIGluIHRoZXJlXG4gIC8vIHNvbWV3aGVyZSwgb3IgaWYgeW91IGdvdCBpdCBkdWUgdG8gc29tZSBicmFuY2ggYmVpbmcgbm9uLWV4aXN0ZW50IGluIHRoZVxuICAvLyB3ZWlyZCBzcGVjaWFsIGNhc2UpLCBldmVuIHRob3VnaCB0aGV5IGFyZW4ndCB3aXRoIEVKU09OLmVxdWFscy5cbiAgLy8gdW5kZWZpbmVkIG9yIG51bGxcbiAgaWYgKGVsZW1lbnRTZWxlY3RvciA9PSBudWxsKSB7XG4gICAgcmV0dXJuIHZhbHVlID0+IHZhbHVlID09IG51bGw7XG4gIH1cblxuICByZXR1cm4gdmFsdWUgPT4gTG9jYWxDb2xsZWN0aW9uLl9mLl9lcXVhbChlbGVtZW50U2VsZWN0b3IsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gZXZlcnl0aGluZ01hdGNoZXIoZG9jT3JCcmFuY2hlZFZhbHVlcykge1xuICByZXR1cm4ge3Jlc3VsdDogdHJ1ZX07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHBhbmRBcnJheXNJbkJyYW5jaGVzKGJyYW5jaGVzLCBza2lwVGhlQXJyYXlzKSB7XG4gIGNvbnN0IGJyYW5jaGVzT3V0ID0gW107XG5cbiAgYnJhbmNoZXMuZm9yRWFjaChicmFuY2ggPT4ge1xuICAgIGNvbnN0IHRoaXNJc0FycmF5ID0gQXJyYXkuaXNBcnJheShicmFuY2gudmFsdWUpO1xuXG4gICAgLy8gV2UgaW5jbHVkZSB0aGUgYnJhbmNoIGl0c2VsZiwgKlVOTEVTUyogd2UgaXQncyBhbiBhcnJheSB0aGF0IHdlJ3JlIGdvaW5nXG4gICAgLy8gdG8gaXRlcmF0ZSBhbmQgd2UncmUgdG9sZCB0byBza2lwIGFycmF5cy4gIChUaGF0J3MgcmlnaHQsIHdlIGluY2x1ZGUgc29tZVxuICAgIC8vIGFycmF5cyBldmVuIHNraXBUaGVBcnJheXMgaXMgdHJ1ZTogdGhlc2UgYXJlIGFycmF5cyB0aGF0IHdlcmUgZm91bmQgdmlhXG4gICAgLy8gZXhwbGljaXQgbnVtZXJpY2FsIGluZGljZXMuKVxuICAgIGlmICghKHNraXBUaGVBcnJheXMgJiYgdGhpc0lzQXJyYXkgJiYgIWJyYW5jaC5kb250SXRlcmF0ZSkpIHtcbiAgICAgIGJyYW5jaGVzT3V0LnB1c2goe2FycmF5SW5kaWNlczogYnJhbmNoLmFycmF5SW5kaWNlcywgdmFsdWU6IGJyYW5jaC52YWx1ZX0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzSXNBcnJheSAmJiAhYnJhbmNoLmRvbnRJdGVyYXRlKSB7XG4gICAgICBicmFuY2gudmFsdWUuZm9yRWFjaCgodmFsdWUsIGkpID0+IHtcbiAgICAgICAgYnJhbmNoZXNPdXQucHVzaCh7XG4gICAgICAgICAgYXJyYXlJbmRpY2VzOiAoYnJhbmNoLmFycmF5SW5kaWNlcyB8fCBbXSkuY29uY2F0KGkpLFxuICAgICAgICAgIHZhbHVlXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gYnJhbmNoZXNPdXQ7XG59XG5cbi8vIEhlbHBlcnMgZm9yICRiaXRzQWxsU2V0LyRiaXRzQW55U2V0LyRiaXRzQWxsQ2xlYXIvJGJpdHNBbnlDbGVhci5cbmZ1bmN0aW9uIGdldE9wZXJhbmRCaXRtYXNrKG9wZXJhbmQsIHNlbGVjdG9yKSB7XG4gIC8vIG51bWVyaWMgYml0bWFza1xuICAvLyBZb3UgY2FuIHByb3ZpZGUgYSBudW1lcmljIGJpdG1hc2sgdG8gYmUgbWF0Y2hlZCBhZ2FpbnN0IHRoZSBvcGVyYW5kIGZpZWxkLlxuICAvLyBJdCBtdXN0IGJlIHJlcHJlc2VudGFibGUgYXMgYSBub24tbmVnYXRpdmUgMzItYml0IHNpZ25lZCBpbnRlZ2VyLlxuICAvLyBPdGhlcndpc2UsICRiaXRzQWxsU2V0IHdpbGwgcmV0dXJuIGFuIGVycm9yLlxuICBpZiAoTnVtYmVyLmlzSW50ZWdlcihvcGVyYW5kKSAmJiBvcGVyYW5kID49IDApIHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobmV3IEludDMyQXJyYXkoW29wZXJhbmRdKS5idWZmZXIpO1xuICB9XG5cbiAgLy8gYmluZGF0YSBiaXRtYXNrXG4gIC8vIFlvdSBjYW4gYWxzbyB1c2UgYW4gYXJiaXRyYXJpbHkgbGFyZ2UgQmluRGF0YSBpbnN0YW5jZSBhcyBhIGJpdG1hc2suXG4gIGlmIChFSlNPTi5pc0JpbmFyeShvcGVyYW5kKSkge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShvcGVyYW5kLmJ1ZmZlcik7XG4gIH1cblxuICAvLyBwb3NpdGlvbiBsaXN0XG4gIC8vIElmIHF1ZXJ5aW5nIGEgbGlzdCBvZiBiaXQgcG9zaXRpb25zLCBlYWNoIDxwb3NpdGlvbj4gbXVzdCBiZSBhIG5vbi1uZWdhdGl2ZVxuICAvLyBpbnRlZ2VyLiBCaXQgcG9zaXRpb25zIHN0YXJ0IGF0IDAgZnJvbSB0aGUgbGVhc3Qgc2lnbmlmaWNhbnQgYml0LlxuICBpZiAoQXJyYXkuaXNBcnJheShvcGVyYW5kKSAmJlxuICAgICAgb3BlcmFuZC5ldmVyeSh4ID0+IE51bWJlci5pc0ludGVnZXIoeCkgJiYgeCA+PSAwKSkge1xuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigoTWF0aC5tYXgoLi4ub3BlcmFuZCkgPj4gMykgKyAxKTtcbiAgICBjb25zdCB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcblxuICAgIG9wZXJhbmQuZm9yRWFjaCh4ID0+IHtcbiAgICAgIHZpZXdbeCA+PiAzXSB8PSAxIDw8ICh4ICYgMHg3KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB2aWV3O1xuICB9XG5cbiAgLy8gYmFkIG9wZXJhbmRcbiAgdGhyb3cgRXJyb3IoXG4gICAgYG9wZXJhbmQgdG8gJHtzZWxlY3Rvcn0gbXVzdCBiZSBhIG51bWVyaWMgYml0bWFzayAocmVwcmVzZW50YWJsZSBhcyBhIGAgK1xuICAgICdub24tbmVnYXRpdmUgMzItYml0IHNpZ25lZCBpbnRlZ2VyKSwgYSBiaW5kYXRhIGJpdG1hc2sgb3IgYW4gYXJyYXkgd2l0aCAnICtcbiAgICAnYml0IHBvc2l0aW9ucyAobm9uLW5lZ2F0aXZlIGludGVnZXJzKSdcbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2V0VmFsdWVCaXRtYXNrKHZhbHVlLCBsZW5ndGgpIHtcbiAgLy8gVGhlIGZpZWxkIHZhbHVlIG11c3QgYmUgZWl0aGVyIG51bWVyaWNhbCBvciBhIEJpbkRhdGEgaW5zdGFuY2UuIE90aGVyd2lzZSxcbiAgLy8gJGJpdHMuLi4gd2lsbCBub3QgbWF0Y2ggdGhlIGN1cnJlbnQgZG9jdW1lbnQuXG5cbiAgLy8gbnVtZXJpY2FsXG4gIGlmIChOdW1iZXIuaXNTYWZlSW50ZWdlcih2YWx1ZSkpIHtcbiAgICAvLyAkYml0cy4uLiB3aWxsIG5vdCBtYXRjaCBudW1lcmljYWwgdmFsdWVzIHRoYXQgY2Fubm90IGJlIHJlcHJlc2VudGVkIGFzIGFcbiAgICAvLyBzaWduZWQgNjQtYml0IGludGVnZXIuIFRoaXMgY2FuIGJlIHRoZSBjYXNlIGlmIGEgdmFsdWUgaXMgZWl0aGVyIHRvb1xuICAgIC8vIGxhcmdlIG9yIHNtYWxsIHRvIGZpdCBpbiBhIHNpZ25lZCA2NC1iaXQgaW50ZWdlciwgb3IgaWYgaXQgaGFzIGFcbiAgICAvLyBmcmFjdGlvbmFsIGNvbXBvbmVudC5cbiAgICBjb25zdCBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoXG4gICAgICBNYXRoLm1heChsZW5ndGgsIDIgKiBVaW50MzJBcnJheS5CWVRFU19QRVJfRUxFTUVOVClcbiAgICApO1xuXG4gICAgbGV0IHZpZXcgPSBuZXcgVWludDMyQXJyYXkoYnVmZmVyLCAwLCAyKTtcbiAgICB2aWV3WzBdID0gdmFsdWUgJSAoKDEgPDwgMTYpICogKDEgPDwgMTYpKSB8IDA7XG4gICAgdmlld1sxXSA9IHZhbHVlIC8gKCgxIDw8IDE2KSAqICgxIDw8IDE2KSkgfCAwO1xuXG4gICAgLy8gc2lnbiBleHRlbnNpb25cbiAgICBpZiAodmFsdWUgPCAwKSB7XG4gICAgICB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCAyKTtcbiAgICAgIHZpZXcuZm9yRWFjaCgoYnl0ZSwgaSkgPT4ge1xuICAgICAgICB2aWV3W2ldID0gMHhmZjtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICB9XG5cbiAgLy8gYmluZGF0YVxuICBpZiAoRUpTT04uaXNCaW5hcnkodmFsdWUpKSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KHZhbHVlLmJ1ZmZlcik7XG4gIH1cblxuICAvLyBubyBtYXRjaFxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIEFjdHVhbGx5IGluc2VydHMgYSBrZXkgdmFsdWUgaW50byB0aGUgc2VsZWN0b3IgZG9jdW1lbnRcbi8vIEhvd2V2ZXIsIHRoaXMgY2hlY2tzIHRoZXJlIGlzIG5vIGFtYmlndWl0eSBpbiBzZXR0aW5nXG4vLyB0aGUgdmFsdWUgZm9yIHRoZSBnaXZlbiBrZXksIHRocm93cyBvdGhlcndpc2VcbmZ1bmN0aW9uIGluc2VydEludG9Eb2N1bWVudChkb2N1bWVudCwga2V5LCB2YWx1ZSkge1xuICBPYmplY3Qua2V5cyhkb2N1bWVudCkuZm9yRWFjaChleGlzdGluZ0tleSA9PiB7XG4gICAgaWYgKFxuICAgICAgKGV4aXN0aW5nS2V5Lmxlbmd0aCA+IGtleS5sZW5ndGggJiYgZXhpc3RpbmdLZXkuaW5kZXhPZihgJHtrZXl9LmApID09PSAwKSB8fFxuICAgICAgKGtleS5sZW5ndGggPiBleGlzdGluZ0tleS5sZW5ndGggJiYga2V5LmluZGV4T2YoYCR7ZXhpc3RpbmdLZXl9LmApID09PSAwKVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgY2Fubm90IGluZmVyIHF1ZXJ5IGZpZWxkcyB0byBzZXQsIGJvdGggcGF0aHMgJyR7ZXhpc3RpbmdLZXl9JyBhbmQgYCArXG4gICAgICAgIGAnJHtrZXl9JyBhcmUgbWF0Y2hlZGBcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmIChleGlzdGluZ0tleSA9PT0ga2V5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBjYW5ub3QgaW5mZXIgcXVlcnkgZmllbGRzIHRvIHNldCwgcGF0aCAnJHtrZXl9JyBpcyBtYXRjaGVkIHR3aWNlYFxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIGRvY3VtZW50W2tleV0gPSB2YWx1ZTtcbn1cblxuLy8gUmV0dXJucyBhIGJyYW5jaGVkIG1hdGNoZXIgdGhhdCBtYXRjaGVzIGlmZiB0aGUgZ2l2ZW4gbWF0Y2hlciBkb2VzIG5vdC5cbi8vIE5vdGUgdGhhdCB0aGlzIGltcGxpY2l0bHkgXCJkZU1vcmdhbml6ZXNcIiB0aGUgd3JhcHBlZCBmdW5jdGlvbi4gIGllLCBpdFxuLy8gbWVhbnMgdGhhdCBBTEwgYnJhbmNoIHZhbHVlcyBuZWVkIHRvIGZhaWwgdG8gbWF0Y2ggaW5uZXJCcmFuY2hlZE1hdGNoZXIuXG5mdW5jdGlvbiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoYnJhbmNoZWRNYXRjaGVyKSB7XG4gIHJldHVybiBicmFuY2hWYWx1ZXMgPT4ge1xuICAgIC8vIFdlIGV4cGxpY2l0bHkgY2hvb3NlIHRvIHN0cmlwIGFycmF5SW5kaWNlcyBoZXJlOiBpdCBkb2Vzbid0IG1ha2Ugc2Vuc2UgdG9cbiAgICAvLyBzYXkgXCJ1cGRhdGUgdGhlIGFycmF5IGVsZW1lbnQgdGhhdCBkb2VzIG5vdCBtYXRjaCBzb21ldGhpbmdcIiwgYXQgbGVhc3RcbiAgICAvLyBpbiBtb25nby1sYW5kLlxuICAgIHJldHVybiB7cmVzdWx0OiAhYnJhbmNoZWRNYXRjaGVyKGJyYW5jaFZhbHVlcykucmVzdWx0fTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kZXhhYmxlKG9iaikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShvYmopIHx8IExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChvYmopO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1lcmljS2V5KHMpIHtcbiAgcmV0dXJuIC9eWzAtOV0rJC8udGVzdChzKTtcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoaXMgaXMgYW4gb2JqZWN0IHdpdGggYXQgbGVhc3Qgb25lIGtleSBhbmQgYWxsIGtleXMgYmVnaW5cbi8vIHdpdGggJC4gIFVubGVzcyBpbmNvbnNpc3RlbnRPSyBpcyBzZXQsIHRocm93cyBpZiBzb21lIGtleXMgYmVnaW4gd2l0aCAkIGFuZFxuLy8gb3RoZXJzIGRvbid0LlxuZXhwb3J0IGZ1bmN0aW9uIGlzT3BlcmF0b3JPYmplY3QodmFsdWVTZWxlY3RvciwgaW5jb25zaXN0ZW50T0spIHtcbiAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QodmFsdWVTZWxlY3RvcikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsZXQgdGhlc2VBcmVPcGVyYXRvcnMgPSB1bmRlZmluZWQ7XG4gIE9iamVjdC5rZXlzKHZhbHVlU2VsZWN0b3IpLmZvckVhY2goc2VsS2V5ID0+IHtcbiAgICBjb25zdCB0aGlzSXNPcGVyYXRvciA9IHNlbEtleS5zdWJzdHIoMCwgMSkgPT09ICckJztcblxuICAgIGlmICh0aGVzZUFyZU9wZXJhdG9ycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGVzZUFyZU9wZXJhdG9ycyA9IHRoaXNJc09wZXJhdG9yO1xuICAgIH0gZWxzZSBpZiAodGhlc2VBcmVPcGVyYXRvcnMgIT09IHRoaXNJc09wZXJhdG9yKSB7XG4gICAgICBpZiAoIWluY29uc2lzdGVudE9LKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSW5jb25zaXN0ZW50IG9wZXJhdG9yOiAke0pTT04uc3RyaW5naWZ5KHZhbHVlU2VsZWN0b3IpfWBcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgdGhlc2VBcmVPcGVyYXRvcnMgPSBmYWxzZTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiAhIXRoZXNlQXJlT3BlcmF0b3JzOyAvLyB7fSBoYXMgbm8gb3BlcmF0b3JzXG59XG5cbi8vIEhlbHBlciBmb3IgJGx0LyRndC8kbHRlLyRndGUuXG5mdW5jdGlvbiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZUNvbXBhcmF0b3IpIHtcbiAgcmV0dXJuIHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIC8vIEFycmF5cyBuZXZlciBjb21wYXJlIGZhbHNlIHdpdGggbm9uLWFycmF5cyBmb3IgYW55IGluZXF1YWxpdHkuXG4gICAgICAvLyBYWFggVGhpcyB3YXMgYmVoYXZpb3Igd2Ugb2JzZXJ2ZWQgaW4gcHJlLXJlbGVhc2UgTW9uZ29EQiAyLjUsIGJ1dFxuICAgICAgLy8gICAgIGl0IHNlZW1zIHRvIGhhdmUgYmVlbiByZXZlcnRlZC5cbiAgICAgIC8vICAgICBTZWUgaHR0cHM6Ly9qaXJhLm1vbmdvZGIub3JnL2Jyb3dzZS9TRVJWRVItMTE0NDRcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG9wZXJhbmQpKSB7XG4gICAgICAgIHJldHVybiAoKSA9PiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gU3BlY2lhbCBjYXNlOiBjb25zaWRlciB1bmRlZmluZWQgYW5kIG51bGwgdGhlIHNhbWUgKHNvIHRydWUgd2l0aFxuICAgICAgLy8gJGd0ZS8kbHRlKS5cbiAgICAgIGlmIChvcGVyYW5kID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3BlcmFuZCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG9wZXJhbmRUeXBlID0gTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKG9wZXJhbmQpO1xuXG4gICAgICByZXR1cm4gdmFsdWUgPT4ge1xuICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXBhcmlzb25zIGFyZSBuZXZlciB0cnVlIGFtb25nIHRoaW5ncyBvZiBkaWZmZXJlbnQgdHlwZSAoZXhjZXB0XG4gICAgICAgIC8vIG51bGwgdnMgdW5kZWZpbmVkKS5cbiAgICAgICAgaWYgKExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZSh2YWx1ZSkgIT09IG9wZXJhbmRUeXBlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNtcFZhbHVlQ29tcGFyYXRvcihMb2NhbENvbGxlY3Rpb24uX2YuX2NtcCh2YWx1ZSwgb3BlcmFuZCkpO1xuICAgICAgfTtcbiAgICB9LFxuICB9O1xufVxuXG4vLyBtYWtlTG9va3VwRnVuY3Rpb24oa2V5KSByZXR1cm5zIGEgbG9va3VwIGZ1bmN0aW9uLlxuLy9cbi8vIEEgbG9va3VwIGZ1bmN0aW9uIHRha2VzIGluIGEgZG9jdW1lbnQgYW5kIHJldHVybnMgYW4gYXJyYXkgb2YgbWF0Y2hpbmdcbi8vIGJyYW5jaGVzLiAgSWYgbm8gYXJyYXlzIGFyZSBmb3VuZCB3aGlsZSBsb29raW5nIHVwIHRoZSBrZXksIHRoaXMgYXJyYXkgd2lsbFxuLy8gaGF2ZSBleGFjdGx5IG9uZSBicmFuY2hlcyAocG9zc2libHkgJ3VuZGVmaW5lZCcsIGlmIHNvbWUgc2VnbWVudCBvZiB0aGUga2V5XG4vLyB3YXMgbm90IGZvdW5kKS5cbi8vXG4vLyBJZiBhcnJheXMgYXJlIGZvdW5kIGluIHRoZSBtaWRkbGUsIHRoaXMgY2FuIGhhdmUgbW9yZSB0aGFuIG9uZSBlbGVtZW50LCBzaW5jZVxuLy8gd2UgJ2JyYW5jaCcuIFdoZW4gd2UgJ2JyYW5jaCcsIGlmIHRoZXJlIGFyZSBtb3JlIGtleSBzZWdtZW50cyB0byBsb29rIHVwLFxuLy8gdGhlbiB3ZSBvbmx5IHB1cnN1ZSBicmFuY2hlcyB0aGF0IGFyZSBwbGFpbiBvYmplY3RzIChub3QgYXJyYXlzIG9yIHNjYWxhcnMpLlxuLy8gVGhpcyBtZWFucyB3ZSBjYW4gYWN0dWFsbHkgZW5kIHVwIHdpdGggbm8gYnJhbmNoZXMhXG4vL1xuLy8gV2UgZG8gKk5PVCogYnJhbmNoIG9uIGFycmF5cyB0aGF0IGFyZSBmb3VuZCBhdCB0aGUgZW5kIChpZSwgYXQgdGhlIGxhc3Rcbi8vIGRvdHRlZCBtZW1iZXIgb2YgdGhlIGtleSkuIFdlIGp1c3QgcmV0dXJuIHRoYXQgYXJyYXk7IGlmIHlvdSB3YW50IHRvXG4vLyBlZmZlY3RpdmVseSAnYnJhbmNoJyBvdmVyIHRoZSBhcnJheSdzIHZhbHVlcywgcG9zdC1wcm9jZXNzIHRoZSBsb29rdXBcbi8vIGZ1bmN0aW9uIHdpdGggZXhwYW5kQXJyYXlzSW5CcmFuY2hlcy5cbi8vXG4vLyBFYWNoIGJyYW5jaCBpcyBhbiBvYmplY3Qgd2l0aCBrZXlzOlxuLy8gIC0gdmFsdWU6IHRoZSB2YWx1ZSBhdCB0aGUgYnJhbmNoXG4vLyAgLSBkb250SXRlcmF0ZTogYW4gb3B0aW9uYWwgYm9vbDsgaWYgdHJ1ZSwgaXQgbWVhbnMgdGhhdCAndmFsdWUnIGlzIGFuIGFycmF5XG4vLyAgICB0aGF0IGV4cGFuZEFycmF5c0luQnJhbmNoZXMgc2hvdWxkIE5PVCBleHBhbmQuIFRoaXMgc3BlY2lmaWNhbGx5IGhhcHBlbnNcbi8vICAgIHdoZW4gdGhlcmUgaXMgYSBudW1lcmljIGluZGV4IGluIHRoZSBrZXksIGFuZCBlbnN1cmVzIHRoZVxuLy8gICAgcGVyaGFwcy1zdXJwcmlzaW5nIE1vbmdvREIgYmVoYXZpb3Igd2hlcmUgeydhLjAnOiA1fSBkb2VzIE5PVFxuLy8gICAgbWF0Y2gge2E6IFtbNV1dfS5cbi8vICAtIGFycmF5SW5kaWNlczogaWYgYW55IGFycmF5IGluZGV4aW5nIHdhcyBkb25lIGR1cmluZyBsb29rdXAgKGVpdGhlciBkdWUgdG9cbi8vICAgIGV4cGxpY2l0IG51bWVyaWMgaW5kaWNlcyBvciBpbXBsaWNpdCBicmFuY2hpbmcpLCB0aGlzIHdpbGwgYmUgYW4gYXJyYXkgb2Zcbi8vICAgIHRoZSBhcnJheSBpbmRpY2VzIHVzZWQsIGZyb20gb3V0ZXJtb3N0IHRvIGlubmVybW9zdDsgaXQgaXMgZmFsc2V5IG9yXG4vLyAgICBhYnNlbnQgaWYgbm8gYXJyYXkgaW5kZXggaXMgdXNlZC4gSWYgYW4gZXhwbGljaXQgbnVtZXJpYyBpbmRleCBpcyB1c2VkLFxuLy8gICAgdGhlIGluZGV4IHdpbGwgYmUgZm9sbG93ZWQgaW4gYXJyYXlJbmRpY2VzIGJ5IHRoZSBzdHJpbmcgJ3gnLlxuLy9cbi8vICAgIE5vdGU6IGFycmF5SW5kaWNlcyBpcyB1c2VkIGZvciB0d28gcHVycG9zZXMuIEZpcnN0LCBpdCBpcyB1c2VkIHRvXG4vLyAgICBpbXBsZW1lbnQgdGhlICckJyBtb2RpZmllciBmZWF0dXJlLCB3aGljaCBvbmx5IGV2ZXIgbG9va3MgYXQgaXRzIGZpcnN0XG4vLyAgICBlbGVtZW50LlxuLy9cbi8vICAgIFNlY29uZCwgaXQgaXMgdXNlZCBmb3Igc29ydCBrZXkgZ2VuZXJhdGlvbiwgd2hpY2ggbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsXG4vLyAgICB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIGRpZmZlcmVudCBwYXRocy4gTW9yZW92ZXIsIGl0IG5lZWRzIHRvXG4vLyAgICBkaWZmZXJlbnRpYXRlIGJldHdlZW4gZXhwbGljaXQgYW5kIGltcGxpY2l0IGJyYW5jaGluZywgd2hpY2ggaXMgd2h5XG4vLyAgICB0aGVyZSdzIHRoZSBzb21ld2hhdCBoYWNreSAneCcgZW50cnk6IHRoaXMgbWVhbnMgdGhhdCBleHBsaWNpdCBhbmRcbi8vICAgIGltcGxpY2l0IGFycmF5IGxvb2t1cHMgd2lsbCBoYXZlIGRpZmZlcmVudCBmdWxsIGFycmF5SW5kaWNlcyBwYXRocy4gKFRoYXRcbi8vICAgIGNvZGUgb25seSByZXF1aXJlcyB0aGF0IGRpZmZlcmVudCBwYXRocyBoYXZlIGRpZmZlcmVudCBhcnJheUluZGljZXM7IGl0XG4vLyAgICBkb2Vzbid0IGFjdHVhbGx5ICdwYXJzZScgYXJyYXlJbmRpY2VzLiBBcyBhbiBhbHRlcm5hdGl2ZSwgYXJyYXlJbmRpY2VzXG4vLyAgICBjb3VsZCBjb250YWluIG9iamVjdHMgd2l0aCBmbGFncyBsaWtlICdpbXBsaWNpdCcsIGJ1dCBJIHRoaW5rIHRoYXQgb25seVxuLy8gICAgbWFrZXMgdGhlIGNvZGUgc3Vycm91bmRpbmcgdGhlbSBtb3JlIGNvbXBsZXguKVxuLy9cbi8vICAgIChCeSB0aGUgd2F5LCB0aGlzIGZpZWxkIGVuZHMgdXAgZ2V0dGluZyBwYXNzZWQgYXJvdW5kIGEgbG90IHdpdGhvdXRcbi8vICAgIGNsb25pbmcsIHNvIG5ldmVyIG11dGF0ZSBhbnkgYXJyYXlJbmRpY2VzIGZpZWxkL3ZhciBpbiB0aGlzIHBhY2thZ2UhKVxuLy9cbi8vXG4vLyBBdCB0aGUgdG9wIGxldmVsLCB5b3UgbWF5IG9ubHkgcGFzcyBpbiBhIHBsYWluIG9iamVjdCBvciBhcnJheS5cbi8vXG4vLyBTZWUgdGhlIHRlc3QgJ21pbmltb25nbyAtIGxvb2t1cCcgZm9yIHNvbWUgZXhhbXBsZXMgb2Ygd2hhdCBsb29rdXAgZnVuY3Rpb25zXG4vLyByZXR1cm4uXG5leHBvcnQgZnVuY3Rpb24gbWFrZUxvb2t1cEZ1bmN0aW9uKGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KCcuJyk7XG4gIGNvbnN0IGZpcnN0UGFydCA9IHBhcnRzLmxlbmd0aCA/IHBhcnRzWzBdIDogJyc7XG4gIGNvbnN0IGxvb2t1cFJlc3QgPSAoXG4gICAgcGFydHMubGVuZ3RoID4gMSAmJlxuICAgIG1ha2VMb29rdXBGdW5jdGlvbihwYXJ0cy5zbGljZSgxKS5qb2luKCcuJyksIG9wdGlvbnMpXG4gICk7XG5cbiAgY29uc3Qgb21pdFVubmVjZXNzYXJ5RmllbGRzID0gcmVzdWx0ID0+IHtcbiAgICBpZiAoIXJlc3VsdC5kb250SXRlcmF0ZSkge1xuICAgICAgZGVsZXRlIHJlc3VsdC5kb250SXRlcmF0ZTtcbiAgICB9XG5cbiAgICBpZiAocmVzdWx0LmFycmF5SW5kaWNlcyAmJiAhcmVzdWx0LmFycmF5SW5kaWNlcy5sZW5ndGgpIHtcbiAgICAgIGRlbGV0ZSByZXN1bHQuYXJyYXlJbmRpY2VzO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gRG9jIHdpbGwgYWx3YXlzIGJlIGEgcGxhaW4gb2JqZWN0IG9yIGFuIGFycmF5LlxuICAvLyBhcHBseSBhbiBleHBsaWNpdCBudW1lcmljIGluZGV4LCBhbiBhcnJheS5cbiAgcmV0dXJuIChkb2MsIGFycmF5SW5kaWNlcyA9IFtdKSA9PiB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZG9jKSkge1xuICAgICAgLy8gSWYgd2UncmUgYmVpbmcgYXNrZWQgdG8gZG8gYW4gaW52YWxpZCBsb29rdXAgaW50byBhbiBhcnJheSAobm9uLWludGVnZXJcbiAgICAgIC8vIG9yIG91dC1vZi1ib3VuZHMpLCByZXR1cm4gbm8gcmVzdWx0cyAod2hpY2ggaXMgZGlmZmVyZW50IGZyb20gcmV0dXJuaW5nXG4gICAgICAvLyBhIHNpbmdsZSB1bmRlZmluZWQgcmVzdWx0LCBpbiB0aGF0IGBudWxsYCBlcXVhbGl0eSBjaGVja3Mgd29uJ3QgbWF0Y2gpLlxuICAgICAgaWYgKCEoaXNOdW1lcmljS2V5KGZpcnN0UGFydCkgJiYgZmlyc3RQYXJ0IDwgZG9jLmxlbmd0aCkpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICAvLyBSZW1lbWJlciB0aGF0IHdlIHVzZWQgdGhpcyBhcnJheSBpbmRleC4gSW5jbHVkZSBhbiAneCcgdG8gaW5kaWNhdGUgdGhhdFxuICAgICAgLy8gdGhlIHByZXZpb3VzIGluZGV4IGNhbWUgZnJvbSBiZWluZyBjb25zaWRlcmVkIGFzIGFuIGV4cGxpY2l0IGFycmF5XG4gICAgICAvLyBpbmRleCAobm90IGJyYW5jaGluZykuXG4gICAgICBhcnJheUluZGljZXMgPSBhcnJheUluZGljZXMuY29uY2F0KCtmaXJzdFBhcnQsICd4Jyk7XG4gICAgfVxuXG4gICAgLy8gRG8gb3VyIGZpcnN0IGxvb2t1cC5cbiAgICBjb25zdCBmaXJzdExldmVsID0gZG9jW2ZpcnN0UGFydF07XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyBkZWVwZXIgdG8gZGlnLCByZXR1cm4gd2hhdCB3ZSBmb3VuZC5cbiAgICAvL1xuICAgIC8vIElmIHdoYXQgd2UgZm91bmQgaXMgYW4gYXJyYXksIG1vc3QgdmFsdWUgc2VsZWN0b3JzIHdpbGwgY2hvb3NlIHRvIHRyZWF0XG4gICAgLy8gdGhlIGVsZW1lbnRzIG9mIHRoZSBhcnJheSBhcyBtYXRjaGFibGUgdmFsdWVzIGluIHRoZWlyIG93biByaWdodCwgYnV0XG4gICAgLy8gdGhhdCdzIGRvbmUgb3V0c2lkZSBvZiB0aGUgbG9va3VwIGZ1bmN0aW9uLiAoRXhjZXB0aW9ucyB0byB0aGlzIGFyZSAkc2l6ZVxuICAgIC8vIGFuZCBzdHVmZiByZWxhdGluZyB0byAkZWxlbU1hdGNoLiAgZWcsIHthOiB7JHNpemU6IDJ9fSBkb2VzIG5vdCBtYXRjaCB7YTpcbiAgICAvLyBbWzEsIDJdXX0uKVxuICAgIC8vXG4gICAgLy8gVGhhdCBzYWlkLCBpZiB3ZSBqdXN0IGRpZCBhbiAqZXhwbGljaXQqIGFycmF5IGxvb2t1cCAob24gZG9jKSB0byBmaW5kXG4gICAgLy8gZmlyc3RMZXZlbCwgYW5kIGZpcnN0TGV2ZWwgaXMgYW4gYXJyYXkgdG9vLCB3ZSBkbyBOT1Qgd2FudCB2YWx1ZVxuICAgIC8vIHNlbGVjdG9ycyB0byBpdGVyYXRlIG92ZXIgaXQuICBlZywgeydhLjAnOiA1fSBkb2VzIG5vdCBtYXRjaCB7YTogW1s1XV19LlxuICAgIC8vIFNvIGluIHRoYXQgY2FzZSwgd2UgbWFyayB0aGUgcmV0dXJuIHZhbHVlIGFzICdkb24ndCBpdGVyYXRlJy5cbiAgICBpZiAoIWxvb2t1cFJlc3QpIHtcbiAgICAgIHJldHVybiBbb21pdFVubmVjZXNzYXJ5RmllbGRzKHtcbiAgICAgICAgYXJyYXlJbmRpY2VzLFxuICAgICAgICBkb250SXRlcmF0ZTogQXJyYXkuaXNBcnJheShkb2MpICYmIEFycmF5LmlzQXJyYXkoZmlyc3RMZXZlbCksXG4gICAgICAgIHZhbHVlOiBmaXJzdExldmVsXG4gICAgICB9KV07XG4gICAgfVxuXG4gICAgLy8gV2UgbmVlZCB0byBkaWcgZGVlcGVyLiAgQnV0IGlmIHdlIGNhbid0LCBiZWNhdXNlIHdoYXQgd2UndmUgZm91bmQgaXMgbm90XG4gICAgLy8gYW4gYXJyYXkgb3IgcGxhaW4gb2JqZWN0LCB3ZSdyZSBkb25lLiBJZiB3ZSBqdXN0IGRpZCBhIG51bWVyaWMgaW5kZXggaW50b1xuICAgIC8vIGFuIGFycmF5LCB3ZSByZXR1cm4gbm90aGluZyBoZXJlICh0aGlzIGlzIGEgY2hhbmdlIGluIE1vbmdvIDIuNSBmcm9tXG4gICAgLy8gTW9uZ28gMi40LCB3aGVyZSB7J2EuMC5iJzogbnVsbH0gc3RvcHBlZCBtYXRjaGluZyB7YTogWzVdfSkuIE90aGVyd2lzZSxcbiAgICAvLyByZXR1cm4gYSBzaW5nbGUgYHVuZGVmaW5lZGAgKHdoaWNoIGNhbiwgZm9yIGV4YW1wbGUsIG1hdGNoIHZpYSBlcXVhbGl0eVxuICAgIC8vIHdpdGggYG51bGxgKS5cbiAgICBpZiAoIWlzSW5kZXhhYmxlKGZpcnN0TGV2ZWwpKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShkb2MpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIFtvbWl0VW5uZWNlc3NhcnlGaWVsZHMoe2FycmF5SW5kaWNlcywgdmFsdWU6IHVuZGVmaW5lZH0pXTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBbXTtcbiAgICBjb25zdCBhcHBlbmRUb1Jlc3VsdCA9IG1vcmUgPT4ge1xuICAgICAgcmVzdWx0LnB1c2goLi4ubW9yZSk7XG4gICAgfTtcblxuICAgIC8vIERpZyBkZWVwZXI6IGxvb2sgdXAgdGhlIHJlc3Qgb2YgdGhlIHBhcnRzIG9uIHdoYXRldmVyIHdlJ3ZlIGZvdW5kLlxuICAgIC8vIChsb29rdXBSZXN0IGlzIHNtYXJ0IGVub3VnaCB0byBub3QgdHJ5IHRvIGRvIGludmFsaWQgbG9va3VwcyBpbnRvXG4gICAgLy8gZmlyc3RMZXZlbCBpZiBpdCdzIGFuIGFycmF5LilcbiAgICBhcHBlbmRUb1Jlc3VsdChsb29rdXBSZXN0KGZpcnN0TGV2ZWwsIGFycmF5SW5kaWNlcykpO1xuXG4gICAgLy8gSWYgd2UgZm91bmQgYW4gYXJyYXksIHRoZW4gaW4gKmFkZGl0aW9uKiB0byBwb3RlbnRpYWxseSB0cmVhdGluZyB0aGUgbmV4dFxuICAgIC8vIHBhcnQgYXMgYSBsaXRlcmFsIGludGVnZXIgbG9va3VwLCB3ZSBzaG91bGQgYWxzbyAnYnJhbmNoJzogdHJ5IHRvIGxvb2sgdXBcbiAgICAvLyB0aGUgcmVzdCBvZiB0aGUgcGFydHMgb24gZWFjaCBhcnJheSBlbGVtZW50IGluIHBhcmFsbGVsLlxuICAgIC8vXG4gICAgLy8gSW4gdGhpcyBjYXNlLCB3ZSAqb25seSogZGlnIGRlZXBlciBpbnRvIGFycmF5IGVsZW1lbnRzIHRoYXQgYXJlIHBsYWluXG4gICAgLy8gb2JqZWN0cy4gKFJlY2FsbCB0aGF0IHdlIG9ubHkgZ290IHRoaXMgZmFyIGlmIHdlIGhhdmUgZnVydGhlciB0byBkaWcuKVxuICAgIC8vIFRoaXMgbWFrZXMgc2Vuc2U6IHdlIGNlcnRhaW5seSBkb24ndCBkaWcgZGVlcGVyIGludG8gbm9uLWluZGV4YWJsZVxuICAgIC8vIG9iamVjdHMuIEFuZCBpdCB3b3VsZCBiZSB3ZWlyZCB0byBkaWcgaW50byBhbiBhcnJheTogaXQncyBzaW1wbGVyIHRvIGhhdmVcbiAgICAvLyBhIHJ1bGUgdGhhdCBleHBsaWNpdCBpbnRlZ2VyIGluZGV4ZXMgb25seSBhcHBseSB0byBhbiBvdXRlciBhcnJheSwgbm90IHRvXG4gICAgLy8gYW4gYXJyYXkgeW91IGZpbmQgYWZ0ZXIgYSBicmFuY2hpbmcgc2VhcmNoLlxuICAgIC8vXG4gICAgLy8gSW4gdGhlIHNwZWNpYWwgY2FzZSBvZiBhIG51bWVyaWMgcGFydCBpbiBhICpzb3J0IHNlbGVjdG9yKiAobm90IGEgcXVlcnlcbiAgICAvLyBzZWxlY3RvciksIHdlIHNraXAgdGhlIGJyYW5jaGluZzogd2UgT05MWSBhbGxvdyB0aGUgbnVtZXJpYyBwYXJ0IHRvIG1lYW5cbiAgICAvLyAnbG9vayB1cCB0aGlzIGluZGV4JyBpbiB0aGF0IGNhc2UsIG5vdCAnYWxzbyBsb29rIHVwIHRoaXMgaW5kZXggaW4gYWxsXG4gICAgLy8gdGhlIGVsZW1lbnRzIG9mIHRoZSBhcnJheScuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmlyc3RMZXZlbCkgJiZcbiAgICAgICAgIShpc051bWVyaWNLZXkocGFydHNbMV0pICYmIG9wdGlvbnMuZm9yU29ydCkpIHtcbiAgICAgIGZpcnN0TGV2ZWwuZm9yRWFjaCgoYnJhbmNoLCBhcnJheUluZGV4KSA9PiB7XG4gICAgICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QoYnJhbmNoKSkge1xuICAgICAgICAgIGFwcGVuZFRvUmVzdWx0KGxvb2t1cFJlc3QoYnJhbmNoLCBhcnJheUluZGljZXMuY29uY2F0KGFycmF5SW5kZXgpKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbi8vIE9iamVjdCBleHBvcnRlZCBvbmx5IGZvciB1bml0IHRlc3RpbmcuXG4vLyBVc2UgaXQgdG8gZXhwb3J0IHByaXZhdGUgZnVuY3Rpb25zIHRvIHRlc3QgaW4gVGlueXRlc3QuXG5NaW5pbW9uZ29UZXN0ID0ge21ha2VMb29rdXBGdW5jdGlvbn07XG5NaW5pbW9uZ29FcnJvciA9IChtZXNzYWdlLCBvcHRpb25zID0ge30pID0+IHtcbiAgaWYgKHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJyAmJiBvcHRpb25zLmZpZWxkKSB7XG4gICAgbWVzc2FnZSArPSBgIGZvciBmaWVsZCAnJHtvcHRpb25zLmZpZWxkfSdgO1xuICB9XG5cbiAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIGVycm9yLm5hbWUgPSAnTWluaW1vbmdvRXJyb3InO1xuICByZXR1cm4gZXJyb3I7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm90aGluZ01hdGNoZXIoZG9jT3JCcmFuY2hlZFZhbHVlcykge1xuICByZXR1cm4ge3Jlc3VsdDogZmFsc2V9O1xufVxuXG4vLyBUYWtlcyBhbiBvcGVyYXRvciBvYmplY3QgKGFuIG9iamVjdCB3aXRoICQga2V5cykgYW5kIHJldHVybnMgYSBicmFuY2hlZFxuLy8gbWF0Y2hlciBmb3IgaXQuXG5mdW5jdGlvbiBvcGVyYXRvckJyYW5jaGVkTWF0Y2hlcih2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpIHtcbiAgLy8gRWFjaCB2YWx1ZVNlbGVjdG9yIHdvcmtzIHNlcGFyYXRlbHkgb24gdGhlIHZhcmlvdXMgYnJhbmNoZXMuICBTbyBvbmVcbiAgLy8gb3BlcmF0b3IgY2FuIG1hdGNoIG9uZSBicmFuY2ggYW5kIGFub3RoZXIgY2FuIG1hdGNoIGFub3RoZXIgYnJhbmNoLiAgVGhpc1xuICAvLyBpcyBPSy5cbiAgY29uc3Qgb3BlcmF0b3JNYXRjaGVycyA9IE9iamVjdC5rZXlzKHZhbHVlU2VsZWN0b3IpLm1hcChvcGVyYXRvciA9PiB7XG4gICAgY29uc3Qgb3BlcmFuZCA9IHZhbHVlU2VsZWN0b3Jbb3BlcmF0b3JdO1xuXG4gICAgY29uc3Qgc2ltcGxlUmFuZ2UgPSAoXG4gICAgICBbJyRsdCcsICckbHRlJywgJyRndCcsICckZ3RlJ10uaW5jbHVkZXMob3BlcmF0b3IpICYmXG4gICAgICB0eXBlb2Ygb3BlcmFuZCA9PT0gJ251bWJlcidcbiAgICApO1xuXG4gICAgY29uc3Qgc2ltcGxlRXF1YWxpdHkgPSAoXG4gICAgICBbJyRuZScsICckZXEnXS5pbmNsdWRlcyhvcGVyYXRvcikgJiZcbiAgICAgIG9wZXJhbmQgIT09IE9iamVjdChvcGVyYW5kKVxuICAgICk7XG5cbiAgICBjb25zdCBzaW1wbGVJbmNsdXNpb24gPSAoXG4gICAgICBbJyRpbicsICckbmluJ10uaW5jbHVkZXMob3BlcmF0b3IpXG4gICAgICAmJiBBcnJheS5pc0FycmF5KG9wZXJhbmQpXG4gICAgICAmJiAhb3BlcmFuZC5zb21lKHggPT4geCA9PT0gT2JqZWN0KHgpKVxuICAgICk7XG5cbiAgICBpZiAoIShzaW1wbGVSYW5nZSB8fCBzaW1wbGVJbmNsdXNpb24gfHwgc2ltcGxlRXF1YWxpdHkpKSB7XG4gICAgICBtYXRjaGVyLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChoYXNPd24uY2FsbChWQUxVRV9PUEVSQVRPUlMsIG9wZXJhdG9yKSkge1xuICAgICAgcmV0dXJuIFZBTFVFX09QRVJBVE9SU1tvcGVyYXRvcl0ob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlciwgaXNSb290KTtcbiAgICB9XG5cbiAgICBpZiAoaGFzT3duLmNhbGwoRUxFTUVOVF9PUEVSQVRPUlMsIG9wZXJhdG9yKSkge1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IEVMRU1FTlRfT1BFUkFUT1JTW29wZXJhdG9yXTtcbiAgICAgIHJldHVybiBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgICAgb3B0aW9ucy5jb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIpLFxuICAgICAgICBvcHRpb25zXG4gICAgICApO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIG9wZXJhdG9yOiAke29wZXJhdG9yfWApO1xuICB9KTtcblxuICByZXR1cm4gYW5kQnJhbmNoZWRNYXRjaGVycyhvcGVyYXRvck1hdGNoZXJzKTtcbn1cblxuLy8gcGF0aHMgLSBBcnJheTogbGlzdCBvZiBtb25nbyBzdHlsZSBwYXRoc1xuLy8gbmV3TGVhZkZuIC0gRnVuY3Rpb246IG9mIGZvcm0gZnVuY3Rpb24ocGF0aCkgc2hvdWxkIHJldHVybiBhIHNjYWxhciB2YWx1ZSB0b1xuLy8gICAgICAgICAgICAgICAgICAgICAgIHB1dCBpbnRvIGxpc3QgY3JlYXRlZCBmb3IgdGhhdCBwYXRoXG4vLyBjb25mbGljdEZuIC0gRnVuY3Rpb246IG9mIGZvcm0gZnVuY3Rpb24obm9kZSwgcGF0aCwgZnVsbFBhdGgpIGlzIGNhbGxlZFxuLy8gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIGJ1aWxkaW5nIGEgdHJlZSBwYXRoIGZvciAnZnVsbFBhdGgnIG5vZGUgb25cbi8vICAgICAgICAgICAgICAgICAgICAgICAgJ3BhdGgnIHdhcyBhbHJlYWR5IGEgbGVhZiB3aXRoIGEgdmFsdWUuIE11c3QgcmV0dXJuIGFcbi8vICAgICAgICAgICAgICAgICAgICAgICAgY29uZmxpY3QgcmVzb2x1dGlvbi5cbi8vIGluaXRpYWwgdHJlZSAtIE9wdGlvbmFsIE9iamVjdDogc3RhcnRpbmcgdHJlZS5cbi8vIEByZXR1cm5zIC0gT2JqZWN0OiB0cmVlIHJlcHJlc2VudGVkIGFzIGEgc2V0IG9mIG5lc3RlZCBvYmplY3RzXG5leHBvcnQgZnVuY3Rpb24gcGF0aHNUb1RyZWUocGF0aHMsIG5ld0xlYWZGbiwgY29uZmxpY3RGbiwgcm9vdCA9IHt9KSB7XG4gIHBhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgY29uc3QgcGF0aEFycmF5ID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIGxldCB0cmVlID0gcm9vdDtcblxuICAgIC8vIHVzZSAuZXZlcnkganVzdCBmb3IgaXRlcmF0aW9uIHdpdGggYnJlYWtcbiAgICBjb25zdCBzdWNjZXNzID0gcGF0aEFycmF5LnNsaWNlKDAsIC0xKS5ldmVyeSgoa2V5LCBpKSA9PiB7XG4gICAgICBpZiAoIWhhc093bi5jYWxsKHRyZWUsIGtleSkpIHtcbiAgICAgICAgdHJlZVtrZXldID0ge307XG4gICAgICB9IGVsc2UgaWYgKHRyZWVba2V5XSAhPT0gT2JqZWN0KHRyZWVba2V5XSkpIHtcbiAgICAgICAgdHJlZVtrZXldID0gY29uZmxpY3RGbihcbiAgICAgICAgICB0cmVlW2tleV0sXG4gICAgICAgICAgcGF0aEFycmF5LnNsaWNlKDAsIGkgKyAxKS5qb2luKCcuJyksXG4gICAgICAgICAgcGF0aFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIGJyZWFrIG91dCBvZiBsb29wIGlmIHdlIGFyZSBmYWlsaW5nIGZvciB0aGlzIHBhdGhcbiAgICAgICAgaWYgKHRyZWVba2V5XSAhPT0gT2JqZWN0KHRyZWVba2V5XSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdHJlZSA9IHRyZWVba2V5XTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgY29uc3QgbGFzdEtleSA9IHBhdGhBcnJheVtwYXRoQXJyYXkubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoaGFzT3duLmNhbGwodHJlZSwgbGFzdEtleSkpIHtcbiAgICAgICAgdHJlZVtsYXN0S2V5XSA9IGNvbmZsaWN0Rm4odHJlZVtsYXN0S2V5XSwgcGF0aCwgcGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cmVlW2xhc3RLZXldID0gbmV3TGVhZkZuKHBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJvb3Q7XG59XG5cbi8vIE1ha2VzIHN1cmUgd2UgZ2V0IDIgZWxlbWVudHMgYXJyYXkgYW5kIGFzc3VtZSB0aGUgZmlyc3Qgb25lIHRvIGJlIHggYW5kXG4vLyB0aGUgc2Vjb25kIG9uZSB0byB5IG5vIG1hdHRlciB3aGF0IHVzZXIgcGFzc2VzLlxuLy8gSW4gY2FzZSB1c2VyIHBhc3NlcyB7IGxvbjogeCwgbGF0OiB5IH0gcmV0dXJucyBbeCwgeV1cbmZ1bmN0aW9uIHBvaW50VG9BcnJheShwb2ludCkge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShwb2ludCkgPyBwb2ludC5zbGljZSgpIDogW3BvaW50LngsIHBvaW50LnldO1xufVxuXG4vLyBDcmVhdGluZyBhIGRvY3VtZW50IGZyb20gYW4gdXBzZXJ0IGlzIHF1aXRlIHRyaWNreS5cbi8vIEUuZy4gdGhpcyBzZWxlY3Rvcjoge1wiJG9yXCI6IFt7XCJiLmZvb1wiOiB7XCIkYWxsXCI6IFtcImJhclwiXX19XX0sIHNob3VsZCByZXN1bHRcbi8vIGluOiB7XCJiLmZvb1wiOiBcImJhclwifVxuLy8gQnV0IHRoaXMgc2VsZWN0b3I6IHtcIiRvclwiOiBbe1wiYlwiOiB7XCJmb29cIjoge1wiJGFsbFwiOiBbXCJiYXJcIl19fX1dfSBzaG91bGQgdGhyb3dcbi8vIGFuIGVycm9yXG5cbi8vIFNvbWUgcnVsZXMgKGZvdW5kIG1haW5seSB3aXRoIHRyaWFsICYgZXJyb3IsIHNvIHRoZXJlIG1pZ2h0IGJlIG1vcmUpOlxuLy8gLSBoYW5kbGUgYWxsIGNoaWxkcyBvZiAkYW5kIChvciBpbXBsaWNpdCAkYW5kKVxuLy8gLSBoYW5kbGUgJG9yIG5vZGVzIHdpdGggZXhhY3RseSAxIGNoaWxkXG4vLyAtIGlnbm9yZSAkb3Igbm9kZXMgd2l0aCBtb3JlIHRoYW4gMSBjaGlsZFxuLy8gLSBpZ25vcmUgJG5vciBhbmQgJG5vdCBub2Rlc1xuLy8gLSB0aHJvdyB3aGVuIGEgdmFsdWUgY2FuIG5vdCBiZSBzZXQgdW5hbWJpZ3VvdXNseVxuLy8gLSBldmVyeSB2YWx1ZSBmb3IgJGFsbCBzaG91bGQgYmUgZGVhbHQgd2l0aCBhcyBzZXBhcmF0ZSAkZXEtc1xuLy8gLSB0aHJlYXQgYWxsIGNoaWxkcmVuIG9mICRhbGwgYXMgJGVxIHNldHRlcnMgKD0+IHNldCBpZiAkYWxsLmxlbmd0aCA9PT0gMSxcbi8vICAgb3RoZXJ3aXNlIHRocm93IGVycm9yKVxuLy8gLSB5b3UgY2FuIG5vdCBtaXggJyQnLXByZWZpeGVkIGtleXMgYW5kIG5vbi0nJCctcHJlZml4ZWQga2V5c1xuLy8gLSB5b3UgY2FuIG9ubHkgaGF2ZSBkb3R0ZWQga2V5cyBvbiBhIHJvb3QtbGV2ZWxcbi8vIC0geW91IGNhbiBub3QgaGF2ZSAnJCctcHJlZml4ZWQga2V5cyBtb3JlIHRoYW4gb25lLWxldmVsIGRlZXAgaW4gYW4gb2JqZWN0XG5cbi8vIEhhbmRsZXMgb25lIGtleS92YWx1ZSBwYWlyIHRvIHB1dCBpbiB0aGUgc2VsZWN0b3IgZG9jdW1lbnRcbmZ1bmN0aW9uIHBvcHVsYXRlRG9jdW1lbnRXaXRoS2V5VmFsdWUoZG9jdW1lbnQsIGtleSwgdmFsdWUpIHtcbiAgaWYgKHZhbHVlICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSkgPT09IE9iamVjdC5wcm90b3R5cGUpIHtcbiAgICBwb3B1bGF0ZURvY3VtZW50V2l0aE9iamVjdChkb2N1bWVudCwga2V5LCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkpIHtcbiAgICBpbnNlcnRJbnRvRG9jdW1lbnQoZG9jdW1lbnQsIGtleSwgdmFsdWUpO1xuICB9XG59XG5cbi8vIEhhbmRsZXMgYSBrZXksIHZhbHVlIHBhaXIgdG8gcHV0IGluIHRoZSBzZWxlY3RvciBkb2N1bWVudFxuLy8gaWYgdGhlIHZhbHVlIGlzIGFuIG9iamVjdFxuZnVuY3Rpb24gcG9wdWxhdGVEb2N1bWVudFdpdGhPYmplY3QoZG9jdW1lbnQsIGtleSwgdmFsdWUpIHtcbiAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgY29uc3QgdW5wcmVmaXhlZEtleXMgPSBrZXlzLmZpbHRlcihvcCA9PiBvcFswXSAhPT0gJyQnKTtcblxuICBpZiAodW5wcmVmaXhlZEtleXMubGVuZ3RoID4gMCB8fCAha2V5cy5sZW5ndGgpIHtcbiAgICAvLyBMaXRlcmFsIChwb3NzaWJseSBlbXB0eSkgb2JqZWN0ICggb3IgZW1wdHkgb2JqZWN0IClcbiAgICAvLyBEb24ndCBhbGxvdyBtaXhpbmcgJyQnLXByZWZpeGVkIHdpdGggbm9uLSckJy1wcmVmaXhlZCBmaWVsZHNcbiAgICBpZiAoa2V5cy5sZW5ndGggIT09IHVucHJlZml4ZWRLZXlzLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wZXJhdG9yOiAke3VucHJlZml4ZWRLZXlzWzBdfWApO1xuICAgIH1cblxuICAgIHZhbGlkYXRlT2JqZWN0KHZhbHVlLCBrZXkpO1xuICAgIGluc2VydEludG9Eb2N1bWVudChkb2N1bWVudCwga2V5LCB2YWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmtleXModmFsdWUpLmZvckVhY2gob3AgPT4ge1xuICAgICAgY29uc3Qgb2JqZWN0ID0gdmFsdWVbb3BdO1xuXG4gICAgICBpZiAob3AgPT09ICckZXEnKSB7XG4gICAgICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoS2V5VmFsdWUoZG9jdW1lbnQsIGtleSwgb2JqZWN0KTtcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09ICckYWxsJykge1xuICAgICAgICAvLyBldmVyeSB2YWx1ZSBmb3IgJGFsbCBzaG91bGQgYmUgZGVhbHQgd2l0aCBhcyBzZXBhcmF0ZSAkZXEtc1xuICAgICAgICBvYmplY3QuZm9yRWFjaChlbGVtZW50ID0+XG4gICAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZShkb2N1bWVudCwga2V5LCBlbGVtZW50KVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbi8vIEZpbGxzIGEgZG9jdW1lbnQgd2l0aCBjZXJ0YWluIGZpZWxkcyBmcm9tIGFuIHVwc2VydCBzZWxlY3RvclxuZXhwb3J0IGZ1bmN0aW9uIHBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHMocXVlcnksIGRvY3VtZW50ID0ge30pIHtcbiAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihxdWVyeSkgPT09IE9iamVjdC5wcm90b3R5cGUpIHtcbiAgICAvLyBoYW5kbGUgaW1wbGljaXQgJGFuZFxuICAgIE9iamVjdC5rZXlzKHF1ZXJ5KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHF1ZXJ5W2tleV07XG5cbiAgICAgIGlmIChrZXkgPT09ICckYW5kJykge1xuICAgICAgICAvLyBoYW5kbGUgZXhwbGljaXQgJGFuZFxuICAgICAgICB2YWx1ZS5mb3JFYWNoKGVsZW1lbnQgPT5cbiAgICAgICAgICBwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzKGVsZW1lbnQsIGRvY3VtZW50KVxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmIChrZXkgPT09ICckb3InKSB7XG4gICAgICAgIC8vIGhhbmRsZSAkb3Igbm9kZXMgd2l0aCBleGFjdGx5IDEgY2hpbGRcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHModmFsdWVbMF0sIGRvY3VtZW50KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChrZXlbMF0gIT09ICckJykge1xuICAgICAgICAvLyBJZ25vcmUgb3RoZXIgJyQnLXByZWZpeGVkIGxvZ2ljYWwgc2VsZWN0b3JzXG4gICAgICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoS2V5VmFsdWUoZG9jdW1lbnQsIGtleSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIC8vIEhhbmRsZSBtZXRlb3Itc3BlY2lmaWMgc2hvcnRjdXQgZm9yIHNlbGVjdGluZyBfaWRcbiAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQocXVlcnkpKSB7XG4gICAgICBpbnNlcnRJbnRvRG9jdW1lbnQoZG9jdW1lbnQsICdfaWQnLCBxdWVyeSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRvY3VtZW50O1xufVxuXG4vLyBUcmF2ZXJzZXMgdGhlIGtleXMgb2YgcGFzc2VkIHByb2plY3Rpb24gYW5kIGNvbnN0cnVjdHMgYSB0cmVlIHdoZXJlIGFsbFxuLy8gbGVhdmVzIGFyZSBlaXRoZXIgYWxsIFRydWUgb3IgYWxsIEZhbHNlXG4vLyBAcmV0dXJucyBPYmplY3Q6XG4vLyAgLSB0cmVlIC0gT2JqZWN0IC0gdHJlZSByZXByZXNlbnRhdGlvbiBvZiBrZXlzIGludm9sdmVkIGluIHByb2plY3Rpb25cbi8vICAoZXhjZXB0aW9uIGZvciAnX2lkJyBhcyBpdCBpcyBhIHNwZWNpYWwgY2FzZSBoYW5kbGVkIHNlcGFyYXRlbHkpXG4vLyAgLSBpbmNsdWRpbmcgLSBCb29sZWFuIC0gXCJ0YWtlIG9ubHkgY2VydGFpbiBmaWVsZHNcIiB0eXBlIG9mIHByb2plY3Rpb25cbmV4cG9ydCBmdW5jdGlvbiBwcm9qZWN0aW9uRGV0YWlscyhmaWVsZHMpIHtcbiAgLy8gRmluZCB0aGUgbm9uLV9pZCBrZXlzIChfaWQgaXMgaGFuZGxlZCBzcGVjaWFsbHkgYmVjYXVzZSBpdCBpcyBpbmNsdWRlZFxuICAvLyB1bmxlc3MgZXhwbGljaXRseSBleGNsdWRlZCkuIFNvcnQgdGhlIGtleXMsIHNvIHRoYXQgb3VyIGNvZGUgdG8gZGV0ZWN0XG4gIC8vIG92ZXJsYXBzIGxpa2UgJ2ZvbycgYW5kICdmb28uYmFyJyBjYW4gYXNzdW1lIHRoYXQgJ2ZvbycgY29tZXMgZmlyc3QuXG4gIGxldCBmaWVsZHNLZXlzID0gT2JqZWN0LmtleXMoZmllbGRzKS5zb3J0KCk7XG5cbiAgLy8gSWYgX2lkIGlzIHRoZSBvbmx5IGZpZWxkIGluIHRoZSBwcm9qZWN0aW9uLCBkbyBub3QgcmVtb3ZlIGl0LCBzaW5jZSBpdCBpc1xuICAvLyByZXF1aXJlZCB0byBkZXRlcm1pbmUgaWYgdGhpcyBpcyBhbiBleGNsdXNpb24gb3IgZXhjbHVzaW9uLiBBbHNvIGtlZXAgYW5cbiAgLy8gaW5jbHVzaXZlIF9pZCwgc2luY2UgaW5jbHVzaXZlIF9pZCBmb2xsb3dzIHRoZSBub3JtYWwgcnVsZXMgYWJvdXQgbWl4aW5nXG4gIC8vIGluY2x1c2l2ZSBhbmQgZXhjbHVzaXZlIGZpZWxkcy4gSWYgX2lkIGlzIG5vdCB0aGUgb25seSBmaWVsZCBpbiB0aGVcbiAgLy8gcHJvamVjdGlvbiBhbmQgaXMgZXhjbHVzaXZlLCByZW1vdmUgaXQgc28gaXQgY2FuIGJlIGhhbmRsZWQgbGF0ZXIgYnkgYVxuICAvLyBzcGVjaWFsIGNhc2UsIHNpbmNlIGV4Y2x1c2l2ZSBfaWQgaXMgYWx3YXlzIGFsbG93ZWQuXG4gIGlmICghKGZpZWxkc0tleXMubGVuZ3RoID09PSAxICYmIGZpZWxkc0tleXNbMF0gPT09ICdfaWQnKSAmJlxuICAgICAgIShmaWVsZHNLZXlzLmluY2x1ZGVzKCdfaWQnKSAmJiBmaWVsZHMuX2lkKSkge1xuICAgIGZpZWxkc0tleXMgPSBmaWVsZHNLZXlzLmZpbHRlcihrZXkgPT4ga2V5ICE9PSAnX2lkJyk7XG4gIH1cblxuICBsZXQgaW5jbHVkaW5nID0gbnVsbDsgLy8gVW5rbm93blxuXG4gIGZpZWxkc0tleXMuZm9yRWFjaChrZXlQYXRoID0+IHtcbiAgICBjb25zdCBydWxlID0gISFmaWVsZHNba2V5UGF0aF07XG5cbiAgICBpZiAoaW5jbHVkaW5nID09PSBudWxsKSB7XG4gICAgICBpbmNsdWRpbmcgPSBydWxlO1xuICAgIH1cblxuICAgIC8vIFRoaXMgZXJyb3IgbWVzc2FnZSBpcyBjb3BpZWQgZnJvbSBNb25nb0RCIHNoZWxsXG4gICAgaWYgKGluY2x1ZGluZyAhPT0gcnVsZSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdZb3UgY2Fubm90IGN1cnJlbnRseSBtaXggaW5jbHVkaW5nIGFuZCBleGNsdWRpbmcgZmllbGRzLidcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBwcm9qZWN0aW9uUnVsZXNUcmVlID0gcGF0aHNUb1RyZWUoXG4gICAgZmllbGRzS2V5cyxcbiAgICBwYXRoID0+IGluY2x1ZGluZyxcbiAgICAobm9kZSwgcGF0aCwgZnVsbFBhdGgpID0+IHtcbiAgICAgIC8vIENoZWNrIHBhc3NlZCBwcm9qZWN0aW9uIGZpZWxkcycga2V5czogSWYgeW91IGhhdmUgdHdvIHJ1bGVzIHN1Y2ggYXNcbiAgICAgIC8vICdmb28uYmFyJyBhbmQgJ2Zvby5iYXIuYmF6JywgdGhlbiB0aGUgcmVzdWx0IGJlY29tZXMgYW1iaWd1b3VzLiBJZlxuICAgICAgLy8gdGhhdCBoYXBwZW5zLCB0aGVyZSBpcyBhIHByb2JhYmlsaXR5IHlvdSBhcmUgZG9pbmcgc29tZXRoaW5nIHdyb25nLFxuICAgICAgLy8gZnJhbWV3b3JrIHNob3VsZCBub3RpZnkgeW91IGFib3V0IHN1Y2ggbWlzdGFrZSBlYXJsaWVyIG9uIGN1cnNvclxuICAgICAgLy8gY29tcGlsYXRpb24gc3RlcCB0aGFuIGxhdGVyIGR1cmluZyBydW50aW1lLiAgTm90ZSwgdGhhdCByZWFsIG1vbmdvXG4gICAgICAvLyBkb2Vzbid0IGRvIGFueXRoaW5nIGFib3V0IGl0IGFuZCB0aGUgbGF0ZXIgcnVsZSBhcHBlYXJzIGluIHByb2plY3Rpb25cbiAgICAgIC8vIHByb2plY3QsIG1vcmUgcHJpb3JpdHkgaXQgdGFrZXMuXG4gICAgICAvL1xuICAgICAgLy8gRXhhbXBsZSwgYXNzdW1lIGZvbGxvd2luZyBpbiBtb25nbyBzaGVsbDpcbiAgICAgIC8vID4gZGIuY29sbC5pbnNlcnQoeyBhOiB7IGI6IDIzLCBjOiA0NCB9IH0pXG4gICAgICAvLyA+IGRiLmNvbGwuZmluZCh7fSwgeyAnYSc6IDEsICdhLmInOiAxIH0pXG4gICAgICAvLyB7XCJfaWRcIjogT2JqZWN0SWQoXCI1MjBiZmU0NTYwMjQ2MDhlOGVmMjRhZjNcIiksIFwiYVwiOiB7XCJiXCI6IDIzfX1cbiAgICAgIC8vID4gZGIuY29sbC5maW5kKHt9LCB7ICdhLmInOiAxLCAnYSc6IDEgfSlcbiAgICAgIC8vIHtcIl9pZFwiOiBPYmplY3RJZChcIjUyMGJmZTQ1NjAyNDYwOGU4ZWYyNGFmM1wiKSwgXCJhXCI6IHtcImJcIjogMjMsIFwiY1wiOiA0NH19XG4gICAgICAvL1xuICAgICAgLy8gTm90ZSwgaG93IHNlY29uZCB0aW1lIHRoZSByZXR1cm4gc2V0IG9mIGtleXMgaXMgZGlmZmVyZW50LlxuICAgICAgY29uc3QgY3VycmVudFBhdGggPSBmdWxsUGF0aDtcbiAgICAgIGNvbnN0IGFub3RoZXJQYXRoID0gcGF0aDtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICBgYm90aCAke2N1cnJlbnRQYXRofSBhbmQgJHthbm90aGVyUGF0aH0gZm91bmQgaW4gZmllbGRzIG9wdGlvbiwgYCArXG4gICAgICAgICd1c2luZyBib3RoIG9mIHRoZW0gbWF5IHRyaWdnZXIgdW5leHBlY3RlZCBiZWhhdmlvci4gRGlkIHlvdSBtZWFuIHRvICcgK1xuICAgICAgICAndXNlIG9ubHkgb25lIG9mIHRoZW0/J1xuICAgICAgKTtcbiAgICB9KTtcblxuICByZXR1cm4ge2luY2x1ZGluZywgdHJlZTogcHJvamVjdGlvblJ1bGVzVHJlZX07XG59XG5cbi8vIFRha2VzIGEgUmVnRXhwIG9iamVjdCBhbmQgcmV0dXJucyBhbiBlbGVtZW50IG1hdGNoZXIuXG5leHBvcnQgZnVuY3Rpb24gcmVnZXhwRWxlbWVudE1hdGNoZXIocmVnZXhwKSB7XG4gIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKSA9PT0gcmVnZXhwLnRvU3RyaW5nKCk7XG4gICAgfVxuXG4gICAgLy8gUmVnZXhwcyBvbmx5IHdvcmsgYWdhaW5zdCBzdHJpbmdzLlxuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gUmVzZXQgcmVnZXhwJ3Mgc3RhdGUgdG8gYXZvaWQgaW5jb25zaXN0ZW50IG1hdGNoaW5nIGZvciBvYmplY3RzIHdpdGggdGhlXG4gICAgLy8gc2FtZSB2YWx1ZSBvbiBjb25zZWN1dGl2ZSBjYWxscyBvZiByZWdleHAudGVzdC4gVGhpcyBoYXBwZW5zIG9ubHkgaWYgdGhlXG4gICAgLy8gcmVnZXhwIGhhcyB0aGUgJ2cnIGZsYWcuIEFsc28gbm90ZSB0aGF0IEVTNiBpbnRyb2R1Y2VzIGEgbmV3IGZsYWcgJ3knIGZvclxuICAgIC8vIHdoaWNoIHdlIHNob3VsZCAqbm90KiBjaGFuZ2UgdGhlIGxhc3RJbmRleCBidXQgTW9uZ29EQiBkb2Vzbid0IHN1cHBvcnRcbiAgICAvLyBlaXRoZXIgb2YgdGhlc2UgZmxhZ3MuXG4gICAgcmVnZXhwLmxhc3RJbmRleCA9IDA7XG5cbiAgICByZXR1cm4gcmVnZXhwLnRlc3QodmFsdWUpO1xuICB9O1xufVxuXG4vLyBWYWxpZGF0ZXMgdGhlIGtleSBpbiBhIHBhdGguXG4vLyBPYmplY3RzIHRoYXQgYXJlIG5lc3RlZCBtb3JlIHRoZW4gMSBsZXZlbCBjYW5ub3QgaGF2ZSBkb3R0ZWQgZmllbGRzXG4vLyBvciBmaWVsZHMgc3RhcnRpbmcgd2l0aCAnJCdcbmZ1bmN0aW9uIHZhbGlkYXRlS2V5SW5QYXRoKGtleSwgcGF0aCkge1xuICBpZiAoa2V5LmluY2x1ZGVzKCcuJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgVGhlIGRvdHRlZCBmaWVsZCAnJHtrZXl9JyBpbiAnJHtwYXRofS4ke2tleX0gaXMgbm90IHZhbGlkIGZvciBzdG9yYWdlLmBcbiAgICApO1xuICB9XG5cbiAgaWYgKGtleVswXSA9PT0gJyQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFRoZSBkb2xsYXIgKCQpIHByZWZpeGVkIGZpZWxkICAnJHtwYXRofS4ke2tleX0gaXMgbm90IHZhbGlkIGZvciBzdG9yYWdlLmBcbiAgICApO1xuICB9XG59XG5cbi8vIFJlY3Vyc2l2ZWx5IHZhbGlkYXRlcyBhbiBvYmplY3QgdGhhdCBpcyBuZXN0ZWQgbW9yZSB0aGFuIG9uZSBsZXZlbCBkZWVwXG5mdW5jdGlvbiB2YWxpZGF0ZU9iamVjdChvYmplY3QsIHBhdGgpIHtcbiAgaWYgKG9iamVjdCAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KSA9PT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIE9iamVjdC5rZXlzKG9iamVjdCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgdmFsaWRhdGVLZXlJblBhdGgoa2V5LCBwYXRoKTtcbiAgICAgIHZhbGlkYXRlT2JqZWN0KG9iamVjdFtrZXldLCBwYXRoICsgJy4nICsga2V5KTtcbiAgICB9KTtcbiAgfVxufVxuIiwiaW1wb3J0IExvY2FsQ29sbGVjdGlvbiBmcm9tICcuL2xvY2FsX2NvbGxlY3Rpb24uanMnO1xuaW1wb3J0IHsgaGFzT3duIH0gZnJvbSAnLi9jb21tb24uanMnO1xuXG4vLyBDdXJzb3I6IGEgc3BlY2lmaWNhdGlvbiBmb3IgYSBwYXJ0aWN1bGFyIHN1YnNldCBvZiBkb2N1bWVudHMsIHcvIGEgZGVmaW5lZFxuLy8gb3JkZXIsIGxpbWl0LCBhbmQgb2Zmc2V0LiAgY3JlYXRpbmcgYSBDdXJzb3Igd2l0aCBMb2NhbENvbGxlY3Rpb24uZmluZCgpLFxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ3Vyc29yIHtcbiAgLy8gZG9uJ3QgY2FsbCB0aGlzIGN0b3IgZGlyZWN0bHkuICB1c2UgTG9jYWxDb2xsZWN0aW9uLmZpbmQoKS5cbiAgY29uc3RydWN0b3IoY29sbGVjdGlvbiwgc2VsZWN0b3IsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuY29sbGVjdGlvbiA9IGNvbGxlY3Rpb247XG4gICAgdGhpcy5zb3J0ZXIgPSBudWxsO1xuICAgIHRoaXMubWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihzZWxlY3Rvcik7XG5cbiAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWRQZXJoYXBzQXNPYmplY3Qoc2VsZWN0b3IpKSB7XG4gICAgICAvLyBzdGFzaCBmb3IgZmFzdCBfaWQgYW5kIHsgX2lkIH1cbiAgICAgIHRoaXMuX3NlbGVjdG9ySWQgPSBoYXNPd24uY2FsbChzZWxlY3RvciwgJ19pZCcpXG4gICAgICAgID8gc2VsZWN0b3IuX2lkXG4gICAgICAgIDogc2VsZWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3NlbGVjdG9ySWQgPSB1bmRlZmluZWQ7XG5cbiAgICAgIGlmICh0aGlzLm1hdGNoZXIuaGFzR2VvUXVlcnkoKSB8fCBvcHRpb25zLnNvcnQpIHtcbiAgICAgICAgdGhpcy5zb3J0ZXIgPSBuZXcgTWluaW1vbmdvLlNvcnRlcihvcHRpb25zLnNvcnQgfHwgW10pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc2tpcCA9IG9wdGlvbnMuc2tpcCB8fCAwO1xuICAgIHRoaXMubGltaXQgPSBvcHRpb25zLmxpbWl0O1xuICAgIHRoaXMuZmllbGRzID0gb3B0aW9ucy5maWVsZHM7XG5cbiAgICB0aGlzLl9wcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKHRoaXMuZmllbGRzIHx8IHt9KTtcblxuICAgIHRoaXMuX3RyYW5zZm9ybSA9IExvY2FsQ29sbGVjdGlvbi53cmFwVHJhbnNmb3JtKG9wdGlvbnMudHJhbnNmb3JtKTtcblxuICAgIC8vIGJ5IGRlZmF1bHQsIHF1ZXJpZXMgcmVnaXN0ZXIgdy8gVHJhY2tlciB3aGVuIGl0IGlzIGF2YWlsYWJsZS5cbiAgICBpZiAodHlwZW9mIFRyYWNrZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLnJlYWN0aXZlID0gb3B0aW9ucy5yZWFjdGl2ZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IG9wdGlvbnMucmVhY3RpdmU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgdGhhdCBtYXRjaCBhIHF1ZXJ5LlxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBtZXRob2QgIGNvdW50XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2FwcGx5U2tpcExpbWl0PXRydWVdIElmIHNldCB0byBgZmFsc2VgLCB0aGUgdmFsdWVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybmVkIHdpbGwgcmVmbGVjdCB0aGUgdG90YWxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlciBvZiBtYXRjaGluZyBkb2N1bWVudHMsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZ25vcmluZyBhbnkgdmFsdWUgc3VwcGxpZWQgZm9yXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW1pdFxuICAgKiBAaW5zdGFuY2VcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICBjb3VudChhcHBseVNraXBMaW1pdCA9IHRydWUpIHtcbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgLy8gYWxsb3cgdGhlIG9ic2VydmUgdG8gYmUgdW5vcmRlcmVkXG4gICAgICB0aGlzLl9kZXBlbmQoe2FkZGVkOiB0cnVlLCByZW1vdmVkOiB0cnVlfSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2dldFJhd09iamVjdHMoe1xuICAgICAgb3JkZXJlZDogdHJ1ZSxcbiAgICAgIGFwcGx5U2tpcExpbWl0XG4gICAgfSkubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybiBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzIGFzIGFuIEFycmF5LlxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBtZXRob2QgIGZldGNoXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHJldHVybnMge09iamVjdFtdfVxuICAgKi9cbiAgZmV0Y2goKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICB0aGlzLmZvckVhY2goZG9jID0+IHtcbiAgICAgIHJlc3VsdC5wdXNoKGRvYyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgaWYgKHRoaXMucmVhY3RpdmUpIHtcbiAgICAgIHRoaXMuX2RlcGVuZCh7XG4gICAgICAgIGFkZGVkQmVmb3JlOiB0cnVlLFxuICAgICAgICByZW1vdmVkOiB0cnVlLFxuICAgICAgICBjaGFuZ2VkOiB0cnVlLFxuICAgICAgICBtb3ZlZEJlZm9yZTogdHJ1ZX0pO1xuICAgIH1cblxuICAgIGxldCBpbmRleCA9IDA7XG4gICAgY29uc3Qgb2JqZWN0cyA9IHRoaXMuX2dldFJhd09iamVjdHMoe29yZGVyZWQ6IHRydWV9KTtcblxuICAgIHJldHVybiB7XG4gICAgICBuZXh0OiAoKSA9PiB7XG4gICAgICAgIGlmIChpbmRleCA8IG9iamVjdHMubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gVGhpcyBkb3VibGVzIGFzIGEgY2xvbmUgb3BlcmF0aW9uLlxuICAgICAgICAgIGxldCBlbGVtZW50ID0gdGhpcy5fcHJvamVjdGlvbkZuKG9iamVjdHNbaW5kZXgrK10pO1xuXG4gICAgICAgICAgaWYgKHRoaXMuX3RyYW5zZm9ybSlcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl90cmFuc2Zvcm0oZWxlbWVudCk7XG5cbiAgICAgICAgICByZXR1cm4ge3ZhbHVlOiBlbGVtZW50fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7ZG9uZTogdHJ1ZX07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAY2FsbGJhY2sgSXRlcmF0aW9uQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IGRvY1xuICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXhcbiAgICovXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBDYWxsIGBjYWxsYmFja2Agb25jZSBmb3IgZWFjaCBtYXRjaGluZyBkb2N1bWVudCwgc2VxdWVudGlhbGx5IGFuZFxuICAgKiAgICAgICAgICBzeW5jaHJvbm91c2x5LlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCAgZm9yRWFjaFxuICAgKiBAaW5zdGFuY2VcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAcGFyYW0ge0l0ZXJhdGlvbkNhbGxiYWNrfSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIGRvY3VtZW50LCBhXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAtYmFzZWQgaW5kZXgsIGFuZCA8ZW0+Y3Vyc29yPC9lbT5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRzZWxmLlxuICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIEFuIG9iamVjdCB3aGljaCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaW5zaWRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgYGNhbGxiYWNrYC5cbiAgICovXG4gIGZvckVhY2goY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgdGhpcy5fZGVwZW5kKHtcbiAgICAgICAgYWRkZWRCZWZvcmU6IHRydWUsXG4gICAgICAgIHJlbW92ZWQ6IHRydWUsXG4gICAgICAgIGNoYW5nZWQ6IHRydWUsXG4gICAgICAgIG1vdmVkQmVmb3JlOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZ2V0UmF3T2JqZWN0cyh7b3JkZXJlZDogdHJ1ZX0pLmZvckVhY2goKGVsZW1lbnQsIGkpID0+IHtcbiAgICAgIC8vIFRoaXMgZG91YmxlcyBhcyBhIGNsb25lIG9wZXJhdGlvbi5cbiAgICAgIGVsZW1lbnQgPSB0aGlzLl9wcm9qZWN0aW9uRm4oZWxlbWVudCk7XG5cbiAgICAgIGlmICh0aGlzLl90cmFuc2Zvcm0pIHtcbiAgICAgICAgZWxlbWVudCA9IHRoaXMuX3RyYW5zZm9ybShlbGVtZW50KTtcbiAgICAgIH1cblxuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBlbGVtZW50LCBpLCB0aGlzKTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldFRyYW5zZm9ybSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdHJhbnNmb3JtO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1hcCBjYWxsYmFjayBvdmVyIGFsbCBtYXRjaGluZyBkb2N1bWVudHMuICBSZXR1cm5zIGFuIEFycmF5LlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBtYXBcbiAgICogQGluc3RhbmNlXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQHBhcmFtIHtJdGVyYXRpb25DYWxsYmFja30gY2FsbGJhY2sgRnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2l0aCB0aHJlZSBhcmd1bWVudHM6IHRoZSBkb2N1bWVudCwgYVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLWJhc2VkIGluZGV4LCBhbmQgPGVtPmN1cnNvcjwvZW0+XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0c2VsZi5cbiAgICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBBbiBvYmplY3Qgd2hpY2ggd2lsbCBiZSB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIGBjYWxsYmFja2AuXG4gICAqL1xuICBtYXAoY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBjb25zdCByZXN1bHQgPSBbXTtcblxuICAgIHRoaXMuZm9yRWFjaCgoZG9jLCBpKSA9PiB7XG4gICAgICByZXN1bHQucHVzaChjYWxsYmFjay5jYWxsKHRoaXNBcmcsIGRvYywgaSwgdGhpcykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIG9wdGlvbnMgdG8gY29udGFpbjpcbiAgLy8gICogY2FsbGJhY2tzIGZvciBvYnNlcnZlKCk6XG4gIC8vICAgIC0gYWRkZWRBdCAoZG9jdW1lbnQsIGF0SW5kZXgpXG4gIC8vICAgIC0gYWRkZWQgKGRvY3VtZW50KVxuICAvLyAgICAtIGNoYW5nZWRBdCAobmV3RG9jdW1lbnQsIG9sZERvY3VtZW50LCBhdEluZGV4KVxuICAvLyAgICAtIGNoYW5nZWQgKG5ld0RvY3VtZW50LCBvbGREb2N1bWVudClcbiAgLy8gICAgLSByZW1vdmVkQXQgKGRvY3VtZW50LCBhdEluZGV4KVxuICAvLyAgICAtIHJlbW92ZWQgKGRvY3VtZW50KVxuICAvLyAgICAtIG1vdmVkVG8gKGRvY3VtZW50LCBvbGRJbmRleCwgbmV3SW5kZXgpXG4gIC8vXG4gIC8vIGF0dHJpYnV0ZXMgYXZhaWxhYmxlIG9uIHJldHVybmVkIHF1ZXJ5IGhhbmRsZTpcbiAgLy8gICogc3RvcCgpOiBlbmQgdXBkYXRlc1xuICAvLyAgKiBjb2xsZWN0aW9uOiB0aGUgY29sbGVjdGlvbiB0aGlzIHF1ZXJ5IGlzIHF1ZXJ5aW5nXG4gIC8vXG4gIC8vIGlmZiB4IGlzIGEgcmV0dXJuZWQgcXVlcnkgaGFuZGxlLCAoeCBpbnN0YW5jZW9mXG4gIC8vIExvY2FsQ29sbGVjdGlvbi5PYnNlcnZlSGFuZGxlKSBpcyB0cnVlXG4gIC8vXG4gIC8vIGluaXRpYWwgcmVzdWx0cyBkZWxpdmVyZWQgdGhyb3VnaCBhZGRlZCBjYWxsYmFja1xuICAvLyBYWFggbWF5YmUgY2FsbGJhY2tzIHNob3VsZCB0YWtlIGEgbGlzdCBvZiBvYmplY3RzLCB0byBleHBvc2UgdHJhbnNhY3Rpb25zP1xuICAvLyBYWFggbWF5YmUgc3VwcG9ydCBmaWVsZCBsaW1pdGluZyAodG8gbGltaXQgd2hhdCB5b3UncmUgbm90aWZpZWQgb24pXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFdhdGNoIGEgcXVlcnkuICBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrcyBGdW5jdGlvbnMgdG8gY2FsbCB0byBkZWxpdmVyIHRoZSByZXN1bHQgc2V0IGFzIGl0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlc1xuICAgKi9cbiAgb2JzZXJ2ZShvcHRpb25zKSB7XG4gICAgcmV0dXJuIExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyh0aGlzLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBXYXRjaCBhIHF1ZXJ5LiBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLiBPbmx5XG4gICAqICAgICAgICAgIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHRoZSBvbGQgYW5kIG5ldyBkb2N1bWVudHMgYXJlIHBhc3NlZCB0b1xuICAgKiAgICAgICAgICB0aGUgY2FsbGJhY2tzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrcyBGdW5jdGlvbnMgdG8gY2FsbCB0byBkZWxpdmVyIHRoZSByZXN1bHQgc2V0IGFzIGl0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlc1xuICAgKi9cbiAgb2JzZXJ2ZUNoYW5nZXMob3B0aW9ucykge1xuICAgIGNvbnN0IG9yZGVyZWQgPSBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZChvcHRpb25zKTtcblxuICAgIC8vIHRoZXJlIGFyZSBzZXZlcmFsIHBsYWNlcyB0aGF0IGFzc3VtZSB5b3UgYXJlbid0IGNvbWJpbmluZyBza2lwL2xpbWl0IHdpdGhcbiAgICAvLyB1bm9yZGVyZWQgb2JzZXJ2ZS4gIGVnLCB1cGRhdGUncyBFSlNPTi5jbG9uZSwgYW5kIHRoZSBcInRoZXJlIGFyZSBzZXZlcmFsXCJcbiAgICAvLyBjb21tZW50IGluIF9tb2RpZnlBbmROb3RpZnlcbiAgICAvLyBYWFggYWxsb3cgc2tpcC9saW1pdCB3aXRoIHVub3JkZXJlZCBvYnNlcnZlXG4gICAgaWYgKCFvcHRpb25zLl9hbGxvd191bm9yZGVyZWQgJiYgIW9yZGVyZWQgJiYgKHRoaXMuc2tpcCB8fCB0aGlzLmxpbWl0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcIk11c3QgdXNlIGFuIG9yZGVyZWQgb2JzZXJ2ZSB3aXRoIHNraXAgb3IgbGltaXQgKGkuZS4gJ2FkZGVkQmVmb3JlJyBcIiArXG4gICAgICAgIFwiZm9yIG9ic2VydmVDaGFuZ2VzIG9yICdhZGRlZEF0JyBmb3Igb2JzZXJ2ZSwgaW5zdGVhZCBvZiAnYWRkZWQnKS5cIlxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5maWVsZHMgJiYgKHRoaXMuZmllbGRzLl9pZCA9PT0gMCB8fCB0aGlzLmZpZWxkcy5faWQgPT09IGZhbHNlKSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ1lvdSBtYXkgbm90IG9ic2VydmUgYSBjdXJzb3Igd2l0aCB7ZmllbGRzOiB7X2lkOiAwfX0nKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXN0YW5jZXMgPSAoXG4gICAgICB0aGlzLm1hdGNoZXIuaGFzR2VvUXVlcnkoKSAmJlxuICAgICAgb3JkZXJlZCAmJlxuICAgICAgbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXBcbiAgICApO1xuXG4gICAgY29uc3QgcXVlcnkgPSB7XG4gICAgICBjdXJzb3I6IHRoaXMsXG4gICAgICBkaXJ0eTogZmFsc2UsXG4gICAgICBkaXN0YW5jZXMsXG4gICAgICBtYXRjaGVyOiB0aGlzLm1hdGNoZXIsIC8vIG5vdCBmYXN0IHBhdGhlZFxuICAgICAgb3JkZXJlZCxcbiAgICAgIHByb2plY3Rpb25GbjogdGhpcy5fcHJvamVjdGlvbkZuLFxuICAgICAgcmVzdWx0c1NuYXBzaG90OiBudWxsLFxuICAgICAgc29ydGVyOiBvcmRlcmVkICYmIHRoaXMuc29ydGVyXG4gICAgfTtcblxuICAgIGxldCBxaWQ7XG5cbiAgICAvLyBOb24tcmVhY3RpdmUgcXVlcmllcyBjYWxsIGFkZGVkW0JlZm9yZV0gYW5kIHRoZW4gbmV2ZXIgY2FsbCBhbnl0aGluZ1xuICAgIC8vIGVsc2UuXG4gICAgaWYgKHRoaXMucmVhY3RpdmUpIHtcbiAgICAgIHFpZCA9IHRoaXMuY29sbGVjdGlvbi5uZXh0X3FpZCsrO1xuICAgICAgdGhpcy5jb2xsZWN0aW9uLnF1ZXJpZXNbcWlkXSA9IHF1ZXJ5O1xuICAgIH1cblxuICAgIHF1ZXJ5LnJlc3VsdHMgPSB0aGlzLl9nZXRSYXdPYmplY3RzKHtvcmRlcmVkLCBkaXN0YW5jZXM6IHF1ZXJ5LmRpc3RhbmNlc30pO1xuXG4gICAgaWYgKHRoaXMuY29sbGVjdGlvbi5wYXVzZWQpIHtcbiAgICAgIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCA9IG9yZGVyZWQgPyBbXSA6IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgIH1cblxuICAgIC8vIHdyYXAgY2FsbGJhY2tzIHdlIHdlcmUgcGFzc2VkLiBjYWxsYmFja3Mgb25seSBmaXJlIHdoZW4gbm90IHBhdXNlZCBhbmRcbiAgICAvLyBhcmUgbmV2ZXIgdW5kZWZpbmVkXG4gICAgLy8gRmlsdGVycyBvdXQgYmxhY2tsaXN0ZWQgZmllbGRzIGFjY29yZGluZyB0byBjdXJzb3IncyBwcm9qZWN0aW9uLlxuICAgIC8vIFhYWCB3cm9uZyBwbGFjZSBmb3IgdGhpcz9cblxuICAgIC8vIGZ1cnRoZXJtb3JlLCBjYWxsYmFja3MgZW5xdWV1ZSB1bnRpbCB0aGUgb3BlcmF0aW9uIHdlJ3JlIHdvcmtpbmcgb24gaXNcbiAgICAvLyBkb25lLlxuICAgIGNvbnN0IHdyYXBDYWxsYmFjayA9IGZuID0+IHtcbiAgICAgIGlmICghZm4pIHtcbiAgICAgICAgcmV0dXJuICgpID0+IHt9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgIHJldHVybiBmdW5jdGlvbigvKiBhcmdzKi8pIHtcbiAgICAgICAgaWYgKHNlbGYuY29sbGVjdGlvbi5wYXVzZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICAgIHNlbGYuY29sbGVjdGlvbi5fb2JzZXJ2ZVF1ZXVlLnF1ZXVlVGFzaygoKSA9PiB7XG4gICAgICAgICAgZm4uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgcXVlcnkuYWRkZWQgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5hZGRlZCk7XG4gICAgcXVlcnkuY2hhbmdlZCA9IHdyYXBDYWxsYmFjayhvcHRpb25zLmNoYW5nZWQpO1xuICAgIHF1ZXJ5LnJlbW92ZWQgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5yZW1vdmVkKTtcblxuICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICBxdWVyeS5hZGRlZEJlZm9yZSA9IHdyYXBDYWxsYmFjayhvcHRpb25zLmFkZGVkQmVmb3JlKTtcbiAgICAgIHF1ZXJ5Lm1vdmVkQmVmb3JlID0gd3JhcENhbGxiYWNrKG9wdGlvbnMubW92ZWRCZWZvcmUpO1xuICAgIH1cblxuICAgIGlmICghb3B0aW9ucy5fc3VwcHJlc3NfaW5pdGlhbCAmJiAhdGhpcy5jb2xsZWN0aW9uLnBhdXNlZCkge1xuICAgICAgcXVlcnkucmVzdWx0cy5mb3JFYWNoKGRvYyA9PiB7XG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgICAgICAgZGVsZXRlIGZpZWxkcy5faWQ7XG5cbiAgICAgICAgaWYgKG9yZGVyZWQpIHtcbiAgICAgICAgICBxdWVyeS5hZGRlZEJlZm9yZShkb2MuX2lkLCB0aGlzLl9wcm9qZWN0aW9uRm4oZmllbGRzKSwgbnVsbCk7XG4gICAgICAgIH1cblxuICAgICAgICBxdWVyeS5hZGRlZChkb2MuX2lkLCB0aGlzLl9wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBoYW5kbGUgPSBPYmplY3QuYXNzaWduKG5ldyBMb2NhbENvbGxlY3Rpb24uT2JzZXJ2ZUhhbmRsZSwge1xuICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uLFxuICAgICAgc3RvcDogKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLmNvbGxlY3Rpb24ucXVlcmllc1txaWRdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5yZWFjdGl2ZSAmJiBUcmFja2VyLmFjdGl2ZSkge1xuICAgICAgLy8gWFhYIGluIG1hbnkgY2FzZXMsIHRoZSBzYW1lIG9ic2VydmUgd2lsbCBiZSByZWNyZWF0ZWQgd2hlblxuICAgICAgLy8gdGhlIGN1cnJlbnQgYXV0b3J1biBpcyByZXJ1bi4gIHdlIGNvdWxkIHNhdmUgd29yayBieVxuICAgICAgLy8gbGV0dGluZyBpdCBsaW5nZXIgYWNyb3NzIHJlcnVuIGFuZCBwb3RlbnRpYWxseSBnZXRcbiAgICAgIC8vIHJlcHVycG9zZWQgaWYgdGhlIHNhbWUgb2JzZXJ2ZSBpcyBwZXJmb3JtZWQsIHVzaW5nIGxvZ2ljXG4gICAgICAvLyBzaW1pbGFyIHRvIHRoYXQgb2YgTWV0ZW9yLnN1YnNjcmliZS5cbiAgICAgIFRyYWNrZXIub25JbnZhbGlkYXRlKCgpID0+IHtcbiAgICAgICAgaGFuZGxlLnN0b3AoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHJ1biB0aGUgb2JzZXJ2ZSBjYWxsYmFja3MgcmVzdWx0aW5nIGZyb20gdGhlIGluaXRpYWwgY29udGVudHNcbiAgICAvLyBiZWZvcmUgd2UgbGVhdmUgdGhlIG9ic2VydmUuXG4gICAgdGhpcy5jb2xsZWN0aW9uLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIHJldHVybiBoYW5kbGU7XG4gIH1cblxuICAvLyBTaW5jZSB3ZSBkb24ndCBhY3R1YWxseSBoYXZlIGEgXCJuZXh0T2JqZWN0XCIgaW50ZXJmYWNlLCB0aGVyZSdzIHJlYWxseSBub1xuICAvLyByZWFzb24gdG8gaGF2ZSBhIFwicmV3aW5kXCIgaW50ZXJmYWNlLiAgQWxsIGl0IGRpZCB3YXMgbWFrZSBtdWx0aXBsZSBjYWxsc1xuICAvLyB0byBmZXRjaC9tYXAvZm9yRWFjaCByZXR1cm4gbm90aGluZyB0aGUgc2Vjb25kIHRpbWUuXG4gIC8vIFhYWCBDT01QQVQgV0lUSCAwLjguMVxuICByZXdpbmQoKSB7fVxuXG4gIC8vIFhYWCBNYXliZSB3ZSBuZWVkIGEgdmVyc2lvbiBvZiBvYnNlcnZlIHRoYXQganVzdCBjYWxscyBhIGNhbGxiYWNrIGlmXG4gIC8vIGFueXRoaW5nIGNoYW5nZWQuXG4gIF9kZXBlbmQoY2hhbmdlcnMsIF9hbGxvd191bm9yZGVyZWQpIHtcbiAgICBpZiAoVHJhY2tlci5hY3RpdmUpIHtcbiAgICAgIGNvbnN0IGRlcGVuZGVuY3kgPSBuZXcgVHJhY2tlci5EZXBlbmRlbmN5O1xuICAgICAgY29uc3Qgbm90aWZ5ID0gZGVwZW5kZW5jeS5jaGFuZ2VkLmJpbmQoZGVwZW5kZW5jeSk7XG5cbiAgICAgIGRlcGVuZGVuY3kuZGVwZW5kKCk7XG5cbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB7X2FsbG93X3Vub3JkZXJlZCwgX3N1cHByZXNzX2luaXRpYWw6IHRydWV9O1xuXG4gICAgICBbJ2FkZGVkJywgJ2FkZGVkQmVmb3JlJywgJ2NoYW5nZWQnLCAnbW92ZWRCZWZvcmUnLCAncmVtb3ZlZCddXG4gICAgICAgIC5mb3JFYWNoKGZuID0+IHtcbiAgICAgICAgICBpZiAoY2hhbmdlcnNbZm5dKSB7XG4gICAgICAgICAgICBvcHRpb25zW2ZuXSA9IG5vdGlmeTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBvYnNlcnZlQ2hhbmdlcyB3aWxsIHN0b3AoKSB3aGVuIHRoaXMgY29tcHV0YXRpb24gaXMgaW52YWxpZGF0ZWRcbiAgICAgIHRoaXMub2JzZXJ2ZUNoYW5nZXMob3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgX2dldENvbGxlY3Rpb25OYW1lKCkge1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb24ubmFtZTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYSBjb2xsZWN0aW9uIG9mIG1hdGNoaW5nIG9iamVjdHMsIGJ1dCBkb2Vzbid0IGRlZXAgY29weSB0aGVtLlxuICAvL1xuICAvLyBJZiBvcmRlcmVkIGlzIHNldCwgcmV0dXJucyBhIHNvcnRlZCBhcnJheSwgcmVzcGVjdGluZyBzb3J0ZXIsIHNraXAsIGFuZFxuICAvLyBsaW1pdCBwcm9wZXJ0aWVzIG9mIHRoZSBxdWVyeSBwcm92aWRlZCB0aGF0IG9wdGlvbnMuYXBwbHlTa2lwTGltaXQgaXNcbiAgLy8gbm90IHNldCB0byBmYWxzZSAoIzEyMDEpLiBJZiBzb3J0ZXIgaXMgZmFsc2V5LCBubyBzb3J0IC0tIHlvdSBnZXQgdGhlXG4gIC8vIG5hdHVyYWwgb3JkZXIuXG4gIC8vXG4gIC8vIElmIG9yZGVyZWQgaXMgbm90IHNldCwgcmV0dXJucyBhbiBvYmplY3QgbWFwcGluZyBmcm9tIElEIHRvIGRvYyAoc29ydGVyLFxuICAvLyBza2lwIGFuZCBsaW1pdCBzaG91bGQgbm90IGJlIHNldCkuXG4gIC8vXG4gIC8vIElmIG9yZGVyZWQgaXMgc2V0IGFuZCB0aGlzIGN1cnNvciBpcyBhICRuZWFyIGdlb3F1ZXJ5LCB0aGVuIHRoaXMgZnVuY3Rpb25cbiAgLy8gd2lsbCB1c2UgYW4gX0lkTWFwIHRvIHRyYWNrIGVhY2ggZGlzdGFuY2UgZnJvbSB0aGUgJG5lYXIgYXJndW1lbnQgcG9pbnQgaW5cbiAgLy8gb3JkZXIgdG8gdXNlIGl0IGFzIGEgc29ydCBrZXkuIElmIGFuIF9JZE1hcCBpcyBwYXNzZWQgaW4gdGhlICdkaXN0YW5jZXMnXG4gIC8vIGFyZ3VtZW50LCB0aGlzIGZ1bmN0aW9uIHdpbGwgY2xlYXIgaXQgYW5kIHVzZSBpdCBmb3IgdGhpcyBwdXJwb3NlXG4gIC8vIChvdGhlcndpc2UgaXQgd2lsbCBqdXN0IGNyZWF0ZSBpdHMgb3duIF9JZE1hcCkuIFRoZSBvYnNlcnZlQ2hhbmdlc1xuICAvLyBpbXBsZW1lbnRhdGlvbiB1c2VzIHRoaXMgdG8gcmVtZW1iZXIgdGhlIGRpc3RhbmNlcyBhZnRlciB0aGlzIGZ1bmN0aW9uXG4gIC8vIHJldHVybnMuXG4gIF9nZXRSYXdPYmplY3RzKG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIEJ5IGRlZmF1bHQgdGhpcyBtZXRob2Qgd2lsbCByZXNwZWN0IHNraXAgYW5kIGxpbWl0IGJlY2F1c2UgLmZldGNoKCksXG4gICAgLy8gLmZvckVhY2goKSBldGMuLi4gZXhwZWN0IHRoaXMgYmVoYXZpb3VyLiBJdCBjYW4gYmUgZm9yY2VkIHRvIGlnbm9yZVxuICAgIC8vIHNraXAgYW5kIGxpbWl0IGJ5IHNldHRpbmcgYXBwbHlTa2lwTGltaXQgdG8gZmFsc2UgKC5jb3VudCgpIGRvZXMgdGhpcyxcbiAgICAvLyBmb3IgZXhhbXBsZSlcbiAgICBjb25zdCBhcHBseVNraXBMaW1pdCA9IG9wdGlvbnMuYXBwbHlTa2lwTGltaXQgIT09IGZhbHNlO1xuXG4gICAgLy8gWFhYIHVzZSBPcmRlcmVkRGljdCBpbnN0ZWFkIG9mIGFycmF5LCBhbmQgbWFrZSBJZE1hcCBhbmQgT3JkZXJlZERpY3RcbiAgICAvLyBjb21wYXRpYmxlXG4gICAgY29uc3QgcmVzdWx0cyA9IG9wdGlvbnMub3JkZXJlZCA/IFtdIDogbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG5cbiAgICAvLyBmYXN0IHBhdGggZm9yIHNpbmdsZSBJRCB2YWx1ZVxuICAgIGlmICh0aGlzLl9zZWxlY3RvcklkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIElmIHlvdSBoYXZlIG5vbi16ZXJvIHNraXAgYW5kIGFzayBmb3IgYSBzaW5nbGUgaWQsIHlvdSBnZXQgbm90aGluZy5cbiAgICAgIC8vIFRoaXMgaXMgc28gaXQgbWF0Y2hlcyB0aGUgYmVoYXZpb3Igb2YgdGhlICd7X2lkOiBmb299JyBwYXRoLlxuICAgICAgaWYgKGFwcGx5U2tpcExpbWl0ICYmIHRoaXMuc2tpcCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2VsZWN0ZWREb2MgPSB0aGlzLmNvbGxlY3Rpb24uX2RvY3MuZ2V0KHRoaXMuX3NlbGVjdG9ySWQpO1xuXG4gICAgICBpZiAoc2VsZWN0ZWREb2MpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMub3JkZXJlZCkge1xuICAgICAgICAgIHJlc3VsdHMucHVzaChzZWxlY3RlZERvYyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0cy5zZXQodGhpcy5fc2VsZWN0b3JJZCwgc2VsZWN0ZWREb2MpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cblxuICAgIC8vIHNsb3cgcGF0aCBmb3IgYXJiaXRyYXJ5IHNlbGVjdG9yLCBzb3J0LCBza2lwLCBsaW1pdFxuXG4gICAgLy8gaW4gdGhlIG9ic2VydmVDaGFuZ2VzIGNhc2UsIGRpc3RhbmNlcyBpcyBhY3R1YWxseSBwYXJ0IG9mIHRoZSBcInF1ZXJ5XCJcbiAgICAvLyAoaWUsIGxpdmUgcmVzdWx0cyBzZXQpIG9iamVjdC4gIGluIG90aGVyIGNhc2VzLCBkaXN0YW5jZXMgaXMgb25seSB1c2VkXG4gICAgLy8gaW5zaWRlIHRoaXMgZnVuY3Rpb24uXG4gICAgbGV0IGRpc3RhbmNlcztcbiAgICBpZiAodGhpcy5tYXRjaGVyLmhhc0dlb1F1ZXJ5KCkgJiYgb3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgICBpZiAob3B0aW9ucy5kaXN0YW5jZXMpIHtcbiAgICAgICAgZGlzdGFuY2VzID0gb3B0aW9ucy5kaXN0YW5jZXM7XG4gICAgICAgIGRpc3RhbmNlcy5jbGVhcigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGlzdGFuY2VzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXAoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvbGxlY3Rpb24uX2RvY3MuZm9yRWFjaCgoZG9jLCBpZCkgPT4ge1xuICAgICAgY29uc3QgbWF0Y2hSZXN1bHQgPSB0aGlzLm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYyk7XG5cbiAgICAgIGlmIChtYXRjaFJlc3VsdC5yZXN1bHQpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMub3JkZXJlZCkge1xuICAgICAgICAgIHJlc3VsdHMucHVzaChkb2MpO1xuXG4gICAgICAgICAgaWYgKGRpc3RhbmNlcyAmJiBtYXRjaFJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkaXN0YW5jZXMuc2V0KGlkLCBtYXRjaFJlc3VsdC5kaXN0YW5jZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdHMuc2V0KGlkLCBkb2MpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE92ZXJyaWRlIHRvIGVuc3VyZSBhbGwgZG9jcyBhcmUgbWF0Y2hlZCBpZiBpZ25vcmluZyBza2lwICYgbGltaXRcbiAgICAgIGlmICghYXBwbHlTa2lwTGltaXQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIEZhc3QgcGF0aCBmb3IgbGltaXRlZCB1bnNvcnRlZCBxdWVyaWVzLlxuICAgICAgLy8gWFhYICdsZW5ndGgnIGNoZWNrIGhlcmUgc2VlbXMgd3JvbmcgZm9yIG9yZGVyZWRcbiAgICAgIHJldHVybiAoXG4gICAgICAgICF0aGlzLmxpbWl0IHx8XG4gICAgICAgIHRoaXMuc2tpcCB8fFxuICAgICAgICB0aGlzLnNvcnRlciB8fFxuICAgICAgICByZXN1bHRzLmxlbmd0aCAhPT0gdGhpcy5saW1pdFxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGlmICghb3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zb3J0ZXIpIHtcbiAgICAgIHJlc3VsdHMuc29ydCh0aGlzLnNvcnRlci5nZXRDb21wYXJhdG9yKHtkaXN0YW5jZXN9KSk7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRoZSBmdWxsIHNldCBvZiByZXN1bHRzIGlmIHRoZXJlIGlzIG5vIHNraXAgb3IgbGltaXQgb3IgaWYgd2UncmVcbiAgICAvLyBpZ25vcmluZyB0aGVtXG4gICAgaWYgKCFhcHBseVNraXBMaW1pdCB8fCAoIXRoaXMubGltaXQgJiYgIXRoaXMuc2tpcCkpIHtcbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRzLnNsaWNlKFxuICAgICAgdGhpcy5za2lwLFxuICAgICAgdGhpcy5saW1pdCA/IHRoaXMubGltaXQgKyB0aGlzLnNraXAgOiByZXN1bHRzLmxlbmd0aFxuICAgICk7XG4gIH1cblxuICBfcHVibGlzaEN1cnNvcihzdWJzY3JpcHRpb24pIHtcbiAgICAvLyBYWFggbWluaW1vbmdvIHNob3VsZCBub3QgZGVwZW5kIG9uIG1vbmdvLWxpdmVkYXRhIVxuICAgIGlmICghUGFja2FnZS5tb25nbykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnQ2FuXFwndCBwdWJsaXNoIGZyb20gTWluaW1vbmdvIHdpdGhvdXQgdGhlIGBtb25nb2AgcGFja2FnZS4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5jb2xsZWN0aW9uLm5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0NhblxcJ3QgcHVibGlzaCBhIGN1cnNvciBmcm9tIGEgY29sbGVjdGlvbiB3aXRob3V0IGEgbmFtZS4nXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBQYWNrYWdlLm1vbmdvLk1vbmdvLkNvbGxlY3Rpb24uX3B1Ymxpc2hDdXJzb3IoXG4gICAgICB0aGlzLFxuICAgICAgc3Vic2NyaXB0aW9uLFxuICAgICAgdGhpcy5jb2xsZWN0aW9uLm5hbWVcbiAgICApO1xuICB9XG59XG4iLCJpbXBvcnQgQ3Vyc29yIGZyb20gJy4vY3Vyc29yLmpzJztcbmltcG9ydCBPYnNlcnZlSGFuZGxlIGZyb20gJy4vb2JzZXJ2ZV9oYW5kbGUuanMnO1xuaW1wb3J0IHtcbiAgaGFzT3duLFxuICBpc0luZGV4YWJsZSxcbiAgaXNOdW1lcmljS2V5LFxuICBpc09wZXJhdG9yT2JqZWN0LFxuICBwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzLFxuICBwcm9qZWN0aW9uRGV0YWlscyxcbn0gZnJvbSAnLi9jb21tb24uanMnO1xuXG4vLyBYWFggdHlwZSBjaGVja2luZyBvbiBzZWxlY3RvcnMgKGdyYWNlZnVsIGVycm9yIGlmIG1hbGZvcm1lZClcblxuLy8gTG9jYWxDb2xsZWN0aW9uOiBhIHNldCBvZiBkb2N1bWVudHMgdGhhdCBzdXBwb3J0cyBxdWVyaWVzIGFuZCBtb2RpZmllcnMuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMb2NhbENvbGxlY3Rpb24ge1xuICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAvLyBfaWQgLT4gZG9jdW1lbnQgKGFsc28gY29udGFpbmluZyBpZClcbiAgICB0aGlzLl9kb2NzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG5cbiAgICB0aGlzLm5leHRfcWlkID0gMTsgLy8gbGl2ZSBxdWVyeSBpZCBnZW5lcmF0b3JcblxuICAgIC8vIHFpZCAtPiBsaXZlIHF1ZXJ5IG9iamVjdC4ga2V5czpcbiAgICAvLyAgb3JkZXJlZDogYm9vbC4gb3JkZXJlZCBxdWVyaWVzIGhhdmUgYWRkZWRCZWZvcmUvbW92ZWRCZWZvcmUgY2FsbGJhY2tzLlxuICAgIC8vICByZXN1bHRzOiBhcnJheSAob3JkZXJlZCkgb3Igb2JqZWN0ICh1bm9yZGVyZWQpIG9mIGN1cnJlbnQgcmVzdWx0c1xuICAgIC8vICAgIChhbGlhc2VkIHdpdGggdGhpcy5fZG9jcyEpXG4gICAgLy8gIHJlc3VsdHNTbmFwc2hvdDogc25hcHNob3Qgb2YgcmVzdWx0cy4gbnVsbCBpZiBub3QgcGF1c2VkLlxuICAgIC8vICBjdXJzb3I6IEN1cnNvciBvYmplY3QgZm9yIHRoZSBxdWVyeS5cbiAgICAvLyAgc2VsZWN0b3IsIHNvcnRlciwgKGNhbGxiYWNrcyk6IGZ1bmN0aW9uc1xuICAgIHRoaXMucXVlcmllcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICAvLyBudWxsIGlmIG5vdCBzYXZpbmcgb3JpZ2luYWxzOyBhbiBJZE1hcCBmcm9tIGlkIHRvIG9yaWdpbmFsIGRvY3VtZW50IHZhbHVlXG4gICAgLy8gaWYgc2F2aW5nIG9yaWdpbmFscy4gU2VlIGNvbW1lbnRzIGJlZm9yZSBzYXZlT3JpZ2luYWxzKCkuXG4gICAgdGhpcy5fc2F2ZWRPcmlnaW5hbHMgPSBudWxsO1xuXG4gICAgLy8gVHJ1ZSB3aGVuIG9ic2VydmVycyBhcmUgcGF1c2VkIGFuZCB3ZSBzaG91bGQgbm90IHNlbmQgY2FsbGJhY2tzLlxuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG4gIH1cblxuICAvLyBvcHRpb25zIG1heSBpbmNsdWRlIHNvcnQsIHNraXAsIGxpbWl0LCByZWFjdGl2ZVxuICAvLyBzb3J0IG1heSBiZSBhbnkgb2YgdGhlc2UgZm9ybXM6XG4gIC8vICAgICB7YTogMSwgYjogLTF9XG4gIC8vICAgICBbW1wiYVwiLCBcImFzY1wiXSwgW1wiYlwiLCBcImRlc2NcIl1dXG4gIC8vICAgICBbXCJhXCIsIFtcImJcIiwgXCJkZXNjXCJdXVxuICAvLyAgIChpbiB0aGUgZmlyc3QgZm9ybSB5b3UncmUgYmVob2xkZW4gdG8ga2V5IGVudW1lcmF0aW9uIG9yZGVyIGluXG4gIC8vICAgeW91ciBqYXZhc2NyaXB0IFZNKVxuICAvL1xuICAvLyByZWFjdGl2ZTogaWYgZ2l2ZW4sIGFuZCBmYWxzZSwgZG9uJ3QgcmVnaXN0ZXIgd2l0aCBUcmFja2VyIChkZWZhdWx0XG4gIC8vIGlzIHRydWUpXG4gIC8vXG4gIC8vIFhYWCBwb3NzaWJseSBzaG91bGQgc3VwcG9ydCByZXRyaWV2aW5nIGEgc3Vic2V0IG9mIGZpZWxkcz8gYW5kXG4gIC8vIGhhdmUgaXQgYmUgYSBoaW50IChpZ25vcmVkIG9uIHRoZSBjbGllbnQsIHdoZW4gbm90IGNvcHlpbmcgdGhlXG4gIC8vIGRvYz8pXG4gIC8vXG4gIC8vIFhYWCBzb3J0IGRvZXMgbm90IHlldCBzdXBwb3J0IHN1YmtleXMgKCdhLmInKSAuLiBmaXggdGhhdCFcbiAgLy8gWFhYIGFkZCBvbmUgbW9yZSBzb3J0IGZvcm06IFwia2V5XCJcbiAgLy8gWFhYIHRlc3RzXG4gIGZpbmQoc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgICAvLyBkZWZhdWx0IHN5bnRheCBmb3IgZXZlcnl0aGluZyBpcyB0byBvbWl0IHRoZSBzZWxlY3RvciBhcmd1bWVudC5cbiAgICAvLyBidXQgaWYgc2VsZWN0b3IgaXMgZXhwbGljaXRseSBwYXNzZWQgaW4gYXMgZmFsc2Ugb3IgdW5kZWZpbmVkLCB3ZVxuICAgIC8vIHdhbnQgYSBzZWxlY3RvciB0aGF0IG1hdGNoZXMgbm90aGluZy5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2VsZWN0b3IgPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IExvY2FsQ29sbGVjdGlvbi5DdXJzb3IodGhpcywgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICB9XG5cbiAgZmluZE9uZShzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHNlbGVjdG9yID0ge307XG4gICAgfVxuXG4gICAgLy8gTk9URTogYnkgc2V0dGluZyBsaW1pdCAxIGhlcmUsIHdlIGVuZCB1cCB1c2luZyB2ZXJ5IGluZWZmaWNpZW50XG4gICAgLy8gY29kZSB0aGF0IHJlY29tcHV0ZXMgdGhlIHdob2xlIHF1ZXJ5IG9uIGVhY2ggdXBkYXRlLiBUaGUgdXBzaWRlIGlzXG4gICAgLy8gdGhhdCB3aGVuIHlvdSByZWFjdGl2ZWx5IGRlcGVuZCBvbiBhIGZpbmRPbmUgeW91IG9ubHkgZ2V0XG4gICAgLy8gaW52YWxpZGF0ZWQgd2hlbiB0aGUgZm91bmQgb2JqZWN0IGNoYW5nZXMsIG5vdCBhbnkgb2JqZWN0IGluIHRoZVxuICAgIC8vIGNvbGxlY3Rpb24uIE1vc3QgZmluZE9uZSB3aWxsIGJlIGJ5IGlkLCB3aGljaCBoYXMgYSBmYXN0IHBhdGgsIHNvXG4gICAgLy8gdGhpcyBtaWdodCBub3QgYmUgYSBiaWcgZGVhbC4gSW4gbW9zdCBjYXNlcywgaW52YWxpZGF0aW9uIGNhdXNlc1xuICAgIC8vIHRoZSBjYWxsZWQgdG8gcmUtcXVlcnkgYW55d2F5LCBzbyB0aGlzIHNob3VsZCBiZSBhIG5ldCBwZXJmb3JtYW5jZVxuICAgIC8vIGltcHJvdmVtZW50LlxuICAgIG9wdGlvbnMubGltaXQgPSAxO1xuXG4gICAgcmV0dXJuIHRoaXMuZmluZChzZWxlY3Rvciwgb3B0aW9ucykuZmV0Y2goKVswXTtcbiAgfVxuXG4gIC8vIFhYWCBwb3NzaWJseSBlbmZvcmNlIHRoYXQgJ3VuZGVmaW5lZCcgZG9lcyBub3QgYXBwZWFyICh3ZSBhc3N1bWVcbiAgLy8gdGhpcyBpbiBvdXIgaGFuZGxpbmcgb2YgbnVsbCBhbmQgJGV4aXN0cylcbiAgaW5zZXJ0KGRvYywgY2FsbGJhY2spIHtcbiAgICBkb2MgPSBFSlNPTi5jbG9uZShkb2MpO1xuXG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKGRvYyk7XG5cbiAgICAvLyBpZiB5b3UgcmVhbGx5IHdhbnQgdG8gdXNlIE9iamVjdElEcywgc2V0IHRoaXMgZ2xvYmFsLlxuICAgIC8vIE1vbmdvLkNvbGxlY3Rpb24gc3BlY2lmaWVzIGl0cyBvd24gaWRzIGFuZCBkb2VzIG5vdCB1c2UgdGhpcyBjb2RlLlxuICAgIGlmICghaGFzT3duLmNhbGwoZG9jLCAnX2lkJykpIHtcbiAgICAgIGRvYy5faWQgPSBMb2NhbENvbGxlY3Rpb24uX3VzZU9JRCA/IG5ldyBNb25nb0lELk9iamVjdElEKCkgOiBSYW5kb20uaWQoKTtcbiAgICB9XG5cbiAgICBjb25zdCBpZCA9IGRvYy5faWQ7XG5cbiAgICBpZiAodGhpcy5fZG9jcy5oYXMoaWQpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihgRHVwbGljYXRlIF9pZCAnJHtpZH0nYCk7XG4gICAgfVxuXG4gICAgdGhpcy5fc2F2ZU9yaWdpbmFsKGlkLCB1bmRlZmluZWQpO1xuICAgIHRoaXMuX2RvY3Muc2V0KGlkLCBkb2MpO1xuXG4gICAgY29uc3QgcXVlcmllc1RvUmVjb21wdXRlID0gW107XG5cbiAgICAvLyB0cmlnZ2VyIGxpdmUgcXVlcmllcyB0aGF0IG1hdGNoXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IHF1ZXJ5Lm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYyk7XG5cbiAgICAgIGlmIChtYXRjaFJlc3VsdC5yZXN1bHQpIHtcbiAgICAgICAgaWYgKHF1ZXJ5LmRpc3RhbmNlcyAmJiBtYXRjaFJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcXVlcnkuZGlzdGFuY2VzLnNldChpZCwgbWF0Y2hSZXN1bHQuZGlzdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1ZXJ5LmN1cnNvci5za2lwIHx8IHF1ZXJ5LmN1cnNvci5saW1pdCkge1xuICAgICAgICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5wdXNoKHFpZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblJlc3VsdHMocXVlcnksIGRvYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBpZiAodGhpcy5xdWVyaWVzW3FpZF0pIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyh0aGlzLnF1ZXJpZXNbcWlkXSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIC8vIERlZmVyIGJlY2F1c2UgdGhlIGNhbGxlciBsaWtlbHkgZG9lc24ndCBleHBlY3QgdGhlIGNhbGxiYWNrIHRvIGJlIHJ1blxuICAgIC8vIGltbWVkaWF0ZWx5LlxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgTWV0ZW9yLmRlZmVyKCgpID0+IHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgaWQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlkO1xuICB9XG5cbiAgLy8gUGF1c2UgdGhlIG9ic2VydmVycy4gTm8gY2FsbGJhY2tzIGZyb20gb2JzZXJ2ZXJzIHdpbGwgZmlyZSB1bnRpbFxuICAvLyAncmVzdW1lT2JzZXJ2ZXJzJyBpcyBjYWxsZWQuXG4gIHBhdXNlT2JzZXJ2ZXJzKCkge1xuICAgIC8vIE5vLW9wIGlmIGFscmVhZHkgcGF1c2VkLlxuICAgIGlmICh0aGlzLnBhdXNlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNldCB0aGUgJ3BhdXNlZCcgZmxhZyBzdWNoIHRoYXQgbmV3IG9ic2VydmVyIG1lc3NhZ2VzIGRvbid0IGZpcmUuXG4gICAgdGhpcy5wYXVzZWQgPSB0cnVlO1xuXG4gICAgLy8gVGFrZSBhIHNuYXBzaG90IG9mIHRoZSBxdWVyeSByZXN1bHRzIGZvciBlYWNoIHF1ZXJ5LlxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcbiAgICAgIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCA9IEVKU09OLmNsb25lKHF1ZXJ5LnJlc3VsdHMpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVtb3ZlKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIC8vIEVhc3kgc3BlY2lhbCBjYXNlOiBpZiB3ZSdyZSBub3QgY2FsbGluZyBvYnNlcnZlQ2hhbmdlcyBjYWxsYmFja3MgYW5kXG4gICAgLy8gd2UncmUgbm90IHNhdmluZyBvcmlnaW5hbHMgYW5kIHdlIGdvdCBhc2tlZCB0byByZW1vdmUgZXZlcnl0aGluZywgdGhlblxuICAgIC8vIGp1c3QgZW1wdHkgZXZlcnl0aGluZyBkaXJlY3RseS5cbiAgICBpZiAodGhpcy5wYXVzZWQgJiYgIXRoaXMuX3NhdmVkT3JpZ2luYWxzICYmIEVKU09OLmVxdWFscyhzZWxlY3Rvciwge30pKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9kb2NzLnNpemUoKTtcblxuICAgICAgdGhpcy5fZG9jcy5jbGVhcigpO1xuXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgICBpZiAocXVlcnkub3JkZXJlZCkge1xuICAgICAgICAgIHF1ZXJ5LnJlc3VsdHMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxdWVyeS5yZXN1bHRzLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgTWV0ZW9yLmRlZmVyKCgpID0+IHtcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yKTtcbiAgICBjb25zdCByZW1vdmUgPSBbXTtcblxuICAgIHRoaXMuX2VhY2hQb3NzaWJseU1hdGNoaW5nRG9jKHNlbGVjdG9yLCAoZG9jLCBpZCkgPT4ge1xuICAgICAgaWYgKG1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYykucmVzdWx0KSB7XG4gICAgICAgIHJlbW92ZS5wdXNoKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHF1ZXJpZXNUb1JlY29tcHV0ZSA9IFtdO1xuICAgIGNvbnN0IHF1ZXJ5UmVtb3ZlID0gW107XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbW92ZS5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcmVtb3ZlSWQgPSByZW1vdmVbaV07XG4gICAgICBjb25zdCByZW1vdmVEb2MgPSB0aGlzLl9kb2NzLmdldChyZW1vdmVJZCk7XG5cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhyZW1vdmVEb2MpLnJlc3VsdCkge1xuICAgICAgICAgIGlmIChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpIHtcbiAgICAgICAgICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5wdXNoKHFpZCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHF1ZXJ5UmVtb3ZlLnB1c2goe3FpZCwgZG9jOiByZW1vdmVEb2N9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9zYXZlT3JpZ2luYWwocmVtb3ZlSWQsIHJlbW92ZURvYyk7XG4gICAgICB0aGlzLl9kb2NzLnJlbW92ZShyZW1vdmVJZCk7XG4gICAgfVxuXG4gICAgLy8gcnVuIGxpdmUgcXVlcnkgY2FsbGJhY2tzIF9hZnRlcl8gd2UndmUgcmVtb3ZlZCB0aGUgZG9jdW1lbnRzLlxuICAgIHF1ZXJ5UmVtb3ZlLmZvckVhY2gocmVtb3ZlID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3JlbW92ZS5xaWRdO1xuXG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgcXVlcnkuZGlzdGFuY2VzICYmIHF1ZXJ5LmRpc3RhbmNlcy5yZW1vdmUocmVtb3ZlLmRvYy5faWQpO1xuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX3JlbW92ZUZyb21SZXN1bHRzKHF1ZXJ5LCByZW1vdmUuZG9jKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyhxdWVyeSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IHJlbW92ZS5sZW5ndGg7XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gUmVzdW1lIHRoZSBvYnNlcnZlcnMuIE9ic2VydmVycyBpbW1lZGlhdGVseSByZWNlaXZlIGNoYW5nZVxuICAvLyBub3RpZmljYXRpb25zIHRvIGJyaW5nIHRoZW0gdG8gdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlXG4gIC8vIGRhdGFiYXNlLiBOb3RlIHRoYXQgdGhpcyBpcyBub3QganVzdCByZXBsYXlpbmcgYWxsIHRoZSBjaGFuZ2VzIHRoYXRcbiAgLy8gaGFwcGVuZWQgZHVyaW5nIHRoZSBwYXVzZSwgaXQgaXMgYSBzbWFydGVyICdjb2FsZXNjZWQnIGRpZmYuXG4gIHJlc3VtZU9ic2VydmVycygpIHtcbiAgICAvLyBOby1vcCBpZiBub3QgcGF1c2VkLlxuICAgIGlmICghdGhpcy5wYXVzZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBVbnNldCB0aGUgJ3BhdXNlZCcgZmxhZy4gTWFrZSBzdXJlIHRvIGRvIHRoaXMgZmlyc3QsIG90aGVyd2lzZVxuICAgIC8vIG9ic2VydmVyIG1ldGhvZHMgd29uJ3QgYWN0dWFsbHkgZmlyZSB3aGVuIHdlIHRyaWdnZXIgdGhlbS5cbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgcXVlcnkuZGlydHkgPSBmYWxzZTtcblxuICAgICAgICAvLyByZS1jb21wdXRlIHJlc3VsdHMgd2lsbCBwZXJmb3JtIGBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXNgXG4gICAgICAgIC8vIGF1dG9tYXRpY2FsbHkuXG4gICAgICAgIHRoaXMuX3JlY29tcHV0ZVJlc3VsdHMocXVlcnksIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBEaWZmIHRoZSBjdXJyZW50IHJlc3VsdHMgYWdhaW5zdCB0aGUgc25hcHNob3QgYW5kIHNlbmQgdG8gb2JzZXJ2ZXJzLlxuICAgICAgICAvLyBwYXNzIHRoZSBxdWVyeSBvYmplY3QgZm9yIGl0cyBvYnNlcnZlciBjYWxsYmFja3MuXG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5Q2hhbmdlcyhcbiAgICAgICAgICBxdWVyeS5vcmRlcmVkLFxuICAgICAgICAgIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCxcbiAgICAgICAgICBxdWVyeS5yZXN1bHRzLFxuICAgICAgICAgIHF1ZXJ5LFxuICAgICAgICAgIHtwcm9qZWN0aW9uRm46IHF1ZXJ5LnByb2plY3Rpb25Gbn1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcXVlcnkucmVzdWx0c1NuYXBzaG90ID0gbnVsbDtcbiAgICB9KTtcblxuICAgIHRoaXMuX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuICB9XG5cbiAgcmV0cmlldmVPcmlnaW5hbHMoKSB7XG4gICAgaWYgKCF0aGlzLl9zYXZlZE9yaWdpbmFscykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYWxsZWQgcmV0cmlldmVPcmlnaW5hbHMgd2l0aG91dCBzYXZlT3JpZ2luYWxzJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3JpZ2luYWxzID0gdGhpcy5fc2F2ZWRPcmlnaW5hbHM7XG5cbiAgICB0aGlzLl9zYXZlZE9yaWdpbmFscyA9IG51bGw7XG5cbiAgICByZXR1cm4gb3JpZ2luYWxzO1xuICB9XG5cbiAgLy8gVG8gdHJhY2sgd2hhdCBkb2N1bWVudHMgYXJlIGFmZmVjdGVkIGJ5IGEgcGllY2Ugb2YgY29kZSwgY2FsbFxuICAvLyBzYXZlT3JpZ2luYWxzKCkgYmVmb3JlIGl0IGFuZCByZXRyaWV2ZU9yaWdpbmFscygpIGFmdGVyIGl0LlxuICAvLyByZXRyaWV2ZU9yaWdpbmFscyByZXR1cm5zIGFuIG9iamVjdCB3aG9zZSBrZXlzIGFyZSB0aGUgaWRzIG9mIHRoZSBkb2N1bWVudHNcbiAgLy8gdGhhdCB3ZXJlIGFmZmVjdGVkIHNpbmNlIHRoZSBjYWxsIHRvIHNhdmVPcmlnaW5hbHMoKSwgYW5kIHRoZSB2YWx1ZXMgYXJlXG4gIC8vIGVxdWFsIHRvIHRoZSBkb2N1bWVudCdzIGNvbnRlbnRzIGF0IHRoZSB0aW1lIG9mIHNhdmVPcmlnaW5hbHMuIChJbiB0aGUgY2FzZVxuICAvLyBvZiBhbiBpbnNlcnRlZCBkb2N1bWVudCwgdW5kZWZpbmVkIGlzIHRoZSB2YWx1ZS4pIFlvdSBtdXN0IGFsdGVybmF0ZVxuICAvLyBiZXR3ZWVuIGNhbGxzIHRvIHNhdmVPcmlnaW5hbHMoKSBhbmQgcmV0cmlldmVPcmlnaW5hbHMoKS5cbiAgc2F2ZU9yaWdpbmFscygpIHtcbiAgICBpZiAodGhpcy5fc2F2ZWRPcmlnaW5hbHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FsbGVkIHNhdmVPcmlnaW5hbHMgdHdpY2Ugd2l0aG91dCByZXRyaWV2ZU9yaWdpbmFscycpO1xuICAgIH1cblxuICAgIHRoaXMuX3NhdmVkT3JpZ2luYWxzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH1cblxuICAvLyBYWFggYXRvbWljaXR5OiBpZiBtdWx0aSBpcyB0cnVlLCBhbmQgb25lIG1vZGlmaWNhdGlvbiBmYWlscywgZG9cbiAgLy8gd2Ugcm9sbGJhY2sgdGhlIHdob2xlIG9wZXJhdGlvbiwgb3Igd2hhdD9cbiAgdXBkYXRlKHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCEgY2FsbGJhY2sgJiYgb3B0aW9ucyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yLCB0cnVlKTtcblxuICAgIC8vIFNhdmUgdGhlIG9yaWdpbmFsIHJlc3VsdHMgb2YgYW55IHF1ZXJ5IHRoYXQgd2UgbWlnaHQgbmVlZCB0b1xuICAgIC8vIF9yZWNvbXB1dGVSZXN1bHRzIG9uLCBiZWNhdXNlIF9tb2RpZnlBbmROb3RpZnkgd2lsbCBtdXRhdGUgdGhlIG9iamVjdHMgaW5cbiAgICAvLyBpdC4gKFdlIGRvbid0IG5lZWQgdG8gc2F2ZSB0aGUgb3JpZ2luYWwgcmVzdWx0cyBvZiBwYXVzZWQgcXVlcmllcyBiZWNhdXNlXG4gICAgLy8gdGhleSBhbHJlYWR5IGhhdmUgYSByZXN1bHRzU25hcHNob3QgYW5kIHdlIHdvbid0IGJlIGRpZmZpbmcgaW5cbiAgICAvLyBfcmVjb21wdXRlUmVzdWx0cy4pXG4gICAgY29uc3QgcWlkVG9PcmlnaW5hbFJlc3VsdHMgPSB7fTtcblxuICAgIC8vIFdlIHNob3VsZCBvbmx5IGNsb25lIGVhY2ggZG9jdW1lbnQgb25jZSwgZXZlbiBpZiBpdCBhcHBlYXJzIGluIG11bHRpcGxlXG4gICAgLy8gcXVlcmllc1xuICAgIGNvbnN0IGRvY01hcCA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgIGNvbnN0IGlkc01hdGNoZWQgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpICYmICEgdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgLy8gQ2F0Y2ggdGhlIGNhc2Ugb2YgYSByZWFjdGl2ZSBgY291bnQoKWAgb24gYSBjdXJzb3Igd2l0aCBza2lwXG4gICAgICAgIC8vIG9yIGxpbWl0LCB3aGljaCByZWdpc3RlcnMgYW4gdW5vcmRlcmVkIG9ic2VydmUuIFRoaXMgaXMgYVxuICAgICAgICAvLyBwcmV0dHkgcmFyZSBjYXNlLCBzbyB3ZSBqdXN0IGNsb25lIHRoZSBlbnRpcmUgcmVzdWx0IHNldCB3aXRoXG4gICAgICAgIC8vIG5vIG9wdGltaXphdGlvbnMgZm9yIGRvY3VtZW50cyB0aGF0IGFwcGVhciBpbiB0aGVzZSByZXN1bHRcbiAgICAgICAgLy8gc2V0cyBhbmQgb3RoZXIgcXVlcmllcy5cbiAgICAgICAgaWYgKHF1ZXJ5LnJlc3VsdHMgaW5zdGFuY2VvZiBMb2NhbENvbGxlY3Rpb24uX0lkTWFwKSB7XG4gICAgICAgICAgcWlkVG9PcmlnaW5hbFJlc3VsdHNbcWlkXSA9IHF1ZXJ5LnJlc3VsdHMuY2xvbmUoKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIShxdWVyeS5yZXN1bHRzIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NlcnRpb24gZmFpbGVkOiBxdWVyeS5yZXN1bHRzIG5vdCBhbiBhcnJheScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xvbmVzIGEgZG9jdW1lbnQgdG8gYmUgc3RvcmVkIGluIGBxaWRUb09yaWdpbmFsUmVzdWx0c2BcbiAgICAgICAgLy8gYmVjYXVzZSBpdCBtYXkgYmUgbW9kaWZpZWQgYmVmb3JlIHRoZSBuZXcgYW5kIG9sZCByZXN1bHQgc2V0c1xuICAgICAgICAvLyBhcmUgZGlmZmVkLiBCdXQgaWYgd2Uga25vdyBleGFjdGx5IHdoaWNoIGRvY3VtZW50IElEcyB3ZSdyZVxuICAgICAgICAvLyBnb2luZyB0byBtb2RpZnksIHRoZW4gd2Ugb25seSBuZWVkIHRvIGNsb25lIHRob3NlLlxuICAgICAgICBjb25zdCBtZW1vaXplZENsb25lSWZOZWVkZWQgPSBkb2MgPT4ge1xuICAgICAgICAgIGlmIChkb2NNYXAuaGFzKGRvYy5faWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZG9jTWFwLmdldChkb2MuX2lkKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBkb2NUb01lbW9pemUgPSAoXG4gICAgICAgICAgICBpZHNNYXRjaGVkICYmXG4gICAgICAgICAgICAhaWRzTWF0Y2hlZC5zb21lKGlkID0+IEVKU09OLmVxdWFscyhpZCwgZG9jLl9pZCkpXG4gICAgICAgICAgKSA/IGRvYyA6IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgICAgICAgICBkb2NNYXAuc2V0KGRvYy5faWQsIGRvY1RvTWVtb2l6ZSk7XG5cbiAgICAgICAgICByZXR1cm4gZG9jVG9NZW1vaXplO1xuICAgICAgICB9O1xuXG4gICAgICAgIHFpZFRvT3JpZ2luYWxSZXN1bHRzW3FpZF0gPSBxdWVyeS5yZXN1bHRzLm1hcChtZW1vaXplZENsb25lSWZOZWVkZWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVjb21wdXRlUWlkcyA9IHt9O1xuXG4gICAgbGV0IHVwZGF0ZUNvdW50ID0gMDtcblxuICAgIHRoaXMuX2VhY2hQb3NzaWJseU1hdGNoaW5nRG9jKHNlbGVjdG9yLCAoZG9jLCBpZCkgPT4ge1xuICAgICAgY29uc3QgcXVlcnlSZXN1bHQgPSBtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuXG4gICAgICBpZiAocXVlcnlSZXN1bHQucmVzdWx0KSB7XG4gICAgICAgIC8vIFhYWCBTaG91bGQgd2Ugc2F2ZSB0aGUgb3JpZ2luYWwgZXZlbiBpZiBtb2QgZW5kcyB1cCBiZWluZyBhIG5vLW9wP1xuICAgICAgICB0aGlzLl9zYXZlT3JpZ2luYWwoaWQsIGRvYyk7XG4gICAgICAgIHRoaXMuX21vZGlmeUFuZE5vdGlmeShcbiAgICAgICAgICBkb2MsXG4gICAgICAgICAgbW9kLFxuICAgICAgICAgIHJlY29tcHV0ZVFpZHMsXG4gICAgICAgICAgcXVlcnlSZXN1bHQuYXJyYXlJbmRpY2VzXG4gICAgICAgICk7XG5cbiAgICAgICAgKyt1cGRhdGVDb3VudDtcblxuICAgICAgICBpZiAoIW9wdGlvbnMubXVsdGkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyhyZWNvbXB1dGVRaWRzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyhxdWVyeSwgcWlkVG9PcmlnaW5hbFJlc3VsdHNbcWlkXSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIC8vIElmIHdlIGFyZSBkb2luZyBhbiB1cHNlcnQsIGFuZCB3ZSBkaWRuJ3QgbW9kaWZ5IGFueSBkb2N1bWVudHMgeWV0LCB0aGVuXG4gICAgLy8gaXQncyB0aW1lIHRvIGRvIGFuIGluc2VydC4gRmlndXJlIG91dCB3aGF0IGRvY3VtZW50IHdlIGFyZSBpbnNlcnRpbmcsIGFuZFxuICAgIC8vIGdlbmVyYXRlIGFuIGlkIGZvciBpdC5cbiAgICBsZXQgaW5zZXJ0ZWRJZDtcbiAgICBpZiAodXBkYXRlQ291bnQgPT09IDAgJiYgb3B0aW9ucy51cHNlcnQpIHtcbiAgICAgIGNvbnN0IGRvYyA9IExvY2FsQ29sbGVjdGlvbi5fY3JlYXRlVXBzZXJ0RG9jdW1lbnQoc2VsZWN0b3IsIG1vZCk7XG4gICAgICBpZiAoISBkb2MuX2lkICYmIG9wdGlvbnMuaW5zZXJ0ZWRJZCkge1xuICAgICAgICBkb2MuX2lkID0gb3B0aW9ucy5pbnNlcnRlZElkO1xuICAgICAgfVxuXG4gICAgICBpbnNlcnRlZElkID0gdGhpcy5pbnNlcnQoZG9jKTtcbiAgICAgIHVwZGF0ZUNvdW50ID0gMTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2N1bWVudHMsIG9yIGluIHRoZSB1cHNlcnQgY2FzZSwgYW4gb2JqZWN0XG4gICAgLy8gY29udGFpbmluZyB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3MgYW5kIHRoZSBpZCBvZiB0aGUgZG9jIHRoYXQgd2FzXG4gICAgLy8gaW5zZXJ0ZWQsIGlmIGFueS5cbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmIChvcHRpb25zLl9yZXR1cm5PYmplY3QpIHtcbiAgICAgIHJlc3VsdCA9IHtudW1iZXJBZmZlY3RlZDogdXBkYXRlQ291bnR9O1xuXG4gICAgICBpZiAoaW5zZXJ0ZWRJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdC5pbnNlcnRlZElkID0gaW5zZXJ0ZWRJZDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gdXBkYXRlQ291bnQ7XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBNZXRlb3IuZGVmZXIoKCkgPT4ge1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIEEgY29udmVuaWVuY2Ugd3JhcHBlciBvbiB1cGRhdGUuIExvY2FsQ29sbGVjdGlvbi51cHNlcnQoc2VsLCBtb2QpIGlzXG4gIC8vIGVxdWl2YWxlbnQgdG8gTG9jYWxDb2xsZWN0aW9uLnVwZGF0ZShzZWwsIG1vZCwge3Vwc2VydDogdHJ1ZSxcbiAgLy8gX3JldHVybk9iamVjdDogdHJ1ZX0pLlxuICB1cHNlcnQoc2VsZWN0b3IsIG1vZCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBtb2QsXG4gICAgICBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7dXBzZXJ0OiB0cnVlLCBfcmV0dXJuT2JqZWN0OiB0cnVlfSksXG4gICAgICBjYWxsYmFja1xuICAgICk7XG4gIH1cblxuICAvLyBJdGVyYXRlcyBvdmVyIGEgc3Vic2V0IG9mIGRvY3VtZW50cyB0aGF0IGNvdWxkIG1hdGNoIHNlbGVjdG9yOyBjYWxsc1xuICAvLyBmbihkb2MsIGlkKSBvbiBlYWNoIG9mIHRoZW0uICBTcGVjaWZpY2FsbHksIGlmIHNlbGVjdG9yIHNwZWNpZmllc1xuICAvLyBzcGVjaWZpYyBfaWQncywgaXQgb25seSBsb29rcyBhdCB0aG9zZS4gIGRvYyBpcyAqbm90KiBjbG9uZWQ6IGl0IGlzIHRoZVxuICAvLyBzYW1lIG9iamVjdCB0aGF0IGlzIGluIF9kb2NzLlxuICBfZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2Moc2VsZWN0b3IsIGZuKSB7XG4gICAgY29uc3Qgc3BlY2lmaWNJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcblxuICAgIGlmIChzcGVjaWZpY0lkcykge1xuICAgICAgc3BlY2lmaWNJZHMuc29tZShpZCA9PiB7XG4gICAgICAgIGNvbnN0IGRvYyA9IHRoaXMuX2RvY3MuZ2V0KGlkKTtcblxuICAgICAgICBpZiAoZG9jKSB7XG4gICAgICAgICAgcmV0dXJuIGZuKGRvYywgaWQpID09PSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2RvY3MuZm9yRWFjaChmbik7XG4gICAgfVxuICB9XG5cbiAgX21vZGlmeUFuZE5vdGlmeShkb2MsIG1vZCwgcmVjb21wdXRlUWlkcywgYXJyYXlJbmRpY2VzKSB7XG4gICAgY29uc3QgbWF0Y2hlZF9iZWZvcmUgPSB7fTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICAgICAgbWF0Y2hlZF9iZWZvcmVbcWlkXSA9IHF1ZXJ5Lm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYykucmVzdWx0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQmVjYXVzZSB3ZSBkb24ndCBzdXBwb3J0IHNraXAgb3IgbGltaXQgKHlldCkgaW4gdW5vcmRlcmVkIHF1ZXJpZXMsIHdlXG4gICAgICAgIC8vIGNhbiBqdXN0IGRvIGEgZGlyZWN0IGxvb2t1cC5cbiAgICAgICAgbWF0Y2hlZF9iZWZvcmVbcWlkXSA9IHF1ZXJ5LnJlc3VsdHMuaGFzKGRvYy5faWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3Qgb2xkX2RvYyA9IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShkb2MsIG1vZCwge2FycmF5SW5kaWNlc30pO1xuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhZnRlck1hdGNoID0gcXVlcnkubWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKTtcbiAgICAgIGNvbnN0IGFmdGVyID0gYWZ0ZXJNYXRjaC5yZXN1bHQ7XG4gICAgICBjb25zdCBiZWZvcmUgPSBtYXRjaGVkX2JlZm9yZVtxaWRdO1xuXG4gICAgICBpZiAoYWZ0ZXIgJiYgcXVlcnkuZGlzdGFuY2VzICYmIGFmdGVyTWF0Y2guZGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBxdWVyeS5kaXN0YW5jZXMuc2V0KGRvYy5faWQsIGFmdGVyTWF0Y2guZGlzdGFuY2UpO1xuICAgICAgfVxuXG4gICAgICBpZiAocXVlcnkuY3Vyc29yLnNraXAgfHwgcXVlcnkuY3Vyc29yLmxpbWl0KSB7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gcmVjb21wdXRlIGFueSBxdWVyeSB3aGVyZSB0aGUgZG9jIG1heSBoYXZlIGJlZW4gaW4gdGhlXG4gICAgICAgIC8vIGN1cnNvcidzIHdpbmRvdyBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSB1cGRhdGUuIChOb3RlIHRoYXQgaWYgc2tpcFxuICAgICAgICAvLyBvciBsaW1pdCBpcyBzZXQsIFwiYmVmb3JlXCIgYW5kIFwiYWZ0ZXJcIiBiZWluZyB0cnVlIGRvIG5vdCBuZWNlc3NhcmlseVxuICAgICAgICAvLyBtZWFuIHRoYXQgdGhlIGRvY3VtZW50IGlzIGluIHRoZSBjdXJzb3IncyBvdXRwdXQgYWZ0ZXIgc2tpcC9saW1pdCBpc1xuICAgICAgICAvLyBhcHBsaWVkLi4uIGJ1dCBpZiB0aGV5IGFyZSBmYWxzZSwgdGhlbiB0aGUgZG9jdW1lbnQgZGVmaW5pdGVseSBpcyBOT1RcbiAgICAgICAgLy8gaW4gdGhlIG91dHB1dC4gU28gaXQncyBzYWZlIHRvIHNraXAgcmVjb21wdXRlIGlmIG5laXRoZXIgYmVmb3JlIG9yXG4gICAgICAgIC8vIGFmdGVyIGFyZSB0cnVlLilcbiAgICAgICAgaWYgKGJlZm9yZSB8fCBhZnRlcikge1xuICAgICAgICAgIHJlY29tcHV0ZVFpZHNbcWlkXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYmVmb3JlICYmICFhZnRlcikge1xuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX3JlbW92ZUZyb21SZXN1bHRzKHF1ZXJ5LCBkb2MpO1xuICAgICAgfSBlbHNlIGlmICghYmVmb3JlICYmIGFmdGVyKSB7XG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5SZXN1bHRzKHF1ZXJ5LCBkb2MpO1xuICAgICAgfSBlbHNlIGlmIChiZWZvcmUgJiYgYWZ0ZXIpIHtcbiAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl91cGRhdGVJblJlc3VsdHMocXVlcnksIGRvYywgb2xkX2RvYyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyBSZWNvbXB1dGVzIHRoZSByZXN1bHRzIG9mIGEgcXVlcnkgYW5kIHJ1bnMgb2JzZXJ2ZSBjYWxsYmFja3MgZm9yIHRoZVxuICAvLyBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIHByZXZpb3VzIHJlc3VsdHMgYW5kIHRoZSBjdXJyZW50IHJlc3VsdHMgKHVubGVzc1xuICAvLyBwYXVzZWQpLiBVc2VkIGZvciBza2lwL2xpbWl0IHF1ZXJpZXMuXG4gIC8vXG4gIC8vIFdoZW4gdGhpcyBpcyB1c2VkIGJ5IGluc2VydCBvciByZW1vdmUsIGl0IGNhbiBqdXN0IHVzZSBxdWVyeS5yZXN1bHRzIGZvclxuICAvLyB0aGUgb2xkIHJlc3VsdHMgKGFuZCB0aGVyZSdzIG5vIG5lZWQgdG8gcGFzcyBpbiBvbGRSZXN1bHRzKSwgYmVjYXVzZSB0aGVzZVxuICAvLyBvcGVyYXRpb25zIGRvbid0IG11dGF0ZSB0aGUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLiBVcGRhdGUgbmVlZHMgdG9cbiAgLy8gcGFzcyBpbiBhbiBvbGRSZXN1bHRzIHdoaWNoIHdhcyBkZWVwLWNvcGllZCBiZWZvcmUgdGhlIG1vZGlmaWVyIHdhc1xuICAvLyBhcHBsaWVkLlxuICAvL1xuICAvLyBvbGRSZXN1bHRzIGlzIGd1YXJhbnRlZWQgdG8gYmUgaWdub3JlZCBpZiB0aGUgcXVlcnkgaXMgbm90IHBhdXNlZC5cbiAgX3JlY29tcHV0ZVJlc3VsdHMocXVlcnksIG9sZFJlc3VsdHMpIHtcbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgIC8vIFRoZXJlJ3Mgbm8gcmVhc29uIHRvIHJlY29tcHV0ZSB0aGUgcmVzdWx0cyBub3cgYXMgd2UncmUgc3RpbGwgcGF1c2VkLlxuICAgICAgLy8gQnkgZmxhZ2dpbmcgdGhlIHF1ZXJ5IGFzIFwiZGlydHlcIiwgdGhlIHJlY29tcHV0ZSB3aWxsIGJlIHBlcmZvcm1lZFxuICAgICAgLy8gd2hlbiByZXN1bWVPYnNlcnZlcnMgaXMgY2FsbGVkLlxuICAgICAgcXVlcnkuZGlydHkgPSB0cnVlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5wYXVzZWQgJiYgIW9sZFJlc3VsdHMpIHtcbiAgICAgIG9sZFJlc3VsdHMgPSBxdWVyeS5yZXN1bHRzO1xuICAgIH1cblxuICAgIGlmIChxdWVyeS5kaXN0YW5jZXMpIHtcbiAgICAgIHF1ZXJ5LmRpc3RhbmNlcy5jbGVhcigpO1xuICAgIH1cblxuICAgIHF1ZXJ5LnJlc3VsdHMgPSBxdWVyeS5jdXJzb3IuX2dldFJhd09iamVjdHMoe1xuICAgICAgZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXMsXG4gICAgICBvcmRlcmVkOiBxdWVyeS5vcmRlcmVkXG4gICAgfSk7XG5cbiAgICBpZiAoIXRoaXMucGF1c2VkKSB7XG4gICAgICBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXMoXG4gICAgICAgIHF1ZXJ5Lm9yZGVyZWQsXG4gICAgICAgIG9sZFJlc3VsdHMsXG4gICAgICAgIHF1ZXJ5LnJlc3VsdHMsXG4gICAgICAgIHF1ZXJ5LFxuICAgICAgICB7cHJvamVjdGlvbkZuOiBxdWVyeS5wcm9qZWN0aW9uRm59XG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIF9zYXZlT3JpZ2luYWwoaWQsIGRvYykge1xuICAgIC8vIEFyZSB3ZSBldmVuIHRyeWluZyB0byBzYXZlIG9yaWdpbmFscz9cbiAgICBpZiAoIXRoaXMuX3NhdmVkT3JpZ2luYWxzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSGF2ZSB3ZSBwcmV2aW91c2x5IG11dGF0ZWQgdGhlIG9yaWdpbmFsIChhbmQgc28gJ2RvYycgaXMgbm90IGFjdHVhbGx5XG4gICAgLy8gb3JpZ2luYWwpPyAgKE5vdGUgdGhlICdoYXMnIGNoZWNrIHJhdGhlciB0aGFuIHRydXRoOiB3ZSBzdG9yZSB1bmRlZmluZWRcbiAgICAvLyBoZXJlIGZvciBpbnNlcnRlZCBkb2NzISlcbiAgICBpZiAodGhpcy5fc2F2ZWRPcmlnaW5hbHMuaGFzKGlkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3NhdmVkT3JpZ2luYWxzLnNldChpZCwgRUpTT04uY2xvbmUoZG9jKSk7XG4gIH1cbn1cblxuTG9jYWxDb2xsZWN0aW9uLkN1cnNvciA9IEN1cnNvcjtcblxuTG9jYWxDb2xsZWN0aW9uLk9ic2VydmVIYW5kbGUgPSBPYnNlcnZlSGFuZGxlO1xuXG4vLyBYWFggbWF5YmUgbW92ZSB0aGVzZSBpbnRvIGFub3RoZXIgT2JzZXJ2ZUhlbHBlcnMgcGFja2FnZSBvciBzb21ldGhpbmdcblxuLy8gX0NhY2hpbmdDaGFuZ2VPYnNlcnZlciBpcyBhbiBvYmplY3Qgd2hpY2ggcmVjZWl2ZXMgb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2tzXG4vLyBhbmQga2VlcHMgYSBjYWNoZSBvZiB0aGUgY3VycmVudCBjdXJzb3Igc3RhdGUgdXAgdG8gZGF0ZSBpbiB0aGlzLmRvY3MuIFVzZXJzXG4vLyBvZiB0aGlzIGNsYXNzIHNob3VsZCByZWFkIHRoZSBkb2NzIGZpZWxkIGJ1dCBub3QgbW9kaWZ5IGl0LiBZb3Ugc2hvdWxkIHBhc3Ncbi8vIHRoZSBcImFwcGx5Q2hhbmdlXCIgZmllbGQgYXMgdGhlIGNhbGxiYWNrcyB0byB0aGUgdW5kZXJseWluZyBvYnNlcnZlQ2hhbmdlc1xuLy8gY2FsbC4gT3B0aW9uYWxseSwgeW91IGNhbiBzcGVjaWZ5IHlvdXIgb3duIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrcyB3aGljaCBhcmVcbi8vIGludm9rZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBkb2NzIGZpZWxkIGlzIHVwZGF0ZWQ7IHRoaXMgb2JqZWN0IGlzIG1hZGVcbi8vIGF2YWlsYWJsZSBhcyBgdGhpc2AgdG8gdGhvc2UgY2FsbGJhY2tzLlxuTG9jYWxDb2xsZWN0aW9uLl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIgPSBjbGFzcyBfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgb3JkZXJlZEZyb21DYWxsYmFja3MgPSAoXG4gICAgICBvcHRpb25zLmNhbGxiYWNrcyAmJlxuICAgICAgTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQob3B0aW9ucy5jYWxsYmFja3MpXG4gICAgKTtcblxuICAgIGlmIChoYXNPd24uY2FsbChvcHRpb25zLCAnb3JkZXJlZCcpKSB7XG4gICAgICB0aGlzLm9yZGVyZWQgPSBvcHRpb25zLm9yZGVyZWQ7XG5cbiAgICAgIGlmIChvcHRpb25zLmNhbGxiYWNrcyAmJiBvcHRpb25zLm9yZGVyZWQgIT09IG9yZGVyZWRGcm9tQ2FsbGJhY2tzKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdvcmRlcmVkIG9wdGlvbiBkb2VzblxcJ3QgbWF0Y2ggY2FsbGJhY2tzJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNhbGxiYWNrcykge1xuICAgICAgdGhpcy5vcmRlcmVkID0gb3JkZXJlZEZyb21DYWxsYmFja3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKCdtdXN0IHByb3ZpZGUgb3JkZXJlZCBvciBjYWxsYmFja3MnKTtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxsYmFja3MgPSBvcHRpb25zLmNhbGxiYWNrcyB8fCB7fTtcblxuICAgIGlmICh0aGlzLm9yZGVyZWQpIHtcbiAgICAgIHRoaXMuZG9jcyA9IG5ldyBPcmRlcmVkRGljdChNb25nb0lELmlkU3RyaW5naWZ5KTtcbiAgICAgIHRoaXMuYXBwbHlDaGFuZ2UgPSB7XG4gICAgICAgIGFkZGVkQmVmb3JlOiAoaWQsIGZpZWxkcywgYmVmb3JlKSA9PiB7XG4gICAgICAgICAgLy8gVGFrZSBhIHNoYWxsb3cgY29weSBzaW5jZSB0aGUgdG9wLWxldmVsIHByb3BlcnRpZXMgY2FuIGJlIGNoYW5nZWRcbiAgICAgICAgICBjb25zdCBkb2MgPSB7IC4uLmZpZWxkcyB9O1xuXG4gICAgICAgICAgZG9jLl9pZCA9IGlkO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5hZGRlZEJlZm9yZSkge1xuICAgICAgICAgICAgY2FsbGJhY2tzLmFkZGVkQmVmb3JlLmNhbGwodGhpcywgaWQsIEVKU09OLmNsb25lKGZpZWxkcyksIGJlZm9yZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVGhpcyBsaW5lIHRyaWdnZXJzIGlmIHdlIHByb3ZpZGUgYWRkZWQgd2l0aCBtb3ZlZEJlZm9yZS5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzLmFkZGVkKSB7XG4gICAgICAgICAgICBjYWxsYmFja3MuYWRkZWQuY2FsbCh0aGlzLCBpZCwgRUpTT04uY2xvbmUoZmllbGRzKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gWFhYIGNvdWxkIGBiZWZvcmVgIGJlIGEgZmFsc3kgSUQ/ICBUZWNobmljYWxseVxuICAgICAgICAgIC8vIGlkU3RyaW5naWZ5IHNlZW1zIHRvIGFsbG93IGZvciB0aGVtIC0tIHRob3VnaFxuICAgICAgICAgIC8vIE9yZGVyZWREaWN0IHdvbid0IGNhbGwgc3RyaW5naWZ5IG9uIGEgZmFsc3kgYXJnLlxuICAgICAgICAgIHRoaXMuZG9jcy5wdXRCZWZvcmUoaWQsIGRvYywgYmVmb3JlIHx8IG51bGwpO1xuICAgICAgICB9LFxuICAgICAgICBtb3ZlZEJlZm9yZTogKGlkLCBiZWZvcmUpID0+IHtcbiAgICAgICAgICBjb25zdCBkb2MgPSB0aGlzLmRvY3MuZ2V0KGlkKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFja3MubW92ZWRCZWZvcmUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5tb3ZlZEJlZm9yZS5jYWxsKHRoaXMsIGlkLCBiZWZvcmUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuZG9jcy5tb3ZlQmVmb3JlKGlkLCBiZWZvcmUgfHwgbnVsbCk7XG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRvY3MgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIHRoaXMuYXBwbHlDaGFuZ2UgPSB7XG4gICAgICAgIGFkZGVkOiAoaWQsIGZpZWxkcykgPT4ge1xuICAgICAgICAgIC8vIFRha2UgYSBzaGFsbG93IGNvcHkgc2luY2UgdGhlIHRvcC1sZXZlbCBwcm9wZXJ0aWVzIGNhbiBiZSBjaGFuZ2VkXG4gICAgICAgICAgY29uc3QgZG9jID0geyAuLi5maWVsZHMgfTtcblxuICAgICAgICAgIGlmIChjYWxsYmFja3MuYWRkZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5hZGRlZC5jYWxsKHRoaXMsIGlkLCBFSlNPTi5jbG9uZShmaWVsZHMpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkb2MuX2lkID0gaWQ7XG5cbiAgICAgICAgICB0aGlzLmRvY3Muc2V0KGlkLCAgZG9jKTtcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVGhlIG1ldGhvZHMgaW4gX0lkTWFwIGFuZCBPcmRlcmVkRGljdCB1c2VkIGJ5IHRoZXNlIGNhbGxiYWNrcyBhcmVcbiAgICAvLyBpZGVudGljYWwuXG4gICAgdGhpcy5hcHBseUNoYW5nZS5jaGFuZ2VkID0gKGlkLCBmaWVsZHMpID0+IHtcbiAgICAgIGNvbnN0IGRvYyA9IHRoaXMuZG9jcy5nZXQoaWQpO1xuXG4gICAgICBpZiAoIWRvYykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gaWQgZm9yIGNoYW5nZWQ6ICR7aWR9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjYWxsYmFja3MuY2hhbmdlZCkge1xuICAgICAgICBjYWxsYmFja3MuY2hhbmdlZC5jYWxsKHRoaXMsIGlkLCBFSlNPTi5jbG9uZShmaWVsZHMpKTtcbiAgICAgIH1cblxuICAgICAgRGlmZlNlcXVlbmNlLmFwcGx5Q2hhbmdlcyhkb2MsIGZpZWxkcyk7XG4gICAgfTtcblxuICAgIHRoaXMuYXBwbHlDaGFuZ2UucmVtb3ZlZCA9IGlkID0+IHtcbiAgICAgIGlmIChjYWxsYmFja3MucmVtb3ZlZCkge1xuICAgICAgICBjYWxsYmFja3MucmVtb3ZlZC5jYWxsKHRoaXMsIGlkKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5kb2NzLnJlbW92ZShpZCk7XG4gICAgfTtcbiAgfVxufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCA9IGNsYXNzIF9JZE1hcCBleHRlbmRzIElkTWFwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoTW9uZ29JRC5pZFN0cmluZ2lmeSwgTW9uZ29JRC5pZFBhcnNlKTtcbiAgfVxufTtcblxuLy8gV3JhcCBhIHRyYW5zZm9ybSBmdW5jdGlvbiB0byByZXR1cm4gb2JqZWN0cyB0aGF0IGhhdmUgdGhlIF9pZCBmaWVsZFxuLy8gb2YgdGhlIHVudHJhbnNmb3JtZWQgZG9jdW1lbnQuIFRoaXMgZW5zdXJlcyB0aGF0IHN1YnN5c3RlbXMgc3VjaCBhc1xuLy8gdGhlIG9ic2VydmUtc2VxdWVuY2UgcGFja2FnZSB0aGF0IGNhbGwgYG9ic2VydmVgIGNhbiBrZWVwIHRyYWNrIG9mXG4vLyB0aGUgZG9jdW1lbnRzIGlkZW50aXRpZXMuXG4vL1xuLy8gLSBSZXF1aXJlIHRoYXQgaXQgcmV0dXJucyBvYmplY3RzXG4vLyAtIElmIHRoZSByZXR1cm4gdmFsdWUgaGFzIGFuIF9pZCBmaWVsZCwgdmVyaWZ5IHRoYXQgaXQgbWF0Y2hlcyB0aGVcbi8vICAgb3JpZ2luYWwgX2lkIGZpZWxkXG4vLyAtIElmIHRoZSByZXR1cm4gdmFsdWUgZG9lc24ndCBoYXZlIGFuIF9pZCBmaWVsZCwgYWRkIGl0IGJhY2suXG5Mb2NhbENvbGxlY3Rpb24ud3JhcFRyYW5zZm9ybSA9IHRyYW5zZm9ybSA9PiB7XG4gIGlmICghdHJhbnNmb3JtKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBObyBuZWVkIHRvIGRvdWJseS13cmFwIHRyYW5zZm9ybXMuXG4gIGlmICh0cmFuc2Zvcm0uX193cmFwcGVkVHJhbnNmb3JtX18pIHtcbiAgICByZXR1cm4gdHJhbnNmb3JtO1xuICB9XG5cbiAgY29uc3Qgd3JhcHBlZCA9IGRvYyA9PiB7XG4gICAgaWYgKCFoYXNPd24uY2FsbChkb2MsICdfaWQnKSkge1xuICAgICAgLy8gWFhYIGRvIHdlIGV2ZXIgaGF2ZSBhIHRyYW5zZm9ybSBvbiB0aGUgb3Bsb2cncyBjb2xsZWN0aW9uPyBiZWNhdXNlIHRoYXRcbiAgICAgIC8vIGNvbGxlY3Rpb24gaGFzIG5vIF9pZC5cbiAgICAgIHRocm93IG5ldyBFcnJvcignY2FuIG9ubHkgdHJhbnNmb3JtIGRvY3VtZW50cyB3aXRoIF9pZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gZG9jLl9pZDtcblxuICAgIC8vIFhYWCBjb25zaWRlciBtYWtpbmcgdHJhY2tlciBhIHdlYWsgZGVwZW5kZW5jeSBhbmQgY2hlY2tpbmdcbiAgICAvLyBQYWNrYWdlLnRyYWNrZXIgaGVyZVxuICAgIGNvbnN0IHRyYW5zZm9ybWVkID0gVHJhY2tlci5ub25yZWFjdGl2ZSgoKSA9PiB0cmFuc2Zvcm0oZG9jKSk7XG5cbiAgICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdCh0cmFuc2Zvcm1lZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndHJhbnNmb3JtIG11c3QgcmV0dXJuIG9iamVjdCcpO1xuICAgIH1cblxuICAgIGlmIChoYXNPd24uY2FsbCh0cmFuc2Zvcm1lZCwgJ19pZCcpKSB7XG4gICAgICBpZiAoIUVKU09OLmVxdWFscyh0cmFuc2Zvcm1lZC5faWQsIGlkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RyYW5zZm9ybWVkIGRvY3VtZW50IGNhblxcJ3QgaGF2ZSBkaWZmZXJlbnQgX2lkJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyYW5zZm9ybWVkLl9pZCA9IGlkO1xuICAgIH1cblxuICAgIHJldHVybiB0cmFuc2Zvcm1lZDtcbiAgfTtcblxuICB3cmFwcGVkLl9fd3JhcHBlZFRyYW5zZm9ybV9fID0gdHJ1ZTtcblxuICByZXR1cm4gd3JhcHBlZDtcbn07XG5cbi8vIFhYWCB0aGUgc29ydGVkLXF1ZXJ5IGxvZ2ljIGJlbG93IGlzIGxhdWdoYWJseSBpbmVmZmljaWVudC4gd2UnbGxcbi8vIG5lZWQgdG8gY29tZSB1cCB3aXRoIGEgYmV0dGVyIGRhdGFzdHJ1Y3R1cmUgZm9yIHRoaXMuXG4vL1xuLy8gWFhYIHRoZSBsb2dpYyBmb3Igb2JzZXJ2aW5nIHdpdGggYSBza2lwIG9yIGEgbGltaXQgaXMgZXZlbiBtb3JlXG4vLyBsYXVnaGFibHkgaW5lZmZpY2llbnQuIHdlIHJlY29tcHV0ZSB0aGUgd2hvbGUgcmVzdWx0cyBldmVyeSB0aW1lIVxuXG4vLyBUaGlzIGJpbmFyeSBzZWFyY2ggcHV0cyBhIHZhbHVlIGJldHdlZW4gYW55IGVxdWFsIHZhbHVlcywgYW5kIHRoZSBmaXJzdFxuLy8gbGVzc2VyIHZhbHVlLlxuTG9jYWxDb2xsZWN0aW9uLl9iaW5hcnlTZWFyY2ggPSAoY21wLCBhcnJheSwgdmFsdWUpID0+IHtcbiAgbGV0IGZpcnN0ID0gMDtcbiAgbGV0IHJhbmdlID0gYXJyYXkubGVuZ3RoO1xuXG4gIHdoaWxlIChyYW5nZSA+IDApIHtcbiAgICBjb25zdCBoYWxmUmFuZ2UgPSBNYXRoLmZsb29yKHJhbmdlIC8gMik7XG5cbiAgICBpZiAoY21wKHZhbHVlLCBhcnJheVtmaXJzdCArIGhhbGZSYW5nZV0pID49IDApIHtcbiAgICAgIGZpcnN0ICs9IGhhbGZSYW5nZSArIDE7XG4gICAgICByYW5nZSAtPSBoYWxmUmFuZ2UgKyAxO1xuICAgIH0gZWxzZSB7XG4gICAgICByYW5nZSA9IGhhbGZSYW5nZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmlyc3Q7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbiA9IGZpZWxkcyA9PiB7XG4gIGlmIChmaWVsZHMgIT09IE9iamVjdChmaWVsZHMpIHx8IEFycmF5LmlzQXJyYXkoZmllbGRzKSkge1xuICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdmaWVsZHMgb3B0aW9uIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gIH1cblxuICBPYmplY3Qua2V5cyhmaWVsZHMpLmZvckVhY2goa2V5UGF0aCA9PiB7XG4gICAgaWYgKGtleVBhdGguc3BsaXQoJy4nKS5pbmNsdWRlcygnJCcpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ01pbmltb25nbyBkb2VzblxcJ3Qgc3VwcG9ydCAkIG9wZXJhdG9yIGluIHByb2plY3Rpb25zIHlldC4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gZmllbGRzW2tleVBhdGhdO1xuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgWyckZWxlbU1hdGNoJywgJyRtZXRhJywgJyRzbGljZSddLnNvbWUoa2V5ID0+XG4gICAgICAgICAgaGFzT3duLmNhbGwodmFsdWUsIGtleSlcbiAgICAgICAgKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdNaW5pbW9uZ28gZG9lc25cXCd0IHN1cHBvcnQgb3BlcmF0b3JzIGluIHByb2plY3Rpb25zIHlldC4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghWzEsIDAsIHRydWUsIGZhbHNlXS5pbmNsdWRlcyh2YWx1ZSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnUHJvamVjdGlvbiB2YWx1ZXMgc2hvdWxkIGJlIG9uZSBvZiAxLCAwLCB0cnVlLCBvciBmYWxzZSdcbiAgICAgICk7XG4gICAgfVxuICB9KTtcbn07XG5cbi8vIEtub3dzIGhvdyB0byBjb21waWxlIGEgZmllbGRzIHByb2plY3Rpb24gdG8gYSBwcmVkaWNhdGUgZnVuY3Rpb24uXG4vLyBAcmV0dXJucyAtIEZ1bmN0aW9uOiBhIGNsb3N1cmUgdGhhdCBmaWx0ZXJzIG91dCBhbiBvYmplY3QgYWNjb3JkaW5nIHRvIHRoZVxuLy8gICAgICAgICAgICBmaWVsZHMgcHJvamVjdGlvbiBydWxlczpcbi8vICAgICAgICAgICAgQHBhcmFtIG9iaiAtIE9iamVjdDogTW9uZ29EQi1zdHlsZWQgZG9jdW1lbnRcbi8vICAgICAgICAgICAgQHJldHVybnMgLSBPYmplY3Q6IGEgZG9jdW1lbnQgd2l0aCB0aGUgZmllbGRzIGZpbHRlcmVkIG91dFxuLy8gICAgICAgICAgICAgICAgICAgICAgIGFjY29yZGluZyB0byBwcm9qZWN0aW9uIHJ1bGVzLiBEb2Vzbid0IHJldGFpbiBzdWJmaWVsZHNcbi8vICAgICAgICAgICAgICAgICAgICAgICBvZiBwYXNzZWQgYXJndW1lbnQuXG5Mb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uID0gZmllbGRzID0+IHtcbiAgTG9jYWxDb2xsZWN0aW9uLl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24oZmllbGRzKTtcblxuICBjb25zdCBfaWRQcm9qZWN0aW9uID0gZmllbGRzLl9pZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGZpZWxkcy5faWQ7XG4gIGNvbnN0IGRldGFpbHMgPSBwcm9qZWN0aW9uRGV0YWlscyhmaWVsZHMpO1xuXG4gIC8vIHJldHVybnMgdHJhbnNmb3JtZWQgZG9jIGFjY29yZGluZyB0byBydWxlVHJlZVxuICBjb25zdCB0cmFuc2Zvcm0gPSAoZG9jLCBydWxlVHJlZSkgPT4ge1xuICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgXCJzZXRzXCJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkb2MpKSB7XG4gICAgICByZXR1cm4gZG9jLm1hcChzdWJkb2MgPT4gdHJhbnNmb3JtKHN1YmRvYywgcnVsZVRyZWUpKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBkZXRhaWxzLmluY2x1ZGluZyA/IHt9IDogRUpTT04uY2xvbmUoZG9jKTtcblxuICAgIE9iamVjdC5rZXlzKHJ1bGVUcmVlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBpZiAoZG9jID09IG51bGwgfHwgIWhhc093bi5jYWxsKGRvYywga2V5KSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJ1bGUgPSBydWxlVHJlZVtrZXldO1xuXG4gICAgICBpZiAocnVsZSA9PT0gT2JqZWN0KHJ1bGUpKSB7XG4gICAgICAgIC8vIEZvciBzdWItb2JqZWN0cy9zdWJzZXRzIHdlIGJyYW5jaFxuICAgICAgICBpZiAoZG9jW2tleV0gPT09IE9iamVjdChkb2Nba2V5XSkpIHtcbiAgICAgICAgICByZXN1bHRba2V5XSA9IHRyYW5zZm9ybShkb2Nba2V5XSwgcnVsZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZGV0YWlscy5pbmNsdWRpbmcpIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIHdlIGRvbid0IGV2ZW4gdG91Y2ggdGhpcyBzdWJmaWVsZFxuICAgICAgICByZXN1bHRba2V5XSA9IEVKU09OLmNsb25lKGRvY1trZXldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSByZXN1bHRba2V5XTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBkb2MgIT0gbnVsbCA/IHJlc3VsdCA6IGRvYztcbiAgfTtcblxuICByZXR1cm4gZG9jID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm0oZG9jLCBkZXRhaWxzLnRyZWUpO1xuXG4gICAgaWYgKF9pZFByb2plY3Rpb24gJiYgaGFzT3duLmNhbGwoZG9jLCAnX2lkJykpIHtcbiAgICAgIHJlc3VsdC5faWQgPSBkb2MuX2lkO1xuICAgIH1cblxuICAgIGlmICghX2lkUHJvamVjdGlvbiAmJiBoYXNPd24uY2FsbChyZXN1bHQsICdfaWQnKSkge1xuICAgICAgZGVsZXRlIHJlc3VsdC5faWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn07XG5cbi8vIENhbGN1bGF0ZXMgdGhlIGRvY3VtZW50IHRvIGluc2VydCBpbiBjYXNlIHdlJ3JlIGRvaW5nIGFuIHVwc2VydCBhbmQgdGhlXG4vLyBzZWxlY3RvciBkb2VzIG5vdCBtYXRjaCBhbnkgZWxlbWVudHNcbkxvY2FsQ29sbGVjdGlvbi5fY3JlYXRlVXBzZXJ0RG9jdW1lbnQgPSAoc2VsZWN0b3IsIG1vZGlmaWVyKSA9PiB7XG4gIGNvbnN0IHNlbGVjdG9yRG9jdW1lbnQgPSBwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzKHNlbGVjdG9yKTtcbiAgY29uc3QgaXNNb2RpZnkgPSBMb2NhbENvbGxlY3Rpb24uX2lzTW9kaWZpY2F0aW9uTW9kKG1vZGlmaWVyKTtcblxuICBjb25zdCBuZXdEb2MgPSB7fTtcblxuICBpZiAoc2VsZWN0b3JEb2N1bWVudC5faWQpIHtcbiAgICBuZXdEb2MuX2lkID0gc2VsZWN0b3JEb2N1bWVudC5faWQ7XG4gICAgZGVsZXRlIHNlbGVjdG9yRG9jdW1lbnQuX2lkO1xuICB9XG5cbiAgLy8gVGhpcyBkb3VibGUgX21vZGlmeSBjYWxsIGlzIG1hZGUgdG8gaGVscCB3aXRoIG5lc3RlZCBwcm9wZXJ0aWVzIChzZWUgaXNzdWVcbiAgLy8gIzg2MzEpLiBXZSBkbyB0aGlzIGV2ZW4gaWYgaXQncyBhIHJlcGxhY2VtZW50IGZvciB2YWxpZGF0aW9uIHB1cnBvc2VzIChlLmcuXG4gIC8vIGFtYmlndW91cyBpZCdzKVxuICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShuZXdEb2MsIHskc2V0OiBzZWxlY3RvckRvY3VtZW50fSk7XG4gIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG5ld0RvYywgbW9kaWZpZXIsIHtpc0luc2VydDogdHJ1ZX0pO1xuXG4gIGlmIChpc01vZGlmeSkge1xuICAgIHJldHVybiBuZXdEb2M7XG4gIH1cblxuICAvLyBSZXBsYWNlbWVudCBjYW4gdGFrZSBfaWQgZnJvbSBxdWVyeSBkb2N1bWVudFxuICBjb25zdCByZXBsYWNlbWVudCA9IE9iamVjdC5hc3NpZ24oe30sIG1vZGlmaWVyKTtcbiAgaWYgKG5ld0RvYy5faWQpIHtcbiAgICByZXBsYWNlbWVudC5faWQgPSBuZXdEb2MuX2lkO1xuICB9XG5cbiAgcmV0dXJuIHJlcGxhY2VtZW50O1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9kaWZmT2JqZWN0cyA9IChsZWZ0LCByaWdodCwgY2FsbGJhY2tzKSA9PiB7XG4gIHJldHVybiBEaWZmU2VxdWVuY2UuZGlmZk9iamVjdHMobGVmdCwgcmlnaHQsIGNhbGxiYWNrcyk7XG59O1xuXG4vLyBvcmRlcmVkOiBib29sLlxuLy8gb2xkX3Jlc3VsdHMgYW5kIG5ld19yZXN1bHRzOiBjb2xsZWN0aW9ucyBvZiBkb2N1bWVudHMuXG4vLyAgICBpZiBvcmRlcmVkLCB0aGV5IGFyZSBhcnJheXMuXG4vLyAgICBpZiB1bm9yZGVyZWQsIHRoZXkgYXJlIElkTWFwc1xuTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlDaGFuZ2VzID0gKG9yZGVyZWQsIG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKSA9PlxuICBEaWZmU2VxdWVuY2UuZGlmZlF1ZXJ5Q2hhbmdlcyhvcmRlcmVkLCBvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucylcbjtcblxuTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlPcmRlcmVkQ2hhbmdlcyA9IChvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucykgPT5cbiAgRGlmZlNlcXVlbmNlLmRpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzKG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKVxuO1xuXG5Mb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMgPSAob2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpID0+XG4gIERpZmZTZXF1ZW5jZS5kaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzKG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKVxuO1xuXG5Mb2NhbENvbGxlY3Rpb24uX2ZpbmRJbk9yZGVyZWRSZXN1bHRzID0gKHF1ZXJ5LCBkb2MpID0+IHtcbiAgaWYgKCFxdWVyeS5vcmRlcmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5cXCd0IGNhbGwgX2ZpbmRJbk9yZGVyZWRSZXN1bHRzIG9uIHVub3JkZXJlZCBxdWVyeScpO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBxdWVyeS5yZXN1bHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHF1ZXJ5LnJlc3VsdHNbaV0gPT09IGRvYykge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgRXJyb3IoJ29iamVjdCBtaXNzaW5nIGZyb20gcXVlcnknKTtcbn07XG5cbi8vIElmIHRoaXMgaXMgYSBzZWxlY3RvciB3aGljaCBleHBsaWNpdGx5IGNvbnN0cmFpbnMgdGhlIG1hdGNoIGJ5IElEIHRvIGEgZmluaXRlXG4vLyBudW1iZXIgb2YgZG9jdW1lbnRzLCByZXR1cm5zIGEgbGlzdCBvZiB0aGVpciBJRHMuICBPdGhlcndpc2UgcmV0dXJuc1xuLy8gbnVsbC4gTm90ZSB0aGF0IHRoZSBzZWxlY3RvciBtYXkgaGF2ZSBvdGhlciByZXN0cmljdGlvbnMgc28gaXQgbWF5IG5vdCBldmVuXG4vLyBtYXRjaCB0aG9zZSBkb2N1bWVudCEgIFdlIGNhcmUgYWJvdXQgJGluIGFuZCAkYW5kIHNpbmNlIHRob3NlIGFyZSBnZW5lcmF0ZWRcbi8vIGFjY2Vzcy1jb250cm9sbGVkIHVwZGF0ZSBhbmQgcmVtb3ZlLlxuTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvciA9IHNlbGVjdG9yID0+IHtcbiAgLy8gSXMgdGhlIHNlbGVjdG9yIGp1c3QgYW4gSUQ/XG4gIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikpIHtcbiAgICByZXR1cm4gW3NlbGVjdG9yXTtcbiAgfVxuXG4gIGlmICghc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIERvIHdlIGhhdmUgYW4gX2lkIGNsYXVzZT9cbiAgaWYgKGhhc093bi5jYWxsKHNlbGVjdG9yLCAnX2lkJykpIHtcbiAgICAvLyBJcyB0aGUgX2lkIGNsYXVzZSBqdXN0IGFuIElEP1xuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3Rvci5faWQpKSB7XG4gICAgICByZXR1cm4gW3NlbGVjdG9yLl9pZF07XG4gICAgfVxuXG4gICAgLy8gSXMgdGhlIF9pZCBjbGF1c2Uge19pZDogeyRpbjogW1wieFwiLCBcInlcIiwgXCJ6XCJdfX0/XG4gICAgaWYgKHNlbGVjdG9yLl9pZFxuICAgICAgICAmJiBBcnJheS5pc0FycmF5KHNlbGVjdG9yLl9pZC4kaW4pXG4gICAgICAgICYmIHNlbGVjdG9yLl9pZC4kaW4ubGVuZ3RoXG4gICAgICAgICYmIHNlbGVjdG9yLl9pZC4kaW4uZXZlcnkoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQpKSB7XG4gICAgICByZXR1cm4gc2VsZWN0b3IuX2lkLiRpbjtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIElmIHRoaXMgaXMgYSB0b3AtbGV2ZWwgJGFuZCwgYW5kIGFueSBvZiB0aGUgY2xhdXNlcyBjb25zdHJhaW4gdGhlaXJcbiAgLy8gZG9jdW1lbnRzLCB0aGVuIHRoZSB3aG9sZSBzZWxlY3RvciBpcyBjb25zdHJhaW5lZCBieSBhbnkgb25lIGNsYXVzZSdzXG4gIC8vIGNvbnN0cmFpbnQuIChXZWxsLCBieSB0aGVpciBpbnRlcnNlY3Rpb24sIGJ1dCB0aGF0IHNlZW1zIHVubGlrZWx5LilcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2VsZWN0b3IuJGFuZCkpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdG9yLiRhbmQubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IHN1YklkcyA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3Ioc2VsZWN0b3IuJGFuZFtpXSk7XG5cbiAgICAgIGlmIChzdWJJZHMpIHtcbiAgICAgICAgcmV0dXJuIHN1YklkcztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5SZXN1bHRzID0gKHF1ZXJ5LCBkb2MpID0+IHtcbiAgY29uc3QgZmllbGRzID0gRUpTT04uY2xvbmUoZG9jKTtcblxuICBkZWxldGUgZmllbGRzLl9pZDtcblxuICBpZiAocXVlcnkub3JkZXJlZCkge1xuICAgIGlmICghcXVlcnkuc29ydGVyKSB7XG4gICAgICBxdWVyeS5hZGRlZEJlZm9yZShkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSwgbnVsbCk7XG4gICAgICBxdWVyeS5yZXN1bHRzLnB1c2goZG9jKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaSA9IExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5Tb3J0ZWRMaXN0KFxuICAgICAgICBxdWVyeS5zb3J0ZXIuZ2V0Q29tcGFyYXRvcih7ZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXN9KSxcbiAgICAgICAgcXVlcnkucmVzdWx0cyxcbiAgICAgICAgZG9jXG4gICAgICApO1xuXG4gICAgICBsZXQgbmV4dCA9IHF1ZXJ5LnJlc3VsdHNbaSArIDFdO1xuICAgICAgaWYgKG5leHQpIHtcbiAgICAgICAgbmV4dCA9IG5leHQuX2lkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHF1ZXJ5LmFkZGVkQmVmb3JlKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpLCBuZXh0KTtcbiAgICB9XG5cbiAgICBxdWVyeS5hZGRlZChkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG4gIH0gZWxzZSB7XG4gICAgcXVlcnkuYWRkZWQoZG9jLl9pZCwgcXVlcnkucHJvamVjdGlvbkZuKGZpZWxkcykpO1xuICAgIHF1ZXJ5LnJlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gIH1cbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5Tb3J0ZWRMaXN0ID0gKGNtcCwgYXJyYXksIHZhbHVlKSA9PiB7XG4gIGlmIChhcnJheS5sZW5ndGggPT09IDApIHtcbiAgICBhcnJheS5wdXNoKHZhbHVlKTtcbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIGNvbnN0IGkgPSBMb2NhbENvbGxlY3Rpb24uX2JpbmFyeVNlYXJjaChjbXAsIGFycmF5LCB2YWx1ZSk7XG5cbiAgYXJyYXkuc3BsaWNlKGksIDAsIHZhbHVlKTtcblxuICByZXR1cm4gaTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5faXNNb2RpZmljYXRpb25Nb2QgPSBtb2QgPT4ge1xuICBsZXQgaXNNb2RpZnkgPSBmYWxzZTtcbiAgbGV0IGlzUmVwbGFjZSA9IGZhbHNlO1xuXG4gIE9iamVjdC5rZXlzKG1vZCkuZm9yRWFjaChrZXkgPT4ge1xuICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgIGlzTW9kaWZ5ID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaXNSZXBsYWNlID0gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmIChpc01vZGlmeSAmJiBpc1JlcGxhY2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnVXBkYXRlIHBhcmFtZXRlciBjYW5ub3QgaGF2ZSBib3RoIG1vZGlmaWVyIGFuZCBub24tbW9kaWZpZXIgZmllbGRzLidcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGlzTW9kaWZ5O1xufTtcblxuLy8gWFhYIG1heWJlIHRoaXMgc2hvdWxkIGJlIEVKU09OLmlzT2JqZWN0LCB0aG91Z2ggRUpTT04gZG9lc24ndCBrbm93IGFib3V0XG4vLyBSZWdFeHBcbi8vIFhYWCBub3RlIHRoYXQgX3R5cGUodW5kZWZpbmVkKSA9PT0gMyEhISFcbkxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdCA9IHggPT4ge1xuICByZXR1cm4geCAmJiBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUoeCkgPT09IDM7XG59O1xuXG4vLyBYWFggbmVlZCBhIHN0cmF0ZWd5IGZvciBwYXNzaW5nIHRoZSBiaW5kaW5nIG9mICQgaW50byB0aGlzXG4vLyBmdW5jdGlvbiwgZnJvbSB0aGUgY29tcGlsZWQgc2VsZWN0b3Jcbi8vXG4vLyBtYXliZSBqdXN0IHtrZXkudXAudG8uanVzdC5iZWZvcmUuZG9sbGFyc2lnbjogYXJyYXlfaW5kZXh9XG4vL1xuLy8gWFhYIGF0b21pY2l0eTogaWYgb25lIG1vZGlmaWNhdGlvbiBmYWlscywgZG8gd2Ugcm9sbCBiYWNrIHRoZSB3aG9sZVxuLy8gY2hhbmdlP1xuLy9cbi8vIG9wdGlvbnM6XG4vLyAgIC0gaXNJbnNlcnQgaXMgc2V0IHdoZW4gX21vZGlmeSBpcyBiZWluZyBjYWxsZWQgdG8gY29tcHV0ZSB0aGUgZG9jdW1lbnQgdG9cbi8vICAgICBpbnNlcnQgYXMgcGFydCBvZiBhbiB1cHNlcnQgb3BlcmF0aW9uLiBXZSB1c2UgdGhpcyBwcmltYXJpbHkgdG8gZmlndXJlXG4vLyAgICAgb3V0IHdoZW4gdG8gc2V0IHRoZSBmaWVsZHMgaW4gJHNldE9uSW5zZXJ0LCBpZiBwcmVzZW50LlxuTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkgPSAoZG9jLCBtb2RpZmllciwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmICghTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KG1vZGlmaWVyKSkge1xuICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICB9XG5cbiAgLy8gTWFrZSBzdXJlIHRoZSBjYWxsZXIgY2FuJ3QgbXV0YXRlIG91ciBkYXRhIHN0cnVjdHVyZXMuXG4gIG1vZGlmaWVyID0gRUpTT04uY2xvbmUobW9kaWZpZXIpO1xuXG4gIGNvbnN0IGlzTW9kaWZpZXIgPSBpc09wZXJhdG9yT2JqZWN0KG1vZGlmaWVyKTtcbiAgY29uc3QgbmV3RG9jID0gaXNNb2RpZmllciA/IEVKU09OLmNsb25lKGRvYykgOiBtb2RpZmllcjtcblxuICBpZiAoaXNNb2RpZmllcikge1xuICAgIC8vIGFwcGx5IG1vZGlmaWVycyB0byB0aGUgZG9jLlxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyKS5mb3JFYWNoKG9wZXJhdG9yID0+IHtcbiAgICAgIC8vIFRyZWF0ICRzZXRPbkluc2VydCBhcyAkc2V0IGlmIHRoaXMgaXMgYW4gaW5zZXJ0LlxuICAgICAgY29uc3Qgc2V0T25JbnNlcnQgPSBvcHRpb25zLmlzSW5zZXJ0ICYmIG9wZXJhdG9yID09PSAnJHNldE9uSW5zZXJ0JztcbiAgICAgIGNvbnN0IG1vZEZ1bmMgPSBNT0RJRklFUlNbc2V0T25JbnNlcnQgPyAnJHNldCcgOiBvcGVyYXRvcl07XG4gICAgICBjb25zdCBvcGVyYW5kID0gbW9kaWZpZXJbb3BlcmF0b3JdO1xuXG4gICAgICBpZiAoIW1vZEZ1bmMpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoYEludmFsaWQgbW9kaWZpZXIgc3BlY2lmaWVkICR7b3BlcmF0b3J9YCk7XG4gICAgICB9XG5cbiAgICAgIE9iamVjdC5rZXlzKG9wZXJhbmQpLmZvckVhY2goa2V5cGF0aCA9PiB7XG4gICAgICAgIGNvbnN0IGFyZyA9IG9wZXJhbmRba2V5cGF0aF07XG5cbiAgICAgICAgaWYgKGtleXBhdGggPT09ICcnKSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ0FuIGVtcHR5IHVwZGF0ZSBwYXRoIGlzIG5vdCB2YWxpZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGtleXBhcnRzID0ga2V5cGF0aC5zcGxpdCgnLicpO1xuXG4gICAgICAgIGlmICgha2V5cGFydHMuZXZlcnkoQm9vbGVhbikpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAgIGBUaGUgdXBkYXRlIHBhdGggJyR7a2V5cGF0aH0nIGNvbnRhaW5zIGFuIGVtcHR5IGZpZWxkIG5hbWUsIGAgK1xuICAgICAgICAgICAgJ3doaWNoIGlzIG5vdCBhbGxvd2VkLidcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZmluZE1vZFRhcmdldChuZXdEb2MsIGtleXBhcnRzLCB7XG4gICAgICAgICAgYXJyYXlJbmRpY2VzOiBvcHRpb25zLmFycmF5SW5kaWNlcyxcbiAgICAgICAgICBmb3JiaWRBcnJheTogb3BlcmF0b3IgPT09ICckcmVuYW1lJyxcbiAgICAgICAgICBub0NyZWF0ZTogTk9fQ1JFQVRFX01PRElGSUVSU1tvcGVyYXRvcl1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbW9kRnVuYyh0YXJnZXQsIGtleXBhcnRzLnBvcCgpLCBhcmcsIGtleXBhdGgsIG5ld0RvYyk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGlmIChkb2MuX2lkICYmICFFSlNPTi5lcXVhbHMoZG9jLl9pZCwgbmV3RG9jLl9pZCkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICBgQWZ0ZXIgYXBwbHlpbmcgdGhlIHVwZGF0ZSB0byB0aGUgZG9jdW1lbnQge19pZDogXCIke2RvYy5faWR9XCIsIC4uLn0sYCArXG4gICAgICAgICcgdGhlIChpbW11dGFibGUpIGZpZWxkIFxcJ19pZFxcJyB3YXMgZm91bmQgdG8gaGF2ZSBiZWVuIGFsdGVyZWQgdG8gJyArXG4gICAgICAgIGBfaWQ6IFwiJHtuZXdEb2MuX2lkfVwiYFxuICAgICAgKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRvYy5faWQgJiYgbW9kaWZpZXIuX2lkICYmICFFSlNPTi5lcXVhbHMoZG9jLl9pZCwgbW9kaWZpZXIuX2lkKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgIGBUaGUgX2lkIGZpZWxkIGNhbm5vdCBiZSBjaGFuZ2VkIGZyb20ge19pZDogXCIke2RvYy5faWR9XCJ9IHRvIGAgK1xuICAgICAgICBge19pZDogXCIke21vZGlmaWVyLl9pZH1cIn1gXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIHJlcGxhY2UgdGhlIHdob2xlIGRvY3VtZW50XG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKG1vZGlmaWVyKTtcbiAgfVxuXG4gIC8vIG1vdmUgbmV3IGRvY3VtZW50IGludG8gcGxhY2UuXG4gIE9iamVjdC5rZXlzKGRvYykuZm9yRWFjaChrZXkgPT4ge1xuICAgIC8vIE5vdGU6IHRoaXMgdXNlZCB0byBiZSBmb3IgKHZhciBrZXkgaW4gZG9jKSBob3dldmVyLCB0aGlzIGRvZXMgbm90XG4gICAgLy8gd29yayByaWdodCBpbiBPcGVyYS4gRGVsZXRpbmcgZnJvbSBhIGRvYyB3aGlsZSBpdGVyYXRpbmcgb3ZlciBpdFxuICAgIC8vIHdvdWxkIHNvbWV0aW1lcyBjYXVzZSBvcGVyYSB0byBza2lwIHNvbWUga2V5cy5cbiAgICBpZiAoa2V5ICE9PSAnX2lkJykge1xuICAgICAgZGVsZXRlIGRvY1trZXldO1xuICAgIH1cbiAgfSk7XG5cbiAgT2JqZWN0LmtleXMobmV3RG9jKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgZG9jW2tleV0gPSBuZXdEb2Nba2V5XTtcbiAgfSk7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX29ic2VydmVGcm9tT2JzZXJ2ZUNoYW5nZXMgPSAoY3Vyc29yLCBvYnNlcnZlQ2FsbGJhY2tzKSA9PiB7XG4gIGNvbnN0IHRyYW5zZm9ybSA9IGN1cnNvci5nZXRUcmFuc2Zvcm0oKSB8fCAoZG9jID0+IGRvYyk7XG4gIGxldCBzdXBwcmVzc2VkID0gISFvYnNlcnZlQ2FsbGJhY2tzLl9zdXBwcmVzc19pbml0aWFsO1xuXG4gIGxldCBvYnNlcnZlQ2hhbmdlc0NhbGxiYWNrcztcbiAgaWYgKExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNhbGxiYWNrc0FyZU9yZGVyZWQob2JzZXJ2ZUNhbGxiYWNrcykpIHtcbiAgICAvLyBUaGUgXCJfbm9faW5kaWNlc1wiIG9wdGlvbiBzZXRzIGFsbCBpbmRleCBhcmd1bWVudHMgdG8gLTEgYW5kIHNraXBzIHRoZVxuICAgIC8vIGxpbmVhciBzY2FucyByZXF1aXJlZCB0byBnZW5lcmF0ZSB0aGVtLiAgVGhpcyBsZXRzIG9ic2VydmVycyB0aGF0IGRvbid0XG4gICAgLy8gbmVlZCBhYnNvbHV0ZSBpbmRpY2VzIGJlbmVmaXQgZnJvbSB0aGUgb3RoZXIgZmVhdHVyZXMgb2YgdGhpcyBBUEkgLS1cbiAgICAvLyByZWxhdGl2ZSBvcmRlciwgdHJhbnNmb3JtcywgYW5kIGFwcGx5Q2hhbmdlcyAtLSB3aXRob3V0IHRoZSBzcGVlZCBoaXQuXG4gICAgY29uc3QgaW5kaWNlcyA9ICFvYnNlcnZlQ2FsbGJhY2tzLl9ub19pbmRpY2VzO1xuXG4gICAgb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3MgPSB7XG4gICAgICBhZGRlZEJlZm9yZShpZCwgZmllbGRzLCBiZWZvcmUpIHtcbiAgICAgICAgaWYgKHN1cHByZXNzZWQgfHwgIShvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkQXQgfHwgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkb2MgPSB0cmFuc2Zvcm0oT2JqZWN0LmFzc2lnbihmaWVsZHMsIHtfaWQ6IGlkfSkpO1xuXG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkQXQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkQXQoXG4gICAgICAgICAgICBkb2MsXG4gICAgICAgICAgICBpbmRpY2VzXG4gICAgICAgICAgICAgID8gYmVmb3JlXG4gICAgICAgICAgICAgICAgPyB0aGlzLmRvY3MuaW5kZXhPZihiZWZvcmUpXG4gICAgICAgICAgICAgICAgOiB0aGlzLmRvY3Muc2l6ZSgpXG4gICAgICAgICAgICAgIDogLTEsXG4gICAgICAgICAgICBiZWZvcmVcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuYWRkZWQoZG9jKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNoYW5nZWQoaWQsIGZpZWxkcykge1xuICAgICAgICBpZiAoIShvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWRBdCB8fCBvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWQpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGRvYyA9IEVKU09OLmNsb25lKHRoaXMuZG9jcy5nZXQoaWQpKTtcbiAgICAgICAgaWYgKCFkb2MpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gaWQgZm9yIGNoYW5nZWQ6ICR7aWR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGREb2MgPSB0cmFuc2Zvcm0oRUpTT04uY2xvbmUoZG9jKSk7XG5cbiAgICAgICAgRGlmZlNlcXVlbmNlLmFwcGx5Q2hhbmdlcyhkb2MsIGZpZWxkcyk7XG5cbiAgICAgICAgaWYgKG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZEF0KSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkQXQoXG4gICAgICAgICAgICB0cmFuc2Zvcm0oZG9jKSxcbiAgICAgICAgICAgIG9sZERvYyxcbiAgICAgICAgICAgIGluZGljZXMgPyB0aGlzLmRvY3MuaW5kZXhPZihpZCkgOiAtMVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkKHRyYW5zZm9ybShkb2MpLCBvbGREb2MpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgbW92ZWRCZWZvcmUoaWQsIGJlZm9yZSkge1xuICAgICAgICBpZiAoIW9ic2VydmVDYWxsYmFja3MubW92ZWRUbykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZyb20gPSBpbmRpY2VzID8gdGhpcy5kb2NzLmluZGV4T2YoaWQpIDogLTE7XG4gICAgICAgIGxldCB0byA9IGluZGljZXNcbiAgICAgICAgICA/IGJlZm9yZVxuICAgICAgICAgICAgPyB0aGlzLmRvY3MuaW5kZXhPZihiZWZvcmUpXG4gICAgICAgICAgICA6IHRoaXMuZG9jcy5zaXplKClcbiAgICAgICAgICA6IC0xO1xuXG4gICAgICAgIC8vIFdoZW4gbm90IG1vdmluZyBiYWNrd2FyZHMsIGFkanVzdCBmb3IgdGhlIGZhY3QgdGhhdCByZW1vdmluZyB0aGVcbiAgICAgICAgLy8gZG9jdW1lbnQgc2xpZGVzIGV2ZXJ5dGhpbmcgYmFjayBvbmUgc2xvdC5cbiAgICAgICAgaWYgKHRvID4gZnJvbSkge1xuICAgICAgICAgIC0tdG87XG4gICAgICAgIH1cblxuICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLm1vdmVkVG8oXG4gICAgICAgICAgdHJhbnNmb3JtKEVKU09OLmNsb25lKHRoaXMuZG9jcy5nZXQoaWQpKSksXG4gICAgICAgICAgZnJvbSxcbiAgICAgICAgICB0byxcbiAgICAgICAgICBiZWZvcmUgfHwgbnVsbFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICAgIHJlbW92ZWQoaWQpIHtcbiAgICAgICAgaWYgKCEob2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkQXQgfHwgb2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRlY2huaWNhbGx5IG1heWJlIHRoZXJlIHNob3VsZCBiZSBhbiBFSlNPTi5jbG9uZSBoZXJlLCBidXQgaXQncyBhYm91dFxuICAgICAgICAvLyB0byBiZSByZW1vdmVkIGZyb20gdGhpcy5kb2NzIVxuICAgICAgICBjb25zdCBkb2MgPSB0cmFuc2Zvcm0odGhpcy5kb2NzLmdldChpZCkpO1xuXG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWRBdCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZEF0KGRvYywgaW5kaWNlcyA/IHRoaXMuZG9jcy5pbmRleE9mKGlkKSA6IC0xKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWQoZG9jKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIG9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzID0ge1xuICAgICAgYWRkZWQoaWQsIGZpZWxkcykge1xuICAgICAgICBpZiAoIXN1cHByZXNzZWQgJiYgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuYWRkZWQodHJhbnNmb3JtKE9iamVjdC5hc3NpZ24oZmllbGRzLCB7X2lkOiBpZH0pKSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcbiAgICAgICAgaWYgKG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZCkge1xuICAgICAgICAgIGNvbnN0IG9sZERvYyA9IHRoaXMuZG9jcy5nZXQoaWQpO1xuICAgICAgICAgIGNvbnN0IGRvYyA9IEVKU09OLmNsb25lKG9sZERvYyk7XG5cbiAgICAgICAgICBEaWZmU2VxdWVuY2UuYXBwbHlDaGFuZ2VzKGRvYywgZmllbGRzKTtcblxuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZChcbiAgICAgICAgICAgIHRyYW5zZm9ybShkb2MpLFxuICAgICAgICAgICAgdHJhbnNmb3JtKEVKU09OLmNsb25lKG9sZERvYykpXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHJlbW92ZWQoaWQpIHtcbiAgICAgICAgaWYgKG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZCh0cmFuc2Zvcm0odGhpcy5kb2NzLmdldChpZCkpKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgY2hhbmdlT2JzZXJ2ZXIgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIoe1xuICAgIGNhbGxiYWNrczogb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NcbiAgfSk7XG5cbiAgLy8gQ2FjaGluZ0NoYW5nZU9ic2VydmVyIGNsb25lcyBhbGwgcmVjZWl2ZWQgaW5wdXQgb24gaXRzIGNhbGxiYWNrc1xuICAvLyBTbyB3ZSBjYW4gbWFyayBpdCBhcyBzYWZlIHRvIHJlZHVjZSB0aGUgZWpzb24gY2xvbmVzLlxuICAvLyBUaGlzIGlzIHRlc3RlZCBieSB0aGUgYG1vbmdvLWxpdmVkYXRhIC0gKGV4dGVuZGVkKSBzY3JpYmJsaW5nYCB0ZXN0c1xuICBjaGFuZ2VPYnNlcnZlci5hcHBseUNoYW5nZS5fZnJvbU9ic2VydmUgPSB0cnVlO1xuICBjb25zdCBoYW5kbGUgPSBjdXJzb3Iub2JzZXJ2ZUNoYW5nZXMoY2hhbmdlT2JzZXJ2ZXIuYXBwbHlDaGFuZ2UsXG4gICAgeyBub25NdXRhdGluZ0NhbGxiYWNrczogdHJ1ZSB9KTtcblxuICBzdXBwcmVzc2VkID0gZmFsc2U7XG5cbiAgcmV0dXJuIGhhbmRsZTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNhbGxiYWNrc0FyZU9yZGVyZWQgPSBjYWxsYmFja3MgPT4ge1xuICBpZiAoY2FsbGJhY2tzLmFkZGVkICYmIGNhbGxiYWNrcy5hZGRlZEF0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2Ugc3BlY2lmeSBvbmx5IG9uZSBvZiBhZGRlZCgpIGFuZCBhZGRlZEF0KCknKTtcbiAgfVxuXG4gIGlmIChjYWxsYmFja3MuY2hhbmdlZCAmJiBjYWxsYmFja3MuY2hhbmdlZEF0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2Ugc3BlY2lmeSBvbmx5IG9uZSBvZiBjaGFuZ2VkKCkgYW5kIGNoYW5nZWRBdCgpJyk7XG4gIH1cblxuICBpZiAoY2FsbGJhY2tzLnJlbW92ZWQgJiYgY2FsbGJhY2tzLnJlbW92ZWRBdCkge1xuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNwZWNpZnkgb25seSBvbmUgb2YgcmVtb3ZlZCgpIGFuZCByZW1vdmVkQXQoKScpO1xuICB9XG5cbiAgcmV0dXJuICEhKFxuICAgIGNhbGxiYWNrcy5hZGRlZEF0IHx8XG4gICAgY2FsbGJhY2tzLmNoYW5nZWRBdCB8fFxuICAgIGNhbGxiYWNrcy5tb3ZlZFRvIHx8XG4gICAgY2FsbGJhY2tzLnJlbW92ZWRBdFxuICApO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQgPSBjYWxsYmFja3MgPT4ge1xuICBpZiAoY2FsbGJhY2tzLmFkZGVkICYmIGNhbGxiYWNrcy5hZGRlZEJlZm9yZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNwZWNpZnkgb25seSBvbmUgb2YgYWRkZWQoKSBhbmQgYWRkZWRCZWZvcmUoKScpO1xuICB9XG5cbiAgcmV0dXJuICEhKGNhbGxiYWNrcy5hZGRlZEJlZm9yZSB8fCBjYWxsYmFja3MubW92ZWRCZWZvcmUpO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9yZW1vdmVGcm9tUmVzdWx0cyA9IChxdWVyeSwgZG9jKSA9PiB7XG4gIGlmIChxdWVyeS5vcmRlcmVkKSB7XG4gICAgY29uc3QgaSA9IExvY2FsQ29sbGVjdGlvbi5fZmluZEluT3JkZXJlZFJlc3VsdHMocXVlcnksIGRvYyk7XG5cbiAgICBxdWVyeS5yZW1vdmVkKGRvYy5faWQpO1xuICAgIHF1ZXJ5LnJlc3VsdHMuc3BsaWNlKGksIDEpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGlkID0gZG9jLl9pZDsgIC8vIGluIGNhc2UgY2FsbGJhY2sgbXV0YXRlcyBkb2NcblxuICAgIHF1ZXJ5LnJlbW92ZWQoZG9jLl9pZCk7XG4gICAgcXVlcnkucmVzdWx0cy5yZW1vdmUoaWQpO1xuICB9XG59O1xuXG4vLyBJcyB0aGlzIHNlbGVjdG9yIGp1c3Qgc2hvcnRoYW5kIGZvciBsb29rdXAgYnkgX2lkP1xuTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQgPSBzZWxlY3RvciA9PlxuICB0eXBlb2Ygc2VsZWN0b3IgPT09ICdudW1iZXInIHx8XG4gIHR5cGVvZiBzZWxlY3RvciA9PT0gJ3N0cmluZycgfHxcbiAgc2VsZWN0b3IgaW5zdGFuY2VvZiBNb25nb0lELk9iamVjdElEXG47XG5cbi8vIElzIHRoZSBzZWxlY3RvciBqdXN0IGxvb2t1cCBieSBfaWQgKHNob3J0aGFuZCBvciBub3QpP1xuTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWRQZXJoYXBzQXNPYmplY3QgPSBzZWxlY3RvciA9PlxuICBMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikgfHxcbiAgTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IgJiYgc2VsZWN0b3IuX2lkKSAmJlxuICBPYmplY3Qua2V5cyhzZWxlY3RvcikubGVuZ3RoID09PSAxXG47XG5cbkxvY2FsQ29sbGVjdGlvbi5fdXBkYXRlSW5SZXN1bHRzID0gKHF1ZXJ5LCBkb2MsIG9sZF9kb2MpID0+IHtcbiAgaWYgKCFFSlNPTi5lcXVhbHMoZG9jLl9pZCwgb2xkX2RvYy5faWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5cXCd0IGNoYW5nZSBhIGRvY1xcJ3MgX2lkIHdoaWxlIHVwZGF0aW5nJyk7XG4gIH1cblxuICBjb25zdCBwcm9qZWN0aW9uRm4gPSBxdWVyeS5wcm9qZWN0aW9uRm47XG4gIGNvbnN0IGNoYW5nZWRGaWVsZHMgPSBEaWZmU2VxdWVuY2UubWFrZUNoYW5nZWRGaWVsZHMoXG4gICAgcHJvamVjdGlvbkZuKGRvYyksXG4gICAgcHJvamVjdGlvbkZuKG9sZF9kb2MpXG4gICk7XG5cbiAgaWYgKCFxdWVyeS5vcmRlcmVkKSB7XG4gICAgaWYgKE9iamVjdC5rZXlzKGNoYW5nZWRGaWVsZHMpLmxlbmd0aCkge1xuICAgICAgcXVlcnkuY2hhbmdlZChkb2MuX2lkLCBjaGFuZ2VkRmllbGRzKTtcbiAgICAgIHF1ZXJ5LnJlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qgb2xkX2lkeCA9IExvY2FsQ29sbGVjdGlvbi5fZmluZEluT3JkZXJlZFJlc3VsdHMocXVlcnksIGRvYyk7XG5cbiAgaWYgKE9iamVjdC5rZXlzKGNoYW5nZWRGaWVsZHMpLmxlbmd0aCkge1xuICAgIHF1ZXJ5LmNoYW5nZWQoZG9jLl9pZCwgY2hhbmdlZEZpZWxkcyk7XG4gIH1cblxuICBpZiAoIXF1ZXJ5LnNvcnRlcikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGp1c3QgdGFrZSBpdCBvdXQgYW5kIHB1dCBpdCBiYWNrIGluIGFnYWluLCBhbmQgc2VlIGlmIHRoZSBpbmRleCBjaGFuZ2VzXG4gIHF1ZXJ5LnJlc3VsdHMuc3BsaWNlKG9sZF9pZHgsIDEpO1xuXG4gIGNvbnN0IG5ld19pZHggPSBMb2NhbENvbGxlY3Rpb24uX2luc2VydEluU29ydGVkTGlzdChcbiAgICBxdWVyeS5zb3J0ZXIuZ2V0Q29tcGFyYXRvcih7ZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXN9KSxcbiAgICBxdWVyeS5yZXN1bHRzLFxuICAgIGRvY1xuICApO1xuXG4gIGlmIChvbGRfaWR4ICE9PSBuZXdfaWR4KSB7XG4gICAgbGV0IG5leHQgPSBxdWVyeS5yZXN1bHRzW25ld19pZHggKyAxXTtcbiAgICBpZiAobmV4dCkge1xuICAgICAgbmV4dCA9IG5leHQuX2lkO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBxdWVyeS5tb3ZlZEJlZm9yZSAmJiBxdWVyeS5tb3ZlZEJlZm9yZShkb2MuX2lkLCBuZXh0KTtcbiAgfVxufTtcblxuY29uc3QgTU9ESUZJRVJTID0ge1xuICAkY3VycmVudERhdGUodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGhhc093bi5jYWxsKGFyZywgJyR0eXBlJykpIHtcbiAgICAgIGlmIChhcmcuJHR5cGUgIT09ICdkYXRlJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnTWluaW1vbmdvIGRvZXMgY3VycmVudGx5IG9ubHkgc3VwcG9ydCB0aGUgZGF0ZSB0eXBlIGluICcgK1xuICAgICAgICAgICckY3VycmVudERhdGUgbW9kaWZpZXJzJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmcgIT09IHRydWUpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdJbnZhbGlkICRjdXJyZW50RGF0ZSBtb2RpZmllcicsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIHRhcmdldFtmaWVsZF0gPSBuZXcgRGF0ZSgpO1xuICB9LFxuICAkbWluKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyICRtaW4gYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbZmllbGRdICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnQ2Fubm90IGFwcGx5ICRtaW4gbW9kaWZpZXIgdG8gbm9uLW51bWJlcicsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAodGFyZ2V0W2ZpZWxkXSA+IGFyZykge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgIH1cbiAgfSxcbiAgJG1heCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ251bWJlcicpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciAkbWF4IGFsbG93ZWQgZm9yIG51bWJlcnMgb25seScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgIGlmICh0eXBlb2YgdGFyZ2V0W2ZpZWxkXSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJ0Nhbm5vdCBhcHBseSAkbWF4IG1vZGlmaWVyIHRvIG5vbi1udW1iZXInLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRhcmdldFtmaWVsZF0gPCBhcmcpIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICB9XG4gIH0sXG4gICRpbmModGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgJGluYyBhbGxvd2VkIGZvciBudW1iZXJzIG9ubHknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICBpZiAodHlwZW9mIHRhcmdldFtmaWVsZF0gIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICdDYW5ub3QgYXBwbHkgJGluYyBtb2RpZmllciB0byBub24tbnVtYmVyJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHRhcmdldFtmaWVsZF0gKz0gYXJnO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgIH1cbiAgfSxcbiAgJHNldCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodGFyZ2V0ICE9PSBPYmplY3QodGFyZ2V0KSkgeyAvLyBub3QgYW4gYXJyYXkgb3IgYW4gb2JqZWN0XG4gICAgICBjb25zdCBlcnJvciA9IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnQ2Fubm90IHNldCBwcm9wZXJ0eSBvbiBub24tb2JqZWN0IGZpZWxkJyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICAgIGVycm9yLnNldFByb3BlcnR5RXJyb3IgPSB0cnVlO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgY29uc3QgZXJyb3IgPSBNaW5pbW9uZ29FcnJvcignQ2Fubm90IHNldCBwcm9wZXJ0eSBvbiBudWxsJywge2ZpZWxkfSk7XG4gICAgICBlcnJvci5zZXRQcm9wZXJ0eUVycm9yID0gdHJ1ZTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhhcmcpO1xuXG4gICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgfSxcbiAgJHNldE9uSW5zZXJ0KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIC8vIGNvbnZlcnRlZCB0byBgJHNldGAgaW4gYF9tb2RpZnlgXG4gIH0sXG4gICR1bnNldCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodGFyZ2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0YXJnZXRbZmllbGRdO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgJHB1c2godGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHRhcmdldFtmaWVsZF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFtdO1xuICAgIH1cblxuICAgIGlmICghKHRhcmdldFtmaWVsZF0gaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdDYW5ub3QgYXBwbHkgJHB1c2ggbW9kaWZpZXIgdG8gbm9uLWFycmF5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKCEoYXJnICYmIGFyZy4kZWFjaCkpIHtcbiAgICAgIC8vIFNpbXBsZSBtb2RlOiBub3QgJGVhY2hcbiAgICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhhcmcpO1xuXG4gICAgICB0YXJnZXRbZmllbGRdLnB1c2goYXJnKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEZhbmN5IG1vZGU6ICRlYWNoIChhbmQgbWF5YmUgJHNsaWNlIGFuZCAkc29ydCBhbmQgJHBvc2l0aW9uKVxuICAgIGNvbnN0IHRvUHVzaCA9IGFyZy4kZWFjaDtcbiAgICBpZiAoISh0b1B1c2ggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckZWFjaCBtdXN0IGJlIGFuIGFycmF5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKHRvUHVzaCk7XG5cbiAgICAvLyBQYXJzZSAkcG9zaXRpb25cbiAgICBsZXQgcG9zaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgaWYgKCckcG9zaXRpb24nIGluIGFyZykge1xuICAgICAgaWYgKHR5cGVvZiBhcmcuJHBvc2l0aW9uICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHBvc2l0aW9uIG11c3QgYmUgYSBudW1lcmljIHZhbHVlJywge2ZpZWxkfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFhYWCBzaG91bGQgY2hlY2sgdG8gbWFrZSBzdXJlIGludGVnZXJcbiAgICAgIGlmIChhcmcuJHBvc2l0aW9uIDwgMCkge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnJHBvc2l0aW9uIGluICRwdXNoIG11c3QgYmUgemVybyBvciBwb3NpdGl2ZScsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBwb3NpdGlvbiA9IGFyZy4kcG9zaXRpb247XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgJHNsaWNlLlxuICAgIGxldCBzbGljZSA9IHVuZGVmaW5lZDtcbiAgICBpZiAoJyRzbGljZScgaW4gYXJnKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZy4kc2xpY2UgIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckc2xpY2UgbXVzdCBiZSBhIG51bWVyaWMgdmFsdWUnLCB7ZmllbGR9KTtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIHNob3VsZCBjaGVjayB0byBtYWtlIHN1cmUgaW50ZWdlclxuICAgICAgc2xpY2UgPSBhcmcuJHNsaWNlO1xuICAgIH1cblxuICAgIC8vIFBhcnNlICRzb3J0LlxuICAgIGxldCBzb3J0RnVuY3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgaWYgKGFyZy4kc29ydCkge1xuICAgICAgaWYgKHNsaWNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRzb3J0IHJlcXVpcmVzICRzbGljZSB0byBiZSBwcmVzZW50Jywge2ZpZWxkfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFhYWCB0aGlzIGFsbG93cyB1cyB0byB1c2UgYSAkc29ydCB3aG9zZSB2YWx1ZSBpcyBhbiBhcnJheSwgYnV0IHRoYXQnc1xuICAgICAgLy8gYWN0dWFsbHkgYW4gZXh0ZW5zaW9uIG9mIHRoZSBOb2RlIGRyaXZlciwgc28gaXQgd29uJ3Qgd29ya1xuICAgICAgLy8gc2VydmVyLXNpZGUuIENvdWxkIGJlIGNvbmZ1c2luZyFcbiAgICAgIC8vIFhYWCBpcyBpdCBjb3JyZWN0IHRoYXQgd2UgZG9uJ3QgZG8gZ2VvLXN0dWZmIGhlcmU/XG4gICAgICBzb3J0RnVuY3Rpb24gPSBuZXcgTWluaW1vbmdvLlNvcnRlcihhcmcuJHNvcnQpLmdldENvbXBhcmF0b3IoKTtcblxuICAgICAgdG9QdXNoLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUoZWxlbWVudCkgIT09IDMpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAgICckcHVzaCBsaWtlIG1vZGlmaWVycyB1c2luZyAkc29ydCByZXF1aXJlIGFsbCBlbGVtZW50cyB0byBiZSAnICtcbiAgICAgICAgICAgICdvYmplY3RzJyxcbiAgICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBY3R1YWxseSBwdXNoLlxuICAgIGlmIChwb3NpdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0b1B1c2guZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXS5wdXNoKGVsZW1lbnQpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHNwbGljZUFyZ3VtZW50cyA9IFtwb3NpdGlvbiwgMF07XG5cbiAgICAgIHRvUHVzaC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBzcGxpY2VBcmd1bWVudHMucHVzaChlbGVtZW50KTtcbiAgICAgIH0pO1xuXG4gICAgICB0YXJnZXRbZmllbGRdLnNwbGljZSguLi5zcGxpY2VBcmd1bWVudHMpO1xuICAgIH1cblxuICAgIC8vIEFjdHVhbGx5IHNvcnQuXG4gICAgaWYgKHNvcnRGdW5jdGlvbikge1xuICAgICAgdGFyZ2V0W2ZpZWxkXS5zb3J0KHNvcnRGdW5jdGlvbik7XG4gICAgfVxuXG4gICAgLy8gQWN0dWFsbHkgc2xpY2UuXG4gICAgaWYgKHNsaWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChzbGljZSA9PT0gMCkge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gW107IC8vIGRpZmZlcnMgZnJvbSBBcnJheS5zbGljZSFcbiAgICAgIH0gZWxzZSBpZiAoc2xpY2UgPCAwKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSB0YXJnZXRbZmllbGRdLnNsaWNlKHNsaWNlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSB0YXJnZXRbZmllbGRdLnNsaWNlKDAsIHNsaWNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gICRwdXNoQWxsKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICghKHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHknKTtcbiAgICB9XG5cbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoYXJnKTtcblxuICAgIGNvbnN0IHRvUHVzaCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICBpZiAodG9QdXNoID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgfSBlbHNlIGlmICghKHRvUHVzaCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdDYW5ub3QgYXBwbHkgJHB1c2hBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5JyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdG9QdXNoLnB1c2goLi4uYXJnKTtcbiAgICB9XG4gIH0sXG4gICRhZGRUb1NldCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBsZXQgaXNFYWNoID0gZmFsc2U7XG5cbiAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIGNoZWNrIGlmIGZpcnN0IGtleSBpcyAnJGVhY2gnXG4gICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoYXJnKTtcbiAgICAgIGlmIChrZXlzWzBdID09PSAnJGVhY2gnKSB7XG4gICAgICAgIGlzRWFjaCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWVzID0gaXNFYWNoID8gYXJnLiRlYWNoIDogW2FyZ107XG5cbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXModmFsdWVzKTtcblxuICAgIGNvbnN0IHRvQWRkID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICBpZiAodG9BZGQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IHZhbHVlcztcbiAgICB9IGVsc2UgaWYgKCEodG9BZGQgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnQ2Fubm90IGFwcGx5ICRhZGRUb1NldCBtb2RpZmllciB0byBub24tYXJyYXknLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZXMuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgICAgIGlmICh0b0FkZC5zb21lKGVsZW1lbnQgPT4gTG9jYWxDb2xsZWN0aW9uLl9mLl9lcXVhbCh2YWx1ZSwgZWxlbWVudCkpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9BZGQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gICRwb3AodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdG9Qb3AgPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgaWYgKHRvUG9wID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoISh0b1BvcCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ0Nhbm5vdCBhcHBseSAkcG9wIG1vZGlmaWVyIHRvIG5vbi1hcnJheScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJyAmJiBhcmcgPCAwKSB7XG4gICAgICB0b1BvcC5zcGxpY2UoMCwgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvUG9wLnBvcCgpO1xuICAgIH1cbiAgfSxcbiAgJHB1bGwodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdG9QdWxsID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICBpZiAodG9QdWxsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoISh0b1B1bGwgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5JyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBsZXQgb3V0O1xuICAgIGlmIChhcmcgIT0gbnVsbCAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiAhKGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgLy8gWFhYIHdvdWxkIGJlIG11Y2ggbmljZXIgdG8gY29tcGlsZSB0aGlzIG9uY2UsIHJhdGhlciB0aGFuXG4gICAgICAvLyBmb3IgZWFjaCBkb2N1bWVudCB3ZSBtb2RpZnkuLiBidXQgdXN1YWxseSB3ZSdyZSBub3RcbiAgICAgIC8vIG1vZGlmeWluZyB0aGF0IG1hbnkgZG9jdW1lbnRzLCBzbyB3ZSdsbCBsZXQgaXQgc2xpZGUgZm9yXG4gICAgICAvLyBub3dcblxuICAgICAgLy8gWFhYIE1pbmltb25nby5NYXRjaGVyIGlzbid0IHVwIGZvciB0aGUgam9iLCBiZWNhdXNlIHdlIG5lZWRcbiAgICAgIC8vIHRvIHBlcm1pdCBzdHVmZiBsaWtlIHskcHVsbDoge2E6IHskZ3Q6IDR9fX0uLiBzb21ldGhpbmdcbiAgICAgIC8vIGxpa2UgeyRndDogNH0gaXMgbm90IG5vcm1hbGx5IGEgY29tcGxldGUgc2VsZWN0b3IuXG4gICAgICAvLyBzYW1lIGlzc3VlIGFzICRlbGVtTWF0Y2ggcG9zc2libHk/XG4gICAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKGFyZyk7XG5cbiAgICAgIG91dCA9IHRvUHVsbC5maWx0ZXIoZWxlbWVudCA9PiAhbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZWxlbWVudCkucmVzdWx0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ID0gdG9QdWxsLmZpbHRlcihlbGVtZW50ID0+ICFMb2NhbENvbGxlY3Rpb24uX2YuX2VxdWFsKGVsZW1lbnQsIGFyZykpO1xuICAgIH1cblxuICAgIHRhcmdldFtmaWVsZF0gPSBvdXQ7XG4gIH0sXG4gICRwdWxsQWxsKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICghKHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdNb2RpZmllciAkcHVzaEFsbC9wdWxsQWxsIGFsbG93ZWQgZm9yIGFycmF5cyBvbmx5JyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0b1B1bGwgPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgaWYgKHRvUHVsbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCEodG9QdWxsIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBhcHBseSAkcHVsbC9wdWxsQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgdGFyZ2V0W2ZpZWxkXSA9IHRvUHVsbC5maWx0ZXIob2JqZWN0ID0+XG4gICAgICAhYXJnLnNvbWUoZWxlbWVudCA9PiBMb2NhbENvbGxlY3Rpb24uX2YuX2VxdWFsKG9iamVjdCwgZWxlbWVudCkpXG4gICAgKTtcbiAgfSxcbiAgJHJlbmFtZSh0YXJnZXQsIGZpZWxkLCBhcmcsIGtleXBhdGgsIGRvYykge1xuICAgIC8vIG5vIGlkZWEgd2h5IG1vbmdvIGhhcyB0aGlzIHJlc3RyaWN0aW9uLi5cbiAgICBpZiAoa2V5cGF0aCA9PT0gYXJnKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHJlbmFtZSBzb3VyY2UgbXVzdCBkaWZmZXIgZnJvbSB0YXJnZXQnLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHJlbmFtZSBzb3VyY2UgZmllbGQgaW52YWxpZCcsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRyZW5hbWUgdGFyZ2V0IG11c3QgYmUgYSBzdHJpbmcnLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoYXJnLmluY2x1ZGVzKCdcXDAnKSkge1xuICAgICAgLy8gTnVsbCBieXRlcyBhcmUgbm90IGFsbG93ZWQgaW4gTW9uZ28gZmllbGQgbmFtZXNcbiAgICAgIC8vIGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL2xpbWl0cy8jUmVzdHJpY3Rpb25zLW9uLUZpZWxkLU5hbWVzXG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ1RoZSBcXCd0b1xcJyBmaWVsZCBmb3IgJHJlbmFtZSBjYW5ub3QgY29udGFpbiBhbiBlbWJlZGRlZCBudWxsIGJ5dGUnLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG9iamVjdCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcblxuICAgIGNvbnN0IGtleXBhcnRzID0gYXJnLnNwbGl0KCcuJyk7XG4gICAgY29uc3QgdGFyZ2V0MiA9IGZpbmRNb2RUYXJnZXQoZG9jLCBrZXlwYXJ0cywge2ZvcmJpZEFycmF5OiB0cnVlfSk7XG5cbiAgICBpZiAodGFyZ2V0MiA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRyZW5hbWUgdGFyZ2V0IGZpZWxkIGludmFsaWQnLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICB0YXJnZXQyW2tleXBhcnRzLnBvcCgpXSA9IG9iamVjdDtcbiAgfSxcbiAgJGJpdCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAvLyBYWFggbW9uZ28gb25seSBzdXBwb3J0cyAkYml0IG9uIGludGVnZXJzLCBhbmQgd2Ugb25seSBzdXBwb3J0XG4gICAgLy8gbmF0aXZlIGphdmFzY3JpcHQgbnVtYmVycyAoZG91Ymxlcykgc28gZmFyLCBzbyB3ZSBjYW4ndCBzdXBwb3J0ICRiaXRcbiAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJGJpdCBpcyBub3Qgc3VwcG9ydGVkJywge2ZpZWxkfSk7XG4gIH0sXG4gICR2KCkge1xuICAgIC8vIEFzIGRpc2N1c3NlZCBpbiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvOTYyMyxcbiAgICAvLyB0aGUgYCR2YCBvcGVyYXRvciBpcyBub3QgbmVlZGVkIGJ5IE1ldGVvciwgYnV0IHByb2JsZW1zIGNhbiBvY2N1ciBpZlxuICAgIC8vIGl0J3Mgbm90IGF0IGxlYXN0IGNhbGxhYmxlIChhcyBvZiBNb25nbyA+PSAzLjYpLiBJdCdzIGRlZmluZWQgaGVyZSBhc1xuICAgIC8vIGEgbm8tb3AgdG8gd29yayBhcm91bmQgdGhlc2UgcHJvYmxlbXMuXG4gIH1cbn07XG5cbmNvbnN0IE5PX0NSRUFURV9NT0RJRklFUlMgPSB7XG4gICRwb3A6IHRydWUsXG4gICRwdWxsOiB0cnVlLFxuICAkcHVsbEFsbDogdHJ1ZSxcbiAgJHJlbmFtZTogdHJ1ZSxcbiAgJHVuc2V0OiB0cnVlXG59O1xuXG4vLyBNYWtlIHN1cmUgZmllbGQgbmFtZXMgZG8gbm90IGNvbnRhaW4gTW9uZ28gcmVzdHJpY3RlZFxuLy8gY2hhcmFjdGVycyAoJy4nLCAnJCcsICdcXDAnKS5cbi8vIGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL2xpbWl0cy8jUmVzdHJpY3Rpb25zLW9uLUZpZWxkLU5hbWVzXG5jb25zdCBpbnZhbGlkQ2hhck1zZyA9IHtcbiAgJDogJ3N0YXJ0IHdpdGggXFwnJFxcJycsXG4gICcuJzogJ2NvbnRhaW4gXFwnLlxcJycsXG4gICdcXDAnOiAnY29udGFpbiBudWxsIGJ5dGVzJ1xufTtcblxuLy8gY2hlY2tzIGlmIGFsbCBmaWVsZCBuYW1lcyBpbiBhbiBvYmplY3QgYXJlIHZhbGlkXG5mdW5jdGlvbiBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoZG9jKSB7XG4gIGlmIChkb2MgJiYgdHlwZW9mIGRvYyA9PT0gJ29iamVjdCcpIHtcbiAgICBKU09OLnN0cmluZ2lmeShkb2MsIChrZXksIHZhbHVlKSA9PiB7XG4gICAgICBhc3NlcnRJc1ZhbGlkRmllbGROYW1lKGtleSk7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXNzZXJ0SXNWYWxpZEZpZWxkTmFtZShrZXkpIHtcbiAgbGV0IG1hdGNoO1xuICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycgJiYgKG1hdGNoID0ga2V5Lm1hdGNoKC9eXFwkfFxcLnxcXDAvKSkpIHtcbiAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihgS2V5ICR7a2V5fSBtdXN0IG5vdCAke2ludmFsaWRDaGFyTXNnW21hdGNoWzBdXX1gKTtcbiAgfVxufVxuXG4vLyBmb3IgYS5iLmMuMi5kLmUsIGtleXBhcnRzIHNob3VsZCBiZSBbJ2EnLCAnYicsICdjJywgJzInLCAnZCcsICdlJ10sXG4vLyBhbmQgdGhlbiB5b3Ugd291bGQgb3BlcmF0ZSBvbiB0aGUgJ2UnIHByb3BlcnR5IG9mIHRoZSByZXR1cm5lZFxuLy8gb2JqZWN0LlxuLy9cbi8vIGlmIG9wdGlvbnMubm9DcmVhdGUgaXMgZmFsc2V5LCBjcmVhdGVzIGludGVybWVkaWF0ZSBsZXZlbHMgb2Zcbi8vIHN0cnVjdHVyZSBhcyBuZWNlc3NhcnksIGxpa2UgbWtkaXIgLXAgKGFuZCByYWlzZXMgYW4gZXhjZXB0aW9uIGlmXG4vLyB0aGF0IHdvdWxkIG1lYW4gZ2l2aW5nIGEgbm9uLW51bWVyaWMgcHJvcGVydHkgdG8gYW4gYXJyYXkuKSBpZlxuLy8gb3B0aW9ucy5ub0NyZWF0ZSBpcyB0cnVlLCByZXR1cm4gdW5kZWZpbmVkIGluc3RlYWQuXG4vL1xuLy8gbWF5IG1vZGlmeSB0aGUgbGFzdCBlbGVtZW50IG9mIGtleXBhcnRzIHRvIHNpZ25hbCB0byB0aGUgY2FsbGVyIHRoYXQgaXQgbmVlZHNcbi8vIHRvIHVzZSBhIGRpZmZlcmVudCB2YWx1ZSB0byBpbmRleCBpbnRvIHRoZSByZXR1cm5lZCBvYmplY3QgKGZvciBleGFtcGxlLFxuLy8gWydhJywgJzAxJ10gLT4gWydhJywgMV0pLlxuLy9cbi8vIGlmIGZvcmJpZEFycmF5IGlzIHRydWUsIHJldHVybiBudWxsIGlmIHRoZSBrZXlwYXRoIGdvZXMgdGhyb3VnaCBhbiBhcnJheS5cbi8vXG4vLyBpZiBvcHRpb25zLmFycmF5SW5kaWNlcyBpcyBzZXQsIHVzZSBpdHMgZmlyc3QgZWxlbWVudCBmb3IgdGhlIChmaXJzdCkgJyQnIGluXG4vLyB0aGUgcGF0aC5cbmZ1bmN0aW9uIGZpbmRNb2RUYXJnZXQoZG9jLCBrZXlwYXJ0cywgb3B0aW9ucyA9IHt9KSB7XG4gIGxldCB1c2VkQXJyYXlJbmRleCA9IGZhbHNlO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwga2V5cGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBsYXN0ID0gaSA9PT0ga2V5cGFydHMubGVuZ3RoIC0gMTtcbiAgICBsZXQga2V5cGFydCA9IGtleXBhcnRzW2ldO1xuXG4gICAgaWYgKCFpc0luZGV4YWJsZShkb2MpKSB7XG4gICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlcnJvciA9IE1pbmltb25nb0Vycm9yKFxuICAgICAgICBgY2Fubm90IHVzZSB0aGUgcGFydCAnJHtrZXlwYXJ0fScgdG8gdHJhdmVyc2UgJHtkb2N9YFxuICAgICAgKTtcbiAgICAgIGVycm9yLnNldFByb3BlcnR5RXJyb3IgPSB0cnVlO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgaWYgKGRvYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICBpZiAob3B0aW9ucy5mb3JiaWRBcnJheSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGtleXBhcnQgPT09ICckJykge1xuICAgICAgICBpZiAodXNlZEFycmF5SW5kZXgpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignVG9vIG1hbnkgcG9zaXRpb25hbCAoaS5lLiBcXCckXFwnKSBlbGVtZW50cycpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRpb25zLmFycmF5SW5kaWNlcyB8fCAhb3B0aW9ucy5hcnJheUluZGljZXMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgICAnVGhlIHBvc2l0aW9uYWwgb3BlcmF0b3IgZGlkIG5vdCBmaW5kIHRoZSBtYXRjaCBuZWVkZWQgZnJvbSB0aGUgJyArXG4gICAgICAgICAgICAncXVlcnknXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGtleXBhcnQgPSBvcHRpb25zLmFycmF5SW5kaWNlc1swXTtcbiAgICAgICAgdXNlZEFycmF5SW5kZXggPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChpc051bWVyaWNLZXkoa2V5cGFydCkpIHtcbiAgICAgICAga2V5cGFydCA9IHBhcnNlSW50KGtleXBhcnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG9wdGlvbnMubm9DcmVhdGUpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgYGNhbid0IGFwcGVuZCB0byBhcnJheSB1c2luZyBzdHJpbmcgZmllbGQgbmFtZSBbJHtrZXlwYXJ0fV1gXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmIChsYXN0KSB7XG4gICAgICAgIGtleXBhcnRzW2ldID0ga2V5cGFydDsgLy8gaGFuZGxlICdhLjAxJ1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSAmJiBrZXlwYXJ0ID49IGRvYy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgd2hpbGUgKGRvYy5sZW5ndGggPCBrZXlwYXJ0KSB7XG4gICAgICAgIGRvYy5wdXNoKG51bGwpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWxhc3QpIHtcbiAgICAgICAgaWYgKGRvYy5sZW5ndGggPT09IGtleXBhcnQpIHtcbiAgICAgICAgICBkb2MucHVzaCh7fSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY1trZXlwYXJ0XSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAgIGBjYW4ndCBtb2RpZnkgZmllbGQgJyR7a2V5cGFydHNbaSArIDFdfScgb2YgbGlzdCB2YWx1ZSBgICtcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGRvY1trZXlwYXJ0XSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGFzc2VydElzVmFsaWRGaWVsZE5hbWUoa2V5cGFydCk7XG5cbiAgICAgIGlmICghKGtleXBhcnQgaW4gZG9jKSkge1xuICAgICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxhc3QpIHtcbiAgICAgICAgICBkb2Nba2V5cGFydF0gPSB7fTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsYXN0KSB7XG4gICAgICByZXR1cm4gZG9jO1xuICAgIH1cblxuICAgIGRvYyA9IGRvY1trZXlwYXJ0XTtcbiAgfVxuXG4gIC8vIG5vdHJlYWNoZWRcbn1cbiIsImltcG9ydCBMb2NhbENvbGxlY3Rpb24gZnJvbSAnLi9sb2NhbF9jb2xsZWN0aW9uLmpzJztcbmltcG9ydCB7XG4gIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yLFxuICBoYXNPd24sXG4gIG5vdGhpbmdNYXRjaGVyLFxufSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbmNvbnN0IERlY2ltYWwgPSBQYWNrYWdlWydtb25nby1kZWNpbWFsJ10/LkRlY2ltYWwgfHwgY2xhc3MgRGVjaW1hbFN0dWIge31cblxuLy8gVGhlIG1pbmltb25nbyBzZWxlY3RvciBjb21waWxlciFcblxuLy8gVGVybWlub2xvZ3k6XG4vLyAgLSBhICdzZWxlY3RvcicgaXMgdGhlIEVKU09OIG9iamVjdCByZXByZXNlbnRpbmcgYSBzZWxlY3RvclxuLy8gIC0gYSAnbWF0Y2hlcicgaXMgaXRzIGNvbXBpbGVkIGZvcm0gKHdoZXRoZXIgYSBmdWxsIE1pbmltb25nby5NYXRjaGVyXG4vLyAgICBvYmplY3Qgb3Igb25lIG9mIHRoZSBjb21wb25lbnQgbGFtYmRhcyB0aGF0IG1hdGNoZXMgcGFydHMgb2YgaXQpXG4vLyAgLSBhICdyZXN1bHQgb2JqZWN0JyBpcyBhbiBvYmplY3Qgd2l0aCBhICdyZXN1bHQnIGZpZWxkIGFuZCBtYXliZVxuLy8gICAgZGlzdGFuY2UgYW5kIGFycmF5SW5kaWNlcy5cbi8vICAtIGEgJ2JyYW5jaGVkIHZhbHVlJyBpcyBhbiBvYmplY3Qgd2l0aCBhICd2YWx1ZScgZmllbGQgYW5kIG1heWJlXG4vLyAgICAnZG9udEl0ZXJhdGUnIGFuZCAnYXJyYXlJbmRpY2VzJy5cbi8vICAtIGEgJ2RvY3VtZW50JyBpcyBhIHRvcC1sZXZlbCBvYmplY3QgdGhhdCBjYW4gYmUgc3RvcmVkIGluIGEgY29sbGVjdGlvbi5cbi8vICAtIGEgJ2xvb2t1cCBmdW5jdGlvbicgaXMgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGluIGEgZG9jdW1lbnQgYW5kIHJldHVybnNcbi8vICAgIGFuIGFycmF5IG9mICdicmFuY2hlZCB2YWx1ZXMnLlxuLy8gIC0gYSAnYnJhbmNoZWQgbWF0Y2hlcicgbWFwcyBmcm9tIGFuIGFycmF5IG9mIGJyYW5jaGVkIHZhbHVlcyB0byBhIHJlc3VsdFxuLy8gICAgb2JqZWN0LlxuLy8gIC0gYW4gJ2VsZW1lbnQgbWF0Y2hlcicgbWFwcyBmcm9tIGEgc2luZ2xlIHZhbHVlIHRvIGEgYm9vbC5cblxuLy8gTWFpbiBlbnRyeSBwb2ludC5cbi8vICAgdmFyIG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoe2E6IHskZ3Q6IDV9fSk7XG4vLyAgIGlmIChtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyh7YTogN30pKSAuLi5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1hdGNoZXIge1xuICBjb25zdHJ1Y3RvcihzZWxlY3RvciwgaXNVcGRhdGUpIHtcbiAgICAvLyBBIHNldCAob2JqZWN0IG1hcHBpbmcgc3RyaW5nIC0+ICopIG9mIGFsbCBvZiB0aGUgZG9jdW1lbnQgcGF0aHMgbG9va2VkXG4gICAgLy8gYXQgYnkgdGhlIHNlbGVjdG9yLiBBbHNvIGluY2x1ZGVzIHRoZSBlbXB0eSBzdHJpbmcgaWYgaXQgbWF5IGxvb2sgYXQgYW55XG4gICAgLy8gcGF0aCAoZWcsICR3aGVyZSkuXG4gICAgdGhpcy5fcGF0aHMgPSB7fTtcbiAgICAvLyBTZXQgdG8gdHJ1ZSBpZiBjb21waWxhdGlvbiBmaW5kcyBhICRuZWFyLlxuICAgIHRoaXMuX2hhc0dlb1F1ZXJ5ID0gZmFsc2U7XG4gICAgLy8gU2V0IHRvIHRydWUgaWYgY29tcGlsYXRpb24gZmluZHMgYSAkd2hlcmUuXG4gICAgdGhpcy5faGFzV2hlcmUgPSBmYWxzZTtcbiAgICAvLyBTZXQgdG8gZmFsc2UgaWYgY29tcGlsYXRpb24gZmluZHMgYW55dGhpbmcgb3RoZXIgdGhhbiBhIHNpbXBsZSBlcXVhbGl0eVxuICAgIC8vIG9yIG9uZSBvciBtb3JlIG9mICckZ3QnLCAnJGd0ZScsICckbHQnLCAnJGx0ZScsICckbmUnLCAnJGluJywgJyRuaW4nIHVzZWRcbiAgICAvLyB3aXRoIHNjYWxhcnMgYXMgb3BlcmFuZHMuXG4gICAgdGhpcy5faXNTaW1wbGUgPSB0cnVlO1xuICAgIC8vIFNldCB0byBhIGR1bW15IGRvY3VtZW50IHdoaWNoIGFsd2F5cyBtYXRjaGVzIHRoaXMgTWF0Y2hlci4gT3Igc2V0IHRvIG51bGxcbiAgICAvLyBpZiBzdWNoIGRvY3VtZW50IGlzIHRvbyBoYXJkIHRvIGZpbmQuXG4gICAgdGhpcy5fbWF0Y2hpbmdEb2N1bWVudCA9IHVuZGVmaW5lZDtcbiAgICAvLyBBIGNsb25lIG9mIHRoZSBvcmlnaW5hbCBzZWxlY3Rvci4gSXQgbWF5IGp1c3QgYmUgYSBmdW5jdGlvbiBpZiB0aGUgdXNlclxuICAgIC8vIHBhc3NlZCBpbiBhIGZ1bmN0aW9uOyBvdGhlcndpc2UgaXMgZGVmaW5pdGVseSBhbiBvYmplY3QgKGVnLCBJRHMgYXJlXG4gICAgLy8gdHJhbnNsYXRlZCBpbnRvIHtfaWQ6IElEfSBmaXJzdC4gVXNlZCBieSBjYW5CZWNvbWVUcnVlQnlNb2RpZmllciBhbmRcbiAgICAvLyBTb3J0ZXIuX3VzZVdpdGhNYXRjaGVyLlxuICAgIHRoaXMuX3NlbGVjdG9yID0gbnVsbDtcbiAgICB0aGlzLl9kb2NNYXRjaGVyID0gdGhpcy5fY29tcGlsZVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAvLyBTZXQgdG8gdHJ1ZSBpZiBzZWxlY3Rpb24gaXMgZG9uZSBmb3IgYW4gdXBkYXRlIG9wZXJhdGlvblxuICAgIC8vIERlZmF1bHQgaXMgZmFsc2VcbiAgICAvLyBVc2VkIGZvciAkbmVhciBhcnJheSB1cGRhdGUgKGlzc3VlICMzNTk5KVxuICAgIHRoaXMuX2lzVXBkYXRlID0gaXNVcGRhdGU7XG4gIH1cblxuICBkb2N1bWVudE1hdGNoZXMoZG9jKSB7XG4gICAgaWYgKGRvYyAhPT0gT2JqZWN0KGRvYykpIHtcbiAgICAgIHRocm93IEVycm9yKCdkb2N1bWVudE1hdGNoZXMgbmVlZHMgYSBkb2N1bWVudCcpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9kb2NNYXRjaGVyKGRvYyk7XG4gIH1cblxuICBoYXNHZW9RdWVyeSgpIHtcbiAgICByZXR1cm4gdGhpcy5faGFzR2VvUXVlcnk7XG4gIH1cblxuICBoYXNXaGVyZSgpIHtcbiAgICByZXR1cm4gdGhpcy5faGFzV2hlcmU7XG4gIH1cblxuICBpc1NpbXBsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNTaW1wbGU7XG4gIH1cblxuICAvLyBHaXZlbiBhIHNlbGVjdG9yLCByZXR1cm4gYSBmdW5jdGlvbiB0aGF0IHRha2VzIG9uZSBhcmd1bWVudCwgYVxuICAvLyBkb2N1bWVudC4gSXQgcmV0dXJucyBhIHJlc3VsdCBvYmplY3QuXG4gIF9jb21waWxlU2VsZWN0b3Ioc2VsZWN0b3IpIHtcbiAgICAvLyB5b3UgY2FuIHBhc3MgYSBsaXRlcmFsIGZ1bmN0aW9uIGluc3RlYWQgb2YgYSBzZWxlY3RvclxuICAgIGlmIChzZWxlY3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICB0aGlzLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgICAgdGhpcy5fc2VsZWN0b3IgPSBzZWxlY3RvcjtcbiAgICAgIHRoaXMuX3JlY29yZFBhdGhVc2VkKCcnKTtcblxuICAgICAgcmV0dXJuIGRvYyA9PiAoe3Jlc3VsdDogISFzZWxlY3Rvci5jYWxsKGRvYyl9KTtcbiAgICB9XG5cbiAgICAvLyBzaG9ydGhhbmQgLS0gc2NhbGFyIF9pZFxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikpIHtcbiAgICAgIHRoaXMuX3NlbGVjdG9yID0ge19pZDogc2VsZWN0b3J9O1xuICAgICAgdGhpcy5fcmVjb3JkUGF0aFVzZWQoJ19pZCcpO1xuXG4gICAgICByZXR1cm4gZG9jID0+ICh7cmVzdWx0OiBFSlNPTi5lcXVhbHMoZG9jLl9pZCwgc2VsZWN0b3IpfSk7XG4gICAgfVxuXG4gICAgLy8gcHJvdGVjdCBhZ2FpbnN0IGRhbmdlcm91cyBzZWxlY3RvcnMuICBmYWxzZXkgYW5kIHtfaWQ6IGZhbHNleX0gYXJlIGJvdGhcbiAgICAvLyBsaWtlbHkgcHJvZ3JhbW1lciBlcnJvciwgYW5kIG5vdCB3aGF0IHlvdSB3YW50LCBwYXJ0aWN1bGFybHkgZm9yXG4gICAgLy8gZGVzdHJ1Y3RpdmUgb3BlcmF0aW9ucy5cbiAgICBpZiAoIXNlbGVjdG9yIHx8IGhhc093bi5jYWxsKHNlbGVjdG9yLCAnX2lkJykgJiYgIXNlbGVjdG9yLl9pZCkge1xuICAgICAgdGhpcy5faXNTaW1wbGUgPSBmYWxzZTtcbiAgICAgIHJldHVybiBub3RoaW5nTWF0Y2hlcjtcbiAgICB9XG5cbiAgICAvLyBUb3AgbGV2ZWwgY2FuJ3QgYmUgYW4gYXJyYXkgb3IgdHJ1ZSBvciBiaW5hcnkuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc2VsZWN0b3IpIHx8XG4gICAgICAgIEVKU09OLmlzQmluYXJ5KHNlbGVjdG9yKSB8fFxuICAgICAgICB0eXBlb2Ygc2VsZWN0b3IgPT09ICdib29sZWFuJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHNlbGVjdG9yOiAke3NlbGVjdG9yfWApO1xuICAgIH1cblxuICAgIHRoaXMuX3NlbGVjdG9yID0gRUpTT04uY2xvbmUoc2VsZWN0b3IpO1xuXG4gICAgcmV0dXJuIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yLCB0aGlzLCB7aXNSb290OiB0cnVlfSk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgbGlzdCBvZiBrZXkgcGF0aHMgdGhlIGdpdmVuIHNlbGVjdG9yIGlzIGxvb2tpbmcgZm9yLiBJdCBpbmNsdWRlc1xuICAvLyB0aGUgZW1wdHkgc3RyaW5nIGlmIHRoZXJlIGlzIGEgJHdoZXJlLlxuICBfZ2V0UGF0aHMoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3BhdGhzKTtcbiAgfVxuXG4gIF9yZWNvcmRQYXRoVXNlZChwYXRoKSB7XG4gICAgdGhpcy5fcGF0aHNbcGF0aF0gPSB0cnVlO1xuICB9XG59XG5cbi8vIGhlbHBlcnMgdXNlZCBieSBjb21waWxlZCBzZWxlY3RvciBjb2RlXG5Mb2NhbENvbGxlY3Rpb24uX2YgPSB7XG4gIC8vIFhYWCBmb3IgX2FsbCBhbmQgX2luLCBjb25zaWRlciBidWlsZGluZyAnaW5xdWVyeScgYXQgY29tcGlsZSB0aW1lLi5cbiAgX3R5cGUodikge1xuICAgIGlmICh0eXBlb2YgdiA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiAyO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdiA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICByZXR1cm4gODtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgcmV0dXJuIDQ7XG4gICAgfVxuXG4gICAgaWYgKHYgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAxMDtcbiAgICB9XG5cbiAgICAvLyBub3RlIHRoYXQgdHlwZW9mKC94LykgPT09IFwib2JqZWN0XCJcbiAgICBpZiAodiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgcmV0dXJuIDExO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIDEzO1xuICAgIH1cblxuICAgIGlmICh2IGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgcmV0dXJuIDk7XG4gICAgfVxuXG4gICAgaWYgKEVKU09OLmlzQmluYXJ5KHYpKSB7XG4gICAgICByZXR1cm4gNTtcbiAgICB9XG5cbiAgICBpZiAodiBpbnN0YW5jZW9mIE1vbmdvSUQuT2JqZWN0SUQpIHtcbiAgICAgIHJldHVybiA3O1xuICAgIH1cblxuICAgIGlmICh2IGluc3RhbmNlb2YgRGVjaW1hbCkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gb2JqZWN0XG4gICAgcmV0dXJuIDM7XG5cbiAgICAvLyBYWFggc3VwcG9ydCBzb21lL2FsbCBvZiB0aGVzZTpcbiAgICAvLyAxNCwgc3ltYm9sXG4gICAgLy8gMTUsIGphdmFzY3JpcHQgY29kZSB3aXRoIHNjb3BlXG4gICAgLy8gMTYsIDE4OiAzMi1iaXQvNjQtYml0IGludGVnZXJcbiAgICAvLyAxNywgdGltZXN0YW1wXG4gICAgLy8gMjU1LCBtaW5rZXlcbiAgICAvLyAxMjcsIG1heGtleVxuICB9LFxuXG4gIC8vIGRlZXAgZXF1YWxpdHkgdGVzdDogdXNlIGZvciBsaXRlcmFsIGRvY3VtZW50IGFuZCBhcnJheSBtYXRjaGVzXG4gIF9lcXVhbChhLCBiKSB7XG4gICAgcmV0dXJuIEVKU09OLmVxdWFscyhhLCBiLCB7a2V5T3JkZXJTZW5zaXRpdmU6IHRydWV9KTtcbiAgfSxcblxuICAvLyBtYXBzIGEgdHlwZSBjb2RlIHRvIGEgdmFsdWUgdGhhdCBjYW4gYmUgdXNlZCB0byBzb3J0IHZhbHVlcyBvZiBkaWZmZXJlbnRcbiAgLy8gdHlwZXNcbiAgX3R5cGVvcmRlcih0KSB7XG4gICAgLy8gaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvV2hhdCtpcyt0aGUrQ29tcGFyZStPcmRlcitmb3IrQlNPTitUeXBlc1xuICAgIC8vIFhYWCB3aGF0IGlzIHRoZSBjb3JyZWN0IHNvcnQgcG9zaXRpb24gZm9yIEphdmFzY3JpcHQgY29kZT9cbiAgICAvLyAoJzEwMCcgaW4gdGhlIG1hdHJpeCBiZWxvdylcbiAgICAvLyBYWFggbWlua2V5L21heGtleVxuICAgIHJldHVybiBbXG4gICAgICAtMSwgIC8vIChub3QgYSB0eXBlKVxuICAgICAgMSwgICAvLyBudW1iZXJcbiAgICAgIDIsICAgLy8gc3RyaW5nXG4gICAgICAzLCAgIC8vIG9iamVjdFxuICAgICAgNCwgICAvLyBhcnJheVxuICAgICAgNSwgICAvLyBiaW5hcnlcbiAgICAgIC0xLCAgLy8gZGVwcmVjYXRlZFxuICAgICAgNiwgICAvLyBPYmplY3RJRFxuICAgICAgNywgICAvLyBib29sXG4gICAgICA4LCAgIC8vIERhdGVcbiAgICAgIDAsICAgLy8gbnVsbFxuICAgICAgOSwgICAvLyBSZWdFeHBcbiAgICAgIC0xLCAgLy8gZGVwcmVjYXRlZFxuICAgICAgMTAwLCAvLyBKUyBjb2RlXG4gICAgICAyLCAgIC8vIGRlcHJlY2F0ZWQgKHN5bWJvbClcbiAgICAgIDEwMCwgLy8gSlMgY29kZVxuICAgICAgMSwgICAvLyAzMi1iaXQgaW50XG4gICAgICA4LCAgIC8vIE1vbmdvIHRpbWVzdGFtcFxuICAgICAgMSAgICAvLyA2NC1iaXQgaW50XG4gICAgXVt0XTtcbiAgfSxcblxuICAvLyBjb21wYXJlIHR3byB2YWx1ZXMgb2YgdW5rbm93biB0eXBlIGFjY29yZGluZyB0byBCU09OIG9yZGVyaW5nXG4gIC8vIHNlbWFudGljcy4gKGFzIGFuIGV4dGVuc2lvbiwgY29uc2lkZXIgJ3VuZGVmaW5lZCcgdG8gYmUgbGVzcyB0aGFuXG4gIC8vIGFueSBvdGhlciB2YWx1ZS4pIHJldHVybiBuZWdhdGl2ZSBpZiBhIGlzIGxlc3MsIHBvc2l0aXZlIGlmIGIgaXNcbiAgLy8gbGVzcywgb3IgMCBpZiBlcXVhbFxuICBfY21wKGEsIGIpIHtcbiAgICBpZiAoYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gYiA9PT0gdW5kZWZpbmVkID8gMCA6IC0xO1xuICAgIH1cblxuICAgIGlmIChiID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGxldCB0YSA9IExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZShhKTtcbiAgICBsZXQgdGIgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUoYik7XG5cbiAgICBjb25zdCBvYSA9IExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZW9yZGVyKHRhKTtcbiAgICBjb25zdCBvYiA9IExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZW9yZGVyKHRiKTtcblxuICAgIGlmIChvYSAhPT0gb2IpIHtcbiAgICAgIHJldHVybiBvYSA8IG9iID8gLTEgOiAxO1xuICAgIH1cblxuICAgIC8vIFhYWCBuZWVkIHRvIGltcGxlbWVudCB0aGlzIGlmIHdlIGltcGxlbWVudCBTeW1ib2wgb3IgaW50ZWdlcnMsIG9yXG4gICAgLy8gVGltZXN0YW1wXG4gICAgaWYgKHRhICE9PSB0Yikge1xuICAgICAgdGhyb3cgRXJyb3IoJ01pc3NpbmcgdHlwZSBjb2VyY2lvbiBsb2dpYyBpbiBfY21wJyk7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA3KSB7IC8vIE9iamVjdElEXG4gICAgICAvLyBDb252ZXJ0IHRvIHN0cmluZy5cbiAgICAgIHRhID0gdGIgPSAyO1xuICAgICAgYSA9IGEudG9IZXhTdHJpbmcoKTtcbiAgICAgIGIgPSBiLnRvSGV4U3RyaW5nKCk7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA5KSB7IC8vIERhdGVcbiAgICAgIC8vIENvbnZlcnQgdG8gbWlsbGlzLlxuICAgICAgdGEgPSB0YiA9IDE7XG4gICAgICBhID0gYS5nZXRUaW1lKCk7XG4gICAgICBiID0gYi5nZXRUaW1lKCk7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSAxKSB7IC8vIGRvdWJsZVxuICAgICAgaWYgKGEgaW5zdGFuY2VvZiBEZWNpbWFsKSB7XG4gICAgICAgIHJldHVybiBhLm1pbnVzKGIpLnRvTnVtYmVyKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYSAtIGI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRiID09PSAyKSAvLyBzdHJpbmdcbiAgICAgIHJldHVybiBhIDwgYiA/IC0xIDogYSA9PT0gYiA/IDAgOiAxO1xuXG4gICAgaWYgKHRhID09PSAzKSB7IC8vIE9iamVjdFxuICAgICAgLy8gdGhpcyBjb3VsZCBiZSBtdWNoIG1vcmUgZWZmaWNpZW50IGluIHRoZSBleHBlY3RlZCBjYXNlIC4uLlxuICAgICAgY29uc3QgdG9BcnJheSA9IG9iamVjdCA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKG9iamVjdCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKHRvQXJyYXkoYSksIHRvQXJyYXkoYikpO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gNCkgeyAvLyBBcnJheVxuICAgICAgZm9yIChsZXQgaSA9IDA7IDsgaSsrKSB7XG4gICAgICAgIGlmIChpID09PSBhLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiBpID09PSBiLmxlbmd0aCA/IDAgOiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpID09PSBiLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcyA9IExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKGFbaV0sIGJbaV0pO1xuICAgICAgICBpZiAocyAhPT0gMCkge1xuICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA1KSB7IC8vIGJpbmFyeVxuICAgICAgLy8gU3VycHJpc2luZ2x5LCBhIHNtYWxsIGJpbmFyeSBibG9iIGlzIGFsd2F5cyBsZXNzIHRoYW4gYSBsYXJnZSBvbmUgaW5cbiAgICAgIC8vIE1vbmdvLlxuICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gYS5sZW5ndGggLSBiLmxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhW2ldIDwgYltpXSkge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhW2ldID4gYltpXSkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gOCkgeyAvLyBib29sZWFuXG4gICAgICBpZiAoYSkge1xuICAgICAgICByZXR1cm4gYiA/IDAgOiAxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYiA/IC0xIDogMDtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDEwKSAvLyBudWxsXG4gICAgICByZXR1cm4gMDtcblxuICAgIGlmICh0YSA9PT0gMTEpIC8vIHJlZ2V4cFxuICAgICAgdGhyb3cgRXJyb3IoJ1NvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiByZWd1bGFyIGV4cHJlc3Npb24nKTsgLy8gWFhYXG5cbiAgICAvLyAxMzogamF2YXNjcmlwdCBjb2RlXG4gICAgLy8gMTQ6IHN5bWJvbFxuICAgIC8vIDE1OiBqYXZhc2NyaXB0IGNvZGUgd2l0aCBzY29wZVxuICAgIC8vIDE2OiAzMi1iaXQgaW50ZWdlclxuICAgIC8vIDE3OiB0aW1lc3RhbXBcbiAgICAvLyAxODogNjQtYml0IGludGVnZXJcbiAgICAvLyAyNTU6IG1pbmtleVxuICAgIC8vIDEyNzogbWF4a2V5XG4gICAgaWYgKHRhID09PSAxMykgLy8gamF2YXNjcmlwdCBjb2RlXG4gICAgICB0aHJvdyBFcnJvcignU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIEphdmFzY3JpcHQgY29kZScpOyAvLyBYWFhcblxuICAgIHRocm93IEVycm9yKCdVbmtub3duIHR5cGUgdG8gc29ydCcpO1xuICB9LFxufTtcbiIsImltcG9ydCBMb2NhbENvbGxlY3Rpb25fIGZyb20gJy4vbG9jYWxfY29sbGVjdGlvbi5qcyc7XG5pbXBvcnQgTWF0Y2hlciBmcm9tICcuL21hdGNoZXIuanMnO1xuaW1wb3J0IFNvcnRlciBmcm9tICcuL3NvcnRlci5qcyc7XG5cbkxvY2FsQ29sbGVjdGlvbiA9IExvY2FsQ29sbGVjdGlvbl87XG5NaW5pbW9uZ28gPSB7XG4gICAgTG9jYWxDb2xsZWN0aW9uOiBMb2NhbENvbGxlY3Rpb25fLFxuICAgIE1hdGNoZXIsXG4gICAgU29ydGVyXG59O1xuIiwiLy8gT2JzZXJ2ZUhhbmRsZTogdGhlIHJldHVybiB2YWx1ZSBvZiBhIGxpdmUgcXVlcnkuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBPYnNlcnZlSGFuZGxlIHt9XG4iLCJpbXBvcnQge1xuICBFTEVNRU5UX09QRVJBVE9SUyxcbiAgZXF1YWxpdHlFbGVtZW50TWF0Y2hlcixcbiAgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyxcbiAgaGFzT3duLFxuICBpc09wZXJhdG9yT2JqZWN0LFxuICBtYWtlTG9va3VwRnVuY3Rpb24sXG4gIHJlZ2V4cEVsZW1lbnRNYXRjaGVyLFxufSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbi8vIEdpdmUgYSBzb3J0IHNwZWMsIHdoaWNoIGNhbiBiZSBpbiBhbnkgb2YgdGhlc2UgZm9ybXM6XG4vLyAgIHtcImtleTFcIjogMSwgXCJrZXkyXCI6IC0xfVxuLy8gICBbW1wia2V5MVwiLCBcImFzY1wiXSwgW1wia2V5MlwiLCBcImRlc2NcIl1dXG4vLyAgIFtcImtleTFcIiwgW1wia2V5MlwiLCBcImRlc2NcIl1dXG4vL1xuLy8gKC4uIHdpdGggdGhlIGZpcnN0IGZvcm0gYmVpbmcgZGVwZW5kZW50IG9uIHRoZSBrZXkgZW51bWVyYXRpb25cbi8vIGJlaGF2aW9yIG9mIHlvdXIgamF2YXNjcmlwdCBWTSwgd2hpY2ggdXN1YWxseSBkb2VzIHdoYXQgeW91IG1lYW4gaW5cbi8vIHRoaXMgY2FzZSBpZiB0aGUga2V5IG5hbWVzIGRvbid0IGxvb2sgbGlrZSBpbnRlZ2VycyAuLilcbi8vXG4vLyByZXR1cm4gYSBmdW5jdGlvbiB0aGF0IHRha2VzIHR3byBvYmplY3RzLCBhbmQgcmV0dXJucyAtMSBpZiB0aGVcbi8vIGZpcnN0IG9iamVjdCBjb21lcyBmaXJzdCBpbiBvcmRlciwgMSBpZiB0aGUgc2Vjb25kIG9iamVjdCBjb21lc1xuLy8gZmlyc3QsIG9yIDAgaWYgbmVpdGhlciBvYmplY3QgY29tZXMgYmVmb3JlIHRoZSBvdGhlci5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU29ydGVyIHtcbiAgY29uc3RydWN0b3Ioc3BlYykge1xuICAgIHRoaXMuX3NvcnRTcGVjUGFydHMgPSBbXTtcbiAgICB0aGlzLl9zb3J0RnVuY3Rpb24gPSBudWxsO1xuXG4gICAgY29uc3QgYWRkU3BlY1BhcnQgPSAocGF0aCwgYXNjZW5kaW5nKSA9PiB7XG4gICAgICBpZiAoIXBhdGgpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJ3NvcnQga2V5cyBtdXN0IGJlIG5vbi1lbXB0eScpO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aC5jaGFyQXQoMCkgPT09ICckJykge1xuICAgICAgICB0aHJvdyBFcnJvcihgdW5zdXBwb3J0ZWQgc29ydCBrZXk6ICR7cGF0aH1gKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fc29ydFNwZWNQYXJ0cy5wdXNoKHtcbiAgICAgICAgYXNjZW5kaW5nLFxuICAgICAgICBsb29rdXA6IG1ha2VMb29rdXBGdW5jdGlvbihwYXRoLCB7Zm9yU29ydDogdHJ1ZX0pLFxuICAgICAgICBwYXRoXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKHNwZWMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgc3BlYy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgYWRkU3BlY1BhcnQoZWxlbWVudCwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWRkU3BlY1BhcnQoZWxlbWVudFswXSwgZWxlbWVudFsxXSAhPT0gJ2Rlc2MnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc3BlYyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5rZXlzKHNwZWMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgYWRkU3BlY1BhcnQoa2V5LCBzcGVjW2tleV0gPj0gMCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzcGVjID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9zb3J0RnVuY3Rpb24gPSBzcGVjO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBFcnJvcihgQmFkIHNvcnQgc3BlY2lmaWNhdGlvbjogJHtKU09OLnN0cmluZ2lmeShzcGVjKX1gKTtcbiAgICB9XG5cbiAgICAvLyBJZiBhIGZ1bmN0aW9uIGlzIHNwZWNpZmllZCBmb3Igc29ydGluZywgd2Ugc2tpcCB0aGUgcmVzdC5cbiAgICBpZiAodGhpcy5fc29ydEZ1bmN0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVG8gaW1wbGVtZW50IGFmZmVjdGVkQnlNb2RpZmllciwgd2UgcGlnZ3ktYmFjayBvbiB0b3Agb2YgTWF0Y2hlcidzXG4gICAgLy8gYWZmZWN0ZWRCeU1vZGlmaWVyIGNvZGU7IHdlIGNyZWF0ZSBhIHNlbGVjdG9yIHRoYXQgaXMgYWZmZWN0ZWQgYnkgdGhlXG4gICAgLy8gc2FtZSBtb2RpZmllcnMgYXMgdGhpcyBzb3J0IG9yZGVyLiBUaGlzIGlzIG9ubHkgaW1wbGVtZW50ZWQgb24gdGhlXG4gICAgLy8gc2VydmVyLlxuICAgIGlmICh0aGlzLmFmZmVjdGVkQnlNb2RpZmllcikge1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPSB7fTtcblxuICAgICAgdGhpcy5fc29ydFNwZWNQYXJ0cy5mb3JFYWNoKHNwZWMgPT4ge1xuICAgICAgICBzZWxlY3RvcltzcGVjLnBhdGhdID0gMTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9zZWxlY3RvckZvckFmZmVjdGVkQnlNb2RpZmllciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgdGhpcy5fa2V5Q29tcGFyYXRvciA9IGNvbXBvc2VDb21wYXJhdG9ycyhcbiAgICAgIHRoaXMuX3NvcnRTcGVjUGFydHMubWFwKChzcGVjLCBpKSA9PiB0aGlzLl9rZXlGaWVsZENvbXBhcmF0b3IoaSkpXG4gICAgKTtcbiAgfVxuXG4gIGdldENvbXBhcmF0b3Iob3B0aW9ucykge1xuICAgIC8vIElmIHNvcnQgaXMgc3BlY2lmaWVkIG9yIGhhdmUgbm8gZGlzdGFuY2VzLCBqdXN0IHVzZSB0aGUgY29tcGFyYXRvciBmcm9tXG4gICAgLy8gdGhlIHNvdXJjZSBzcGVjaWZpY2F0aW9uICh3aGljaCBkZWZhdWx0cyB0byBcImV2ZXJ5dGhpbmcgaXMgZXF1YWxcIi5cbiAgICAvLyBpc3N1ZSAjMzU5OVxuICAgIC8vIGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL29wZXJhdG9yL3F1ZXJ5L25lYXIvI3NvcnQtb3BlcmF0aW9uXG4gICAgLy8gc29ydCBlZmZlY3RpdmVseSBvdmVycmlkZXMgJG5lYXJcbiAgICBpZiAodGhpcy5fc29ydFNwZWNQYXJ0cy5sZW5ndGggfHwgIW9wdGlvbnMgfHwgIW9wdGlvbnMuZGlzdGFuY2VzKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZ2V0QmFzZUNvbXBhcmF0b3IoKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXN0YW5jZXMgPSBvcHRpb25zLmRpc3RhbmNlcztcblxuICAgIC8vIFJldHVybiBhIGNvbXBhcmF0b3Igd2hpY2ggY29tcGFyZXMgdXNpbmcgJG5lYXIgZGlzdGFuY2VzLlxuICAgIHJldHVybiAoYSwgYikgPT4ge1xuICAgICAgaWYgKCFkaXN0YW5jZXMuaGFzKGEuX2lkKSkge1xuICAgICAgICB0aHJvdyBFcnJvcihgTWlzc2luZyBkaXN0YW5jZSBmb3IgJHthLl9pZH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFkaXN0YW5jZXMuaGFzKGIuX2lkKSkge1xuICAgICAgICB0aHJvdyBFcnJvcihgTWlzc2luZyBkaXN0YW5jZSBmb3IgJHtiLl9pZH1gKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRpc3RhbmNlcy5nZXQoYS5faWQpIC0gZGlzdGFuY2VzLmdldChiLl9pZCk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIFRha2VzIGluIHR3byBrZXlzOiBhcnJheXMgd2hvc2UgbGVuZ3RocyBtYXRjaCB0aGUgbnVtYmVyIG9mIHNwZWNcbiAgLy8gcGFydHMuIFJldHVybnMgbmVnYXRpdmUsIDAsIG9yIHBvc2l0aXZlIGJhc2VkIG9uIHVzaW5nIHRoZSBzb3J0IHNwZWMgdG9cbiAgLy8gY29tcGFyZSBmaWVsZHMuXG4gIF9jb21wYXJlS2V5cyhrZXkxLCBrZXkyKSB7XG4gICAgaWYgKGtleTEubGVuZ3RoICE9PSB0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCB8fFxuICAgICAgICBrZXkyLmxlbmd0aCAhPT0gdGhpcy5fc29ydFNwZWNQYXJ0cy5sZW5ndGgpIHtcbiAgICAgIHRocm93IEVycm9yKCdLZXkgaGFzIHdyb25nIGxlbmd0aCcpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9rZXlDb21wYXJhdG9yKGtleTEsIGtleTIpO1xuICB9XG5cbiAgLy8gSXRlcmF0ZXMgb3ZlciBlYWNoIHBvc3NpYmxlIFwia2V5XCIgZnJvbSBkb2MgKGllLCBvdmVyIGVhY2ggYnJhbmNoKSwgY2FsbGluZ1xuICAvLyAnY2InIHdpdGggdGhlIGtleS5cbiAgX2dlbmVyYXRlS2V5c0Zyb21Eb2MoZG9jLCBjYikge1xuICAgIGlmICh0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5cXCd0IGdlbmVyYXRlIGtleXMgd2l0aG91dCBhIHNwZWMnKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXRoRnJvbUluZGljZXMgPSBpbmRpY2VzID0+IGAke2luZGljZXMuam9pbignLCcpfSxgO1xuXG4gICAgbGV0IGtub3duUGF0aHMgPSBudWxsO1xuXG4gICAgLy8gbWFwcyBpbmRleCAtPiAoeycnIC0+IHZhbHVlfSBvciB7cGF0aCAtPiB2YWx1ZX0pXG4gICAgY29uc3QgdmFsdWVzQnlJbmRleEFuZFBhdGggPSB0aGlzLl9zb3J0U3BlY1BhcnRzLm1hcChzcGVjID0+IHtcbiAgICAgIC8vIEV4cGFuZCBhbnkgbGVhZiBhcnJheXMgdGhhdCB3ZSBmaW5kLCBhbmQgaWdub3JlIHRob3NlIGFycmF5c1xuICAgICAgLy8gdGhlbXNlbHZlcy4gIChXZSBuZXZlciBzb3J0IGJhc2VkIG9uIGFuIGFycmF5IGl0c2VsZi4pXG4gICAgICBsZXQgYnJhbmNoZXMgPSBleHBhbmRBcnJheXNJbkJyYW5jaGVzKHNwZWMubG9va3VwKGRvYyksIHRydWUpO1xuXG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gdmFsdWVzIGZvciBhIGtleSAoZWcsIGtleSBnb2VzIHRvIGFuIGVtcHR5IGFycmF5KSxcbiAgICAgIC8vIHByZXRlbmQgd2UgZm91bmQgb25lIHVuZGVmaW5lZCB2YWx1ZS5cbiAgICAgIGlmICghYnJhbmNoZXMubGVuZ3RoKSB7XG4gICAgICAgIGJyYW5jaGVzID0gW3sgdmFsdWU6IHZvaWQgMCB9XTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZWxlbWVudCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICBsZXQgdXNlZFBhdGhzID0gZmFsc2U7XG5cbiAgICAgIGJyYW5jaGVzLmZvckVhY2goYnJhbmNoID0+IHtcbiAgICAgICAgaWYgKCFicmFuY2guYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGFycmF5IGluZGljZXMgZm9yIGEgYnJhbmNoLCB0aGVuIGl0IG11c3QgYmUgdGhlXG4gICAgICAgICAgLy8gb25seSBicmFuY2gsIGJlY2F1c2UgdGhlIG9ubHkgdGhpbmcgdGhhdCBwcm9kdWNlcyBtdWx0aXBsZSBicmFuY2hlc1xuICAgICAgICAgIC8vIGlzIHRoZSB1c2Ugb2YgYXJyYXlzLlxuICAgICAgICAgIGlmIChicmFuY2hlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignbXVsdGlwbGUgYnJhbmNoZXMgYnV0IG5vIGFycmF5IHVzZWQ/Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZWxlbWVudFsnJ10gPSBicmFuY2gudmFsdWU7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdXNlZFBhdGhzID0gdHJ1ZTtcblxuICAgICAgICBjb25zdCBwYXRoID0gcGF0aEZyb21JbmRpY2VzKGJyYW5jaC5hcnJheUluZGljZXMpO1xuXG4gICAgICAgIGlmIChoYXNPd24uY2FsbChlbGVtZW50LCBwYXRoKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKGBkdXBsaWNhdGUgcGF0aDogJHtwYXRofWApO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudFtwYXRoXSA9IGJyYW5jaC52YWx1ZTtcblxuICAgICAgICAvLyBJZiB0d28gc29ydCBmaWVsZHMgYm90aCBnbyBpbnRvIGFycmF5cywgdGhleSBoYXZlIHRvIGdvIGludG8gdGhlXG4gICAgICAgIC8vIGV4YWN0IHNhbWUgYXJyYXlzIGFuZCB3ZSBoYXZlIHRvIGZpbmQgdGhlIHNhbWUgcGF0aHMuICBUaGlzIGlzXG4gICAgICAgIC8vIHJvdWdobHkgdGhlIHNhbWUgY29uZGl0aW9uIHRoYXQgbWFrZXMgTW9uZ29EQiB0aHJvdyB0aGlzIHN0cmFuZ2VcbiAgICAgICAgLy8gZXJyb3IgbWVzc2FnZS4gIGVnLCB0aGUgbWFpbiB0aGluZyBpcyB0aGF0IGlmIHNvcnQgc3BlYyBpcyB7YTogMSxcbiAgICAgICAgLy8gYjoxfSB0aGVuIGEgYW5kIGIgY2Fubm90IGJvdGggYmUgYXJyYXlzLlxuICAgICAgICAvL1xuICAgICAgICAvLyAoSW4gTW9uZ29EQiBpdCBzZWVtcyB0byBiZSBPSyB0byBoYXZlIHthOiAxLCAnYS54LnknOiAxfSB3aGVyZSAnYSdcbiAgICAgICAgLy8gYW5kICdhLngueScgYXJlIGJvdGggYXJyYXlzLCBidXQgd2UgZG9uJ3QgYWxsb3cgdGhpcyBmb3Igbm93LlxuICAgICAgICAvLyAjTmVzdGVkQXJyYXlTb3J0XG4gICAgICAgIC8vIFhYWCBhY2hpZXZlIGZ1bGwgY29tcGF0aWJpbGl0eSBoZXJlXG4gICAgICAgIGlmIChrbm93blBhdGhzICYmICFoYXNPd24uY2FsbChrbm93blBhdGhzLCBwYXRoKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdjYW5ub3QgaW5kZXggcGFyYWxsZWwgYXJyYXlzJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoa25vd25QYXRocykge1xuICAgICAgICAvLyBTaW1pbGFybHkgdG8gYWJvdmUsIHBhdGhzIG11c3QgbWF0Y2ggZXZlcnl3aGVyZSwgdW5sZXNzIHRoaXMgaXMgYVxuICAgICAgICAvLyBub24tYXJyYXkgZmllbGQuXG4gICAgICAgIGlmICghaGFzT3duLmNhbGwoZWxlbWVudCwgJycpICYmXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhrbm93blBhdGhzKS5sZW5ndGggIT09IE9iamVjdC5rZXlzKGVsZW1lbnQpLmxlbmd0aCkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdjYW5ub3QgaW5kZXggcGFyYWxsZWwgYXJyYXlzIScpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHVzZWRQYXRocykge1xuICAgICAgICBrbm93blBhdGhzID0ge307XG5cbiAgICAgICAgT2JqZWN0LmtleXMoZWxlbWVudCkuZm9yRWFjaChwYXRoID0+IHtcbiAgICAgICAgICBrbm93blBhdGhzW3BhdGhdID0gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH0pO1xuXG4gICAgaWYgKCFrbm93blBhdGhzKSB7XG4gICAgICAvLyBFYXN5IGNhc2U6IG5vIHVzZSBvZiBhcnJheXMuXG4gICAgICBjb25zdCBzb2xlS2V5ID0gdmFsdWVzQnlJbmRleEFuZFBhdGgubWFwKHZhbHVlcyA9PiB7XG4gICAgICAgIGlmICghaGFzT3duLmNhbGwodmFsdWVzLCAnJykpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcignbm8gdmFsdWUgaW4gc29sZSBrZXkgY2FzZT8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZXNbJyddO1xuICAgICAgfSk7XG5cbiAgICAgIGNiKHNvbGVLZXkpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoa25vd25QYXRocykuZm9yRWFjaChwYXRoID0+IHtcbiAgICAgIGNvbnN0IGtleSA9IHZhbHVlc0J5SW5kZXhBbmRQYXRoLm1hcCh2YWx1ZXMgPT4ge1xuICAgICAgICBpZiAoaGFzT3duLmNhbGwodmFsdWVzLCAnJykpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWVzWycnXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaGFzT3duLmNhbGwodmFsdWVzLCBwYXRoKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdtaXNzaW5nIHBhdGg/Jyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWVzW3BhdGhdO1xuICAgICAgfSk7XG5cbiAgICAgIGNiKGtleSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgY29tcGFyYXRvciB0aGF0IHJlcHJlc2VudHMgdGhlIHNvcnQgc3BlY2lmaWNhdGlvbiAoYnV0IG5vdFxuICAvLyBpbmNsdWRpbmcgYSBwb3NzaWJsZSBnZW9xdWVyeSBkaXN0YW5jZSB0aWUtYnJlYWtlcikuXG4gIF9nZXRCYXNlQ29tcGFyYXRvcigpIHtcbiAgICBpZiAodGhpcy5fc29ydEZ1bmN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc29ydEZ1bmN0aW9uO1xuICAgIH1cblxuICAgIC8vIElmIHdlJ3JlIG9ubHkgc29ydGluZyBvbiBnZW9xdWVyeSBkaXN0YW5jZSBhbmQgbm8gc3BlY3MsIGp1c3Qgc2F5XG4gICAgLy8gZXZlcnl0aGluZyBpcyBlcXVhbC5cbiAgICBpZiAoIXRoaXMuX3NvcnRTcGVjUGFydHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gKGRvYzEsIGRvYzIpID0+IDA7XG4gICAgfVxuXG4gICAgcmV0dXJuIChkb2MxLCBkb2MyKSA9PiB7XG4gICAgICBjb25zdCBrZXkxID0gdGhpcy5fZ2V0TWluS2V5RnJvbURvYyhkb2MxKTtcbiAgICAgIGNvbnN0IGtleTIgPSB0aGlzLl9nZXRNaW5LZXlGcm9tRG9jKGRvYzIpO1xuICAgICAgcmV0dXJuIHRoaXMuX2NvbXBhcmVLZXlzKGtleTEsIGtleTIpO1xuICAgIH07XG4gIH1cblxuICAvLyBGaW5kcyB0aGUgbWluaW11bSBrZXkgZnJvbSB0aGUgZG9jLCBhY2NvcmRpbmcgdG8gdGhlIHNvcnQgc3BlY3MuICAoV2Ugc2F5XG4gIC8vIFwibWluaW11bVwiIGhlcmUgYnV0IHRoaXMgaXMgd2l0aCByZXNwZWN0IHRvIHRoZSBzb3J0IHNwZWMsIHNvIFwiZGVzY2VuZGluZ1wiXG4gIC8vIHNvcnQgZmllbGRzIG1lYW4gd2UncmUgZmluZGluZyB0aGUgbWF4IGZvciB0aGF0IGZpZWxkLilcbiAgLy9cbiAgLy8gTm90ZSB0aGF0IHRoaXMgaXMgTk9UIFwiZmluZCB0aGUgbWluaW11bSB2YWx1ZSBvZiB0aGUgZmlyc3QgZmllbGQsIHRoZVxuICAvLyBtaW5pbXVtIHZhbHVlIG9mIHRoZSBzZWNvbmQgZmllbGQsIGV0Y1wiLi4uIGl0J3MgXCJjaG9vc2UgdGhlXG4gIC8vIGxleGljb2dyYXBoaWNhbGx5IG1pbmltdW0gdmFsdWUgb2YgdGhlIGtleSB2ZWN0b3IsIGFsbG93aW5nIG9ubHkga2V5cyB3aGljaFxuICAvLyB5b3UgY2FuIGZpbmQgYWxvbmcgdGhlIHNhbWUgcGF0aHNcIi4gIGllLCBmb3IgYSBkb2Mge2E6IFt7eDogMCwgeTogNX0sIHt4OlxuICAvLyAxLCB5OiAzfV19IHdpdGggc29ydCBzcGVjIHsnYS54JzogMSwgJ2EueSc6IDF9LCB0aGUgb25seSBrZXlzIGFyZSBbMCw1XSBhbmRcbiAgLy8gWzEsM10sIGFuZCB0aGUgbWluaW11bSBrZXkgaXMgWzAsNV07IG5vdGFibHksIFswLDNdIGlzIE5PVCBhIGtleS5cbiAgX2dldE1pbktleUZyb21Eb2MoZG9jKSB7XG4gICAgbGV0IG1pbktleSA9IG51bGw7XG5cbiAgICB0aGlzLl9nZW5lcmF0ZUtleXNGcm9tRG9jKGRvYywga2V5ID0+IHtcbiAgICAgIGlmIChtaW5LZXkgPT09IG51bGwpIHtcbiAgICAgICAgbWluS2V5ID0ga2V5O1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9jb21wYXJlS2V5cyhrZXksIG1pbktleSkgPCAwKSB7XG4gICAgICAgIG1pbktleSA9IGtleTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBtaW5LZXk7XG4gIH1cblxuICBfZ2V0UGF0aHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NvcnRTcGVjUGFydHMubWFwKHBhcnQgPT4gcGFydC5wYXRoKTtcbiAgfVxuXG4gIC8vIEdpdmVuIGFuIGluZGV4ICdpJywgcmV0dXJucyBhIGNvbXBhcmF0b3IgdGhhdCBjb21wYXJlcyB0d28ga2V5IGFycmF5cyBiYXNlZFxuICAvLyBvbiBmaWVsZCAnaScuXG4gIF9rZXlGaWVsZENvbXBhcmF0b3IoaSkge1xuICAgIGNvbnN0IGludmVydCA9ICF0aGlzLl9zb3J0U3BlY1BhcnRzW2ldLmFzY2VuZGluZztcblxuICAgIHJldHVybiAoa2V5MSwga2V5MikgPT4ge1xuICAgICAgY29uc3QgY29tcGFyZSA9IExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKGtleTFbaV0sIGtleTJbaV0pO1xuICAgICAgcmV0dXJuIGludmVydCA/IC1jb21wYXJlIDogY29tcGFyZTtcbiAgICB9O1xuICB9XG59XG5cbi8vIEdpdmVuIGFuIGFycmF5IG9mIGNvbXBhcmF0b3JzXG4vLyAoZnVuY3Rpb25zIChhLGIpLT4obmVnYXRpdmUgb3IgcG9zaXRpdmUgb3IgemVybykpLCByZXR1cm5zIGEgc2luZ2xlXG4vLyBjb21wYXJhdG9yIHdoaWNoIHVzZXMgZWFjaCBjb21wYXJhdG9yIGluIG9yZGVyIGFuZCByZXR1cm5zIHRoZSBmaXJzdFxuLy8gbm9uLXplcm8gdmFsdWUuXG5mdW5jdGlvbiBjb21wb3NlQ29tcGFyYXRvcnMoY29tcGFyYXRvckFycmF5KSB7XG4gIHJldHVybiAoYSwgYikgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29tcGFyYXRvckFycmF5Lmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBjb21wYXJlID0gY29tcGFyYXRvckFycmF5W2ldKGEsIGIpO1xuICAgICAgaWYgKGNvbXBhcmUgIT09IDApIHtcbiAgICAgICAgcmV0dXJuIGNvbXBhcmU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH07XG59XG4iXX0=
