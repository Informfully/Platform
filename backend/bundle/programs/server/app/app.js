var require = meteorInstall({"imports":{"lib":{"utils":{"utils.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/lib/utils/utils.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  classNames: () => classNames,
  areArraysEqual: () => areArraysEqual,
  is: () => is,
  shallowEqualOnlyPrimitives: () => shallowEqualOnlyPrimitives,
  getExperimentName: () => getExperimentName
});
let Experiments;
module.link("../../api/experiments", {
  default(v) {
    Experiments = v;
  }

}, 0);

const classNames = args => {
  const has = Object.prototype.hasOwnProperty;
  const classes = [];
  const argType = typeof args;

  if (argType === 'string' || argType === 'number') {
    classes.push(args);
  } else if (Array.isArray(args) && args.length) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]; // eslint-disable-next-line no-continue

      if (!arg) continue;
      const inner = classNames(arg);

      if (inner) {
        classes.push(inner);
      }
    }
  } else if (argType === 'object') {
    Object.keys(args).forEach(key => {
      if (has.call(args, key) && args[key]) {
        classes.push(key);
      }
    });
  }

  return classes.join(' ');
};

const areArraysEqual = (anArray, anotherArray) => {
  if (!anArray || !anotherArray) return false;
  if (anArray.length !== anotherArray.length) return false;

  for (let i = 0, l = anArray.length; i < l; i++) {
    if (anArray[i] instanceof Array && anotherArray[i] instanceof Array) {
      if (!areArraysEqual(anArray[i], anotherArray[i])) return false;
    } else if (anArray[i] !== anotherArray[i]) {
      return false;
    }
  }

  return true;
};

const is = (x, y) => {
  // SameValue algorithm
  if (x === y) {
    // Steps 1-5, 7-10
    // Steps 6.b-6.e: +0 != -0
    // Added the nonzero y check to make Flow happy, but it is redundant
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } // Step 6.a: NaN == NaN
  // eslint-disable-next-line no-self-compare


  return x !== x && y !== y;
};

const hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * Slightly adapted implementation of shallowEqual taken from react core.
 *
 * Performs equality by iterating through the keys of an object and returning
 * false if any key has a value that is not strictly equal to the same key of
 * the second argument. Only compares simple types and skips all objects and
 * arrays.
 *
 * @see react core src
 *      https://github.com/facebook/fbjs/blob/master/packages/fbjs/src/core/shallowEqual.js#L39-L67
 * @param objA
 * @param objB
 * @returns {boolean}
 */

const shallowEqualOnlyPrimitives = (objA, objB) => {
  if (is(objA, objB)) {
    return true;
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    // if both fields are either objects, arrays or functions, skip the field
    if (typeof objA[keysA[i]] === 'object' && typeof objB[keysB[i]] === 'object' || objA[keysA[i]] instanceof Array && objB[keysB[i]] instanceof Array || objA[keysA[i]] instanceof Function && objB[keysB[i]] instanceof Function) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!hasOwnProperty.call(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) {
      return false;
    }
  }

  return true;
};

const getExperimentName = experimentId => {
  const experiment = Experiments.findOne({
    _id: experimentId
  }, {
    fields: {
      name: 1
    }
  });

  if (experiment && experiment.name) {
    return experiment.name;
  }

  return '';
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"utils_account.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/lib/utils/utils_account.js                                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  userEmail: () => userEmail,
  isEmailVerified: () => isEmailVerified,
  userIsInRole: () => userIsInRole,
  userOwnsExperiment: () => userOwnsExperiment,
  userOwnsSurvey: () => userOwnsSurvey,
  hasExperimentLaunched: () => hasExperimentLaunched
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Surveys;
module.link("../../api/surveys", {
  Surveys(v) {
    Surveys = v;
  }

}, 1);
let Experiments;
module.link("../../api/experiments", {
  default(v) {
    Experiments = v;
  }

}, 2);

const userEmail = function () {
  let user = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : Meteor.user();

  if (!user || !user.emails || !user.emails.length) {
    return '';
  }

  const email = user.emails[0];
  return email.address || '';
};

const isEmailVerified = function () {
  let user = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : Meteor.user();

  if (!user || !user.emails || user.emails.length === 0) {
    return false;
  }

  return user.emails.some(e => e.verified);
};

const userIsInRole = function (roleOrRoles) {
  let user = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Meteor.user();

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

const userOwnsExperiment = experimentId => {
  const user = Meteor.user({
    fields: {
      experiments: 1
    }
  });

  if (!user || !user.experiments) {
    return false;
  }

  const experiments = user.experiments.map(experiment => experiment.experiment);

  if (experiments.includes(experimentId)) {
    return true;
  }

  return false;
};

const userOwnsSurvey = surveyId => {
  const user = Meteor.user({
    fields: {
      experiments: 1
    }
  });

  if (!user || !user.experiments) {
    return false;
  }

  const experiments = user.experiments.map(experiment => experiment.experiment);
  const survey = Surveys.findOne({
    _id: surveyId
  }, {
    fields: {
      experiment: 1
    }
  });

  if (!experiments || !survey || !experiments.includes(survey.experiment)) {
    return false;
  }

  return true;
};

const hasExperimentLaunched = experimentId => {
  const experiment = Experiments.findOne({
    _id: experimentId
  }, {
    fields: {
      testingPhase: 1
    }
  });

  if (!experiment || experiment.testingPhase === undefined) {
    return false;
  }

  return !experiment.testingPhase;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"utils_string.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/lib/utils/utils_string.js                                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  removeWeirdMinusSignsInFrontOfString: () => removeWeirdMinusSignsInFrontOfString
});

const removeWeirdMinusSignsInFrontOfString = aString => {
  if (aString.indexOf('-') === 0) {
    const newString = aString.substr(1, aString.length - 1);
    return removeWeirdMinusSignsInFrontOfString(newString);
  }

  return aString;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"api":{"server":{"publications":{"articleLikes.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/server/publications/articleLikes.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let ArticleLikes;
module.link("../../articleLikes", {
  ArticleLikes(v) {
    ArticleLikes = v;
  }

}, 2);
let removeWeirdMinusSignsInFrontOfString;
module.link("../../../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 3);
Meteor.publish('articleLikes', articleId => {
  check(articleId, String);
  const userId = Meteor.userId();

  if (!userId) {
    return null;
  }

  const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
  return ArticleLikes.find({
    articleId: cleanArticleId,
    userId,
    removedAt: {
      $exists: false
    }
  }, {
    sort: {
      createdAt: -1
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"articleTotalLikes.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/server/publications/articleTotalLikes.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let ArticleTotalLikes;
module.link("../../articleLikes", {
  ArticleTotalLikes(v) {
    ArticleTotalLikes = v;
  }

}, 2);
let removeWeirdMinusSignsInFrontOfString;
module.link("../../../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 3);
Meteor.publish('articleTotalLikes', (articleId, experimentId) => {
  check(articleId, String);
  check(experimentId, String);
  const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
  return ArticleTotalLikes.find({
    articleId: cleanArticleId,
    experimentId
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"articleViews.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/server/publications/articleViews.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let ArticleViews;
module.link("../../articleViews", {
  ArticleViews(v) {
    ArticleViews = v;
  }

}, 2);
let removeWeirdMinusSignsInFrontOfString;
module.link("../../../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 3);
Meteor.publish('articleViews', articleId => {
  check(articleId, String);
  const userId = Meteor.userId();

  if (!userId) {
    return null;
  }

  const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
  return ArticleViews.find({
    articleId: cleanArticleId,
    userId
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"experiments.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/server/publications/experiments.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let userIsInRole;
module.link("../../../lib/utils/utils_account", {
  userIsInRole(v) {
    userIsInRole = v;
  }

}, 1);
let Experiments;
module.link("../../experiments", {
  default(v) {
    Experiments = v;
  }

}, 2);
Meteor.publish('experiments', () => {
  const user = Meteor.user({
    fields: {
      experiments: 1
    }
  });

  if (!user) {
    return null;
  }

  if (!userIsInRole('admin')) {
    return null;
  }

  const ownedExperiments = user.experiments.map(experiment => experiment.experiment);
  return Experiments.find({
    _id: {
      $in: ownedExperiments
    }
  });
});
Meteor.publish('activeExperiment', function activeExperimentPublication() {
  const user = Meteor.user({
    fields: {
      participatesIn: 1
    }
  });

  if (!user) {
    return null;
  } // a user can participate only in a single experiment


  const activeExperiment = Experiments.findOne({
    _id: user.participatesIn
  });
  this.added('activeExperiment', activeExperiment._id, _objectSpread({}, activeExperiment));
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/server/publications/index.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("./newsArticles");
module.link("./surveys");
module.link("./user");
module.link("./experiments");
module.link("./articleLikes");
module.link("./articleViews");
module.link("./articleTotalLikes");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"newsArticles.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/server/publications/newsArticles.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
let check, Match;
module.link("meteor/check", {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let ReadingList;
module.link("../../readingList", {
  ReadingList(v) {
    ReadingList = v;
  }

}, 2);
let NewsArticles;
module.link("../../articles", {
  NewsArticles(v) {
    NewsArticles = v;
  }

}, 3);
let Archive;
module.link("../../archive", {
  Archive(v) {
    Archive = v;
  }

}, 4);
let removeWeirdMinusSignsInFrontOfString;
module.link("../../../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 5);
let Recommendations;
module.link("../../recommendations", {
  Recommendations(v) {
    Recommendations = v;
  }

}, 6);
let Experiments;
module.link("../../experiments", {
  default(v) {
    Experiments = v;
  }

}, 7);
let userIsInRole;
module.link("../../../lib/utils/utils_account", {
  userIsInRole(v) {
    userIsInRole = v;
  }

}, 8);
let Explanations;
module.link("../../explanations", {
  Explanations(v) {
    Explanations = v;
  }

}, 9);
Meteor.publish('newsArticle', articleId => {
  check(articleId, String);
  return NewsArticles.find(articleId, {
    sort: {
      datePublished: -1
    }
  });
});
Meteor.publish('notification', function () {
  let initializing = true;
  const {
    userId
  } = this;
  const limit = 10;
  const recommendationCursor = Recommendations.find({
    userId
  }, {
    sort: {
      createdAt: -1
    },
    limit
  });
  const newsArticleCursor = NewsArticles.find({}, {
    sort: {
      datePublished: -1
    },
    limit
  });
  const recommendationObserver = recommendationCursor.observeChanges({
    added: recommendationId => {
      if (initializing) {
        return false;
      }

      this.added('notification', recommendationId, {
        date: new Date()
      });
    }
  });

  if (recommendationCursor.count() === 0) {
    const newsArticleObserver = newsArticleCursor.observeChanges({
      added: articleId => {
        if (initializing) {
          return false;
        }

        this.added('notification', articleId, {
          date: new Date()
        });
      }
    });
    this.onStop(() => {
      newsArticleObserver.stop();
      recommendationObserver.stop();
    });
  } else {
    this.onStop(() => {
      recommendationObserver.stop();
    });
  }

  this.ready();
  initializing = false;
});
/**
 * Publishes a cursor for all news articles including whether they are in the reading list
 * of the current user. That is, this publication performs a join between {@link NewsArticles}
 * and {@link ReadingList} on _id and articleId respectively.
 *
 * Furthermore, this publication includes change observers to react on changes in the two collections
 * and restore meteor's reactivity.
 */
// eslint-disable-next-line no-unused-vars

Meteor.publish('newsArticlesJoined', function newsArticlesJoinedPublications(limit, date) {
  check(limit, Number);
  check(date, Match.Maybe(Date));
  let initializing = true;
  const {
    userId
  } = this;
  let experiment;
  let user = Meteor.user({
    fields: {
      participatesIn: 1
    }
  });

  if (!user) {
    experiment = null;
  } else {
    experiment = Experiments.findOne({
      _id: user.participatesIn
    });
  }

  if (!experiment) {
    user = Meteor.user({
      fields: {
        experiments: 1
      }
    });

    if (!user || !userIsInRole('admin')) {
      experiment = null;
    } else {
      const ownedExperiments = user.experiments.map(experiment => experiment.experiment);
      experiment = Experiments.findOne({
        _id: {
          $in: ownedExperiments
        }
      });
    }
  }

  if (!experiment) {
    experiment = {};
  }

  let {
    explanationTagsDef,
    maxNrExplanationTags
  } = experiment;

  if (explanationTagsDef === undefined) {
    explanationTagsDef = {};
  }

  if (maxNrExplanationTags === undefined) {
    maxNrExplanationTags = 0;
  }

  const recommendations = Recommendations.find({
    userId
  }, {
    sort: {
      prediction: -1
    },
    limit
  }).fetch();

  if (recommendations && recommendations.length > 0) {
    for (let i = 0; i < recommendations.length; i++) {
      const {
        articleId,
        prediction
      } = recommendations[i];
      const article = NewsArticles.findOne({
        _id: articleId
      });

      if (!article) {
        continue;
      }

      const explanationTags = Explanations.findOne({
        articleId: article._id,
        userId
      }) || {};
      let {
        explanationTagsId
      } = explanationTags;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
        explanationArticle,
        isInReadingList: !!isInReadingList,
        isInArchive: !!isInArchive,
        prediction
      }));
    }
  } else {
    const newsArticles = NewsArticles.find({}, {
      sort: {
        datePublished: -1
      },
      limit
    }).fetch();

    for (let i = 0; i < newsArticles.length; i++) {
      const article = newsArticles[i];
      const explanationTags = Explanations.findOne({
        articleId: article._id,
        userId
      }) || {};
      let {
        explanationTagsId
      } = explanationTags;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
        explanationArticle,
        isInReadingList: !!isInReadingList,
        isInArchive: !!isInArchive
      }));
    }
  }

  const explanationsObserver = Explanations.find({
    userId
  }).observe({
    added: document => {
      if (initializing) {
        return false;
      }

      let {
        explanationTagsId
      } = document;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      this.changed('newsArticlesJoined', document.articleId, {
        explanationArticle
      });
    },
    changed: document => {
      let {
        explanationTagsId
      } = document;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
      this.changed('newsArticlesJoined', articleId, {
        explanationArticle
      });
    },
    removed: fields => {
      if (initializing) {
        return false;
      }

      const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
      this.changed('newsArticlesJoined', articleId, {
        explanationArticle: []
      });
    }
  });
  const readingListObserver = ReadingList.find({
    userId
  }).observe({
    /**
     * Whenever a document is added to {@link ReadingList}, we update the document in
     * this publication and set isInReadingList to true.
     *
     * @param document
     *          the document that was added
     * @returns {boolean}
     */
    added: document => {
      // Before observe returns, added (or addedAt) will be called zero or more times to deliver
      // the initial results of the query. We prevent this by returning false if we are still
      // initializing. Notice that we set initializing to false after completing the first set.
      if (initializing) {
        return false;
      } // The following piece of code had to be inserted only due to a Meteor problem.
      // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
      //
      // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
      // document has to be changed. This is normal, as the id of the document is not yet in the
      // collection. To avoid the warning, we need to make sure that the document is added to the
      // collection, before any changes to it can be made. That is why we use this.added. If the
      // document already exists in the collection, this.added will do nothing.


      const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
      const article = NewsArticles.findOne({
        _id: articleId
      });
      const recommendation = Recommendations.findOne({
        articleId
      });
      const explanationTags = Explanations.findOne({
        articleId: article._id,
        userId
      }) || {};
      let {
        explanationTagsId
      } = explanationTags;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (recommendation) {
        this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle,
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive,
          prediction: recommendation.prediction
        }));
      } else {
        this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle,
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive
        }));
      }

      this.changed('newsArticlesJoined', article._id, {
        isInReadingList: true
      });
    },

    /**
     * Whenever a document in {@link ReadingList} is changed, we update the document
     * in this publication and set isInReadingList accordingly.
     * If an article is removed from the reading list, the document in {@link ReadingList}
     * is not remove but only updated. That is, an article was removed from the reading
     * list if the document in {@link ReadingList} has a field "removedAt".
     *
     * @param document
     */
    changed: document => {
      if (document.removedAt) {
        // The following piece of code had to be inserted only due to a Meteor problem.
        // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
        //
        // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
        // document has to be changed. This is normal, as the id of the document is not yet in the
        // collection. To avoid the warning, we need to make sure that the document is added to the
        // collection, before any changes to it can be made. That is why we use this.added. If the
        // document already exists in the collection, this.added will do nothing.
        const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
        const article = NewsArticles.findOne({
          _id: articleId
        });
        const recommendation = Recommendations.findOne({
          articleId
        });
        const explanationTags = Explanations.findOne({
          articleId: article._id,
          userId
        }) || {};
        let {
          explanationTagsId
        } = explanationTags;

        if (explanationTagsId === undefined) {
          explanationTagsId = [];
        }

        const explanationArticle = [];
        let key;
        let tag;

        for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
          key = explanationTagsId[i];
          tag = explanationTagsDef[key];

          if (tag) {
            explanationArticle.push(tag);
          }
        }

        const isInReadingList = ReadingList.findOne({
          articleId: article._id,
          userId,
          removedAt: {
            $exists: false
          }
        });
        const isInArchive = Archive.findOne({
          articleId: article._id,
          userId,
          removedAt: {
            $exists: false
          }
        });

        if (recommendation) {
          this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
            explanationArticle,
            isInReadingList: !!isInReadingList,
            isInArchive: !!isInArchive,
            prediction: recommendation.prediction
          }));
        } else {
          this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
            explanationArticle,
            isInReadingList: !!isInReadingList,
            isInArchive: !!isInArchive
          }));
        }

        this.changed('newsArticlesJoined', article._id, {
          isInReadingList: false
        });
      }
    },

    /**
     * Whenever a document was removed in {@link ReadingList}, we update the document in
     * this publication and set isInReadingList to false.
     *
     * @param fields
     *          the document that was removed
     * @returns {boolean}
     */
    removed: fields => {
      if (initializing) {
        return false;
      } // The following piece of code had to be inserted only due to a Meteor problem.
      // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
      //
      // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
      // document has to be changed. This is normal, as the id of the document is not yet in the
      // collection. To avoid the warning, we need to make sure that the document is added to the
      // collection, before any changes to it can be made. That is why we use this.added. If the
      // document already exists in the collection, this.added will do nothing.


      const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
      const article = NewsArticles.findOne({
        _id: articleId
      });
      const recommendation = Recommendations.findOne({
        articleId
      });
      const explanationTags = Explanations.findOne({
        articleId: article._id,
        userId
      }) || {};
      let {
        explanationTagsId
      } = explanationTags;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (recommendation) {
        this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle,
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive,
          prediction: recommendation.prediction
        }));
      } else {
        this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle,
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive
        }));
      }

      this.changed('newsArticlesJoined', article._id, {
        isInReadingList: false
      });
    }
  });
  const archiveObserver = Archive.find({
    userId
  }).observe({
    /**
     * Whenever a document is added to {@link Archive}, we update the document in
     * this publication and set isInArchive to true.
     *
     * @param document
     *          the document that was added
     * @returns {boolean}
     */
    added: document => {
      // Before observe returns, added (or addedAt) will be called zero or more times to deliver
      // the initial results of the query. We prevent this by returning false if we are still
      // initializing. Notice that we set initializing to false after completing the first set.
      if (initializing) {
        return false;
      } // The following piece of code had to be inserted only due to a Meteor problem.
      // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
      //
      // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
      // document has to be changed. This is normal, as the id of the document is not yet in the
      // collection. To avoid the warning, we need to make sure that the document is added to the
      // collection, before any changes to it can be made. That is why we use this.added. If the
      // document already exists in the collection, this.added will do nothing.


      const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
      const article = NewsArticles.findOne({
        _id: articleId
      });
      const recommendation = Recommendations.findOne({
        articleId
      });
      const explanationTags = Explanations.findOne({
        articleId: article._id,
        userId
      }) || {};
      let {
        explanationTagsId
      } = explanationTags;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (recommendation) {
        this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle,
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive,
          prediction: recommendation.prediction
        }));
      } else {
        this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle,
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive
        }));
      }

      this.changed('newsArticlesJoined', article._id, {
        isInArchive: true
      });
    },

    /**
     * Whenever a document in {@link Archive} is changed, we update the document
     * in this publication and set isInArchive accordingly.
     * If an article is removed from the archive, the document in {@link Archive}
     * is not remove but only updated. That is, an article was removed from the
     * archive if the document in {@link Archive} has a field "removedAt".
     *
     * @param document
     */
    changed: document => {
      if (document.removedAt) {
        // The following piece of code had to be inserted only due to a Meteor problem.
        // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
        //
        // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
        // document has to be changed. This is normal, as the id of the document is not yet in the
        // collection. To avoid the warning, we need to make sure that the document is added to the
        // collection, before any changes to it can be made. That is why we use this.added. If the
        // document already exists in the collection, this.added will do nothing.
        const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
        const article = NewsArticles.findOne({
          _id: articleId
        });
        const recommendation = Recommendations.findOne({
          articleId
        });
        const explanationTags = Explanations.findOne({
          articleId: article._id,
          userId
        }) || {};
        let {
          explanationTagsId
        } = explanationTags;

        if (explanationTagsId === undefined) {
          explanationTagsId = [];
        }

        const explanationArticle = [];
        let key;
        let tag;

        for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
          key = explanationTagsId[i];
          tag = explanationTagsDef[key];

          if (tag) {
            explanationArticle.push(tag);
          }
        }

        const isInReadingList = ReadingList.findOne({
          articleId: article._id,
          userId,
          removedAt: {
            $exists: false
          }
        });
        const isInArchive = Archive.findOne({
          articleId: article._id,
          userId,
          removedAt: {
            $exists: false
          }
        });

        if (recommendation) {
          this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
            explanationArticle,
            isInReadingList: !!isInReadingList,
            isInArchive: !!isInArchive,
            prediction: recommendation.prediction
          }));
        } else {
          this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
            explanationArticle,
            isInReadingList: !!isInReadingList,
            isInArchive: !!isInArchive
          }));
        }

        this.changed('newsArticlesJoined', article._id, {
          isInArchive: false
        });
      }
    },

    /**
     * Whenever a document was removed in {@link Archive}, we update the document in
     * this publication and set isInReadingList to false.
     *
     * @param fields
     *          the document that was removed
     * @returns {boolean}
     */
    removed: fields => {
      if (initializing) {
        return false;
      } // The following piece of code had to be inserted only due to a Meteor problem.
      // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
      //
      // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
      // document has to be changed. This is normal, as the id of the document is not yet in the
      // collection. To avoid the warning, we need to make sure that the document is added to the
      // collection, before any changes to it can be made. That is why we use this.added. If the
      // document already exists in the collection, this.added will do nothing.


      const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
      const article = NewsArticles.findOne({
        _id: articleId
      });
      const recommendation = Recommendations.findOne({
        articleId
      });
      const explanationTags = Explanations.findOne({
        articleId: article._id,
        userId
      }) || {};
      let {
        explanationTagsId
      } = explanationTags;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (recommendation) {
        this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle,
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive,
          prediction: recommendation.prediction
        }));
      } else {
        this.added('newsArticlesJoined', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle,
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive
        }));
      }

      this.changed('newsArticlesJoined', article._id, {
        isInArchive: false
      });
    }
  });
  this.ready();
  initializing = false;
  this.onStop(() => {
    explanationsObserver.stop();
    readingListObserver.stop();
    archiveObserver.stop();
  });
});
/**
 * Publishes all news articles from {@link NewsArticles} for which there is an entry in {@link ReadingList}.
 *
 * @returns {any | Mongo.Cursor | number | T}
 */

Meteor.publish('newsArticlesInReadingList', function newsArticlesInReadingListPublication() {
  let initializing = true;
  const {
    userId
  } = this;
  let experiment;
  let user = Meteor.user({
    fields: {
      participatesIn: 1
    }
  });

  if (!user) {
    experiment = null;
  } else {
    experiment = Experiments.findOne({
      _id: user.participatesIn
    });
  }

  if (!experiment) {
    user = Meteor.user({
      fields: {
        experiments: 1
      }
    });

    if (!user || !userIsInRole('admin')) {
      experiment = null;
    } else {
      const ownedExperiments = user.experiments.map(experiment => experiment.experiment);
      experiment = Experiments.findOne({
        _id: {
          $in: ownedExperiments
        }
      });
    }
  }

  if (!experiment) {
    experiment = {};
  }

  let {
    explanationTagsDef,
    maxNrExplanationTags
  } = experiment;

  if (explanationTagsDef === undefined) {
    explanationTagsDef = {};
  }

  if (maxNrExplanationTags === undefined) {
    maxNrExplanationTags = 0;
  }

  const newsArticlesInReadingList = ReadingList.find({
    userId,
    removedAt: {
      $exists: false
    }
  }).fetch();
  const newsArticleIds = newsArticlesInReadingList.map((_ref) => {
    let {
      articleId
    } = _ref;
    return articleId;
  });
  const newsArticles = NewsArticles.find({
    _id: {
      $in: newsArticleIds
    }
  }).fetch();

  for (let i = 0; i < newsArticles.length; i++) {
    const article = newsArticles[i];
    const explanationTags = Explanations.findOne({
      articleId: article._id,
      userId
    }) || {};
    let {
      explanationTagsId
    } = explanationTags;

    if (explanationTagsId === undefined) {
      explanationTagsId = [];
    }

    const explanationArticle = [];
    let key;
    let tag;

    for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
      key = explanationTagsId[i];
      tag = explanationTagsDef[key];

      if (tag) {
        explanationArticle.push(tag);
      }
    }

    const isInArchive = Archive.findOne({
      articleId: article._id,
      userId,
      removedAt: {
        $exists: false
      }
    });
    this.added('newsArticlesInReadingList', article._id, _objectSpread(_objectSpread({}, article), {}, {
      explanationArticle,
      isInReadingList: true,
      isInArchive: !!isInArchive
    }));
  }

  const explanationsObserver = Explanations.find({
    userId
  }).observe({
    added: document => {
      if (initializing) {
        return false;
      }

      let {
        explanationTagsId
      } = document;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      this.changed('newsArticlesInReadingList', document.articleId, {
        explanationArticle
      });
    },
    changed: document => {
      let {
        explanationTagsId
      } = document;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
      this.changed('newsArticlesInReadingList', articleId, {
        explanationArticle
      });
    },
    removed: fields => {
      if (initializing) {
        return false;
      }

      const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
      this.changed('newsArticlesInReadingList', articleId, {
        explanationArticle: []
      });
    }
  });
  const readingListObserver = ReadingList.find({
    userId
  }).observe({
    /**
     * Whenever a document is added to {@link ReadingList}, we add the document in this
     * publication too
     *
     * @param document
     *          the document that was added
     * @returns {boolean}
     */
    added: document => {
      if (initializing) {
        return false;
      }

      const article = NewsArticles.findOne(document.articleId);
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (article) {
        this.added('newsArticlesInReadingList', article._id, _objectSpread(_objectSpread({}, article), {}, {
          isInReadingList: true,
          isInArchive: !!isInArchive
        }));
      }
    },
    changed: document => {
      if (document.removedAt) {
        const documentId = removeWeirdMinusSignsInFrontOfString(document.articleId);
        this.removed('newsArticlesInReadingList', documentId);
      }
    },

    /**
     * Whenever a document was removed in {@link ReadingList}, we remove the article in this
     * publication too.
     *
     * @param fields
     *          the document that was removed
     * @returns {boolean}
     */
    removed: fields => {
      if (initializing) {
        return false;
      }

      const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
      this.removed('newsArticlesInReadingList', articleId);
    }
  });
  const archiveObserver = Archive.find({
    userId
  }).observe({
    /**
     * Whenever a document is added to {@link Archive}, we update the document in
     * this publication and set isInArchive to true.
     *
     * @param document
     *          the document that was added
     * @returns {boolean}
     */
    added: document => {
      if (initializing) {
        return false;
      }

      const article = ReadingList.findOne({
        articleId: document.articleId,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (article) {
        const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
        this.changed('newsArticlesInReadingList', articleId, {
          isInArchive: true
        });
      }
    },

    /**
     * Whenever a document in {@link Archive} is changed, we update the document
     * in this publication and set isInArchive accordingly.
     * If an article is removed from the archive, the document in {@link Archive}
     * is not remove but only updated. That is, an article was removed from the
     * archive if the document in {@link Archive} has a field "removedAt".
     *
     * @param document
     */
    changed: document => {
      const article = ReadingList.findOne({
        articleId: document.articleId,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (document.removedAt) {
        if (article) {
          const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
          this.changed('newsArticlesInReadingList', articleId, {
            isInArchive: false
          });
        }
      }
    },

    /**
     * Whenever a document was removed in {@link Archive}, we update the document in
     * this publication and set isInArchive to false.
     *
     * @param fields
     *          the document that was removed
     * @returns {boolean}
     */
    removed: fields => {
      if (initializing) {
        return false;
      }

      const article = ReadingList.findOne({
        articleId: document.articleId,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (article) {
        const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
        this.changed('newsArticlesInReadingList', articleId, {
          isInArchive: false
        });
      }
    }
  });
  const newsArticlesObserver = NewsArticles.find().observe({
    /**
     * If an article is removed from {@link NewsArticles}, we simply remove it from this publication as well.
     *
     * @param document
     *          the document that was removed
     */
    removed: document => {
      const documentId = removeWeirdMinusSignsInFrontOfString(document._id);
      this.removed('newsArticlesInReadingList', documentId);
    }
  });
  this.ready();
  initializing = false;
  this.onStop(() => {
    explanationsObserver.stop();
    readingListObserver.stop();
    archiveObserver.stop();
    newsArticlesObserver.stop();
  });
});
/**
 * Publishes all news articles from {@link NewsArticles} for which there is an entry in {@link Archive}.
 *
 * @returns {any | Mongo.Cursor | number | T}
 */

Meteor.publish('newsArticlesInArchive', function newsArticlesInArchivePublication() {
  let initializing = true;
  const {
    userId
  } = this;
  let experiment;
  let user = Meteor.user({
    fields: {
      participatesIn: 1
    }
  });

  if (!user) {
    experiment = null;
  } else {
    experiment = Experiments.findOne({
      _id: user.participatesIn
    });
  }

  if (!experiment) {
    user = Meteor.user({
      fields: {
        experiments: 1
      }
    });

    if (!user || !userIsInRole('admin')) {
      experiment = null;
    } else {
      const ownedExperiments = user.experiments.map(experiment => experiment.experiment);
      experiment = Experiments.findOne({
        _id: {
          $in: ownedExperiments
        }
      });
    }
  }

  if (!experiment) {
    experiment = {};
  }

  let {
    explanationTagsDef,
    maxNrExplanationTags
  } = experiment;

  if (explanationTagsDef === undefined) {
    explanationTagsDef = {};
  }

  if (maxNrExplanationTags === undefined) {
    maxNrExplanationTags = 0;
  }

  const newsArticlesInArchive = Archive.find({
    userId,
    removedAt: {
      $exists: false
    }
  }).fetch();
  const newsArticleIds = newsArticlesInArchive.map((_ref2) => {
    let {
      articleId
    } = _ref2;
    return articleId;
  });
  const newsArticles = NewsArticles.find({
    _id: {
      $in: newsArticleIds
    }
  }).fetch();

  for (let i = 0; i < newsArticles.length; i++) {
    const article = newsArticles[i];
    const explanationTags = Explanations.findOne({
      articleId: article._id,
      userId
    }) || {};
    let {
      explanationTagsId
    } = explanationTags;

    if (explanationTagsId === undefined) {
      explanationTagsId = [];
    }

    const explanationArticle = [];
    let key;
    let tag;

    for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
      key = explanationTagsId[i];
      tag = explanationTagsDef[key];

      if (tag) {
        explanationArticle.push(tag);
      }
    }

    const isInReadingList = ReadingList.findOne({
      articleId: article._id,
      userId,
      removedAt: {
        $exists: false
      }
    });
    this.added('newsArticlesInArchive', article._id, _objectSpread(_objectSpread({}, article), {}, {
      explanationArticle,
      isInReadingList: !!isInReadingList,
      isInArchive: true
    }));
  }

  const explanationsObserver = Explanations.find({
    userId
  }).observe({
    added: document => {
      if (initializing) {
        return false;
      }

      let {
        explanationTagsId
      } = document;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      this.changed('newsArticlesInArchive', document.articleId, {
        explanationArticle
      });
    },
    changed: document => {
      let {
        explanationTagsId
      } = document;

      if (explanationTagsId === undefined) {
        explanationTagsId = [];
      }

      const explanationArticle = [];
      let key;
      let tag;

      for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
        key = explanationTagsId[i];
        tag = explanationTagsDef[key];

        if (tag) {
          explanationArticle.push(tag);
        }
      }

      const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
      this.changed('newsArticlesInArchive', articleId, {
        explanationArticle
      });
    },
    removed: fields => {
      if (initializing) {
        return false;
      }

      const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
      this.changed('newsArticlesInArchive', articleId, {
        explanationArticle: []
      });
    }
  });
  const archiveObserver = Archive.find({
    userId
  }).observe({
    /**
     * Whenever a document is added to {@link Archive}, we add the document in this
     * publication too
     *
     * @param document
     *          the document that was added
     * @returns {boolean}
     */
    added: document => {
      if (initializing) {
        return false;
      }

      const article = NewsArticles.findOne(document.articleId);
      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (article) {
        this.added('newsArticlesInArchive', article._id, _objectSpread(_objectSpread({}, article), {}, {
          isInReadingList: !!isInReadingList,
          isInArchive: true
        }));
      }
    },
    changed: document => {
      if (document.removedAt) {
        const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
        this.removed('newsArticlesInArchive', articleId);
      }
    },

    /**
     * Whenever a document was removed in {@link Archive}, we remove the article in this
     * publication too.
     *
     * @param fields
     *          the document that was removed
     * @returns {boolean}
     */
    removed: fields => {
      if (initializing) {
        return false;
      }

      const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
      this.removed('newsArticlesInArchive', articleId);
    }
  });
  const readingListObserver = ReadingList.find({
    userId
  }).observe({
    /**
     * Whenever a document is added to {@link ReadingList}, we update the document in
     * this publication and set isInReadingList to true.
     *
     * @param document
     *          the document that was added
     * @returns {boolean}
     */
    added: document => {
      if (initializing) {
        return false;
      }

      const article = Archive.findOne({
        articleId: document.articleId,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (article) {
        const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
        this.changed('newsArticlesInArchive', articleId, {
          isInReadingList: true
        });
      }
    },

    /**
     * Whenever a document in {@link ReadingList} is changed, we update the document
     * in this publication and set isInReadingList accordingly.
     * If an article is removed from the reading list, the document in {@link ReadingList}
     * is not remove but only updated. That is, an article was removed from the
     * reading list if the document in {@link ReadingList} has a field "removedAt".
     *
     * @param document
     */
    changed: document => {
      const article = Archive.findOne({
        articleId: document.articleId,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (document.removedAt) {
        if (article) {
          const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
          this.changed('newsArticlesInArchive', articleId, {
            isInReadingList: false
          });
        }
      }
    },

    /**
     * Whenever a document was removed in {@link ReadingList}, we update the document in
     * this publication and set isInReadingList to false.
     *
     * @param fields
     *          the document that was removed
     * @returns {boolean}
     */
    removed: fields => {
      if (initializing) {
        return false;
      }

      const article = Archive.findOne({
        articleId: fields.articleId,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (article) {
        const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
        this.changed('newsArticlesInArchive', articleId, {
          isInReadingList: false
        });
      }
    }
  });
  const newsArticlesObserver = NewsArticles.find().observe({
    /**
     * If an article is removed from {@link NewsArticles}, we simply remove it from this publication as well.
     *
     * @param document
     *          the document that was removed
     */
    removed: document => {
      const documentId = removeWeirdMinusSignsInFrontOfString(document._id);
      this.removed('newsArticlesInArchive', documentId);
    }
  });
  this.ready();
  initializing = false;
  this.onStop(() => {
    explanationsObserver.stop();
    archiveObserver.stop();
    readingListObserver.stop();
    newsArticlesObserver.stop();
  });
});
Meteor.publish('furtherRecommendedNewsArticles', function furtherRecommendedNewsArticlesPublications(limit, primaryCategory, articleId) {
  check(limit, Number);
  check(primaryCategory, String);
  check(articleId, String);
  let initializing = true;
  const {
    userId
  } = this;
  const cleanId = removeWeirdMinusSignsInFrontOfString(articleId);
  const recommendations = Recommendations.find({
    userId,
    primaryCategory,
    articleId: {
      $ne: cleanId
    }
  }, {
    sort: {
      prediction: -1
    },
    limit
  }).fetch();

  if (recommendations && recommendations.length > 0) {
    for (let i = 0; i < recommendations.length; i++) {
      const {
        articleId,
        prediction
      } = recommendations[i];
      const article = NewsArticles.findOne({
        _id: articleId
      });

      if (!article) {
        continue;
      }

      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      this.added('furtherRecommendedNewsArticles', article._id, _objectSpread(_objectSpread({}, article), {}, {
        explanationArticle: [],
        isInReadingList: !!isInReadingList,
        isInArchive: !!isInArchive,
        prediction
      }));
    }
  } else {
    const newsArticles = NewsArticles.find({
      primaryCategory,
      _id: {
        $ne: cleanId
      }
    }, {
      sort: {
        datePublished: -1
      },
      limit
    }).fetch();

    for (let i = 0; i < newsArticles.length; i++) {
      const article = newsArticles[i];
      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      this.added('furtherRecommendedNewsArticles', article._id, _objectSpread(_objectSpread({}, article), {}, {
        explanationArticle: [],
        isInReadingList: !!isInReadingList,
        isInArchive: !!isInArchive
      }));
    }
  }

  const readingListObserver = ReadingList.find({
    userId
  }).observe({
    added: document => {
      if (initializing) {
        return false;
      } // The following piece of code had to be inserted only due to a Meteor problem.
      // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
      //
      // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
      // document has to be changed. This is normal, as the id of the document is not yet in the
      // collection. To avoid the warning, we need to make sure that the document is added to the
      // collection, before any changes to it can be made. That is why we use this.added. If the
      // document already exists in the collection, this.added will do nothing.


      const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
      const article = NewsArticles.findOne({
        _id: articleId
      });
      const recommendation = Recommendations.findOne({
        articleId
      });
      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (recommendation) {
        this.added('furtherRecommendedNewsArticles', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle: [],
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive,
          prediction: recommendation.prediction
        }));
      } else {
        this.added('furtherRecommendedNewsArticles', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle: [],
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive
        }));
      }

      this.changed('furtherRecommendedNewsArticles', article._id, {
        isInReadingList: true
      });
    },
    changed: document => {
      if (document.removedAt) {
        // The following piece of code had to be inserted only due to a Meteor problem.
        // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
        //
        // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
        // document has to be changed. This is normal, as the id of the document is not yet in the
        // collection. To avoid the warning, we need to make sure that the document is added to the
        // collection, before any changes to it can be made. That is why we use this.added. If the
        // document already exists in the collection, this.added will do nothing.
        const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
        const article = NewsArticles.findOne({
          _id: articleId
        });
        const recommendation = Recommendations.findOne({
          articleId
        });
        const isInReadingList = ReadingList.findOne({
          articleId: article._id,
          userId,
          removedAt: {
            $exists: false
          }
        });
        const isInArchive = Archive.findOne({
          articleId: article._id,
          userId,
          removedAt: {
            $exists: false
          }
        });

        if (recommendation) {
          this.added('furtherRecommendedNewsArticles', article._id, _objectSpread(_objectSpread({}, article), {}, {
            explanationArticle: [],
            isInReadingList: !!isInReadingList,
            isInArchive: !!isInArchive,
            prediction: recommendation.prediction
          }));
        } else {
          this.added('furtherRecommendedNewsArticles', article._id, _objectSpread(_objectSpread({}, article), {}, {
            explanationArticle: [],
            isInReadingList: !!isInReadingList,
            isInArchive: !!isInArchive
          }));
        }

        this.changed('furtherRecommendedNewsArticles', article._id, {
          isInReadingList: false
        });
      }
    },
    removed: fields => {
      if (initializing) {
        return false;
      } // The following piece of code had to be inserted only due to a Meteor problem.
      // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
      //
      // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
      // document has to be changed. This is normal, as the id of the document is not yet in the
      // collection. To avoid the warning, we need to make sure that the document is added to the
      // collection, before any changes to it can be made. That is why we use this.added. If the
      // document already exists in the collection, this.added will do nothing.


      const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
      const article = NewsArticles.findOne({
        _id: articleId
      });
      const recommendation = Recommendations.findOne({
        articleId
      });
      const isInReadingList = ReadingList.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });
      const isInArchive = Archive.findOne({
        articleId: article._id,
        userId,
        removedAt: {
          $exists: false
        }
      });

      if (recommendation) {
        this.added('furtherRecommendedNewsArticles', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle: [],
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive,
          prediction: recommendation.prediction
        }));
      } else {
        this.added('furtherRecommendedNewsArticles', article._id, _objectSpread(_objectSpread({}, article), {}, {
          explanationArticle: [],
          isInReadingList: !!isInReadingList,
          isInArchive: !!isInArchive
        }));
      }

      this.changed('furtherRecommendedNewsArticles', article._id, {
        isInReadingList: false
      });
    }
  }); // If at some point the article Preview component has to be extended by showing the star symbol, similar to the
  // bookmark symbol currently, then an archiveListObserver will have to be added (similar to the
  // readingListObserver above).

  this.ready();
  initializing = false;
  this.onStop(() => {
    readingListObserver.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"surveys.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/server/publications/surveys.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Surveys;
module.link("../../surveys", {
  Surveys(v) {
    Surveys = v;
  }

}, 1);
let Answers;
module.link("../../answers", {
  Answers(v) {
    Answers = v;
  }

}, 2);
Meteor.publish('surveys', () => {
  const user = Meteor.user({
    fields: {
      experiments: 1
    }
  });

  if (!user) {
    throw new Meteor.Error(403, 'Permission Denied');
  }

  experiments = user.experiments.map(experiment => experiment.experiment);
  return Surveys.find({
    experiment: {
      $in: experiments
    }
  });
});
Meteor.publish('surveys.unanswered', function unansweredSurveysPublication() {
  let initializing = true;
  const {
    userId
  } = this;
  const user = Meteor.user();

  if (!userId || !user) {
    return [];
  }

  const {
    participatesIn
  } = user;
  const answeredSurveysIds = Answers.find({
    userId
  }, {
    fields: {
      surveyId: 1
    }
  }).map((_ref) => {
    let {
      surveyId
    } = _ref;
    return surveyId;
  });
  Surveys.find({
    _id: {
      $nin: answeredSurveysIds
    },
    experiment: participatesIn
  }, {
    sort: {
      createdAt: 1
    }
  }).forEach(survey => this.added('unansweredSurveys', survey._id, survey));
  const answersObserver = Answers.find({
    userId
  }).observe({
    added: document => {
      if (initializing) {
        return false;
      }

      const {
        surveyId
      } = document;
      this.removed('unansweredSurveys', surveyId);
    },
    removed: document => {
      const {
        surveyId
      } = document;
      const survey = Surveys.findOne({
        _id: surveyId
      });
      this.added('unansweredSurveys', surveyId, survey);
    }
  });
  const surveysObserver = Surveys.find({
    experiment: participatesIn
  }).observeChanges({
    added: (id, fields) => {
      if (initializing) {
        return false;
      }

      const hasAnsweredSurvey = Answers.find({
        userId,
        surveyId: id
      }).count() > 0;

      if (!hasAnsweredSurvey) {
        this.added('unansweredSurveys', id, fields);
      }
    },
    removed: id => {
      this.removed('unansweredSurveys', id);
    }
  });
  this.ready();
  initializing = false;
  this.onStop(() => {
    answersObserver.stop();
    surveysObserver.stop();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"user.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/server/publications/user.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let userIsInRole;
module.link("../../../lib/utils/utils_account", {
  userIsInRole(v) {
    userIsInRole = v;
  }

}, 1);
Meteor.publish('userData', function userDataPublication() {
  return Meteor.users.find(this.userId, {
    fields: {
      roles: 1,
      experiments: 1,
      fullName: 1
    }
  });
});
Meteor.publish('users.all', () => {
  const user = Meteor.user();

  if (!user) {
    throw new Meteor.Error(403, 'Permission Denied');
  }

  if (!userIsInRole('admin')) {
    throw new Meteor.Error(403, 'Permission Denied');
  }

  experimentsList = user.experiments.map(experimentsObject => experimentsObject.experiment);
  return Meteor.users.find({
    participatesIn: {
      $in: experimentsList
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"answers.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/answers.js                                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Answers: () => Answers
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let check, Match;
module.link("meteor/check", {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 1);
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 2);
let Surveys;
module.link("./surveys", {
  Surveys(v) {
    Surveys = v;
  }

}, 3);
const Answers = new Mongo.Collection('answers');
Meteor.methods({
  'answers.add'(surveyId, surveyAnswers) {
    check(surveyId, String);
    check(surveyAnswers, Array);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    const initialSurvey = Surveys.findOne(surveyId);
    const {
      questions
    } = initialSurvey;
    const createdAt = new Date();
    const answers = [];
    surveyAnswers.forEach((a, i) => {
      answers.push({
        questionId: questions[i]._id,
        questionText: questions[i].text,
        selections: Object.keys(a).map(key => a[key])
      });
    });
    Answers.insert({
      surveyId,
      userId,
      createdAt,
      answers
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"archive.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/archive.js                                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Archive: () => Archive
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 2);
let removeWeirdMinusSignsInFrontOfString;
module.link("../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 3);
let NewsArticles;
module.link("./articles", {
  NewsArticles(v) {
    NewsArticles = v;
  }

}, 4);
const Archive = new Mongo.Collection('archive');
Meteor.methods({
  /**
   * Adds the article with the given id to the current user's archive.
   *
   * @param articleId
   *          the id of the article that's added to the archive
   * @returns {any}
   *          The unique _id of the document that was inserted
   */
  'archive.article.add'(articleId) {
    check(articleId, String);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const article = NewsArticles.findOne(cleanArticleId);

    if (!article) {
      throw new Meteor.Error(404, 'Article not found');
    }

    const {
      dateScraped
    } = article;
    return Archive.insert({
      articleId: cleanArticleId,
      userId,
      createdAt: new Date(),
      articlePublishedDate: dateScraped
    });
  },

  /**
   * Removes a news article from the archive of the current user.
   *
   * @param articleId
   *          id of the news article that will be removed from the archive
   *
   * @returns {any}
   *          number of removed documents
   */
  'archive.article.remove'(articleId) {
    check(articleId, String);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    return Archive.update({
      articleId: cleanArticleId,
      userId,
      removedAt: {
        $exists: false
      }
    }, {
      $set: {
        removedAt: new Date()
      }
    }, {
      multi: true
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"articleLikes.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/articleLikes.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ArticleLikes: () => ArticleLikes,
  ArticleTotalLikes: () => ArticleTotalLikes
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let NewsArticles;
module.link("./articles", {
  NewsArticles(v) {
    NewsArticles = v;
  }

}, 3);
let removeWeirdMinusSignsInFrontOfString;
module.link("../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 4);
const ArticleLikes = new Mongo.Collection('articleLikes');
const ArticleTotalLikes = new Mongo.Collection('articleTotalLikes');
Meteor.methods({
  'articleLikes.insert'(articleId, articleQuestionId, experimentId) {
    check(articleId, String);
    check(articleQuestionId, String);
    check(experimentId, String);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const article = NewsArticles.findOne(cleanArticleId);

    if (!article) {
      throw new Meteor.Error(404, 'Article not found');
    }

    const articleTotalLikesDislikes = ArticleTotalLikes.findOne({
      articleId: cleanArticleId,
      experimentId
    });
    let questionsArray;

    if (!articleTotalLikesDislikes) {
      ArticleTotalLikes.insert({
        articleId: cleanArticleId,
        experimentId,
        counts: [],
        questions: []
      });
      questionsArray = [];
    } else {
      questionsArray = articleTotalLikesDislikes.questions;
    }

    if (questionsArray.includes(articleQuestionId)) {
      ArticleTotalLikes.update({
        articleId: cleanArticleId,
        experimentId,
        'counts.articleQuestionId': articleQuestionId
      }, {
        $inc: {
          'counts.$.countLikes': 1
        }
      });
    } else {
      ArticleTotalLikes.update({
        articleId: cleanArticleId,
        experimentId
      }, {
        $push: {
          counts: {
            articleQuestionId,
            countLikes: 1,
            countDislikes: 0
          },
          questions: articleQuestionId
        }
      });
    }

    return ArticleLikes.insert({
      articleId: cleanArticleId,
      userId,
      articleQuestionId,
      articleAnswer: 1,
      createdAt: new Date()
    });
  },

  'articleLikes.remove'(articleId, articleQuestionId, experimentId) {
    check(articleId, String);
    check(articleQuestionId, String);
    check(experimentId, String);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    ArticleTotalLikes.update({
      articleId: cleanArticleId,
      experimentId,
      'counts.articleQuestionId': articleQuestionId
    }, {
      $inc: {
        'counts.$.countLikes': -1
      }
    });
    const articleLike = ArticleLikes.findOne({
      articleId: cleanArticleId,
      userId,
      articleQuestionId,
      articleAnswer: 1
    }, {
      sort: {
        createdAt: -1
      }
    });
    return ArticleLikes.update(articleLike, {
      $set: {
        removedAt: new Date()
      }
    });
  },

  'articleDislikes.insert'(articleId, articleQuestionId, experimentId) {
    check(articleId, String);
    check(articleQuestionId, String);
    check(experimentId, String);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const article = NewsArticles.findOne(cleanArticleId);

    if (!article) {
      throw new Meteor.Error(404, 'Article not found');
    }

    const articleTotalLikesDislikes = ArticleTotalLikes.findOne({
      articleId: cleanArticleId,
      experimentId
    });
    let questionsArray;

    if (!articleTotalLikesDislikes) {
      ArticleTotalLikes.insert({
        articleId: cleanArticleId,
        experimentId,
        counts: [],
        questions: []
      });
      questionsArray = [];
    } else {
      questionsArray = articleTotalLikesDislikes.questions;
    }

    if (questionsArray.includes(articleQuestionId)) {
      ArticleTotalLikes.update({
        articleId: cleanArticleId,
        experimentId,
        'counts.articleQuestionId': articleQuestionId
      }, {
        $inc: {
          'counts.$.countDislikes': 1
        }
      });
    } else {
      ArticleTotalLikes.update({
        articleId: cleanArticleId,
        experimentId
      }, {
        $push: {
          counts: {
            articleQuestionId,
            countLikes: 0,
            countDislikes: 1
          },
          questions: articleQuestionId
        }
      });
    }

    return ArticleLikes.insert({
      articleId: cleanArticleId,
      userId,
      articleQuestionId,
      articleAnswer: -1,
      createdAt: new Date()
    });
  },

  'articleDislikes.remove'(articleId, articleQuestionId, experimentId) {
    check(articleId, String);
    check(articleQuestionId, String);
    check(experimentId, String);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    ArticleTotalLikes.update({
      articleId: cleanArticleId,
      experimentId,
      'counts.articleQuestionId': articleQuestionId
    }, {
      $inc: {
        'counts.$.countDislikes': -1
      }
    });
    const articleDislike = ArticleLikes.findOne({
      articleId: cleanArticleId,
      userId,
      articleQuestionId,
      articleAnswer: -1
    }, {
      sort: {
        createdAt: -1
      }
    });
    return ArticleLikes.update(articleDislike, {
      $set: {
        removedAt: new Date()
      }
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"articleViews.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/articleViews.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ArticleViews: () => ArticleViews
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let NewsArticles;
module.link("./articles", {
  NewsArticles(v) {
    NewsArticles = v;
  }

}, 3);
let removeWeirdMinusSignsInFrontOfString;
module.link("../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 4);
const ArticleViews = new Mongo.Collection('articleViews');
Meteor.methods({
  'articleViews.add'(articleId) {
    check(articleId, String);
    const {
      userId
    } = this;

    if (!userId) {
      throw new Meteor.Error(400, 'Permission Denied');
    }

    const article = NewsArticles.findOne(articleId);

    if (!article) {
      throw new Meteor.Error(404, 'Article not found');
    }

    const {
      dateScraped
    } = article;
    const now = new Date(); // no need for reactivity in this operation

    return ArticleViews.rawCollection().findAndModify({
      userId,
      articleId
    }, {
      createdAt: -1
    }, {
      $setOnInsert: {
        createdAt: now,
        articlePublishedDate: dateScraped,
        duration: 0,
        maxScrolledContent: 0
      },
      $set: {
        updatedAt: now
      },
      $inc: {
        views: 1
      }
    }, {
      upsert: true
    });
  },

  'articleViews.duration.update'(articleId) {
    check(articleId, String);
    const {
      userId
    } = this;

    if (!userId) {
      throw new Meteor.Error(400, 'Permission Denied');
    }

    const now = new Date();
    const view = ArticleViews.findOne({
      userId,
      articleId
    });
    const durationIncrement = now - view.updatedAt;
    return ArticleViews.update(view, {
      $inc: {
        duration: durationIncrement
      }
    });
  },

  'articleViews.maxScrolledContent.update'(articleId, maxScrolledContent) {
    check(articleId, String);
    const {
      userId
    } = this;

    if (!userId) {
      throw new Meteor.Error(400, 'Permission Denied');
    }

    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    return ArticleViews.update({
      userId,
      articleId: cleanArticleId
    }, {
      $max: {
        maxScrolledContent
      }
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"articles.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/articles.js                                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  NewsArticles: () => NewsArticles,
  NewsArticlesJoined: () => NewsArticlesJoined,
  NewsArticlesInReadingList: () => NewsArticlesInReadingList,
  NewsArticlesInArchive: () => NewsArticlesInArchive,
  FurtherRecommendedNewsArticles: () => FurtherRecommendedNewsArticles
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 2);
let ReadingList;
module.link("./readingList", {
  ReadingList(v) {
    ReadingList = v;
  }

}, 3);
let Archive;
module.link("./archive", {
  Archive(v) {
    Archive = v;
  }

}, 4);
let removeWeirdMinusSignsInFrontOfString;
module.link("../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 5);
const NewsArticles = new Mongo.Collection('newsArticles');
const NewsArticlesJoined = new Mongo.Collection('newsArticlesJoined');
const NewsArticlesInReadingList = new Mongo.Collection('newsArticlesInReadingList');
const NewsArticlesInArchive = new Mongo.Collection('newsArticlesInArchive');
const FurtherRecommendedNewsArticles = new Mongo.Collection('furtherRecommendedNewsArticles');
Meteor.methods({
  'newsArticles.bookmark.update'(articleId) {
    check(articleId, String); // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details

    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const {
      userId
    } = this;
    const isInReadingList = ReadingList.find({
      articleId: cleanArticleId,
      userId,
      removedAt: {
        $exists: false
      }
    }).count() > 0;

    if (isInReadingList) {
      Meteor.call('readingList.article.remove', cleanArticleId);
    } else {
      Meteor.call('readingList.article.add', cleanArticleId);
    }
  },

  'newsArticles.favourite.update'(articleId) {
    check(articleId, String); // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details

    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const {
      userId
    } = this;
    const isInArchive = Archive.find({
      articleId: cleanArticleId,
      userId,
      removedAt: {
        $exists: false
      }
    }).count() > 0;

    if (isInArchive) {
      Meteor.call('archive.article.remove', cleanArticleId);
    } else {
      Meteor.call('archive.article.add', cleanArticleId);
    }
  } // 'newsArticles.count'(limit = 20) {
  //         return NewsArticlesJoined.find(limit).count()
  // }


});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"experiments.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/experiments.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let check, Match;
module.link("meteor/check", {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 1);
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }

}, 2);
let userIsInRole, userOwnsExperiment;
module.link("../lib/utils/utils_account", {
  userIsInRole(v) {
    userIsInRole = v;
  },

  userOwnsExperiment(v) {
    userOwnsExperiment = v;
  }

}, 3);
let Experiment;
module.link("../ui/modules/experiments/Experiment", {
  default(v) {
    Experiment = v;
  }

}, 4);
module.exportDefault(Experiments = new Mongo.Collection('experiments'));
Meteor.methods({
  'experiments.create'(name) {
    check(name, String);

    if (!userIsInRole('admin')) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    experimentId = Experiments.insert({
      name,
      testingPhase: true,
      dislikeSurvey: {
        question: 'Default dislike question',
        answers: [{
          _id: Random.id(),
          text: 'Default dislike answer',
          value: 0
        }]
      },
      likeSurvey: {
        question: 'Default like question',
        answers: [{
          _id: Random.id(),
          text: 'Default like answer',
          value: 0
        }]
      }
    });
    Meteor.users.update({
      _id: Meteor.userId()
    }, {
      $push: {
        experiments: {
          experiment: experimentId,
          accessLevel: 0
        }
      }
    });
    return experimentId;
  },

  'experiments.remove'(experimentId) {
    check(experimentId, String);

    if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    Experiments.remove(experimentId);
  },

  'experiments.update'(experiment) {
    check(experiment, {
      _id: String,
      name: String,
      testingPhase: Boolean
    });

    if (!userIsInRole('admin') || !userOwnsExperiment(experiment._id)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    Experiments.update({
      _id: experiment._id
    }, {
      $set: {
        name: experiment.name,
        testingPhase: experiment.testingPhase
      }
    });
  },

  'experiments.launch'(experimentId) {
    check(experimentId, String);

    if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    Experiments.update({
      _id: experimentId
    }, {
      $set: {
        testingPhase: false
      }
    });
  },

  'experiments.dislikeSurvey.update'(experimentId, dislikeSurvey) {
    check(experimentId, String);
    check(dislikeSurvey, {
      question: String,
      answers: [{
        _id: String,
        text: String,
        value: Number
      }]
    });

    if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    Experiments.update({
      _id: experimentId
    }, {
      $set: {
        dislikeSurvey
      }
    });
  },

  'experiments.likeSurvey.update'(experimentId, likeSurvey) {
    check(experimentId, String);
    check(likeSurvey, {
      question: String,
      answers: [{
        _id: String,
        text: String,
        value: Number
      }]
    });

    if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    Experiments.update({
      _id: experimentId
    }, {
      $set: {
        likeSurvey
      }
    });
  },

  'experiments.dislikeSurvey.remove'(experimentId) {
    if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    Experiments.update({
      _id: experimentId
    }, {
      $set: {
        dislikeSurvey: null
      }
    });
  },

  'experiments.likeSurvey.remove'(experimentId) {
    if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    Experiments.update({
      _id: experimentId
    }, {
      $set: {
        likeSurvey: null
      }
    });
  },

  'experiments.addUsers'(experimentId, amount, userGroup) {
    check(experimentId, String);
    check(amount, Match.Integer);
    check(userGroup, String);

    if (!userIsInRole('admin') || !userOwnsExperiment(experimentId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    if (amount > 30) {
      throw new Meteor.Error(403, 'Too many users requested');
    }

    for (let i = 0; i < amount; i++) {
      const newUser = {
        username: Random.id(5),
        password: Random.id(5)
      };
      const newUserId = Accounts.createUser(newUser);
      Meteor.users.update({
        _id: newUserId
      }, {
        $set: {
          participatesIn: experimentId,
          userGroup,
          plaintextPassword: newUser.password
        }
      });
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"explanations.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/explanations.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Explanations: () => Explanations
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 2);
let removeWeirdMinusSignsInFrontOfString;
module.link("../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 3);
let NewsArticles;
module.link("./articles", {
  NewsArticles(v) {
    NewsArticles = v;
  }

}, 4);
const Explanations = new Mongo.Collection('explanations');
const explanationViews = new Mongo.Collection('explanationViews');
Meteor.methods({
  'explanationViews.insert'(articleId) {
    check(articleId, String);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const article = NewsArticles.findOne(cleanArticleId);

    if (!article) {
      throw new Meteor.Error(404, 'Article not found');
    }

    return explanationViews.insert({
      articleId: cleanArticleId,
      userId,
      createdAt: new Date()
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"pageViews.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/pageViews.js                                                                                            //
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
  PageViews: () => PageViews
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let removeWeirdMinusSignsInFrontOfString;
module.link("../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 3);
const PageViews = new Mongo.Collection('pageViews');
Meteor.methods({
  'pageViews.add'(page, previousPage, currentParameters, prevParameters) {
    check(page, String);
    check(previousPage, String);
    check(currentParameters, Object);
    check(prevParameters, Object);
    const {
      userId
    } = this;

    if (!userId) {
      throw new Meteor.Error(400, 'Permission Denied');
    }

    const currentParametersHardCopy = _objectSpread({}, currentParameters);

    if (currentParametersHardCopy.articleId) {
      currentParametersHardCopy.articleId = removeWeirdMinusSignsInFrontOfString(currentParametersHardCopy.articleId);
    }

    const prevParametersHardCopy = _objectSpread({}, prevParameters);

    if (prevParametersHardCopy.articleId) {
      prevParametersHardCopy.articleId = removeWeirdMinusSignsInFrontOfString(prevParametersHardCopy.articleId);
    }

    if (page === 'Article') {
      Meteor.call('articleViews.add', currentParametersHardCopy.articleId);
    }

    if (previousPage === 'Article') {
      Meteor.call('articleViews.duration.update', prevParametersHardCopy.articleId);
    } // Save in PageViews parameters of current open screen, unless the previous one was an Article screen


    let parameters = currentParametersHardCopy;

    if (previousPage === 'Article') {
      parameters = prevParametersHardCopy;
    }

    return PageViews.insert({
      userId,
      page,
      previousPage,
      parameters,
      createdAt: new Date()
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"podcastAnalytics.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/podcastAnalytics.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  PodcastAnalytics: () => PodcastAnalytics
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let NewsArticles;
module.link("./articles", {
  NewsArticles(v) {
    NewsArticles = v;
  }

}, 3);
let removeWeirdMinusSignsInFrontOfString;
module.link("../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 4);
const PodcastAnalytics = new Mongo.Collection('podcastAnalytics');
Meteor.methods({
  'podcastAnalytics.insert'(articleId, action, podcastTimestamp) {
    check(articleId, String);
    check(action, String);
    check(podcastTimestamp, Number);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const article = NewsArticles.findOne(cleanArticleId);

    if (!article) {
      throw new Meteor.Error(404, 'Article not found');
    }

    return PodcastAnalytics.insert({
      articleId: cleanArticleId,
      userId,
      action,
      podcastTimestamp,
      createdAt: new Date()
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"readingList.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/readingList.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ReadingList: () => ReadingList
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 2);
let removeWeirdMinusSignsInFrontOfString;
module.link("../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 3);
let NewsArticles;
module.link("./articles", {
  NewsArticles(v) {
    NewsArticles = v;
  }

}, 4);
const ReadingList = new Mongo.Collection('readingList');
Meteor.methods({
  /**
   * Adds the article with the given id to the current user's reading list.
   *
   * @param articleId
   *          the id of the article that's added to the reading list
   * @returns {any}
   *          The unique _id of the document that was inserted
   */
  'readingList.article.add'(articleId) {
    check(articleId, String);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const article = NewsArticles.findOne(cleanArticleId);

    if (!article) {
      throw new Meteor.Error(404, 'Article not found');
    }

    const {
      dateScraped
    } = article;
    return ReadingList.insert({
      articleId: cleanArticleId,
      userId,
      createdAt: new Date(),
      articlePublishedDate: dateScraped
    });
  },

  /**
   * Removes a news article from the reading list of the current user.
   *
   * @param articleId
   *          id of the news article that will be removed from the reading list
   *
   * @returns {any}
   *          number of removed documents
   */
  'readingList.article.remove'(articleId) {
    check(articleId, String);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    return ReadingList.update({
      articleId: cleanArticleId,
      userId,
      removedAt: {
        $exists: false
      }
    }, {
      $set: {
        removedAt: new Date()
      }
    }, {
      multi: true
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"recommendations.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/recommendations.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Recommendations: () => Recommendations
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const Recommendations = new Mongo.Collection('recommendationLists');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"signins.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/signins.js                                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  SignIns: () => SignIns
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
const SignIns = new Mongo.Collection('signins');
Meteor.methods({
  'signins.add'() {
    const {
      userId
    } = this;

    if (!userId) {
      throw new Meteor.Error(400, 'Permission Denied');
    }

    return SignIns.insert({
      userId,
      createdAt: new Date()
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"surveys.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/surveys.js                                                                                              //
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
  Surveys: () => Surveys,
  UnansweredSurveys: () => UnansweredSurveys
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }

}, 1);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 2);
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 3);
let userOwnsSurvey, userOwnsExperiment;
module.link("../lib/utils/utils_account", {
  userOwnsSurvey(v) {
    userOwnsSurvey = v;
  },

  userOwnsExperiment(v) {
    userOwnsExperiment = v;
  }

}, 4);
const Surveys = new Mongo.Collection('surveys');
const UnansweredSurveys = new Mongo.Collection('unansweredSurveys');
Meteor.methods({
  'surveys.create'(surveyName, experimentId) {
    check(surveyName, String);
    check(experimentId, String);
    const user = Meteor.user({
      fields: {
        experiments: 1
      }
    });

    if (!user) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    if (!userOwnsExperiment(experimentId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    return Surveys.insert({
      name: surveyName,
      experiment: experimentId,
      createdBy: user._id,
      createdAt: new Date(),
      isActive: true,
      questions: [{
        _id: Random.id(),
        text: '',
        minSelect: 1,
        maxSelect: 1,
        answers: [{
          _id: Random.id(),
          text: '',
          value: 0
        }]
      }]
    });
  },

  'surveys.delete'(surveyId) {
    check(surveyId, String);

    if (!userOwnsSurvey(surveyId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    return Surveys.remove(surveyId);
  },

  'surveys.update'(surveyId, isActive) {
    check(surveyId, String);
    check(isActive, Boolean);

    if (!userOwnsSurvey(surveyId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    Surveys.update({
      _id: surveyId
    }, {
      $set: {
        isActive
      }
    });
  },

  'surveys.questions.update'(surveyId, surveyQuestions) {
    check(surveyId, String);
    check(surveyQuestions, Array);

    if (!userOwnsSurvey(surveyId)) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // technically it would be more sensible to parse all inputs
    // on the client side, i.e. inside the modal / form where the
    // questions are edited (inside the change handlers). Unfortunately,
    // using 'parseFloat' inside such a handler, which updates the state
    // directly, leaves us with a very bad UX (to type a float one needs
    // to start with '.', typing '0.' clears the input).
    // thus, we transform all inputs here


    const questions = surveyQuestions.map(question => {
      const newQuestion = _objectSpread(_objectSpread({}, question), {}, {
        minSelect: parseInt(question.minSelect, 10),
        maxSelect: parseInt(question.maxSelect, 10),
        answers: question.answers.map((_ref) => {
          let {
            _id,
            text,
            value
          } = _ref;
          return {
            _id,
            text,
            value: isNaN(parseFloat(value)) ? value : parseFloat(value)
          };
        })
      });

      if (question.withAtLeast) {
        newQuestion.withAtLeast = parseInt(question.withAtLeast, 10);
      }

      if (question.selectionsFrom) {
        newQuestion.selectionsFrom = {
          _id: question.selectionsFrom.value,
          index: question.selectionsFrom.index,
          // value and label are used in the select component
          // in the edit modal.
          value: question.selectionsFrom.value,
          label: question.selectionsFrom.label
        };
      }

      if (question.canBeSkipped) {
        newQuestion.canBeSkipped = question.canBeSkipped;
        newQuestion.skipAnswerText = question.skipAnswerText;
        newQuestion.skipAnswerValue = isNaN(parseFloat(question.skipAnswerValue)) ? question.skipAnswerValue : parseFloat(question.skipAnswerValue);
      }

      if (question.hasOtherOption) {
        newQuestion.hasOtherOption = question.hasOtherOption;
        newQuestion.otherAnswerText = question.otherAnswerText;
        newQuestion.otherAnswerValue = isNaN(parseFloat(question.otherAnswerValue)) ? question.otherAnswerValue : parseFloat(question.otherAnswerValue);
      }

      return newQuestion;
    });
    return Surveys.update(surveyId, {
      $set: {
        questions
      }
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"user.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/user.js                                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let userIsInRole, userOwnsExperiment;
module.link("../lib/utils/utils_account", {
  userIsInRole(v) {
    userIsInRole = v;
  },

  userOwnsExperiment(v) {
    userOwnsExperiment = v;
  }

}, 2);
let Answers;
module.link("./answers", {
  Answers(v) {
    Answers = v;
  }

}, 3);
Meteor.methods({
  /**
   * Send a verification email to the current user.
   *
   * @returns {any}
   *          return value of {@link Accounts#sendVerificationEmail}
   */
  'user.sendVerificationMail'() {
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(500, 'Invalid User');
    }

    return Accounts.sendVerificationEmail(userId);
  },

  'user.surveys.reset'() {
    const {
      userId
    } = this;

    if (!userId) {
      throw new Meteor.Error(500, 'Invalid User');
    } // return Answers.remove({ userId }, { multi: true });


    return Answers.remove({
      userId
    });
  },

  'user.remove'(userId) {
    check(userId, String);
    const user = Meteor.users.findOne({
      _id: userId
    }, {
      fields: {
        participatesIn: 1
      }
    });

    if (!user) {
      throw new Meteor.Error(400, 'User does not exist');
    }

    if (!userIsInRole('admin') || !userOwnsExperiment(user.participatesIn)) {
      throw new Meteor.Error(403, 'Permission Denied');
    }

    return Meteor.users.remove({
      _id: userId
    });
  },

  /*
   * Add notification id
   *
   */
  'user.savePushToken'(userId, pushToken) {
    const user = Meteor.users.findOne(userId);

    if (!user) {
      throw new Meteor.Error(400, 'User does not exist');
    }

    return Meteor.users.update(user, {
      $set: {
        pushNotificationToken: pushToken
      }
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"videoAnalytics.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/videoAnalytics.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  VideoAnalytics: () => VideoAnalytics
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let check, Match;
module.link("meteor/check", {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 1);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let NewsArticles;
module.link("./articles", {
  NewsArticles(v) {
    NewsArticles = v;
  }

}, 3);
let removeWeirdMinusSignsInFrontOfString;
module.link("../lib/utils/utils_string", {
  removeWeirdMinusSignsInFrontOfString(v) {
    removeWeirdMinusSignsInFrontOfString = v;
  }

}, 4);
const VideoAnalytics = new Mongo.Collection('videoAnalytics');
Meteor.methods({
  'videoAnalytics.insert'(articleId, action, videoTimestamp) {
    check(articleId, String);
    check(action, String);
    check(videoTimestamp, Number);
    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(403, 'Permission Denied');
    } // due to a bug in react-native-meteor and/or minimongo-cache
    // some ids include a minus sign in front of them and we need to strip that first
    // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details


    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const article = NewsArticles.findOne(cleanArticleId);

    if (!article) {
      throw new Meteor.Error(404, 'Article not found');
    }

    return VideoAnalytics.insert({
      articleId: cleanArticleId,
      userId,
      action,
      videoTimestamp,
      createdAt: new Date()
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"server":{"configs":{"config_accounts.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/configs/config_accounts.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let isEmailVerified, userIsInRole;
module.link("../../../lib/utils/utils_account", {
  isEmailVerified(v) {
    isEmailVerified = v;
  },

  userIsInRole(v) {
    userIsInRole = v;
  }

}, 1);
const DEFAULT_USER_ROLES = ['user'];
const ADMIN_ROLE = 'admin';
const BLOCKED_ROLE = 'blocked';
const DEACTIVATED_ROLE = 'deactivated';
const LOCKED_ROLES = [BLOCKED_ROLE, DEACTIVATED_ROLE];
const EMAILTEMPLATES_SITENAME = 'placeholder';
const EMAILTEMPLATES_FROM = 'placeholder <placeholder@your.domain>';
const IS_EMAIL_VERIFICATION_REQUIRED = false;
const IS_REGISTRATION_OPEN = true;
const IS_SURVEY_REQUIRED = true; // enable verification emails

Accounts.config({
  sendVerificationEmail: IS_EMAIL_VERIFICATION_REQUIRED,
  forbidClientAccountCreation: !IS_REGISTRATION_OPEN
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

Accounts.onLogin(info => {
  Meteor.call('signins.add');
  Meteor.users.update({
    _id: info.user._id
  }, {
    $set: {
      'profile.lastLogin': new Date()
    }
  });
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
  const newUser = _objectSpread({}, user);

  newUser.roles = DEFAULT_USER_ROLES; // We still want the default hook's 'profile' behavior.

  if (options.profile) {
    newUser.profile = options.profile;
  }

  if (!newUser.profile) {
    newUser.profile = {};
  }

  newUser.participatesIn = 'default-experiment';
  newUser.userGroup = 'baseline';
  newUser.score = [];
  newUser.experiments = [];
  newUser.notification = null; // if there is no administrator in the system, make sure that
  // the next user that registers is an administrator.
  // this code exists only for convenience such that the first
  // user that registers is always an administrator.

  const isThereAtLeastOneAdmin = !!Meteor.users.findOne({
    roles: ADMIN_ROLE
  });
  const isNewUserAnAdmin = newUser.roles.indexOf(ADMIN_ROLE) !== -1;

  if (!isThereAtLeastOneAdmin && !isNewUserAnAdmin) {
    newUser.roles.push(ADMIN_ROLE);
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

Accounts.validateLoginAttempt(info => {
  const {
    user
  } = info;

  if (!user) {
    throw new Meteor.Error(400, 'Invalid User');
  } // reject users with role "blocked" and throw an error


  if (userIsInRole(LOCKED_ROLES, user)) {
    throw new Meteor.Error(403, 'Your account is blocked.');
  } // reject user without a verified email address


  if (IS_EMAIL_VERIFICATION_REQUIRED && !isEmailVerified(user)) {
    throw new Meteor.Error(499, 'E-mail not verified.');
  }

  return true;
}); // define sender and site name for verification emails

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
  }

};
Accounts.emailTemplates.resetPassword = {
  subject() {
    return 'DDIS News - Reset your password';
  },

  text(user, url) {
    return "Hey ".concat(user, "! Reset your password with following this link: ").concat(url);
  }

};

Accounts.urls.resetPassword = token => Meteor.absoluteUrl("reset-password/".concat(token));

Accounts.urls.verifyEmail = token => Meteor.absoluteUrl("verify-email/".concat(token));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/configs/index.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("./config_accounts");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"fixtures":{"experiments.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/fixtures/experiments.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  EXPERIMENT: () => EXPERIMENT
});
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }

}, 0);
const EXPERIMENT = {
  _id: 'default-experiment',
  name: 'default experiment',
  testingPhase: true,
  dislikeSurvey: null,
  likeSurvey: {
    question: 'Wieso mögen Sie den Artikel?',
    answers: [{
      _id: Random.id(),
      text: 'Ich stimme den Aussagen des Artikels zu.',
      value: 0
    }, {
      _id: Random.id(),
      text: 'Ich mag den Schreibstil.',
      value: 0
    }, {
      _id: Random.id(),
      text: 'Das Thema interessiert mich.',
      value: 0
    }]
  },
  feedbackEmail: 'placeholder@your.domain',
  explanationTagsDef: {
    '60feefd58bd1b5012ad6e689': {
      _id: '60feefd58bd1b5012ad6e689',
      textShort: 'Mmmmmmmmmmm',
      textLong: 'Interests',
      textColorLight: '#FFFFFF',
      textColorDark: '#FFFFFF',
      backgroundColorLight: '#44546A',
      backgroundColorDark: '#44546A',
      detailedExplanation: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut dignissim et enim a tempor. Etiam justo nunc, pellentesque ac placerat id, elementum vel nisl. Curabitur sollicitudin commodo ligula sed rutrum. Aliquam elementum malesuada velit, eget facilisis urna finibus eleifend.'
    }
  },
  maxNrExplanationTags: 3,
  maxCharacterExplanationTagShort: 5,
  maxNrFurtherRecArticles: 3,
  totalLikesDislikesEnabled: true,
  previewTitleLineHeight: 2
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/fixtures/index.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let NewsArticles;
module.link("../../../api/articles", {
  NewsArticles(v) {
    NewsArticles = v;
  }

}, 0);
let Surveys;
module.link("../../../api/surveys", {
  Surveys(v) {
    Surveys = v;
  }

}, 1);
let NEWS_ARTICLES;
module.link("./newsArticles", {
  NEWS_ARTICLES(v) {
    NEWS_ARTICLES = v;
  }

}, 2);
let SURVEYS;
module.link("./surveys", {
  SURVEYS(v) {
    SURVEYS = v;
  }

}, 3);
let Experiments;
module.link("../../../api/experiments", {
  default(v) {
    Experiments = v;
  }

}, 4);
let EXPERIMENT;
module.link("./experiments", {
  EXPERIMENT(v) {
    EXPERIMENT = v;
  }

}, 5);
const numberOfNewsArticlesInDatabase = NewsArticles.find().count();

if (numberOfNewsArticlesInDatabase === 0) {
  NEWS_ARTICLES.forEach(n => {
    NewsArticles.insert(n);
  });
}

const numberOfSurveysInDatabase = Surveys.find().count();

if (numberOfSurveysInDatabase === 0) {
  SURVEYS.forEach(s => {
    Surveys.insert(s);
  });
}

const numberOfExperimentsInDatabase = Experiments.find().count();

if (numberOfExperimentsInDatabase === 0) {
  Experiments.insert(EXPERIMENT);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"newsArticles.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/fixtures/newsArticles.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  NEWS_ARTICLES: () => NEWS_ARTICLES
});
const NEWS_ARTICLES = [{
  _id: '5bffcc4dd89cbc027d502b6b',
  url: 'https://www.nzz.ch/wirtschaft/mobiliar-kooperiert-mit-chubb-ld.1440604',
  flag: '',
  primaryCategory: 'Wirtschaft',
  subCategories: [''],
  pageType: 'regular',
  title: 'Mobiliar kooperiert mit Chubb',
  lead: 'Die stark auf die Schweiz ausgerichtete Versicherung Mobiliar will auch in Zukunft Unternehmen mit Sitz in der Schweiz im Ausland begleiten. Das will sie neu zusammen mit dem internationalen Versicherungskonzern Chubb machen.',
  author: 'Werner Enz',
  datePublished: new Date('2018-11-29T10:53:55.408Z'),
  dateUpdated: new Date('2018-11-29T10:53:55.408Z'),
  dateScraped: new Date('2018-11-29T12:23:57.245Z'),
  language: 'de-CH',
  outlet: 'NZZ',
  image: '',
  body: [{
    type: 'text',
    text: 'Die genossenschaftliche Mobiliar wird in den Sparten Sach- und Haftpflichtversicherungen im Auslandgeschäft neu mit dem Industrieversicherer Chubb zusammenarbeiten. Bis anhin hatte man Schweizer Unternehmenskunden in Kooperation mit XL Catlin im Ausland begleitet. Es ist wohl zum Wechsel gekommen, weil XL Catlin inzwischen vom Axa-Konzern, einem scharfen Konkurrenten der Mobiliar in der Schweiz, übernommen worden ist.'
  }, {
    type: 'text',
    text: 'Chubb ist seit vielen Jahren in der Schweiz aktiv und beschäftigt zurzeit 75 Mitarbeiter. Durch das Zusammengehen der Unternehmen Ace und Chubb ist der 31 000 Mitarbeiter beschäftigende Konzern nunmehr zum grössten börsenkotierten Industrieversicherer aufgestiegen. Chubb wird von Standard & Poor&aposs mit dem AA-Rating benotet und wird an der Börse mit rund 62 Mrd. $ bewertet. '
  }]
}, {
  _id: '5bffcc4dd89cbc027d502b6c',
  url: 'https://www.nzz.ch/international/diese-laender-lehnen-den-uno-migrationspakt-ab-oder-zoegern-mit-der-zustimmung-ld.1438476',
  flag: '',
  primaryCategory: 'International',
  subCategories: [''],
  pageType: 'regular',
  title: 'Deutschland debattiert über den Uno-Migrationspakt – andere Länder haben ihn bereits abgelehnt',
  lead: 'In verschiedenen Staaten wurde der Uno-Migrationspakt in den letzten Wochen zum Politikum. Bis jetzt verweigern neun Länder die Unterstützung. In Deutschland debattiert heute der Bundestag. Verfolgen Sie die Debatte live (ab 12 Uhr 20).',
  author: 'Fabian Urech, Samuel Misteli, Ivo Mijnssen',
  datePublished: new Date('2018-11-29T10:52:21.002Z'),
  dateUpdated: new Date('2018-11-29T10:57:42.217Z'),
  dateScraped: new Date('2018-11-29T12:23:57.482Z'),
  language: 'de-CH',
  outlet: 'NZZ',
  image: 'https://img.nzz.ch/C=W5580,H2929.5,X0,Y337.75/S=W1200M,H630M/O=75/C=AR1200x630/https://nzz-img.s3.amazonaws.com/2018/11/22/10e046f3-e172-4441-a96d-bfbd654b8282.jpeg',
  body: [{
    type: 'text',
    text: 'Der Migrationspakt («Migration Compact») soll an einem Gipfeltreffen vom 10. und 11. Dezember in Marokko besiegelt werden. Die Uno will damit zum ersten Mal Grundsätze für den Umgang mit Migranten festlegen. Im Juli hatten sich die über 190 Staaten, die an der Erarbeitung beteiligt waren, nach 18 Monaten auf die Endfassung des Dokuments geeinigt. Mit dem Pakt soll insbesondere die illegale Einwanderung verhindert und die legale Einwanderung besser gesteuert werden. Die Unterzeichner bekennen sich dazu, dafür eine Reihe von Massnahmen anzuwenden, die von der Verbesserung der Betreuung in Herkunfts- und Zielländern über Informationskampagnen entlang der Migrationsrouten bis zu transparenten Verfahren an den Grenzen reichen.'
  }, {
    type: 'text',
    text: 'Der Umgang mit Flüchtlingen steht im Zentrum eines zweiten Abkommens, des Flüchtlingspakts, der an dem Gipfel ebenfalls verabschiedet werden soll. Die beiden Abkommen sind nicht rechtsverbindlich. Dennoch haben sie in verschiedenen Ländern eine kontroverse Diskussion ausgelöst.'
  }, {
    type: 'subtitle',
    text: 'Deutscher Bundestag debattiert'
  }, {
    type: 'text',
    text: 'In Deutschland wird der Migrationspakt seit Wochen kontrovers diskutiert. Über den Antrag soll nun am Donnerstag im Bundestag beraten und abgestimmt werden. Verfolgen Sie die Debatte hier live (ab 12 Uhr 20): '
  }, {
    type: 'text',
    text: 'Die CDU will den Parlamentsbeschluss als Grundlage für einen Leitantrag für ihren Bundesparteitag im Dezember nehmen. Die Unionsfraktion im Bundestag hat sich am Dienstag fast einmütig hinter den geplanten Uno-Migrationspakt gestellt. '
  }, {
    type: 'text',
    text: 'Folgenden Länder (in chronologischer Abfolge) haben bereits angekündigt, den Migrationspakt in Marokko nicht zu verabschieden. '
  }, {
    type: 'subtitle',
    text: 'USA'
  }, {
    type: 'text',
    text: 'Die USA gaben bereits im Dezember 2017 bekannt, sich nicht am Migrationspakt zu beteiligen. Als einziges der 193 Uno-Mitglieder nahmen sie gar nicht erst an den Verhandlungen teil. Die Verweigerungshaltung der USA kam angesichts der harten Linie der Regierung Trump in der Migrationspolitik nicht überraschend.'
  }, {
    type: 'subtitle',
    text: 'Ungarn'
  }, {
    type: 'text',
    text: 'Das nationalkonservativ regierte Ungarn verliess die Verhandlungen zum Migrationspakt kurz vor deren Abschluss im Juli. Aussenminister Peter Szijjarto begründete den Schritt mit harschen Worten: Das Papier widerspreche «jeglicher Vernunft» und sei «extremistisch, voreingenommen, ein Förderer von Migration». Szijjarto fürchtet zudem rechtliche Verpflichtungen. Er äusserte Zweifel daran, dass der Migrationspakt rechtlich nicht bindend sei – obwohl dies im Text des Abkommens explizit festgehalten ist. Die ungarische Regierung wehrt sich insbesondere gegen die im Vertrag vorgeschlagenen internationalen Standards für die Behandlung von Migranten an den Landesgrenzen; diese seien eine rein nationale Angelegenheit, erklärte Szijjarto im November. Ungarn steht seit Jahren international in der Kritik, weil es Asylbewerber an der Grenze zu Serbien standardmässig über Monate interniert. Der Migrationspakt sieht Internierung hingegen nur in absoluten Ausnahmefällen vor. '
  }, {
    type: 'subtitle',
    text: 'Österreich'
  }, {
    type: 'text',
    text: 'Die Regierung in Wien trat mit ihrem Rückzug eine breite europäische Debatte über den Migrationspakt los. Nachdem österreichische Diplomaten massgeblich an den Verhandlungen beteiligt gewesen waren, beschloss die Regierung aus ÖVP und FPÖ Ende Oktober, das Dokument nicht zu unterstützen und im Dezember keinen Vertreter nach Marrakesch zu entsenden. Mitverantwortlich für diese Entscheidung war eine heftige Kampagne identitärer Kreise, deren Argumente sich teilweise in der offiziellen Regierungsposition wiederfinden. '
  }, {
    type: 'text',
    text: 'In der Erklärung der Regierung hiess es, die Republik entscheide souverän über die Zulassung von Zuwanderung und kenne kein «Menschenrecht auf Migration». Die Schaffung der völkerrechtlichen Kategorie des «Migranten» sei zudem zurückzuweisen. Im Interview mit der NZZ begründet Bundeskanzler Sebastian Kurz die Ablehnung damit, dass der Migrationsbegriff im Pakt zu schwammig sei. Gleichzeitig betonte er: «Trotz unserer Enthaltung erachten wir aber eine multilaterale Zusammenarbeit in Migrationsfragen als sinnvoll.» Bundespräsident Alexander Van der Bellen verlieh nach dem Rückzug in einer seltenen innenpolitischen Intervention seiner Sorge um das Ansehen und die Glaubwürdigkeit Österreichs Ausdruck.'
  }, {
    type: 'subtitle',
    text: 'Bulgarien'
  }, {
    type: 'text',
    text: 'Bulgariens Regierung um den Ministerpräsidenten Bojko Borisow begründet ihren Rückzug aus dem Migrationspakt am 12. November mit dem Hinweis auf nationale Interessen. Das Abkommen würde ebendiese gefährden, erklärte der Fraktionschef der nationalkonservativen Regierungspartei Gerb, Zwetan Zwetanow. Bulgarien hat seine Migrationspolitik verschärft, seit zwischen 2013 und 2016 im Zuge der Flüchtlingskrise mehrere Zehntausend Migranten von der Türkei her ins Land kamen. Sofia reagierte mit dem Bau eines Grenzzauns. Die meisten Migranten nutzten Bulgarien jedoch nur als Zwischenstation auf der Weiterreise in Richtung Mitteleuropa. Um wieder an die Regierung zu kommen, bildete Borisow 2017 zudem eine Koalition mit der rechtsextremen Parteiengruppe Vereinigte Patrioten. Diese profiliert sich stark über die Ablehnung der Migration.'
  }, {
    type: 'subtitle',
    text: 'Tschechien'
  }, {
    type: 'text',
    text: 'Das tschechische Regierungskabinett beschloss Mitte November, den Migrationspakt nicht zu unterzeichnen. Die Minderheitsregierung aus populistischer ANO und sozialdemokratischer CSSD beklagt wie andere Länder auch, dass das Papier nicht genügend zwischen «legaler» und «illegaler» Migration unterscheide. Ministerpräsident und ANO-Gründer Andrej Babis hatte schon früher erklärt, der Migrationspakt sei unklar formuliert und könnte missbraucht werden. Das Papier gefährde gar die Sicherheit und nationale Souveränität Tschechiens. Babis hatte die Wahl Anfang Jahr massgeblich mit dem Versprechen gewonnen, die illegale Migration zu bekämpfen. Bereits die Vorgängerregierung hatte eine EU-weite Verteilung von Flüchtlingen abgelehnt. Sie wissen dabei auch eine Mehrheit der Bevölkerung hinter sich. '
  }, {
    type: 'subtitle',
    text: 'Polen'
  }, {
    type: 'text',
    text: 'Polen erklärte am 20. November, den Migrationspakt nicht mitzutragen. Die nationalkonservative Regierung in Warschau begründet ihren Entscheid mit souveränitätspolitischen Bedenken. Der Pakt garantiere nicht ausreichend das Recht von Staaten, darüber zu entscheiden, wer auf ihrem Territorium aufgenommen werde. «Wir sind der Ansicht, dass unsere souveränen Prinzipien absolute Priorität haben», hatte Polens Ministerpräsident Mateusz Morawiecki Anfang November gesagt. Kritisch sieht die polnische Regierung auch die im Pakt gemachte Unterscheidung zwischen legaler und illegaler Migration. Die verwendeten Begrifflichkeiten könnten zu Schwierigkeiten bei der Umsetzung des Abkommens führen, heisst es aus Warschau. '
  }, {
    type: 'subtitle',
    text: 'Israel'
  }, {
    type: 'text',
    text: '«Wir fühlen uns dem Schutz unserer Grenzen vor illegalen Einwanderern verpflichtet», begründete Ministerpräsident Benjamin Netanyahu am 20. November den Entscheid, sich aus dem Migrationspakt zurückzuziehen. Israel verfolgt eine restriktive Flüchtlingspolitik und versucht seit mehreren Monaten, Zehntausende von afrikanischen Migranten abzuschieben.'
  }, {
    type: 'subtitle',
    text: 'Australien'
  }, {
    type: 'text',
    text: 'Der Migrationspakt sei nicht im Interesse Australiens und stehe im Widerspruch zur Politik seiner Regierung, sagte Premierminister Scott Morrison am 21. November. Der Pakt könne zur «illegalen Einwanderung» in das Land ermutigen. Aussenminister Peter Dutton hatte bereits im Sommer seine Ablehnung kundgetan. Die Regierung Morrisons steht für eine harte Einwanderungs- und Asylpolitik. Australien fängt Flüchtlinge, die das Land auf Booten erreichen wollen, ab und hält sie in Lagern auf Pazifikinseln fest, was immer wieder zu scharfer Kritik führt.'
  }, {
    type: 'subtitle',
    text: 'Slowakei'
  }, {
    type: 'text',
    text: 'Nach einem heftigen Streit innerhalb der Regierung hat die Slowakei am 26. November erklärt, das Land werde den Migrationspakt nicht unterschreiben. «Die Slowakei ist nicht einverstanden damit, dass es keinen Unterschied zwischen legaler und illegaler Migration gibt, und wir betrachten Wirtschaftsmigration als illegal, schädlich und als ein Sicherheitsrisiko», erklärte der Regierungschef Peter Pellegrini. Zuvor hatte der Aussenminister mit seinem Rücktritt gedroht, sollte die Slowakei aus dem Pakt aussteigen. Bisher hat er die Drohung allerdings nicht wahr gemacht. Die Regierung steht seit der Ermordung eines Journalisten, der über die Mafia-Kontakte führender Politiker berichtete, stark unter Druck. Umso dringlicher warnt sie deshalb vor den angeblichen Gefahren der illegalen Migration im Land. Zwischen 2004 und 2017 fiel die Zahl der jährlichen illegalen Grenzübertritte in die Slowakei von knapp 10 946 auf 2706.'
  }, {
    type: 'subtitle',
    text: 'Kontroverse Debatten in anderen Ländern'
  }]
}, {
  _id: '5bffcc4dd89cbc027d502b6d',
  url: 'https://www.nzz.ch/international/die-gelbwesten-ernennen-sprecher-anlauf-zum-dialog-in-frankreich-ld.1440606',
  flag: '',
  primaryCategory: 'International',
  subCategories: [''],
  pageType: 'regular',
  title: 'Die Gelbwesten ernennen Sprecher – Anlauf zum Dialog in Frankreich',
  lead: '',
  author: 'Andres Wysling',
  datePublished: new Date('2018-11-29T10:34:27.334Z'),
  dateUpdated: new Date('2018-11-29T11:22:56.915Z'),
  dateScraped: new Date('2018-11-29T12:23:57.715Z'),
  language: 'de-CH',
  outlet: 'NZZ',
  image: '',
  body: [{
    type: 'text',
    text: 'Die «gilets jaunes» in Frankreich haben acht Sprecher ernannt, die die Protestbewegung in Gesprächen mit der Regierung vertreten sollen. Das wurde schon früher bekannt und am Donnerstag früh definitiv mitgeteilt. Es handelt sich offenbar um Personen, die bei der Organisation der Strassenblockaden und Demonstrationen eine Rolle spielten. Mehrere Dutzend Gelbwesten aus dem ganzen Land hatten sich in den letzten Tagen und Wochen in Videokonferenzen über ihr Vorgehen abgesprochen, aus diesen Konsultationen ist nun die Sprechergruppe hervorgegangen. Das erklärten Exponenten der Gelbwesten gegenüber französischen Medien.'
  }, {
    type: 'text',
    text: 'Eine besonders sichtbare Rolle in der Sprechergruppe spielt der Lastwagenchauffeur Eric Drouet. Auf Facebook stellt er sich der Öffentlichkeit vor, spricht über seine An- und Absichten. Die weiteren Sprecher heissen Priscillia Ludosky, Maxime Nicolle, Mathieu Blavier, Jason Herbert, Thomas Miralles, Marine Charrette-Labadie und Julien Terrier. Bei der Auswahl der Sprecher wurde darauf geachtet, dass diese keine Parteibindungen haben. Man will sich weder von linken noch von rechten Protestparteien vereinnahmen lassen.'
  }, {
    type: 'text',
    text: 'Am Donnerstag und am Freitag will die Regierung in Paris Konsultationen abhalten, etwa mit einem Beratungsgremium für die Energiewende. Für Freitag ist ein Treffen von Premierminister Edouard Philippe mit den Sprechern der Gelbwesten vorgesehen. Diese unterstreichen aber, dass sie wohl im Namen der Protestbewegung sprächen, keinesfalls aber in deren Namen entscheiden könnten. Alle Entscheidungen über das weitere Vorgehen müssten von der Gesamtheit der «gilets jaunes» ausgehen.'
  }]
}, {
  _id: '5bffcc4dd89cbc027d502b6e',
  url: 'https://www.nzz.ch/wissenschaft/wissenschafter-verurteilen-das-vorgehen-he-jiankuis-aufs-schaerfste-ld.1440566',
  flag: '',
  primaryCategory: 'Wissenschaft',
  subCategories: [''],
  pageType: 'regular',
  title: 'Offizielle Stellungnahme: Wissenschafter verurteilen das Vorgehen He Jiankuis aufs Schärfste',
  lead: 'Die Organisatoren des Gipfeltreffens zur Genveränderung am Menschen, das gerade in Hongkong zu seinem Abschluss kommt, haben offiziell zu den Behauptungen He Jiankuis Stellung genommen. Sie verurteilen sein Vorgehen auf allen Ebenen.',
  author: 'Stephanie Kusma',
  datePublished: new Date('2018-11-29T10:31:00.000Z'),
  dateUpdated: new Date('2018-11-29T11:18:55.821Z'),
  dateScraped: new Date('2018-11-29T12:23:57.930Z'),
  language: 'de-CH',
  outlet: 'NZZ',
  image: 'https://img.nzz.ch/C=W4951,H2599.275,X0,Y503.8625/S=W1200M,H630M/O=75/C=AR1200x630/https://nzz-img.s3.amazonaws.com/2018/11/29/8c83ab9e-aa26-4b8b-afeb-14650858f992.jpeg',
  body: [{
    type: 'text',
    text: '«Unerwartet und tief verstörend», nennen die Organisatoren des Gipfeltreffens zum Editieren des menschlichen Genoms, das gerade in Hongkong zu Ende geht, die Behauptungen des chinesischen Forschers He Jiankui. Sie reagierten am Donnerstag mit einer offiziellen Stellungnahme auf die Angaben Hes, nach denen im Rahmen seiner Experimente zwei Babys mit verändertem Genom zur Welt gekommen sind und eine weitere Frau mit einem möglicherweise genveränderten Kind schwanger geworden ist. He hatte seine Forschung am Mittwoch an dem Treffen vorgestellt.'
  }, {
    type: 'subtitle',
    text: 'Ethisch und wissenschaftlich inadäquat'
  }, {
    type: 'text',
    text: 'In ihrer Stellungnahme fordern die Organisatoren zudem eine unabhängige Bestätigung von Hes Behauptungen und eine Untersuchung der beiden Babys. Das Vorgehen des Forschers verurteilen sie vollkommen, und zwar auf allen Ebenen, von Fragen der Ethik bis zu solchen der Wissenschaft: Es «war verantwortungslos und nicht im Einklang mit internationalen Normen. Zu den Mängeln des Vorgehens gehören eine inadäquate medizinische Indikation, ein schlecht gestaltetes Studienprotokoll, die Nichterfüllung ethischer Standards, was den Schutz von Versuchsteilnehmern angeht, und fehlende Transparenz in der Entwicklung, der Prüfung und der Durchführung der klinischen Prozeduren.»'
  }, {
    type: 'text',
    text: 'Sie betonen aber auch den Unterschied zwischen einer Gentherapie an Körperzellen – deren schnellen Fortschritt sie ausdrücklich begrüssen – und der Keimbahntherapie, an der sich He versucht haben will. Letztgenannte macht Änderungen im Genom zu einem erblichen Eingriff: Alle Auswirkungen der Intervention – auch möglicherweise ungewollte – werden an die Nachkommen weitergegeben. Man wisse zum jetzigen Zeitpunkt noch zu wenig über die Risiken solcher Eingriffe, um mit klinischen Experimenten zu beginnen, schreiben die Organisatoren. Das sei unverantwortlich.'
  }, {
    type: 'subtitle',
    text: 'Standards und Regulierungen vorantreiben'
  }, {
    type: 'text',
    text: 'Es sei nun aber an der Zeit, über die Voraussetzungen nachzudenken, die erfüllt sein müssten, um zur klinischen Forschung in diesem Bereich übergehen zu können, und darüber, welche Kriterien solche Versuche selbst erfüllen müssten. Sie fordern unter anderem durchsetzbare Standards zum professionellen Vorgehen, klare Kriterien, was es an vorklinischen Belegen braucht, um mit den Versuchen fortfahren zu können, eine strenge, unabhängige Aufsicht über die Experimente und eine zwingende medizinische Notwendigkeit des Eingriffs sowie Achtsamkeit, was Auswirkungen auf die Gesellschaft angeht.'
  }]
}, {
  _id: '5bffcc4ed89cbc027d502b6f',
  url: 'https://www.nzz.ch/schweiz/verzweifelte-jagd-nach-nazi-raubkunst-in-der-schweiz-ld.1436826',
  flag: '',
  primaryCategory: 'Schweiz',
  subCategories: [''],
  pageType: 'regular',
  title: 'Verzweifelte Jagd nach Nazi-Raubkunst in der Schweiz',
  lead: 'Das Bild «Portrait de Mademoiselle Gabrielle Diot» von Edgar Degas befindet sich mutmasslich bei einem anonymen Schweizer Sammler. Die Nazis raubten es 1940 aus Paris. New Yorker Erben des damaligen Besitzers verlangen es vehement zurück.',
  author: 'Jörg Krummenacher',
  datePublished: new Date('2018-11-15T17:47:27.531Z'),
  dateUpdated: new Date('2018-11-19T06:22:17.268Z'),
  dateScraped: new Date('2018-11-29T12:23:58.345Z'),
  language: 'de-CH',
  outlet: 'NZZ',
  image: 'https://img.nzz.ch/C=W1075,H564.375,X0,Y84.3125/S=W1200M,H630M/O=75/C=AR1200x630/https://nzz-img.s3.amazonaws.com/2018/11/15/762e3084-d992-4aff-8ebb-f43eca71afc2.png',
  body: [{
    type: 'text',
    text: 'Herr Hans weiss nicht mehr, wo ihm der Kopf steht. Mathias Hans, so sein voller Name, ist Galerist und Kunsthändler in Hamburg. 1974 kaufte er einer in Ascona wohnhaften Schweizer Familie das «Portrait de Mademoiselle Gabrielle Diot» ab und verkaufte es für 3,5 Millionen Franken an einen ebenfalls in der Schweiz lebenden Sammler weiter. Seither sieht sich Herr Hans immer wieder mit Restitutionsansprüchen konfrontiert. In den vergangenen Tagen haben sich diese zu einem Sturm ausgewachsen: In den USA, in Grossbritannien, Frankreich und Deutschland haben mehrere Zeitungen von der «New York Times» über den «Figaro» bis zur «Zeit» über den Fall berichtet. Sie alle wollen wissen: Wo ist das Bild? Und: Welchem Schweizer Sammler gehört es? Doch Herr Hans will partout nichts preisgeben. Er habe dem Sammler absolute Diskretion zugesichert.'
  }, {
    type: 'subtitle',
    text: '1940 in Paris konfisziert'
  }, {
    type: 'text',
    text: 'Der berühmte französische Maler und Bildhauer Edgar Degas hatte das Porträt 1890 geschaffen. 1940, als die Nationalsozialisten Teile Frankreichs okkupierten, befand es sich im Besitz des jüdischen Kunsthändlers Paul Rosenberg. Er hatte das Bild 1933 erworben und es direkt über seinen Schreibtisch in der Galerie an der Rue La Boétie in Paris gehängt. Wie viele andere Kunstwerke konfiszierten es die deutschen Besatzer auf Befehl des deutschen Botschafters im besetzten Frankreich, Heinrich Otto Abetz. Die Familie Rosenberg musste nach New York fliehen. '
  }, {
    type: 'text',
    text: 'Bis anhin konnten die Nachkommen Paul Rosenbergs viele der von den Nazis geraubten Kunstwerke restituieren. Darunter ist mit dem Matisse-Bild «Sitzende Frau» auch eines aus der Sammlung Gurlitt, die abgesehen davon ans Kunstmuseum Bern vermacht wurde. 60 Werke blieben bis heute verschwunden – so auch Degas’ «Portrait de Mademoiselle Gabrielle Diot». '
  }, {
    type: 'subtitle',
    text: 'Keine Wiedergutmachung'
  }, {
    type: 'text',
    text: 'Erstmals tauchte das Gemälde 1987 auf. Elaine Rosenberg, eine Schwiegertochter Paul Rosenbergs, entdeckte, dass Mathias Hans den Degas per Inserat in einem internationalen Kunstmagazin zum Verkauf ausschrieb, samt Bild und der Herkunftsbezeichnung Paul Rosenberg. Der Schweizer Kunstsammler, der das Bild 13 Jahre zuvor gekauft hatte, wollte es nun wieder auf den Markt bringen. Elaine Rosenberg wandte sich darauf an Mathias Hans, der als Mittelsmann fungierte. Doch der Sammler ging nicht auf sie ein. «Er identifiziert sich nicht mit der deutschen Geschichte und sah keinen Grund für eine persönliche Wiedergutmachung», teilt der Galerist Hans dazu mit. Das Bild blieb beim Sammler. '
  }, {
    type: 'text',
    text: 'Letztmals gesehen wurde es 2003 in der Schweiz. Laut Mathias Hans befand es sich damals in einem Zollfreilager, das müsse in Basel oder Zürich gewesen sein, führt er gegenüber der NZZ aus. Er habe aber keine Ahnung, wo das Bild heute sei. Er selbst habe es ohnehin nie im Original in der Hand gehabt. «Es war auch nie im Original in meiner Galerie, nur als gerahmte Fotokopie.»'
  }, {
    type: 'text',
    text: 'Damals wurde mehrfach versucht, das Bild doch noch zu verkaufen – vergeblich. Dies erzählt Christopher Marinello, der CEO von Art Recovery International. Das Unternehmen mit Sitz in London ist die einzige Organisation ihrer Art, die sich darauf spezialisiert hat, gestohlene Kunstwerke und Raubkunst wiederzufinden und an ihre rechtmässigen Besitzer zu übergeben. 2016 wurde Marinellos Firma von den Erben Rosenbergs beauftragt, den Fall Degas zu einem guten Ende zu führen.'
  }, {
    type: 'subtitle',
    text: 'Gegenseitige Vorwürfe'
  }, {
    type: 'text',
    text: 'Davon ist man weit entfernt. Zuerst kamen zwar mehrere Treffen mit Mathias Hans zustande. Während der anonyme Sammler aber einen Tausch oder einen Kaufpreis von 3 Millionen Franken ins Spiel brachte, verlangte die Familie Rosenberg die Rückgabe des Gemäldes ohne jegliche finanzielle Leistung. Auch die Aufforderung an die deutsche Regierung, zu einer gütlichen Lösung beizutragen, fruchtete nicht. Inzwischen haben sich die beiden Seiten überworfen und decken sich gegenseitig mit Vorwürfen ein: Fakten würden wissentlich verdreht, falsche Informationen verbreitet. '
  }, {
    type: 'text',
    text: 'Strittig ist insbesondere, ob der Händler Hans und der Sammler 1974 wussten, dass es sich beim Bild um Raubgut handelte. Christopher Marinello ist davon überzeugt, Mathias Hans streitet es ab. Es sei schlicht absurd, so Marinello, dass Hans damals das Bild mit der Provenienz «Nazi occupied Paris, 1942» erstanden habe und dennoch daran festhalte, nichts vom Kunstraub gewusst zu haben.'
  }, {
    type: 'subtitle',
    text: 'Wirklich ein Schweizer?'
  }, {
    type: 'text',
    text: 'Noch immer fehlt zudem jeglicher Hinweis, wer der geheimnisvolle Sammler ist. Nach den wenigen Angaben von Mathias Hans ist es ein älterer Herr, der 1974 in der Schweiz, aber auch in Deutschland und in den USA seinen Wohnsitz gehabt habe. Wo er heute genau wohne, sei ihm nicht bekannt. Marinello zweifelt inzwischen gar daran, dass es sich um einen Schweizer Sammler handelt. «Wir haben weder eine Dokumentation noch sonstige Belege gesehen», sagt er. Sollte es sich aber tatsächlich um einen Schweizer Sammler handeln, fordert ihn Marinello auf, sich über einen Anwalt zu melden. Dabei könne er durchaus anonym bleiben.'
  }, {
    type: 'text',
    text: 'Das Degas-Porträt ist zwar viele Millionen wert, aber im offiziellen Kunstmarkt ist es nicht mehr zu verkaufen, zumal es sich auf der Liste der von den Nazis geraubten Kulturgüter befindet. Laut dem Schweizer Juristen und Raubkunstexperten Andrea Raschèr steht der Fall exemplarisch für ein unverkäufliches Bild.'
  }, {
    type: 'subtitle',
    text: 'Bösgläubiger Erwerb?'
  }, {
    type: 'text',
    text: 'Sollte das Gemälde tatsächlich einem Schweizer Sammler gehören, so wäre die Rechtslage bei einer Rückforderung vertrackt. Die Washingtoner Erklärung von 1998, die von der Schweiz mit ausgearbeitet worden ist, sieht für Restitutionsforderungen das Erreichen gerechter und fairer Lösungen zwischen den Vorkriegs-Eigentümern oder deren Erben und den heutigen Besitzern vor. Doch die Richtlinien sind nicht bindend und gelten ohnehin nur für öffentliche Institutionen, nicht aber für private Sammler. Bei einer Abwicklung des Kaufs in der Schweiz wäre das hiesige Zivilgesetzbuch anwendbar, das zwischen gut- und bösgläubigem Erwerb unterscheidet. Dann könnte laut Andrea Raschèr bereits Unvorsichtigkeit beim Kauf von Raubkunst dazu führen, dass Restitutionsansprüche vor Gericht geschützt werden könnten.'
  }, {
    type: 'text',
    text: 'Im Fall des Degas-Porträts liegt es also nahe, dass sowohl der Kunsthändler Mathias Hans wie auch der anonyme Käufer zumindest hätten vermuten können, dass es sich um Nazi-Raubkunst handelt. «Aufgrund der Prozesse gegen Emil Bührle, der ebenfalls Raubkunst aus der Sammlung Rosenberg erworben hatte, wussten das Sammlerfamilien in der Schweiz damals», sagt Raschèr: «Ein Käufer hätte die Provenienz überprüfen müssen.»'
  }, {
    type: 'text',
    text: 'Herr Hans zeigt sich heute gegenüber der NZZ genervt und betroffen ob der Anfragen und Vorwürfe, die ihn zu überrollen scheinen. Er sei, bekräftigt er, «ein Mensch, der moralische Prinzipien vertritt». Deshalb werde er auch sein Ehrenwort gegenüber dem Sammler nicht brechen – auch wenn sich dieser inzwischen von ihm distanziert habe, «da er meine Vermittlungsversuche bereits als ihm zu wenig zugetan empfand».'
  }]
}, {
  _id: '5bffcc4ed89cbc027d502b70',
  url: 'https://www.nzz.ch/wirtschaft/patriotismus-macht-die-smartphones-teurer-ein-handelsstreit-ist-gar-nicht-so-einfach-ld.1439845',
  flag: '',
  primaryCategory: 'Wirtschaft',
  subCategories: [''],
  pageType: 'reportage',
  title: '«Trump-Phone»: Was Smartphones «made in the USA» kosten würden',
  lead: 'Der von Donald Trump angefachte Handelsstreit soll dazu führen, dass wieder mehr Industrieprodukte in den USA hergestellt werden. Doch was würde zum Beispiel ein iPhone von Apple kosten, das nur in den Vereinigten Staaten gefertigt worden wäre?',
  author: 'Haluka Maier-Borst, Anja Lemcke, Gerald Hosp',
  datePublished: new Date('2018-11-29T05:45:00.000Z'),
  dateUpdated: new Date('2018-11-29T09:50:38.773Z'),
  dateScraped: new Date('2018-11-29T12:23:58.550Z'),
  language: 'de-CH',
  outlet: 'NZZ',
  image: 'https://img.nzz.ch/C=W2240,H1176,X0,Y42/S=W1200M,H630M/O=75/C=AR1200x630/https://nzz-img.s3.amazonaws.com/2018/11/28/169e7b36-b5df-4b00-be74-a8222b4a85bc.png',
  body: [{
    type: 'text',
    text: '«Design von Apple in Kalifornien, gefertigt in China.» Dieser Hinweis steht millionenfach auf den Gehäusen der iPhones des US-Unternehmens Apple und ist ein Sinnbild dafür, dass China über die Jahrzehnte zur Werkbank der Welt aufgestiegen ist. Einer, dem dies schon seit längerem sauer aufstösst, ist der amerikanische Präsident Donald Trump.'
  }, {
    type: 'text',
    text: 'Bereits in seinem früheren Leben als Immobilientycoon hatte Trump gewettert, dass die USA vom Rest der Welt ausgenützt würden. Als Präsident hat er nun einen Handelsstreit gegen China angefacht und bereits rund die Hälfte des Volumens der chinesischen Exporte in die USA mit Zusatzzöllen belegt. Dadurch soll es teurer werden, in China zu produzieren, und dies wiederum soll dazu führen, dass Jobs zurück in die USA kommen.'
  }, {
    type: 'text',
    text: 'Es gibt viele Wenn und Aber bei dieser Idee. Doch jenseits aller berechtigten Einwände – was würde es für die Konsumenten in den USA bedeuten, wenn man die Smartphones von Apple wirklich getreu dem Motto «America first» herstellte?'
  }, {
    type: 'text',
    text: 'Der Finanzanalytiker Sundeep Gantori von der Grossbank UBS hat errechnet, was passieren würde, wenn man die Produktion des iPhone Schritt für Schritt aus dem Ausland in die USA verlagerte. Auf der Basis dieser Analyse hat die NZZ mit Gantoris Hilfe drei Varianten eines «Trump-Phone» zusammengestellt und jede der drei Varianten nach folgenden Kriterien aufgeschlüsselt:'
  }, {
    type: 'text',
    text: 'Die drei Versionen eines «Trump-Phone» sehen wie folgt aus, wenn man davon ausgeht, dass die Produktionsanteile in den USA gegen null laufen und vorwiegend in China produziert wird (was eine vereinfachende Annahme ist):'
  }, {
    type: 'subtitle',
    text: 'Das Trump-Phone light'
  }, {
    type: 'subtitle',
    text: 'Nur das Nötigste wird in Amerika produziert'
  }, {
    type: 'text',
    text: 'Laut Gantori wäre diese Variante schon heute denkbar. «Ein Produkt zu verpacken oder das Betriebssystem draufzuspielen – beides ist keine Hexerei», sagt der UBS-Experte. Tatsächlich würde eine Verlagerung dieser einfachen Tätigkeiten dazu führen, dass ein Trump-Phone um 10% teurer würde, was dem Preis eines derzeitigen iPhone entsprechen würde, auf das heute ein Zoll von 10% erhoben wird.'
  }, {
    type: 'text',
    text: 'Für die Überlegungen muss eingeschränkt werden, dass Washington zwar Importe aus China mit Zusatzzöllen belegen kann. Die Regierung kann aber mit diesem Instrument allein die Unternehmen nicht dazu zwingen, in den USA zu produzieren. Eine Möglichkeit für Apple-Zulieferer wäre es, ausserhalb von China in Ländern fertigen zu lassen, die keine Zollnachteile haben. Trotz gestiegenen Arbeitskosten in China hatte es aber bisher noch keine grössere Abwanderung aus dem Reich der Mitte gegeben, weil chinesische Cluster an Produzenten und Lieferanten in engster Umgebung für Kostenvorteile gesorgt haben. Mit höheren US-Zöllen könnte sich dies ändern.'
  }, {
    type: 'subtitle',
    text: 'Das Trump-Phone basic'
  }, {
    type: 'subtitle',
    text: 'Denkbare Option, wenn der Handelsstreit weiter eskaliert'
  }, {
    type: 'text',
    text: 'Diese Variante eines iPhone käme dann zustande, wenn Trump seine Drohungen wahr machte und die Zölle für chinesische Importe wie das iPhone von derzeit 10 auf 25% erhöhte. Allerdings würde Apple immer noch 1 bis 2 Jahre benötigen, um die Produktion in diesem Ausmass zu amerikanisieren.'
  }, {
    type: 'text',
    text: 'Einfache Arbeitsschritte und die Herstellung simpler Teile könnten relativ schnell verlagert werden. Bei komplizierteren Komponenten sieht es schon anders aus. Fraglich ist, wie rasch Zulieferunternehmen eine amerikanische Fertigung aufbauen oder ob sie zunächst nach anderen Möglichkeiten ausserhalb der USA suchen würden. Es ist auch anzunehmen, dass die Anzahl der Arbeitsplätze, die neu entstünden, am Anfang eher gering wäre. Ausserdem wäre wohl wegen relativ hoher Arbeitskosten in den USA die Automatisierung in der Produktion ausgeprägt.'
  }, {
    type: 'subtitle',
    text: 'Das Trump-Phone Patriot'
  }, {
    type: 'subtitle',
    text: 'Zu teuer, zu spät auf dem Markt – nur etwas für echte Patrioten'
  }, {
    type: 'text',
    text: 'Ein komplett amerikanisches Trump-Phone wird wohl ein Traum bleiben. Erstens wäre ein vollständig in den USA hergestelltes Smartphone deutlich teurer als selbst ein in China gefertigtes, das mit einem Zoll von 25% belegt wird.'
  }, {
    type: 'text',
    text: 'Zweitens fehlt in den USA derzeit schlichtweg das Know-how für viele Produktionsprozesse. «Handykameras zu bauen, das ist eine hohe Kunst, und es hat Jahre gebraucht, diese Spezialistenarbeit in China in einem industriellen Massstab umzusetzen», sagt Gantori. Es sei illusorisch, zu glauben, dass man eine Handykamera so einfach auch in den USA produzieren könne. Drei bis vier Jahre würde es mindestens dauern, komplexe Arbeitsstufen des Produktionsprozesses zurück in die USA zu bringen.'
  }, {
    type: 'text',
    text: 'Das Beispiel iPhone zeigt den Vorteil von Handel auf: Durch die internationale Arbeitsteilung lassen sich Güter kostengünstiger herstellen. Unfaire Handelspraktiken sollten angeprangert werden. Ein Handelsstreit mit Strafzöllen ist dafür der falsche Weg.'
  }]
}];
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"surveys.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/fixtures/surveys.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  SURVEYS: () => SURVEYS
});
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }

}, 0);
let EXPERIMENT;
module.link("./experiments", {
  EXPERIMENT(v) {
    EXPERIMENT = v;
  }

}, 1);
const from = Random.id();
const QUESTIONS = [{
  _id: Random.id(),
  text: 'Menschen in der Schweiz werden immer älter. Soll das Rentenalter darum weiter erhöht werden?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Welcher der folgenden in der Bundesversammlung vertretenen Parteien fühlen Sie sich am nächsten? Bitte wählen Sie eine Partei.',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Bürgerlich-Demokratische Partei (BDP)',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Christlichdemokratische Volkspartei (CVP)',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Christlichsoziale Partei Obwalden (CSP)',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Evangelische Volkspartei (EVP)',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'FDP. Die Liberalen (FDP)',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Grüne Partei der Schweiz (GPS)',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Grünliberale Partei (GLP)',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Lega dei Ticinesi (Lega)',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Mouvement citoyens romands/genevois (MCR/MCG)',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Partei der Arbeit der Schweiz (PdA/POP)',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Schweizerische Volkspartei (SVP)',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Sozialdemokratische Partei der Schweiz (SP)',
    value: 0.25
  }],
  randomOrder: true
}, {
  _id: Random.id(),
  text: 'Soll der Staat Menschen in Armut stärker unterstützen (Ausbau der Sozialhilfe)?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Sollen die Kosten für die Krankenversicherung an das Einkommen angepasst werden (Gutverdienende müssten mehr zahlen)?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Sollen junge Arbeitslose durch den Staat stärker unterstützt werden?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Soll ein Mindestlohn von 4\'000 Franken für alle Arbeitnehmer/-innen eingeführt werden?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Sollen Geschäfte ihre Öffnungszeiten selber festlegen dürfen (Liberalisierung der Ladenöffnungszeiten)?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Sollen die Steuern für Reiche erhöht werden?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Sollen Firmen weniger Steuern bezahlen?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Sollen in der Schweiz neue Atomkraftwerke gebaut werden dürfen?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Soll der Staat mehr Geld für den Ausbau des öffentlichen Verkehrs (Bahn, Bus, Tram) und weniger Geld für den Privatverkehr (Strassenbau) aufwenden?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Ist die Schweiz gegenüber Asylbewerbern/-innen zu grosszügig?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Sollen öffentliche Orte vermehrt mit Video überwacht werden?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Soll die Polizei Sprayer/-innen und Randalierer/-innen strikter verfolgen und härter bestrafen?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Soll die Schweizer Armee abgeschafft werden?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Sollen vermehrt Personenkontrollen an der Schweizer Grenze durchgeführt werden?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Ja',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher ja',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Eher nein',
    value: 0.5
  }, {
    _id: Random.id(),
    text: 'Nein',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Wie häufig nutzen Sie typischerweise Nachrichten? Mit Nachrichten meinen wir nationale, internationale, regionale/lokale Nachrichten und andere Ereignisse, die über diverse Plattformen genutzt werden können (Radio, Fernsehen, Zeitung oder Online).',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Mehr als 10 Mal pro Tag',
    value: 1
  }, {
    _id: Random.id(),
    text: 'Zwischen 6 und 10 Mal pro Tag',
    value: 2
  }, {
    _id: Random.id(),
    text: 'Zwischen 2 und 5 Mal pro Tag',
    value: 3
  }, {
    _id: Random.id(),
    text: 'Einmal am Tag',
    value: 4
  }, {
    _id: Random.id(),
    text: '4 bis 6 Tage pro Woche',
    value: 5
  }, {
    _id: Random.id(),
    text: '2 bis 3 Tage pro Woche',
    value: 6
  }, {
    _id: Random.id(),
    text: 'Einmal pro Woche',
    value: 7
  }, {
    _id: Random.id(),
    text: 'Weniger als einmal pro Woche',
    value: 8
  }, {
    _id: Random.id(),
    text: 'Weniger als einmal pro Monat',
    value: 9
  }, {
    _id: Random.id(),
    text: 'Nie',
    value: 0
  }, {
    _id: Random.id(),
    text: 'Weiss nicht/keine Angabe',
    value: -1
  }]
}, {
  _id: Random.id(),
  text: 'Wie interessiert sind Sie Ihrer Ansicht nach an Nachrichten?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Extrem interessiert',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Sehr interessiert',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Etwas interessiert',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Nicht sehr interessiert',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Überhaupt nicht interessiert',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Weiss nicht/keine Angabe',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Wie interessiert sind Sie Ihrer Ansicht nach an politischen Nachrichten?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Extrem interessiert',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Sehr interessiert',
    value: 0.75
  }, {
    _id: Random.id(),
    text: 'Etwas interessiert',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Nicht sehr interessiert',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Überhaupt nicht interessiert',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Weiss nicht/keine Angabe',
    value: 0.25
  }]
}, {
  _id: Random.id(),
  text: 'Manchmal werden Parteien und PolitikerInnen mit «links», «rechts» und «Mitte» beschrieben. (Generell werden sozialistische Parteien als «links» betrachtet, während konservative Parteien als «rechts» beschrieben werden.) Wie würden Sie sich vor diesem Hintergrund auf der folgenden Skala einordnen?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [{
    _id: Random.id(),
    text: 'Sehr links',
    value: 1.0
  }, {
    _id: Random.id(),
    text: 'Eher links',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Etwas links von der Mitte',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Mitte',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Etwas rechts von der Mitte',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Eher rechts',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Sehr rechts',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Weiss nicht/keine Angabe',
    value: 0.25
  }]
}, {
  _id: from,
  text: 'Welche der folgenden Medien haben Sie letzte Woche als Nachrichtenquelle genutzt? Bitte wählen Sie alles aus, was zutrifft.',
  type: 'selection',
  minSelect: 1,
  maxSelect: 0,
  answers: [{
    _id: Random.id(),
    text: '20 Minuten / 20 minutes',
    value: 0.25
  }, {
    _id: Random.id(),
    text: '24heures',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Aargauer Zeitung ',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Basler Zeitung ',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Berner Zeitung',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Blick',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Blick am Abend',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'bluewin.ch',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'gmx.ch',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Le Matin/Le Matin dimanche',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Le Nouvelliste',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Le Temps',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Luzerner Zeitung',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'MSN News',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'NZZ',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Privatfernsehen',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Privatradio',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'SonntagsZeitung',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'SRF / RTS ',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'St. Galler Tagblatt',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'TagesAnzeiger',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Tribune de Genève',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'watson.ch',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Weltwoche',
    value: 0.25
  }, {
    _id: Random.id(),
    text: 'Yahoo News',
    value: 0.25
  }],
  canBeSkipped: true,
  skipAnswerText: 'Keine Angabe',
  skipAnswerValue: 0,
  hasOtherOption: true,
  otherAnswerText: 'Sonstiges, und zwar: _______',
  otherAnswerValue: -1
}, {
  _id: Random.id(),
  text: 'Sie haben angegeben, dass Sie diese Nachrichtenquellen letzte Woche genutzt haben. Was würden Sie sagen, welche davon ist Ihre HAUPT-Quelle für Nachrichten?',
  type: 'selection',
  minSelect: 1,
  maxSelect: 1,
  answers: [],
  selectionsFrom: {
    _id: from,
    index: 20,
    value: from,
    label: '21 - Welche der folgenden Medien haben Sie letzte Woche als Nachrichtenquelle genutzt? Bitte wählen Sie alles aus, was zutrifft.'
  },
  withAtLeast: 2
}, {
  _id: Random.id(),
  text: 'Auf welche dieser Medien, die Sie letzte Woche verwendet haben, haben Sie per App auf Ihrem Smartphone zugegriffen?',
  type: 'selection',
  minSelect: 0,
  maxSelect: 0,
  canBeSkipped: true,
  skipAnswerText: 'Keine Angabe',
  skipAnswerValue: 0,
  answers: [],
  selectionsFrom: {
    _id: from,
    index: 20,
    value: from,
    label: '21 - Welche der folgenden Medien haben Sie letzte Woche als Nachrichtenquelle genutzt? Bitte wählen Sie alles aus, was zutrifft.'
  },
  withAtLeast: 1
}];
const SURVEYS = [{
  _id: 'default-survey-fixture-id',
  name: 'Default Fixture Survey',
  createdAt: new Date(),
  createdBy: 'System',
  isActive: true,
  questions: QUESTIONS,
  experiment: EXPERIMENT._id
}];
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/index.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("./fixtures");
module.link("./configs");
module.link("../../api/archive");
module.link("../../api/articles");
module.link("../../api/articleViews");
module.link("../../api/readingList");
module.link("../../api/surveys");
module.link("../../api/answers");
module.link("../../api/signins");
module.link("../../api/pageViews");
module.link("../../api/user");
module.link("../../api/articleLikes");
module.link("../../api/experiments");
module.link("../../api/explanations");
module.link("../../api/videoAnalytics");
module.link("../../api/podcastAnalytics");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"ui":{"components":{"experiments":{"LaunchConfirmationModal.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/experiments/LaunchConfirmationModal.jsx                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => LaunchConfirmationModal
});
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let PropTypes;
module.link("prop-types", {
  default(v) {
    PropTypes = v;
  }

}, 1);
let ConfirmationModal;
module.link("../../elements/modal/ConfirmationModal", {
  default(v) {
    ConfirmationModal = v;
  }

}, 2);
let ModalHead;
module.link("../../elements/modal/ModalHead", {
  default(v) {
    ModalHead = v;
  }

}, 3);
let ModalBody;
module.link("../../elements/modal/ModalBody", {
  default(v) {
    ModalBody = v;
  }

}, 4);
let ModalFoot;
module.link("../../elements/modal/ModalFoot", {
  default(v) {
    ModalFoot = v;
  }

}, 5);
let Button;
module.link("../../elements/Button", {
  default(v) {
    Button = v;
  }

}, 6);
let FaIcon;
module.link("../../elements/FaIcon", {
  default(v) {
    FaIcon = v;
  }

}, 7);

function LaunchConfirmationModal(_ref) {
  let {
    isShown,
    cancel,
    confirm
  } = _ref;
  return /*#__PURE__*/React.createElement(ConfirmationModal, {
    isShown: isShown
  }, /*#__PURE__*/React.createElement(ModalHead, null, "Confirmation Required"), /*#__PURE__*/React.createElement(ModalBody, null, /*#__PURE__*/React.createElement("p", null, "Are you sure you want to launch this experiment?"), /*#__PURE__*/React.createElement("p", null, "Following actions can not be done after launching:"), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, "\u2192 Reversing the experiment back to the design phase"), /*#__PURE__*/React.createElement("li", null, "\u2192 Adding additional users"), /*#__PURE__*/React.createElement("li", null, "\u2192 Editing survey questions"), /*#__PURE__*/React.createElement("li", null, "\u2192 Editing feedback surveys"))), /*#__PURE__*/React.createElement(ModalFoot, null, /*#__PURE__*/React.createElement("div", {
    className: "columns is-pulled-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "column is-narrow"
  }, /*#__PURE__*/React.createElement(Button, {
    flat: true,
    onClick: cancel
  }, "Cancel")), /*#__PURE__*/React.createElement("div", {
    className: "column is-narrow"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: confirm
  }, "Launch experiment")))));
}

LaunchConfirmationModal.propTypes = {
  isShown: PropTypes.bool.isRequired,
  cancel: PropTypes.func.isRequired,
  confirm: PropTypes.func.isRequired
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"elements":{"modal":{"ConfirmationModal.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/elements/modal/ConfirmationModal.jsx                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => ConfirmationModal
});
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let PropTypes;
module.link("prop-types", {
  default(v) {
    PropTypes = v;
  }

}, 1);
let Transition;
module.link("react-transition-group", {
  Transition(v) {
    Transition = v;
  }

}, 2);
let Mounter;
module.link("../Mounter", {
  default(v) {
    Mounter = v;
  }

}, 3);
let Modal;
module.link("./Modal", {
  default(v) {
    Modal = v;
  }

}, 4);

function ConfirmationModal(_ref) {
  let {
    isShown,
    children
  } = _ref;
  return /*#__PURE__*/React.createElement(Transition, {
    in: isShown,
    timeout: {
      enter: 0,
      exit: 300,
      appear: 0
    },
    unmountOnExit: true
  }, state => {
    switch (state) {
      case 'entering':
      case 'entered':
      case 'exiting':
      case 'exited':
        return /*#__PURE__*/React.createElement(Mounter, null, /*#__PURE__*/React.createElement("div", {
          className: "confirmationModal-container confirmationModal-container--".concat(state)
        }, /*#__PURE__*/React.createElement(Modal, {
          className: "confirmationModal"
        }, isShown ? children : null)));

      default:
        return null;
    }
  });
}

ConfirmationModal.propTypes = {
  isShown: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Modal.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/elements/modal/Modal.jsx                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => Modal
});
let React, Component;
module.link("react", {
  default(v) {
    React = v;
  },

  Component(v) {
    Component = v;
  }

}, 0);
let PropTypes;
module.link("prop-types", {
  default(v) {
    PropTypes = v;
  }

}, 1);
let classNames;
module.link("../../../lib/utils/utils", {
  classNames(v) {
    classNames = v;
  }

}, 2);

class Modal extends Component {
  constructor(props) {
    super(props);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    const {
      closeModal
    } = this.props;

    if (closeModal) {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }

  componentWillUnmount() {
    const {
      closeModal
    } = this.props;

    if (closeModal) {
      document.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  get modalClassNames() {
    const {
      className,
      centered
    } = this.props;
    const classes = {
      "custom-modal": true,
      'custom-modal--is-centered': !!centered
    };
    return "".concat(classNames(classes), " ").concat(className);
  }

  get escButton() {
    const {
      closeModal
    } = this.props;
    return /*#__PURE__*/React.createElement("a", {
      className: "custom-button button--grey--inverted esc-button--hero",
      onClick: closeModal
    }, "esc");
  }

  handleKeyDown(event) {
    const {
      closeModal
    } = this.props;
    const ESCAPE_KEY = 27;

    switch (event.keyCode) {
      case ESCAPE_KEY:
        closeModal();
        break;

      default:
        break;
    }
  }

  render() {
    const {
      closeModal,
      children
    } = this.props;
    return /*#__PURE__*/React.createElement("div", {
      className: this.modalClassNames
    }, closeModal ? this.escButton : null, children);
  }

}

Modal.defaultProps = {
  children: /*#__PURE__*/React.createElement(React.Fragment, null),
  centered: false,
  className: '',
  closeModal: null
};
Modal.propTypes = {
  children: PropTypes.node,
  centered: PropTypes.bool,
  className: PropTypes.string,
  closeModal: PropTypes.func
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ModalBody.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/elements/modal/ModalBody.jsx                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => ModalBody
});
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let PropTypes;
module.link("prop-types", {
  default(v) {
    PropTypes = v;
  }

}, 1);

function ModalBody(_ref) {
  let {
    className,
    children
  } = _ref;
  const classes = "custom-modal__body ".concat(className);
  return /*#__PURE__*/React.createElement("div", {
    className: classes
  }, children);
}

ModalBody.defaultProps = {
  className: ''
};
ModalBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ModalFoot.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/elements/modal/ModalFoot.jsx                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => ModalFoot
});
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let PropTypes;
module.link("prop-types", {
  default(v) {
    PropTypes = v;
  }

}, 1);

function ModalFoot(_ref) {
  let {
    className,
    children
  } = _ref;
  const classes = "custom-modal__foot ".concat(className);
  return /*#__PURE__*/React.createElement("div", {
    className: classes
  }, children);
}

ModalFoot.defaultProps = {
  className: ''
};
ModalFoot.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ModalHead.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/elements/modal/ModalHead.jsx                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => ModalHead
});
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let PropTypes;
module.link("prop-types", {
  default(v) {
    PropTypes = v;
  }

}, 1);

function ModalHead(_ref) {
  let {
    className,
    children
  } = _ref;
  const classes = "custom-modal__head ".concat(className);
  return /*#__PURE__*/React.createElement("div", {
    className: classes
  }, children);
}

ModalHead.defaultProps = {
  className: ''
};
ModalHead.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"Button.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/elements/Button.jsx                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _extends;

module.link("@babel/runtime/helpers/extends", {
  default(v) {
    _extends = v;
  }

}, 0);

let _objectWithoutProperties;

module.link("@babel/runtime/helpers/objectWithoutProperties", {
  default(v) {
    _objectWithoutProperties = v;
  }

}, 1);
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let PropTypes;
module.link("prop-types", {
  default(v) {
    PropTypes = v;
  }

}, 1);
let classNames;
module.link("../../lib/utils/utils", {
  classNames(v) {
    classNames = v;
  }

}, 2);
const Button = /*#__PURE__*/React.forwardRef((_ref, ref) => {
  let {
    circle,
    children,
    flat,
    href,
    onClick,
    round,
    text,
    iconWithLink,
    className,
    type
  } = _ref,
      props = _objectWithoutProperties(_ref, ["circle", "children", "flat", "href", "onClick", "round", "text", "iconWithLink", "className", "type"]);

  const buttonClassNames = {
    'custom-button': true,
    'custom-button--circle': circle,
    'custom-button--flat': flat,
    'custom-button--round': round,
    'custom-button--link': text,
    'custom-button--icon-with-link': iconWithLink,
    [className]: true
  };

  if (type) {
    buttonClassNames["custom-button--".concat(type)] = true;
  }

  if (href) {
    return /*#__PURE__*/React.createElement("a", _extends({
      className: classNames(buttonClassNames),
      href: href,
      onClick: onClick,
      ref: ref
    }, props), children);
  }

  return /*#__PURE__*/React.createElement("button", _extends({
    className: classNames(buttonClassNames),
    type: "button",
    onClick: onClick,
    ref: ref
  }, props), children);
});
Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  href: PropTypes.string,
  flat: PropTypes.bool,
  circle: PropTypes.bool,
  round: PropTypes.bool,
  iconWithLink: PropTypes.bool,
  className: PropTypes.string,
  type: PropTypes.string
};
Button.defaultProps = {
  onClick: event => event.preventDefault(),
  href: '',
  circle: false,
  flat: false,
  round: false,
  iconWithLink: false,
  className: '',
  type: ''
};
module.exportDefault(Button);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"FaIcon.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/elements/FaIcon.jsx                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => FaIcon
});
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let PropTypes;
module.link("prop-types", {
  default(v) {
    PropTypes = v;
  }

}, 1);

function FaIcon(_ref) {
  let {
    className,
    icon,
    regular
  } = _ref;
  const iconClass = regular ? 'far' : 'fa';
  return /*#__PURE__*/React.createElement("span", {
    className: "symbol"
  }, /*#__PURE__*/React.createElement("i", {
    className: "".concat(className, " ").concat(iconClass, " fa-").concat(icon)
  }));
}

FaIcon.propTypes = {
  icon: PropTypes.string.isRequired,
  className: PropTypes.string,
  regular: PropTypes.bool
};
FaIcon.defaultProps = {
  className: '',
  regular: false
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Mounter.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/elements/Mounter.jsx                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => Mounter
});
let ReactDOM;
module.link("react-dom", {
  default(v) {
    ReactDOM = v;
  }

}, 0);

function Mounter(_ref) {
  let {
    children
  } = _ref;
  const appRoot = document.getElementById('react-root');
  return /*#__PURE__*/ReactDOM.createPortal(children, appRoot);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"modules":{"experiments":{"Experiment.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/modules/experiments/Experiment.jsx                                                                       //
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
  default: () => Experiment
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let React, Component;
module.link("react", {
  default(v) {
    React = v;
  },

  Component(v) {
    Component = v;
  }

}, 1);
let PropTypes;
module.link("prop-types", {
  default(v) {
    PropTypes = v;
  }

}, 2);
let Module;
module.link("../../layout/Module", {
  default(v) {
    Module = v;
  }

}, 3);
let ModuleSection;
module.link("../../layout/ModuleSection", {
  default(v) {
    ModuleSection = v;
  }

}, 4);
let Button;
module.link("../../elements/Button", {
  default(v) {
    Button = v;
  }

}, 5);
let LaunchConfirmationModal;
module.link("../../components/experiments/LaunchConfirmationModal", {
  default(v) {
    LaunchConfirmationModal = v;
  }

}, 6);

class Experiment extends Component {
  constructor(props) {
    super(props);
    this.state = {
      experiment: props.experiment,
      errorMessage: '',
      isSaving: false,
      wasSaved: false,
      isLaunchConfirmationShown: false
    };
    this.handleSelectExperiment = this.handleSelectExperiment.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLaunch = this.handleLaunch.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSelectExperiment() {
    const selected = Session.get('selectedExperiment');

    if (selected === this.props.experiment._id) {
      Session.set('selectedExperiment', '');
    } else {
      Session.set('selectedExperiment', this.props.experiment._id);
    }
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.type == 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState((_ref) => {
      let {
        experiment
      } = _ref;
      return {
        experiment: _objectSpread(_objectSpread({}, experiment), {}, {
          [name]: value
        })
      };
    });
  }

  handleLaunch() {
    Meteor.call('experiments.launch', this.props.experiment._id, err => {
      if (err) {
        console.error(err);
        this.setState({
          errorMessage: "Something went wrong",
          isSaving: false
        });
        return false;
      }

      this.setState((_ref2) => {
        let {
          experiment
        } = _ref2;
        return {
          experiment: _objectSpread(_objectSpread({}, experiment), {}, {
            testingPhase: false
          }),
          isLaunchConfirmationShown: false
        };
      });
    });
  }

  handleSubmit() {
    const experiment = this.state.experiment;
    this.setState({
      isSaving: true
    });
    Meteor.call('experiments.update', experiment, err => {
      if (err) {
        console.error(err);
        this.setState({
          errorMessage: "Something went wrong",
          isSaving: false
        });
        return false;
      }

      this.setState({
        wasSaved: true,
        isSaving: false
      });
      Meteor.setTimeout(() => {
        this.setState({
          wasSaved: false
        });
      }, 10000);
    });
  }

  get buttonText() {
    const {
      isSaving,
      wasSaved
    } = this.state;

    if (isSaving) {
      return '...saving';
    }

    if (wasSaved) {
      return 'Changes saved!';
    }

    return 'Save changes';
  }

  get experiment() {
    const {
      selected
    } = this.props;
    const selectButtonClasses = "select-experiment is-size-4 is-flex-direction-column " + (selected ? " selected" : "");
    return /*#__PURE__*/React.createElement(ModuleSection, {
      card: true,
      content: true
    }, /*#__PURE__*/React.createElement("div", {
      className: "experiment columns"
    }, /*#__PURE__*/React.createElement("div", {
      className: "column is-two-fifths"
    }, /*#__PURE__*/React.createElement("a", {
      className: selectButtonClasses,
      onClick: this.handleSelectExperiment
    }, selected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, "Selected"), /*#__PURE__*/React.createElement("div", {
      className: "is-size-6"
    }, "Continue in top menu")) : "Click to select this experiment")), /*#__PURE__*/React.createElement("div", {
      className: "column"
    }, /*#__PURE__*/React.createElement("div", {
      className: "columns"
    }, /*#__PURE__*/React.createElement("div", {
      className: "column"
    }, "Name"), /*#__PURE__*/React.createElement("div", {
      className: "column"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      name: "name",
      value: this.state.experiment.name,
      onChange: this.handleInputChange
    }))), /*#__PURE__*/React.createElement("div", {
      className: "columns"
    }, /*#__PURE__*/React.createElement("div", {
      className: "column"
    }, "Status"), /*#__PURE__*/React.createElement("div", {
      className: "column"
    }, this.state.experiment.testingPhase ? "Design" : "Launched")), this.state.errorMessage ? this.errorMessage : null, /*#__PURE__*/React.createElement("div", {
      className: "columns"
    }, /*#__PURE__*/React.createElement("div", {
      className: "column is-narrow"
    }, /*#__PURE__*/React.createElement(Button, {
      onClick: this.handleSubmit,
      type: this.buttonType
    }, this.buttonText)), this.state.experiment.testingPhase && /*#__PURE__*/React.createElement("div", {
      className: "column is-narrow"
    }, /*#__PURE__*/React.createElement(Button, {
      onClick: () => {
        this.setState({
          isLaunchConfirmationShown: true
        });
      }
    }, "Launch"))))));
  }

  render() {
    return /*#__PURE__*/React.createElement(Module, null, this.experiment, /*#__PURE__*/React.createElement(LaunchConfirmationModal, {
      isShown: this.state.isLaunchConfirmationShown,
      cancel: () => {
        this.setState({
          isLaunchConfirmationShown: false
        });
      },
      confirm: this.handleLaunch
    }));
  }

}

Experiment.defaultProps = {
  experiment: {
    name: '',
    testingPhase: false
  }
};
Experiment.propTypes = {
  experiment: PropTypes.object
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"layout":{"Module.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/layout/Module.jsx                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    default: () => Module
  });
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }

  }, 0);
  let PropTypes;
  module1.link("prop-types", {
    default(v) {
      PropTypes = v;
    }

  }, 1);

  function Module(_ref) {
    let {
      children
    } = _ref;
    return /*#__PURE__*/React.createElement("div", {
      className: "module"
    }, children);
  }

  Module.propTypes = {
    children: PropTypes.node.isRequired
  };
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ModuleSection.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/layout/ModuleSection.jsx                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    default: () => ModuleSection
  });
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }

  }, 0);
  let PropTypes;
  module1.link("prop-types", {
    default(v) {
      PropTypes = v;
    }

  }, 1);
  let classNames;
  module1.link("../../lib/utils/utils", {
    classNames(v) {
      classNames = v;
    }

  }, 2);

  function ModuleSection(_ref) {
    let {
      between,
      card,
      content,
      children,
      boxed
    } = _ref;
    const containerClasses = {
      'module-section': true,
      'module-section--between': between
    };
    const contentClasses = {
      'module-section-content': content && !between,
      'module-section-card': card,
      'module-section-card--0': card,
      'module-section--boxed': boxed
    };
    return /*#__PURE__*/React.createElement("div", {
      className: classNames(containerClasses)
    }, /*#__PURE__*/React.createElement("div", {
      className: classNames(contentClasses)
    }, children));
  }

  ModuleSection.defaultProps = {
    between: false,
    card: false,
    content: false,
    boxed: false
  };
  ModuleSection.propTypes = {
    children: PropTypes.node.isRequired,
    between: PropTypes.bool,
    card: PropTypes.bool,
    content: PropTypes.bool,
    boxed: PropTypes.bool
  };
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"server":{"main.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// server/main.js                                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
module.link("../imports/startup/server");
module.link("../imports/api/server/publications");
Meteor.startup(() => {
  if (process.env.MAIL_URL === undefined || process.env.MAIL_URL.length === 0) {
    process.env.MAIL_URL = 'smtp://localhost:25';
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".mjs",
    ".jsx"
  ]
});

var exports = require("/server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9saWIvdXRpbHMvdXRpbHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvbGliL3V0aWxzL3V0aWxzX2FjY291bnQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvbGliL3V0aWxzL3V0aWxzX3N0cmluZy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvc2VydmVyL3B1YmxpY2F0aW9ucy9hcnRpY2xlTGlrZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3NlcnZlci9wdWJsaWNhdGlvbnMvYXJ0aWNsZVRvdGFsTGlrZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3NlcnZlci9wdWJsaWNhdGlvbnMvYXJ0aWNsZVZpZXdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9zZXJ2ZXIvcHVibGljYXRpb25zL2V4cGVyaW1lbnRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9zZXJ2ZXIvcHVibGljYXRpb25zL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9zZXJ2ZXIvcHVibGljYXRpb25zL25ld3NBcnRpY2xlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvc2VydmVyL3B1YmxpY2F0aW9ucy9zdXJ2ZXlzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9zZXJ2ZXIvcHVibGljYXRpb25zL3VzZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2Fuc3dlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2FyY2hpdmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2FydGljbGVMaWtlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYXJ0aWNsZVZpZXdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9hcnRpY2xlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvZXhwZXJpbWVudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2V4cGxhbmF0aW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcGFnZVZpZXdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9wb2RjYXN0QW5hbHl0aWNzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9yZWFkaW5nTGlzdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcmVjb21tZW5kYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9zaWduaW5zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9zdXJ2ZXlzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS91c2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS92aWRlb0FuYWx5dGljcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9jb25maWdzL2NvbmZpZ19hY2NvdW50cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9jb25maWdzL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3N0YXJ0dXAvc2VydmVyL2ZpeHR1cmVzL2V4cGVyaW1lbnRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3N0YXJ0dXAvc2VydmVyL2ZpeHR1cmVzL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3N0YXJ0dXAvc2VydmVyL2ZpeHR1cmVzL25ld3NBcnRpY2xlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9maXh0dXJlcy9zdXJ2ZXlzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3N0YXJ0dXAvc2VydmVyL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3VpL2NvbXBvbmVudHMvZXhwZXJpbWVudHMvTGF1bmNoQ29uZmlybWF0aW9uTW9kYWwuanN4IiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3VpL2VsZW1lbnRzL21vZGFsL0NvbmZpcm1hdGlvbk1vZGFsLmpzeCIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy91aS9lbGVtZW50cy9tb2RhbC9Nb2RhbC5qc3giLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvdWkvZWxlbWVudHMvbW9kYWwvTW9kYWxCb2R5LmpzeCIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy91aS9lbGVtZW50cy9tb2RhbC9Nb2RhbEZvb3QuanN4IiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3VpL2VsZW1lbnRzL21vZGFsL01vZGFsSGVhZC5qc3giLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvdWkvZWxlbWVudHMvQnV0dG9uLmpzeCIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy91aS9lbGVtZW50cy9GYUljb24uanN4IiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3VpL2VsZW1lbnRzL01vdW50ZXIuanN4IiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3VpL21vZHVsZXMvZXhwZXJpbWVudHMvRXhwZXJpbWVudC5qc3giLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvdWkvbGF5b3V0L01vZHVsZS5qc3giLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvdWkvbGF5b3V0L01vZHVsZVNlY3Rpb24uanN4IiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJjbGFzc05hbWVzIiwiYXJlQXJyYXlzRXF1YWwiLCJpcyIsInNoYWxsb3dFcXVhbE9ubHlQcmltaXRpdmVzIiwiZ2V0RXhwZXJpbWVudE5hbWUiLCJFeHBlcmltZW50cyIsImxpbmsiLCJkZWZhdWx0IiwidiIsImFyZ3MiLCJoYXMiLCJPYmplY3QiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNsYXNzZXMiLCJhcmdUeXBlIiwicHVzaCIsIkFycmF5IiwiaXNBcnJheSIsImxlbmd0aCIsImkiLCJhcmciLCJpbm5lciIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwiY2FsbCIsImpvaW4iLCJhbkFycmF5IiwiYW5vdGhlckFycmF5IiwibCIsIngiLCJ5Iiwib2JqQSIsIm9iakIiLCJrZXlzQSIsImtleXNCIiwiRnVuY3Rpb24iLCJleHBlcmltZW50SWQiLCJleHBlcmltZW50IiwiZmluZE9uZSIsIl9pZCIsImZpZWxkcyIsIm5hbWUiLCJ1c2VyRW1haWwiLCJpc0VtYWlsVmVyaWZpZWQiLCJ1c2VySXNJblJvbGUiLCJ1c2VyT3duc0V4cGVyaW1lbnQiLCJ1c2VyT3duc1N1cnZleSIsImhhc0V4cGVyaW1lbnRMYXVuY2hlZCIsIk1ldGVvciIsIlN1cnZleXMiLCJ1c2VyIiwiZW1haWxzIiwiZW1haWwiLCJhZGRyZXNzIiwic29tZSIsImUiLCJ2ZXJpZmllZCIsInJvbGVPclJvbGVzIiwicm9sZXMiLCJyb2xlIiwiaW5kZXhPZiIsImV4cGVyaW1lbnRzIiwibWFwIiwiaW5jbHVkZXMiLCJzdXJ2ZXlJZCIsInN1cnZleSIsInRlc3RpbmdQaGFzZSIsInVuZGVmaW5lZCIsInJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyIsImFTdHJpbmciLCJuZXdTdHJpbmciLCJzdWJzdHIiLCJjaGVjayIsIkFydGljbGVMaWtlcyIsInB1Ymxpc2giLCJhcnRpY2xlSWQiLCJTdHJpbmciLCJ1c2VySWQiLCJjbGVhbkFydGljbGVJZCIsImZpbmQiLCJyZW1vdmVkQXQiLCIkZXhpc3RzIiwic29ydCIsImNyZWF0ZWRBdCIsIkFydGljbGVUb3RhbExpa2VzIiwiQXJ0aWNsZVZpZXdzIiwiX29iamVjdFNwcmVhZCIsIm93bmVkRXhwZXJpbWVudHMiLCIkaW4iLCJhY3RpdmVFeHBlcmltZW50UHVibGljYXRpb24iLCJwYXJ0aWNpcGF0ZXNJbiIsImFjdGl2ZUV4cGVyaW1lbnQiLCJhZGRlZCIsIk1hdGNoIiwiUmVhZGluZ0xpc3QiLCJOZXdzQXJ0aWNsZXMiLCJBcmNoaXZlIiwiUmVjb21tZW5kYXRpb25zIiwiRXhwbGFuYXRpb25zIiwiZGF0ZVB1Ymxpc2hlZCIsImluaXRpYWxpemluZyIsImxpbWl0IiwicmVjb21tZW5kYXRpb25DdXJzb3IiLCJuZXdzQXJ0aWNsZUN1cnNvciIsInJlY29tbWVuZGF0aW9uT2JzZXJ2ZXIiLCJvYnNlcnZlQ2hhbmdlcyIsInJlY29tbWVuZGF0aW9uSWQiLCJkYXRlIiwiRGF0ZSIsImNvdW50IiwibmV3c0FydGljbGVPYnNlcnZlciIsIm9uU3RvcCIsInN0b3AiLCJyZWFkeSIsIm5ld3NBcnRpY2xlc0pvaW5lZFB1YmxpY2F0aW9ucyIsIk51bWJlciIsIk1heWJlIiwiZXhwbGFuYXRpb25UYWdzRGVmIiwibWF4TnJFeHBsYW5hdGlvblRhZ3MiLCJyZWNvbW1lbmRhdGlvbnMiLCJwcmVkaWN0aW9uIiwiZmV0Y2giLCJhcnRpY2xlIiwiZXhwbGFuYXRpb25UYWdzIiwiZXhwbGFuYXRpb25UYWdzSWQiLCJleHBsYW5hdGlvbkFydGljbGUiLCJ0YWciLCJNYXRoIiwibWluIiwiaXNJblJlYWRpbmdMaXN0IiwiaXNJbkFyY2hpdmUiLCJuZXdzQXJ0aWNsZXMiLCJleHBsYW5hdGlvbnNPYnNlcnZlciIsIm9ic2VydmUiLCJkb2N1bWVudCIsImNoYW5nZWQiLCJyZW1vdmVkIiwicmVhZGluZ0xpc3RPYnNlcnZlciIsInJlY29tbWVuZGF0aW9uIiwiYXJjaGl2ZU9ic2VydmVyIiwibmV3c0FydGljbGVzSW5SZWFkaW5nTGlzdFB1YmxpY2F0aW9uIiwibmV3c0FydGljbGVzSW5SZWFkaW5nTGlzdCIsIm5ld3NBcnRpY2xlSWRzIiwiZG9jdW1lbnRJZCIsIm5ld3NBcnRpY2xlc09ic2VydmVyIiwibmV3c0FydGljbGVzSW5BcmNoaXZlUHVibGljYXRpb24iLCJuZXdzQXJ0aWNsZXNJbkFyY2hpdmUiLCJmdXJ0aGVyUmVjb21tZW5kZWROZXdzQXJ0aWNsZXNQdWJsaWNhdGlvbnMiLCJwcmltYXJ5Q2F0ZWdvcnkiLCJjbGVhbklkIiwiJG5lIiwiQW5zd2VycyIsIkVycm9yIiwidW5hbnN3ZXJlZFN1cnZleXNQdWJsaWNhdGlvbiIsImFuc3dlcmVkU3VydmV5c0lkcyIsIiRuaW4iLCJhbnN3ZXJzT2JzZXJ2ZXIiLCJzdXJ2ZXlzT2JzZXJ2ZXIiLCJpZCIsImhhc0Fuc3dlcmVkU3VydmV5IiwidXNlckRhdGFQdWJsaWNhdGlvbiIsInVzZXJzIiwiZnVsbE5hbWUiLCJleHBlcmltZW50c0xpc3QiLCJleHBlcmltZW50c09iamVjdCIsIk1vbmdvIiwiQ29sbGVjdGlvbiIsIm1ldGhvZHMiLCJzdXJ2ZXlBbnN3ZXJzIiwiaW5pdGlhbFN1cnZleSIsInF1ZXN0aW9ucyIsImFuc3dlcnMiLCJhIiwicXVlc3Rpb25JZCIsInF1ZXN0aW9uVGV4dCIsInRleHQiLCJzZWxlY3Rpb25zIiwiaW5zZXJ0IiwiZGF0ZVNjcmFwZWQiLCJhcnRpY2xlUHVibGlzaGVkRGF0ZSIsInVwZGF0ZSIsIiRzZXQiLCJtdWx0aSIsImFydGljbGVRdWVzdGlvbklkIiwiYXJ0aWNsZVRvdGFsTGlrZXNEaXNsaWtlcyIsInF1ZXN0aW9uc0FycmF5IiwiY291bnRzIiwiJGluYyIsIiRwdXNoIiwiY291bnRMaWtlcyIsImNvdW50RGlzbGlrZXMiLCJhcnRpY2xlQW5zd2VyIiwiYXJ0aWNsZUxpa2UiLCJhcnRpY2xlRGlzbGlrZSIsIm5vdyIsInJhd0NvbGxlY3Rpb24iLCJmaW5kQW5kTW9kaWZ5IiwiJHNldE9uSW5zZXJ0IiwiZHVyYXRpb24iLCJtYXhTY3JvbGxlZENvbnRlbnQiLCJ1cGRhdGVkQXQiLCJ2aWV3cyIsInVwc2VydCIsInZpZXciLCJkdXJhdGlvbkluY3JlbWVudCIsIiRtYXgiLCJOZXdzQXJ0aWNsZXNKb2luZWQiLCJOZXdzQXJ0aWNsZXNJblJlYWRpbmdMaXN0IiwiTmV3c0FydGljbGVzSW5BcmNoaXZlIiwiRnVydGhlclJlY29tbWVuZGVkTmV3c0FydGljbGVzIiwiUmFuZG9tIiwiRXhwZXJpbWVudCIsImV4cG9ydERlZmF1bHQiLCJkaXNsaWtlU3VydmV5IiwicXVlc3Rpb24iLCJ2YWx1ZSIsImxpa2VTdXJ2ZXkiLCJhY2Nlc3NMZXZlbCIsInJlbW92ZSIsIkJvb2xlYW4iLCJhbW91bnQiLCJ1c2VyR3JvdXAiLCJJbnRlZ2VyIiwibmV3VXNlciIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJuZXdVc2VySWQiLCJBY2NvdW50cyIsImNyZWF0ZVVzZXIiLCJwbGFpbnRleHRQYXNzd29yZCIsImV4cGxhbmF0aW9uVmlld3MiLCJQYWdlVmlld3MiLCJwYWdlIiwicHJldmlvdXNQYWdlIiwiY3VycmVudFBhcmFtZXRlcnMiLCJwcmV2UGFyYW1ldGVycyIsImN1cnJlbnRQYXJhbWV0ZXJzSGFyZENvcHkiLCJwcmV2UGFyYW1ldGVyc0hhcmRDb3B5IiwicGFyYW1ldGVycyIsIlBvZGNhc3RBbmFseXRpY3MiLCJhY3Rpb24iLCJwb2RjYXN0VGltZXN0YW1wIiwiU2lnbklucyIsIlVuYW5zd2VyZWRTdXJ2ZXlzIiwic3VydmV5TmFtZSIsImNyZWF0ZWRCeSIsImlzQWN0aXZlIiwibWluU2VsZWN0IiwibWF4U2VsZWN0Iiwic3VydmV5UXVlc3Rpb25zIiwibmV3UXVlc3Rpb24iLCJwYXJzZUludCIsImlzTmFOIiwicGFyc2VGbG9hdCIsIndpdGhBdExlYXN0Iiwic2VsZWN0aW9uc0Zyb20iLCJpbmRleCIsImxhYmVsIiwiY2FuQmVTa2lwcGVkIiwic2tpcEFuc3dlclRleHQiLCJza2lwQW5zd2VyVmFsdWUiLCJoYXNPdGhlck9wdGlvbiIsIm90aGVyQW5zd2VyVGV4dCIsIm90aGVyQW5zd2VyVmFsdWUiLCJzZW5kVmVyaWZpY2F0aW9uRW1haWwiLCJwdXNoVG9rZW4iLCJwdXNoTm90aWZpY2F0aW9uVG9rZW4iLCJWaWRlb0FuYWx5dGljcyIsInZpZGVvVGltZXN0YW1wIiwiREVGQVVMVF9VU0VSX1JPTEVTIiwiQURNSU5fUk9MRSIsIkJMT0NLRURfUk9MRSIsIkRFQUNUSVZBVEVEX1JPTEUiLCJMT0NLRURfUk9MRVMiLCJFTUFJTFRFTVBMQVRFU19TSVRFTkFNRSIsIkVNQUlMVEVNUExBVEVTX0ZST00iLCJJU19FTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQiLCJJU19SRUdJU1RSQVRJT05fT1BFTiIsIklTX1NVUlZFWV9SRVFVSVJFRCIsImNvbmZpZyIsImZvcmJpZENsaWVudEFjY291bnRDcmVhdGlvbiIsIm9uTG9naW4iLCJpbmZvIiwib25DcmVhdGVVc2VyIiwib3B0aW9ucyIsInByb2ZpbGUiLCJzY29yZSIsIm5vdGlmaWNhdGlvbiIsImlzVGhlcmVBdExlYXN0T25lQWRtaW4iLCJpc05ld1VzZXJBbkFkbWluIiwidmFsaWRhdGVMb2dpbkF0dGVtcHQiLCJlbWFpbFRlbXBsYXRlcyIsInNpdGVOYW1lIiwiZnJvbSIsInZlcmlmeUVtYWlsIiwic3ViamVjdCIsInJlc2V0UGFzc3dvcmQiLCJ1cmwiLCJ1cmxzIiwidG9rZW4iLCJhYnNvbHV0ZVVybCIsIkVYUEVSSU1FTlQiLCJmZWVkYmFja0VtYWlsIiwidGV4dFNob3J0IiwidGV4dExvbmciLCJ0ZXh0Q29sb3JMaWdodCIsInRleHRDb2xvckRhcmsiLCJiYWNrZ3JvdW5kQ29sb3JMaWdodCIsImJhY2tncm91bmRDb2xvckRhcmsiLCJkZXRhaWxlZEV4cGxhbmF0aW9uIiwibWF4Q2hhcmFjdGVyRXhwbGFuYXRpb25UYWdTaG9ydCIsIm1heE5yRnVydGhlclJlY0FydGljbGVzIiwidG90YWxMaWtlc0Rpc2xpa2VzRW5hYmxlZCIsInByZXZpZXdUaXRsZUxpbmVIZWlnaHQiLCJORVdTX0FSVElDTEVTIiwiU1VSVkVZUyIsIm51bWJlck9mTmV3c0FydGljbGVzSW5EYXRhYmFzZSIsIm4iLCJudW1iZXJPZlN1cnZleXNJbkRhdGFiYXNlIiwicyIsIm51bWJlck9mRXhwZXJpbWVudHNJbkRhdGFiYXNlIiwiZmxhZyIsInN1YkNhdGVnb3JpZXMiLCJwYWdlVHlwZSIsInRpdGxlIiwibGVhZCIsImF1dGhvciIsImRhdGVVcGRhdGVkIiwibGFuZ3VhZ2UiLCJvdXRsZXQiLCJpbWFnZSIsImJvZHkiLCJ0eXBlIiwiUVVFU1RJT05TIiwicmFuZG9tT3JkZXIiLCJMYXVuY2hDb25maXJtYXRpb25Nb2RhbCIsIlJlYWN0IiwiUHJvcFR5cGVzIiwiQ29uZmlybWF0aW9uTW9kYWwiLCJNb2RhbEhlYWQiLCJNb2RhbEJvZHkiLCJNb2RhbEZvb3QiLCJCdXR0b24iLCJGYUljb24iLCJpc1Nob3duIiwiY2FuY2VsIiwiY29uZmlybSIsInByb3BUeXBlcyIsImJvb2wiLCJpc1JlcXVpcmVkIiwiZnVuYyIsIlRyYW5zaXRpb24iLCJNb3VudGVyIiwiTW9kYWwiLCJjaGlsZHJlbiIsImVudGVyIiwiZXhpdCIsImFwcGVhciIsInN0YXRlIiwibm9kZSIsIkNvbXBvbmVudCIsImNvbnN0cnVjdG9yIiwicHJvcHMiLCJoYW5kbGVLZXlEb3duIiwiYmluZCIsImNvbXBvbmVudERpZE1vdW50IiwiY2xvc2VNb2RhbCIsImFkZEV2ZW50TGlzdGVuZXIiLCJjb21wb25lbnRXaWxsVW5tb3VudCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJtb2RhbENsYXNzTmFtZXMiLCJjbGFzc05hbWUiLCJjZW50ZXJlZCIsImVzY0J1dHRvbiIsImV2ZW50IiwiRVNDQVBFX0tFWSIsImtleUNvZGUiLCJyZW5kZXIiLCJkZWZhdWx0UHJvcHMiLCJzdHJpbmciLCJfZXh0ZW5kcyIsIl9vYmplY3RXaXRob3V0UHJvcGVydGllcyIsImZvcndhcmRSZWYiLCJyZWYiLCJjaXJjbGUiLCJmbGF0IiwiaHJlZiIsIm9uQ2xpY2siLCJyb3VuZCIsImljb25XaXRoTGluayIsImJ1dHRvbkNsYXNzTmFtZXMiLCJwcmV2ZW50RGVmYXVsdCIsImljb24iLCJyZWd1bGFyIiwiaWNvbkNsYXNzIiwiUmVhY3RET00iLCJhcHBSb290IiwiZ2V0RWxlbWVudEJ5SWQiLCJjcmVhdGVQb3J0YWwiLCJNb2R1bGUiLCJNb2R1bGVTZWN0aW9uIiwiZXJyb3JNZXNzYWdlIiwiaXNTYXZpbmciLCJ3YXNTYXZlZCIsImlzTGF1bmNoQ29uZmlybWF0aW9uU2hvd24iLCJoYW5kbGVTZWxlY3RFeHBlcmltZW50IiwiaGFuZGxlSW5wdXRDaGFuZ2UiLCJoYW5kbGVMYXVuY2giLCJoYW5kbGVTdWJtaXQiLCJzZWxlY3RlZCIsIlNlc3Npb24iLCJnZXQiLCJzZXQiLCJ0YXJnZXQiLCJjaGVja2VkIiwic2V0U3RhdGUiLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJzZXRUaW1lb3V0IiwiYnV0dG9uVGV4dCIsInNlbGVjdEJ1dHRvbkNsYXNzZXMiLCJidXR0b25UeXBlIiwib2JqZWN0IiwibW9kdWxlMSIsImJldHdlZW4iLCJjYXJkIiwiY29udGVudCIsImJveGVkIiwiY29udGFpbmVyQ2xhc3NlcyIsImNvbnRlbnRDbGFzc2VzIiwic3RhcnR1cCIsInByb2Nlc3MiLCJlbnYiLCJNQUlMX1VSTCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQUEsTUFBTSxDQUFDQyxNQUFQLENBQWM7QUFBQ0MsWUFBVSxFQUFDLE1BQUlBLFVBQWhCO0FBQTJCQyxnQkFBYyxFQUFDLE1BQUlBLGNBQTlDO0FBQTZEQyxJQUFFLEVBQUMsTUFBSUEsRUFBcEU7QUFBdUVDLDRCQUEwQixFQUFDLE1BQUlBLDBCQUF0RztBQUFpSUMsbUJBQWlCLEVBQUMsTUFBSUE7QUFBdkosQ0FBZDtBQUF5TCxJQUFJQyxXQUFKO0FBQWdCUCxNQUFNLENBQUNRLElBQVAsQ0FBWSx1QkFBWixFQUFvQztBQUFDQyxTQUFPLENBQUNDLENBQUQsRUFBRztBQUFDSCxlQUFXLEdBQUNHLENBQVo7QUFBYzs7QUFBMUIsQ0FBcEMsRUFBZ0UsQ0FBaEU7O0FBWWxNLE1BQU1SLFVBQVUsR0FBSVMsSUFBRCxJQUFVO0FBQ2hDLFFBQU1DLEdBQUcsR0FBR0MsTUFBTSxDQUFDQyxTQUFQLENBQWlCQyxjQUE3QjtBQUNBLFFBQU1DLE9BQU8sR0FBRyxFQUFoQjtBQUNBLFFBQU1DLE9BQU8sR0FBRyxPQUFPTixJQUF2Qjs7QUFFQSxNQUFJTSxPQUFPLEtB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UDtBQUFTOztBQUFwQixDQUE1QixFQUFrRCxDQUFsRDtBQUFxRFYsTUFBTSxDQUFDUSxJQUFQLENBQVksMkJBQVo7QUFBeUNSLE1BQU0sQ0FBQ1EsSUFBUCxDQUFZLG9DQUFaO0FBSXpHNEMsTUFBTSxDQUFDK1gsT0FBUCxDQUFlLE1BQU07QUFFakIsTUFBSUMsT0FBTyxDQUFDQyxHQUFSLENBQVlDLFFBQVosS0FBeUIvVyxTQUF6QixJQUFzQzZXLE9BQU8sQ0FBQ0MsR0FBUixDQUFZQyxRQUFaLENBQXFCamEsTUFBckIsS0FBZ0MsQ0FBMUUsRUFBNkU7QUFDekUrWixXQUFPLENBQUNDLEdBQVIsQ0FBWUMsUUFBWixHQUF1QixxQkFBdkI7QUFDSDtBQUVKLENBTkQsRSIsImZpbGUiOiIvYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IEV4cGVyaW1lbnRzIGZyb20gJy4uLy4uL2FwaS9leHBlcmltZW50cyc7XHJcblxyXG4vKipcclxuICogR2l2ZW4gYW4gb2JqZWN0IG9yIGFycmF5IG9mIGNsYXNzIG5hbWVzLCBlLmcuIHsgbmFtZTE6IHRydWUsIG5hbWUyOiBmYWxzZSB9LFxyXG4gKiByZXR1cm5zIHNpbmdsZSBzdHJpbmcgdGhhdCBpbmNsdWRlcyBhbGwgY2xhc3MgbmFtZXMgZm9yIHdoaWNoIHRoZVxyXG4gKiB2YWx1ZSBpbiB0aGUgb2JqZWN0IGlzIHRydWUuXHJcbiAqXHJcbiAqIGlmIHRoZSBvYmplY3QgaXMgdW5kZWZpbmVkLCB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYW4gZW1wdHkgc3RyaW5nLlxyXG4gKlxyXG4gKiBAcGFyYW0gYXJnc1xyXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGNsYXNzTmFtZXMgPSAoYXJncykgPT4ge1xyXG4gICAgY29uc3QgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcclxuICAgIGNvbnN0IGNsYXNzZXMgPSBbXTtcclxuICAgIGNvbnN0IGFyZ1R5cGUgPSB0eXBlb2YgYXJncztcclxuXHJcbiAgICBpZiAoYXJnVHlwZSA9PT0gJ3N0cmluZycgfHwgYXJnVHlwZSA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICBjbGFzc2VzLnB1c2goYXJncyk7XHJcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXJncykgJiYgYXJncy5sZW5ndGgpIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3QgYXJnID0gYXJnc1tpXTtcclxuXHJcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb250aW51ZVxyXG4gICAgICAgICAgICBpZiAoIWFyZykgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbm5lciA9IGNsYXNzTmFtZXMoYXJnKTtcclxuICAgICAgICAgICAgaWYgKGlubmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjbGFzc2VzLnB1c2goaW5uZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIGlmIChhcmdUeXBlID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIE9iamVjdC5rZXlzKGFyZ3MpLmZvckVhY2goKGtleSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoaGFzLmNhbGwoYXJncywga2V5KSAmJiBhcmdzW2tleV0pIHtcclxuICAgICAgICAgICAgICAgIGNsYXNzZXMucHVzaChrZXkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdpdmVuIHR3byBhcnJheXMsIHRlc3RzIHdoZXRoZXIgYWxsIGVsZW1lbnRzIGluc2lkZSB0aGUgYXJyYXlzIGFyZVxyXG4gKiBlcXVhbCBhbmQgcmV0dXJucyB0cnVlIGlmIHRoZXkgYXJlLiBPdGhlcndpc2UgaXQgcmV0dXJucyBmYWxzZS5cclxuICpcclxuICogTm90aWNlIHRoYXQgdGhpcyBkb2VzIG5vdCBjb21wYXJlIG9iamVjdHMuIElmIHRoZSBhcnJheXMgYXJlIGluZGVlZFxyXG4gKiBpZGVudGljYWwgYnV0IGluY2x1ZGUgYW4gb2JqZWN0LCB0aGlzIGZ1bmN0aW9uIHdpbGwgcmV0dXJuIGZhbHNlLlxyXG4gKlxyXG4gKiBAcGFyYW0gYW5BcnJheVxyXG4gKiBAcGFyYW0gYW5vdGhlckFycmF5XHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGFyZUFycmF5c0VxdWFsID0gKGFuQXJyYXksIGFub3RoZXJBcnJheSkgPT4ge1xyXG4gICAgaWYgKCFhbkFycmF5IHx8ICFhbm90aGVyQXJyYXkpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICBpZiAoYW5BcnJheS5sZW5ndGggIT09IGFub3RoZXJBcnJheS5sZW5ndGgpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IGFuQXJyYXkubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGFuQXJyYXlbaV0gaW5zdGFuY2VvZiBBcnJheSAmJiBhbm90aGVyQXJyYXlbaV0gaW5zdGFuY2VvZiBBcnJheSkge1xyXG4gICAgICAgICAgICBpZiAoIWFyZUFycmF5c0VxdWFsKGFuQXJyYXlbaV0sIGFub3RoZXJBcnJheVtpXSkpIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFuQXJyYXlbaV0gIT09IGFub3RoZXJBcnJheVtpXSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svZmJqcy9ibG9iL21hc3Rlci9wYWNrYWdlcy9mYmpzL3NyYy9jb3JlL3NoYWxsb3dFcXVhbC5qcyNMMjJcclxuZXhwb3J0IGNvbnN0IGlzID0gKHgsIHkpID0+IHtcclxuICAgIC8vIFNhbWVWYWx1ZSBhbGdvcml0aG1cclxuICAgIGlmICh4ID09PSB5KSB7IC8vIFN0ZXBzIDEtNSwgNy0xMFxyXG4gICAgICAgIC8vIFN0ZXBzIDYuYi02LmU6ICswICE9IC0wXHJcbiAgICAgICAgLy8gQWRkZWQgdGhlIG5vbnplcm8geSBjaGVjayB0byBtYWtlIEZsb3cgaGFwcHksIGJ1dCBpdCBpcyByZWR1bmRhbnRcclxuICAgICAgICByZXR1cm4geCAhPT0gMCB8fCB5ICE9PSAwIHx8IDEgLyB4ID09PSAxIC8geTtcclxuICAgIH1cclxuICAgIC8vIFN0ZXAgNi5hOiBOYU4gPT0gTmFOXHJcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tc2VsZi1jb21wYXJlXHJcbiAgICByZXR1cm4geCAhPT0geCAmJiB5ICE9PSB5O1xyXG59O1xyXG5cclxuY29uc3QgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xyXG5cclxuLyoqXHJcbiAqIFNsaWdodGx5IGFkYXB0ZWQgaW1wbGVtZW50YXRpb24gb2Ygc2hhbGxvd0VxdWFsIHRha2VuIGZyb20gcmVhY3QgY29yZS5cclxuICpcclxuICogUGVyZm9ybXMgZXF1YWxpdHkgYnkgaXRlcmF0aW5nIHRocm91Z2ggdGhlIGtleXMgb2YgYW4gb2JqZWN0IGFuZCByZXR1cm5pbmdcclxuICogZmFsc2UgaWYgYW55IGtleSBoYXMgYSB2YWx1ZSB0aGF0IGlzIG5vdCBzdHJpY3RseSBlcXVhbCB0byB0aGUgc2FtZSBrZXkgb2ZcclxuICogdGhlIHNlY29uZCBhcmd1bWVudC4gT25seSBjb21wYXJlcyBzaW1wbGUgdHlwZXMgYW5kIHNraXBzIGFsbCBvYmplY3RzIGFuZFxyXG4gKiBhcnJheXMuXHJcbiAqXHJcbiAqIEBzZWUgcmVhY3QgY29yZSBzcmNcclxuICogICAgICBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svZmJqcy9ibG9iL21hc3Rlci9wYWNrYWdlcy9mYmpzL3NyYy9jb3JlL3NoYWxsb3dFcXVhbC5qcyNMMzktTDY3XHJcbiAqIEBwYXJhbSBvYmpBXHJcbiAqIEBwYXJhbSBvYmpCXHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IHNoYWxsb3dFcXVhbE9ubHlQcmltaXRpdmVzID0gKG9iakEsIG9iakIpID0+IHtcclxuICAgIGlmIChpcyhvYmpBLCBvYmpCKSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eXBlb2Ygb2JqQSAhPT0gJ29iamVjdCcgfHwgb2JqQSA9PT0gbnVsbFxyXG4gICAgICAgIHx8IHR5cGVvZiBvYmpCICE9PSAnb2JqZWN0JyB8fCBvYmpCID09PSBudWxsKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGtleXNBID0gT2JqZWN0LmtleXMob2JqQSk7XHJcbiAgICBjb25zdCBrZXlzQiA9IE9iamVjdC5rZXlzKG9iakIpO1xyXG5cclxuICAgIGlmIChrZXlzQS5sZW5ndGggIT09IGtleXNCLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGtleXNBLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgLy8gaWYgYm90aCBmaWVsZHMgYXJlIGVpdGhlciBvYmplY3RzLCBhcnJheXMgb3IgZnVuY3Rpb25zLCBza2lwIHRoZSBmaWVsZFxyXG4gICAgICAgIGlmICgodHlwZW9mIG9iakFba2V5c0FbaV1dID09PSAnb2JqZWN0J1xyXG4gICAgICAgICAgICAmJiB0eXBlb2Ygb2JqQltrZXlzQltpXV0gPT09ICdvYmplY3QnKVxyXG4gICAgICAgICAgICB8fCAob2JqQVtrZXlzQVtpXV0gaW5zdGFuY2VvZiBBcnJheVxyXG4gICAgICAgICAgICAgICAgJiYgb2JqQltrZXlzQltpXV0gaW5zdGFuY2VvZiBBcnJheSlcclxuICAgICAgICAgICAgfHwgKG9iakFba2V5c0FbaV1dIGluc3RhbmNlb2YgRnVuY3Rpb25cclxuICAgICAgICAgICAgICAgICYmIG9iakJba2V5c0JbaV1dIGluc3RhbmNlb2YgRnVuY3Rpb24pXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb250aW51ZVxyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgICAgIWhhc093blByb3BlcnR5LmNhbGwob2JqQiwga2V5c0FbaV0pXHJcbiAgICAgICAgICAgIHx8ICFpcyhvYmpBW2tleXNBW2ldXSwgb2JqQltrZXlzQVtpXV0pXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgZ2V0RXhwZXJpbWVudE5hbWUgPSAoZXhwZXJpbWVudElkKSA9PiB7XHJcbiAgICBjb25zdCBleHBlcmltZW50ID0gRXhwZXJpbWVudHMuZmluZE9uZSh7IF9pZDogZXhwZXJpbWVudElkIH0sIHsgZmllbGRzOiB7IG5hbWU6IDEgfSB9KTtcclxuXHJcbiAgICBpZiAoZXhwZXJpbWVudCAmJiBleHBlcmltZW50Lm5hbWUpIHtcclxuICAgICAgICByZXR1cm4gZXhwZXJpbWVudC5uYW1lXHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiAnJztcclxufSIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xyXG5pbXBvcnQgeyBTdXJ2ZXlzIH0gZnJvbSAnLi4vLi4vYXBpL3N1cnZleXMnXHJcbmltcG9ydCBFeHBlcmltZW50cyBmcm9tICcuLi8uLi9hcGkvZXhwZXJpbWVudHMnXHJcblxyXG4vKipcclxuICogRm9yIGEgZ2l2ZW4gdXNlciAoc2lnbmVkIGluKSByZXR1cm4gaGlzIGVtYWlsIGFkZHJlc3MuXHJcbiAqIE5vdGljZTogSWYgYSB1c2VyIGhhcyBtdWx0aXBsZSBlbWFpbCBhZGRyZXNzZXMsIHRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgZmlyc3QgZW1haWwgYWRkcmVzcy5cclxuICpcclxuICogQHJldHVybnMge3N0cmluZ31cclxuICovXHJcbmV4cG9ydCBjb25zdCB1c2VyRW1haWwgPSAodXNlciA9IE1ldGVvci51c2VyKCkpID0+IHtcclxuICAgIGlmICghdXNlciB8fCAhdXNlci5lbWFpbHMgfHwgIXVzZXIuZW1haWxzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiAnJztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBlbWFpbCA9IHVzZXIuZW1haWxzWzBdO1xyXG4gICAgcmV0dXJuIGVtYWlsLmFkZHJlc3MgfHwgJyc7XHJcbn07XHJcblxyXG4vKipcclxuICogRm9yIGEgZ2l2ZW4gdXNlciwgcmV0dXJucyB3aGV0aGVyIGF0IGxlYXN0IG9uZSBlbWFpbCBhZGRyZXNzIGlzIHZlcmlmaWVkLlxyXG4gKlxyXG4gKiBAcGFyYW0gdXNlclxyXG4gKiAgICAgICAgICB1c2VyIG9iamVjdDsgZGVmYXVsdCB2YWx1ZSBNZXRlb3IudXNlcigpXHJcbiAqXHJcbiAqIEByZXR1cm5zIHsqfVxyXG4gKiAgICAgICAgICBib29sZWFuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaXNFbWFpbFZlcmlmaWVkID0gKHVzZXIgPSBNZXRlb3IudXNlcigpKSA9PiB7XHJcbiAgICBpZiAoIXVzZXIgfHwgIXVzZXIuZW1haWxzIHx8IHVzZXIuZW1haWxzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdXNlci5lbWFpbHMuc29tZShlID0+IGUudmVyaWZpZWQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgd2hldGhlciB0aGUgZ2l2ZW4gdXNlciBpcyBpbiB0aGUgZ2l2ZW4gcm9sZSBvciBpbiBhbnkgb2ZcclxuICogdGhlIGdpdmVuIHJvbGVzIGlmIHJvbGVPclJvbGVzIGlzIGFuIGFycmF5IG9mIHJvbGVzLlxyXG4gKlxyXG4gKiBAcGFyYW0gdXNlclxyXG4gKiAgICAgICAgICB1c2VyIG9iamVjdCB0byB0ZXN0OyBkZWZhdWx0IHZhbHVlIE1ldGVvci51c2VyKClcclxuICpcclxuICogQHBhcmFtIHJvbGVPclJvbGVzXHJcbiAqICAgICAgICAgIHJvbGUgc3RyaW5nIG9yIGFycmF5IG9mIHJvbGUgc3RyaW5nc1xyXG4gKlxyXG4gKiBAcmV0dXJucyB7Kn1cclxuICogICAgICAgICAgYm9vbGVhbjtcclxuICogICAgICAgICAgdHJ1ZSBpZiB0aGUgdXNlciBpcyBpbiBhbnkgb2YgdGhlIGdpdmVuIHJvbGVzXHJcbiAqICAgICAgICAgIGZhbHNlIG90aGVyd2lzZVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IHVzZXJJc0luUm9sZSA9IChyb2xlT3JSb2xlcywgdXNlciA9IE1ldGVvci51c2VyKCkpID0+IHtcclxuICAgIGlmICghdXNlci5yb2xlcyB8fCB1c2VyLnJvbGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXJvbGVPclJvbGVzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChBcnJheS5pc0FycmF5KHJvbGVPclJvbGVzKSkge1xyXG4gICAgICAgIHJldHVybiByb2xlT3JSb2xlcy5zb21lKHJvbGUgPT4gdXNlcklzSW5Sb2xlKHVzZXIsIHJvbGUpKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdXNlci5yb2xlcy5pbmRleE9mKHJvbGVPclJvbGVzKSAhPT0gLTE7XHJcbn07XHJcblxyXG5cclxuZXhwb3J0IGNvbnN0IHVzZXJPd25zRXhwZXJpbWVudCA9IChleHBlcmltZW50SWQpID0+IHtcclxuICAgIGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcih7IGZpZWxkczogeyBleHBlcmltZW50czogMSB9IH0pO1xyXG5cclxuICAgIGlmICghdXNlciB8fCAhdXNlci5leHBlcmltZW50cykge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBleHBlcmltZW50cyA9IHVzZXIuZXhwZXJpbWVudHMubWFwKGV4cGVyaW1lbnQgPT4gZXhwZXJpbWVudC5leHBlcmltZW50KTtcclxuXHJcbiAgICBpZiAoZXhwZXJpbWVudHMuaW5jbHVkZXMoZXhwZXJpbWVudElkKSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBjb25zdCB1c2VyT3duc1N1cnZleSA9IChzdXJ2ZXlJZCkgPT4ge1xyXG4gICAgY29uc3QgdXNlciA9IE1ldGVvci51c2VyKHsgZmllbGRzOiB7IGV4cGVyaW1lbnRzOiAxIH0gfSk7XHJcblxyXG4gICAgaWYgKCF1c2VyIHx8ICF1c2VyLmV4cGVyaW1lbnRzKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGV4cGVyaW1lbnRzID0gdXNlci5leHBlcmltZW50cy5tYXAoZXhwZXJpbWVudCA9PiBleHBlcmltZW50LmV4cGVyaW1lbnQpO1xyXG4gICAgY29uc3Qgc3VydmV5ID0gU3VydmV5cy5maW5kT25lKHsgX2lkOiBzdXJ2ZXlJZCB9LCB7IGZpZWxkczogeyBleHBlcmltZW50OiAxIH0gfSk7XHJcblxyXG4gICAgaWYgKCFleHBlcmltZW50cyB8fCAhc3VydmV5IHx8ICFleHBlcmltZW50cy5pbmNsdWRlcyhzdXJ2ZXkuZXhwZXJpbWVudCkgKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGNvbnN0IGhhc0V4cGVyaW1lbnRMYXVuY2hlZCA9IChleHBlcmltZW50SWQpID0+IHtcclxuICAgIGNvbnN0IGV4cGVyaW1lbnQgPSBFeHBlcmltZW50cy5maW5kT25lKHsgX2lkOiBleHBlcmltZW50SWQgfSwgeyBmaWVsZHM6IHsgdGVzdGluZ1BoYXNlOiAxIH0gfSk7XHJcblxyXG4gICAgaWYgKCFleHBlcmltZW50IHx8IGV4cGVyaW1lbnQudGVzdGluZ1BoYXNlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuICFleHBlcmltZW50LnRlc3RpbmdQaGFzZTtcclxufSIsIi8qKlxyXG4gKiBGb3IgYSBnaXZlbiBzdHJpbmcsIHJlbW92ZXMgYW55IG51bWJlciBvZiBwcmVmaXhpbmcgbWludXMgc2lnbnMgZnJvbSB0aGUgc3RyaW5nLlxyXG4gKiBlLmcuIFwiLXNvbWVzdHJpbmdcIiAtPiBcInNvbWVzdHJpbmdcIiBhbmQgXCItLS1zb21lc3RyaW5nXCIgLT4gLVwic29tZXN0cmluZ1wiLlxyXG4gKlxyXG4gKiBUaGVyZSBpcyBhIHdlaXJkIGFuZCBhdCB0aGUgdGltZSBvZiB3cml0aW5nIHVuZml4ZWQgZXJyb3IgaW4gcmVhY3QtbmF0aXZlLW1ldGVvclxyXG4gKiBhbmQvb3IgbWluaW1vbmdvLWNhY2hlIHdoZXJlIGEgbWludXMgc2lnbiBpcyBhZGRlZCB0byB0aGUgX2lkIG9mIGEgZG9jdW1lbnQgd2hlblxyXG4gKiB1c2luZyBhIGN1c3RvbSBwdWJsaWNhdGlvbiAod2l0aCB0aGlzLmFkZGVkKS4gVGhhdCBtaW51cyBzaWduIGlzIG9ubHkgYWRkZWQgdG8gdGhlXHJcbiAqIGxvY2FsIGRvY3VtZW50cyBpbiB0aGUgZHJpdmVyIHRob3VnaCBhbmQgcXVlcnlpbmcgZm9yIHRoZSBpZCBpbmNsdWRpbmcgdGhlIG1pbnVzXHJcbiAqIHNpZ24gd2lsbCBsZWFkIHRvIGFuIGVycm9yIG9uIHRoZSBzZXJ2ZXIuIFRoZXJlZm9yZSB3ZSB1c2UgdGhpcyBmdW5jdGlvbiB0byBnZXQgcmlkXHJcbiAqIG9mIHRoYXQgbWludXMgc2lnbi5cclxuICpcclxuICpcclxuICogaHR0cHM6Ly9naXRodWIuY29tL2luUHJvZ3Jlc3MtdGVhbS9yZWFjdC1uYXRpdmUtbWV0ZW9yL2lzc3Vlcy8xODVcclxuICpcclxuICogQHNlZSBNZXRlb3IubWV0aG9kXHJcbiAqICAgICAgICAgICdyZWFkaW5nTGlzdC5hcnRpY2xlLmFkZCdcclxuICogQHNlZSBNZXRlb3IubWV0aG9kXHJcbiAqICAgICAgICAgICdyZWFkaW5nTGlzdC5hcnRpY2xlLnJlbW92ZSdcclxuICpcclxuICogQHBhcmFtIGFTdHJpbmdcclxuICpcclxuICogQHJldHVybnMgeyp9XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nID0gKGFTdHJpbmcpID0+IHtcclxuICAgIGlmIChhU3RyaW5nLmluZGV4T2YoJy0nKSA9PT0gMCkge1xyXG4gICAgICAgIGNvbnN0IG5ld1N0cmluZyA9IGFTdHJpbmcuc3Vic3RyKDEsIGFTdHJpbmcubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgcmV0dXJuIHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhuZXdTdHJpbmcpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFTdHJpbmc7XHJcbn07XHJcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xyXG5pbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjayc7XHJcbmltcG9ydCB7IEFydGljbGVMaWtlcyB9IGZyb20gJy4uLy4uL2FydGljbGVMaWtlcyc7XHJcbmltcG9ydCB7IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyB9IGZyb20gJy4uLy4uLy4uL2xpYi91dGlscy91dGlsc19zdHJpbmcnO1xyXG5cclxuTWV0ZW9yLnB1Ymxpc2goJ2FydGljbGVMaWtlcycsIChhcnRpY2xlSWQpID0+IHtcclxuICAgIGNoZWNrKGFydGljbGVJZCwgU3RyaW5nKTtcclxuICAgIGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcclxuICAgIGlmICghdXNlcklkKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBjb25zdCBjbGVhbkFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhhcnRpY2xlSWQpO1xyXG4gICAgcmV0dXJuIEFydGljbGVMaWtlcy5maW5kKFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgYXJ0aWNsZUlkOiBjbGVhbkFydGljbGVJZCxcclxuICAgICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgICByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgc29ydDogeyBjcmVhdGVkQXQ6IC0xIH0sXHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxufSk7XHJcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xyXG5pbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjayc7XHJcbmltcG9ydCB7IEFydGljbGVUb3RhbExpa2VzIH0gZnJvbSAnLi4vLi4vYXJ0aWNsZUxpa2VzJztcclxuaW1wb3J0IHsgcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nIH0gZnJvbSAnLi4vLi4vLi4vbGliL3V0aWxzL3V0aWxzX3N0cmluZyc7XHJcblxyXG5NZXRlb3IucHVibGlzaCgnYXJ0aWNsZVRvdGFsTGlrZXMnLCAoYXJ0aWNsZUlkLCBleHBlcmltZW50SWQpID0+IHtcclxuICAgIGNoZWNrKGFydGljbGVJZCwgU3RyaW5nKTtcclxuICAgIGNoZWNrKGV4cGVyaW1lbnRJZCwgU3RyaW5nKTtcclxuXHJcbiAgICBjb25zdCBjbGVhbkFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhhcnRpY2xlSWQpO1xyXG4gICAgcmV0dXJuIEFydGljbGVUb3RhbExpa2VzLmZpbmQoXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLFxyXG4gICAgICAgICAgICBleHBlcmltZW50SWQsXHJcbiAgICAgICAgfSxcclxuICAgICk7XHJcbn0pO1xyXG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcclxuaW1wb3J0IHsgY2hlY2sgfSBmcm9tICdtZXRlb3IvY2hlY2snO1xyXG5pbXBvcnQgeyBBcnRpY2xlVmlld3MgfSBmcm9tICcuLi8uLi9hcnRpY2xlVmlld3MnO1xyXG5pbXBvcnQgeyByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcgfSBmcm9tICcuLi8uLi8uLi9saWIvdXRpbHMvdXRpbHNfc3RyaW5nJztcclxuXHJcbk1ldGVvci5wdWJsaXNoKCdhcnRpY2xlVmlld3MnLCAoYXJ0aWNsZUlkKSA9PiB7XHJcbiAgICBjaGVjayhhcnRpY2xlSWQsIFN0cmluZyk7XHJcbiAgICBjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XHJcbiAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgY29uc3QgY2xlYW5BcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoYXJ0aWNsZUlkKTtcclxuICAgIHJldHVybiBBcnRpY2xlVmlld3MuZmluZChcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGFydGljbGVJZDogY2xlYW5BcnRpY2xlSWQsXHJcbiAgICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICB9LFxyXG4gICAgKTtcclxufSk7XHJcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgdXNlcklzSW5Sb2xlIH0gZnJvbSAnLi4vLi4vLi4vbGliL3V0aWxzL3V0aWxzX2FjY291bnQnO1xuaW1wb3J0IEV4cGVyaW1lbnRzIGZyb20gJy4uLy4uL2V4cGVyaW1lbnRzJztcblxuTWV0ZW9yLnB1Ymxpc2goJ2V4cGVyaW1lbnRzJywgKCkgPT4ge1xuXG4gICAgY29uc3QgdXNlciA9IE1ldGVvci51c2VyKHsgZmllbGRzOiB7IGV4cGVyaW1lbnRzOiAxIH0gfSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghdXNlcklzSW5Sb2xlKCdhZG1pbicpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG93bmVkRXhwZXJpbWVudHMgPSB1c2VyLmV4cGVyaW1lbnRzLm1hcChleHBlcmltZW50ID0+IGV4cGVyaW1lbnQuZXhwZXJpbWVudCk7XG5cbiAgICByZXR1cm4gRXhwZXJpbWVudHMuZmluZCh7IF9pZDogeyAkaW46IG93bmVkRXhwZXJpbWVudHMgfSB9KTtcbn0pO1xuXG5NZXRlb3IucHVibGlzaCgnYWN0aXZlRXhwZXJpbWVudCcsIGZ1bmN0aW9uIGFjdGl2ZUV4cGVyaW1lbnRQdWJsaWNhdGlvbigpIHtcblxuICAgIGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcih7IGZpZWxkczogeyBwYXJ0aWNpcGF0ZXNJbjogMSB9IH0pO1xuICAgIGlmICghdXNlcikge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBhIHVzZXIgY2FuIHBhcnRpY2lwYXRlIG9ubHkgaW4gYSBzaW5nbGUgZXhwZXJpbWVudFxuICAgIGNvbnN0IGFjdGl2ZUV4cGVyaW1lbnQgPSBFeHBlcmltZW50cy5maW5kT25lKHsgX2lkOiB1c2VyLnBhcnRpY2lwYXRlc0luIH0pO1xuICAgIHRoaXMuYWRkZWQoJ2FjdGl2ZUV4cGVyaW1lbnQnLCBhY3RpdmVFeHBlcmltZW50Ll9pZCwgeyAuLi5hY3RpdmVFeHBlcmltZW50IH0pO1xufSk7XG4iLCJpbXBvcnQgJy4vbmV3c0FydGljbGVzJztcbmltcG9ydCAnLi9zdXJ2ZXlzJztcbmltcG9ydCAnLi91c2VyJztcbmltcG9ydCAnLi9leHBlcmltZW50cyc7XG5pbXBvcnQgJy4vYXJ0aWNsZUxpa2VzJztcbmltcG9ydCAnLi9hcnRpY2xlVmlld3MnO1xuaW1wb3J0ICcuL2FydGljbGVUb3RhbExpa2VzJztcbiIsImltcG9ydCB7IGNoZWNrLCBNYXRjaCB9IGZyb20gJ21ldGVvci9jaGVjayc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFJlYWRpbmdMaXN0IH0gZnJvbSAnLi4vLi4vcmVhZGluZ0xpc3QnO1xuaW1wb3J0IHsgTmV3c0FydGljbGVzIH0gZnJvbSAnLi4vLi4vYXJ0aWNsZXMnO1xuaW1wb3J0IHsgQXJjaGl2ZSB9IGZyb20gJy4uLy4uL2FyY2hpdmUnO1xuaW1wb3J0IHsgcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nIH0gZnJvbSAnLi4vLi4vLi4vbGliL3V0aWxzL3V0aWxzX3N0cmluZyc7XG5pbXBvcnQgeyBSZWNvbW1lbmRhdGlvbnMgfSBmcm9tICcuLi8uLi9yZWNvbW1lbmRhdGlvbnMnO1xuaW1wb3J0IEV4cGVyaW1lbnRzIGZyb20gJy4uLy4uL2V4cGVyaW1lbnRzJztcbmltcG9ydCB7IHVzZXJJc0luUm9sZSB9IGZyb20gJy4uLy4uLy4uL2xpYi91dGlscy91dGlsc19hY2NvdW50JztcbmltcG9ydCB7IEV4cGxhbmF0aW9ucyB9IGZyb20gJy4uLy4uL2V4cGxhbmF0aW9ucyc7XG5cbk1ldGVvci5wdWJsaXNoKCduZXdzQXJ0aWNsZScsIChhcnRpY2xlSWQpID0+IHtcbiAgICBjaGVjayhhcnRpY2xlSWQsIFN0cmluZyk7XG4gICAgcmV0dXJuIE5ld3NBcnRpY2xlcy5maW5kKGFydGljbGVJZCwgeyBzb3J0OiB7IGRhdGVQdWJsaXNoZWQ6IC0xIH0gfSk7XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goJ25vdGlmaWNhdGlvbicsIGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgaW5pdGlhbGl6aW5nID0gdHJ1ZTtcbiAgICBjb25zdCB7IHVzZXJJZCB9ID0gdGhpcztcbiAgICBjb25zdCBsaW1pdCA9IDEwO1xuXG4gICAgY29uc3QgcmVjb21tZW5kYXRpb25DdXJzb3IgPSBSZWNvbW1lbmRhdGlvbnMuZmluZCh7IHVzZXJJZCB9LCB7IHNvcnQ6IHsgY3JlYXRlZEF0OiAtMSB9LCBsaW1pdCB9KTtcbiAgICBjb25zdCBuZXdzQXJ0aWNsZUN1cnNvciA9IE5ld3NBcnRpY2xlcy5maW5kKHt9LCB7IHNvcnQ6IHsgZGF0ZVB1Ymxpc2hlZDogLTEgfSwgbGltaXQgfSk7XG5cbiAgICBjb25zdCByZWNvbW1lbmRhdGlvbk9ic2VydmVyID0gcmVjb21tZW5kYXRpb25DdXJzb3Iub2JzZXJ2ZUNoYW5nZXMoe1xuICAgICAgICBhZGRlZDogKHJlY29tbWVuZGF0aW9uSWQpID0+IHtcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuYWRkZWQoJ25vdGlmaWNhdGlvbicsIHJlY29tbWVuZGF0aW9uSWQsIHsgZGF0ZTogbmV3IERhdGUoKSB9KTtcbiAgICAgICAgfSxcbiAgICB9KTtcblxuICAgIGlmIChyZWNvbW1lbmRhdGlvbkN1cnNvci5jb3VudCgpID09PSAwKSB7XG4gICAgICAgIGNvbnN0IG5ld3NBcnRpY2xlT2JzZXJ2ZXIgPSBuZXdzQXJ0aWNsZUN1cnNvci5vYnNlcnZlQ2hhbmdlcyh7XG4gICAgICAgICAgICBhZGRlZDogKGFydGljbGVJZCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuYWRkZWQoJ25vdGlmaWNhdGlvbicsIGFydGljbGVJZCwgeyBkYXRlOiBuZXcgRGF0ZSgpIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5vblN0b3AoKCkgPT4ge1xuICAgICAgICAgICAgbmV3c0FydGljbGVPYnNlcnZlci5zdG9wKCk7XG4gICAgICAgICAgICByZWNvbW1lbmRhdGlvbk9ic2VydmVyLnN0b3AoKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5vblN0b3AoKCkgPT4ge1xuICAgICAgICAgICAgcmVjb21tZW5kYXRpb25PYnNlcnZlci5zdG9wKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMucmVhZHkoKTtcbiAgICBpbml0aWFsaXppbmcgPSBmYWxzZTtcbn0pO1xuXG4vKipcbiAqIFB1Ymxpc2hlcyBhIGN1cnNvciBmb3IgYWxsIG5ld3MgYXJ0aWNsZXMgaW5jbHVkaW5nIHdoZXRoZXIgdGhleSBhcmUgaW4gdGhlIHJlYWRpbmcgbGlzdFxuICogb2YgdGhlIGN1cnJlbnQgdXNlci4gVGhhdCBpcywgdGhpcyBwdWJsaWNhdGlvbiBwZXJmb3JtcyBhIGpvaW4gYmV0d2VlbiB7QGxpbmsgTmV3c0FydGljbGVzfVxuICogYW5kIHtAbGluayBSZWFkaW5nTGlzdH0gb24gX2lkIGFuZCBhcnRpY2xlSWQgcmVzcGVjdGl2ZWx5LlxuICpcbiAqIEZ1cnRoZXJtb3JlLCB0aGlzIHB1YmxpY2F0aW9uIGluY2x1ZGVzIGNoYW5nZSBvYnNlcnZlcnMgdG8gcmVhY3Qgb24gY2hhbmdlcyBpbiB0aGUgdHdvIGNvbGxlY3Rpb25zXG4gKiBhbmQgcmVzdG9yZSBtZXRlb3IncyByZWFjdGl2aXR5LlxuICovXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW51c2VkLXZhcnNcbk1ldGVvci5wdWJsaXNoKCduZXdzQXJ0aWNsZXNKb2luZWQnLCBmdW5jdGlvbiBuZXdzQXJ0aWNsZXNKb2luZWRQdWJsaWNhdGlvbnMobGltaXQsIGRhdGUpIHtcbiAgICBjaGVjayhsaW1pdCwgTnVtYmVyKTtcbiAgICBjaGVjayhkYXRlLCBNYXRjaC5NYXliZShEYXRlKSk7XG5cbiAgICBsZXQgaW5pdGlhbGl6aW5nID0gdHJ1ZTtcbiAgICBjb25zdCB7IHVzZXJJZCB9ID0gdGhpcztcblxuICAgIGxldCBleHBlcmltZW50O1xuICAgIGxldCB1c2VyID0gTWV0ZW9yLnVzZXIoeyBmaWVsZHM6IHsgcGFydGljaXBhdGVzSW46IDEgfSB9KTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgICAgZXhwZXJpbWVudCA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZXhwZXJpbWVudCA9IEV4cGVyaW1lbnRzLmZpbmRPbmUoeyBfaWQ6IHVzZXIucGFydGljaXBhdGVzSW4gfSk7XG4gICAgfVxuICAgIGlmICghZXhwZXJpbWVudCkge1xuICAgICAgICB1c2VyID0gTWV0ZW9yLnVzZXIoeyBmaWVsZHM6IHsgZXhwZXJpbWVudHM6IDEgfSB9KTtcbiAgICAgICAgaWYgKCF1c2VyIHx8ICF1c2VySXNJblJvbGUoJ2FkbWluJykpIHtcbiAgICAgICAgICAgIGV4cGVyaW1lbnQgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgb3duZWRFeHBlcmltZW50cyA9IHVzZXIuZXhwZXJpbWVudHMubWFwKGV4cGVyaW1lbnQgPT4gZXhwZXJpbWVudC5leHBlcmltZW50KTtcbiAgICAgICAgICAgIGV4cGVyaW1lbnQgPSBFeHBlcmltZW50cy5maW5kT25lKHsgX2lkOiB7ICRpbjogb3duZWRFeHBlcmltZW50cyB9IH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICghZXhwZXJpbWVudCkge1xuICAgICAgICBleHBlcmltZW50ID0ge307XG4gICAgfVxuXG4gICAgbGV0IHsgZXhwbGFuYXRpb25UYWdzRGVmLCBtYXhOckV4cGxhbmF0aW9uVGFncyB9ID0gZXhwZXJpbWVudDtcbiAgICBpZiAoZXhwbGFuYXRpb25UYWdzRGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZXhwbGFuYXRpb25UYWdzRGVmID0ge307XG4gICAgfVxuICAgIGlmIChtYXhOckV4cGxhbmF0aW9uVGFncyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG1heE5yRXhwbGFuYXRpb25UYWdzID0gMDtcbiAgICB9XG5cbiAgICBjb25zdCByZWNvbW1lbmRhdGlvbnMgPSBSZWNvbW1lbmRhdGlvbnMuZmluZCh7IHVzZXJJZCB9LCB7IHNvcnQ6IHsgcHJlZGljdGlvbjogLTEgfSwgbGltaXQgfSkuZmV0Y2goKTtcblxuICAgIGlmIChyZWNvbW1lbmRhdGlvbnMgJiYgcmVjb21tZW5kYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWNvbW1lbmRhdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHsgYXJ0aWNsZUlkLCBwcmVkaWN0aW9uIH0gPSByZWNvbW1lbmRhdGlvbnNbaV07XG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlID0gTmV3c0FydGljbGVzLmZpbmRPbmUoeyBfaWQ6IGFydGljbGVJZCB9KTtcblxuICAgICAgICAgICAgaWYgKCFhcnRpY2xlKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGV4cGxhbmF0aW9uVGFncyA9IEV4cGxhbmF0aW9ucy5maW5kT25lKHtcbiAgICAgICAgICAgICAgICBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLFxuICAgICAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgIH0pIHx8IHt9O1xuICAgICAgICAgICAgbGV0IHsgZXhwbGFuYXRpb25UYWdzSWQgfSA9IGV4cGxhbmF0aW9uVGFncztcbiAgICAgICAgICAgIGlmIChleHBsYW5hdGlvblRhZ3NJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb25UYWdzSWQgPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25BcnRpY2xlID0gW107XG4gICAgICAgICAgICBsZXQga2V5OyBsZXRcbiAgICAgICAgICAgICAgICB0YWc7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZXhwbGFuYXRpb25UYWdzSWQubGVuZ3RoLCBtYXhOckV4cGxhbmF0aW9uVGFncyk7IGkrKykge1xuICAgICAgICAgICAgICAgIGtleSA9IGV4cGxhbmF0aW9uVGFnc0lkW2ldO1xuICAgICAgICAgICAgICAgIHRhZyA9IGV4cGxhbmF0aW9uVGFnc0RlZltrZXldO1xuICAgICAgICAgICAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwbGFuYXRpb25BcnRpY2xlLnB1c2godGFnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGlzSW5SZWFkaW5nTGlzdCA9IFJlYWRpbmdMaXN0LmZpbmRPbmUoe1xuICAgICAgICAgICAgICAgIGFydGljbGVJZDogYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgICAgIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGlzSW5BcmNoaXZlID0gQXJjaGl2ZS5maW5kT25lKHtcbiAgICAgICAgICAgICAgICBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLFxuICAgICAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgICAgICByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLmFkZGVkKCduZXdzQXJ0aWNsZXNKb2luZWQnLCBhcnRpY2xlLl9pZCwge1xuICAgICAgICAgICAgICAgIC4uLmFydGljbGUsXG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb25BcnRpY2xlLFxuICAgICAgICAgICAgICAgIGlzSW5SZWFkaW5nTGlzdDogISFpc0luUmVhZGluZ0xpc3QsXG4gICAgICAgICAgICAgICAgaXNJbkFyY2hpdmU6ICEhaXNJbkFyY2hpdmUsXG4gICAgICAgICAgICAgICAgcHJlZGljdGlvbixcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbmV3c0FydGljbGVzID0gTmV3c0FydGljbGVzLmZpbmQoe30sIHsgc29ydDogeyBkYXRlUHVibGlzaGVkOiAtMSB9LCBsaW1pdCB9KS5mZXRjaCgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5ld3NBcnRpY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZSA9IG5ld3NBcnRpY2xlc1tpXTtcblxuICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25UYWdzID0gRXhwbGFuYXRpb25zLmZpbmRPbmUoe1xuICAgICAgICAgICAgICAgIGFydGljbGVJZDogYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgfSkgfHwge307XG4gICAgICAgICAgICBsZXQgeyBleHBsYW5hdGlvblRhZ3NJZCB9ID0gZXhwbGFuYXRpb25UYWdzO1xuICAgICAgICAgICAgaWYgKGV4cGxhbmF0aW9uVGFnc0lkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvblRhZ3NJZCA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBleHBsYW5hdGlvbkFydGljbGUgPSBbXTtcbiAgICAgICAgICAgIGxldCBrZXk7IGxldFxuICAgICAgICAgICAgICAgIHRhZztcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbihleHBsYW5hdGlvblRhZ3NJZC5sZW5ndGgsIG1heE5yRXhwbGFuYXRpb25UYWdzKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gZXhwbGFuYXRpb25UYWdzSWRbaV07XG4gICAgICAgICAgICAgICAgdGFnID0gZXhwbGFuYXRpb25UYWdzRGVmW2tleV07XG4gICAgICAgICAgICAgICAgaWYgKHRhZykge1xuICAgICAgICAgICAgICAgICAgICBleHBsYW5hdGlvbkFydGljbGUucHVzaCh0YWcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgaXNJblJlYWRpbmdMaXN0ID0gUmVhZGluZ0xpc3QuZmluZE9uZSh7XG4gICAgICAgICAgICAgICAgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgICAgICB1c2VySWQsXG4gICAgICAgICAgICAgICAgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgaXNJbkFyY2hpdmUgPSBBcmNoaXZlLmZpbmRPbmUoe1xuICAgICAgICAgICAgICAgIGFydGljbGVJZDogYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgICAgIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuYWRkZWQoJ25ld3NBcnRpY2xlc0pvaW5lZCcsIGFydGljbGUuX2lkLCB7XG4gICAgICAgICAgICAgICAgLi4uYXJ0aWNsZSxcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvbkFydGljbGUsXG4gICAgICAgICAgICAgICAgaXNJblJlYWRpbmdMaXN0OiAhIWlzSW5SZWFkaW5nTGlzdCxcbiAgICAgICAgICAgICAgICBpc0luQXJjaGl2ZTogISFpc0luQXJjaGl2ZSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBleHBsYW5hdGlvbnNPYnNlcnZlciA9IEV4cGxhbmF0aW9ucy5maW5kKHsgdXNlcklkIH0pLm9ic2VydmUoe1xuXG4gICAgICAgIGFkZGVkOiAoZG9jdW1lbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB7IGV4cGxhbmF0aW9uVGFnc0lkIH0gPSBkb2N1bWVudDtcbiAgICAgICAgICAgIGlmIChleHBsYW5hdGlvblRhZ3NJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb25UYWdzSWQgPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25BcnRpY2xlID0gW107XG4gICAgICAgICAgICBsZXQga2V5OyBsZXRcbiAgICAgICAgICAgICAgICB0YWc7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZXhwbGFuYXRpb25UYWdzSWQubGVuZ3RoLCBtYXhOckV4cGxhbmF0aW9uVGFncyk7IGkrKykge1xuICAgICAgICAgICAgICAgIGtleSA9IGV4cGxhbmF0aW9uVGFnc0lkW2ldO1xuICAgICAgICAgICAgICAgIHRhZyA9IGV4cGxhbmF0aW9uVGFnc0RlZltrZXldO1xuICAgICAgICAgICAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwbGFuYXRpb25BcnRpY2xlLnB1c2godGFnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuY2hhbmdlZCgnbmV3c0FydGljbGVzSm9pbmVkJywgZG9jdW1lbnQuYXJ0aWNsZUlkLCB7IGV4cGxhbmF0aW9uQXJ0aWNsZSB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBjaGFuZ2VkOiAoZG9jdW1lbnQpID0+IHtcbiAgICAgICAgICAgIGxldCB7IGV4cGxhbmF0aW9uVGFnc0lkIH0gPSBkb2N1bWVudDtcbiAgICAgICAgICAgIGlmIChleHBsYW5hdGlvblRhZ3NJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb25UYWdzSWQgPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25BcnRpY2xlID0gW107XG4gICAgICAgICAgICBsZXQga2V5OyBsZXRcbiAgICAgICAgICAgICAgICB0YWc7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZXhwbGFuYXRpb25UYWdzSWQubGVuZ3RoLCBtYXhOckV4cGxhbmF0aW9uVGFncyk7IGkrKykge1xuICAgICAgICAgICAgICAgIGtleSA9IGV4cGxhbmF0aW9uVGFnc0lkW2ldO1xuICAgICAgICAgICAgICAgIHRhZyA9IGV4cGxhbmF0aW9uVGFnc0RlZltrZXldO1xuICAgICAgICAgICAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwbGFuYXRpb25BcnRpY2xlLnB1c2godGFnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhkb2N1bWVudC5hcnRpY2xlSWQpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VkKCduZXdzQXJ0aWNsZXNKb2luZWQnLCBhcnRpY2xlSWQsIHsgZXhwbGFuYXRpb25BcnRpY2xlIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbW92ZWQ6IChmaWVsZHMpID0+IHtcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhmaWVsZHMuYXJ0aWNsZUlkKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlZCgnbmV3c0FydGljbGVzSm9pbmVkJywgYXJ0aWNsZUlkLCB7IGV4cGxhbmF0aW9uQXJ0aWNsZTogW10gfSk7XG4gICAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCByZWFkaW5nTGlzdE9ic2VydmVyID0gUmVhZGluZ0xpc3QuZmluZCh7IHVzZXJJZCB9KS5vYnNlcnZlKHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hlbmV2ZXIgYSBkb2N1bWVudCBpcyBhZGRlZCB0byB7QGxpbmsgUmVhZGluZ0xpc3R9LCB3ZSB1cGRhdGUgdGhlIGRvY3VtZW50IGluXG4gICAgICAgICAqIHRoaXMgcHVibGljYXRpb24gYW5kIHNldCBpc0luUmVhZGluZ0xpc3QgdG8gdHJ1ZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGRvY3VtZW50XG4gICAgICAgICAqICAgICAgICAgIHRoZSBkb2N1bWVudCB0aGF0IHdhcyBhZGRlZFxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGFkZGVkOiAoZG9jdW1lbnQpID0+IHtcbiAgICAgICAgICAgIC8vIEJlZm9yZSBvYnNlcnZlIHJldHVybnMsIGFkZGVkIChvciBhZGRlZEF0KSB3aWxsIGJlIGNhbGxlZCB6ZXJvIG9yIG1vcmUgdGltZXMgdG8gZGVsaXZlclxuICAgICAgICAgICAgLy8gdGhlIGluaXRpYWwgcmVzdWx0cyBvZiB0aGUgcXVlcnkuIFdlIHByZXZlbnQgdGhpcyBieSByZXR1cm5pbmcgZmFsc2UgaWYgd2UgYXJlIHN0aWxsXG4gICAgICAgICAgICAvLyBpbml0aWFsaXppbmcuIE5vdGljZSB0aGF0IHdlIHNldCBpbml0aWFsaXppbmcgdG8gZmFsc2UgYWZ0ZXIgY29tcGxldGluZyB0aGUgZmlyc3Qgc2V0LlxuICAgICAgICAgICAgaWYgKGluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBwaWVjZSBvZiBjb2RlIGhhZCB0byBiZSBpbnNlcnRlZCBvbmx5IGR1ZSB0byBhIE1ldGVvciBwcm9ibGVtLlxuICAgICAgICAgICAgLy8gV0FSTklORzogSVQgSVMgRFVQTElDQVRFRCBBVCBESUZGRVJFTlQgUExBQ0VTIElOIG5ld3NBcnRpY2xlcy5qcy5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyB0aGlzLmNoYW5nZWQgZ2VuZXJhdGVzIGEgTWV0ZW9yIHdhcm5pbmcsIGlmIGEgZG9jdW1lbnQgaXMgbm90IHlldCBpbiB0aGUgY29sbGVjdGlvbiwgaG93ZXZlciB3ZSBzYXkgdGhlXG4gICAgICAgICAgICAvLyBkb2N1bWVudCBoYXMgdG8gYmUgY2hhbmdlZC4gVGhpcyBpcyBub3JtYWwsIGFzIHRoZSBpZCBvZiB0aGUgZG9jdW1lbnQgaXMgbm90IHlldCBpbiB0aGVcbiAgICAgICAgICAgIC8vIGNvbGxlY3Rpb24uIFRvIGF2b2lkIHRoZSB3YXJuaW5nLCB3ZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBkb2N1bWVudCBpcyBhZGRlZCB0byB0aGVcbiAgICAgICAgICAgIC8vIGNvbGxlY3Rpb24sIGJlZm9yZSBhbnkgY2hhbmdlcyB0byBpdCBjYW4gYmUgbWFkZS4gVGhhdCBpcyB3aHkgd2UgdXNlIHRoaXMuYWRkZWQuIElmIHRoZVxuICAgICAgICAgICAgLy8gZG9jdW1lbnQgYWxyZWFkeSBleGlzdHMgaW4gdGhlIGNvbGxlY3Rpb24sIHRoaXMuYWRkZWQgd2lsbCBkbyBub3RoaW5nLlxuXG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoZG9jdW1lbnQuYXJ0aWNsZUlkKTtcbiAgICAgICAgICAgIGNvbnN0IGFydGljbGUgPSBOZXdzQXJ0aWNsZXMuZmluZE9uZSh7IF9pZDogYXJ0aWNsZUlkIH0pO1xuICAgICAgICAgICAgY29uc3QgcmVjb21tZW5kYXRpb24gPSBSZWNvbW1lbmRhdGlvbnMuZmluZE9uZSh7IGFydGljbGVJZCB9KTtcblxuICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25UYWdzID0gRXhwbGFuYXRpb25zLmZpbmRPbmUoeyBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLCB1c2VySWQgfSkgfHwge307XG4gICAgICAgICAgICBsZXQgeyBleHBsYW5hdGlvblRhZ3NJZCB9ID0gZXhwbGFuYXRpb25UYWdzO1xuICAgICAgICAgICAgaWYgKGV4cGxhbmF0aW9uVGFnc0lkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvblRhZ3NJZCA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBleHBsYW5hdGlvbkFydGljbGUgPSBbXTtcbiAgICAgICAgICAgIGxldCBrZXk7IGxldFxuICAgICAgICAgICAgICAgIHRhZztcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbihleHBsYW5hdGlvblRhZ3NJZC5sZW5ndGgsIG1heE5yRXhwbGFuYXRpb25UYWdzKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gZXhwbGFuYXRpb25UYWdzSWRbaV07XG4gICAgICAgICAgICAgICAgdGFnID0gZXhwbGFuYXRpb25UYWdzRGVmW2tleV07XG4gICAgICAgICAgICAgICAgaWYgKHRhZykge1xuICAgICAgICAgICAgICAgICAgICBleHBsYW5hdGlvbkFydGljbGUucHVzaCh0YWcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgaXNJblJlYWRpbmdMaXN0ID0gUmVhZGluZ0xpc3QuZmluZE9uZSh7IGFydGljbGVJZDogYXJ0aWNsZS5faWQsIHVzZXJJZCwgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0gfSk7XG4gICAgICAgICAgICBjb25zdCBpc0luQXJjaGl2ZSA9IEFyY2hpdmUuZmluZE9uZSh7IGFydGljbGVJZDogYXJ0aWNsZS5faWQsIHVzZXJJZCwgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0gfSk7XG5cbiAgICAgICAgICAgIGlmIChyZWNvbW1lbmRhdGlvbikge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkZWQoJ25ld3NBcnRpY2xlc0pvaW5lZCcsIGFydGljbGUuX2lkLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5hcnRpY2xlLCBleHBsYW5hdGlvbkFydGljbGUsIGlzSW5SZWFkaW5nTGlzdDogISFpc0luUmVhZGluZ0xpc3QsIGlzSW5BcmNoaXZlOiAhIWlzSW5BcmNoaXZlLCBwcmVkaWN0aW9uOiByZWNvbW1lbmRhdGlvbi5wcmVkaWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRlZCgnbmV3c0FydGljbGVzSm9pbmVkJywgYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLmFydGljbGUsIGV4cGxhbmF0aW9uQXJ0aWNsZSwgaXNJblJlYWRpbmdMaXN0OiAhIWlzSW5SZWFkaW5nTGlzdCwgaXNJbkFyY2hpdmU6ICEhaXNJbkFyY2hpdmUsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmNoYW5nZWQoJ25ld3NBcnRpY2xlc0pvaW5lZCcsIGFydGljbGUuX2lkLCB7IGlzSW5SZWFkaW5nTGlzdDogdHJ1ZSB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hlbmV2ZXIgYSBkb2N1bWVudCBpbiB7QGxpbmsgUmVhZGluZ0xpc3R9IGlzIGNoYW5nZWQsIHdlIHVwZGF0ZSB0aGUgZG9jdW1lbnRcbiAgICAgICAgICogaW4gdGhpcyBwdWJsaWNhdGlvbiBhbmQgc2V0IGlzSW5SZWFkaW5nTGlzdCBhY2NvcmRpbmdseS5cbiAgICAgICAgICogSWYgYW4gYXJ0aWNsZSBpcyByZW1vdmVkIGZyb20gdGhlIHJlYWRpbmcgbGlzdCwgdGhlIGRvY3VtZW50IGluIHtAbGluayBSZWFkaW5nTGlzdH1cbiAgICAgICAgICogaXMgbm90IHJlbW92ZSBidXQgb25seSB1cGRhdGVkLiBUaGF0IGlzLCBhbiBhcnRpY2xlIHdhcyByZW1vdmVkIGZyb20gdGhlIHJlYWRpbmdcbiAgICAgICAgICogbGlzdCBpZiB0aGUgZG9jdW1lbnQgaW4ge0BsaW5rIFJlYWRpbmdMaXN0fSBoYXMgYSBmaWVsZCBcInJlbW92ZWRBdFwiLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gZG9jdW1lbnRcbiAgICAgICAgICovXG4gICAgICAgIGNoYW5nZWQ6IChkb2N1bWVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50LnJlbW92ZWRBdCkge1xuXG4gICAgICAgICAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBwaWVjZSBvZiBjb2RlIGhhZCB0byBiZSBpbnNlcnRlZCBvbmx5IGR1ZSB0byBhIE1ldGVvciBwcm9ibGVtLlxuICAgICAgICAgICAgICAgIC8vIFdBUk5JTkc6IElUIElTIERVUExJQ0FURUQgQVQgRElGRkVSRU5UIFBMQUNFUyBJTiBuZXdzQXJ0aWNsZXMuanMuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyB0aGlzLmNoYW5nZWQgZ2VuZXJhdGVzIGEgTWV0ZW9yIHdhcm5pbmcsIGlmIGEgZG9jdW1lbnQgaXMgbm90IHlldCBpbiB0aGUgY29sbGVjdGlvbiwgaG93ZXZlciB3ZSBzYXkgdGhlXG4gICAgICAgICAgICAgICAgLy8gZG9jdW1lbnQgaGFzIHRvIGJlIGNoYW5nZWQuIFRoaXMgaXMgbm9ybWFsLCBhcyB0aGUgaWQgb2YgdGhlIGRvY3VtZW50IGlzIG5vdCB5ZXQgaW4gdGhlXG4gICAgICAgICAgICAgICAgLy8gY29sbGVjdGlvbi4gVG8gYXZvaWQgdGhlIHdhcm5pbmcsIHdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIGRvY3VtZW50IGlzIGFkZGVkIHRvIHRoZVxuICAgICAgICAgICAgICAgIC8vIGNvbGxlY3Rpb24sIGJlZm9yZSBhbnkgY2hhbmdlcyB0byBpdCBjYW4gYmUgbWFkZS4gVGhhdCBpcyB3aHkgd2UgdXNlIHRoaXMuYWRkZWQuIElmIHRoZVxuICAgICAgICAgICAgICAgIC8vIGRvY3VtZW50IGFscmVhZHkgZXhpc3RzIGluIHRoZSBjb2xsZWN0aW9uLCB0aGlzLmFkZGVkIHdpbGwgZG8gbm90aGluZy5cblxuICAgICAgICAgICAgICAgIGNvbnN0IGFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhkb2N1bWVudC5hcnRpY2xlSWQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFydGljbGUgPSBOZXdzQXJ0aWNsZXMuZmluZE9uZSh7IF9pZDogYXJ0aWNsZUlkIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29tbWVuZGF0aW9uID0gUmVjb21tZW5kYXRpb25zLmZpbmRPbmUoeyBhcnRpY2xlSWQgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBleHBsYW5hdGlvblRhZ3MgPSBFeHBsYW5hdGlvbnMuZmluZE9uZSh7IGFydGljbGVJZDogYXJ0aWNsZS5faWQsIHVzZXJJZCB9KSB8fCB7fTtcbiAgICAgICAgICAgICAgICBsZXQgeyBleHBsYW5hdGlvblRhZ3NJZCB9ID0gZXhwbGFuYXRpb25UYWdzO1xuICAgICAgICAgICAgICAgIGlmIChleHBsYW5hdGlvblRhZ3NJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uVGFnc0lkID0gW107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25BcnRpY2xlID0gW107XG4gICAgICAgICAgICAgICAgbGV0IGtleTsgbGV0XG4gICAgICAgICAgICAgICAgICAgIHRhZztcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZXhwbGFuYXRpb25UYWdzSWQubGVuZ3RoLCBtYXhOckV4cGxhbmF0aW9uVGFncyk7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBrZXkgPSBleHBsYW5hdGlvblRhZ3NJZFtpXTtcbiAgICAgICAgICAgICAgICAgICAgdGFnID0gZXhwbGFuYXRpb25UYWdzRGVmW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uQXJ0aWNsZS5wdXNoKHRhZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpc0luUmVhZGluZ0xpc3QgPSBSZWFkaW5nTGlzdC5maW5kT25lKHsgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCwgdXNlcklkLCByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0luQXJjaGl2ZSA9IEFyY2hpdmUuZmluZE9uZSh7IGFydGljbGVJZDogYXJ0aWNsZS5faWQsIHVzZXJJZCwgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0gfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVjb21tZW5kYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRlZCgnbmV3c0FydGljbGVzSm9pbmVkJywgYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uYXJ0aWNsZSwgZXhwbGFuYXRpb25BcnRpY2xlLCBpc0luUmVhZGluZ0xpc3Q6ICEhaXNJblJlYWRpbmdMaXN0LCBpc0luQXJjaGl2ZTogISFpc0luQXJjaGl2ZSwgcHJlZGljdGlvbjogcmVjb21tZW5kYXRpb24ucHJlZGljdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkZWQoJ25ld3NBcnRpY2xlc0pvaW5lZCcsIGFydGljbGUuX2lkLFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmFydGljbGUsIGV4cGxhbmF0aW9uQXJ0aWNsZSwgaXNJblJlYWRpbmdMaXN0OiAhIWlzSW5SZWFkaW5nTGlzdCwgaXNJbkFyY2hpdmU6ICEhaXNJbkFyY2hpdmUsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZWQoJ25ld3NBcnRpY2xlc0pvaW5lZCcsIGFydGljbGUuX2lkLCB7IGlzSW5SZWFkaW5nTGlzdDogZmFsc2UgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZW5ldmVyIGEgZG9jdW1lbnQgd2FzIHJlbW92ZWQgaW4ge0BsaW5rIFJlYWRpbmdMaXN0fSwgd2UgdXBkYXRlIHRoZSBkb2N1bWVudCBpblxuICAgICAgICAgKiB0aGlzIHB1YmxpY2F0aW9uIGFuZCBzZXQgaXNJblJlYWRpbmdMaXN0IHRvIGZhbHNlLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gZmllbGRzXG4gICAgICAgICAqICAgICAgICAgIHRoZSBkb2N1bWVudCB0aGF0IHdhcyByZW1vdmVkXG4gICAgICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlZDogKGZpZWxkcykgPT4ge1xuICAgICAgICAgICAgaWYgKGluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBwaWVjZSBvZiBjb2RlIGhhZCB0byBiZSBpbnNlcnRlZCBvbmx5IGR1ZSB0byBhIE1ldGVvciBwcm9ibGVtLlxuICAgICAgICAgICAgLy8gV0FSTklORzogSVQgSVMgRFVQTElDQVRFRCBBVCBESUZGRVJFTlQgUExBQ0VTIElOIG5ld3NBcnRpY2xlcy5qcy5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyB0aGlzLmNoYW5nZWQgZ2VuZXJhdGVzIGEgTWV0ZW9yIHdhcm5pbmcsIGlmIGEgZG9jdW1lbnQgaXMgbm90IHlldCBpbiB0aGUgY29sbGVjdGlvbiwgaG93ZXZlciB3ZSBzYXkgdGhlXG4gICAgICAgICAgICAvLyBkb2N1bWVudCBoYXMgdG8gYmUgY2hhbmdlZC4gVGhpcyBpcyBub3JtYWwsIGFzIHRoZSBpZCBvZiB0aGUgZG9jdW1lbnQgaXMgbm90IHlldCBpbiB0aGVcbiAgICAgICAgICAgIC8vIGNvbGxlY3Rpb24uIFRvIGF2b2lkIHRoZSB3YXJuaW5nLCB3ZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBkb2N1bWVudCBpcyBhZGRlZCB0byB0aGVcbiAgICAgICAgICAgIC8vIGNvbGxlY3Rpb24sIGJlZm9yZSBhbnkgY2hhbmdlcyB0byBpdCBjYW4gYmUgbWFkZS4gVGhhdCBpcyB3aHkgd2UgdXNlIHRoaXMuYWRkZWQuIElmIHRoZVxuICAgICAgICAgICAgLy8gZG9jdW1lbnQgYWxyZWFkeSBleGlzdHMgaW4gdGhlIGNvbGxlY3Rpb24sIHRoaXMuYWRkZWQgd2lsbCBkbyBub3RoaW5nLlxuXG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoZmllbGRzLmFydGljbGVJZCk7XG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlID0gTmV3c0FydGljbGVzLmZpbmRPbmUoeyBfaWQ6IGFydGljbGVJZCB9KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29tbWVuZGF0aW9uID0gUmVjb21tZW5kYXRpb25zLmZpbmRPbmUoeyBhcnRpY2xlSWQgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGV4cGxhbmF0aW9uVGFncyA9IEV4cGxhbmF0aW9ucy5maW5kT25lKHsgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCwgdXNlcklkIH0pIHx8IHt9O1xuICAgICAgICAgICAgbGV0IHsgZXhwbGFuYXRpb25UYWdzSWQgfSA9IGV4cGxhbmF0aW9uVGFncztcbiAgICAgICAgICAgIGlmIChleHBsYW5hdGlvblRhZ3NJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb25UYWdzSWQgPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25BcnRpY2xlID0gW107XG4gICAgICAgICAgICBsZXQga2V5OyBsZXRcbiAgICAgICAgICAgICAgICB0YWc7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZXhwbGFuYXRpb25UYWdzSWQubGVuZ3RoLCBtYXhOckV4cGxhbmF0aW9uVGFncyk7IGkrKykge1xuICAgICAgICAgICAgICAgIGtleSA9IGV4cGxhbmF0aW9uVGFnc0lkW2ldO1xuICAgICAgICAgICAgICAgIHRhZyA9IGV4cGxhbmF0aW9uVGFnc0RlZltrZXldO1xuICAgICAgICAgICAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwbGFuYXRpb25BcnRpY2xlLnB1c2godGFnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGlzSW5SZWFkaW5nTGlzdCA9IFJlYWRpbmdMaXN0LmZpbmRPbmUoeyBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLCB1c2VySWQsIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9IH0pO1xuICAgICAgICAgICAgY29uc3QgaXNJbkFyY2hpdmUgPSBBcmNoaXZlLmZpbmRPbmUoeyBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLCB1c2VySWQsIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9IH0pO1xuXG4gICAgICAgICAgICBpZiAocmVjb21tZW5kYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZGVkKCduZXdzQXJ0aWNsZXNKb2luZWQnLCBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgLi4uYXJ0aWNsZSwgZXhwbGFuYXRpb25BcnRpY2xlLCBpc0luUmVhZGluZ0xpc3Q6ICEhaXNJblJlYWRpbmdMaXN0LCBpc0luQXJjaGl2ZTogISFpc0luQXJjaGl2ZSwgcHJlZGljdGlvbjogcmVjb21tZW5kYXRpb24ucHJlZGljdGlvbixcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkZWQoJ25ld3NBcnRpY2xlc0pvaW5lZCcsIGFydGljbGUuX2lkLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5hcnRpY2xlLCBleHBsYW5hdGlvbkFydGljbGUsIGlzSW5SZWFkaW5nTGlzdDogISFpc0luUmVhZGluZ0xpc3QsIGlzSW5BcmNoaXZlOiAhIWlzSW5BcmNoaXZlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jaGFuZ2VkKCduZXdzQXJ0aWNsZXNKb2luZWQnLCBhcnRpY2xlLl9pZCwgeyBpc0luUmVhZGluZ0xpc3Q6IGZhbHNlIH0pO1xuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXJjaGl2ZU9ic2VydmVyID0gQXJjaGl2ZS5maW5kKHsgdXNlcklkIH0pLm9ic2VydmUoe1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGVuZXZlciBhIGRvY3VtZW50IGlzIGFkZGVkIHRvIHtAbGluayBBcmNoaXZlfSwgd2UgdXBkYXRlIHRoZSBkb2N1bWVudCBpblxuICAgICAgICAgKiB0aGlzIHB1YmxpY2F0aW9uIGFuZCBzZXQgaXNJbkFyY2hpdmUgdG8gdHJ1ZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGRvY3VtZW50XG4gICAgICAgICAqICAgICAgICAgIHRoZSBkb2N1bWVudCB0aGF0IHdhcyBhZGRlZFxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGFkZGVkOiAoZG9jdW1lbnQpID0+IHtcbiAgICAgICAgICAgIC8vIEJlZm9yZSBvYnNlcnZlIHJldHVybnMsIGFkZGVkIChvciBhZGRlZEF0KSB3aWxsIGJlIGNhbGxlZCB6ZXJvIG9yIG1vcmUgdGltZXMgdG8gZGVsaXZlclxuICAgICAgICAgICAgLy8gdGhlIGluaXRpYWwgcmVzdWx0cyBvZiB0aGUgcXVlcnkuIFdlIHByZXZlbnQgdGhpcyBieSByZXR1cm5pbmcgZmFsc2UgaWYgd2UgYXJlIHN0aWxsXG4gICAgICAgICAgICAvLyBpbml0aWFsaXppbmcuIE5vdGljZSB0aGF0IHdlIHNldCBpbml0aWFsaXppbmcgdG8gZmFsc2UgYWZ0ZXIgY29tcGxldGluZyB0aGUgZmlyc3Qgc2V0LlxuICAgICAgICAgICAgaWYgKGluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBwaWVjZSBvZiBjb2RlIGhhZCB0byBiZSBpbnNlcnRlZCBvbmx5IGR1ZSB0byBhIE1ldGVvciBwcm9ibGVtLlxuICAgICAgICAgICAgLy8gV0FSTklORzogSVQgSVMgRFVQTElDQVRFRCBBVCBESUZGRVJFTlQgUExBQ0VTIElOIG5ld3NBcnRpY2xlcy5qcy5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyB0aGlzLmNoYW5nZWQgZ2VuZXJhdGVzIGEgTWV0ZW9yIHdhcm5pbmcsIGlmIGEgZG9jdW1lbnQgaXMgbm90IHlldCBpbiB0aGUgY29sbGVjdGlvbiwgaG93ZXZlciB3ZSBzYXkgdGhlXG4gICAgICAgICAgICAvLyBkb2N1bWVudCBoYXMgdG8gYmUgY2hhbmdlZC4gVGhpcyBpcyBub3JtYWwsIGFzIHRoZSBpZCBvZiB0aGUgZG9jdW1lbnQgaXMgbm90IHlldCBpbiB0aGVcbiAgICAgICAgICAgIC8vIGNvbGxlY3Rpb24uIFRvIGF2b2lkIHRoZSB3YXJuaW5nLCB3ZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBkb2N1bWVudCBpcyBhZGRlZCB0byB0aGVcbiAgICAgICAgICAgIC8vIGNvbGxlY3Rpb24sIGJlZm9yZSBhbnkgY2hhbmdlcyB0byBpdCBjYW4gYmUgbWFkZS4gVGhhdCBpcyB3aHkgd2UgdXNlIHRoaXMuYWRkZWQuIElmIHRoZVxuICAgICAgICAgICAgLy8gZG9jdW1lbnQgYWxyZWFkeSBleGlzdHMgaW4gdGhlIGNvbGxlY3Rpb24sIHRoaXMuYWRkZWQgd2lsbCBkbyBub3RoaW5nLlxuXG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoZG9jdW1lbnQuYXJ0aWNsZUlkKTtcbiAgICAgICAgICAgIGNvbnN0IGFydGljbGUgPSBOZXdzQXJ0aWNsZXMuZmluZE9uZSh7IF9pZDogYXJ0aWNsZUlkIH0pO1xuICAgICAgICAgICAgY29uc3QgcmVjb21tZW5kYXRpb24gPSBSZWNvbW1lbmRhdGlvbnMuZmluZE9uZSh7IGFydGljbGVJZCB9KTtcblxuICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25UYWdzID0gRXhwbGFuYXRpb25zLmZpbmRPbmUoeyBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLCB1c2VySWQgfSkgfHwge307XG4gICAgICAgICAgICBsZXQgeyBleHBsYW5hdGlvblRhZ3NJZCB9ID0gZXhwbGFuYXRpb25UYWdzO1xuICAgICAgICAgICAgaWYgKGV4cGxhbmF0aW9uVGFnc0lkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvblRhZ3NJZCA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBleHBsYW5hdGlvbkFydGljbGUgPSBbXTtcbiAgICAgICAgICAgIGxldCBrZXk7IGxldFxuICAgICAgICAgICAgICAgIHRhZztcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbihleHBsYW5hdGlvblRhZ3NJZC5sZW5ndGgsIG1heE5yRXhwbGFuYXRpb25UYWdzKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gZXhwbGFuYXRpb25UYWdzSWRbaV07XG4gICAgICAgICAgICAgICAgdGFnID0gZXhwbGFuYXRpb25UYWdzRGVmW2tleV07XG4gICAgICAgICAgICAgICAgaWYgKHRhZykge1xuICAgICAgICAgICAgICAgICAgICBleHBsYW5hdGlvbkFydGljbGUucHVzaCh0YWcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgaXNJblJlYWRpbmdMaXN0ID0gUmVhZGluZ0xpc3QuZmluZE9uZSh7IGFydGljbGVJZDogYXJ0aWNsZS5faWQsIHVzZXJJZCwgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0gfSk7XG4gICAgICAgICAgICBjb25zdCBpc0luQXJjaGl2ZSA9IEFyY2hpdmUuZmluZE9uZSh7IGFydGljbGVJZDogYXJ0aWNsZS5faWQsIHVzZXJJZCwgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0gfSk7XG5cbiAgICAgICAgICAgIGlmIChyZWNvbW1lbmRhdGlvbikge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkZWQoJ25ld3NBcnRpY2xlc0pvaW5lZCcsIGFydGljbGUuX2lkLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5hcnRpY2xlLCBleHBsYW5hdGlvbkFydGljbGUsIGlzSW5SZWFkaW5nTGlzdDogISFpc0luUmVhZGluZ0xpc3QsIGlzSW5BcmNoaXZlOiAhIWlzSW5BcmNoaXZlLCBwcmVkaWN0aW9uOiByZWNvbW1lbmRhdGlvbi5wcmVkaWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRlZCgnbmV3c0FydGljbGVzSm9pbmVkJywgYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLmFydGljbGUsIGV4cGxhbmF0aW9uQXJ0aWNsZSwgaXNJblJlYWRpbmdMaXN0OiAhIWlzSW5SZWFkaW5nTGlzdCwgaXNJbkFyY2hpdmU6ICEhaXNJbkFyY2hpdmUsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmNoYW5nZWQoJ25ld3NBcnRpY2xlc0pvaW5lZCcsIGFydGljbGUuX2lkLCB7IGlzSW5BcmNoaXZlOiB0cnVlIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGVuZXZlciBhIGRvY3VtZW50IGluIHtAbGluayBBcmNoaXZlfSBpcyBjaGFuZ2VkLCB3ZSB1cGRhdGUgdGhlIGRvY3VtZW50XG4gICAgICAgICAqIGluIHRoaXMgcHVibGljYXRpb24gYW5kIHNldCBpc0luQXJjaGl2ZSBhY2NvcmRpbmdseS5cbiAgICAgICAgICogSWYgYW4gYXJ0aWNsZSBpcyByZW1vdmVkIGZyb20gdGhlIGFyY2hpdmUsIHRoZSBkb2N1bWVudCBpbiB7QGxpbmsgQXJjaGl2ZX1cbiAgICAgICAgICogaXMgbm90IHJlbW92ZSBidXQgb25seSB1cGRhdGVkLiBUaGF0IGlzLCBhbiBhcnRpY2xlIHdhcyByZW1vdmVkIGZyb20gdGhlXG4gICAgICAgICAqIGFyY2hpdmUgaWYgdGhlIGRvY3VtZW50IGluIHtAbGluayBBcmNoaXZlfSBoYXMgYSBmaWVsZCBcInJlbW92ZWRBdFwiLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gZG9jdW1lbnRcbiAgICAgICAgICovXG4gICAgICAgIGNoYW5nZWQ6IChkb2N1bWVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50LnJlbW92ZWRBdCkge1xuXG4gICAgICAgICAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBwaWVjZSBvZiBjb2RlIGhhZCB0byBiZSBpbnNlcnRlZCBvbmx5IGR1ZSB0byBhIE1ldGVvciBwcm9ibGVtLlxuICAgICAgICAgICAgICAgIC8vIFdBUk5JTkc6IElUIElTIERVUExJQ0FURUQgQVQgRElGRkVSRU5UIFBMQUNFUyBJTiBuZXdzQXJ0aWNsZXMuanMuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyB0aGlzLmNoYW5nZWQgZ2VuZXJhdGVzIGEgTWV0ZW9yIHdhcm5pbmcsIGlmIGEgZG9jdW1lbnQgaXMgbm90IHlldCBpbiB0aGUgY29sbGVjdGlvbiwgaG93ZXZlciB3ZSBzYXkgdGhlXG4gICAgICAgICAgICAgICAgLy8gZG9jdW1lbnQgaGFzIHRvIGJlIGNoYW5nZWQuIFRoaXMgaXMgbm9ybWFsLCBhcyB0aGUgaWQgb2YgdGhlIGRvY3VtZW50IGlzIG5vdCB5ZXQgaW4gdGhlXG4gICAgICAgICAgICAgICAgLy8gY29sbGVjdGlvbi4gVG8gYXZvaWQgdGhlIHdhcm5pbmcsIHdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIGRvY3VtZW50IGlzIGFkZGVkIHRvIHRoZVxuICAgICAgICAgICAgICAgIC8vIGNvbGxlY3Rpb24sIGJlZm9yZSBhbnkgY2hhbmdlcyB0byBpdCBjYW4gYmUgbWFkZS4gVGhhdCBpcyB3aHkgd2UgdXNlIHRoaXMuYWRkZWQuIElmIHRoZVxuICAgICAgICAgICAgICAgIC8vIGRvY3VtZW50IGFscmVhZHkgZXhpc3RzIGluIHRoZSBjb2xsZWN0aW9uLCB0aGlzLmFkZGVkIHdpbGwgZG8gbm90aGluZy5cblxuICAgICAgICAgICAgICAgIGNvbnN0IGFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhkb2N1bWVudC5hcnRpY2xlSWQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFydGljbGUgPSBOZXdzQXJ0aWNsZXMuZmluZE9uZSh7IF9pZDogYXJ0aWNsZUlkIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29tbWVuZGF0aW9uID0gUmVjb21tZW5kYXRpb25zLmZpbmRPbmUoeyBhcnRpY2xlSWQgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBleHBsYW5hdGlvblRhZ3MgPSBFeHBsYW5hdGlvbnMuZmluZE9uZSh7IGFydGljbGVJZDogYXJ0aWNsZS5faWQsIHVzZXJJZCB9KSB8fCB7fTtcbiAgICAgICAgICAgICAgICBsZXQgeyBleHBsYW5hdGlvblRhZ3NJZCB9ID0gZXhwbGFuYXRpb25UYWdzO1xuICAgICAgICAgICAgICAgIGlmIChleHBsYW5hdGlvblRhZ3NJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uVGFnc0lkID0gW107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25BcnRpY2xlID0gW107XG4gICAgICAgICAgICAgICAgbGV0IGtleTsgbGV0XG4gICAgICAgICAgICAgICAgICAgIHRhZztcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZXhwbGFuYXRpb25UYWdzSWQubGVuZ3RoLCBtYXhOckV4cGxhbmF0aW9uVGFncyk7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBrZXkgPSBleHBsYW5hdGlvblRhZ3NJZFtpXTtcbiAgICAgICAgICAgICAgICAgICAgdGFnID0gZXhwbGFuYXRpb25UYWdzRGVmW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uQXJ0aWNsZS5wdXNoKHRhZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpc0luUmVhZGluZ0xpc3QgPSBSZWFkaW5nTGlzdC5maW5kT25lKHsgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCwgdXNlcklkLCByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0luQXJjaGl2ZSA9IEFyY2hpdmUuZmluZE9uZSh7IGFydGljbGVJZDogYXJ0aWNsZS5faWQsIHVzZXJJZCwgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0gfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVjb21tZW5kYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRlZCgnbmV3c0FydGljbGVzSm9pbmVkJywgYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uYXJ0aWNsZSwgZXhwbGFuYXRpb25BcnRpY2xlLCBpc0luUmVhZGluZ0xpc3Q6ICEhaXNJblJlYWRpbmdMaXN0LCBpc0luQXJjaGl2ZTogISFpc0luQXJjaGl2ZSwgcHJlZGljdGlvbjogcmVjb21tZW5kYXRpb24ucHJlZGljdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkZWQoJ25ld3NBcnRpY2xlc0pvaW5lZCcsIGFydGljbGUuX2lkLFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmFydGljbGUsIGV4cGxhbmF0aW9uQXJ0aWNsZSwgaXNJblJlYWRpbmdMaXN0OiAhIWlzSW5SZWFkaW5nTGlzdCwgaXNJbkFyY2hpdmU6ICEhaXNJbkFyY2hpdmUsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZWQoJ25ld3NBcnRpY2xlc0pvaW5lZCcsIGFydGljbGUuX2lkLCB7IGlzSW5BcmNoaXZlOiBmYWxzZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hlbmV2ZXIgYSBkb2N1bWVudCB3YXMgcmVtb3ZlZCBpbiB7QGxpbmsgQXJjaGl2ZX0sIHdlIHVwZGF0ZSB0aGUgZG9jdW1lbnQgaW5cbiAgICAgICAgICogdGhpcyBwdWJsaWNhdGlvbiBhbmQgc2V0IGlzSW5SZWFkaW5nTGlzdCB0byBmYWxzZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGZpZWxkc1xuICAgICAgICAgKiAgICAgICAgICB0aGUgZG9jdW1lbnQgdGhhdCB3YXMgcmVtb3ZlZFxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHJlbW92ZWQ6IChmaWVsZHMpID0+IHtcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgcGllY2Ugb2YgY29kZSBoYWQgdG8gYmUgaW5zZXJ0ZWQgb25seSBkdWUgdG8gYSBNZXRlb3IgcHJvYmxlbS5cbiAgICAgICAgICAgIC8vIFdBUk5JTkc6IElUIElTIERVUExJQ0FURUQgQVQgRElGRkVSRU5UIFBMQUNFUyBJTiBuZXdzQXJ0aWNsZXMuanMuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gdGhpcy5jaGFuZ2VkIGdlbmVyYXRlcyBhIE1ldGVvciB3YXJuaW5nLCBpZiBhIGRvY3VtZW50IGlzIG5vdCB5ZXQgaW4gdGhlIGNvbGxlY3Rpb24sIGhvd2V2ZXIgd2Ugc2F5IHRoZVxuICAgICAgICAgICAgLy8gZG9jdW1lbnQgaGFzIHRvIGJlIGNoYW5nZWQuIFRoaXMgaXMgbm9ybWFsLCBhcyB0aGUgaWQgb2YgdGhlIGRvY3VtZW50IGlzIG5vdCB5ZXQgaW4gdGhlXG4gICAgICAgICAgICAvLyBjb2xsZWN0aW9uLiBUbyBhdm9pZCB0aGUgd2FybmluZywgd2UgbmVlZCB0byBtYWtlIHN1cmUgdGhhdCB0aGUgZG9jdW1lbnQgaXMgYWRkZWQgdG8gdGhlXG4gICAgICAgICAgICAvLyBjb2xsZWN0aW9uLCBiZWZvcmUgYW55IGNoYW5nZXMgdG8gaXQgY2FuIGJlIG1hZGUuIFRoYXQgaXMgd2h5IHdlIHVzZSB0aGlzLmFkZGVkLiBJZiB0aGVcbiAgICAgICAgICAgIC8vIGRvY3VtZW50IGFscmVhZHkgZXhpc3RzIGluIHRoZSBjb2xsZWN0aW9uLCB0aGlzLmFkZGVkIHdpbGwgZG8gbm90aGluZy5cblxuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGZpZWxkcy5hcnRpY2xlSWQpO1xuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZSA9IE5ld3NBcnRpY2xlcy5maW5kT25lKHsgX2lkOiBhcnRpY2xlSWQgfSk7XG4gICAgICAgICAgICBjb25zdCByZWNvbW1lbmRhdGlvbiA9IFJlY29tbWVuZGF0aW9ucy5maW5kT25lKHsgYXJ0aWNsZUlkIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBleHBsYW5hdGlvblRhZ3MgPSBFeHBsYW5hdGlvbnMuZmluZE9uZSh7IGFydGljbGVJZDogYXJ0aWNsZS5faWQsIHVzZXJJZCB9KSB8fCB7fTtcbiAgICAgICAgICAgIGxldCB7IGV4cGxhbmF0aW9uVGFnc0lkIH0gPSBleHBsYW5hdGlvblRhZ3M7XG4gICAgICAgICAgICBpZiAoZXhwbGFuYXRpb25UYWdzSWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uVGFnc0lkID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGV4cGxhbmF0aW9uQXJ0aWNsZSA9IFtdO1xuICAgICAgICAgICAgbGV0IGtleTsgbGV0XG4gICAgICAgICAgICAgICAgdGFnO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKGV4cGxhbmF0aW9uVGFnc0lkLmxlbmd0aCwgbWF4TnJFeHBsYW5hdGlvblRhZ3MpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBleHBsYW5hdGlvblRhZ3NJZFtpXTtcbiAgICAgICAgICAgICAgICB0YWcgPSBleHBsYW5hdGlvblRhZ3NEZWZba2V5XTtcbiAgICAgICAgICAgICAgICBpZiAodGFnKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uQXJ0aWNsZS5wdXNoKHRhZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBpc0luUmVhZGluZ0xpc3QgPSBSZWFkaW5nTGlzdC5maW5kT25lKHsgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCwgdXNlcklkLCByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSB9KTtcbiAgICAgICAgICAgIGNvbnN0IGlzSW5BcmNoaXZlID0gQXJjaGl2ZS5maW5kT25lKHsgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCwgdXNlcklkLCByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSB9KTtcblxuICAgICAgICAgICAgaWYgKHJlY29tbWVuZGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRlZCgnbmV3c0FydGljbGVzSm9pbmVkJywgYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLmFydGljbGUsIGV4cGxhbmF0aW9uQXJ0aWNsZSwgaXNJblJlYWRpbmdMaXN0OiAhIWlzSW5SZWFkaW5nTGlzdCwgaXNJbkFyY2hpdmU6ICEhaXNJbkFyY2hpdmUsIHByZWRpY3Rpb246IHJlY29tbWVuZGF0aW9uLnByZWRpY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZGVkKCduZXdzQXJ0aWNsZXNKb2luZWQnLCBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgLi4uYXJ0aWNsZSwgZXhwbGFuYXRpb25BcnRpY2xlLCBpc0luUmVhZGluZ0xpc3Q6ICEhaXNJblJlYWRpbmdMaXN0LCBpc0luQXJjaGl2ZTogISFpc0luQXJjaGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuY2hhbmdlZCgnbmV3c0FydGljbGVzSm9pbmVkJywgYXJ0aWNsZS5faWQsIHsgaXNJbkFyY2hpdmU6IGZhbHNlIH0pO1xuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFkeSgpO1xuICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xuXG4gICAgdGhpcy5vblN0b3AoKCkgPT4ge1xuICAgICAgICBleHBsYW5hdGlvbnNPYnNlcnZlci5zdG9wKCk7XG4gICAgICAgIHJlYWRpbmdMaXN0T2JzZXJ2ZXIuc3RvcCgpO1xuICAgICAgICBhcmNoaXZlT2JzZXJ2ZXIuc3RvcCgpO1xuICAgIH0pO1xufSk7XG5cblxuLyoqXG4gKiBQdWJsaXNoZXMgYWxsIG5ld3MgYXJ0aWNsZXMgZnJvbSB7QGxpbmsgTmV3c0FydGljbGVzfSBmb3Igd2hpY2ggdGhlcmUgaXMgYW4gZW50cnkgaW4ge0BsaW5rIFJlYWRpbmdMaXN0fS5cbiAqXG4gKiBAcmV0dXJucyB7YW55IHwgTW9uZ28uQ3Vyc29yIHwgbnVtYmVyIHwgVH1cbiAqL1xuTWV0ZW9yLnB1Ymxpc2goJ25ld3NBcnRpY2xlc0luUmVhZGluZ0xpc3QnLCBmdW5jdGlvbiBuZXdzQXJ0aWNsZXNJblJlYWRpbmdMaXN0UHVibGljYXRpb24oKSB7XG4gICAgbGV0IGluaXRpYWxpemluZyA9IHRydWU7XG4gICAgY29uc3QgeyB1c2VySWQgfSA9IHRoaXM7XG5cbiAgICBsZXQgZXhwZXJpbWVudDtcbiAgICBsZXQgdXNlciA9IE1ldGVvci51c2VyKHsgZmllbGRzOiB7IHBhcnRpY2lwYXRlc0luOiAxIH0gfSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICAgIGV4cGVyaW1lbnQgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGV4cGVyaW1lbnQgPSBFeHBlcmltZW50cy5maW5kT25lKHsgX2lkOiB1c2VyLnBhcnRpY2lwYXRlc0luIH0pO1xuICAgIH1cbiAgICBpZiAoIWV4cGVyaW1lbnQpIHtcbiAgICAgICAgdXNlciA9IE1ldGVvci51c2VyKHsgZmllbGRzOiB7IGV4cGVyaW1lbnRzOiAxIH0gfSk7XG4gICAgICAgIGlmICghdXNlciB8fCAhdXNlcklzSW5Sb2xlKCdhZG1pbicpKSB7XG4gICAgICAgICAgICBleHBlcmltZW50ID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG93bmVkRXhwZXJpbWVudHMgPSB1c2VyLmV4cGVyaW1lbnRzLm1hcChleHBlcmltZW50ID0+IGV4cGVyaW1lbnQuZXhwZXJpbWVudCk7XG4gICAgICAgICAgICBleHBlcmltZW50ID0gRXhwZXJpbWVudHMuZmluZE9uZSh7IF9pZDogeyAkaW46IG93bmVkRXhwZXJpbWVudHMgfSB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWV4cGVyaW1lbnQpIHtcbiAgICAgICAgZXhwZXJpbWVudCA9IHt9O1xuICAgIH1cblxuICAgIGxldCB7IGV4cGxhbmF0aW9uVGFnc0RlZiwgbWF4TnJFeHBsYW5hdGlvblRhZ3MgfSA9IGV4cGVyaW1lbnQ7XG4gICAgaWYgKGV4cGxhbmF0aW9uVGFnc0RlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGV4cGxhbmF0aW9uVGFnc0RlZiA9IHt9O1xuICAgIH1cbiAgICBpZiAobWF4TnJFeHBsYW5hdGlvblRhZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtYXhOckV4cGxhbmF0aW9uVGFncyA9IDA7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3c0FydGljbGVzSW5SZWFkaW5nTGlzdCA9IFJlYWRpbmdMaXN0LmZpbmQoeyB1c2VySWQsIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9IH0pLmZldGNoKCk7XG4gICAgY29uc3QgbmV3c0FydGljbGVJZHMgPSBuZXdzQXJ0aWNsZXNJblJlYWRpbmdMaXN0Lm1hcCgoeyBhcnRpY2xlSWQgfSkgPT4gYXJ0aWNsZUlkKTtcbiAgICBjb25zdCBuZXdzQXJ0aWNsZXMgPSBOZXdzQXJ0aWNsZXMuZmluZCh7IF9pZDogeyAkaW46IG5ld3NBcnRpY2xlSWRzIH0gfSkuZmV0Y2goKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmV3c0FydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGFydGljbGUgPSBuZXdzQXJ0aWNsZXNbaV07XG5cbiAgICAgICAgY29uc3QgZXhwbGFuYXRpb25UYWdzID0gRXhwbGFuYXRpb25zLmZpbmRPbmUoe1xuICAgICAgICAgICAgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgfSkgfHwge307XG4gICAgICAgIGxldCB7IGV4cGxhbmF0aW9uVGFnc0lkIH0gPSBleHBsYW5hdGlvblRhZ3M7XG4gICAgICAgIGlmIChleHBsYW5hdGlvblRhZ3NJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBleHBsYW5hdGlvblRhZ3NJZCA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhwbGFuYXRpb25BcnRpY2xlID0gW107XG4gICAgICAgIGxldCBrZXk7IGxldFxuICAgICAgICAgICAgdGFnO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZXhwbGFuYXRpb25UYWdzSWQubGVuZ3RoLCBtYXhOckV4cGxhbmF0aW9uVGFncyk7IGkrKykge1xuICAgICAgICAgICAga2V5ID0gZXhwbGFuYXRpb25UYWdzSWRbaV07XG4gICAgICAgICAgICB0YWcgPSBleHBsYW5hdGlvblRhZ3NEZWZba2V5XTtcbiAgICAgICAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvbkFydGljbGUucHVzaCh0YWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXNJbkFyY2hpdmUgPSBBcmNoaXZlLmZpbmRPbmUoe1xuICAgICAgICAgICAgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9LFxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZGVkKCduZXdzQXJ0aWNsZXNJblJlYWRpbmdMaXN0JywgYXJ0aWNsZS5faWQsIHtcbiAgICAgICAgICAgIC4uLmFydGljbGUsXG4gICAgICAgICAgICBleHBsYW5hdGlvbkFydGljbGUsXG4gICAgICAgICAgICBpc0luUmVhZGluZ0xpc3Q6IHRydWUsXG4gICAgICAgICAgICBpc0luQXJjaGl2ZTogISFpc0luQXJjaGl2ZSxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwbGFuYXRpb25zT2JzZXJ2ZXIgPSBFeHBsYW5hdGlvbnMuZmluZCh7IHVzZXJJZCB9KS5vYnNlcnZlKHtcblxuICAgICAgICBhZGRlZDogKGRvY3VtZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoaW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgeyBleHBsYW5hdGlvblRhZ3NJZCB9ID0gZG9jdW1lbnQ7XG4gICAgICAgICAgICBpZiAoZXhwbGFuYXRpb25UYWdzSWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uVGFnc0lkID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGV4cGxhbmF0aW9uQXJ0aWNsZSA9IFtdO1xuICAgICAgICAgICAgbGV0IGtleTsgbGV0XG4gICAgICAgICAgICAgICAgdGFnO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKGV4cGxhbmF0aW9uVGFnc0lkLmxlbmd0aCwgbWF4TnJFeHBsYW5hdGlvblRhZ3MpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBleHBsYW5hdGlvblRhZ3NJZFtpXTtcbiAgICAgICAgICAgICAgICB0YWcgPSBleHBsYW5hdGlvblRhZ3NEZWZba2V5XTtcbiAgICAgICAgICAgICAgICBpZiAodGFnKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4cGxhbmF0aW9uQXJ0aWNsZS5wdXNoKHRhZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmNoYW5nZWQoJ25ld3NBcnRpY2xlc0luUmVhZGluZ0xpc3QnLCBkb2N1bWVudC5hcnRpY2xlSWQsIHsgZXhwbGFuYXRpb25BcnRpY2xlIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNoYW5nZWQ6IChkb2N1bWVudCkgPT4ge1xuICAgICAgICAgICAgbGV0IHsgZXhwbGFuYXRpb25UYWdzSWQgfSA9IGRvY3VtZW50O1xuICAgICAgICAgICAgaWYgKGV4cGxhbmF0aW9uVGFnc0lkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvblRhZ3NJZCA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBleHBsYW5hdGlvbkFydGljbGUgPSBbXTtcbiAgICAgICAgICAgIGxldCBrZXk7IGxldFxuICAgICAgICAgICAgICAgIHRhZztcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbihleHBsYW5hdGlvblRhZ3NJZC5sZW5ndGgsIG1heE5yRXhwbGFuYXRpb25UYWdzKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gZXhwbGFuYXRpb25UYWdzSWRbaV07XG4gICAgICAgICAgICAgICAgdGFnID0gZXhwbGFuYXRpb25UYWdzRGVmW2tleV07XG4gICAgICAgICAgICAgICAgaWYgKHRhZykge1xuICAgICAgICAgICAgICAgICAgICBleHBsYW5hdGlvbkFydGljbGUucHVzaCh0YWcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGRvY3VtZW50LmFydGljbGVJZCk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZWQoJ25ld3NBcnRpY2xlc0luUmVhZGluZ0xpc3QnLCBhcnRpY2xlSWQsIHsgZXhwbGFuYXRpb25BcnRpY2xlIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbW92ZWQ6IChmaWVsZHMpID0+IHtcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhmaWVsZHMuYXJ0aWNsZUlkKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlZCgnbmV3c0FydGljbGVzSW5SZWFkaW5nTGlzdCcsIGFydGljbGVJZCwgeyBleHBsYW5hdGlvbkFydGljbGU6IFtdIH0pO1xuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVhZGluZ0xpc3RPYnNlcnZlciA9IFJlYWRpbmdMaXN0LmZpbmQoeyB1c2VySWQgfSkub2JzZXJ2ZSh7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZW5ldmVyIGEgZG9jdW1lbnQgaXMgYWRkZWQgdG8ge0BsaW5rIFJlYWRpbmdMaXN0fSwgd2UgYWRkIHRoZSBkb2N1bWVudCBpbiB0aGlzXG4gICAgICAgICAqIHB1YmxpY2F0aW9uIHRvb1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gZG9jdW1lbnRcbiAgICAgICAgICogICAgICAgICAgdGhlIGRvY3VtZW50IHRoYXQgd2FzIGFkZGVkXG4gICAgICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgYWRkZWQ6IChkb2N1bWVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKGluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZSA9IE5ld3NBcnRpY2xlcy5maW5kT25lKGRvY3VtZW50LmFydGljbGVJZCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGlzSW5BcmNoaXZlID0gQXJjaGl2ZS5maW5kT25lKHtcbiAgICAgICAgICAgICAgICBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLFxuICAgICAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgICAgICByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoYXJ0aWNsZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkZWQoJ25ld3NBcnRpY2xlc0luUmVhZGluZ0xpc3QnLCBhcnRpY2xlLl9pZCwge1xuICAgICAgICAgICAgICAgICAgICAuLi5hcnRpY2xlLFxuICAgICAgICAgICAgICAgICAgICBpc0luUmVhZGluZ0xpc3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGlzSW5BcmNoaXZlOiAhIWlzSW5BcmNoaXZlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGNoYW5nZWQ6IChkb2N1bWVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50LnJlbW92ZWRBdCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRvY3VtZW50SWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoZG9jdW1lbnQuYXJ0aWNsZUlkKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZWQoJ25ld3NBcnRpY2xlc0luUmVhZGluZ0xpc3QnLCBkb2N1bWVudElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hlbmV2ZXIgYSBkb2N1bWVudCB3YXMgcmVtb3ZlZCBpbiB7QGxpbmsgUmVhZGluZ0xpc3R9LCB3ZSByZW1vdmUgdGhlIGFydGljbGUgaW4gdGhpc1xuICAgICAgICAgKiBwdWJsaWNhdGlvbiB0b28uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBmaWVsZHNcbiAgICAgICAgICogICAgICAgICAgdGhlIGRvY3VtZW50IHRoYXQgd2FzIHJlbW92ZWRcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVkOiAoZmllbGRzKSA9PiB7XG4gICAgICAgICAgICBpZiAoaW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGZpZWxkcy5hcnRpY2xlSWQpO1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVkKCduZXdzQXJ0aWNsZXNJblJlYWRpbmdMaXN0JywgYXJ0aWNsZUlkKTtcbiAgICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGFyY2hpdmVPYnNlcnZlciA9IEFyY2hpdmUuZmluZCh7IHVzZXJJZCB9KS5vYnNlcnZlKHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hlbmV2ZXIgYSBkb2N1bWVudCBpcyBhZGRlZCB0byB7QGxpbmsgQXJjaGl2ZX0sIHdlIHVwZGF0ZSB0aGUgZG9jdW1lbnQgaW5cbiAgICAgICAgICogdGhpcyBwdWJsaWNhdGlvbiBhbmQgc2V0IGlzSW5BcmNoaXZlIHRvIHRydWUuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBkb2N1bWVudFxuICAgICAgICAgKiAgICAgICAgICB0aGUgZG9jdW1lbnQgdGhhdCB3YXMgYWRkZWRcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICBhZGRlZDogKGRvY3VtZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoaW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlID0gUmVhZGluZ0xpc3QuZmluZE9uZSh7XG4gICAgICAgICAgICAgICAgYXJ0aWNsZUlkOiBkb2N1bWVudC5hcnRpY2xlSWQsXG4gICAgICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgICAgIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChhcnRpY2xlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGRvY3VtZW50LmFydGljbGVJZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkKCduZXdzQXJ0aWNsZXNJblJlYWRpbmdMaXN0JywgYXJ0aWNsZUlkLCB7IGlzSW5BcmNoaXZlOiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGVuZXZlciBhIGRvY3VtZW50IGluIHtAbGluayBBcmNoaXZlfSBpcyBjaGFuZ2VkLCB3ZSB1cGRhdGUgdGhlIGRvY3VtZW50XG4gICAgICAgICAqIGluIHRoaXMgcHVibGljYXRpb24gYW5kIHNldCBpc0luQXJjaGl2ZSBhY2NvcmRpbmdseS5cbiAgICAgICAgICogSWYgYW4gYXJ0aWNsZSBpcyByZW1vdmVkIGZyb20gdGhlIGFyY2hpdmUsIHRoZSBkb2N1bWVudCBpbiB7QGxpbmsgQXJjaGl2ZX1cbiAgICAgICAgICogaXMgbm90IHJlbW92ZSBidXQgb25seSB1cGRhdGVkLiBUaGF0IGlzLCBhbiBhcnRpY2xlIHdhcyByZW1vdmVkIGZyb20gdGhlXG4gICAgICAgICAqIGFyY2hpdmUgaWYgdGhlIGRvY3VtZW50IGluIHtAbGluayBBcmNoaXZlfSBoYXMgYSBmaWVsZCBcInJlbW92ZWRBdFwiLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gZG9jdW1lbnRcbiAgICAgICAgICovXG4gICAgICAgIGNoYW5nZWQ6IChkb2N1bWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZSA9IFJlYWRpbmdMaXN0LmZpbmRPbmUoe1xuICAgICAgICAgICAgICAgIGFydGljbGVJZDogZG9jdW1lbnQuYXJ0aWNsZUlkLFxuICAgICAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgICAgICByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQucmVtb3ZlZEF0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGFydGljbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGRvY3VtZW50LmFydGljbGVJZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlZCgnbmV3c0FydGljbGVzSW5SZWFkaW5nTGlzdCcsIGFydGljbGVJZCwgeyBpc0luQXJjaGl2ZTogZmFsc2UgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGVuZXZlciBhIGRvY3VtZW50IHdhcyByZW1vdmVkIGluIHtAbGluayBBcmNoaXZlfSwgd2UgdXBkYXRlIHRoZSBkb2N1bWVudCBpblxuICAgICAgICAgKiB0aGlzIHB1YmxpY2F0aW9uIGFuZCBzZXQgaXNJbkFyY2hpdmUgdG8gZmFsc2UuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBmaWVsZHNcbiAgICAgICAgICogICAgICAgICAgdGhlIGRvY3VtZW50IHRoYXQgd2FzIHJlbW92ZWRcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVkOiAoZmllbGRzKSA9PiB7XG4gICAgICAgICAgICBpZiAoaW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlID0gUmVhZGluZ0xpc3QuZmluZE9uZSh7XG4gICAgICAgICAgICAgICAgYXJ0aWNsZUlkOiBkb2N1bWVudC5hcnRpY2xlSWQsXG4gICAgICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgICAgIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChhcnRpY2xlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGZpZWxkcy5hcnRpY2xlSWQpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlZCgnbmV3c0FydGljbGVzSW5SZWFkaW5nTGlzdCcsIGFydGljbGVJZCwgeyBpc0luQXJjaGl2ZTogZmFsc2UgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBuZXdzQXJ0aWNsZXNPYnNlcnZlciA9IE5ld3NBcnRpY2xlcy5maW5kKCkub2JzZXJ2ZSh7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIGFuIGFydGljbGUgaXMgcmVtb3ZlZCBmcm9tIHtAbGluayBOZXdzQXJ0aWNsZXN9LCB3ZSBzaW1wbHkgcmVtb3ZlIGl0IGZyb20gdGhpcyBwdWJsaWNhdGlvbiBhcyB3ZWxsLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gZG9jdW1lbnRcbiAgICAgICAgICogICAgICAgICAgdGhlIGRvY3VtZW50IHRoYXQgd2FzIHJlbW92ZWRcbiAgICAgICAgICovXG4gICAgICAgIHJlbW92ZWQ6IChkb2N1bWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZG9jdW1lbnRJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhkb2N1bWVudC5faWQpO1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVkKCduZXdzQXJ0aWNsZXNJblJlYWRpbmdMaXN0JywgZG9jdW1lbnRJZCk7XG4gICAgICAgIH0sXG5cbiAgICB9KTtcblxuICAgIHRoaXMucmVhZHkoKTtcbiAgICBpbml0aWFsaXppbmcgPSBmYWxzZTtcblxuICAgIHRoaXMub25TdG9wKCgpID0+IHtcbiAgICAgICAgZXhwbGFuYXRpb25zT2JzZXJ2ZXIuc3RvcCgpO1xuICAgICAgICByZWFkaW5nTGlzdE9ic2VydmVyLnN0b3AoKTtcbiAgICAgICAgYXJjaGl2ZU9ic2VydmVyLnN0b3AoKTtcbiAgICAgICAgbmV3c0FydGljbGVzT2JzZXJ2ZXIuc3RvcCgpO1xuICAgIH0pO1xuXG59KTtcblxuLyoqXG4gKiBQdWJsaXNoZXMgYWxsIG5ld3MgYXJ0aWNsZXMgZnJvbSB7QGxpbmsgTmV3c0FydGljbGVzfSBmb3Igd2hpY2ggdGhlcmUgaXMgYW4gZW50cnkgaW4ge0BsaW5rIEFyY2hpdmV9LlxuICpcbiAqIEByZXR1cm5zIHthbnkgfCBNb25nby5DdXJzb3IgfCBudW1iZXIgfCBUfVxuICovXG5NZXRlb3IucHVibGlzaCgnbmV3c0FydGljbGVzSW5BcmNoaXZlJywgZnVuY3Rpb24gbmV3c0FydGljbGVzSW5BcmNoaXZlUHVibGljYXRpb24oKSB7XG4gICAgbGV0IGluaXRpYWxpemluZyA9IHRydWU7XG4gICAgY29uc3QgeyB1c2VySWQgfSA9IHRoaXM7XG5cbiAgICBsZXQgZXhwZXJpbWVudDtcbiAgICBsZXQgdXNlciA9IE1ldGVvci51c2VyKHsgZmllbGRzOiB7IHBhcnRpY2lwYXRlc0luOiAxIH0gfSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICAgIGV4cGVyaW1lbnQgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGV4cGVyaW1lbnQgPSBFeHBlcmltZW50cy5maW5kT25lKHsgX2lkOiB1c2VyLnBhcnRpY2lwYXRlc0luIH0pO1xuICAgIH1cbiAgICBpZiAoIWV4cGVyaW1lbnQpIHtcbiAgICAgICAgdXNlciA9IE1ldGVvci51c2VyKHsgZmllbGRzOiB7IGV4cGVyaW1lbnRzOiAxIH0gfSk7XG4gICAgICAgIGlmICghdXNlciB8fCAhdXNlcklzSW5Sb2xlKCdhZG1pbicpKSB7XG4gICAgICAgICAgICBleHBlcmltZW50ID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG93bmVkRXhwZXJpbWVudHMgPSB1c2VyLmV4cGVyaW1lbnRzLm1hcChleHBlcmltZW50ID0+IGV4cGVyaW1lbnQuZXhwZXJpbWVudCk7XG4gICAgICAgICAgICBleHBlcmltZW50ID0gRXhwZXJpbWVudHMuZmluZE9uZSh7IF9pZDogeyAkaW46IG93bmVkRXhwZXJpbWVudHMgfSB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWV4cGVyaW1lbnQpIHtcbiAgICAgICAgZXhwZXJpbWVudCA9IHt9O1xuICAgIH1cblxuICAgIGxldCB7IGV4cGxhbmF0aW9uVGFnc0RlZiwgbWF4TnJFeHBsYW5hdGlvblRhZ3MgfSA9IGV4cGVyaW1lbnQ7XG4gICAgaWYgKGV4cGxhbmF0aW9uVGFnc0RlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGV4cGxhbmF0aW9uVGFnc0RlZiA9IHt9O1xuICAgIH1cbiAgICBpZiAobWF4TnJFeHBsYW5hdGlvblRhZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtYXhOckV4cGxhbmF0aW9uVGFncyA9IDA7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3c0FydGljbGVzSW5BcmNoaXZlID0gQXJjaGl2ZS5maW5kKHsgdXNlcklkLCByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSB9KS5mZXRjaCgpO1xuICAgIGNvbnN0IG5ld3NBcnRpY2xlSWRzID0gbmV3c0FydGljbGVzSW5BcmNoaXZlLm1hcCgoeyBhcnRpY2xlSWQgfSkgPT4gYXJ0aWNsZUlkKTtcbiAgICBjb25zdCBuZXdzQXJ0aWNsZXMgPSBOZXdzQXJ0aWNsZXMuZmluZCh7IF9pZDogeyAkaW46IG5ld3NBcnRpY2xlSWRzIH0gfSkuZmV0Y2goKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmV3c0FydGljbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGFydGljbGUgPSBuZXdzQXJ0aWNsZXNbaV07XG5cbiAgICAgICAgY29uc3QgZXhwbGFuYXRpb25UYWdzID0gRXhwbGFuYXRpb25zLmZpbmRPbmUoe1xuICAgICAgICAgICAgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgfSkgfHwge307XG4gICAgICAgIGxldCB7IGV4cGxhbmF0aW9uVGFnc0lkIH0gPSBleHBsYW5hdGlvblRhZ3M7XG4gICAgICAgIGlmIChleHBsYW5hdGlvblRhZ3NJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBleHBsYW5hdGlvblRhZ3NJZCA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhwbGFuYXRpb25BcnRpY2xlID0gW107XG4gICAgICAgIGxldCBrZXk7IGxldFxuICAgICAgICAgICAgdGFnO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZXhwbGFuYXRpb25UYWdzSWQubGVuZ3RoLCBtYXhOckV4cGxhbmF0aW9uVGFncyk7IGkrKykge1xuICAgICAgICAgICAga2V5ID0gZXhwbGFuYXRpb25UYWdzSWRbaV07XG4gICAgICAgICAgICB0YWcgPSBleHBsYW5hdGlvblRhZ3NEZWZba2V5XTtcbiAgICAgICAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvbkFydGljbGUucHVzaCh0YWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXNJblJlYWRpbmdMaXN0ID0gUmVhZGluZ0xpc3QuZmluZE9uZSh7XG4gICAgICAgICAgICBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLFxuICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkZWQoJ25ld3NBcnRpY2xlc0luQXJjaGl2ZScsIGFydGljbGUuX2lkLCB7XG4gICAgICAgICAgICAuLi5hcnRpY2xlLFxuICAgICAgICAgICAgZXhwbGFuYXRpb25BcnRpY2xlLFxuICAgICAgICAgICAgaXNJblJlYWRpbmdMaXN0OiAhIWlzSW5SZWFkaW5nTGlzdCxcbiAgICAgICAgICAgIGlzSW5BcmNoaXZlOiB0cnVlLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBleHBsYW5hdGlvbnNPYnNlcnZlciA9IEV4cGxhbmF0aW9ucy5maW5kKHsgdXNlcklkIH0pLm9ic2VydmUoe1xuXG4gICAgICAgIGFkZGVkOiAoZG9jdW1lbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB7IGV4cGxhbmF0aW9uVGFnc0lkIH0gPSBkb2N1bWVudDtcbiAgICAgICAgICAgIGlmIChleHBsYW5hdGlvblRhZ3NJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb25UYWdzSWQgPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25BcnRpY2xlID0gW107XG4gICAgICAgICAgICBsZXQga2V5OyBsZXRcbiAgICAgICAgICAgICAgICB0YWc7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZXhwbGFuYXRpb25UYWdzSWQubGVuZ3RoLCBtYXhOckV4cGxhbmF0aW9uVGFncyk7IGkrKykge1xuICAgICAgICAgICAgICAgIGtleSA9IGV4cGxhbmF0aW9uVGFnc0lkW2ldO1xuICAgICAgICAgICAgICAgIHRhZyA9IGV4cGxhbmF0aW9uVGFnc0RlZltrZXldO1xuICAgICAgICAgICAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwbGFuYXRpb25BcnRpY2xlLnB1c2godGFnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuY2hhbmdlZCgnbmV3c0FydGljbGVzSW5BcmNoaXZlJywgZG9jdW1lbnQuYXJ0aWNsZUlkLCB7IGV4cGxhbmF0aW9uQXJ0aWNsZSB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBjaGFuZ2VkOiAoZG9jdW1lbnQpID0+IHtcbiAgICAgICAgICAgIGxldCB7IGV4cGxhbmF0aW9uVGFnc0lkIH0gPSBkb2N1bWVudDtcbiAgICAgICAgICAgIGlmIChleHBsYW5hdGlvblRhZ3NJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb25UYWdzSWQgPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXhwbGFuYXRpb25BcnRpY2xlID0gW107XG4gICAgICAgICAgICBsZXQga2V5OyBsZXRcbiAgICAgICAgICAgICAgICB0YWc7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4oZXhwbGFuYXRpb25UYWdzSWQubGVuZ3RoLCBtYXhOckV4cGxhbmF0aW9uVGFncyk7IGkrKykge1xuICAgICAgICAgICAgICAgIGtleSA9IGV4cGxhbmF0aW9uVGFnc0lkW2ldO1xuICAgICAgICAgICAgICAgIHRhZyA9IGV4cGxhbmF0aW9uVGFnc0RlZltrZXldO1xuICAgICAgICAgICAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwbGFuYXRpb25BcnRpY2xlLnB1c2godGFnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhkb2N1bWVudC5hcnRpY2xlSWQpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VkKCduZXdzQXJ0aWNsZXNJbkFyY2hpdmUnLCBhcnRpY2xlSWQsIHsgZXhwbGFuYXRpb25BcnRpY2xlIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlbW92ZWQ6IChmaWVsZHMpID0+IHtcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhmaWVsZHMuYXJ0aWNsZUlkKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlZCgnbmV3c0FydGljbGVzSW5BcmNoaXZlJywgYXJ0aWNsZUlkLCB7IGV4cGxhbmF0aW9uQXJ0aWNsZTogW10gfSk7XG4gICAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBhcmNoaXZlT2JzZXJ2ZXIgPSBBcmNoaXZlLmZpbmQoeyB1c2VySWQgfSkub2JzZXJ2ZSh7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZW5ldmVyIGEgZG9jdW1lbnQgaXMgYWRkZWQgdG8ge0BsaW5rIEFyY2hpdmV9LCB3ZSBhZGQgdGhlIGRvY3VtZW50IGluIHRoaXNcbiAgICAgICAgICogcHVibGljYXRpb24gdG9vXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBkb2N1bWVudFxuICAgICAgICAgKiAgICAgICAgICB0aGUgZG9jdW1lbnQgdGhhdCB3YXMgYWRkZWRcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICBhZGRlZDogKGRvY3VtZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoaW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlID0gTmV3c0FydGljbGVzLmZpbmRPbmUoZG9jdW1lbnQuYXJ0aWNsZUlkKTtcblxuICAgICAgICAgICAgY29uc3QgaXNJblJlYWRpbmdMaXN0ID0gUmVhZGluZ0xpc3QuZmluZE9uZSh7XG4gICAgICAgICAgICAgICAgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgICAgICB1c2VySWQsXG4gICAgICAgICAgICAgICAgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKGFydGljbGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZGVkKCduZXdzQXJ0aWNsZXNJbkFyY2hpdmUnLCBhcnRpY2xlLl9pZCwge1xuICAgICAgICAgICAgICAgICAgICAuLi5hcnRpY2xlLFxuICAgICAgICAgICAgICAgICAgICBpc0luUmVhZGluZ0xpc3Q6ICEhaXNJblJlYWRpbmdMaXN0LFxuICAgICAgICAgICAgICAgICAgICBpc0luQXJjaGl2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBjaGFuZ2VkOiAoZG9jdW1lbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChkb2N1bWVudC5yZW1vdmVkQXQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoZG9jdW1lbnQuYXJ0aWNsZUlkKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZWQoJ25ld3NBcnRpY2xlc0luQXJjaGl2ZScsIGFydGljbGVJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZW5ldmVyIGEgZG9jdW1lbnQgd2FzIHJlbW92ZWQgaW4ge0BsaW5rIEFyY2hpdmV9LCB3ZSByZW1vdmUgdGhlIGFydGljbGUgaW4gdGhpc1xuICAgICAgICAgKiBwdWJsaWNhdGlvbiB0b28uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBmaWVsZHNcbiAgICAgICAgICogICAgICAgICAgdGhlIGRvY3VtZW50IHRoYXQgd2FzIHJlbW92ZWRcbiAgICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVkOiAoZmllbGRzKSA9PiB7XG4gICAgICAgICAgICBpZiAoaW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoZmllbGRzLmFydGljbGVJZCk7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZWQoJ25ld3NBcnRpY2xlc0luQXJjaGl2ZScsIGFydGljbGVJZCk7XG4gICAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCByZWFkaW5nTGlzdE9ic2VydmVyID0gUmVhZGluZ0xpc3QuZmluZCh7IHVzZXJJZCB9KS5vYnNlcnZlKHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hlbmV2ZXIgYSBkb2N1bWVudCBpcyBhZGRlZCB0byB7QGxpbmsgUmVhZGluZ0xpc3R9LCB3ZSB1cGRhdGUgdGhlIGRvY3VtZW50IGluXG4gICAgICAgICAqIHRoaXMgcHVibGljYXRpb24gYW5kIHNldCBpc0luUmVhZGluZ0xpc3QgdG8gdHJ1ZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGRvY3VtZW50XG4gICAgICAgICAqICAgICAgICAgIHRoZSBkb2N1bWVudCB0aGF0IHdhcyBhZGRlZFxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGFkZGVkOiAoZG9jdW1lbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFydGljbGUgPSBBcmNoaXZlLmZpbmRPbmUoe1xuICAgICAgICAgICAgICAgIGFydGljbGVJZDogZG9jdW1lbnQuYXJ0aWNsZUlkLFxuICAgICAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgICAgICByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoYXJ0aWNsZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhkb2N1bWVudC5hcnRpY2xlSWQpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlZCgnbmV3c0FydGljbGVzSW5BcmNoaXZlJywgYXJ0aWNsZUlkLCB7IGlzSW5SZWFkaW5nTGlzdDogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hlbmV2ZXIgYSBkb2N1bWVudCBpbiB7QGxpbmsgUmVhZGluZ0xpc3R9IGlzIGNoYW5nZWQsIHdlIHVwZGF0ZSB0aGUgZG9jdW1lbnRcbiAgICAgICAgICogaW4gdGhpcyBwdWJsaWNhdGlvbiBhbmQgc2V0IGlzSW5SZWFkaW5nTGlzdCBhY2NvcmRpbmdseS5cbiAgICAgICAgICogSWYgYW4gYXJ0aWNsZSBpcyByZW1vdmVkIGZyb20gdGhlIHJlYWRpbmcgbGlzdCwgdGhlIGRvY3VtZW50IGluIHtAbGluayBSZWFkaW5nTGlzdH1cbiAgICAgICAgICogaXMgbm90IHJlbW92ZSBidXQgb25seSB1cGRhdGVkLiBUaGF0IGlzLCBhbiBhcnRpY2xlIHdhcyByZW1vdmVkIGZyb20gdGhlXG4gICAgICAgICAqIHJlYWRpbmcgbGlzdCBpZiB0aGUgZG9jdW1lbnQgaW4ge0BsaW5rIFJlYWRpbmdMaXN0fSBoYXMgYSBmaWVsZCBcInJlbW92ZWRBdFwiLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gZG9jdW1lbnRcbiAgICAgICAgICovXG4gICAgICAgIGNoYW5nZWQ6IChkb2N1bWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZSA9IEFyY2hpdmUuZmluZE9uZSh7XG4gICAgICAgICAgICAgICAgYXJ0aWNsZUlkOiBkb2N1bWVudC5hcnRpY2xlSWQsXG4gICAgICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgICAgIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChkb2N1bWVudC5yZW1vdmVkQXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJ0aWNsZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoZG9jdW1lbnQuYXJ0aWNsZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkKCduZXdzQXJ0aWNsZXNJbkFyY2hpdmUnLCBhcnRpY2xlSWQsIHsgaXNJblJlYWRpbmdMaXN0OiBmYWxzZSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZW5ldmVyIGEgZG9jdW1lbnQgd2FzIHJlbW92ZWQgaW4ge0BsaW5rIFJlYWRpbmdMaXN0fSwgd2UgdXBkYXRlIHRoZSBkb2N1bWVudCBpblxuICAgICAgICAgKiB0aGlzIHB1YmxpY2F0aW9uIGFuZCBzZXQgaXNJblJlYWRpbmdMaXN0IHRvIGZhbHNlLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gZmllbGRzXG4gICAgICAgICAqICAgICAgICAgIHRoZSBkb2N1bWVudCB0aGF0IHdhcyByZW1vdmVkXG4gICAgICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlZDogKGZpZWxkcykgPT4ge1xuICAgICAgICAgICAgaWYgKGluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZSA9IEFyY2hpdmUuZmluZE9uZSh7XG4gICAgICAgICAgICAgICAgYXJ0aWNsZUlkOiBmaWVsZHMuYXJ0aWNsZUlkLFxuICAgICAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgICAgICByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoYXJ0aWNsZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhmaWVsZHMuYXJ0aWNsZUlkKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZWQoJ25ld3NBcnRpY2xlc0luQXJjaGl2ZScsIGFydGljbGVJZCwgeyBpc0luUmVhZGluZ0xpc3Q6IGZhbHNlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgbmV3c0FydGljbGVzT2JzZXJ2ZXIgPSBOZXdzQXJ0aWNsZXMuZmluZCgpLm9ic2VydmUoe1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBhbiBhcnRpY2xlIGlzIHJlbW92ZWQgZnJvbSB7QGxpbmsgTmV3c0FydGljbGVzfSwgd2Ugc2ltcGx5IHJlbW92ZSBpdCBmcm9tIHRoaXMgcHVibGljYXRpb24gYXMgd2VsbC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGRvY3VtZW50XG4gICAgICAgICAqICAgICAgICAgIHRoZSBkb2N1bWVudCB0aGF0IHdhcyByZW1vdmVkXG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVkOiAoZG9jdW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRvY3VtZW50SWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoZG9jdW1lbnQuX2lkKTtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlZCgnbmV3c0FydGljbGVzSW5BcmNoaXZlJywgZG9jdW1lbnRJZCk7XG4gICAgICAgIH0sXG5cbiAgICB9KTtcblxuICAgIHRoaXMucmVhZHkoKTtcbiAgICBpbml0aWFsaXppbmcgPSBmYWxzZTtcblxuICAgIHRoaXMub25TdG9wKCgpID0+IHtcbiAgICAgICAgZXhwbGFuYXRpb25zT2JzZXJ2ZXIuc3RvcCgpO1xuICAgICAgICBhcmNoaXZlT2JzZXJ2ZXIuc3RvcCgpO1xuICAgICAgICByZWFkaW5nTGlzdE9ic2VydmVyLnN0b3AoKTtcbiAgICAgICAgbmV3c0FydGljbGVzT2JzZXJ2ZXIuc3RvcCgpO1xuICAgIH0pO1xuXG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goJ2Z1cnRoZXJSZWNvbW1lbmRlZE5ld3NBcnRpY2xlcycsIGZ1bmN0aW9uIGZ1cnRoZXJSZWNvbW1lbmRlZE5ld3NBcnRpY2xlc1B1YmxpY2F0aW9ucyhsaW1pdCwgcHJpbWFyeUNhdGVnb3J5LCBhcnRpY2xlSWQpIHtcbiAgICBjaGVjayhsaW1pdCwgTnVtYmVyKTtcbiAgICBjaGVjayhwcmltYXJ5Q2F0ZWdvcnksIFN0cmluZyk7XG4gICAgY2hlY2soYXJ0aWNsZUlkLCBTdHJpbmcpO1xuXG4gICAgbGV0IGluaXRpYWxpemluZyA9IHRydWU7XG4gICAgY29uc3QgeyB1c2VySWQgfSA9IHRoaXM7XG5cbiAgICBjb25zdCBjbGVhbklkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGFydGljbGVJZCk7XG4gICAgY29uc3QgcmVjb21tZW5kYXRpb25zID0gUmVjb21tZW5kYXRpb25zLmZpbmQoeyB1c2VySWQsIHByaW1hcnlDYXRlZ29yeSwgYXJ0aWNsZUlkOiB7ICRuZTogY2xlYW5JZCB9IH0sIHsgc29ydDogeyBwcmVkaWN0aW9uOiAtMSB9LCBsaW1pdCB9KS5mZXRjaCgpO1xuXG4gICAgaWYgKHJlY29tbWVuZGF0aW9ucyAmJiByZWNvbW1lbmRhdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlY29tbWVuZGF0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgeyBhcnRpY2xlSWQsIHByZWRpY3Rpb24gfSA9IHJlY29tbWVuZGF0aW9uc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IGFydGljbGUgPSBOZXdzQXJ0aWNsZXMuZmluZE9uZSh7IF9pZDogYXJ0aWNsZUlkIH0pO1xuXG4gICAgICAgICAgICBpZiAoIWFydGljbGUpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgaXNJblJlYWRpbmdMaXN0ID0gUmVhZGluZ0xpc3QuZmluZE9uZSh7XG4gICAgICAgICAgICAgICAgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgICAgICB1c2VySWQsXG4gICAgICAgICAgICAgICAgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgaXNJbkFyY2hpdmUgPSBBcmNoaXZlLmZpbmRPbmUoe1xuICAgICAgICAgICAgICAgIGFydGljbGVJZDogYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgICAgIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuYWRkZWQoJ2Z1cnRoZXJSZWNvbW1lbmRlZE5ld3NBcnRpY2xlcycsIGFydGljbGUuX2lkLCB7XG4gICAgICAgICAgICAgICAgLi4uYXJ0aWNsZSxcbiAgICAgICAgICAgICAgICBleHBsYW5hdGlvbkFydGljbGU6IFtdLFxuICAgICAgICAgICAgICAgIGlzSW5SZWFkaW5nTGlzdDogISFpc0luUmVhZGluZ0xpc3QsXG4gICAgICAgICAgICAgICAgaXNJbkFyY2hpdmU6ICEhaXNJbkFyY2hpdmUsXG4gICAgICAgICAgICAgICAgcHJlZGljdGlvbixcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbmV3c0FydGljbGVzID0gTmV3c0FydGljbGVzLmZpbmQoeyBwcmltYXJ5Q2F0ZWdvcnksIF9pZDogeyAkbmU6IGNsZWFuSWQgfSB9LCB7IHNvcnQ6IHsgZGF0ZVB1Ymxpc2hlZDogLTEgfSwgbGltaXQgfSkuZmV0Y2goKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZXdzQXJ0aWNsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGFydGljbGUgPSBuZXdzQXJ0aWNsZXNbaV07XG5cbiAgICAgICAgICAgIGNvbnN0IGlzSW5SZWFkaW5nTGlzdCA9IFJlYWRpbmdMaXN0LmZpbmRPbmUoe1xuICAgICAgICAgICAgICAgIGFydGljbGVJZDogYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgICAgIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGlzSW5BcmNoaXZlID0gQXJjaGl2ZS5maW5kT25lKHtcbiAgICAgICAgICAgICAgICBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLFxuICAgICAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgICAgICByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLmFkZGVkKCdmdXJ0aGVyUmVjb21tZW5kZWROZXdzQXJ0aWNsZXMnLCBhcnRpY2xlLl9pZCwge1xuICAgICAgICAgICAgICAgIC4uLmFydGljbGUsXG4gICAgICAgICAgICAgICAgZXhwbGFuYXRpb25BcnRpY2xlOiBbXSxcbiAgICAgICAgICAgICAgICBpc0luUmVhZGluZ0xpc3Q6ICEhaXNJblJlYWRpbmdMaXN0LFxuICAgICAgICAgICAgICAgIGlzSW5BcmNoaXZlOiAhIWlzSW5BcmNoaXZlLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlYWRpbmdMaXN0T2JzZXJ2ZXIgPSBSZWFkaW5nTGlzdC5maW5kKHsgdXNlcklkIH0pLm9ic2VydmUoe1xuXG4gICAgICAgIGFkZGVkOiAoZG9jdW1lbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgcGllY2Ugb2YgY29kZSBoYWQgdG8gYmUgaW5zZXJ0ZWQgb25seSBkdWUgdG8gYSBNZXRlb3IgcHJvYmxlbS5cbiAgICAgICAgICAgIC8vIFdBUk5JTkc6IElUIElTIERVUExJQ0FURUQgQVQgRElGRkVSRU5UIFBMQUNFUyBJTiBuZXdzQXJ0aWNsZXMuanMuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gdGhpcy5jaGFuZ2VkIGdlbmVyYXRlcyBhIE1ldGVvciB3YXJuaW5nLCBpZiBhIGRvY3VtZW50IGlzIG5vdCB5ZXQgaW4gdGhlIGNvbGxlY3Rpb24sIGhvd2V2ZXIgd2Ugc2F5IHRoZVxuICAgICAgICAgICAgLy8gZG9jdW1lbnQgaGFzIHRvIGJlIGNoYW5nZWQuIFRoaXMgaXMgbm9ybWFsLCBhcyB0aGUgaWQgb2YgdGhlIGRvY3VtZW50IGlzIG5vdCB5ZXQgaW4gdGhlXG4gICAgICAgICAgICAvLyBjb2xsZWN0aW9uLiBUbyBhdm9pZCB0aGUgd2FybmluZywgd2UgbmVlZCB0byBtYWtlIHN1cmUgdGhhdCB0aGUgZG9jdW1lbnQgaXMgYWRkZWQgdG8gdGhlXG4gICAgICAgICAgICAvLyBjb2xsZWN0aW9uLCBiZWZvcmUgYW55IGNoYW5nZXMgdG8gaXQgY2FuIGJlIG1hZGUuIFRoYXQgaXMgd2h5IHdlIHVzZSB0aGlzLmFkZGVkLiBJZiB0aGVcbiAgICAgICAgICAgIC8vIGRvY3VtZW50IGFscmVhZHkgZXhpc3RzIGluIHRoZSBjb2xsZWN0aW9uLCB0aGlzLmFkZGVkIHdpbGwgZG8gbm90aGluZy5cblxuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGRvY3VtZW50LmFydGljbGVJZCk7XG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlID0gTmV3c0FydGljbGVzLmZpbmRPbmUoeyBfaWQ6IGFydGljbGVJZCB9KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29tbWVuZGF0aW9uID0gUmVjb21tZW5kYXRpb25zLmZpbmRPbmUoeyBhcnRpY2xlSWQgfSk7XG4gICAgICAgICAgICBjb25zdCBpc0luUmVhZGluZ0xpc3QgPSBSZWFkaW5nTGlzdC5maW5kT25lKHsgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCwgdXNlcklkLCByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSB9KTtcbiAgICAgICAgICAgIGNvbnN0IGlzSW5BcmNoaXZlID0gQXJjaGl2ZS5maW5kT25lKHsgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCwgdXNlcklkLCByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSB9KTtcblxuICAgICAgICAgICAgaWYgKHJlY29tbWVuZGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRlZCgnZnVydGhlclJlY29tbWVuZGVkTmV3c0FydGljbGVzJywgYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLmFydGljbGUsIGV4cGxhbmF0aW9uQXJ0aWNsZTogW10sIGlzSW5SZWFkaW5nTGlzdDogISFpc0luUmVhZGluZ0xpc3QsIGlzSW5BcmNoaXZlOiAhIWlzSW5BcmNoaXZlLCBwcmVkaWN0aW9uOiByZWNvbW1lbmRhdGlvbi5wcmVkaWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRlZCgnZnVydGhlclJlY29tbWVuZGVkTmV3c0FydGljbGVzJywgYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLmFydGljbGUsIGV4cGxhbmF0aW9uQXJ0aWNsZTogW10sIGlzSW5SZWFkaW5nTGlzdDogISFpc0luUmVhZGluZ0xpc3QsIGlzSW5BcmNoaXZlOiAhIWlzSW5BcmNoaXZlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jaGFuZ2VkKCdmdXJ0aGVyUmVjb21tZW5kZWROZXdzQXJ0aWNsZXMnLCBhcnRpY2xlLl9pZCwgeyBpc0luUmVhZGluZ0xpc3Q6IHRydWUgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2hhbmdlZDogKGRvY3VtZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQucmVtb3ZlZEF0KSB7XG5cbiAgICAgICAgICAgICAgICAvLyBUaGUgZm9sbG93aW5nIHBpZWNlIG9mIGNvZGUgaGFkIHRvIGJlIGluc2VydGVkIG9ubHkgZHVlIHRvIGEgTWV0ZW9yIHByb2JsZW0uXG4gICAgICAgICAgICAgICAgLy8gV0FSTklORzogSVQgSVMgRFVQTElDQVRFRCBBVCBESUZGRVJFTlQgUExBQ0VTIElOIG5ld3NBcnRpY2xlcy5qcy5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIHRoaXMuY2hhbmdlZCBnZW5lcmF0ZXMgYSBNZXRlb3Igd2FybmluZywgaWYgYSBkb2N1bWVudCBpcyBub3QgeWV0IGluIHRoZSBjb2xsZWN0aW9uLCBob3dldmVyIHdlIHNheSB0aGVcbiAgICAgICAgICAgICAgICAvLyBkb2N1bWVudCBoYXMgdG8gYmUgY2hhbmdlZC4gVGhpcyBpcyBub3JtYWwsIGFzIHRoZSBpZCBvZiB0aGUgZG9jdW1lbnQgaXMgbm90IHlldCBpbiB0aGVcbiAgICAgICAgICAgICAgICAvLyBjb2xsZWN0aW9uLiBUbyBhdm9pZCB0aGUgd2FybmluZywgd2UgbmVlZCB0byBtYWtlIHN1cmUgdGhhdCB0aGUgZG9jdW1lbnQgaXMgYWRkZWQgdG8gdGhlXG4gICAgICAgICAgICAgICAgLy8gY29sbGVjdGlvbiwgYmVmb3JlIGFueSBjaGFuZ2VzIHRvIGl0IGNhbiBiZSBtYWRlLiBUaGF0IGlzIHdoeSB3ZSB1c2UgdGhpcy5hZGRlZC4gSWYgdGhlXG4gICAgICAgICAgICAgICAgLy8gZG9jdW1lbnQgYWxyZWFkeSBleGlzdHMgaW4gdGhlIGNvbGxlY3Rpb24sIHRoaXMuYWRkZWQgd2lsbCBkbyBub3RoaW5nLlxuXG4gICAgICAgICAgICAgICAgY29uc3QgYXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGRvY3VtZW50LmFydGljbGVJZCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYXJ0aWNsZSA9IE5ld3NBcnRpY2xlcy5maW5kT25lKHsgX2lkOiBhcnRpY2xlSWQgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb21tZW5kYXRpb24gPSBSZWNvbW1lbmRhdGlvbnMuZmluZE9uZSh7IGFydGljbGVJZCB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0luUmVhZGluZ0xpc3QgPSBSZWFkaW5nTGlzdC5maW5kT25lKHsgYXJ0aWNsZUlkOiBhcnRpY2xlLl9pZCwgdXNlcklkLCByZW1vdmVkQXQ6IHsgJGV4aXN0czogZmFsc2UgfSB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0luQXJjaGl2ZSA9IEFyY2hpdmUuZmluZE9uZSh7IGFydGljbGVJZDogYXJ0aWNsZS5faWQsIHVzZXJJZCwgcmVtb3ZlZEF0OiB7ICRleGlzdHM6IGZhbHNlIH0gfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVjb21tZW5kYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRlZCgnZnVydGhlclJlY29tbWVuZGVkTmV3c0FydGljbGVzJywgYXJ0aWNsZS5faWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uYXJ0aWNsZSwgZXhwbGFuYXRpb25BcnRpY2xlOiBbXSwgaXNJblJlYWRpbmdMaXN0OiAhIWlzSW5SZWFkaW5nTGlzdCwgaXNJbkFyY2hpdmU6ICEhaXNJbkFyY2hpdmUsIHByZWRpY3Rpb246IHJlY29tbWVuZGF0aW9uLnByZWRpY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZGVkKCdmdXJ0aGVyUmVjb21tZW5kZWROZXdzQXJ0aWNsZXMnLCBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5hcnRpY2xlLCBleHBsYW5hdGlvbkFydGljbGU6IFtdLCBpc0luUmVhZGluZ0xpc3Q6ICEhaXNJblJlYWRpbmdMaXN0LCBpc0luQXJjaGl2ZTogISFpc0luQXJjaGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlZCgnZnVydGhlclJlY29tbWVuZGVkTmV3c0FydGljbGVzJywgYXJ0aWNsZS5faWQsIHsgaXNJblJlYWRpbmdMaXN0OiBmYWxzZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICByZW1vdmVkOiAoZmllbGRzKSA9PiB7XG4gICAgICAgICAgICBpZiAoaW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGUgZm9sbG93aW5nIHBpZWNlIG9mIGNvZGUgaGFkIHRvIGJlIGluc2VydGVkIG9ubHkgZHVlIHRvIGEgTWV0ZW9yIHByb2JsZW0uXG4gICAgICAgICAgICAvLyBXQVJOSU5HOiBJVCBJUyBEVVBMSUNBVEVEIEFUIERJRkZFUkVOVCBQTEFDRVMgSU4gbmV3c0FydGljbGVzLmpzLlxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIHRoaXMuY2hhbmdlZCBnZW5lcmF0ZXMgYSBNZXRlb3Igd2FybmluZywgaWYgYSBkb2N1bWVudCBpcyBub3QgeWV0IGluIHRoZSBjb2xsZWN0aW9uLCBob3dldmVyIHdlIHNheSB0aGVcbiAgICAgICAgICAgIC8vIGRvY3VtZW50IGhhcyB0byBiZSBjaGFuZ2VkLiBUaGlzIGlzIG5vcm1hbCwgYXMgdGhlIGlkIG9mIHRoZSBkb2N1bWVudCBpcyBub3QgeWV0IGluIHRoZVxuICAgICAgICAgICAgLy8gY29sbGVjdGlvbi4gVG8gYXZvaWQgdGhlIHdhcm5pbmcsIHdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIGRvY3VtZW50IGlzIGFkZGVkIHRvIHRoZVxuICAgICAgICAgICAgLy8gY29sbGVjdGlvbiwgYmVmb3JlIGFueSBjaGFuZ2VzIHRvIGl0IGNhbiBiZSBtYWRlLiBUaGF0IGlzIHdoeSB3ZSB1c2UgdGhpcy5hZGRlZC4gSWYgdGhlXG4gICAgICAgICAgICAvLyBkb2N1bWVudCBhbHJlYWR5IGV4aXN0cyBpbiB0aGUgY29sbGVjdGlvbiwgdGhpcy5hZGRlZCB3aWxsIGRvIG5vdGhpbmcuXG5cbiAgICAgICAgICAgIGNvbnN0IGFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhmaWVsZHMuYXJ0aWNsZUlkKTtcbiAgICAgICAgICAgIGNvbnN0IGFydGljbGUgPSBOZXdzQXJ0aWNsZXMuZmluZE9uZSh7IF9pZDogYXJ0aWNsZUlkIH0pO1xuICAgICAgICAgICAgY29uc3QgcmVjb21tZW5kYXRpb24gPSBSZWNvbW1lbmRhdGlvbnMuZmluZE9uZSh7IGFydGljbGVJZCB9KTtcbiAgICAgICAgICAgIGNvbnN0IGlzSW5SZWFkaW5nTGlzdCA9IFJlYWRpbmdMaXN0LmZpbmRPbmUoeyBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLCB1c2VySWQsIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9IH0pO1xuICAgICAgICAgICAgY29uc3QgaXNJbkFyY2hpdmUgPSBBcmNoaXZlLmZpbmRPbmUoeyBhcnRpY2xlSWQ6IGFydGljbGUuX2lkLCB1c2VySWQsIHJlbW92ZWRBdDogeyAkZXhpc3RzOiBmYWxzZSB9IH0pO1xuXG4gICAgICAgICAgICBpZiAocmVjb21tZW5kYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZGVkKCdmdXJ0aGVyUmVjb21tZW5kZWROZXdzQXJ0aWNsZXMnLCBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgLi4uYXJ0aWNsZSwgZXhwbGFuYXRpb25BcnRpY2xlOiBbXSwgaXNJblJlYWRpbmdMaXN0OiAhIWlzSW5SZWFkaW5nTGlzdCwgaXNJbkFyY2hpdmU6ICEhaXNJbkFyY2hpdmUsIHByZWRpY3Rpb246IHJlY29tbWVuZGF0aW9uLnByZWRpY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZGVkKCdmdXJ0aGVyUmVjb21tZW5kZWROZXdzQXJ0aWNsZXMnLCBhcnRpY2xlLl9pZCxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgLi4uYXJ0aWNsZSwgZXhwbGFuYXRpb25BcnRpY2xlOiBbXSwgaXNJblJlYWRpbmdMaXN0OiAhIWlzSW5SZWFkaW5nTGlzdCwgaXNJbkFyY2hpdmU6ICEhaXNJbkFyY2hpdmUsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmNoYW5nZWQoJ2Z1cnRoZXJSZWNvbW1lbmRlZE5ld3NBcnRpY2xlcycsIGFydGljbGUuX2lkLCB7IGlzSW5SZWFkaW5nTGlzdDogZmFsc2UgfSk7XG4gICAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBJZiBhdCBzb21lIHBvaW50IHRoZSBhcnRpY2xlIFByZXZpZXcgY29tcG9uZW50IGhhcyB0byBiZSBleHRlbmRlZCBieSBzaG93aW5nIHRoZSBzdGFyIHN5bWJvbCwgc2ltaWxhciB0byB0aGVcbiAgICAvLyBib29rbWFyayBzeW1ib2wgY3VycmVudGx5LCB0aGVuIGFuIGFyY2hpdmVMaXN0T2JzZXJ2ZXIgd2lsbCBoYXZlIHRvIGJlIGFkZGVkIChzaW1pbGFyIHRvIHRoZVxuICAgIC8vIHJlYWRpbmdMaXN0T2JzZXJ2ZXIgYWJvdmUpLlxuXG4gICAgdGhpcy5yZWFkeSgpO1xuICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xuXG4gICAgdGhpcy5vblN0b3AoKCkgPT4ge1xuICAgICAgICByZWFkaW5nTGlzdE9ic2VydmVyLnN0b3AoKTtcbiAgICB9KTtcbn0pO1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XHJcbmltcG9ydCB7IFN1cnZleXMgfSBmcm9tICcuLi8uLi9zdXJ2ZXlzJztcclxuaW1wb3J0IHsgQW5zd2VycyB9IGZyb20gJy4uLy4uL2Fuc3dlcnMnO1xyXG5cclxuTWV0ZW9yLnB1Ymxpc2goJ3N1cnZleXMnLCAoKSA9PiB7XHJcbiAgICBjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoeyBmaWVsZHM6IHsgZXhwZXJpbWVudHM6IDEgfSB9KTtcclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnUGVybWlzc2lvbiBEZW5pZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBlcmltZW50cyA9IHVzZXIuZXhwZXJpbWVudHMubWFwKGV4cGVyaW1lbnQgPT4gZXhwZXJpbWVudC5leHBlcmltZW50KVxyXG5cclxuICAgIHJldHVybiBTdXJ2ZXlzLmZpbmQoeyBleHBlcmltZW50OiB7ICRpbjogZXhwZXJpbWVudHMgfSB9KTtcclxufSk7XHJcblxyXG5NZXRlb3IucHVibGlzaCgnc3VydmV5cy51bmFuc3dlcmVkJywgZnVuY3Rpb24gdW5hbnN3ZXJlZFN1cnZleXNQdWJsaWNhdGlvbigpIHtcclxuICAgIGxldCBpbml0aWFsaXppbmcgPSB0cnVlO1xyXG5cclxuICAgIGNvbnN0IHsgdXNlcklkIH0gPSB0aGlzO1xyXG4gICAgY29uc3QgdXNlciA9IE1ldGVvci51c2VyKCk7XHJcblxyXG4gICAgaWYgKCF1c2VySWQgfHwgIXVzZXIpIHtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcbiAgICBjb25zdCB7IHBhcnRpY2lwYXRlc0luIH0gPSB1c2VyO1xyXG5cclxuICAgIGNvbnN0IGFuc3dlcmVkU3VydmV5c0lkcyA9IEFuc3dlcnMuZmluZCh7IHVzZXJJZCB9LCB7IGZpZWxkczogeyBzdXJ2ZXlJZDogMSB9IH0pXHJcbiAgICAgICAgLm1hcCgoeyBzdXJ2ZXlJZCB9KSA9PiBzdXJ2ZXlJZCk7XHJcblxyXG4gICAgU3VydmV5cy5maW5kKHtcclxuICAgICAgICBfaWQ6IHsgJG5pbjogYW5zd2VyZWRTdXJ2ZXlzSWRzIH0sXHJcbiAgICAgICAgZXhwZXJpbWVudDogcGFydGljaXBhdGVzSW4sXHJcbiAgICB9LCB7XHJcbiAgICAgICAgc29ydDogeyBjcmVhdGVkQXQ6IDEgfSxcclxuICAgIH0pLmZvckVhY2goc3VydmV5ID0+IChcclxuICAgICAgICB0aGlzLmFkZGVkKCd1bmFuc3dlcmVkU3VydmV5cycsIHN1cnZleS5faWQsIHN1cnZleSlcclxuICAgICkpO1xyXG5cclxuICAgIGNvbnN0IGFuc3dlcnNPYnNlcnZlciA9IEFuc3dlcnMuZmluZCh7IHVzZXJJZCB9KS5vYnNlcnZlKHtcclxuXHJcbiAgICAgICAgYWRkZWQ6IChkb2N1bWVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoaW5pdGlhbGl6aW5nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHsgc3VydmV5SWQgfSA9IGRvY3VtZW50O1xyXG4gICAgICAgICAgICB0aGlzLnJlbW92ZWQoJ3VuYW5zd2VyZWRTdXJ2ZXlzJywgc3VydmV5SWQpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHJlbW92ZWQ6IChkb2N1bWVudCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB7IHN1cnZleUlkIH0gPSBkb2N1bWVudDtcclxuICAgICAgICAgICAgY29uc3Qgc3VydmV5ID0gU3VydmV5cy5maW5kT25lKHsgX2lkOiBzdXJ2ZXlJZCB9KTtcclxuICAgICAgICAgICAgdGhpcy5hZGRlZCgndW5hbnN3ZXJlZFN1cnZleXMnLCBzdXJ2ZXlJZCwgc3VydmV5KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHN1cnZleXNPYnNlcnZlciA9IFN1cnZleXMuZmluZCh7IGV4cGVyaW1lbnQ6IHBhcnRpY2lwYXRlc0luIH0pLm9ic2VydmVDaGFuZ2VzKHtcclxuXHJcbiAgICAgICAgYWRkZWQ6IChpZCwgZmllbGRzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChpbml0aWFsaXppbmcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgaGFzQW5zd2VyZWRTdXJ2ZXkgPSBBbnN3ZXJzLmZpbmQoeyB1c2VySWQsIHN1cnZleUlkOiBpZCB9KS5jb3VudCgpID4gMDtcclxuXHJcbiAgICAgICAgICAgIGlmICghaGFzQW5zd2VyZWRTdXJ2ZXkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkZWQoJ3VuYW5zd2VyZWRTdXJ2ZXlzJywgaWQsIGZpZWxkcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICByZW1vdmVkOiAoaWQpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5yZW1vdmVkKCd1bmFuc3dlcmVkU3VydmV5cycsIGlkKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucmVhZHkoKTtcclxuICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xyXG5cclxuICAgIHRoaXMub25TdG9wKCgpID0+IHtcclxuICAgICAgICBhbnN3ZXJzT2JzZXJ2ZXIuc3RvcCgpO1xyXG4gICAgICAgIHN1cnZleXNPYnNlcnZlci5zdG9wKCk7XHJcbiAgICB9KTtcclxufSk7XHJcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xyXG5pbXBvcnQgeyB1c2VySXNJblJvbGUgfSBmcm9tICcuLi8uLi8uLi9saWIvdXRpbHMvdXRpbHNfYWNjb3VudCc7XHJcblxyXG5NZXRlb3IucHVibGlzaCgndXNlckRhdGEnLCBmdW5jdGlvbiB1c2VyRGF0YVB1YmxpY2F0aW9uKCkge1xyXG4gICAgcmV0dXJuIE1ldGVvci51c2Vycy5maW5kKHRoaXMudXNlcklkLCB7XHJcbiAgICAgICAgZmllbGRzOiB7XHJcbiAgICAgICAgICAgIHJvbGVzOiAxLFxyXG4gICAgICAgICAgICBleHBlcmltZW50czogMSxcclxuICAgICAgICAgICAgZnVsbE5hbWU6IDEsXHJcbiAgICAgICAgfSxcclxuICAgIH0pO1xyXG59KTtcclxuXHJcbk1ldGVvci5wdWJsaXNoKCd1c2Vycy5hbGwnLCAoKSA9PiB7XHJcbiAgICBjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXIoKTtcclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnUGVybWlzc2lvbiBEZW5pZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXVzZXJJc0luUm9sZSgnYWRtaW4nKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnUGVybWlzc2lvbiBEZW5pZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBlcmltZW50c0xpc3QgPSB1c2VyLmV4cGVyaW1lbnRzLm1hcCggZXhwZXJpbWVudHNPYmplY3QgPT4gZXhwZXJpbWVudHNPYmplY3QuZXhwZXJpbWVudCApO1xyXG5cclxuICAgIHJldHVybiBNZXRlb3IudXNlcnMuZmluZCh7IHBhcnRpY2lwYXRlc0luOiB7ICRpbjogZXhwZXJpbWVudHNMaXN0IH19KTtcclxufSk7XHJcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xyXG5pbXBvcnQgeyBjaGVjaywgTWF0Y2ggfSBmcm9tICdtZXRlb3IvY2hlY2snO1xyXG5pbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XHJcbmltcG9ydCB7IFN1cnZleXMgfSBmcm9tICcuL3N1cnZleXMnO1xyXG5cclxuZXhwb3J0IGNvbnN0IEFuc3dlcnMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignYW5zd2VycycpO1xyXG5cclxuTWV0ZW9yLm1ldGhvZHMoe1xyXG5cclxuICAgICdhbnN3ZXJzLmFkZCcoc3VydmV5SWQsIHN1cnZleUFuc3dlcnMpIHtcclxuICAgICAgICBjaGVjayhzdXJ2ZXlJZCwgU3RyaW5nKTtcclxuICAgICAgICBjaGVjayhzdXJ2ZXlBbnN3ZXJzLCBBcnJheSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcclxuICAgICAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpbml0aWFsU3VydmV5ID0gU3VydmV5cy5maW5kT25lKHN1cnZleUlkKTtcclxuICAgICAgICBjb25zdCB7IHF1ZXN0aW9ucyB9ID0gaW5pdGlhbFN1cnZleTtcclxuICAgICAgICBjb25zdCBjcmVhdGVkQXQgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIGNvbnN0IGFuc3dlcnMgPSBbXTtcclxuXHJcbiAgICAgICAgc3VydmV5QW5zd2Vycy5mb3JFYWNoKChhLCBpKSA9PiB7XHJcbiAgICAgICAgICAgIGFuc3dlcnMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBxdWVzdGlvbklkOiBxdWVzdGlvbnNbaV0uX2lkLFxyXG4gICAgICAgICAgICAgICAgcXVlc3Rpb25UZXh0OiBxdWVzdGlvbnNbaV0udGV4dCxcclxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbnM6IE9iamVjdC5rZXlzKGEpLm1hcChrZXkgPT4gYVtrZXldKSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIEFuc3dlcnMuaW5zZXJ0KHtcclxuICAgICAgICAgICAgc3VydmV5SWQsXHJcbiAgICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgICAgY3JlYXRlZEF0LFxyXG4gICAgICAgICAgICBhbnN3ZXJzLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbn0pO1xyXG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcclxuaW1wb3J0IHsgY2hlY2sgfSBmcm9tICdtZXRlb3IvY2hlY2snO1xyXG5pbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XHJcbmltcG9ydCB7IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyB9IGZyb20gJy4uL2xpYi91dGlscy91dGlsc19zdHJpbmcnO1xyXG5pbXBvcnQgeyBOZXdzQXJ0aWNsZXMgfSBmcm9tICcuL2FydGljbGVzJztcclxuXHJcbmV4cG9ydCBjb25zdCBBcmNoaXZlID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ2FyY2hpdmUnKTtcclxuXHJcbk1ldGVvci5tZXRob2RzKHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFkZHMgdGhlIGFydGljbGUgd2l0aCB0aGUgZ2l2ZW4gaWQgdG8gdGhlIGN1cnJlbnQgdXNlcidzIGFyY2hpdmUuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIGFydGljbGVJZFxyXG4gICAgICogICAgICAgICAgdGhlIGlkIG9mIHRoZSBhcnRpY2xlIHRoYXQncyBhZGRlZCB0byB0aGUgYXJjaGl2ZVxyXG4gICAgICogQHJldHVybnMge2FueX1cclxuICAgICAqICAgICAgICAgIFRoZSB1bmlxdWUgX2lkIG9mIHRoZSBkb2N1bWVudCB0aGF0IHdhcyBpbnNlcnRlZFxyXG4gICAgICovXHJcbiAgICAnYXJjaGl2ZS5hcnRpY2xlLmFkZCcoYXJ0aWNsZUlkKSB7XHJcbiAgICAgICAgY2hlY2soYXJ0aWNsZUlkLCBTdHJpbmcpO1xyXG5cclxuICAgICAgICBjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XHJcbiAgICAgICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIC8vIGR1ZSB0byBhIGJ1ZyBpbiByZWFjdC1uYXRpdmUtbWV0ZW9yIGFuZC9vciBtaW5pbW9uZ28tY2FjaGVcclxuICAgICAgICAvLyBzb21lIGlkcyBpbmNsdWRlIGEgbWludXMgc2lnbiBpbiBmcm9udCBvZiB0aGVtIGFuZCB3ZSBuZWVkIHRvIHN0cmlwIHRoYXQgZmlyc3RcclxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2luUHJvZ3Jlc3MtdGVhbS9yZWFjdC1uYXRpdmUtbWV0ZW9yL2lzc3Vlcy8xODUgZm9yIGRldGFpbHNcclxuICAgICAgICBjb25zdCBjbGVhbkFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhhcnRpY2xlSWQpO1xyXG4gICAgICAgIGNvbnN0IGFydGljbGUgPSBOZXdzQXJ0aWNsZXMuZmluZE9uZShjbGVhbkFydGljbGVJZCk7XHJcblxyXG4gICAgICAgIGlmICghYXJ0aWNsZSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgJ0FydGljbGUgbm90IGZvdW5kJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB7IGRhdGVTY3JhcGVkIH0gPSBhcnRpY2xlO1xyXG5cclxuICAgICAgICByZXR1cm4gQXJjaGl2ZS5pbnNlcnQoe1xyXG4gICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLFxyXG4gICAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgYXJ0aWNsZVB1Ymxpc2hlZERhdGU6IGRhdGVTY3JhcGVkLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlbW92ZXMgYSBuZXdzIGFydGljbGUgZnJvbSB0aGUgYXJjaGl2ZSBvZiB0aGUgY3VycmVudCB1c2VyLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSBhcnRpY2xlSWRcclxuICAgICAqICAgICAgICAgIGlkIG9mIHRoZSBuZXdzIGFydGljbGUgdGhhdCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgYXJjaGl2ZVxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHthbnl9XHJcbiAgICAgKiAgICAgICAgICBudW1iZXIgb2YgcmVtb3ZlZCBkb2N1bWVudHNcclxuICAgICAqL1xyXG4gICAgJ2FyY2hpdmUuYXJ0aWNsZS5yZW1vdmUnKGFydGljbGVJZCkge1xyXG4gICAgICAgIGNoZWNrKGFydGljbGVJZCwgU3RyaW5nKTtcclxuXHJcbiAgICAgICAgY29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xyXG4gICAgICAgIGlmICghdXNlcklkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnUGVybWlzc2lvbiBEZW5pZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGR1ZSB0byBhIGJ1ZyBpbiByZWFjdC1uYXRpdmUtbWV0ZW9yIGFuZC9vciBtaW5pbW9uZ28tY2FjaGVcclxuICAgICAgICAvLyBzb21lIGlkcyBpbmNsdWRlIGEgbWludXMgc2lnbiBpbiBmcm9udCBvZiB0aGVtIGFuZCB3ZSBuZWVkIHRvIHN0cmlwIHRoYXQgZmlyc3RcclxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2luUHJvZ3Jlc3MtdGVhbS9yZWFjdC1uYXRpdmUtbWV0ZW9yL2lzc3Vlcy8xODUgZm9yIGRldGFpbHNcclxuICAgICAgICBjb25zdCBjbGVhbkFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhhcnRpY2xlSWQpO1xyXG4gICAgICAgIHJldHVybiBBcmNoaXZlLnVwZGF0ZSh7XHJcbiAgICAgICAgICAgIGFydGljbGVJZDogY2xlYW5BcnRpY2xlSWQsXHJcbiAgICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgICAgcmVtb3ZlZEF0OiB7XHJcbiAgICAgICAgICAgICAgICAkZXhpc3RzOiBmYWxzZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICRzZXQ6IHtcclxuICAgICAgICAgICAgICAgIHJlbW92ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIG11bHRpOiB0cnVlLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbn0pO1xyXG4iLCJpbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XG5pbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjayc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IE5ld3NBcnRpY2xlcyB9IGZyb20gJy4vYXJ0aWNsZXMnO1xuaW1wb3J0IHsgcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nIH0gZnJvbSAnLi4vbGliL3V0aWxzL3V0aWxzX3N0cmluZyc7XG5cbmV4cG9ydCBjb25zdCBBcnRpY2xlTGlrZXMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignYXJ0aWNsZUxpa2VzJyk7XG5leHBvcnQgY29uc3QgQXJ0aWNsZVRvdGFsTGlrZXMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignYXJ0aWNsZVRvdGFsTGlrZXMnKTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXG4gICAgJ2FydGljbGVMaWtlcy5pbnNlcnQnKGFydGljbGVJZCwgYXJ0aWNsZVF1ZXN0aW9uSWQsIGV4cGVyaW1lbnRJZCkge1xuICAgICAgICBjaGVjayhhcnRpY2xlSWQsIFN0cmluZyk7XG4gICAgICAgIGNoZWNrKGFydGljbGVRdWVzdGlvbklkLCBTdHJpbmcpO1xuICAgICAgICBjaGVjayhleHBlcmltZW50SWQsIFN0cmluZyk7XG5cbiAgICAgICAgY29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xuICAgICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZHVlIHRvIGEgYnVnIGluIHJlYWN0LW5hdGl2ZS1tZXRlb3IgYW5kL29yIG1pbmltb25nby1jYWNoZVxuICAgICAgICAvLyBzb21lIGlkcyBpbmNsdWRlIGEgbWludXMgc2lnbiBpbiBmcm9udCBvZiB0aGVtIGFuZCB3ZSBuZWVkIHRvIHN0cmlwIHRoYXQgZmlyc3RcbiAgICAgICAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9pblByb2dyZXNzLXRlYW0vcmVhY3QtbmF0aXZlLW1ldGVvci9pc3N1ZXMvMTg1IGZvciBkZXRhaWxzXG4gICAgICAgIGNvbnN0IGNsZWFuQXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGFydGljbGVJZCk7XG4gICAgICAgIGNvbnN0IGFydGljbGUgPSBOZXdzQXJ0aWNsZXMuZmluZE9uZShjbGVhbkFydGljbGVJZCk7XG5cbiAgICAgICAgaWYgKCFhcnRpY2xlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgJ0FydGljbGUgbm90IGZvdW5kJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcnRpY2xlVG90YWxMaWtlc0Rpc2xpa2VzID0gQXJ0aWNsZVRvdGFsTGlrZXMuZmluZE9uZSh7XG4gICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLFxuICAgICAgICAgICAgZXhwZXJpbWVudElkLFxuICAgICAgICB9KTtcbiAgICAgICAgbGV0IHF1ZXN0aW9uc0FycmF5O1xuICAgICAgICBpZiAoIWFydGljbGVUb3RhbExpa2VzRGlzbGlrZXMpIHtcbiAgICAgICAgICAgIEFydGljbGVUb3RhbExpa2VzLmluc2VydCh7XG4gICAgICAgICAgICAgICAgYXJ0aWNsZUlkOiBjbGVhbkFydGljbGVJZCxcbiAgICAgICAgICAgICAgICBleHBlcmltZW50SWQsXG4gICAgICAgICAgICAgICAgY291bnRzOiBbXSxcbiAgICAgICAgICAgICAgICBxdWVzdGlvbnM6IFtdLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBxdWVzdGlvbnNBcnJheSA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcXVlc3Rpb25zQXJyYXkgPSBhcnRpY2xlVG90YWxMaWtlc0Rpc2xpa2VzLnF1ZXN0aW9ucztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChxdWVzdGlvbnNBcnJheS5pbmNsdWRlcyhhcnRpY2xlUXVlc3Rpb25JZCkpIHtcbiAgICAgICAgICAgIEFydGljbGVUb3RhbExpa2VzLnVwZGF0ZSh7XG4gICAgICAgICAgICAgICAgYXJ0aWNsZUlkOiBjbGVhbkFydGljbGVJZCxcbiAgICAgICAgICAgICAgICBleHBlcmltZW50SWQsXG4gICAgICAgICAgICAgICAgJ2NvdW50cy5hcnRpY2xlUXVlc3Rpb25JZCc6IGFydGljbGVRdWVzdGlvbklkLFxuICAgICAgICAgICAgfSwgeyAkaW5jOiB7ICdjb3VudHMuJC5jb3VudExpa2VzJzogMSB9IH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQXJ0aWNsZVRvdGFsTGlrZXMudXBkYXRlKHtcbiAgICAgICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLFxuICAgICAgICAgICAgICAgIGV4cGVyaW1lbnRJZCxcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICAkcHVzaDoge1xuICAgICAgICAgICAgICAgICAgICBjb3VudHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFydGljbGVRdWVzdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnRMaWtlczogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50RGlzbGlrZXM6IDAsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHF1ZXN0aW9uczogYXJ0aWNsZVF1ZXN0aW9uSWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIEFydGljbGVMaWtlcy5pbnNlcnQoe1xuICAgICAgICAgICAgYXJ0aWNsZUlkOiBjbGVhbkFydGljbGVJZCxcbiAgICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICAgIGFydGljbGVRdWVzdGlvbklkLFxuICAgICAgICAgICAgYXJ0aWNsZUFuc3dlcjogMSxcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgJ2FydGljbGVMaWtlcy5yZW1vdmUnKGFydGljbGVJZCwgYXJ0aWNsZVF1ZXN0aW9uSWQsIGV4cGVyaW1lbnRJZCkge1xuICAgICAgICBjaGVjayhhcnRpY2xlSWQsIFN0cmluZyk7XG4gICAgICAgIGNoZWNrKGFydGljbGVRdWVzdGlvbklkLCBTdHJpbmcpO1xuICAgICAgICBjaGVjayhleHBlcmltZW50SWQsIFN0cmluZyk7XG5cbiAgICAgICAgY29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xuICAgICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZHVlIHRvIGEgYnVnIGluIHJlYWN0LW5hdGl2ZS1tZXRlb3IgYW5kL29yIG1pbmltb25nby1jYWNoZVxuICAgICAgICAvLyBzb21lIGlkcyBpbmNsdWRlIGEgbWludXMgc2lnbiBpbiBmcm9udCBvZiB0aGVtIGFuZCB3ZSBuZWVkIHRvIHN0cmlwIHRoYXQgZmlyc3RcbiAgICAgICAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9pblByb2dyZXNzLXRlYW0vcmVhY3QtbmF0aXZlLW1ldGVvci9pc3N1ZXMvMTg1IGZvciBkZXRhaWxzXG4gICAgICAgIGNvbnN0IGNsZWFuQXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGFydGljbGVJZCk7XG5cbiAgICAgICAgQXJ0aWNsZVRvdGFsTGlrZXMudXBkYXRlKHtcbiAgICAgICAgICAgIGFydGljbGVJZDogY2xlYW5BcnRpY2xlSWQsXG4gICAgICAgICAgICBleHBlcmltZW50SWQsXG4gICAgICAgICAgICAnY291bnRzLmFydGljbGVRdWVzdGlvbklkJzogYXJ0aWNsZVF1ZXN0aW9uSWQsXG4gICAgICAgIH0sIHsgJGluYzogeyAnY291bnRzLiQuY291bnRMaWtlcyc6IC0xIH0gfSk7XG5cbiAgICAgICAgY29uc3QgYXJ0aWNsZUxpa2UgPSBBcnRpY2xlTGlrZXMuZmluZE9uZSh7XG4gICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLCB1c2VySWQsIGFydGljbGVRdWVzdGlvbklkLCBhcnRpY2xlQW5zd2VyOiAxLFxuICAgICAgICB9LFxuICAgICAgICB7IHNvcnQ6IHsgY3JlYXRlZEF0OiAtMSB9IH0pO1xuICAgICAgICByZXR1cm4gQXJ0aWNsZUxpa2VzLnVwZGF0ZShhcnRpY2xlTGlrZSwgeyAkc2V0OiB7IHJlbW92ZWRBdDogbmV3IERhdGUoKSB9IH0pO1xuICAgIH0sXG5cbiAgICAnYXJ0aWNsZURpc2xpa2VzLmluc2VydCcoYXJ0aWNsZUlkLCBhcnRpY2xlUXVlc3Rpb25JZCwgZXhwZXJpbWVudElkKSB7XG4gICAgICAgIGNoZWNrKGFydGljbGVJZCwgU3RyaW5nKTtcbiAgICAgICAgY2hlY2soYXJ0aWNsZVF1ZXN0aW9uSWQsIFN0cmluZyk7XG4gICAgICAgIGNoZWNrKGV4cGVyaW1lbnRJZCwgU3RyaW5nKTtcblxuICAgICAgICBjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG4gICAgICAgIGlmICghdXNlcklkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkdWUgdG8gYSBidWcgaW4gcmVhY3QtbmF0aXZlLW1ldGVvciBhbmQvb3IgbWluaW1vbmdvLWNhY2hlXG4gICAgICAgIC8vIHNvbWUgaWRzIGluY2x1ZGUgYSBtaW51cyBzaWduIGluIGZyb250IG9mIHRoZW0gYW5kIHdlIG5lZWQgdG8gc3RyaXAgdGhhdCBmaXJzdFxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2luUHJvZ3Jlc3MtdGVhbS9yZWFjdC1uYXRpdmUtbWV0ZW9yL2lzc3Vlcy8xODUgZm9yIGRldGFpbHNcbiAgICAgICAgY29uc3QgY2xlYW5BcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoYXJ0aWNsZUlkKTtcbiAgICAgICAgY29uc3QgYXJ0aWNsZSA9IE5ld3NBcnRpY2xlcy5maW5kT25lKGNsZWFuQXJ0aWNsZUlkKTtcblxuICAgICAgICBpZiAoIWFydGljbGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCAnQXJ0aWNsZSBub3QgZm91bmQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFydGljbGVUb3RhbExpa2VzRGlzbGlrZXMgPSBBcnRpY2xlVG90YWxMaWtlcy5maW5kT25lKHtcbiAgICAgICAgICAgIGFydGljbGVJZDogY2xlYW5BcnRpY2xlSWQsXG4gICAgICAgICAgICBleHBlcmltZW50SWQsXG4gICAgICAgIH0pO1xuICAgICAgICBsZXQgcXVlc3Rpb25zQXJyYXk7XG4gICAgICAgIGlmICghYXJ0aWNsZVRvdGFsTGlrZXNEaXNsaWtlcykge1xuICAgICAgICAgICAgQXJ0aWNsZVRvdGFsTGlrZXMuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLFxuICAgICAgICAgICAgICAgIGV4cGVyaW1lbnRJZCxcbiAgICAgICAgICAgICAgICBjb3VudHM6IFtdLFxuICAgICAgICAgICAgICAgIHF1ZXN0aW9uczogW10sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHF1ZXN0aW9uc0FycmF5ID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBxdWVzdGlvbnNBcnJheSA9IGFydGljbGVUb3RhbExpa2VzRGlzbGlrZXMucXVlc3Rpb25zO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1ZXN0aW9uc0FycmF5LmluY2x1ZGVzKGFydGljbGVRdWVzdGlvbklkKSkge1xuICAgICAgICAgICAgQXJ0aWNsZVRvdGFsTGlrZXMudXBkYXRlKHtcbiAgICAgICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLFxuICAgICAgICAgICAgICAgIGV4cGVyaW1lbnRJZCxcbiAgICAgICAgICAgICAgICAnY291bnRzLmFydGljbGVRdWVzdGlvbklkJzogYXJ0aWNsZVF1ZXN0aW9uSWQsXG4gICAgICAgICAgICB9LCB7ICRpbmM6IHsgJ2NvdW50cy4kLmNvdW50RGlzbGlrZXMnOiAxIH0gfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBBcnRpY2xlVG90YWxMaWtlcy51cGRhdGUoe1xuICAgICAgICAgICAgICAgIGFydGljbGVJZDogY2xlYW5BcnRpY2xlSWQsXG4gICAgICAgICAgICAgICAgZXhwZXJpbWVudElkLFxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgICRwdXNoOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvdW50czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJ0aWNsZVF1ZXN0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudExpa2VzOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnREaXNsaWtlczogMSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcXVlc3Rpb25zOiBhcnRpY2xlUXVlc3Rpb25JZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gQXJ0aWNsZUxpa2VzLmluc2VydCh7XG4gICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLFxuICAgICAgICAgICAgdXNlcklkLFxuICAgICAgICAgICAgYXJ0aWNsZVF1ZXN0aW9uSWQsXG4gICAgICAgICAgICBhcnRpY2xlQW5zd2VyOiAtMSxcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgJ2FydGljbGVEaXNsaWtlcy5yZW1vdmUnKGFydGljbGVJZCwgYXJ0aWNsZVF1ZXN0aW9uSWQsIGV4cGVyaW1lbnRJZCkge1xuICAgICAgICBjaGVjayhhcnRpY2xlSWQsIFN0cmluZyk7XG4gICAgICAgIGNoZWNrKGFydGljbGVRdWVzdGlvbklkLCBTdHJpbmcpO1xuICAgICAgICBjaGVjayhleHBlcmltZW50SWQsIFN0cmluZyk7XG5cbiAgICAgICAgY29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xuICAgICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZHVlIHRvIGEgYnVnIGluIHJlYWN0LW5hdGl2ZS1tZXRlb3IgYW5kL29yIG1pbmltb25nby1jYWNoZVxuICAgICAgICAvLyBzb21lIGlkcyBpbmNsdWRlIGEgbWludXMgc2lnbiBpbiBmcm9udCBvZiB0aGVtIGFuZCB3ZSBuZWVkIHRvIHN0cmlwIHRoYXQgZmlyc3RcbiAgICAgICAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9pblByb2dyZXNzLXRlYW0vcmVhY3QtbmF0aXZlLW1ldGVvci9pc3N1ZXMvMTg1IGZvciBkZXRhaWxzXG4gICAgICAgIGNvbnN0IGNsZWFuQXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGFydGljbGVJZCk7XG5cbiAgICAgICAgQXJ0aWNsZVRvdGFsTGlrZXMudXBkYXRlKHtcbiAgICAgICAgICAgIGFydGljbGVJZDogY2xlYW5BcnRpY2xlSWQsXG4gICAgICAgICAgICBleHBlcmltZW50SWQsXG4gICAgICAgICAgICAnY291bnRzLmFydGljbGVRdWVzdGlvbklkJzogYXJ0aWNsZVF1ZXN0aW9uSWQsXG4gICAgICAgIH0sIHsgJGluYzogeyAnY291bnRzLiQuY291bnREaXNsaWtlcyc6IC0xIH0gfSk7XG5cbiAgICAgICAgY29uc3QgYXJ0aWNsZURpc2xpa2UgPSBBcnRpY2xlTGlrZXMuZmluZE9uZSh7XG4gICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLCB1c2VySWQsIGFydGljbGVRdWVzdGlvbklkLCBhcnRpY2xlQW5zd2VyOiAtMSxcbiAgICAgICAgfSxcbiAgICAgICAgeyBzb3J0OiB7IGNyZWF0ZWRBdDogLTEgfSB9KTtcbiAgICAgICAgcmV0dXJuIEFydGljbGVMaWtlcy51cGRhdGUoYXJ0aWNsZURpc2xpa2UsIHsgJHNldDogeyByZW1vdmVkQXQ6IG5ldyBEYXRlKCkgfSB9KTtcbiAgICB9LFxuXG59KTtcbiIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcclxuaW1wb3J0IHsgY2hlY2sgfSBmcm9tICdtZXRlb3IvY2hlY2snO1xyXG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcclxuaW1wb3J0IHsgTmV3c0FydGljbGVzIH0gZnJvbSAnLi9hcnRpY2xlcyc7XHJcbmltcG9ydCB7IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyB9IGZyb20gJy4uL2xpYi91dGlscy91dGlsc19zdHJpbmcnO1xyXG5cclxuZXhwb3J0IGNvbnN0IEFydGljbGVWaWV3cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdhcnRpY2xlVmlld3MnKTtcclxuXHJcbk1ldGVvci5tZXRob2RzKHtcclxuXHJcbiAgICAnYXJ0aWNsZVZpZXdzLmFkZCcoYXJ0aWNsZUlkKSB7XHJcbiAgICAgICAgY2hlY2soYXJ0aWNsZUlkLCBTdHJpbmcpO1xyXG5cclxuICAgICAgICBjb25zdCB7IHVzZXJJZCB9ID0gdGhpcztcclxuXHJcbiAgICAgICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsICdQZXJtaXNzaW9uIERlbmllZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYXJ0aWNsZSA9IE5ld3NBcnRpY2xlcy5maW5kT25lKGFydGljbGVJZCk7XHJcblxyXG4gICAgICAgIGlmICghYXJ0aWNsZSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgJ0FydGljbGUgbm90IGZvdW5kJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB7IGRhdGVTY3JhcGVkIH0gPSBhcnRpY2xlO1xyXG5cclxuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIC8vIG5vIG5lZWQgZm9yIHJlYWN0aXZpdHkgaW4gdGhpcyBvcGVyYXRpb25cclxuICAgICAgICByZXR1cm4gQXJ0aWNsZVZpZXdzLnJhd0NvbGxlY3Rpb24oKS5maW5kQW5kTW9kaWZ5KFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICAgICAgICBhcnRpY2xlSWQsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHsgY3JlYXRlZEF0OiAtMSB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAkc2V0T25JbnNlcnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IG5vdyxcclxuICAgICAgICAgICAgICAgICAgICBhcnRpY2xlUHVibGlzaGVkRGF0ZTogZGF0ZVNjcmFwZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbWF4U2Nyb2xsZWRDb250ZW50OiAwLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICRzZXQ6IHsgdXBkYXRlZEF0OiBub3cgfSxcclxuICAgICAgICAgICAgICAgICRpbmM6IHsgdmlld3M6IDEgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgeyB1cHNlcnQ6IHRydWUgfVxyXG4gICAgICAgICk7XHJcbiAgICB9LFxyXG5cclxuICAgICdhcnRpY2xlVmlld3MuZHVyYXRpb24udXBkYXRlJyhhcnRpY2xlSWQpIHtcclxuICAgICAgICBjaGVjayhhcnRpY2xlSWQsIFN0cmluZyk7XHJcblxyXG4gICAgICAgIGNvbnN0IHsgdXNlcklkIH0gPSB0aGlzO1xyXG5cclxuICAgICAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIGNvbnN0IHZpZXcgPSBBcnRpY2xlVmlld3MuZmluZE9uZSh7IHVzZXJJZCwgYXJ0aWNsZUlkIH0pO1xyXG4gICAgICAgIGNvbnN0IGR1cmF0aW9uSW5jcmVtZW50ID0gbm93IC0gdmlldy51cGRhdGVkQXQ7XHJcbiAgICAgICAgcmV0dXJuIEFydGljbGVWaWV3cy51cGRhdGUodmlldywgeyAkaW5jOiB7IGR1cmF0aW9uOiBkdXJhdGlvbkluY3JlbWVudCB9IH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAnYXJ0aWNsZVZpZXdzLm1heFNjcm9sbGVkQ29udGVudC51cGRhdGUnKGFydGljbGVJZCwgbWF4U2Nyb2xsZWRDb250ZW50KSB7XHJcbiAgICAgICAgY2hlY2soYXJ0aWNsZUlkLCBTdHJpbmcpO1xyXG5cclxuICAgICAgICBjb25zdCB7IHVzZXJJZCB9ID0gdGhpcztcclxuXHJcbiAgICAgICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsICdQZXJtaXNzaW9uIERlbmllZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2xlYW5BcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoYXJ0aWNsZUlkKTtcclxuICAgICAgICByZXR1cm4gQXJ0aWNsZVZpZXdzLnVwZGF0ZSh7IHVzZXJJZCwgYXJ0aWNsZUlkOiBjbGVhbkFydGljbGVJZCB9LCB7ICRtYXg6IHsgbWF4U2Nyb2xsZWRDb250ZW50IH0gfSk7XHJcbiAgICB9LFxyXG5cclxufSk7XHJcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xyXG5pbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjayc7XHJcbmltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcclxuaW1wb3J0IHsgUmVhZGluZ0xpc3QgfSBmcm9tICcuL3JlYWRpbmdMaXN0JztcclxuaW1wb3J0IHsgQXJjaGl2ZSB9IGZyb20gJy4vYXJjaGl2ZSc7XHJcbmltcG9ydCB7IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyB9IGZyb20gJy4uL2xpYi91dGlscy91dGlsc19zdHJpbmcnO1xyXG5cclxuZXhwb3J0IGNvbnN0IE5ld3NBcnRpY2xlcyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCduZXdzQXJ0aWNsZXMnKTtcclxuZXhwb3J0IGNvbnN0IE5ld3NBcnRpY2xlc0pvaW5lZCA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCduZXdzQXJ0aWNsZXNKb2luZWQnKTtcclxuZXhwb3J0IGNvbnN0IE5ld3NBcnRpY2xlc0luUmVhZGluZ0xpc3QgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignbmV3c0FydGljbGVzSW5SZWFkaW5nTGlzdCcpO1xyXG5leHBvcnQgY29uc3QgTmV3c0FydGljbGVzSW5BcmNoaXZlID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ25ld3NBcnRpY2xlc0luQXJjaGl2ZScpO1xyXG5leHBvcnQgY29uc3QgRnVydGhlclJlY29tbWVuZGVkTmV3c0FydGljbGVzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ2Z1cnRoZXJSZWNvbW1lbmRlZE5ld3NBcnRpY2xlcycpO1xyXG5cclxuXHJcbk1ldGVvci5tZXRob2RzKHtcclxuICAgICduZXdzQXJ0aWNsZXMuYm9va21hcmsudXBkYXRlJyhhcnRpY2xlSWQpIHtcclxuICAgICAgICBjaGVjayhhcnRpY2xlSWQsIFN0cmluZyk7XHJcblxyXG4gICAgICAgIC8vIGR1ZSB0byBhIGJ1ZyBpbiByZWFjdC1uYXRpdmUtbWV0ZW9yIGFuZC9vciBtaW5pbW9uZ28tY2FjaGVcclxuICAgICAgICAvLyBzb21lIGlkcyBpbmNsdWRlIGEgbWludXMgc2lnbiBpbiBmcm9udCBvZiB0aGVtIGFuZCB3ZSBuZWVkIHRvIHN0cmlwIHRoYXQgZmlyc3RcclxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2luUHJvZ3Jlc3MtdGVhbS9yZWFjdC1uYXRpdmUtbWV0ZW9yL2lzc3Vlcy8xODUgZm9yIGRldGFpbHNcclxuICAgICAgICBjb25zdCBjbGVhbkFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhhcnRpY2xlSWQpO1xyXG5cclxuICAgICAgICBjb25zdCB7IHVzZXJJZCB9ID0gdGhpcztcclxuICAgICAgICBjb25zdCBpc0luUmVhZGluZ0xpc3QgPSBSZWFkaW5nTGlzdC5maW5kKHtcclxuICAgICAgICAgICAgYXJ0aWNsZUlkOiBjbGVhbkFydGljbGVJZCxcclxuICAgICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgICByZW1vdmVkQXQ6IHtcclxuICAgICAgICAgICAgICAgICRleGlzdHM6IGZhbHNlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLmNvdW50KCkgPiAwO1xyXG5cclxuICAgICAgICBpZiAoaXNJblJlYWRpbmdMaXN0KSB7XHJcbiAgICAgICAgICAgIE1ldGVvci5jYWxsKCdyZWFkaW5nTGlzdC5hcnRpY2xlLnJlbW92ZScsIGNsZWFuQXJ0aWNsZUlkKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBNZXRlb3IuY2FsbCgncmVhZGluZ0xpc3QuYXJ0aWNsZS5hZGQnLCBjbGVhbkFydGljbGVJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAnbmV3c0FydGljbGVzLmZhdm91cml0ZS51cGRhdGUnKGFydGljbGVJZCkge1xyXG4gICAgICAgIGNoZWNrKGFydGljbGVJZCwgU3RyaW5nKTtcclxuXHJcbiAgICAgICAgLy8gZHVlIHRvIGEgYnVnIGluIHJlYWN0LW5hdGl2ZS1tZXRlb3IgYW5kL29yIG1pbmltb25nby1jYWNoZVxyXG4gICAgICAgIC8vIHNvbWUgaWRzIGluY2x1ZGUgYSBtaW51cyBzaWduIGluIGZyb250IG9mIHRoZW0gYW5kIHdlIG5lZWQgdG8gc3RyaXAgdGhhdCBmaXJzdFxyXG4gICAgICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vaW5Qcm9ncmVzcy10ZWFtL3JlYWN0LW5hdGl2ZS1tZXRlb3IvaXNzdWVzLzE4NSBmb3IgZGV0YWlsc1xyXG4gICAgICAgIGNvbnN0IGNsZWFuQXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGFydGljbGVJZCk7XHJcblxyXG4gICAgICAgIGNvbnN0IHsgdXNlcklkIH0gPSB0aGlzO1xyXG4gICAgICAgIGNvbnN0IGlzSW5BcmNoaXZlID0gQXJjaGl2ZS5maW5kKHtcclxuICAgICAgICAgICAgYXJ0aWNsZUlkOiBjbGVhbkFydGljbGVJZCxcclxuICAgICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgICByZW1vdmVkQXQ6IHtcclxuICAgICAgICAgICAgICAgICRleGlzdHM6IGZhbHNlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLmNvdW50KCkgPiAwO1xyXG5cclxuICAgICAgICBpZiAoaXNJbkFyY2hpdmUpIHtcclxuICAgICAgICAgICAgTWV0ZW9yLmNhbGwoJ2FyY2hpdmUuYXJ0aWNsZS5yZW1vdmUnLCBjbGVhbkFydGljbGVJZCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgTWV0ZW9yLmNhbGwoJ2FyY2hpdmUuYXJ0aWNsZS5hZGQnLCBjbGVhbkFydGljbGVJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyAnbmV3c0FydGljbGVzLmNvdW50JyhsaW1pdCA9IDIwKSB7XHJcbiAgICAvLyAgICAgICAgIHJldHVybiBOZXdzQXJ0aWNsZXNKb2luZWQuZmluZChsaW1pdCkuY291bnQoKVxyXG4gICAgLy8gfVxyXG5cclxufSk7XHJcbiIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IGNoZWNrLCBNYXRjaCB9IGZyb20gJ21ldGVvci9jaGVjayc7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICdtZXRlb3IvcmFuZG9tJztcbmltcG9ydCB7IHVzZXJJc0luUm9sZSwgdXNlck93bnNFeHBlcmltZW50IH0gZnJvbSAnLi4vbGliL3V0aWxzL3V0aWxzX2FjY291bnQnO1xuaW1wb3J0IEV4cGVyaW1lbnQgZnJvbSAnLi4vdWkvbW9kdWxlcy9leHBlcmltZW50cy9FeHBlcmltZW50JztcblxuZXhwb3J0IGRlZmF1bHQgRXhwZXJpbWVudHMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignZXhwZXJpbWVudHMnKTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXG4gICAgJ2V4cGVyaW1lbnRzLmNyZWF0ZScobmFtZSkge1xuICAgICAgICBjaGVjayhuYW1lLCBTdHJpbmcpO1xuXG4gICAgICAgIGlmICghdXNlcklzSW5Sb2xlKCdhZG1pbicpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBleHBlcmltZW50SWQgPSBFeHBlcmltZW50cy5pbnNlcnQoe1xuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIHRlc3RpbmdQaGFzZTogdHJ1ZSxcbiAgICAgICAgICAgIGRpc2xpa2VTdXJ2ZXk6IHtcbiAgICAgICAgICAgICAgICBxdWVzdGlvbjogJ0RlZmF1bHQgZGlzbGlrZSBxdWVzdGlvbicsXG4gICAgICAgICAgICAgICAgYW5zd2VyczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfaWQ6IFJhbmRvbS5pZCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJ0RlZmF1bHQgZGlzbGlrZSBhbnN3ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDAsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaWtlU3VydmV5OiB7XG4gICAgICAgICAgICAgICAgcXVlc3Rpb246ICdEZWZhdWx0IGxpa2UgcXVlc3Rpb24nLFxuICAgICAgICAgICAgICAgIGFuc3dlcnM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6ICdEZWZhdWx0IGxpa2UgYW5zd2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICBNZXRlb3IudXNlcnMudXBkYXRlKHsgX2lkOiBNZXRlb3IudXNlcklkKCkgfSwge1xuICAgICAgICAgICAgJHB1c2g6IHtcbiAgICAgICAgICAgICAgICBleHBlcmltZW50czoge1xuICAgICAgICAgICAgICAgICAgICBleHBlcmltZW50OiBleHBlcmltZW50SWQsXG4gICAgICAgICAgICAgICAgICAgIGFjY2Vzc0xldmVsOiAwLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZXhwZXJpbWVudElkO1xuICAgIH0sXG5cbiAgICAnZXhwZXJpbWVudHMucmVtb3ZlJyhleHBlcmltZW50SWQpIHtcbiAgICAgICAgY2hlY2soZXhwZXJpbWVudElkLCBTdHJpbmcpO1xuXG4gICAgICAgIGlmICghdXNlcklzSW5Sb2xlKCdhZG1pbicpIHx8ICF1c2VyT3duc0V4cGVyaW1lbnQoZXhwZXJpbWVudElkKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgRXhwZXJpbWVudHMucmVtb3ZlKGV4cGVyaW1lbnRJZCk7XG4gICAgfSxcblxuICAgICdleHBlcmltZW50cy51cGRhdGUnKGV4cGVyaW1lbnQpIHtcbiAgICAgICAgY2hlY2soZXhwZXJpbWVudCwge1xuICAgICAgICAgICAgX2lkOiBTdHJpbmcsXG4gICAgICAgICAgICBuYW1lOiBTdHJpbmcsXG4gICAgICAgICAgICB0ZXN0aW5nUGhhc2U6IEJvb2xlYW4sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghdXNlcklzSW5Sb2xlKCdhZG1pbicpIHx8ICF1c2VyT3duc0V4cGVyaW1lbnQoZXhwZXJpbWVudC5faWQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBFeHBlcmltZW50cy51cGRhdGUoeyBfaWQ6IGV4cGVyaW1lbnQuX2lkIH0sIHtcbiAgICAgICAgICAgICRzZXQ6IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBleHBlcmltZW50Lm5hbWUsXG4gICAgICAgICAgICAgICAgdGVzdGluZ1BoYXNlOiBleHBlcmltZW50LnRlc3RpbmdQaGFzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgICdleHBlcmltZW50cy5sYXVuY2gnKGV4cGVyaW1lbnRJZCkge1xuICAgICAgICBjaGVjayhleHBlcmltZW50SWQsIFN0cmluZyk7XG5cbiAgICAgICAgaWYgKCF1c2VySXNJblJvbGUoJ2FkbWluJykgfHwgIXVzZXJPd25zRXhwZXJpbWVudChleHBlcmltZW50SWQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBFeHBlcmltZW50cy51cGRhdGUoeyBfaWQ6IGV4cGVyaW1lbnRJZCB9LCB7XG4gICAgICAgICAgICAkc2V0OiB7XG4gICAgICAgICAgICAgICAgdGVzdGluZ1BoYXNlOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAnZXhwZXJpbWVudHMuZGlzbGlrZVN1cnZleS51cGRhdGUnKGV4cGVyaW1lbnRJZCwgZGlzbGlrZVN1cnZleSkge1xuICAgICAgICBjaGVjayhleHBlcmltZW50SWQsIFN0cmluZyk7XG4gICAgICAgIGNoZWNrKGRpc2xpa2VTdXJ2ZXksIHtcbiAgICAgICAgICAgIHF1ZXN0aW9uOiBTdHJpbmcsXG4gICAgICAgICAgICBhbnN3ZXJzOiBbe1xuICAgICAgICAgICAgICAgIF9pZDogU3RyaW5nLFxuICAgICAgICAgICAgICAgIHRleHQ6IFN0cmluZyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogTnVtYmVyLFxuICAgICAgICAgICAgfV0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghdXNlcklzSW5Sb2xlKCdhZG1pbicpIHx8ICF1c2VyT3duc0V4cGVyaW1lbnQoZXhwZXJpbWVudElkKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgRXhwZXJpbWVudHMudXBkYXRlKHsgX2lkOiBleHBlcmltZW50SWQgfSwge1xuICAgICAgICAgICAgJHNldDoge1xuICAgICAgICAgICAgICAgIGRpc2xpa2VTdXJ2ZXksXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgIH0sXG4gICAgJ2V4cGVyaW1lbnRzLmxpa2VTdXJ2ZXkudXBkYXRlJyhleHBlcmltZW50SWQsIGxpa2VTdXJ2ZXkpIHtcblxuICAgICAgICBjaGVjayhleHBlcmltZW50SWQsIFN0cmluZyk7XG4gICAgICAgIGNoZWNrKGxpa2VTdXJ2ZXksIHtcbiAgICAgICAgICAgIHF1ZXN0aW9uOiBTdHJpbmcsXG4gICAgICAgICAgICBhbnN3ZXJzOiBbe1xuICAgICAgICAgICAgICAgIF9pZDogU3RyaW5nLFxuICAgICAgICAgICAgICAgIHRleHQ6IFN0cmluZyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogTnVtYmVyLFxuICAgICAgICAgICAgfV0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghdXNlcklzSW5Sb2xlKCdhZG1pbicpIHx8ICF1c2VyT3duc0V4cGVyaW1lbnQoZXhwZXJpbWVudElkKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgRXhwZXJpbWVudHMudXBkYXRlKHsgX2lkOiBleHBlcmltZW50SWQgfSwge1xuICAgICAgICAgICAgJHNldDoge1xuICAgICAgICAgICAgICAgIGxpa2VTdXJ2ZXksXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgJ2V4cGVyaW1lbnRzLmRpc2xpa2VTdXJ2ZXkucmVtb3ZlJyhleHBlcmltZW50SWQpIHtcbiAgICAgICAgaWYgKCF1c2VySXNJblJvbGUoJ2FkbWluJykgfHwgIXVzZXJPd25zRXhwZXJpbWVudChleHBlcmltZW50SWQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBFeHBlcmltZW50cy51cGRhdGUoeyBfaWQ6IGV4cGVyaW1lbnRJZCB9LCB7XG4gICAgICAgICAgICAkc2V0OiB7XG4gICAgICAgICAgICAgICAgZGlzbGlrZVN1cnZleTogbnVsbCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAnZXhwZXJpbWVudHMubGlrZVN1cnZleS5yZW1vdmUnKGV4cGVyaW1lbnRJZCkge1xuICAgICAgICBpZiAoIXVzZXJJc0luUm9sZSgnYWRtaW4nKSB8fCAhdXNlck93bnNFeHBlcmltZW50KGV4cGVyaW1lbnRJZCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnUGVybWlzc2lvbiBEZW5pZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIEV4cGVyaW1lbnRzLnVwZGF0ZSh7IF9pZDogZXhwZXJpbWVudElkIH0sIHtcbiAgICAgICAgICAgICRzZXQ6IHtcbiAgICAgICAgICAgICAgICBsaWtlU3VydmV5OiBudWxsLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgICdleHBlcmltZW50cy5hZGRVc2VycycoZXhwZXJpbWVudElkLCBhbW91bnQsIHVzZXJHcm91cCkge1xuICAgICAgICBjaGVjayhleHBlcmltZW50SWQsIFN0cmluZyk7XG4gICAgICAgIGNoZWNrKGFtb3VudCwgTWF0Y2guSW50ZWdlcik7XG4gICAgICAgIGNoZWNrKHVzZXJHcm91cCwgU3RyaW5nKTtcblxuICAgICAgICBpZiAoIXVzZXJJc0luUm9sZSgnYWRtaW4nKSB8fCAhdXNlck93bnNFeHBlcmltZW50KGV4cGVyaW1lbnRJZCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnUGVybWlzc2lvbiBEZW5pZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhbW91bnQgPiAzMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdUb28gbWFueSB1c2VycyByZXF1ZXN0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYW1vdW50OyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1VzZXIgPSB7XG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IFJhbmRvbS5pZCg1KSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZDogUmFuZG9tLmlkKDUpLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgbmV3VXNlcklkID0gQWNjb3VudHMuY3JlYXRlVXNlcihuZXdVc2VyKTtcbiAgICAgICAgICAgIE1ldGVvci51c2Vycy51cGRhdGUoeyBfaWQ6IG5ld1VzZXJJZCB9LCB7XG4gICAgICAgICAgICAgICAgJHNldDoge1xuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNpcGF0ZXNJbjogZXhwZXJpbWVudElkLFxuICAgICAgICAgICAgICAgICAgICB1c2VyR3JvdXAsXG4gICAgICAgICAgICAgICAgICAgIHBsYWludGV4dFBhc3N3b3JkOiBuZXdVc2VyLnBhc3N3b3JkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbn0pO1xuIiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xyXG5pbXBvcnQge01ldGVvcn0gZnJvbSBcIm1ldGVvci9tZXRlb3JcIjtcclxuaW1wb3J0IHtjaGVja30gZnJvbSBcIm1ldGVvci9jaGVja1wiO1xyXG5pbXBvcnQge3JlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZ30gZnJvbSBcIi4uL2xpYi91dGlscy91dGlsc19zdHJpbmdcIjtcclxuaW1wb3J0IHtOZXdzQXJ0aWNsZXN9IGZyb20gXCIuL2FydGljbGVzXCI7XHJcblxyXG5leHBvcnQgY29uc3QgRXhwbGFuYXRpb25zID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ2V4cGxhbmF0aW9ucycpO1xyXG5jb25zdCBleHBsYW5hdGlvblZpZXdzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ2V4cGxhbmF0aW9uVmlld3MnKTtcclxuXHJcbk1ldGVvci5tZXRob2RzKHtcclxuXHJcbiAgICAnZXhwbGFuYXRpb25WaWV3cy5pbnNlcnQnKGFydGljbGVJZCkge1xyXG4gICAgICAgIGNoZWNrKGFydGljbGVJZCwgU3RyaW5nKTtcclxuXHJcbiAgICAgICAgY29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xyXG4gICAgICAgIGlmICghdXNlcklkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnUGVybWlzc2lvbiBEZW5pZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGR1ZSB0byBhIGJ1ZyBpbiByZWFjdC1uYXRpdmUtbWV0ZW9yIGFuZC9vciBtaW5pbW9uZ28tY2FjaGVcclxuICAgICAgICAvLyBzb21lIGlkcyBpbmNsdWRlIGEgbWludXMgc2lnbiBpbiBmcm9udCBvZiB0aGVtIGFuZCB3ZSBuZWVkIHRvIHN0cmlwIHRoYXQgZmlyc3RcclxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2luUHJvZ3Jlc3MtdGVhbS9yZWFjdC1uYXRpdmUtbWV0ZW9yL2lzc3Vlcy8xODUgZm9yIGRldGFpbHNcclxuICAgICAgICBjb25zdCBjbGVhbkFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhhcnRpY2xlSWQpO1xyXG4gICAgICAgIGNvbnN0IGFydGljbGUgPSBOZXdzQXJ0aWNsZXMuZmluZE9uZShjbGVhbkFydGljbGVJZCk7XHJcblxyXG4gICAgICAgIGlmICghYXJ0aWNsZSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgJ0FydGljbGUgbm90IGZvdW5kJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZXhwbGFuYXRpb25WaWV3cy5pbnNlcnQoe1xyXG4gICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLFxyXG4gICAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9LFxyXG5cclxufSk7XHJcbiIsImltcG9ydCB7TW9uZ299IGZyb20gJ21ldGVvci9tb25nbyc7XHJcbmltcG9ydCB7Y2hlY2t9IGZyb20gJ21ldGVvci9jaGVjayc7XHJcbmltcG9ydCB7TWV0ZW9yfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcclxuaW1wb3J0IHtyZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmd9IGZyb20gJy4uL2xpYi91dGlscy91dGlsc19zdHJpbmcnO1xyXG5cclxuZXhwb3J0IGNvbnN0IFBhZ2VWaWV3cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdwYWdlVmlld3MnKTtcclxuXHJcbk1ldGVvci5tZXRob2RzKHtcclxuXHJcbiAgICAncGFnZVZpZXdzLmFkZCcocGFnZSwgcHJldmlvdXNQYWdlLCBjdXJyZW50UGFyYW1ldGVycywgcHJldlBhcmFtZXRlcnMpIHtcclxuICAgICAgICBjaGVjayhwYWdlLCBTdHJpbmcpO1xyXG4gICAgICAgIGNoZWNrKHByZXZpb3VzUGFnZSwgU3RyaW5nKTtcclxuICAgICAgICBjaGVjayhjdXJyZW50UGFyYW1ldGVycywgT2JqZWN0KTtcclxuICAgICAgICBjaGVjayhwcmV2UGFyYW1ldGVycywgT2JqZWN0KTtcclxuXHJcbiAgICAgICAgY29uc3Qge3VzZXJJZH0gPSB0aGlzO1xyXG5cclxuICAgICAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjdXJyZW50UGFyYW1ldGVyc0hhcmRDb3B5ID0gey4uLmN1cnJlbnRQYXJhbWV0ZXJzfTtcclxuICAgICAgICBpZiAoY3VycmVudFBhcmFtZXRlcnNIYXJkQ29weS5hcnRpY2xlSWQpIHtcclxuICAgICAgICAgICAgY3VycmVudFBhcmFtZXRlcnNIYXJkQ29weS5hcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoY3VycmVudFBhcmFtZXRlcnNIYXJkQ29weS5hcnRpY2xlSWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcHJldlBhcmFtZXRlcnNIYXJkQ29weSA9IHsuLi5wcmV2UGFyYW1ldGVyc307XHJcbiAgICAgICAgaWYgKHByZXZQYXJhbWV0ZXJzSGFyZENvcHkuYXJ0aWNsZUlkKSB7XHJcbiAgICAgICAgICAgIHByZXZQYXJhbWV0ZXJzSGFyZENvcHkuYXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKHByZXZQYXJhbWV0ZXJzSGFyZENvcHkuYXJ0aWNsZUlkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwYWdlID09PSAnQXJ0aWNsZScpIHtcclxuICAgICAgICAgICAgTWV0ZW9yLmNhbGwoJ2FydGljbGVWaWV3cy5hZGQnLCBjdXJyZW50UGFyYW1ldGVyc0hhcmRDb3B5LmFydGljbGVJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocHJldmlvdXNQYWdlID09PSAnQXJ0aWNsZScpIHtcclxuICAgICAgICAgICAgTWV0ZW9yLmNhbGwoJ2FydGljbGVWaWV3cy5kdXJhdGlvbi51cGRhdGUnLCBwcmV2UGFyYW1ldGVyc0hhcmRDb3B5LmFydGljbGVJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTYXZlIGluIFBhZ2VWaWV3cyBwYXJhbWV0ZXJzIG9mIGN1cnJlbnQgb3BlbiBzY3JlZW4sIHVubGVzcyB0aGUgcHJldmlvdXMgb25lIHdhcyBhbiBBcnRpY2xlIHNjcmVlblxyXG4gICAgICAgIGxldCBwYXJhbWV0ZXJzID0gY3VycmVudFBhcmFtZXRlcnNIYXJkQ29weTtcclxuICAgICAgICBpZiAocHJldmlvdXNQYWdlID09PSAnQXJ0aWNsZScpIHtcclxuICAgICAgICAgICAgcGFyYW1ldGVycyA9IHByZXZQYXJhbWV0ZXJzSGFyZENvcHk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gUGFnZVZpZXdzLmluc2VydCh7XHJcbiAgICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgICAgcGFnZSxcclxuICAgICAgICAgICAgcHJldmlvdXNQYWdlLFxyXG4gICAgICAgICAgICBwYXJhbWV0ZXJzLFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxufSk7XHJcbiIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcclxuaW1wb3J0IHsgY2hlY2sgfSBmcm9tICdtZXRlb3IvY2hlY2snO1xyXG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcclxuaW1wb3J0IHsgTmV3c0FydGljbGVzIH0gZnJvbSAnLi9hcnRpY2xlcyc7XHJcbmltcG9ydCB7IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyB9IGZyb20gJy4uL2xpYi91dGlscy91dGlsc19zdHJpbmcnO1xyXG5cclxuZXhwb3J0IGNvbnN0IFBvZGNhc3RBbmFseXRpY3MgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbigncG9kY2FzdEFuYWx5dGljcycpO1xyXG5cclxuTWV0ZW9yLm1ldGhvZHMoe1xyXG5cclxuICAgICdwb2RjYXN0QW5hbHl0aWNzLmluc2VydCcoYXJ0aWNsZUlkLCBhY3Rpb24sIHBvZGNhc3RUaW1lc3RhbXApIHtcclxuICAgICAgICBjaGVjayhhcnRpY2xlSWQsIFN0cmluZyk7XHJcbiAgICAgICAgY2hlY2soYWN0aW9uLCBTdHJpbmcpO1xyXG4gICAgICAgIGNoZWNrKHBvZGNhc3RUaW1lc3RhbXAsIE51bWJlcik7XHJcblxyXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcclxuICAgICAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBkdWUgdG8gYSBidWcgaW4gcmVhY3QtbmF0aXZlLW1ldGVvciBhbmQvb3IgbWluaW1vbmdvLWNhY2hlXHJcbiAgICAgICAgLy8gc29tZSBpZHMgaW5jbHVkZSBhIG1pbnVzIHNpZ24gaW4gZnJvbnQgb2YgdGhlbSBhbmQgd2UgbmVlZCB0byBzdHJpcCB0aGF0IGZpcnN0XHJcbiAgICAgICAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9pblByb2dyZXNzLXRlYW0vcmVhY3QtbmF0aXZlLW1ldGVvci9pc3N1ZXMvMTg1IGZvciBkZXRhaWxzXHJcbiAgICAgICAgY29uc3QgY2xlYW5BcnRpY2xlSWQgPSByZW1vdmVXZWlyZE1pbnVzU2lnbnNJbkZyb250T2ZTdHJpbmcoYXJ0aWNsZUlkKTtcclxuICAgICAgICBjb25zdCBhcnRpY2xlID0gTmV3c0FydGljbGVzLmZpbmRPbmUoY2xlYW5BcnRpY2xlSWQpO1xyXG5cclxuICAgICAgICBpZiAoIWFydGljbGUpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDQsICdBcnRpY2xlIG5vdCBmb3VuZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIFBvZGNhc3RBbmFseXRpY3MuaW5zZXJ0KHtcclxuICAgICAgICAgICAgYXJ0aWNsZUlkOiBjbGVhbkFydGljbGVJZCxcclxuICAgICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgICBhY3Rpb24sXHJcbiAgICAgICAgICAgIHBvZGNhc3RUaW1lc3RhbXAsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9LFxyXG5cclxufSk7XHJcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xyXG5pbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjayc7XHJcbmltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcclxuaW1wb3J0IHsgcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nIH0gZnJvbSAnLi4vbGliL3V0aWxzL3V0aWxzX3N0cmluZyc7XHJcbmltcG9ydCB7IE5ld3NBcnRpY2xlcyB9IGZyb20gJy4vYXJ0aWNsZXMnO1xyXG5cclxuZXhwb3J0IGNvbnN0IFJlYWRpbmdMaXN0ID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ3JlYWRpbmdMaXN0Jyk7XHJcblxyXG5NZXRlb3IubWV0aG9kcyh7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBZGRzIHRoZSBhcnRpY2xlIHdpdGggdGhlIGdpdmVuIGlkIHRvIHRoZSBjdXJyZW50IHVzZXIncyByZWFkaW5nIGxpc3QuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIGFydGljbGVJZFxyXG4gICAgICogICAgICAgICAgdGhlIGlkIG9mIHRoZSBhcnRpY2xlIHRoYXQncyBhZGRlZCB0byB0aGUgcmVhZGluZyBsaXN0XHJcbiAgICAgKiBAcmV0dXJucyB7YW55fVxyXG4gICAgICogICAgICAgICAgVGhlIHVuaXF1ZSBfaWQgb2YgdGhlIGRvY3VtZW50IHRoYXQgd2FzIGluc2VydGVkXHJcbiAgICAgKi9cclxuICAgICdyZWFkaW5nTGlzdC5hcnRpY2xlLmFkZCcoYXJ0aWNsZUlkKSB7XHJcbiAgICAgICAgY2hlY2soYXJ0aWNsZUlkLCBTdHJpbmcpO1xyXG5cclxuICAgICAgICBjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XHJcbiAgICAgICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZHVlIHRvIGEgYnVnIGluIHJlYWN0LW5hdGl2ZS1tZXRlb3IgYW5kL29yIG1pbmltb25nby1jYWNoZVxyXG4gICAgICAgIC8vIHNvbWUgaWRzIGluY2x1ZGUgYSBtaW51cyBzaWduIGluIGZyb250IG9mIHRoZW0gYW5kIHdlIG5lZWQgdG8gc3RyaXAgdGhhdCBmaXJzdFxyXG4gICAgICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vaW5Qcm9ncmVzcy10ZWFtL3JlYWN0LW5hdGl2ZS1tZXRlb3IvaXNzdWVzLzE4NSBmb3IgZGV0YWlsc1xyXG4gICAgICAgIGNvbnN0IGNsZWFuQXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGFydGljbGVJZCk7XHJcbiAgICAgICAgY29uc3QgYXJ0aWNsZSA9IE5ld3NBcnRpY2xlcy5maW5kT25lKGNsZWFuQXJ0aWNsZUlkKTtcclxuXHJcbiAgICAgICAgaWYgKCFhcnRpY2xlKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCAnQXJ0aWNsZSBub3QgZm91bmQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHsgZGF0ZVNjcmFwZWQgfSA9IGFydGljbGU7XHJcblxyXG4gICAgICAgIHJldHVybiBSZWFkaW5nTGlzdC5pbnNlcnQoe1xyXG4gICAgICAgICAgICBhcnRpY2xlSWQ6IGNsZWFuQXJ0aWNsZUlkLFxyXG4gICAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgYXJ0aWNsZVB1Ymxpc2hlZERhdGU6IGRhdGVTY3JhcGVkLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlbW92ZXMgYSBuZXdzIGFydGljbGUgZnJvbSB0aGUgcmVhZGluZyBsaXN0IG9mIHRoZSBjdXJyZW50IHVzZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIGFydGljbGVJZFxyXG4gICAgICogICAgICAgICAgaWQgb2YgdGhlIG5ld3MgYXJ0aWNsZSB0aGF0IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSByZWFkaW5nIGxpc3RcclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJucyB7YW55fVxyXG4gICAgICogICAgICAgICAgbnVtYmVyIG9mIHJlbW92ZWQgZG9jdW1lbnRzXHJcbiAgICAgKi9cclxuICAgICdyZWFkaW5nTGlzdC5hcnRpY2xlLnJlbW92ZScoYXJ0aWNsZUlkKSB7XHJcbiAgICAgICAgY2hlY2soYXJ0aWNsZUlkLCBTdHJpbmcpO1xyXG5cclxuICAgICAgICBjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XHJcbiAgICAgICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZHVlIHRvIGEgYnVnIGluIHJlYWN0LW5hdGl2ZS1tZXRlb3IgYW5kL29yIG1pbmltb25nby1jYWNoZVxyXG4gICAgICAgIC8vIHNvbWUgaWRzIGluY2x1ZGUgYSBtaW51cyBzaWduIGluIGZyb250IG9mIHRoZW0gYW5kIHdlIG5lZWQgdG8gc3RyaXAgdGhhdCBmaXJzdFxyXG4gICAgICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vaW5Qcm9ncmVzcy10ZWFtL3JlYWN0LW5hdGl2ZS1tZXRlb3IvaXNzdWVzLzE4NSBmb3IgZGV0YWlsc1xyXG4gICAgICAgIGNvbnN0IGNsZWFuQXJ0aWNsZUlkID0gcmVtb3ZlV2VpcmRNaW51c1NpZ25zSW5Gcm9udE9mU3RyaW5nKGFydGljbGVJZCk7XHJcbiAgICAgICAgcmV0dXJuIFJlYWRpbmdMaXN0LnVwZGF0ZSh7XHJcbiAgICAgICAgICAgIGFydGljbGVJZDogY2xlYW5BcnRpY2xlSWQsXHJcbiAgICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgICAgcmVtb3ZlZEF0OiB7XHJcbiAgICAgICAgICAgICAgICAkZXhpc3RzOiBmYWxzZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICRzZXQ6IHtcclxuICAgICAgICAgICAgICAgIHJlbW92ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIG11bHRpOiB0cnVlLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbn0pO1xyXG4iLCJpbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XHJcblxyXG5leHBvcnQgY29uc3QgUmVjb21tZW5kYXRpb25zID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ3JlY29tbWVuZGF0aW9uTGlzdHMnKTtcclxuIiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xyXG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcclxuXHJcbmV4cG9ydCBjb25zdCBTaWduSW5zID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ3NpZ25pbnMnKTtcclxuXHJcbk1ldGVvci5tZXRob2RzKHtcclxuXHJcbiAgICAnc2lnbmlucy5hZGQnKCkge1xyXG4gICAgICAgIGNvbnN0IHsgdXNlcklkIH0gPSB0aGlzO1xyXG5cclxuICAgICAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gU2lnbklucy5pbnNlcnQoe1xyXG4gICAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG59KTtcclxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XHJcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJ21ldGVvci9yYW5kb20nO1xyXG5pbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjayc7XHJcbmltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcclxuXHJcbmltcG9ydCB7IHVzZXJPd25zU3VydmV5LCB1c2VyT3duc0V4cGVyaW1lbnQgfSBmcm9tICcuLi9saWIvdXRpbHMvdXRpbHNfYWNjb3VudCc7XHJcblxyXG5leHBvcnQgY29uc3QgU3VydmV5cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdzdXJ2ZXlzJyk7XHJcbmV4cG9ydCBjb25zdCBVbmFuc3dlcmVkU3VydmV5cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCd1bmFuc3dlcmVkU3VydmV5cycpO1xyXG5cclxuTWV0ZW9yLm1ldGhvZHMoe1xyXG5cclxuICAgICdzdXJ2ZXlzLmNyZWF0ZScoc3VydmV5TmFtZSwgZXhwZXJpbWVudElkKSB7XHJcbiAgICAgICAgY2hlY2soc3VydmV5TmFtZSwgU3RyaW5nKTtcclxuICAgICAgICBjaGVjayhleHBlcmltZW50SWQsIFN0cmluZyk7XHJcblxyXG4gICAgICAgIGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcih7IGZpZWxkczogeyBleHBlcmltZW50czogMSB9IH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghdXNlcikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXVzZXJPd25zRXhwZXJpbWVudChleHBlcmltZW50SWQpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnUGVybWlzc2lvbiBEZW5pZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBTdXJ2ZXlzLmluc2VydCh7XHJcbiAgICAgICAgICAgIG5hbWU6IHN1cnZleU5hbWUsXHJcbiAgICAgICAgICAgIGV4cGVyaW1lbnQ6IGV4cGVyaW1lbnRJZCxcclxuICAgICAgICAgICAgY3JlYXRlZEJ5OiB1c2VyLl9pZCxcclxuICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgICBpc0FjdGl2ZTogdHJ1ZSxcclxuICAgICAgICAgICAgcXVlc3Rpb25zOiBbe1xyXG4gICAgICAgICAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICcnLFxyXG4gICAgICAgICAgICAgICAgbWluU2VsZWN0OiAxLFxyXG4gICAgICAgICAgICAgICAgbWF4U2VsZWN0OiAxLFxyXG4gICAgICAgICAgICAgICAgYW5zd2VyczogW1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB9XSxcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgJ3N1cnZleXMuZGVsZXRlJyhzdXJ2ZXlJZCkge1xyXG4gICAgICAgIGNoZWNrKHN1cnZleUlkLCBTdHJpbmcpO1xyXG5cclxuICAgICAgICBpZiAoIXVzZXJPd25zU3VydmV5KHN1cnZleUlkKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1Blcm1pc3Npb24gRGVuaWVkJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gU3VydmV5cy5yZW1vdmUoc3VydmV5SWQpO1xyXG4gICAgfSxcclxuXHJcbiAgICAnc3VydmV5cy51cGRhdGUnKHN1cnZleUlkLCBpc0FjdGl2ZSkge1xyXG4gICAgICAgIGNoZWNrKHN1cnZleUlkLCBTdHJpbmcpO1xyXG4gICAgICAgIGNoZWNrKGlzQWN0aXZlLCBCb29sZWFuKTtcclxuXHJcbiAgICAgICAgaWYgKCF1c2VyT3duc1N1cnZleShzdXJ2ZXlJZCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgU3VydmV5cy51cGRhdGUoeyBfaWQ6IHN1cnZleUlkIH0sIHsgJHNldDogeyBpc0FjdGl2ZSB9fSk7XHJcbiAgICB9LFxyXG5cclxuICAgICdzdXJ2ZXlzLnF1ZXN0aW9ucy51cGRhdGUnKHN1cnZleUlkLCBzdXJ2ZXlRdWVzdGlvbnMpIHtcclxuICAgICAgICBjaGVjayhzdXJ2ZXlJZCwgU3RyaW5nKTtcclxuICAgICAgICBjaGVjayhzdXJ2ZXlRdWVzdGlvbnMsIEFycmF5KTtcclxuXHJcbiAgICAgICAgaWYgKCF1c2VyT3duc1N1cnZleShzdXJ2ZXlJZCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdQZXJtaXNzaW9uIERlbmllZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdGVjaG5pY2FsbHkgaXQgd291bGQgYmUgbW9yZSBzZW5zaWJsZSB0byBwYXJzZSBhbGwgaW5wdXRzXHJcbiAgICAgICAgLy8gb24gdGhlIGNsaWVudCBzaWRlLCBpLmUuIGluc2lkZSB0aGUgbW9kYWwgLyBmb3JtIHdoZXJlIHRoZVxyXG4gICAgICAgIC8vIHF1ZXN0aW9ucyBhcmUgZWRpdGVkIChpbnNpZGUgdGhlIGNoYW5nZSBoYW5kbGVycykuIFVuZm9ydHVuYXRlbHksXHJcbiAgICAgICAgLy8gdXNpbmcgJ3BhcnNlRmxvYXQnIGluc2lkZSBzdWNoIGEgaGFuZGxlciwgd2hpY2ggdXBkYXRlcyB0aGUgc3RhdGVcclxuICAgICAgICAvLyBkaXJlY3RseSwgbGVhdmVzIHVzIHdpdGggYSB2ZXJ5IGJhZCBVWCAodG8gdHlwZSBhIGZsb2F0IG9uZSBuZWVkc1xyXG4gICAgICAgIC8vIHRvIHN0YXJ0IHdpdGggJy4nLCB0eXBpbmcgJzAuJyBjbGVhcnMgdGhlIGlucHV0KS5cclxuICAgICAgICAvLyB0aHVzLCB3ZSB0cmFuc2Zvcm0gYWxsIGlucHV0cyBoZXJlXHJcbiAgICAgICAgY29uc3QgcXVlc3Rpb25zID0gc3VydmV5UXVlc3Rpb25zLm1hcCgocXVlc3Rpb24pID0+IHtcclxuICAgICAgICAgICAgY29uc3QgbmV3UXVlc3Rpb24gPSB7XHJcbiAgICAgICAgICAgICAgICAuLi5xdWVzdGlvbixcclxuICAgICAgICAgICAgICAgIG1pblNlbGVjdDogcGFyc2VJbnQocXVlc3Rpb24ubWluU2VsZWN0LCAxMCksXHJcbiAgICAgICAgICAgICAgICBtYXhTZWxlY3Q6IHBhcnNlSW50KHF1ZXN0aW9uLm1heFNlbGVjdCwgMTApLFxyXG4gICAgICAgICAgICAgICAgYW5zd2VyczogcXVlc3Rpb24uYW5zd2Vycy5tYXAoKHsgX2lkLCB0ZXh0LCB2YWx1ZSB9KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgIF9pZCxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0LFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpc05hTihwYXJzZUZsb2F0KHZhbHVlKSkgPyB2YWx1ZSA6IHBhcnNlRmxvYXQodmFsdWUpLFxyXG4gICAgICAgICAgICAgICAgfSkpLFxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgaWYgKHF1ZXN0aW9uLndpdGhBdExlYXN0KSB7XHJcbiAgICAgICAgICAgICAgICBuZXdRdWVzdGlvbi53aXRoQXRMZWFzdCA9IHBhcnNlSW50KHF1ZXN0aW9uLndpdGhBdExlYXN0LCAxMCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChxdWVzdGlvbi5zZWxlY3Rpb25zRnJvbSkge1xyXG4gICAgICAgICAgICAgICAgbmV3UXVlc3Rpb24uc2VsZWN0aW9uc0Zyb20gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2lkOiBxdWVzdGlvbi5zZWxlY3Rpb25zRnJvbS52YWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICBpbmRleDogcXVlc3Rpb24uc2VsZWN0aW9uc0Zyb20uaW5kZXgsXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHZhbHVlIGFuZCBsYWJlbCBhcmUgdXNlZCBpbiB0aGUgc2VsZWN0IGNvbXBvbmVudFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGluIHRoZSBlZGl0IG1vZGFsLlxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBxdWVzdGlvbi5zZWxlY3Rpb25zRnJvbS52YWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogcXVlc3Rpb24uc2VsZWN0aW9uc0Zyb20ubGFiZWwsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocXVlc3Rpb24uY2FuQmVTa2lwcGVkKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdRdWVzdGlvbi5jYW5CZVNraXBwZWQgPSBxdWVzdGlvbi5jYW5CZVNraXBwZWQ7XHJcbiAgICAgICAgICAgICAgICBuZXdRdWVzdGlvbi5za2lwQW5zd2VyVGV4dCA9IHF1ZXN0aW9uLnNraXBBbnN3ZXJUZXh0O1xyXG4gICAgICAgICAgICAgICAgbmV3UXVlc3Rpb24uc2tpcEFuc3dlclZhbHVlID0gaXNOYU4ocGFyc2VGbG9hdChxdWVzdGlvbi5za2lwQW5zd2VyVmFsdWUpKVxyXG4gICAgICAgICAgICAgICAgICAgID8gcXVlc3Rpb24uc2tpcEFuc3dlclZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgOiBwYXJzZUZsb2F0KHF1ZXN0aW9uLnNraXBBbnN3ZXJWYWx1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChxdWVzdGlvbi5oYXNPdGhlck9wdGlvbikge1xyXG4gICAgICAgICAgICAgICAgbmV3UXVlc3Rpb24uaGFzT3RoZXJPcHRpb24gPSBxdWVzdGlvbi5oYXNPdGhlck9wdGlvbjtcclxuICAgICAgICAgICAgICAgIG5ld1F1ZXN0aW9uLm90aGVyQW5zd2VyVGV4dCA9IHF1ZXN0aW9uLm90aGVyQW5zd2VyVGV4dDtcclxuICAgICAgICAgICAgICAgIG5ld1F1ZXN0aW9uLm90aGVyQW5zd2VyVmFsdWUgPSBpc05hTihwYXJzZUZsb2F0KHF1ZXN0aW9uLm90aGVyQW5zd2VyVmFsdWUpKVxyXG4gICAgICAgICAgICAgICAgICAgID8gcXVlc3Rpb24ub3RoZXJBbnN3ZXJWYWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgIDogcGFyc2VGbG9hdChxdWVzdGlvbi5vdGhlckFuc3dlclZhbHVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG5ld1F1ZXN0aW9uO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gU3VydmV5cy51cGRhdGUoc3VydmV5SWQsIHsgJHNldDogeyBxdWVzdGlvbnMgfSB9KTtcclxuICAgIH0sXHJcblxyXG59KTsiLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcclxuaW1wb3J0IHsgY2hlY2sgfSBmcm9tICdtZXRlb3IvY2hlY2snO1xyXG5pbXBvcnQgeyB1c2VySXNJblJvbGUsIHVzZXJPd25zRXhwZXJpbWVudCB9IGZyb20gJy4uL2xpYi91dGlscy91dGlsc19hY2NvdW50JztcclxuXHJcbmltcG9ydCB7IEFuc3dlcnMgfSBmcm9tICcuL2Fuc3dlcnMnO1xyXG5cclxuTWV0ZW9yLm1ldGhvZHMoe1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2VuZCBhIHZlcmlmaWNhdGlvbiBlbWFpbCB0byB0aGUgY3VycmVudCB1c2VyLlxyXG4gICAgICpcclxuICAgICAqIEByZXR1cm5zIHthbnl9XHJcbiAgICAgKiAgICAgICAgICByZXR1cm4gdmFsdWUgb2Yge0BsaW5rIEFjY291bnRzI3NlbmRWZXJpZmljYXRpb25FbWFpbH1cclxuICAgICAqL1xyXG4gICAgJ3VzZXIuc2VuZFZlcmlmaWNhdGlvbk1haWwnKCkge1xyXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IE1ldGVvci51c2VySWQoKTtcclxuICAgICAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgJ0ludmFsaWQgVXNlcicpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIEFjY291bnRzLnNlbmRWZXJpZmljYXRpb25FbWFpbCh1c2VySWQpO1xyXG4gICAgfSxcclxuXHJcbiAgICAndXNlci5zdXJ2ZXlzLnJlc2V0JygpIHtcclxuICAgICAgICBjb25zdCB7IHVzZXJJZCB9ID0gdGhpcztcclxuICAgICAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgJ0ludmFsaWQgVXNlcicpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gcmV0dXJuIEFuc3dlcnMucmVtb3ZlKHsgdXNlcklkIH0sIHsgbXVsdGk6IHRydWUgfSk7XHJcbiAgICAgICAgcmV0dXJuIEFuc3dlcnMucmVtb3ZlKHsgdXNlcklkIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAndXNlci5yZW1vdmUnKHVzZXJJZCkge1xyXG4gICAgICAgIGNoZWNrKHVzZXJJZCwgU3RyaW5nKTtcclxuXHJcbiAgICAgICAgY29uc3QgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHsgX2lkOiB1c2VySWQgfSwgeyBmaWVsZHM6IHsgcGFydGljaXBhdGVzSW46IDEgfSB9KTtcclxuXHJcbiAgICAgICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCAnVXNlciBkb2VzIG5vdCBleGlzdCcpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXVzZXJJc0luUm9sZSgnYWRtaW4nKSB8fCAhdXNlck93bnNFeHBlcmltZW50KHVzZXIucGFydGljaXBhdGVzSW4pKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnUGVybWlzc2lvbiBEZW5pZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBNZXRlb3IudXNlcnMucmVtb3ZlKHsgX2lkOiB1c2VySWQgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qXHJcbiAgICAgKiBBZGQgbm90aWZpY2F0aW9uIGlkXHJcbiAgICAgKlxyXG4gICAgICovXHJcbiAgICAndXNlci5zYXZlUHVzaFRva2VuJyh1c2VySWQsIHB1c2hUb2tlbikge1xyXG5cclxuICAgICAgICBjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodXNlcklkKTtcclxuXHJcbiAgICAgICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCAnVXNlciBkb2VzIG5vdCBleGlzdCcpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gTWV0ZW9yLnVzZXJzLnVwZGF0ZSh1c2VyLCB7ICRzZXQ6IHsgcHVzaE5vdGlmaWNhdGlvblRva2VuOiBwdXNoVG9rZW4gfSB9KTtcclxuICAgIH0sXHJcblxyXG59KTtcclxuIiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xyXG5pbXBvcnQgeyBjaGVjaywgTWF0Y2ggfSBmcm9tICdtZXRlb3IvY2hlY2snO1xyXG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcclxuaW1wb3J0IHsgTmV3c0FydGljbGVzIH0gZnJvbSAnLi9hcnRpY2xlcyc7XHJcbmltcG9ydCB7IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyB9IGZyb20gJy4uL2xpYi91dGlscy91dGlsc19zdHJpbmcnO1xyXG5cclxuZXhwb3J0IGNvbnN0IFZpZGVvQW5hbHl0aWNzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ3ZpZGVvQW5hbHl0aWNzJyk7XHJcblxyXG5NZXRlb3IubWV0aG9kcyh7XHJcblxyXG4gICAgJ3ZpZGVvQW5hbHl0aWNzLmluc2VydCcoYXJ0aWNsZUlkLCBhY3Rpb24sIHZpZGVvVGltZXN0YW1wKSB7XHJcbiAgICAgICAgY2hlY2soYXJ0aWNsZUlkLCBTdHJpbmcpO1xyXG4gICAgICAgIGNoZWNrKGFjdGlvbiwgU3RyaW5nKTtcclxuICAgICAgICBjaGVjayh2aWRlb1RpbWVzdGFtcCwgTnVtYmVyKTtcclxuXHJcbiAgICAgICAgY29uc3QgdXNlcklkID0gTWV0ZW9yLnVzZXJJZCgpO1xyXG4gICAgICAgIGlmICghdXNlcklkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnUGVybWlzc2lvbiBEZW5pZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGR1ZSB0byBhIGJ1ZyBpbiByZWFjdC1uYXRpdmUtbWV0ZW9yIGFuZC9vciBtaW5pbW9uZ28tY2FjaGVcclxuICAgICAgICAvLyBzb21lIGlkcyBpbmNsdWRlIGEgbWludXMgc2lnbiBpbiBmcm9udCBvZiB0aGVtIGFuZCB3ZSBuZWVkIHRvIHN0cmlwIHRoYXQgZmlyc3RcclxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2luUHJvZ3Jlc3MtdGVhbS9yZWFjdC1uYXRpdmUtbWV0ZW9yL2lzc3Vlcy8xODUgZm9yIGRldGFpbHNcclxuICAgICAgICBjb25zdCBjbGVhbkFydGljbGVJZCA9IHJlbW92ZVdlaXJkTWludXNTaWduc0luRnJvbnRPZlN0cmluZyhhcnRpY2xlSWQpO1xyXG4gICAgICAgIGNvbnN0IGFydGljbGUgPSBOZXdzQXJ0aWNsZXMuZmluZE9uZShjbGVhbkFydGljbGVJZCk7XHJcblxyXG4gICAgICAgIGlmICghYXJ0aWNsZSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgJ0FydGljbGUgbm90IGZvdW5kJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gVmlkZW9BbmFseXRpY3MuaW5zZXJ0KHtcclxuICAgICAgICAgICAgYXJ0aWNsZUlkOiBjbGVhbkFydGljbGVJZCxcclxuICAgICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgICBhY3Rpb24sXHJcbiAgICAgICAgICAgIHZpZGVvVGltZXN0YW1wLFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSxcclxuXHJcbn0pO1xyXG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcclxuaW1wb3J0IHsgaXNFbWFpbFZlcmlmaWVkLCB1c2VySXNJblJvbGUgfSBmcm9tICcuLi8uLi8uLi9saWIvdXRpbHMvdXRpbHNfYWNjb3VudCc7XHJcblxyXG5jb25zdCBERUZBVUxUX1VTRVJfUk9MRVMgPSBbJ3VzZXInXTtcclxuY29uc3QgQURNSU5fUk9MRSA9ICdhZG1pbic7XHJcbmNvbnN0IEJMT0NLRURfUk9MRSA9ICdibG9ja2VkJztcclxuY29uc3QgREVBQ1RJVkFURURfUk9MRSA9ICdkZWFjdGl2YXRlZCc7XHJcbmNvbnN0IExPQ0tFRF9ST0xFUyA9IFsgQkxPQ0tFRF9ST0xFLCBERUFDVElWQVRFRF9ST0xFIF07XHJcblxyXG5jb25zdCBFTUFJTFRFTVBMQVRFU19TSVRFTkFNRSA9ICdkZGlzJztcclxuY29uc3QgRU1BSUxURU1QTEFURVNfRlJPTSA9ICdkZGlzIDxkZGlzLW5ld3MtYXBwQGlmaS51emguY2g+JztcclxuXHJcbmNvbnN0IElTX0VNQUlMX1ZFUklGSUNBVElPTl9SRVFVSVJFRCA9IGZhbHNlO1xyXG5jb25zdCBJU19SRUdJU1RSQVRJT05fT1BFTiA9IHRydWU7XHJcbmNvbnN0IElTX1NVUlZFWV9SRVFVSVJFRCA9IHRydWU7XHJcblxyXG4vLyBlbmFibGUgdmVyaWZpY2F0aW9uIGVtYWlsc1xyXG5BY2NvdW50cy5jb25maWcoe1xyXG4gICAgc2VuZFZlcmlmaWNhdGlvbkVtYWlsOiBJU19FTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQsXHJcbiAgICBmb3JiaWRDbGllbnRBY2NvdW50Q3JlYXRpb246ICFJU19SRUdJU1RSQVRJT05fT1BFTixcclxufSk7XHJcblxyXG4vKipcclxuICogVXBkYXRlIHRoZSB1c2VyJ3MgbGFzdExvZ2luIGZpZWxkIHdoZW5ldmVyIGhlL3NoZSBzaWducyBpbi5cclxuICpcclxuICogTm90aWNlOiBBY2NvdW50cy5vbkxvZ2luIGFwcGVhcnMgdG8gYWxzbyBiZSBjYWxsZWQgdG8gcmVmcmVzaCBsb2dpbiB0b2tlbnMuXHJcbiAqICAgICAgICAgVGhhdCBpcywgd2hlbmV2ZXIgdGhlIHVzZXIgcmVmcmVzaGVzIHRoZSBicm93c2VyIHRhYi4gSGVuY2UsIHRoaXMgbWV0cmljXHJcbiAqICAgICAgICAgbWlnaHQgbm90IHJlZmxlY3QgdGhlIGFjdHVhbCB0aW1lc3RhbXAgYXQgd2hpY2ggYSBnaXZlbiB1c2VyIGhhcyBzaWduZWQgaW5cclxuICogICAgICAgICAobWVhbmluZyB0aGUgYWN0aW9uIG9mIGluaXRhbGx5IHNpZ25pbmcgaW4pLlxyXG4gKiAgICAgICAgIEluIHJldHVybiwgZm9yIHVzZXJzIHRoYXQgaGFyZGx5IGV2ZXIgc2lnbiBvdXQgYW5kIGhlbmNlIGhhcmRseSBldmVyIHNpZ24gaW4sXHJcbiAqICAgICAgICAgaXQgKG1vcmUpIGNvcnJlY3RseSByZWZsZWN0cyB0aGUgbGFzdCB0aW1lIHRoZSB1c2VyIGhhcyB1c2VkIHRoZSBhcHBsaWNhdGlvbi5cclxuICpcclxuICogTm90aWNlOiBvbkxvZ2luIGdldHMgY2FsbGVkIG9ubHkgaWZmIHRoZSBsb2dpbiBhdHRlbXB0IHdhcyBzdWNjZXNzZnVsLlxyXG4gKiAgICAgICAgIGNoZWNrIHtAbGluayBBY2NvdW50cy52YWxpZGF0ZUxvZ2luQXR0ZW1wdH0gdG8gc2VlIHdoZW4gdGhpcyBpcyB0aGUgY2FzZS5cclxuICpcclxuICogQHBhcmFtIGluZm9cclxuICogICAgICAgICAgbG9naW4gb2JqZWN0LCBjb250YWlucyB0aGUgdXNlciBkb2N1bWVudFxyXG4gKi9cclxuQWNjb3VudHMub25Mb2dpbigoaW5mbykgPT4ge1xyXG4gICAgTWV0ZW9yLmNhbGwoJ3NpZ25pbnMuYWRkJyk7XHJcbiAgICBNZXRlb3IudXNlcnMudXBkYXRlKHsgX2lkOiBpbmZvLnVzZXIuX2lkIH0sIHsgJHNldDogeyAncHJvZmlsZS5sYXN0TG9naW4nOiBuZXcgRGF0ZSgpIH0gfSk7XHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIEFkZCBkZWZhdWx0IHJvbGVzIHRvIG5ldyB1c2Vycy5cclxuICpcclxuICogTm90aWNlOiBBY2NvdW50cy5vbkNyZWF0ZVVzZXIgZ2V0cyBjYWxsZWQgd2hlbmV2ZXIgYSB1c2VyIGlzIGNyZWF0ZWQuXHJcbiAqICAgICAgICAgTWV0ZW9yIHVzZXIgY29sbGVjdGlvbnMgZG8gbm90IGJ5IGRlZmF1bHQgc3RvcmUgYSByb2xlIGZpZWxkLFxyXG4gKiAgICAgICAgIHRoZXJlZm9yZSB3ZSBhZGQgaXQuXHJcbiAqXHJcbiAqIEBwYXJhbSBvcHRpb25zXHJcbiAqICAgICAgICAgIG9wdGlvbnMgZm9yIHRoaXMgdXNlciBhY2NvdW50XHJcbiAqIEBwYXJhbSB1c2VyXHJcbiAqICAgICAgICAgIHVzZXIgb2JqZWN0IHRoYXQgaXMgYmVpbmcgY3JlYXRlZFxyXG4gKlxyXG4gKiBAcmV0dXJucyB7Kn1cclxuICovXHJcbkFjY291bnRzLm9uQ3JlYXRlVXNlcigob3B0aW9ucywgdXNlcikgPT4ge1xyXG4gICAgY29uc3QgbmV3VXNlciA9IHsgLi4udXNlciB9O1xyXG4gICAgbmV3VXNlci5yb2xlcyA9IERFRkFVTFRfVVNFUl9ST0xFUztcclxuXHJcbiAgICAvLyBXZSBzdGlsbCB3YW50IHRoZSBkZWZhdWx0IGhvb2sncyAncHJvZmlsZScgYmVoYXZpb3IuXHJcbiAgICBpZiAob3B0aW9ucy5wcm9maWxlKSB7XHJcbiAgICAgICAgbmV3VXNlci5wcm9maWxlID0gb3B0aW9ucy5wcm9maWxlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghbmV3VXNlci5wcm9maWxlKSB7XHJcbiAgICAgICAgbmV3VXNlci5wcm9maWxlID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgbmV3VXNlci5wYXJ0aWNpcGF0ZXNJbiA9ICdkZWZhdWx0LWV4cGVyaW1lbnQnO1xyXG4gICAgbmV3VXNlci51c2VyR3JvdXAgPSAnYmFzZWxpbmUnO1xyXG4gICAgbmV3VXNlci5zY29yZSA9IFtdO1xyXG4gICAgbmV3VXNlci5leHBlcmltZW50cyA9IFtdO1xyXG4gICAgbmV3VXNlci5ub3RpZmljYXRpb24gPSBudWxsO1xyXG5cclxuICAgIC8vIGlmIHRoZXJlIGlzIG5vIGFkbWluaXN0cmF0b3IgaW4gdGhlIHN5c3RlbSwgbWFrZSBzdXJlIHRoYXRcclxuICAgIC8vIHRoZSBuZXh0IHVzZXIgdGhhdCByZWdpc3RlcnMgaXMgYW4gYWRtaW5pc3RyYXRvci5cclxuICAgIC8vIHRoaXMgY29kZSBleGlzdHMgb25seSBmb3IgY29udmVuaWVuY2Ugc3VjaCB0aGF0IHRoZSBmaXJzdFxyXG4gICAgLy8gdXNlciB0aGF0IHJlZ2lzdGVycyBpcyBhbHdheXMgYW4gYWRtaW5pc3RyYXRvci5cclxuICAgIGNvbnN0IGlzVGhlcmVBdExlYXN0T25lQWRtaW4gPSAhIU1ldGVvci51c2Vycy5maW5kT25lKHsgcm9sZXM6IEFETUlOX1JPTEUgfSk7XHJcbiAgICBjb25zdCBpc05ld1VzZXJBbkFkbWluID0gbmV3VXNlci5yb2xlcy5pbmRleE9mKEFETUlOX1JPTEUpICE9PSAtMTtcclxuICAgIGlmICghaXNUaGVyZUF0TGVhc3RPbmVBZG1pbiAmJiAhaXNOZXdVc2VyQW5BZG1pbikge1xyXG4gICAgICAgIG5ld1VzZXIucm9sZXMucHVzaChBRE1JTl9ST0xFKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3VXNlcjtcclxufSk7XHJcblxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIGEgbG9naW4gYXR0ZW1wdC5cclxuICogQ2hlY2sgd2hldGhlciBhIHVzZXIgYWNjb3VudCB0aGF0IGlzIGJlaW5nIHVzZWQgZm9yIHNpZ25pbmcgaW4gaXMgYWxsb3dlZCB0b1xyXG4gKiBiZSB1c2VkLiBUaGF0IGlzLCBjaGVjayB3aGV0aGVyIGl0IGlzIGJsb2NrZWQgYW5kIHdoZXRoZXIgaXQncyBlbWFpbCBhZGRyZXNzXHJcbiAqIHdhcyB2ZXJpZmllZC5cclxuICpcclxuICogQHBhcmFtIGluZm9cclxuICogICAgICAgICAgTG9naW4gaW5mb3JtYXRpb24uIENvbnRhaW5zIHVzZXIgb2JqZWN0XHJcbiAqXHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKiAgICAgICAgICBCb29sZWFuIHZhbHVlIHRoYXQgcmVwcmVzZW50cyB3aGV0aGVyIHRoZSBsb2dpbiBhdHRlbXB0IHdhcyBzdWNjZXNzZnVsXHJcbiAqL1xyXG5BY2NvdW50cy52YWxpZGF0ZUxvZ2luQXR0ZW1wdCgoaW5mbykgPT4ge1xyXG4gICAgY29uc3QgeyB1c2VyIH0gPSBpbmZvO1xyXG5cclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCAnSW52YWxpZCBVc2VyJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmVqZWN0IHVzZXJzIHdpdGggcm9sZSBcImJsb2NrZWRcIiBhbmQgdGhyb3cgYW4gZXJyb3JcclxuICAgIGlmICh1c2VySXNJblJvbGUoTE9DS0VEX1JPTEVTLCB1c2VyKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnWW91ciBhY2NvdW50IGlzIGJsb2NrZWQuJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmVqZWN0IHVzZXIgd2l0aG91dCBhIHZlcmlmaWVkIGVtYWlsIGFkZHJlc3NcclxuICAgIGlmIChJU19FTUFJTF9WRVJJRklDQVRJT05fUkVRVUlSRUQgJiYgIWlzRW1haWxWZXJpZmllZCh1c2VyKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDk5LCAnRS1tYWlsIG5vdCB2ZXJpZmllZC4nKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufSk7XHJcblxyXG4vLyBkZWZpbmUgc2VuZGVyIGFuZCBzaXRlIG5hbWUgZm9yIHZlcmlmaWNhdGlvbiBlbWFpbHNcclxuQWNjb3VudHMuZW1haWxUZW1wbGF0ZXMuc2l0ZU5hbWUgPSBFTUFJTFRFTVBMQVRFU19TSVRFTkFNRTtcclxuQWNjb3VudHMuZW1haWxUZW1wbGF0ZXMuZnJvbSA9IEVNQUlMVEVNUExBVEVTX0ZST007XHJcblxyXG4vKipcclxuICogRGVmaW5lIHRoZSBlbWFpbCB0ZW1wbGF0ZSB0aGF0IGlzIHVzZWQgZm9yIHZlcmlmaWNhdGlvbiBlbWFpbHMuXHJcbiAqIEluIHRoaXMgZnVuY3Rpb24gd2UgZGVmaW5lIHRoZSBzdWJqZWN0IGFuZCB0aGUgY29udGVudC5cclxuICpcclxuICogQHR5cGUge3tzdWJqZWN0OiAoZnVuY3Rpb24oKSksIHRleHQ6IChmdW5jdGlvbigqLCAqKSl9fVxyXG4gKi9cclxuQWNjb3VudHMuZW1haWxUZW1wbGF0ZXMudmVyaWZ5RW1haWwgPSB7XHJcbiAgICBzdWJqZWN0KCkge1xyXG4gICAgICAgIHJldHVybiAnRERJUyBOZXdzIC0gVmVyaWZ5IHlvdXIgZW1haWwgYWRkcmVzcyc7XHJcbiAgICB9LFxyXG59O1xyXG5cclxuQWNjb3VudHMuZW1haWxUZW1wbGF0ZXMucmVzZXRQYXNzd29yZCA9IHtcclxuICAgIHN1YmplY3QoKSB7XHJcbiAgICAgICAgcmV0dXJuICdERElTIE5ld3MgLSBSZXNldCB5b3VyIHBhc3N3b3JkJztcclxuICAgIH0sXHJcblxyXG4gICAgdGV4dCh1c2VyLCB1cmwpIHtcclxuICAgICAgICByZXR1cm4gYEhleSAke3VzZXJ9ISBSZXNldCB5b3VyIHBhc3N3b3JkIHdpdGggZm9sbG93aW5nIHRoaXMgbGluazogJHt1cmx9YDtcclxuICAgIH0sXHJcbn07XHJcblxyXG5BY2NvdW50cy51cmxzLnJlc2V0UGFzc3dvcmQgPSB0b2tlbiA9PiBNZXRlb3IuYWJzb2x1dGVVcmwoYHJlc2V0LXBhc3N3b3JkLyR7dG9rZW59YCk7XHJcbkFjY291bnRzLnVybHMudmVyaWZ5RW1haWwgPSB0b2tlbiA9PiBNZXRlb3IuYWJzb2x1dGVVcmwoYHZlcmlmeS1lbWFpbC8ke3Rva2VufWApO1xyXG4iLCJpbXBvcnQgJy4vY29uZmlnX2FjY291bnRzJztcclxuIiwiaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnbWV0ZW9yL3JhbmRvbSc7XG5cbmNvbnN0IEVYUEVSSU1FTlQgPSB7XG4gICAgX2lkOiAnZGVmYXVsdC1leHBlcmltZW50JyxcbiAgICBuYW1lOiAnZGVmYXVsdCBleHBlcmltZW50JyxcbiAgICB0ZXN0aW5nUGhhc2U6IHRydWUsXG4gICAgZGlzbGlrZVN1cnZleTogbnVsbCxcbiAgICBsaWtlU3VydmV5OiB7XG4gICAgICAgIHF1ZXN0aW9uOiAnV2llc28gbcO2Z2VuIFNpZSBkZW4gQXJ0aWtlbD8nLFxuICAgICAgICBhbnN3ZXJzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcbiAgICAgICAgICAgICAgICB0ZXh0OiAnSWNoIHN0aW1tZSBkZW4gQXVzc2FnZW4gZGVzIEFydGlrZWxzIHp1LicsXG4gICAgICAgICAgICAgICAgdmFsdWU6IDAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIF9pZDogUmFuZG9tLmlkKCksXG4gICAgICAgICAgICAgICAgdGV4dDogJ0ljaCBtYWcgZGVuIFNjaHJlaWJzdGlsLicsXG4gICAgICAgICAgICAgICAgdmFsdWU6IDAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIF9pZDogUmFuZG9tLmlkKCksXG4gICAgICAgICAgICAgICAgdGV4dDogJ0RhcyBUaGVtYSBpbnRlcmVzc2llcnQgbWljaC4nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICB9LFxuICAgIGZlZWRiYWNrRW1haWw6ICdkZGlzLW5ld3MtYXBwQGlmaS51emguY2gnLFxuICAgIGV4cGxhbmF0aW9uVGFnc0RlZjoge1xuICAgICAgICAnNjBmZWVmZDU4YmQxYjUwMTJhZDZlNjg5Jzoge1xuICAgICAgICAgICAgX2lkOiAnNjBmZWVmZDU4YmQxYjUwMTJhZDZlNjg5JyxcbiAgICAgICAgICAgIHRleHRTaG9ydDogJ01tbW1tbW1tbW1tJyxcbiAgICAgICAgICAgIHRleHRMb25nOiAnSW50ZXJlc3RzJyxcbiAgICAgICAgICAgIHRleHRDb2xvckxpZ2h0OiAnI0ZGRkZGRicsXG4gICAgICAgICAgICB0ZXh0Q29sb3JEYXJrOiAnI0ZGRkZGRicsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3JMaWdodDogJyM0NDU0NkEnLFxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yRGFyazogJyM0NDU0NkEnLFxuICAgICAgICAgICAgZGV0YWlsZWRFeHBsYW5hdGlvbjogJ0xvcmVtIGlwc3VtIGRvbG9yIHNpdCBhbWV0LCBjb25zZWN0ZXR1ciBhZGlwaXNjaW5nIGVsaXQuIFV0IGRpZ25pc3NpbSBldCBlbmltIGEgdGVtcG9yLiBFdGlhbSBqdXN0byBudW5jLCBwZWxsZW50ZXNxdWUgYWMgcGxhY2VyYXQgaWQsIGVsZW1lbnR1bSB2ZWwgbmlzbC4gQ3VyYWJpdHVyIHNvbGxpY2l0dWRpbiBjb21tb2RvIGxpZ3VsYSBzZWQgcnV0cnVtLiBBbGlxdWFtIGVsZW1lbnR1bSBtYWxlc3VhZGEgdmVsaXQsIGVnZXQgZmFjaWxpc2lzIHVybmEgZmluaWJ1cyBlbGVpZmVuZC4nLFxuICAgICAgICB9LFxuICAgIH0sXG4gICAgbWF4TnJFeHBsYW5hdGlvblRhZ3M6IDMsXG4gICAgbWF4Q2hhcmFjdGVyRXhwbGFuYXRpb25UYWdTaG9ydDogNSxcbiAgICBtYXhOckZ1cnRoZXJSZWNBcnRpY2xlczogMyxcbiAgICB0b3RhbExpa2VzRGlzbGlrZXNFbmFibGVkOiB0cnVlLFxuICAgIHByZXZpZXdUaXRsZUxpbmVIZWlnaHQ6IDIsXG59O1xuZXhwb3J0IHsgRVhQRVJJTUVOVCB9O1xuIiwiaW1wb3J0IHsgTmV3c0FydGljbGVzIH0gZnJvbSAnLi4vLi4vLi4vYXBpL2FydGljbGVzJztcbmltcG9ydCB7IFN1cnZleXMgfSBmcm9tICcuLi8uLi8uLi9hcGkvc3VydmV5cyc7XG5pbXBvcnQgeyBORVdTX0FSVElDTEVTIH0gZnJvbSAnLi9uZXdzQXJ0aWNsZXMnO1xuaW1wb3J0IHsgU1VSVkVZUyB9IGZyb20gJy4vc3VydmV5cyc7XG5pbXBvcnQgRXhwZXJpbWVudHMgZnJvbSAnLi4vLi4vLi4vYXBpL2V4cGVyaW1lbnRzJztcbmltcG9ydCB7IEVYUEVSSU1FTlQgfSBmcm9tICcuL2V4cGVyaW1lbnRzJztcblxuY29uc3QgbnVtYmVyT2ZOZXdzQXJ0aWNsZXNJbkRhdGFiYXNlID0gTmV3c0FydGljbGVzLmZpbmQoKS5jb3VudCgpO1xuaWYgKG51bWJlck9mTmV3c0FydGljbGVzSW5EYXRhYmFzZSA9PT0gMCkge1xuICAgIE5FV1NfQVJUSUNMRVMuZm9yRWFjaCgobikgPT4ge1xuICAgICAgICBOZXdzQXJ0aWNsZXMuaW5zZXJ0KG4pO1xuICAgIH0pO1xufVxuXG5jb25zdCBudW1iZXJPZlN1cnZleXNJbkRhdGFiYXNlID0gU3VydmV5cy5maW5kKCkuY291bnQoKTtcbmlmIChudW1iZXJPZlN1cnZleXNJbkRhdGFiYXNlID09PSAwKSB7XG4gICAgU1VSVkVZUy5mb3JFYWNoKChzKSA9PiB7XG4gICAgICAgIFN1cnZleXMuaW5zZXJ0KHMpO1xuICAgIH0pO1xufVxuXG5jb25zdCBudW1iZXJPZkV4cGVyaW1lbnRzSW5EYXRhYmFzZSA9IEV4cGVyaW1lbnRzLmZpbmQoKS5jb3VudCgpO1xuaWYgKG51bWJlck9mRXhwZXJpbWVudHNJbkRhdGFiYXNlID09PSAwKSB7XG4gICAgRXhwZXJpbWVudHMuaW5zZXJ0KEVYUEVSSU1FTlQpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xyXG5leHBvcnQgY29uc3QgTkVXU19BUlRJQ0xFUyA9IFtcclxuICAgIHtcclxuICAgICAgICBfaWQ6ICc1YmZmY2M0ZGQ4OWNiYzAyN2Q1MDJiNmInLFxyXG4gICAgICAgIHVybDogJ2h0dHBzOi8vd3d3Lm56ei5jaC93aXJ0c2NoYWZ0L21vYmlsaWFyLWtvb3BlcmllcnQtbWl0LWNodWJiLWxkLjE0NDA2MDQnLFxyXG4gICAgICAgIGZsYWc6ICcnLFxyXG4gICAgICAgIHByaW1hcnlDYXRlZ29yeTogJ1dpcnRzY2hhZnQnLFxyXG4gICAgICAgIHN1YkNhdGVnb3JpZXM6IFtcclxuICAgICAgICAgICAgJycsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBwYWdlVHlwZTogJ3JlZ3VsYXInLFxyXG4gICAgICAgIHRpdGxlOiAnTW9iaWxpYXIga29vcGVyaWVydCBtaXQgQ2h1YmInLFxyXG4gICAgICAgIGxlYWQ6ICdEaWUgc3RhcmsgYXVmIGRpZSBTY2h3ZWl6IGF1c2dlcmljaHRldGUgVmVyc2ljaGVydW5nIE1vYmlsaWFyIHdpbGwgYXVjaCBpbiBadWt1bmZ0IFVudGVybmVobWVuIG1pdCBTaXR6IGluIGRlciBTY2h3ZWl6IGltIEF1c2xhbmQgYmVnbGVpdGVuLiBEYXMgd2lsbCBzaWUgbmV1IHp1c2FtbWVuIG1pdCBkZW0gaW50ZXJuYXRpb25hbGVuIFZlcnNpY2hlcnVuZ3Nrb256ZXJuIENodWJiIG1hY2hlbi4nLFxyXG4gICAgICAgIGF1dGhvcjogJ1dlcm5lciBFbnonLFxyXG4gICAgICAgIGRhdGVQdWJsaXNoZWQ6IG5ldyBEYXRlKCcyMDE4LTExLTI5VDEwOjUzOjU1LjQwOFonKSxcclxuICAgICAgICBkYXRlVXBkYXRlZDogbmV3IERhdGUoJzIwMTgtMTEtMjlUMTA6NTM6NTUuNDA4WicpLFxyXG4gICAgICAgIGRhdGVTY3JhcGVkOiBuZXcgRGF0ZSgnMjAxOC0xMS0yOVQxMjoyMzo1Ny4yNDVaJyksXHJcbiAgICAgICAgbGFuZ3VhZ2U6ICdkZS1DSCcsXHJcbiAgICAgICAgb3V0bGV0OiAnTlpaJyxcclxuICAgICAgICBpbWFnZTogJycsXHJcbiAgICAgICAgYm9keTogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGllIGdlbm9zc2Vuc2NoYWZ0bGljaGUgTW9iaWxpYXIgd2lyZCBpbiBkZW4gU3BhcnRlbiBTYWNoLSB1bmQgSGFmdHBmbGljaHR2ZXJzaWNoZXJ1bmdlbiBpbSBBdXNsYW5kZ2VzY2jDpGZ0IG5ldSBtaXQgZGVtIEluZHVzdHJpZXZlcnNpY2hlcmVyIENodWJiIHp1c2FtbWVuYXJiZWl0ZW4uIEJpcyBhbmhpbiBoYXR0ZSBtYW4gU2Nod2VpemVyIFVudGVybmVobWVuc2t1bmRlbiBpbiBLb29wZXJhdGlvbiBtaXQgWEwgQ2F0bGluIGltIEF1c2xhbmQgYmVnbGVpdGV0LiBFcyBpc3Qgd29obCB6dW0gV2VjaHNlbCBnZWtvbW1lbiwgd2VpbCBYTCBDYXRsaW4gaW56d2lzY2hlbiB2b20gQXhhLUtvbnplcm4sIGVpbmVtIHNjaGFyZmVuIEtvbmt1cnJlbnRlbiBkZXIgTW9iaWxpYXIgaW4gZGVyIFNjaHdlaXosIMO8YmVybm9tbWVuIHdvcmRlbiBpc3QuJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0NodWJiIGlzdCBzZWl0IHZpZWxlbiBKYWhyZW4gaW4gZGVyIFNjaHdlaXogYWt0aXYgdW5kIGJlc2Now6RmdGlndCB6dXJ6ZWl0IDc1IE1pdGFyYmVpdGVyLiBEdXJjaCBkYXMgWnVzYW1tZW5nZWhlbiBkZXIgVW50ZXJuZWhtZW4gQWNlIHVuZCBDaHViYiBpc3QgZGVyIDMxwqAwMDAgTWl0YXJiZWl0ZXIgYmVzY2jDpGZ0aWdlbmRlIEtvbnplcm4gbnVubWVociB6dW0gZ3LDtnNzdGVuIGLDtnJzZW5rb3RpZXJ0ZW4gSW5kdXN0cmlldmVyc2ljaGVyZXIgYXVmZ2VzdGllZ2VuLiBDaHViYiB3aXJkIHZvbiBTdGFuZGFyZCAmIFBvb3ImYXBvc3MgbWl0IGRlbSBBQS1SYXRpbmcgYmVub3RldCB1bmQgd2lyZCBhbiBkZXIgQsO2cnNlIG1pdCBydW5kIDYyIE1yZC7CoCQgYmV3ZXJ0ZXQuICcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiAnNWJmZmNjNGRkODljYmMwMjdkNTAyYjZjJyxcclxuICAgICAgICB1cmw6ICdodHRwczovL3d3dy5uenouY2gvaW50ZXJuYXRpb25hbC9kaWVzZS1sYWVuZGVyLWxlaG5lbi1kZW4tdW5vLW1pZ3JhdGlvbnNwYWt0LWFiLW9kZXItem9lZ2Vybi1taXQtZGVyLXp1c3RpbW11bmctbGQuMTQzODQ3NicsXHJcbiAgICAgICAgZmxhZzogJycsXHJcbiAgICAgICAgcHJpbWFyeUNhdGVnb3J5OiAnSW50ZXJuYXRpb25hbCcsXHJcbiAgICAgICAgc3ViQ2F0ZWdvcmllczogW1xyXG4gICAgICAgICAgICAnJyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHBhZ2VUeXBlOiAncmVndWxhcicsXHJcbiAgICAgICAgdGl0bGU6ICdEZXV0c2NobGFuZMKgZGViYXR0aWVydCDDvGJlciBkZW4gVW5vLU1pZ3JhdGlvbnNwYWt0wqDigJMgYW5kZXJlIEzDpG5kZXIgaGFiZW4gaWhuIGJlcmVpdHMgYWJnZWxlaG50JyxcclxuICAgICAgICBsZWFkOiAnSW4gdmVyc2NoaWVkZW5lbiBTdGFhdGVuIHd1cmRlIGRlciBVbm8tTWlncmF0aW9uc3Bha3QgaW4gZGVuIGxldHp0ZW4gV29jaGVuIHp1bSBQb2xpdGlrdW0uIEJpcyBqZXR6dCB2ZXJ3ZWlnZXJuIG5ldW4gTMOkbmRlciBkaWUgVW50ZXJzdMO8dHp1bmcuIEluIERldXRzY2hsYW5kIGRlYmF0dGllcnQgaGV1dGUgZGVyIEJ1bmRlc3RhZy4gVmVyZm9sZ2VuIFNpZSBkaWUgRGViYXR0ZSBsaXZlIChhYiAxMiBVaHIgMjApLicsXHJcbiAgICAgICAgYXV0aG9yOiAnRmFiaWFuIFVyZWNoLCBTYW11ZWwgTWlzdGVsaSwgSXZvIE1pam5zc2VuJyxcclxuICAgICAgICBkYXRlUHVibGlzaGVkOiBuZXcgRGF0ZSgnMjAxOC0xMS0yOVQxMDo1MjoyMS4wMDJaJyksXHJcbiAgICAgICAgZGF0ZVVwZGF0ZWQ6IG5ldyBEYXRlKCcyMDE4LTExLTI5VDEwOjU3OjQyLjIxN1onKSxcclxuICAgICAgICBkYXRlU2NyYXBlZDogbmV3IERhdGUoJzIwMTgtMTEtMjlUMTI6MjM6NTcuNDgyWicpLFxyXG4gICAgICAgIGxhbmd1YWdlOiAnZGUtQ0gnLFxyXG4gICAgICAgIG91dGxldDogJ05aWicsXHJcbiAgICAgICAgaW1hZ2U6ICdodHRwczovL2ltZy5uenouY2gvQz1XNTU4MCxIMjkyOS41LFgwLFkzMzcuNzUvUz1XMTIwME0sSDYzME0vTz03NS9DPUFSMTIwMHg2MzAvaHR0cHM6Ly9uenotaW1nLnMzLmFtYXpvbmF3cy5jb20vMjAxOC8xMS8yMi8xMGUwNDZmMy1lMTcyLTQ0NDEtYTk2ZC1iZmJkNjU0YjgyODIuanBlZycsXHJcbiAgICAgICAgYm9keTogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGVyIE1pZ3JhdGlvbnNwYWt0ICjCq01pZ3JhdGlvbiBDb21wYWN0wrspIHNvbGwgYW4gZWluZW0gR2lwZmVsdHJlZmZlbiB2b20gMTAuIHVuZCAxMS7CoERlemVtYmVyIGluIE1hcm9ra28gYmVzaWVnZWx0IHdlcmRlbi4gRGllIFVubyB3aWxsIGRhbWl0IHp1bSBlcnN0ZW4gTWFsIEdydW5kc8OkdHplIGbDvHIgZGVuIFVtZ2FuZyBtaXQgTWlncmFudGVuIGZlc3RsZWdlbi4gSW0gSnVsaSBoYXR0ZW4gc2ljaCBkaWUgw7xiZXIgMTkwIFN0YWF0ZW4sIGRpZSBhbiBkZXIgRXJhcmJlaXR1bmcgYmV0ZWlsaWd0IHdhcmVuLCBuYWNoIDE4IE1vbmF0ZW4gYXVmIGRpZSBFbmRmYXNzdW5nIGRlcyBEb2t1bWVudHMgZ2VlaW5pZ3QuIE1pdCBkZW0gUGFrdCBzb2xsIGluc2Jlc29uZGVyZSBkaWUgaWxsZWdhbGUgRWlud2FuZGVydW5nIHZlcmhpbmRlcnQgdW5kIGRpZSBsZWdhbGUgRWlud2FuZGVydW5nIGJlc3NlciBnZXN0ZXVlcnQgd2VyZGVuLiBEaWUgVW50ZXJ6ZWljaG5lciBiZWtlbm5lbiBzaWNoIGRhenUsIGRhZsO8ciBlaW5lIFJlaWhlIHZvbiBNYXNzbmFobWVuIGFuenV3ZW5kZW4sIGRpZSB2b24gZGVyIFZlcmJlc3NlcnVuZyBkZXIgQmV0cmV1dW5nIGluIEhlcmt1bmZ0cy0gdW5kIFppZWxsw6RuZGVybiDDvGJlciBJbmZvcm1hdGlvbnNrYW1wYWduZW4gZW50bGFuZyBkZXIgTWlncmF0aW9uc3JvdXRlbiBiaXMgenUgdHJhbnNwYXJlbnRlbiBWZXJmYWhyZW4gYW4gZGVuIEdyZW56ZW4gcmVpY2hlbi4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGVyIFVtZ2FuZyBtaXQgRmzDvGNodGxpbmdlbiBzdGVodCBpbSBaZW50cnVtIGVpbmVzIHp3ZWl0ZW4gQWJrb21tZW5zLCBkZXMgRmzDvGNodGxpbmdzcGFrdHMsIGRlciBhbiBkZW0gR2lwZmVsIGViZW5mYWxscyB2ZXJhYnNjaGllZGV0IHdlcmRlbiBzb2xsLiBEaWUgYmVpZGVuIEFia29tbWVuIHNpbmQgbmljaHQgcmVjaHRzdmVyYmluZGxpY2guIERlbm5vY2ggaGFiZW4gc2llIGluIHZlcnNjaGllZGVuZW4gTMOkbmRlcm4gZWluZSBrb250cm92ZXJzZSBEaXNrdXNzaW9uIGF1c2dlbMO2c3QuJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N1YnRpdGxlJyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdEZXV0c2NoZXIgQnVuZGVzdGFnIGRlYmF0dGllcnQnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnSW4gRGV1dHNjaGxhbmQgd2lyZCBkZXIgTWlncmF0aW9uc3Bha3Qgc2VpdCBXb2NoZW4ga29udHJvdmVycyBkaXNrdXRpZXJ0LiDDnGJlciBkZW4gQW50cmFnIHNvbGwgbnVuIGFtIERvbm5lcnN0YWcgaW0gQnVuZGVzdGFnIGJlcmF0ZW4gdW5kIGFiZ2VzdGltbXQgd2VyZGVuLiBWZXJmb2xnZW4gU2llIGRpZSBEZWJhdHRlIGhpZXIgbGl2ZSAoYWIgMTIgVWhyIDIwKTogJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0RpZSBDRFUgd2lsbCBkZW4gUGFybGFtZW50c2Jlc2NobHVzcyBhbHMgR3J1bmRsYWdlIGbDvHIgZWluZW4gTGVpdGFudHJhZyBmw7xyIGlocmVuIEJ1bmRlc3BhcnRlaXRhZyBpbSBEZXplbWJlciBuZWhtZW4uIERpZSBVbmlvbnNmcmFrdGlvbiBpbSBCdW5kZXN0YWcgaGF0IHNpY2ggYW0gRGllbnN0YWcgZmFzdCBlaW5tw7x0aWcgaGludGVyIGRlbiBnZXBsYW50ZW4gVW5vLU1pZ3JhdGlvbnNwYWt0IGdlc3RlbGx0LiAnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRm9sZ2VuZGVuIEzDpG5kZXIgKGluIGNocm9ub2xvZ2lzY2hlciBBYmZvbGdlKSBoYWJlbiBiZXJlaXRzIGFuZ2Vrw7xuZGlndCwgZGVuIE1pZ3JhdGlvbnNwYWt0IGluIE1hcm9ra28gbmljaHQgenUgdmVyYWJzY2hpZWRlbi4gJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N1YnRpdGxlJyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdVU0EnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGllIFVTQSBnYWJlbiBiZXJlaXRzIGltIERlemVtYmVyIDIwMTcgYmVrYW5udCwgc2ljaCBuaWNodCBhbSBNaWdyYXRpb25zcGFrdCB6dSBiZXRlaWxpZ2VuLiBBbHMgZWluemlnZXMgZGVyIDE5MyBVbm8tTWl0Z2xpZWRlciBuYWhtZW4gc2llIGdhciBuaWNodCBlcnN0IGFuIGRlbiBWZXJoYW5kbHVuZ2VuIHRlaWwuIERpZSBWZXJ3ZWlnZXJ1bmdzaGFsdHVuZyBkZXIgVVNBIGthbSBhbmdlc2ljaHRzIGRlciBoYXJ0ZW4gTGluaWUgZGVyIFJlZ2llcnVuZyBUcnVtcCBpbiBkZXIgTWlncmF0aW9uc3BvbGl0aWsgbmljaHQgw7xiZXJyYXNjaGVuZC4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VidGl0bGUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ1VuZ2FybicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdEYXMgbmF0aW9uYWxrb25zZXJ2YXRpdiByZWdpZXJ0ZSBVbmdhcm4gdmVybGllc3MgZGllIFZlcmhhbmRsdW5nZW4genVtIE1pZ3JhdGlvbnNwYWt0IGt1cnogdm9yIGRlcmVuIEFic2NobHVzcyBpbSBKdWxpLiBBdXNzZW5taW5pc3RlciBQZXRlciBTemlqamFydG8gYmVncsO8bmRldGUgZGVuIFNjaHJpdHQgbWl0IGhhcnNjaGVuIFdvcnRlbjogRGFzIFBhcGllciB3aWRlcnNwcmVjaGUgwqtqZWdsaWNoZXIgVmVybnVuZnTCuyB1bmQgc2VpIMKrZXh0cmVtaXN0aXNjaCwgdm9yZWluZ2Vub21tZW4sIGVpbiBGw7ZyZGVyZXIgdm9uIE1pZ3JhdGlvbsK7LiBTemlqamFydG8gZsO8cmNodGV0IHp1ZGVtIHJlY2h0bGljaGUgVmVycGZsaWNodHVuZ2VuLiBFciDDpHVzc2VydGUgWndlaWZlbCBkYXJhbiwgZGFzcyBkZXIgTWlncmF0aW9uc3Bha3QgcmVjaHRsaWNoIG5pY2h0IGJpbmRlbmQgc2VpIOKAkyBvYndvaGwgZGllcyBpbSBUZXh0IGRlcyBBYmtvbW1lbnMgZXhwbGl6aXQgZmVzdGdlaGFsdGVuIGlzdC4gRGllIHVuZ2FyaXNjaGUgUmVnaWVydW5nIHdlaHJ0IHNpY2ggaW5zYmVzb25kZXJlIGdlZ2VuIGRpZSBpbSBWZXJ0cmFnIHZvcmdlc2NobGFnZW5lbiBpbnRlcm5hdGlvbmFsZW4gU3RhbmRhcmRzIGbDvHIgZGllIEJlaGFuZGx1bmcgdm9uIE1pZ3JhbnRlbiBhbiBkZW4gTGFuZGVzZ3JlbnplbjsgZGllc2Ugc2VpZW4gZWluZSByZWluIG5hdGlvbmFsZSBBbmdlbGVnZW5oZWl0LCBlcmtsw6RydGUgU3ppamphcnRvIGltIE5vdmVtYmVyLiBVbmdhcm4gc3RlaHQgc2VpdCBKYWhyZW4gaW50ZXJuYXRpb25hbCBpbiBkZXIgS3JpdGlrLCB3ZWlsIGVzIEFzeWxiZXdlcmJlciBhbiBkZXIgR3JlbnplIHp1IFNlcmJpZW4gc3RhbmRhcmRtw6Rzc2lnIMO8YmVyIE1vbmF0ZSBpbnRlcm5pZXJ0LiBEZXIgTWlncmF0aW9uc3Bha3Qgc2llaHQgSW50ZXJuaWVydW5nIGhpbmdlZ2VuIG51ciBpbiBhYnNvbHV0ZW4gQXVzbmFobWVmw6RsbGVuIHZvci4gJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N1YnRpdGxlJyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICfDlnN0ZXJyZWljaCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdEaWUgUmVnaWVydW5nIGluIFdpZW4gdHJhdCBtaXQgaWhyZW0gUsO8Y2t6dWcgZWluZSBicmVpdGUgZXVyb3DDpGlzY2hlIERlYmF0dGUgw7xiZXIgZGVuIE1pZ3JhdGlvbnNwYWt0IGxvcy4gTmFjaGRlbSDDtnN0ZXJyZWljaGlzY2hlIERpcGxvbWF0ZW4gbWFzc2dlYmxpY2ggYW4gZGVuIFZlcmhhbmRsdW5nZW4gYmV0ZWlsaWd0IGdld2VzZW4gd2FyZW4sIGJlc2NobG9zcyBkaWUgUmVnaWVydW5nIGF1cyDDllZQIHVuZCBGUMOWIEVuZGUgT2t0b2JlciwgZGFzIERva3VtZW50IG5pY2h0IHp1IHVudGVyc3TDvHR6ZW4gdW5kIGltIERlemVtYmVyIGtlaW5lbiBWZXJ0cmV0ZXIgbmFjaCBNYXJyYWtlc2NoIHp1IGVudHNlbmRlbi4gTWl0dmVyYW50d29ydGxpY2ggZsO8ciBkaWVzZSBFbnRzY2hlaWR1bmcgd2FyIGVpbmUgaGVmdGlnZSBLYW1wYWduZSBpZGVudGl0w6RyZXIgS3JlaXNlLCBkZXJlbiBBcmd1bWVudGUgc2ljaCB0ZWlsd2Vpc2UgaW4gZGVyIG9mZml6aWVsbGVuIFJlZ2llcnVuZ3Nwb3NpdGlvbiB3aWVkZXJmaW5kZW4uICcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdJbiBkZXIgRXJrbMOkcnVuZyBkZXIgUmVnaWVydW5nIGhpZXNzIGVzLCBkaWUgUmVwdWJsaWsgZW50c2NoZWlkZSBzb3V2ZXLDpG4gw7xiZXIgZGllIFp1bGFzc3VuZyB2b24gWnV3YW5kZXJ1bmcgdW5kIGtlbm5lIGtlaW4gwqtNZW5zY2hlbnJlY2h0IGF1ZiBNaWdyYXRpb27Cuy4gRGllIFNjaGFmZnVuZyBkZXIgdsO2bGtlcnJlY2h0bGljaGVuIEthdGVnb3JpZSBkZXMgwqtNaWdyYW50ZW7CuyBzZWkgenVkZW0genVyw7xja3p1d2Vpc2VuLiBJbSBJbnRlcnZpZXcgbWl0IGRlciBOWlogYmVncsO8bmRldCBCdW5kZXNrYW56bGVyIFNlYmFzdGlhbiBLdXJ6IGRpZSBBYmxlaG51bmcgZGFtaXQsIGRhc3MgZGVyIE1pZ3JhdGlvbnNiZWdyaWZmIGltIFBha3QgenUgc2Nod2FtbWlnIHNlaS4gR2xlaWNoemVpdGlnIGJldG9udGUgZXI6IMKrVHJvdHogdW5zZXJlciBFbnRoYWx0dW5nIGVyYWNodGVuIHdpciBhYmVyIGVpbmUgbXVsdGlsYXRlcmFsZSBadXNhbW1lbmFyYmVpdCBpbiBNaWdyYXRpb25zZnJhZ2VuIGFscyBzaW5udm9sbC7CuyBCdW5kZXNwcsOkc2lkZW50IEFsZXhhbmRlciBWYW4gZGVyIEJlbGxlbiB2ZXJsaWVoIG5hY2ggZGVtIFLDvGNrenVnIGluIGVpbmVyIHNlbHRlbmVuIGlubmVucG9saXRpc2NoZW4gSW50ZXJ2ZW50aW9uIHNlaW5lciBTb3JnZSB1bSBkYXMgQW5zZWhlbiB1bmQgZGllIEdsYXVid8O8cmRpZ2tlaXQgw5ZzdGVycmVpY2hzIEF1c2RydWNrLicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWJ0aXRsZScsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnQnVsZ2FyaWVuJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0J1bGdhcmllbnMgUmVnaWVydW5nIHVtIGRlbiBNaW5pc3RlcnByw6RzaWRlbnRlbiBCb2prbyBCb3Jpc293IGJlZ3LDvG5kZXQgaWhyZW4gUsO8Y2t6dWcgYXVzIGRlbSBNaWdyYXRpb25zcGFrdCBhbSAxMi7CoE5vdmVtYmVyIG1pdCBkZW0gSGlud2VpcyBhdWYgbmF0aW9uYWxlIEludGVyZXNzZW4uIERhcyBBYmtvbW1lbiB3w7xyZGUgZWJlbmRpZXNlIGdlZsOkaHJkZW4sIGVya2zDpHJ0ZSBkZXIgRnJha3Rpb25zY2hlZiBkZXIgbmF0aW9uYWxrb25zZXJ2YXRpdmVuIFJlZ2llcnVuZ3NwYXJ0ZWkgR2VyYiwgWndldGFuIFp3ZXRhbm93LiBCdWxnYXJpZW4gaGF0IHNlaW5lIE1pZ3JhdGlvbnNwb2xpdGlrIHZlcnNjaMOkcmZ0LCBzZWl0IHp3aXNjaGVuIDIwMTMgdW5kIDIwMTYgaW0gWnVnZSBkZXIgRmzDvGNodGxpbmdza3Jpc2UgbWVocmVyZSBaZWhudGF1c2VuZCBNaWdyYW50ZW4gdm9uIGRlciBUw7xya2VpIGhlciBpbnMgTGFuZCBrYW1lbi4gU29maWEgcmVhZ2llcnRlIG1pdCBkZW0gQmF1IGVpbmVzIEdyZW56emF1bnMuIERpZSBtZWlzdGVuIE1pZ3JhbnRlbiBudXR6dGVuIEJ1bGdhcmllbiBqZWRvY2ggbnVyIGFscyBad2lzY2hlbnN0YXRpb24gYXVmIGRlciBXZWl0ZXJyZWlzZSBpbiBSaWNodHVuZyBNaXR0ZWxldXJvcGEuIFVtIHdpZWRlciBhbiBkaWUgUmVnaWVydW5nIHp1IGtvbW1lbiwgYmlsZGV0ZSBCb3Jpc293IDIwMTcgenVkZW0gZWluZSBLb2FsaXRpb24gbWl0IGRlciByZWNodHNleHRyZW1lbiBQYXJ0ZWllbmdydXBwZSBWZXJlaW5pZ3RlIFBhdHJpb3Rlbi4gRGllc2UgcHJvZmlsaWVydCBzaWNoIHN0YXJrIMO8YmVyIGRpZSBBYmxlaG51bmcgZGVyIE1pZ3JhdGlvbi4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VidGl0bGUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ1RzY2hlY2hpZW4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGFzIHRzY2hlY2hpc2NoZSBSZWdpZXJ1bmdza2FiaW5ldHQgYmVzY2hsb3NzIE1pdHRlIE5vdmVtYmVyLCBkZW4gTWlncmF0aW9uc3Bha3QgbmljaHQgenUgdW50ZXJ6ZWljaG5lbi4gRGllIE1pbmRlcmhlaXRzcmVnaWVydW5nIGF1cyBwb3B1bGlzdGlzY2hlciBBTk8gdW5kIHNvemlhbGRlbW9rcmF0aXNjaGVyIENTU0QgYmVrbGFndCB3aWUgYW5kZXJlIEzDpG5kZXIgYXVjaCwgZGFzcyBkYXMgUGFwaWVyIG5pY2h0IGdlbsO8Z2VuZCB6d2lzY2hlbiDCq2xlZ2FsZXLCuyB1bmQgwqtpbGxlZ2FsZXLCuyBNaWdyYXRpb24gdW50ZXJzY2hlaWRlLiBNaW5pc3RlcnByw6RzaWRlbnQgdW5kIEFOTy1HcsO8bmRlciBBbmRyZWogQmFiaXMgaGF0dGUgc2Nob24gZnLDvGhlciBlcmtsw6RydCwgZGVyIE1pZ3JhdGlvbnNwYWt0IHNlaSB1bmtsYXIgZm9ybXVsaWVydCB1bmQga8O2bm50ZSBtaXNzYnJhdWNodCB3ZXJkZW4uIERhcyBQYXBpZXIgZ2Vmw6RocmRlIGdhciBkaWUgU2ljaGVyaGVpdCB1bmQgbmF0aW9uYWxlIFNvdXZlcsOkbml0w6R0IFRzY2hlY2hpZW5zLiBCYWJpcyBoYXR0ZSBkaWUgV2FobCBBbmZhbmcgSmFociBtYXNzZ2VibGljaCBtaXQgZGVtIFZlcnNwcmVjaGVuIGdld29ubmVuLCBkaWUgaWxsZWdhbGUgTWlncmF0aW9uIHp1IGJla8OkbXBmZW4uIEJlcmVpdHMgZGllIFZvcmfDpG5nZXJyZWdpZXJ1bmcgaGF0dGUgZWluZSBFVS13ZWl0ZSBWZXJ0ZWlsdW5nIHZvbiBGbMO8Y2h0bGluZ2VuIGFiZ2VsZWhudC4gU2llIHdpc3NlbiBkYWJlaSBhdWNoIGVpbmUgTWVocmhlaXQgZGVyIEJldsO2bGtlcnVuZyBoaW50ZXIgc2ljaC4gJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N1YnRpdGxlJyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdQb2xlbicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdQb2xlbiBlcmtsw6RydGUgYW0gMjAuwqBOb3ZlbWJlciwgZGVuIE1pZ3JhdGlvbnNwYWt0IG5pY2h0IG1pdHp1dHJhZ2VuLiBEaWUgbmF0aW9uYWxrb25zZXJ2YXRpdmUgUmVnaWVydW5nIGluIFdhcnNjaGF1IGJlZ3LDvG5kZXQgaWhyZW4gRW50c2NoZWlkIG1pdCBzb3V2ZXLDpG5pdMOkdHNwb2xpdGlzY2hlbiBCZWRlbmtlbi4gRGVyIFBha3QgZ2FyYW50aWVyZSBuaWNodCBhdXNyZWljaGVuZCBkYXMgUmVjaHQgdm9uIFN0YWF0ZW4sIGRhcsO8YmVyIHp1IGVudHNjaGVpZGVuLCB3ZXIgYXVmIGlocmVtIFRlcnJpdG9yaXVtIGF1Zmdlbm9tbWVuIHdlcmRlLiDCq1dpciBzaW5kIGRlciBBbnNpY2h0LCBkYXNzIHVuc2VyZSBzb3V2ZXLDpG5lbiBQcmluemlwaWVuIGFic29sdXRlIFByaW9yaXTDpHQgaGFiZW7CuywgaGF0dGUgUG9sZW5zIE1pbmlzdGVycHLDpHNpZGVudCBNYXRldXN6IE1vcmF3aWVja2kgQW5mYW5nIE5vdmVtYmVyIGdlc2FndC4gS3JpdGlzY2ggc2llaHQgZGllIHBvbG5pc2NoZSBSZWdpZXJ1bmcgYXVjaCBkaWUgaW0gUGFrdCBnZW1hY2h0ZSBVbnRlcnNjaGVpZHVuZyB6d2lzY2hlbiBsZWdhbGVyIHVuZCBpbGxlZ2FsZXIgTWlncmF0aW9uLiBEaWUgdmVyd2VuZGV0ZW4gQmVncmlmZmxpY2hrZWl0ZW4ga8O2bm50ZW4genUgU2Nod2llcmlna2VpdGVuIGJlaSBkZXIgVW1zZXR6dW5nIGRlcyBBYmtvbW1lbnMgZsO8aHJlbiwgaGVpc3N0IGVzIGF1cyBXYXJzY2hhdS4gJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N1YnRpdGxlJyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdJc3JhZWwnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnwqtXaXIgZsO8aGxlbiB1bnMgZGVtIFNjaHV0eiB1bnNlcmVyIEdyZW56ZW4gdm9yIGlsbGVnYWxlbiBFaW53YW5kZXJlcm4gdmVycGZsaWNodGV0wrssIGJlZ3LDvG5kZXRlIE1pbmlzdGVycHLDpHNpZGVudCBCZW5qYW1pbiBOZXRhbnlhaHUgYW0gMjAuwqBOb3ZlbWJlciBkZW4gRW50c2NoZWlkLCBzaWNoIGF1cyBkZW0gTWlncmF0aW9uc3Bha3QgenVyw7xja3p1emllaGVuLiBJc3JhZWwgdmVyZm9sZ3QgZWluZSByZXN0cmlrdGl2ZSBGbMO8Y2h0bGluZ3Nwb2xpdGlrIHVuZCB2ZXJzdWNodCBzZWl0IG1laHJlcmVuIE1vbmF0ZW4sIFplaG50YXVzZW5kZSB2b24gYWZyaWthbmlzY2hlbiBNaWdyYW50ZW4gYWJ6dXNjaGllYmVuLicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWJ0aXRsZScsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnQXVzdHJhbGllbicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdEZXIgTWlncmF0aW9uc3Bha3Qgc2VpIG5pY2h0IGltIEludGVyZXNzZSBBdXN0cmFsaWVucyB1bmQgc3RlaGUgaW0gV2lkZXJzcHJ1Y2ggenVyIFBvbGl0aWsgc2VpbmVyIFJlZ2llcnVuZywgc2FndGUgUHJlbWllcm1pbmlzdGVyIFNjb3R0IE1vcnJpc29uIGFtIDIxLsKgTm92ZW1iZXIuIERlciBQYWt0IGvDtm5uZSB6dXIgwqtpbGxlZ2FsZW4gRWlud2FuZGVydW5nwrsgaW4gZGFzIExhbmQgZXJtdXRpZ2VuLiBBdXNzZW5taW5pc3RlciBQZXRlciBEdXR0b24gaGF0dGUgYmVyZWl0cyBpbSBTb21tZXIgc2VpbmUgQWJsZWhudW5nIGt1bmRnZXRhbi4gRGllIFJlZ2llcnVuZyBNb3JyaXNvbnMgc3RlaHQgZsO8ciBlaW5lIGhhcnRlIEVpbndhbmRlcnVuZ3MtIHVuZCBBc3lscG9saXRpay4gQXVzdHJhbGllbiBmw6RuZ3QgRmzDvGNodGxpbmdlLCBkaWUgZGFzIExhbmQgYXVmIEJvb3RlbiBlcnJlaWNoZW4gd29sbGVuLCBhYiB1bmQgaMOkbHQgc2llIGluIExhZ2VybiBhdWYgUGF6aWZpa2luc2VsbiBmZXN0LCB3YXMgaW1tZXIgd2llZGVyIHp1IHNjaGFyZmVyIEtyaXRpayBmw7xocnQuJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N1YnRpdGxlJyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdTbG93YWtlaScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdOYWNoIGVpbmVtIGhlZnRpZ2VuIFN0cmVpdCBpbm5lcmhhbGIgZGVyIFJlZ2llcnVuZyBoYXQgZGllIFNsb3dha2VpIGFtIDI2LsKgTm92ZW1iZXIgZXJrbMOkcnQsIGRhcyBMYW5kIHdlcmRlIGRlbiBNaWdyYXRpb25zcGFrdCBuaWNodCB1bnRlcnNjaHJlaWJlbi4gwqtEaWUgU2xvd2FrZWkgaXN0IG5pY2h0IGVpbnZlcnN0YW5kZW4gZGFtaXQsIGRhc3MgZXMga2VpbmVuIFVudGVyc2NoaWVkIHp3aXNjaGVuIGxlZ2FsZXIgdW5kIGlsbGVnYWxlciBNaWdyYXRpb24gZ2lidCwgdW5kIHdpciBiZXRyYWNodGVuIFdpcnRzY2hhZnRzbWlncmF0aW9uIGFscyBpbGxlZ2FsLCBzY2jDpGRsaWNoIHVuZCBhbHMgZWluIFNpY2hlcmhlaXRzcmlzaWtvwrssIGVya2zDpHJ0ZSBkZXIgUmVnaWVydW5nc2NoZWYgUGV0ZXIgUGVsbGVncmluaS4gWnV2b3IgaGF0dGUgZGVyIEF1c3Nlbm1pbmlzdGVyIG1pdCBzZWluZW0gUsO8Y2t0cml0dCBnZWRyb2h0LCBzb2xsdGUgZGllIFNsb3dha2VpIGF1cyBkZW0gUGFrdCBhdXNzdGVpZ2VuLiBCaXNoZXIgaGF0IGVyIGRpZSBEcm9odW5nIGFsbGVyZGluZ3MgbmljaHQgd2FociBnZW1hY2h0LiBEaWUgUmVnaWVydW5nIHN0ZWh0IHNlaXQgZGVyIEVybW9yZHVuZyBlaW5lcyBKb3VybmFsaXN0ZW4sIGRlciDDvGJlciBkaWUgTWFmaWEtS29udGFrdGUgZsO8aHJlbmRlciBQb2xpdGlrZXIgYmVyaWNodGV0ZSwgc3RhcmsgdW50ZXIgRHJ1Y2suIFVtc28gZHJpbmdsaWNoZXIgd2FybnQgc2llIGRlc2hhbGIgdm9yIGRlbiBhbmdlYmxpY2hlbiBHZWZhaHJlbiBkZXIgaWxsZWdhbGVuIE1pZ3JhdGlvbiBpbSBMYW5kLiBad2lzY2hlbiAyMDA0IHVuZCAyMDE3IGZpZWwgZGllIFphaGwgZGVyIGrDpGhybGljaGVuIGlsbGVnYWxlbiBHcmVuesO8YmVydHJpdHRlIGluIGRpZSBTbG93YWtlaSB2b24ga25hcHAgMTDCoDk0NiBhdWYgMjcwNi4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VidGl0bGUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0tvbnRyb3ZlcnNlIERlYmF0dGVuIGluIGFuZGVyZW4gTMOkbmRlcm4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogJzViZmZjYzRkZDg5Y2JjMDI3ZDUwMmI2ZCcsXHJcbiAgICAgICAgdXJsOiAnaHR0cHM6Ly93d3cubnp6LmNoL2ludGVybmF0aW9uYWwvZGllLWdlbGJ3ZXN0ZW4tZXJuZW5uZW4tc3ByZWNoZXItYW5sYXVmLXp1bS1kaWFsb2ctaW4tZnJhbmtyZWljaC1sZC4xNDQwNjA2JyxcclxuICAgICAgICBmbGFnOiAnJyxcclxuICAgICAgICBwcmltYXJ5Q2F0ZWdvcnk6ICdJbnRlcm5hdGlvbmFsJyxcclxuICAgICAgICBzdWJDYXRlZ29yaWVzOiBbXHJcbiAgICAgICAgICAgICcnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcGFnZVR5cGU6ICdyZWd1bGFyJyxcclxuICAgICAgICB0aXRsZTogJ0RpZSBHZWxid2VzdGVuIGVybmVubmVuIFNwcmVjaGVyIOKAkyBBbmxhdWYgenVtIERpYWxvZyBpbiBGcmFua3JlaWNoJyxcclxuICAgICAgICBsZWFkOiAnJyxcclxuICAgICAgICBhdXRob3I6ICdBbmRyZXMgV3lzbGluZycsXHJcbiAgICAgICAgZGF0ZVB1Ymxpc2hlZDogbmV3IERhdGUoJzIwMTgtMTEtMjlUMTA6MzQ6MjcuMzM0WicpLFxyXG4gICAgICAgIGRhdGVVcGRhdGVkOiBuZXcgRGF0ZSgnMjAxOC0xMS0yOVQxMToyMjo1Ni45MTVaJyksXHJcbiAgICAgICAgZGF0ZVNjcmFwZWQ6IG5ldyBEYXRlKCcyMDE4LTExLTI5VDEyOjIzOjU3LjcxNVonKSxcclxuICAgICAgICBsYW5ndWFnZTogJ2RlLUNIJyxcclxuICAgICAgICBvdXRsZXQ6ICdOWlonLFxyXG4gICAgICAgIGltYWdlOiAnJyxcclxuICAgICAgICBib2R5OiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdEaWUgwqtnaWxldHMgamF1bmVzwrsgaW4gRnJhbmtyZWljaCBoYWJlbiBhY2h0IFNwcmVjaGVyIGVybmFubnQsIGRpZSBkaWUgUHJvdGVzdGJld2VndW5nIGluIEdlc3Byw6RjaGVuIG1pdCBkZXIgUmVnaWVydW5nIHZlcnRyZXRlbiBzb2xsZW4uIERhcyB3dXJkZSBzY2hvbiBmcsO8aGVyIGJla2FubnQgdW5kIGFtIERvbm5lcnN0YWcgZnLDvGggZGVmaW5pdGl2IG1pdGdldGVpbHQuIEVzIGhhbmRlbHQgc2ljaCBvZmZlbmJhciB1bSBQZXJzb25lbiwgZGllIGJlaSBkZXIgT3JnYW5pc2F0aW9uIGRlciBTdHJhc3NlbmJsb2NrYWRlbiB1bmQgRGVtb25zdHJhdGlvbmVuIGVpbmUgUm9sbGUgc3BpZWx0ZW4uIE1laHJlcmUgRHV0emVuZCBHZWxid2VzdGVuIGF1cyBkZW0gZ2FuemVuIExhbmQgaGF0dGVuIHNpY2ggaW4gZGVuIGxldHp0ZW4gVGFnZW4gdW5kIFdvY2hlbiBpbiBWaWRlb2tvbmZlcmVuemVuIMO8YmVyIGlociBWb3JnZWhlbiBhYmdlc3Byb2NoZW4sIGF1cyBkaWVzZW4gS29uc3VsdGF0aW9uZW4gaXN0IG51biBkaWUgU3ByZWNoZXJncnVwcGUgaGVydm9yZ2VnYW5nZW4uIERhcyBlcmtsw6RydGVuIEV4cG9uZW50ZW4gZGVyIEdlbGJ3ZXN0ZW4gZ2VnZW7DvGJlciBmcmFuesO2c2lzY2hlbiBNZWRpZW4uJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0VpbmUgYmVzb25kZXJzIHNpY2h0YmFyZSBSb2xsZSBpbiBkZXIgU3ByZWNoZXJncnVwcGUgc3BpZWx0IGRlciBMYXN0d2FnZW5jaGF1ZmZldXIgRXJpYyBEcm91ZXQuIEF1ZiBGYWNlYm9vayBzdGVsbHQgZXIgc2ljaCBkZXIgw5ZmZmVudGxpY2hrZWl0IHZvciwgc3ByaWNodCDDvGJlciBzZWluZSBBbi0gdW5kIEFic2ljaHRlbi4gRGllIHdlaXRlcmVuIFNwcmVjaGVyIGhlaXNzZW4gUHJpc2NpbGxpYSBMdWRvc2t5LCBNYXhpbWUgTmljb2xsZSwgTWF0aGlldSBCbGF2aWVyLCBKYXNvbiBIZXJiZXJ0LCBUaG9tYXMgTWlyYWxsZXMsIE1hcmluZSBDaGFycmV0dGUtTGFiYWRpZSB1bmQgSnVsaWVuIFRlcnJpZXIuIEJlaSBkZXIgQXVzd2FobCBkZXIgU3ByZWNoZXIgd3VyZGUgZGFyYXVmIGdlYWNodGV0LCBkYXNzIGRpZXNlIGtlaW5lIFBhcnRlaWJpbmR1bmdlbiBoYWJlbi4gTWFuIHdpbGwgc2ljaCB3ZWRlciB2b24gbGlua2VuIG5vY2ggdm9uIHJlY2h0ZW4gUHJvdGVzdHBhcnRlaWVuIHZlcmVpbm5haG1lbiBsYXNzZW4uJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0FtIERvbm5lcnN0YWcgdW5kIGFtIEZyZWl0YWcgd2lsbCBkaWUgUmVnaWVydW5nIGluIFBhcmlzIEtvbnN1bHRhdGlvbmVuIGFiaGFsdGVuLCBldHdhIG1pdCBlaW5lbSBCZXJhdHVuZ3NncmVtaXVtIGbDvHIgZGllIEVuZXJnaWV3ZW5kZS4gRsO8ciBGcmVpdGFnIGlzdCBlaW4gVHJlZmZlbiB2b24gUHJlbWllcm1pbmlzdGVyIEVkb3VhcmQgUGhpbGlwcGUgbWl0IGRlbiBTcHJlY2hlcm4gZGVyIEdlbGJ3ZXN0ZW4gdm9yZ2VzZWhlbi4gRGllc2UgdW50ZXJzdHJlaWNoZW4gYWJlciwgZGFzcyBzaWUgd29obCBpbSBOYW1lbiBkZXIgUHJvdGVzdGJld2VndW5nIHNwcsOkY2hlbiwga2VpbmVzZmFsbHMgYWJlciBpbiBkZXJlbiBOYW1lbiBlbnRzY2hlaWRlbiBrw7ZubnRlbi4gQWxsZSBFbnRzY2hlaWR1bmdlbiDDvGJlciBkYXMgd2VpdGVyZSBWb3JnZWhlbiBtw7xzc3RlbiB2b24gZGVyIEdlc2FtdGhlaXQgZGVyIMKrZ2lsZXRzIGphdW5lc8K7IGF1c2dlaGVuLicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiAnNWJmZmNjNGRkODljYmMwMjdkNTAyYjZlJyxcclxuICAgICAgICB1cmw6ICdodHRwczovL3d3dy5uenouY2gvd2lzc2Vuc2NoYWZ0L3dpc3NlbnNjaGFmdGVyLXZlcnVydGVpbGVuLWRhcy12b3JnZWhlbi1oZS1qaWFua3Vpcy1hdWZzLXNjaGFlcmZzdGUtbGQuMTQ0MDU2NicsXHJcbiAgICAgICAgZmxhZzogJycsXHJcbiAgICAgICAgcHJpbWFyeUNhdGVnb3J5OiAnV2lzc2Vuc2NoYWZ0JyxcclxuICAgICAgICBzdWJDYXRlZ29yaWVzOiBbXHJcbiAgICAgICAgICAgICcnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcGFnZVR5cGU6ICdyZWd1bGFyJyxcclxuICAgICAgICB0aXRsZTogJ09mZml6aWVsbGUgU3RlbGx1bmduYWhtZTogV2lzc2Vuc2NoYWZ0ZXIgdmVydXJ0ZWlsZW4gZGFzIFZvcmdlaGVuIEhlIEppYW5rdWlzIGF1ZnMgU2Now6RyZnN0ZScsXHJcbiAgICAgICAgbGVhZDogJ0RpZSBPcmdhbmlzYXRvcmVuIGRlcyBHaXBmZWx0cmVmZmVucyB6dXIgR2VudmVyw6RuZGVydW5nIGFtIE1lbnNjaGVuLCBkYXMgZ2VyYWRlIGluIEhvbmdrb25nIHp1IHNlaW5lbSBBYnNjaGx1c3Mga29tbXQsIGhhYmVuIG9mZml6aWVsbCB6dSBkZW4gQmVoYXVwdHVuZ2VuIEhlIEppYW5rdWlzIFN0ZWxsdW5nIGdlbm9tbWVuLiBTaWUgdmVydXJ0ZWlsZW4gc2VpbiBWb3JnZWhlbiBhdWYgYWxsZW4gRWJlbmVuLicsXHJcbiAgICAgICAgYXV0aG9yOiAnU3RlcGhhbmllIEt1c21hJyxcclxuICAgICAgICBkYXRlUHVibGlzaGVkOiBuZXcgRGF0ZSgnMjAxOC0xMS0yOVQxMDozMTowMC4wMDBaJyksXHJcbiAgICAgICAgZGF0ZVVwZGF0ZWQ6IG5ldyBEYXRlKCcyMDE4LTExLTI5VDExOjE4OjU1LjgyMVonKSxcclxuICAgICAgICBkYXRlU2NyYXBlZDogbmV3IERhdGUoJzIwMTgtMTEtMjlUMTI6MjM6NTcuOTMwWicpLFxyXG4gICAgICAgIGxhbmd1YWdlOiAnZGUtQ0gnLFxyXG4gICAgICAgIG91dGxldDogJ05aWicsXHJcbiAgICAgICAgaW1hZ2U6ICdodHRwczovL2ltZy5uenouY2gvQz1XNDk1MSxIMjU5OS4yNzUsWDAsWTUwMy44NjI1L1M9VzEyMDBNLEg2MzBNL089NzUvQz1BUjEyMDB4NjMwL2h0dHBzOi8vbnp6LWltZy5zMy5hbWF6b25hd3MuY29tLzIwMTgvMTEvMjkvOGM4M2FiOWUtYWEyNi00YjhiLWFmZWItMTQ2NTA4NThmOTkyLmpwZWcnLFxyXG4gICAgICAgIGJvZHk6IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ8KrVW5lcndhcnRldCB1bmQgdGllZiB2ZXJzdMO2cmVuZMK7LCBuZW5uZW4gZGllIE9yZ2FuaXNhdG9yZW4gZGVzIEdpcGZlbHRyZWZmZW5zIHp1bSBFZGl0aWVyZW4gZGVzIG1lbnNjaGxpY2hlbiBHZW5vbXMsIGRhcyBnZXJhZGUgaW4gSG9uZ2tvbmcgenUgRW5kZSBnZWh0LCBkaWUgQmVoYXVwdHVuZ2VuIGRlcyBjaGluZXNpc2NoZW4gRm9yc2NoZXJzIEhlIEppYW5rdWkuIFNpZSByZWFnaWVydGVuIGFtIERvbm5lcnN0YWcgbWl0IGVpbmVyIG9mZml6aWVsbGVuIFN0ZWxsdW5nbmFobWUgYXVmIGRpZSBBbmdhYmVuIEhlcywgbmFjaCBkZW5lbiBpbSBSYWhtZW4gc2VpbmVyIEV4cGVyaW1lbnRlIHp3ZWkgQmFieXMgbWl0IHZlcsOkbmRlcnRlbSBHZW5vbSB6dXIgV2VsdCBnZWtvbW1lbiBzaW5kIHVuZCBlaW5lIHdlaXRlcmUgRnJhdSBtaXQgZWluZW0gbcO2Z2xpY2hlcndlaXNlIGdlbnZlcsOkbmRlcnRlbiBLaW5kIHNjaHdhbmdlciBnZXdvcmRlbiBpc3QuIEhlIGhhdHRlIHNlaW5lIEZvcnNjaHVuZyBhbSBNaXR0d29jaCBhbiBkZW0gVHJlZmZlbiB2b3JnZXN0ZWxsdC4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VidGl0bGUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0V0aGlzY2ggdW5kIHdpc3NlbnNjaGFmdGxpY2ggaW5hZMOkcXVhdCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdJbiBpaHJlciBTdGVsbHVuZ25haG1lIGZvcmRlcm4gZGllIE9yZ2FuaXNhdG9yZW4genVkZW0gZWluZSB1bmFiaMOkbmdpZ2UgQmVzdMOkdGlndW5nIHZvbiBIZXMgQmVoYXVwdHVuZ2VuIHVuZCBlaW5lIFVudGVyc3VjaHVuZyBkZXIgYmVpZGVuIEJhYnlzLiBEYXMgVm9yZ2VoZW4gZGVzIEZvcnNjaGVycyB2ZXJ1cnRlaWxlbiBzaWUgdm9sbGtvbW1lbiwgdW5kIHp3YXIgYXVmIGFsbGVuIEViZW5lbiwgdm9uIEZyYWdlbiBkZXIgRXRoaWsgYmlzIHp1IHNvbGNoZW4gZGVyIFdpc3NlbnNjaGFmdDogRXMgwqt3YXIgdmVyYW50d29ydHVuZ3Nsb3MgdW5kIG5pY2h0IGltIEVpbmtsYW5nIG1pdCBpbnRlcm5hdGlvbmFsZW4gTm9ybWVuLiBadSBkZW4gTcOkbmdlbG4gZGVzIFZvcmdlaGVucyBnZWjDtnJlbiBlaW5lIGluYWTDpHF1YXRlIG1lZGl6aW5pc2NoZSBJbmRpa2F0aW9uLCBlaW4gc2NobGVjaHQgZ2VzdGFsdGV0ZXMgU3R1ZGllbnByb3Rva29sbCwgZGllIE5pY2h0ZXJmw7xsbHVuZyBldGhpc2NoZXIgU3RhbmRhcmRzLCB3YXMgZGVuIFNjaHV0eiB2b24gVmVyc3VjaHN0ZWlsbmVobWVybiBhbmdlaHQsIHVuZCBmZWhsZW5kZSBUcmFuc3BhcmVueiBpbiBkZXIgRW50d2lja2x1bmcsIGRlciBQcsO8ZnVuZyB1bmQgZGVyIER1cmNoZsO8aHJ1bmcgZGVyIGtsaW5pc2NoZW4gUHJvemVkdXJlbi7CuycsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdTaWUgYmV0b25lbiBhYmVyIGF1Y2ggZGVuIFVudGVyc2NoaWVkIHp3aXNjaGVuIGVpbmVyIEdlbnRoZXJhcGllIGFuIEvDtnJwZXJ6ZWxsZW4g4oCTIGRlcmVuIHNjaG5lbGxlbiBGb3J0c2Nocml0dCBzaWUgYXVzZHLDvGNrbGljaCBiZWdyw7xzc2VuIOKAkyB1bmQgZGVyIEtlaW1iYWhudGhlcmFwaWUsIGFuIGRlciBzaWNoIEhlIHZlcnN1Y2h0IGhhYmVuIHdpbGwuIExldHp0Z2VuYW5udGUgbWFjaHQgw4RuZGVydW5nZW4gaW0gR2Vub20genUgZWluZW0gZXJibGljaGVuIEVpbmdyaWZmOiBBbGxlIEF1c3dpcmt1bmdlbiBkZXIgSW50ZXJ2ZW50aW9uIOKAkyBhdWNoIG3DtmdsaWNoZXJ3ZWlzZSB1bmdld29sbHRlIOKAkyB3ZXJkZW4gYW4gZGllIE5hY2hrb21tZW4gd2VpdGVyZ2VnZWJlbi4gTWFuIHdpc3NlIHp1bSBqZXR6aWdlbiBaZWl0cHVua3Qgbm9jaCB6dSB3ZW5pZyDDvGJlciBkaWUgUmlzaWtlbiBzb2xjaGVyIEVpbmdyaWZmZSwgdW0gbWl0IGtsaW5pc2NoZW4gRXhwZXJpbWVudGVuIHp1IGJlZ2lubmVuLCBzY2hyZWliZW4gZGllIE9yZ2FuaXNhdG9yZW4uIERhcyBzZWkgdW52ZXJhbnR3b3J0bGljaC4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VidGl0bGUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ1N0YW5kYXJkcyB1bmQgUmVndWxpZXJ1bmdlbiB2b3JhbnRyZWliZW4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRXMgc2VpIG51biBhYmVyIGFuIGRlciBaZWl0LCDDvGJlciBkaWUgVm9yYXVzc2V0enVuZ2VuIG5hY2h6dWRlbmtlbiwgZGllIGVyZsO8bGx0IHNlaW4gbcO8c3N0ZW4sIHVtIHp1ciBrbGluaXNjaGVuIEZvcnNjaHVuZyBpbiBkaWVzZW0gQmVyZWljaCDDvGJlcmdlaGVuIHp1IGvDtm5uZW4sIHVuZCBkYXLDvGJlciwgd2VsY2hlIEtyaXRlcmllbiBzb2xjaGUgVmVyc3VjaGUgc2VsYnN0IGVyZsO8bGxlbiBtw7xzc3Rlbi4gU2llIGZvcmRlcm4gdW50ZXIgYW5kZXJlbSBkdXJjaHNldHpiYXJlIFN0YW5kYXJkcyB6dW0gcHJvZmVzc2lvbmVsbGVuIFZvcmdlaGVuLCBrbGFyZSBLcml0ZXJpZW4sIHdhcyBlcyBhbiB2b3JrbGluaXNjaGVuIEJlbGVnZW4gYnJhdWNodCwgdW0gbWl0IGRlbiBWZXJzdWNoZW4gZm9ydGZhaHJlbiB6dSBrw7ZubmVuLCBlaW5lIHN0cmVuZ2UsIHVuYWJow6RuZ2lnZSBBdWZzaWNodCDDvGJlciBkaWUgRXhwZXJpbWVudGUgdW5kIGVpbmUgendpbmdlbmRlIG1lZGl6aW5pc2NoZSBOb3R3ZW5kaWdrZWl0IGRlcyBFaW5ncmlmZnMgc293aWUgQWNodHNhbWtlaXQsIHdhcyBBdXN3aXJrdW5nZW4gYXVmIGRpZSBHZXNlbGxzY2hhZnQgYW5nZWh0LicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiAnNWJmZmNjNGVkODljYmMwMjdkNTAyYjZmJyxcclxuICAgICAgICB1cmw6ICdodHRwczovL3d3dy5uenouY2gvc2Nod2Vpei92ZXJ6d2VpZmVsdGUtamFnZC1uYWNoLW5hemktcmF1Ymt1bnN0LWluLWRlci1zY2h3ZWl6LWxkLjE0MzY4MjYnLFxyXG4gICAgICAgIGZsYWc6ICcnLFxyXG4gICAgICAgIHByaW1hcnlDYXRlZ29yeTogJ1NjaHdlaXonLFxyXG4gICAgICAgIHN1YkNhdGVnb3JpZXM6IFtcclxuICAgICAgICAgICAgJycsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBwYWdlVHlwZTogJ3JlZ3VsYXInLFxyXG4gICAgICAgIHRpdGxlOiAnVmVyendlaWZlbHRlIEphZ2QgbmFjaCBOYXppLVJhdWJrdW5zdCBpbiBkZXIgU2Nod2VpeicsXHJcbiAgICAgICAgbGVhZDogJ0RhcyBCaWxkIMKrUG9ydHJhaXQgZGUgTWFkZW1vaXNlbGxlIEdhYnJpZWxsZSBEaW90wrsgdm9uIEVkZ2FyIERlZ2FzIGJlZmluZGV0IHNpY2ggbXV0bWFzc2xpY2ggYmVpIGVpbmVtIGFub255bWVuIFNjaHdlaXplciBTYW1tbGVyLiBEaWUgTmF6aXMgcmF1YnRlbiBlcyAxOTQwIGF1cyBQYXJpcy4gTmV3IFlvcmtlciBFcmJlbiBkZXMgZGFtYWxpZ2VuIEJlc2l0emVycyB2ZXJsYW5nZW4gZXMgdmVoZW1lbnQgenVyw7xjay4nLFxyXG4gICAgICAgIGF1dGhvcjogJ0rDtnJnIEtydW1tZW5hY2hlcicsXHJcbiAgICAgICAgZGF0ZVB1Ymxpc2hlZDogbmV3IERhdGUoJzIwMTgtMTEtMTVUMTc6NDc6MjcuNTMxWicpLFxyXG4gICAgICAgIGRhdGVVcGRhdGVkOiBuZXcgRGF0ZSgnMjAxOC0xMS0xOVQwNjoyMjoxNy4yNjhaJyksXHJcbiAgICAgICAgZGF0ZVNjcmFwZWQ6IG5ldyBEYXRlKCcyMDE4LTExLTI5VDEyOjIzOjU4LjM0NVonKSxcclxuICAgICAgICBsYW5ndWFnZTogJ2RlLUNIJyxcclxuICAgICAgICBvdXRsZXQ6ICdOWlonLFxyXG4gICAgICAgIGltYWdlOiAnaHR0cHM6Ly9pbWcubnp6LmNoL0M9VzEwNzUsSDU2NC4zNzUsWDAsWTg0LjMxMjUvUz1XMTIwME0sSDYzME0vTz03NS9DPUFSMTIwMHg2MzAvaHR0cHM6Ly9uenotaW1nLnMzLmFtYXpvbmF3cy5jb20vMjAxOC8xMS8xNS83NjJlMzA4NC1kOTkyLTRhZmYtOGViYi1mNDNlY2E3MWFmYzIucG5nJyxcclxuICAgICAgICBib2R5OiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdIZXJyIEhhbnMgd2Vpc3MgbmljaHQgbWVociwgd28gaWhtIGRlciBLb3BmIHN0ZWh0LiBNYXRoaWFzIEhhbnMsIHNvIHNlaW4gdm9sbGVyIE5hbWUsIGlzdCBHYWxlcmlzdCB1bmQgS3Vuc3Row6RuZGxlciBpbiBIYW1idXJnLiAxOTc0IGthdWZ0ZSBlciBlaW5lciBpbiBBc2NvbmEgd29obmhhZnRlbiBTY2h3ZWl6ZXIgRmFtaWxpZSBkYXMgwqtQb3J0cmFpdCBkZSBNYWRlbW9pc2VsbGUgR2FicmllbGxlIERpb3TCuyBhYiB1bmQgdmVya2F1ZnRlIGVzIGbDvHIgMyw1IE1pbGxpb25lbiBGcmFua2VuIGFuIGVpbmVuIGViZW5mYWxscyBpbiBkZXIgU2Nod2VpeiBsZWJlbmRlbiBTYW1tbGVyIHdlaXRlci4gU2VpdGhlciBzaWVodCBzaWNoIEhlcnIgSGFucyBpbW1lciB3aWVkZXIgbWl0IFJlc3RpdHV0aW9uc2Fuc3Byw7xjaGVuIGtvbmZyb250aWVydC4gSW4gZGVuIHZlcmdhbmdlbmVuIFRhZ2VuIGhhYmVuIHNpY2ggZGllc2UgenUgZWluZW0gU3R1cm0gYXVzZ2V3YWNoc2VuOiBJbiBkZW4gVVNBLCBpbiBHcm9zc2JyaXRhbm5pZW4sIEZyYW5rcmVpY2ggdW5kIERldXRzY2hsYW5kIGhhYmVuIG1laHJlcmUgWmVpdHVuZ2VuIHZvbiBkZXIgwqtOZXcgWW9yayBUaW1lc8K7IMO8YmVyIGRlbiDCq0ZpZ2Fyb8K7IGJpcyB6dXIgwqtaZWl0wrsgw7xiZXIgZGVuIEZhbGwgYmVyaWNodGV0LiBTaWUgYWxsZSB3b2xsZW4gd2lzc2VuOiBXbyBpc3QgZGFzIEJpbGQ/IFVuZDogV2VsY2hlbSBTY2h3ZWl6ZXIgU2FtbWxlciBnZWjDtnJ0IGVzPyBEb2NoIEhlcnIgSGFucyB3aWxsIHBhcnRvdXQgbmljaHRzIHByZWlzZ2ViZW4uIEVyIGhhYmUgZGVtIFNhbW1sZXIgYWJzb2x1dGUgRGlza3JldGlvbiB6dWdlc2ljaGVydC4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VidGl0bGUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJzE5NDAgaW4gUGFyaXMga29uZmlzemllcnQnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGVyIGJlcsO8aG10ZSBmcmFuesO2c2lzY2hlIE1hbGVyIHVuZCBCaWxkaGF1ZXIgRWRnYXIgRGVnYXMgaGF0dGUgZGFzIFBvcnRyw6R0IDE4OTAgZ2VzY2hhZmZlbi4gMTk0MCwgYWxzIGRpZSBOYXRpb25hbHNvemlhbGlzdGVuIFRlaWxlIEZyYW5rcmVpY2hzIG9ra3VwaWVydGVuLCBiZWZhbmQgZXMgc2ljaCBpbSBCZXNpdHogZGVzIGrDvGRpc2NoZW4gS3Vuc3Row6RuZGxlcnMgUGF1bCBSb3NlbmJlcmcuIEVyIGhhdHRlIGRhcyBCaWxkIDE5MzMgZXJ3b3JiZW4gdW5kIGVzIGRpcmVrdCDDvGJlciBzZWluZW4gU2NocmVpYnRpc2NoIGluIGRlciBHYWxlcmllIGFuIGRlciBSdWUgTGEgQm/DqXRpZSBpbiBQYXJpcyBnZWjDpG5ndC4gV2llIHZpZWxlIGFuZGVyZSBLdW5zdHdlcmtlIGtvbmZpc3ppZXJ0ZW4gZXMgZGllIGRldXRzY2hlbiBCZXNhdHplciBhdWYgQmVmZWhsIGRlcyBkZXV0c2NoZW4gQm90c2NoYWZ0ZXJzIGltIGJlc2V0enRlbiBGcmFua3JlaWNoLCBIZWlucmljaCBPdHRvIEFiZXR6LiBEaWUgRmFtaWxpZSBSb3NlbmJlcmcgbXVzc3RlIG5hY2ggTmV3IFlvcmsgZmxpZWhlbi4gJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0JpcyBhbmhpbiBrb25udGVuIGRpZSBOYWNoa29tbWVuIFBhdWwgUm9zZW5iZXJncyB2aWVsZSBkZXIgdm9uIGRlbiBOYXppcyBnZXJhdWJ0ZW4gS3Vuc3R3ZXJrZSByZXN0aXR1aWVyZW4uIERhcnVudGVyIGlzdCBtaXQgZGVtIE1hdGlzc2UtQmlsZCDCq1NpdHplbmRlIEZyYXXCuyBhdWNoIGVpbmVzIGF1cyBkZXIgU2FtbWx1bmcgR3VybGl0dCwgZGllIGFiZ2VzZWhlbiBkYXZvbiBhbnMgS3Vuc3RtdXNldW0gQmVybiB2ZXJtYWNodCB3dXJkZS4gNjAgV2Vya2UgYmxpZWJlbiBiaXMgaGV1dGUgdmVyc2Nod3VuZGVuIOKAkyBzbyBhdWNoIERlZ2Fz4oCZIMKrUG9ydHJhaXQgZGUgTWFkZW1vaXNlbGxlIEdhYnJpZWxsZSBEaW90wrsuICcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWJ0aXRsZScsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnS2VpbmUgV2llZGVyZ3V0bWFjaHVuZycsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdFcnN0bWFscyB0YXVjaHRlIGRhcyBHZW3DpGxkZSAxOTg3IGF1Zi4gRWxhaW5lIFJvc2VuYmVyZywgZWluZSBTY2h3aWVnZXJ0b2NodGVyIFBhdWwgUm9zZW5iZXJncywgZW50ZGVja3RlLCBkYXNzIE1hdGhpYXMgSGFucyBkZW4gRGVnYXMgcGVyIEluc2VyYXQgaW4gZWluZW0gaW50ZXJuYXRpb25hbGVuIEt1bnN0bWFnYXppbiB6dW0gVmVya2F1ZiBhdXNzY2hyaWViLCBzYW10IEJpbGQgdW5kIGRlciBIZXJrdW5mdHNiZXplaWNobnVuZyBQYXVsIFJvc2VuYmVyZy4gRGVyIFNjaHdlaXplciBLdW5zdHNhbW1sZXIsIGRlciBkYXMgQmlsZCAxMyBKYWhyZSB6dXZvciBnZWthdWZ0IGhhdHRlLCB3b2xsdGUgZXMgbnVuIHdpZWRlciBhdWYgZGVuIE1hcmt0IGJyaW5nZW4uIEVsYWluZSBSb3NlbmJlcmcgd2FuZHRlIHNpY2ggZGFyYXVmIGFuIE1hdGhpYXMgSGFucywgZGVyIGFscyBNaXR0ZWxzbWFubiBmdW5naWVydGUuIERvY2ggZGVyIFNhbW1sZXIgZ2luZyBuaWNodCBhdWYgc2llIGVpbi4gwqtFciBpZGVudGlmaXppZXJ0IHNpY2ggbmljaHQgbWl0IGRlciBkZXV0c2NoZW4gR2VzY2hpY2h0ZSB1bmQgc2FoIGtlaW5lbiBHcnVuZCBmw7xyIGVpbmUgcGVyc8O2bmxpY2hlIFdpZWRlcmd1dG1hY2h1bmfCuywgdGVpbHQgZGVyIEdhbGVyaXN0IEhhbnMgZGF6dSBtaXQuIERhcyBCaWxkIGJsaWViIGJlaW0gU2FtbWxlci4gJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0xldHp0bWFscyBnZXNlaGVuIHd1cmRlIGVzIDIwMDMgaW4gZGVyIFNjaHdlaXouIExhdXQgTWF0aGlhcyBIYW5zIGJlZmFuZCBlcyBzaWNoIGRhbWFscyBpbiBlaW5lbSBab2xsZnJlaWxhZ2VyLCBkYXMgbcO8c3NlIGluIEJhc2VsIG9kZXIgWsO8cmljaCBnZXdlc2VuIHNlaW4sIGbDvGhydCBlciBnZWdlbsO8YmVyIGRlciBOWlogYXVzLiBFciBoYWJlIGFiZXIga2VpbmUgQWhudW5nLCB3byBkYXMgQmlsZCBoZXV0ZSBzZWkuIEVyIHNlbGJzdCBoYWJlIGVzIG9obmVoaW4gbmllIGltIE9yaWdpbmFsIGluIGRlciBIYW5kIGdlaGFidC4gwqtFcyB3YXIgYXVjaCBuaWUgaW0gT3JpZ2luYWwgaW4gbWVpbmVyIEdhbGVyaWUsIG51ciBhbHMgZ2VyYWhtdGUgRm90b2tvcGllLsK7JyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0RhbWFscyB3dXJkZSBtZWhyZmFjaCB2ZXJzdWNodCwgZGFzIEJpbGQgZG9jaCBub2NoIHp1IHZlcmthdWZlbiDigJMgdmVyZ2VibGljaC4gRGllcyBlcnrDpGhsdCBDaHJpc3RvcGhlciBNYXJpbmVsbG8sIGRlciBDRU8gdm9uIEFydCBSZWNvdmVyeSBJbnRlcm5hdGlvbmFsLiBEYXMgVW50ZXJuZWhtZW4gbWl0IFNpdHogaW4gTG9uZG9uIGlzdCBkaWUgZWluemlnZSBPcmdhbmlzYXRpb24gaWhyZXIgQXJ0LCBkaWUgc2ljaCBkYXJhdWYgc3BlemlhbGlzaWVydCBoYXQsIGdlc3RvaGxlbmUgS3Vuc3R3ZXJrZSB1bmQgUmF1Ymt1bnN0IHdpZWRlcnp1ZmluZGVuIHVuZCBhbiBpaHJlIHJlY2h0bcOkc3NpZ2VuIEJlc2l0emVyIHp1IMO8YmVyZ2ViZW4uIDIwMTYgd3VyZGUgTWFyaW5lbGxvcyBGaXJtYSB2b24gZGVuIEVyYmVuIFJvc2VuYmVyZ3MgYmVhdWZ0cmFndCwgZGVuIEZhbGwgRGVnYXMgenUgZWluZW0gZ3V0ZW4gRW5kZSB6dSBmw7xocmVuLicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWJ0aXRsZScsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnR2VnZW5zZWl0aWdlIFZvcnfDvHJmZScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdEYXZvbiBpc3QgbWFuIHdlaXQgZW50ZmVybnQuIFp1ZXJzdCBrYW1lbiB6d2FyIG1laHJlcmUgVHJlZmZlbiBtaXQgTWF0aGlhcyBIYW5zIHp1c3RhbmRlLiBXw6RocmVuZCBkZXIgYW5vbnltZSBTYW1tbGVyIGFiZXIgZWluZW4gVGF1c2NoIG9kZXIgZWluZW4gS2F1ZnByZWlzIHZvbiAzIE1pbGxpb25lbiBGcmFua2VuIGlucyBTcGllbCBicmFjaHRlLCB2ZXJsYW5ndGUgZGllIEZhbWlsaWUgUm9zZW5iZXJnIGRpZSBSw7xja2dhYmUgZGVzIEdlbcOkbGRlcyBvaG5lIGplZ2xpY2hlIGZpbmFuemllbGxlIExlaXN0dW5nLiBBdWNoIGRpZSBBdWZmb3JkZXJ1bmcgYW4gZGllIGRldXRzY2hlIFJlZ2llcnVuZywgenUgZWluZXIgZ8O8dGxpY2hlbiBMw7ZzdW5nIGJlaXp1dHJhZ2VuLCBmcnVjaHRldGUgbmljaHQuIEluendpc2NoZW4gaGFiZW4gc2ljaCBkaWUgYmVpZGVuIFNlaXRlbiDDvGJlcndvcmZlbiB1bmQgZGVja2VuIHNpY2ggZ2VnZW5zZWl0aWcgbWl0IFZvcnfDvHJmZW4gZWluOiBGYWt0ZW4gd8O8cmRlbiB3aXNzZW50bGljaCB2ZXJkcmVodCwgZmFsc2NoZSBJbmZvcm1hdGlvbmVuIHZlcmJyZWl0ZXQuICcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdTdHJpdHRpZyBpc3QgaW5zYmVzb25kZXJlLCBvYiBkZXIgSMOkbmRsZXIgSGFucyB1bmQgZGVyIFNhbW1sZXIgMTk3NCB3dXNzdGVuLCBkYXNzIGVzIHNpY2ggYmVpbSBCaWxkIHVtIFJhdWJndXQgaGFuZGVsdGUuIENocmlzdG9waGVyIE1hcmluZWxsbyBpc3QgZGF2b24gw7xiZXJ6ZXVndCwgTWF0aGlhcyBIYW5zIHN0cmVpdGV0IGVzIGFiLiBFcyBzZWkgc2NobGljaHQgYWJzdXJkLCBzbyBNYXJpbmVsbG8sIGRhc3MgSGFucyBkYW1hbHMgZGFzIEJpbGQgbWl0IGRlciBQcm92ZW5pZW56IMKrTmF6aSBvY2N1cGllZCBQYXJpcywgMTk0MsK7IGVyc3RhbmRlbiBoYWJlIHVuZCBkZW5ub2NoIGRhcmFuIGZlc3RoYWx0ZSwgbmljaHRzIHZvbSBLdW5zdHJhdWIgZ2V3dXNzdCB6dSBoYWJlbi4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VidGl0bGUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ1dpcmtsaWNoIGVpbiBTY2h3ZWl6ZXI/JyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ05vY2ggaW1tZXIgZmVobHQgenVkZW0gamVnbGljaGVyIEhpbndlaXMsIHdlciBkZXIgZ2VoZWltbmlzdm9sbGUgU2FtbWxlciBpc3QuIE5hY2ggZGVuIHdlbmlnZW4gQW5nYWJlbiB2b24gTWF0aGlhcyBIYW5zIGlzdCBlcyBlaW4gw6RsdGVyZXIgSGVyciwgZGVyIDE5NzQgaW4gZGVyIFNjaHdlaXosIGFiZXIgYXVjaCBpbiBEZXV0c2NobGFuZCB1bmQgaW4gZGVuIFVTQSBzZWluZW4gV29obnNpdHogZ2VoYWJ0IGhhYmUuIFdvIGVyIGhldXRlIGdlbmF1IHdvaG5lLCBzZWkgaWhtIG5pY2h0IGJla2FubnQuIE1hcmluZWxsbyB6d2VpZmVsdCBpbnp3aXNjaGVuIGdhciBkYXJhbiwgZGFzcyBlcyBzaWNoIHVtIGVpbmVuIFNjaHdlaXplciBTYW1tbGVyIGhhbmRlbHQuIMKrV2lyIGhhYmVuIHdlZGVyIGVpbmUgRG9rdW1lbnRhdGlvbiBub2NoIHNvbnN0aWdlIEJlbGVnZSBnZXNlaGVuwrssIHNhZ3QgZXIuIFNvbGx0ZSBlcyBzaWNoIGFiZXIgdGF0c8OkY2hsaWNoIHVtIGVpbmVuIFNjaHdlaXplciBTYW1tbGVyIGhhbmRlbG4sIGZvcmRlcnQgaWhuIE1hcmluZWxsbyBhdWYsIHNpY2ggw7xiZXIgZWluZW4gQW53YWx0IHp1IG1lbGRlbi4gRGFiZWkga8O2bm5lIGVyIGR1cmNoYXVzIGFub255bSBibGVpYmVuLicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdEYXMgRGVnYXMtUG9ydHLDpHQgaXN0IHp3YXIgdmllbGUgTWlsbGlvbmVuIHdlcnQsIGFiZXIgaW0gb2ZmaXppZWxsZW4gS3Vuc3RtYXJrdCBpc3QgZXMgbmljaHQgbWVociB6dSB2ZXJrYXVmZW4sIHp1bWFsIGVzIHNpY2ggYXVmIGRlciBMaXN0ZSBkZXIgdm9uIGRlbiBOYXppcyBnZXJhdWJ0ZW4gS3VsdHVyZ8O8dGVyIGJlZmluZGV0LiBMYXV0IGRlbSBTY2h3ZWl6ZXIgSnVyaXN0ZW4gdW5kIFJhdWJrdW5zdGV4cGVydGVuIEFuZHJlYSBSYXNjaMOociBzdGVodCBkZXIgRmFsbCBleGVtcGxhcmlzY2ggZsO8ciBlaW4gdW52ZXJrw6R1ZmxpY2hlcyBCaWxkLicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWJ0aXRsZScsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnQsO2c2dsw6R1YmlnZXIgRXJ3ZXJiPycsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdTb2xsdGUgZGFzIEdlbcOkbGRlIHRhdHPDpGNobGljaCBlaW5lbSBTY2h3ZWl6ZXIgU2FtbWxlciBnZWjDtnJlbiwgc28gd8OkcmUgZGllIFJlY2h0c2xhZ2UgYmVpIGVpbmVyIFLDvGNrZm9yZGVydW5nIHZlcnRyYWNrdC4gRGllIFdhc2hpbmd0b25lciBFcmtsw6RydW5nIHZvbiAxOTk4LCBkaWUgdm9uIGRlciBTY2h3ZWl6IG1pdCBhdXNnZWFyYmVpdGV0IHdvcmRlbiBpc3QsIHNpZWh0IGbDvHIgUmVzdGl0dXRpb25zZm9yZGVydW5nZW4gZGFzIEVycmVpY2hlbiBnZXJlY2h0ZXIgdW5kIGZhaXJlciBMw7ZzdW5nZW4gendpc2NoZW4gZGVuIFZvcmtyaWVncy1FaWdlbnTDvG1lcm4gb2RlciBkZXJlbiBFcmJlbiB1bmQgZGVuIGhldXRpZ2VuIEJlc2l0emVybiB2b3IuIERvY2ggZGllIFJpY2h0bGluaWVuIHNpbmQgbmljaHQgYmluZGVuZCB1bmQgZ2VsdGVuIG9obmVoaW4gbnVyIGbDvHIgw7ZmZmVudGxpY2hlIEluc3RpdHV0aW9uZW4sIG5pY2h0IGFiZXIgZsO8ciBwcml2YXRlIFNhbW1sZXIuIEJlaSBlaW5lciBBYndpY2tsdW5nIGRlcyBLYXVmcyBpbiBkZXIgU2Nod2VpeiB3w6RyZSBkYXMgaGllc2lnZSBaaXZpbGdlc2V0emJ1Y2ggYW53ZW5kYmFyLCBkYXMgendpc2NoZW4gZ3V0LSB1bmQgYsO2c2dsw6R1YmlnZW0gRXJ3ZXJiIHVudGVyc2NoZWlkZXQuIERhbm4ga8O2bm50ZSBsYXV0IEFuZHJlYSBSYXNjaMOociBiZXJlaXRzIFVudm9yc2ljaHRpZ2tlaXQgYmVpbSBLYXVmIHZvbiBSYXVia3Vuc3QgZGF6dSBmw7xocmVuLCBkYXNzIFJlc3RpdHV0aW9uc2Fuc3Byw7xjaGUgdm9yIEdlcmljaHQgZ2VzY2jDvHR6dCB3ZXJkZW4ga8O2bm50ZW4uJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0ltIEZhbGwgZGVzIERlZ2FzLVBvcnRyw6R0cyBsaWVndCBlcyBhbHNvIG5haGUsIGRhc3Mgc293b2hsIGRlciBLdW5zdGjDpG5kbGVyIE1hdGhpYXMgSGFucyB3aWUgYXVjaCBkZXIgYW5vbnltZSBLw6R1ZmVyIHp1bWluZGVzdCBow6R0dGVuIHZlcm11dGVuIGvDtm5uZW4sIGRhc3MgZXMgc2ljaCB1bSBOYXppLVJhdWJrdW5zdCBoYW5kZWx0LiDCq0F1ZmdydW5kIGRlciBQcm96ZXNzZSBnZWdlbiBFbWlsIELDvGhybGUsIGRlciBlYmVuZmFsbHMgUmF1Ymt1bnN0IGF1cyBkZXIgU2FtbWx1bmcgUm9zZW5iZXJnIGVyd29yYmVuIGhhdHRlLCB3dXNzdGVuIGRhcyBTYW1tbGVyZmFtaWxpZW4gaW4gZGVyIFNjaHdlaXogZGFtYWxzwrssIHNhZ3QgUmFzY2jDqHI6IMKrRWluIEvDpHVmZXIgaMOkdHRlIGRpZSBQcm92ZW5pZW56IMO8YmVycHLDvGZlbiBtw7xzc2VuLsK7JyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0hlcnIgSGFucyB6ZWlndCBzaWNoIGhldXRlIGdlZ2Vuw7xiZXIgZGVyIE5aWiBnZW5lcnZ0IHVuZCBiZXRyb2ZmZW4gb2IgZGVyIEFuZnJhZ2VuIHVuZCBWb3J3w7xyZmUsIGRpZSBpaG4genUgw7xiZXJyb2xsZW4gc2NoZWluZW4uIEVyIHNlaSwgYmVrcsOkZnRpZ3QgZXIsIMKrZWluIE1lbnNjaCwgZGVyIG1vcmFsaXNjaGUgUHJpbnppcGllbiB2ZXJ0cml0dMK7LiBEZXNoYWxiIHdlcmRlIGVyIGF1Y2ggc2VpbiBFaHJlbndvcnQgZ2VnZW7DvGJlciBkZW0gU2FtbWxlciBuaWNodCBicmVjaGVuIOKAkyBhdWNoIHdlbm4gc2ljaCBkaWVzZXIgaW56d2lzY2hlbiB2b24gaWhtIGRpc3RhbnppZXJ0IGhhYmUsIMKrZGEgZXIgbWVpbmUgVmVybWl0dGx1bmdzdmVyc3VjaGUgYmVyZWl0cyBhbHMgaWhtIHp1IHdlbmlnIHp1Z2V0YW4gZW1wZmFuZMK7LicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiAnNWJmZmNjNGVkODljYmMwMjdkNTAyYjcwJyxcclxuICAgICAgICB1cmw6ICdodHRwczovL3d3dy5uenouY2gvd2lydHNjaGFmdC9wYXRyaW90aXNtdXMtbWFjaHQtZGllLXNtYXJ0cGhvbmVzLXRldXJlci1laW4taGFuZGVsc3N0cmVpdC1pc3QtZ2FyLW5pY2h0LXNvLWVpbmZhY2gtbGQuMTQzOTg0NScsXHJcbiAgICAgICAgZmxhZzogJycsXHJcbiAgICAgICAgcHJpbWFyeUNhdGVnb3J5OiAnV2lydHNjaGFmdCcsXHJcbiAgICAgICAgc3ViQ2F0ZWdvcmllczogW1xyXG4gICAgICAgICAgICAnJyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHBhZ2VUeXBlOiAncmVwb3J0YWdlJyxcclxuICAgICAgICB0aXRsZTogJ8KrVHJ1bXAtUGhvbmXCuzogV2FzIFNtYXJ0cGhvbmVzIMKrbWFkZSBpbiB0aGUgVVNBwrsga29zdGVuIHfDvHJkZW4nLFxyXG4gICAgICAgIGxlYWQ6ICdEZXIgdm9uIERvbmFsZCBUcnVtcCBhbmdlZmFjaHRlIEhhbmRlbHNzdHJlaXQgc29sbCBkYXp1IGbDvGhyZW4sIGRhc3Mgd2llZGVyIG1laHIgSW5kdXN0cmllcHJvZHVrdGUgaW4gZGVuIFVTQSBoZXJnZXN0ZWxsdCB3ZXJkZW4uIERvY2ggd2FzIHfDvHJkZSB6dW0gQmVpc3BpZWwgZWluIGlQaG9uZSB2b24gQXBwbGUga29zdGVuLCBkYXMgbnVyIGluIGRlbiBWZXJlaW5pZ3RlbiBTdGFhdGVuIGdlZmVydGlndCB3b3JkZW4gd8OkcmU/JyxcclxuICAgICAgICBhdXRob3I6ICdIYWx1a2EgTWFpZXItQm9yc3QsIEFuamEgTGVtY2tlLCBHZXJhbGQgSG9zcCcsXHJcbiAgICAgICAgZGF0ZVB1Ymxpc2hlZDogbmV3IERhdGUoJzIwMTgtMTEtMjlUMDU6NDU6MDAuMDAwWicpLFxyXG4gICAgICAgIGRhdGVVcGRhdGVkOiBuZXcgRGF0ZSgnMjAxOC0xMS0yOVQwOTo1MDozOC43NzNaJyksXHJcbiAgICAgICAgZGF0ZVNjcmFwZWQ6IG5ldyBEYXRlKCcyMDE4LTExLTI5VDEyOjIzOjU4LjU1MFonKSxcclxuICAgICAgICBsYW5ndWFnZTogJ2RlLUNIJyxcclxuICAgICAgICBvdXRsZXQ6ICdOWlonLFxyXG4gICAgICAgIGltYWdlOiAnaHR0cHM6Ly9pbWcubnp6LmNoL0M9VzIyNDAsSDExNzYsWDAsWTQyL1M9VzEyMDBNLEg2MzBNL089NzUvQz1BUjEyMDB4NjMwL2h0dHBzOi8vbnp6LWltZy5zMy5hbWF6b25hd3MuY29tLzIwMTgvMTEvMjgvMTY5ZTdiMzYtYjVkZi00YjAwLWJlNzQtYTgyMjJiNGE4NWJjLnBuZycsXHJcbiAgICAgICAgYm9keTogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnwqtEZXNpZ24gdm9uIEFwcGxlIGluIEthbGlmb3JuaWVuLCBnZWZlcnRpZ3QgaW4gQ2hpbmEuwrsgRGllc2VyIEhpbndlaXMgc3RlaHQgbWlsbGlvbmVuZmFjaCBhdWYgZGVuIEdlaMOkdXNlbiBkZXIgaVBob25lcyBkZXMgVVMtVW50ZXJuZWhtZW5zIEFwcGxlIHVuZCBpc3QgZWluIFNpbm5iaWxkIGRhZsO8ciwgZGFzcyBDaGluYSDDvGJlciBkaWUgSmFocnplaG50ZSB6dXIgV2Vya2JhbmsgZGVyIFdlbHQgYXVmZ2VzdGllZ2VuIGlzdC4gRWluZXIsIGRlbSBkaWVzIHNjaG9uIHNlaXQgbMOkbmdlcmVtIHNhdWVyIGF1ZnN0w7Zzc3QsIGlzdCBkZXIgYW1lcmlrYW5pc2NoZSBQcsOkc2lkZW50IERvbmFsZCBUcnVtcC4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnQmVyZWl0cyBpbiBzZWluZW0gZnLDvGhlcmVuIExlYmVuIGFscyBJbW1vYmlsaWVudHljb29uIGhhdHRlIFRydW1wIGdld2V0dGVydCwgZGFzcyBkaWUgVVNBIHZvbSBSZXN0IGRlciBXZWx0IGF1c2dlbsO8dHp0IHfDvHJkZW4uIEFscyBQcsOkc2lkZW50IGhhdCBlciBudW4gZWluZW4gSGFuZGVsc3N0cmVpdCBnZWdlbiBDaGluYSBhbmdlZmFjaHQgdW5kIGJlcmVpdHMgcnVuZCBkaWUgSMOkbGZ0ZSBkZXMgVm9sdW1lbnMgZGVyIGNoaW5lc2lzY2hlbiBFeHBvcnRlIGluIGRpZSBVU0EgbWl0IFp1c2F0enrDtmxsZW4gYmVsZWd0LiBEYWR1cmNoIHNvbGwgZXMgdGV1cmVyIHdlcmRlbiwgaW4gQ2hpbmEgenUgcHJvZHV6aWVyZW4sIHVuZCBkaWVzIHdpZWRlcnVtIHNvbGwgZGF6dSBmw7xocmVuLCBkYXNzIEpvYnMgenVyw7xjayBpbiBkaWUgVVNBIGtvbW1lbi4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRXMgZ2lidCB2aWVsZSBXZW5uIHVuZCBBYmVyIGJlaSBkaWVzZXIgSWRlZS4gRG9jaCBqZW5zZWl0cyBhbGxlciBiZXJlY2h0aWd0ZW4gRWlud8OkbmRlIOKAkyB3YXMgd8O8cmRlIGVzIGbDvHIgZGllIEtvbnN1bWVudGVuIGluIGRlbiBVU0EgYmVkZXV0ZW4sIHdlbm4gbWFuIGRpZSBTbWFydHBob25lcyB2b24gQXBwbGUgd2lya2xpY2ggZ2V0cmV1IGRlbSBNb3R0byDCq0FtZXJpY2EgZmlyc3TCuyBoZXJzdGVsbHRlPycsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdEZXIgRmluYW56YW5hbHl0aWtlciBTdW5kZWVwIEdhbnRvcmkgdm9uIGRlciBHcm9zc2JhbmsgVUJTIGhhdCBlcnJlY2huZXQsIHdhcyBwYXNzaWVyZW4gd8O8cmRlLCB3ZW5uIG1hbiBkaWUgUHJvZHVrdGlvbiBkZXMgaVBob25lIFNjaHJpdHQgZsO8ciBTY2hyaXR0IGF1cyBkZW0gQXVzbGFuZCBpbiBkaWUgVVNBIHZlcmxhZ2VydGUuIEF1ZiBkZXIgQmFzaXMgZGllc2VyIEFuYWx5c2UgaGF0IGRpZSBOWlogbWl0IEdhbnRvcmlzIEhpbGZlIGRyZWkgVmFyaWFudGVuIGVpbmVzIMKrVHJ1bXAtUGhvbmXCuyB6dXNhbW1lbmdlc3RlbGx0IHVuZCBqZWRlIGRlciBkcmVpIFZhcmlhbnRlbiBuYWNoIGZvbGdlbmRlbiBLcml0ZXJpZW4gYXVmZ2VzY2hsw7xzc2VsdDonLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGllIGRyZWkgVmVyc2lvbmVuIGVpbmVzIMKrVHJ1bXAtUGhvbmXCuyBzZWhlbiB3aWUgZm9sZ3QgYXVzLCB3ZW5uIG1hbiBkYXZvbiBhdXNnZWh0LCBkYXNzIGRpZSBQcm9kdWt0aW9uc2FudGVpbGUgaW4gZGVuIFVTQSBnZWdlbiBudWxsIGxhdWZlbiB1bmQgdm9yd2llZ2VuZCBpbiBDaGluYSBwcm9kdXppZXJ0IHdpcmQgKHdhcyBlaW5lIHZlcmVpbmZhY2hlbmRlIEFubmFobWUgaXN0KTonLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VidGl0bGUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0RhcyBUcnVtcC1QaG9uZSBsaWdodCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWJ0aXRsZScsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnTnVyIGRhcyBOw7Z0aWdzdGUgd2lyZCBpbiBBbWVyaWthIHByb2R1emllcnQnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnTGF1dCBHYW50b3JpIHfDpHJlIGRpZXNlIFZhcmlhbnRlIHNjaG9uIGhldXRlIGRlbmtiYXIuIMKrRWluIFByb2R1a3QgenUgdmVycGFja2VuIG9kZXIgZGFzIEJldHJpZWJzc3lzdGVtIGRyYXVmenVzcGllbGVuIOKAkyBiZWlkZXMgaXN0IGtlaW5lIEhleGVyZWnCuywgc2FndCBkZXIgVUJTLUV4cGVydGUuIFRhdHPDpGNobGljaCB3w7xyZGUgZWluZSBWZXJsYWdlcnVuZyBkaWVzZXIgZWluZmFjaGVuIFTDpHRpZ2tlaXRlbiBkYXp1IGbDvGhyZW4sIGRhc3MgZWluIFRydW1wLVBob25lIHVtIDEwJSB0ZXVyZXIgd8O8cmRlLCB3YXMgZGVtIFByZWlzIGVpbmVzIGRlcnplaXRpZ2VuIGlQaG9uZSBlbnRzcHJlY2hlbiB3w7xyZGUsIGF1ZiBkYXMgaGV1dGUgZWluIFpvbGwgdm9uIDEwJSBlcmhvYmVuIHdpcmQuJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0bDvHIgZGllIMOcYmVybGVndW5nZW4gbXVzcyBlaW5nZXNjaHLDpG5rdCB3ZXJkZW4sIGRhc3MgV2FzaGluZ3RvbiB6d2FyIEltcG9ydGUgYXVzIENoaW5hIG1pdCBadXNhdHp6w7ZsbGVuIGJlbGVnZW4ga2Fubi4gRGllIFJlZ2llcnVuZyBrYW5uIGFiZXIgbWl0IGRpZXNlbSBJbnN0cnVtZW50IGFsbGVpbiBkaWUgVW50ZXJuZWhtZW4gbmljaHQgZGF6dSB6d2luZ2VuLCBpbiBkZW4gVVNBIHp1IHByb2R1emllcmVuLiBFaW5lIE3DtmdsaWNoa2VpdCBmw7xyIEFwcGxlLVp1bGllZmVyZXIgd8OkcmUgZXMsIGF1c3NlcmhhbGIgdm9uIENoaW5hIGluIEzDpG5kZXJuIGZlcnRpZ2VuIHp1IGxhc3NlbiwgZGllIGtlaW5lIFpvbGxuYWNodGVpbGUgaGFiZW4uIFRyb3R6IGdlc3RpZWdlbmVuIEFyYmVpdHNrb3N0ZW4gaW4gQ2hpbmEgaGF0dGUgZXMgYWJlciBiaXNoZXIgbm9jaCBrZWluZSBncsO2c3NlcmUgQWJ3YW5kZXJ1bmcgYXVzIGRlbSBSZWljaCBkZXIgTWl0dGUgZ2VnZWJlbiwgd2VpbCBjaGluZXNpc2NoZSBDbHVzdGVyIGFuIFByb2R1emVudGVuIHVuZCBMaWVmZXJhbnRlbiBpbiBlbmdzdGVyIFVtZ2VidW5nIGbDvHIgS29zdGVudm9ydGVpbGUgZ2Vzb3JndCBoYWJlbi4gTWl0IGjDtmhlcmVuIFVTLVrDtmxsZW4ga8O2bm50ZSBzaWNoIGRpZXMgw6RuZGVybi4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VidGl0bGUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0RhcyBUcnVtcC1QaG9uZSBiYXNpYycsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWJ0aXRsZScsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGVua2JhcmUgT3B0aW9uLCB3ZW5uIGRlciBIYW5kZWxzc3RyZWl0IHdlaXRlciBlc2thbGllcnQnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGllc2UgVmFyaWFudGUgZWluZXMgaVBob25lIGvDpG1lIGRhbm4genVzdGFuZGUsIHdlbm4gVHJ1bXAgc2VpbmUgRHJvaHVuZ2VuIHdhaHIgbWFjaHRlIHVuZCBkaWUgWsO2bGxlIGbDvHIgY2hpbmVzaXNjaGUgSW1wb3J0ZSB3aWUgZGFzIGlQaG9uZSB2b24gZGVyemVpdCAxMCBhdWYgMjUlIGVyaMO2aHRlLiBBbGxlcmRpbmdzIHfDvHJkZSBBcHBsZSBpbW1lciBub2NoIDEgYmlzIDIgSmFocmUgYmVuw7Z0aWdlbiwgdW0gZGllIFByb2R1a3Rpb24gaW4gZGllc2VtIEF1c21hc3MgenUgYW1lcmlrYW5pc2llcmVuLicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdFaW5mYWNoZSBBcmJlaXRzc2Nocml0dGUgdW5kIGRpZSBIZXJzdGVsbHVuZyBzaW1wbGVyIFRlaWxlIGvDtm5udGVuIHJlbGF0aXYgc2NobmVsbCB2ZXJsYWdlcnQgd2VyZGVuLiBCZWkga29tcGxpemllcnRlcmVuIEtvbXBvbmVudGVuIHNpZWh0IGVzIHNjaG9uIGFuZGVycyBhdXMuIEZyYWdsaWNoIGlzdCwgd2llIHJhc2NoIFp1bGllZmVydW50ZXJuZWhtZW4gZWluZSBhbWVyaWthbmlzY2hlIEZlcnRpZ3VuZyBhdWZiYXVlbiBvZGVyIG9iIHNpZSB6dW7DpGNoc3QgbmFjaCBhbmRlcmVuIE3DtmdsaWNoa2VpdGVuIGF1c3NlcmhhbGIgZGVyIFVTQSBzdWNoZW4gd8O8cmRlbi4gRXMgaXN0IGF1Y2ggYW56dW5laG1lbiwgZGFzcyBkaWUgQW56YWhsIGRlciBBcmJlaXRzcGzDpHR6ZSwgZGllIG5ldSBlbnRzdMO8bmRlbiwgYW0gQW5mYW5nIGVoZXIgZ2VyaW5nIHfDpHJlLiBBdXNzZXJkZW0gd8OkcmUgd29obCB3ZWdlbiByZWxhdGl2IGhvaGVyIEFyYmVpdHNrb3N0ZW4gaW4gZGVuIFVTQSBkaWUgQXV0b21hdGlzaWVydW5nIGluIGRlciBQcm9kdWt0aW9uIGF1c2dlcHLDpGd0LicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWJ0aXRsZScsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRGFzIFRydW1wLVBob25lIFBhdHJpb3QnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VidGl0bGUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ1p1IHRldWVyLCB6dSBzcMOkdCBhdWYgZGVtIE1hcmt0IOKAkyBudXIgZXR3YXMgZsO8ciBlY2h0ZSBQYXRyaW90ZW4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAnRWluIGtvbXBsZXR0IGFtZXJpa2FuaXNjaGVzIFRydW1wLVBob25lIHdpcmQgd29obCBlaW4gVHJhdW0gYmxlaWJlbi4gRXJzdGVucyB3w6RyZSBlaW4gdm9sbHN0w6RuZGlnIGluIGRlbiBVU0EgaGVyZ2VzdGVsbHRlcyBTbWFydHBob25lIGRldXRsaWNoIHRldXJlciBhbHMgc2VsYnN0IGVpbiBpbiBDaGluYSBnZWZlcnRpZ3RlcywgZGFzIG1pdCBlaW5lbSBab2xsIHZvbiAyNSUgYmVsZWd0IHdpcmQuJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ1p3ZWl0ZW5zIGZlaGx0IGluIGRlbiBVU0EgZGVyemVpdCBzY2hsaWNodHdlZyBkYXMgS25vdy1ob3cgZsO8ciB2aWVsZSBQcm9kdWt0aW9uc3Byb3plc3NlLiDCq0hhbmR5a2FtZXJhcyB6dSBiYXVlbiwgZGFzIGlzdCBlaW5lIGhvaGUgS3Vuc3QsIHVuZCBlcyBoYXQgSmFocmUgZ2VicmF1Y2h0LCBkaWVzZSBTcGV6aWFsaXN0ZW5hcmJlaXQgaW4gQ2hpbmEgaW4gZWluZW0gaW5kdXN0cmllbGxlbiBNYXNzc3RhYiB1bXp1c2V0emVuwrssIHNhZ3QgR2FudG9yaS4gRXMgc2VpIGlsbHVzb3Jpc2NoLCB6dSBnbGF1YmVuLCBkYXNzIG1hbiBlaW5lIEhhbmR5a2FtZXJhIHNvIGVpbmZhY2ggYXVjaCBpbiBkZW4gVVNBIHByb2R1emllcmVuIGvDtm5uZS4gRHJlaSBiaXMgdmllciBKYWhyZSB3w7xyZGUgZXMgbWluZGVzdGVucyBkYXVlcm4sIGtvbXBsZXhlIEFyYmVpdHNzdHVmZW4gZGVzIFByb2R1a3Rpb25zcHJvemVzc2VzIHp1csO8Y2sgaW4gZGllIFVTQSB6dSBicmluZ2VuLicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHRleHQ6ICdEYXMgQmVpc3BpZWwgaVBob25lIHplaWd0IGRlbiBWb3J0ZWlsIHZvbiBIYW5kZWwgYXVmOiBEdXJjaCBkaWUgaW50ZXJuYXRpb25hbGUgQXJiZWl0c3RlaWx1bmcgbGFzc2VuIHNpY2ggR8O8dGVyIGtvc3RlbmfDvG5zdGlnZXIgaGVyc3RlbGxlbi4gVW5mYWlyZSBIYW5kZWxzcHJha3Rpa2VuIHNvbGx0ZW4gYW5nZXByYW5nZXJ0IHdlcmRlbi4gRWluIEhhbmRlbHNzdHJlaXQgbWl0IFN0cmFmesO2bGxlbiBpc3QgZGFmw7xyIGRlciBmYWxzY2hlIFdlZy4nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG5dO1xyXG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXHJcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJ21ldGVvci9yYW5kb20nO1xyXG5pbXBvcnQgeyBFWFBFUklNRU5UIH0gZnJvbSAnLi9leHBlcmltZW50cyc7XHJcblxyXG5jb25zdCBmcm9tID0gUmFuZG9tLmlkKCk7XHJcbmNvbnN0IFFVRVNUSU9OUyA9IFtcclxuICAgIHtcclxuICAgICAgICBfaWQ6IFJhbmRvbS5pZCgpLFxyXG4gICAgICAgIHRleHQ6ICdNZW5zY2hlbiBpbiBkZXIgU2Nod2VpeiB3ZXJkZW4gaW1tZXIgw6RsdGVyLiBTb2xsIGRhcyBSZW50ZW5hbHRlciBkYXJ1bSB3ZWl0ZXIgZXJow7ZodCB3ZXJkZW4/JyxcclxuICAgICAgICB0eXBlOiAnc2VsZWN0aW9uJyxcclxuICAgICAgICBtaW5TZWxlY3Q6IDEsXHJcbiAgICAgICAgbWF4U2VsZWN0OiAxLFxyXG4gICAgICAgIGFuc3dlcnM6IFtcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnSmEnLCB2YWx1ZTogMS4wIH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgamEnLCB2YWx1ZTogMC43NSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFaGVyIG5laW4nLCB2YWx1ZTogMC41IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ05laW4nLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogUmFuZG9tLmlkKCksXHJcbiAgICAgICAgdGV4dDogJ1dlbGNoZXIgZGVyIGZvbGdlbmRlbiBpbiBkZXIgQnVuZGVzdmVyc2FtbWx1bmcgdmVydHJldGVuZW4gUGFydGVpZW4gZsO8aGxlbiBTaWUgc2ljaCBhbSBuw6RjaHN0ZW4/IEJpdHRlIHfDpGhsZW4gU2llIGVpbmUgUGFydGVpLicsXHJcbiAgICAgICAgdHlwZTogJ3NlbGVjdGlvbicsXHJcbiAgICAgICAgbWluU2VsZWN0OiAxLFxyXG4gICAgICAgIG1heFNlbGVjdDogMSxcclxuICAgICAgICBhbnN3ZXJzOiBbXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0LDvHJnZXJsaWNoLURlbW9rcmF0aXNjaGUgUGFydGVpIChCRFApJywgdmFsdWU6IDEuMCB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdDaHJpc3RsaWNoZGVtb2tyYXRpc2NoZSBWb2xrc3BhcnRlaSAoQ1ZQKScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0NocmlzdGxpY2hzb3ppYWxlIFBhcnRlaSBPYndhbGRlbiAoQ1NQKScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0V2YW5nZWxpc2NoZSBWb2xrc3BhcnRlaSAoRVZQKScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0ZEUC4gRGllIExpYmVyYWxlbiAoRkRQKScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0dyw7xuZSBQYXJ0ZWkgZGVyIFNjaHdlaXogKEdQUyknLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdHcsO8bmxpYmVyYWxlIFBhcnRlaSAoR0xQKScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0xlZ2EgZGVpIFRpY2luZXNpIChMZWdhKScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ01vdXZlbWVudCBjaXRveWVucyByb21hbmRzL2dlbmV2b2lzIChNQ1IvTUNHKScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ1BhcnRlaSBkZXIgQXJiZWl0IGRlciBTY2h3ZWl6IChQZEEvUE9QKScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ1NjaHdlaXplcmlzY2hlIFZvbGtzcGFydGVpIChTVlApJywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnU296aWFsZGVtb2tyYXRpc2NoZSBQYXJ0ZWkgZGVyIFNjaHdlaXogKFNQKScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgICByYW5kb21PcmRlcjogdHJ1ZSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcclxuICAgICAgICB0ZXh0OiAnU29sbCBkZXIgU3RhYXQgTWVuc2NoZW4gaW4gQXJtdXQgc3TDpHJrZXIgdW50ZXJzdMO8dHplbiAoQXVzYmF1IGRlciBTb3ppYWxoaWxmZSk/JyxcclxuICAgICAgICB0eXBlOiAnc2VsZWN0aW9uJyxcclxuICAgICAgICBtaW5TZWxlY3Q6IDEsXHJcbiAgICAgICAgbWF4U2VsZWN0OiAxLFxyXG4gICAgICAgIGFuc3dlcnM6IFtcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnSmEnLCB2YWx1ZTogMS4wIH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgamEnLCB2YWx1ZTogMC43NSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFaGVyIG5laW4nLCB2YWx1ZTogMC41IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ05laW4nLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogUmFuZG9tLmlkKCksXHJcbiAgICAgICAgdGV4dDogJ1NvbGxlbiBkaWUgS29zdGVuIGbDvHIgZGllIEtyYW5rZW52ZXJzaWNoZXJ1bmcgYW4gZGFzIEVpbmtvbW1lbiBhbmdlcGFzc3Qgd2VyZGVuIChHdXR2ZXJkaWVuZW5kZSBtw7xzc3RlbiBtZWhyIHphaGxlbik/JyxcclxuICAgICAgICB0eXBlOiAnc2VsZWN0aW9uJyxcclxuICAgICAgICBtaW5TZWxlY3Q6IDEsXHJcbiAgICAgICAgbWF4U2VsZWN0OiAxLFxyXG4gICAgICAgIGFuc3dlcnM6IFtcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnSmEnLCB2YWx1ZTogMS4wIH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgamEnLCB2YWx1ZTogMC43NSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFaGVyIG5laW4nLCB2YWx1ZTogMC41IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ05laW4nLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogUmFuZG9tLmlkKCksXHJcbiAgICAgICAgdGV4dDogJ1NvbGxlbiBqdW5nZSBBcmJlaXRzbG9zZSBkdXJjaCBkZW4gU3RhYXQgc3TDpHJrZXIgdW50ZXJzdMO8dHp0IHdlcmRlbj8nLFxyXG4gICAgICAgIHR5cGU6ICdzZWxlY3Rpb24nLFxyXG4gICAgICAgIG1pblNlbGVjdDogMSxcclxuICAgICAgICBtYXhTZWxlY3Q6IDEsXHJcbiAgICAgICAgYW5zd2VyczogW1xyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdKYScsIHZhbHVlOiAxLjAgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRWhlciBqYScsIHZhbHVlOiAwLjc1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgbmVpbicsIHZhbHVlOiAwLjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnTmVpbicsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcclxuICAgICAgICB0ZXh0OiAnU29sbCBlaW4gTWluZGVzdGxvaG4gdm9uIDRcXCcwMDAgRnJhbmtlbiBmw7xyIGFsbGUgQXJiZWl0bmVobWVyLy1pbm5lbiBlaW5nZWbDvGhydCB3ZXJkZW4/JyxcclxuICAgICAgICB0eXBlOiAnc2VsZWN0aW9uJyxcclxuICAgICAgICBtaW5TZWxlY3Q6IDEsXHJcbiAgICAgICAgbWF4U2VsZWN0OiAxLFxyXG4gICAgICAgIGFuc3dlcnM6IFtcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnSmEnLCB2YWx1ZTogMS4wIH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgamEnLCB2YWx1ZTogMC43NSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFaGVyIG5laW4nLCB2YWx1ZTogMC41IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ05laW4nLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogUmFuZG9tLmlkKCksXHJcbiAgICAgICAgdGV4dDogJ1NvbGxlbiBHZXNjaMOkZnRlIGlocmUgw5ZmZm51bmdzemVpdGVuIHNlbGJlciBmZXN0bGVnZW4gZMO8cmZlbiAoTGliZXJhbGlzaWVydW5nIGRlciBMYWRlbsO2ZmZudW5nc3plaXRlbik/JyxcclxuICAgICAgICB0eXBlOiAnc2VsZWN0aW9uJyxcclxuICAgICAgICBtaW5TZWxlY3Q6IDEsXHJcbiAgICAgICAgbWF4U2VsZWN0OiAxLFxyXG4gICAgICAgIGFuc3dlcnM6IFtcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnSmEnLCB2YWx1ZTogMS4wIH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgamEnLCB2YWx1ZTogMC43NSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFaGVyIG5laW4nLCB2YWx1ZTogMC41IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ05laW4nLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogUmFuZG9tLmlkKCksXHJcbiAgICAgICAgdGV4dDogJ1NvbGxlbiBkaWUgU3RldWVybiBmw7xyIFJlaWNoZSBlcmjDtmh0IHdlcmRlbj8nLFxyXG4gICAgICAgIHR5cGU6ICdzZWxlY3Rpb24nLFxyXG4gICAgICAgIG1pblNlbGVjdDogMSxcclxuICAgICAgICBtYXhTZWxlY3Q6IDEsXHJcbiAgICAgICAgYW5zd2VyczogW1xyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdKYScsIHZhbHVlOiAxLjAgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRWhlciBqYScsIHZhbHVlOiAwLjc1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgbmVpbicsIHZhbHVlOiAwLjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnTmVpbicsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcclxuICAgICAgICB0ZXh0OiAnU29sbGVuIEZpcm1lbiB3ZW5pZ2VyIFN0ZXVlcm4gYmV6YWhsZW4/JyxcclxuICAgICAgICB0eXBlOiAnc2VsZWN0aW9uJyxcclxuICAgICAgICBtaW5TZWxlY3Q6IDEsXHJcbiAgICAgICAgbWF4U2VsZWN0OiAxLFxyXG4gICAgICAgIGFuc3dlcnM6IFtcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnSmEnLCB2YWx1ZTogMS4wIH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgamEnLCB2YWx1ZTogMC43NSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFaGVyIG5laW4nLCB2YWx1ZTogMC41IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ05laW4nLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogUmFuZG9tLmlkKCksXHJcbiAgICAgICAgdGV4dDogJ1NvbGxlbiBpbiBkZXIgU2Nod2VpeiBuZXVlIEF0b21rcmFmdHdlcmtlIGdlYmF1dCB3ZXJkZW4gZMO8cmZlbj8nLFxyXG4gICAgICAgIHR5cGU6ICdzZWxlY3Rpb24nLFxyXG4gICAgICAgIG1pblNlbGVjdDogMSxcclxuICAgICAgICBtYXhTZWxlY3Q6IDEsXHJcbiAgICAgICAgYW5zd2VyczogW1xyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdKYScsIHZhbHVlOiAxLjAgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRWhlciBqYScsIHZhbHVlOiAwLjc1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgbmVpbicsIHZhbHVlOiAwLjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnTmVpbicsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcclxuICAgICAgICB0ZXh0OiAnU29sbCBkZXIgU3RhYXQgbWVociBHZWxkIGbDvHIgZGVuIEF1c2JhdSBkZXMgw7ZmZmVudGxpY2hlbiBWZXJrZWhycyAoQmFobiwgQnVzLCBUcmFtKSB1bmQgd2VuaWdlciBHZWxkIGbDvHIgZGVuIFByaXZhdHZlcmtlaHIgKFN0cmFzc2VuYmF1KSBhdWZ3ZW5kZW4/JyxcclxuICAgICAgICB0eXBlOiAnc2VsZWN0aW9uJyxcclxuICAgICAgICBtaW5TZWxlY3Q6IDEsXHJcbiAgICAgICAgbWF4U2VsZWN0OiAxLFxyXG4gICAgICAgIGFuc3dlcnM6IFtcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnSmEnLCB2YWx1ZTogMS4wIH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgamEnLCB2YWx1ZTogMC43NSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFaGVyIG5laW4nLCB2YWx1ZTogMC41IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ05laW4nLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogUmFuZG9tLmlkKCksXHJcbiAgICAgICAgdGV4dDogJ0lzdCBkaWUgU2Nod2VpeiBnZWdlbsO8YmVyIEFzeWxiZXdlcmJlcm4vLWlubmVuIHp1IGdyb3NzesO8Z2lnPycsXHJcbiAgICAgICAgdHlwZTogJ3NlbGVjdGlvbicsXHJcbiAgICAgICAgbWluU2VsZWN0OiAxLFxyXG4gICAgICAgIG1heFNlbGVjdDogMSxcclxuICAgICAgICBhbnN3ZXJzOiBbXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0phJywgdmFsdWU6IDEuMCB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFaGVyIGphJywgdmFsdWU6IDAuNzUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRWhlciBuZWluJywgdmFsdWU6IDAuNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdOZWluJywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICBdLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBfaWQ6IFJhbmRvbS5pZCgpLFxyXG4gICAgICAgIHRleHQ6ICdTb2xsZW4gw7ZmZmVudGxpY2hlIE9ydGUgdmVybWVocnQgbWl0IFZpZGVvIMO8YmVyd2FjaHQgd2VyZGVuPycsXHJcbiAgICAgICAgdHlwZTogJ3NlbGVjdGlvbicsXHJcbiAgICAgICAgbWluU2VsZWN0OiAxLFxyXG4gICAgICAgIG1heFNlbGVjdDogMSxcclxuICAgICAgICBhbnN3ZXJzOiBbXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0phJywgdmFsdWU6IDEuMCB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFaGVyIGphJywgdmFsdWU6IDAuNzUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRWhlciBuZWluJywgdmFsdWU6IDAuNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdOZWluJywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICBdLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBfaWQ6IFJhbmRvbS5pZCgpLFxyXG4gICAgICAgIHRleHQ6ICdTb2xsIGRpZSBQb2xpemVpIFNwcmF5ZXIvLWlubmVuIHVuZCBSYW5kYWxpZXJlci8taW5uZW4gc3RyaWt0ZXIgdmVyZm9sZ2VuIHVuZCBow6RydGVyIGJlc3RyYWZlbj8nLFxyXG4gICAgICAgIHR5cGU6ICdzZWxlY3Rpb24nLFxyXG4gICAgICAgIG1pblNlbGVjdDogMSxcclxuICAgICAgICBtYXhTZWxlY3Q6IDEsXHJcbiAgICAgICAgYW5zd2VyczogW1xyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdKYScsIHZhbHVlOiAxLjAgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRWhlciBqYScsIHZhbHVlOiAwLjc1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgbmVpbicsIHZhbHVlOiAwLjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnTmVpbicsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcclxuICAgICAgICB0ZXh0OiAnU29sbCBkaWUgU2Nod2VpemVyIEFybWVlIGFiZ2VzY2hhZmZ0IHdlcmRlbj8nLFxyXG4gICAgICAgIHR5cGU6ICdzZWxlY3Rpb24nLFxyXG4gICAgICAgIG1pblNlbGVjdDogMSxcclxuICAgICAgICBtYXhTZWxlY3Q6IDEsXHJcbiAgICAgICAgYW5zd2VyczogW1xyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdKYScsIHZhbHVlOiAxLjAgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRWhlciBqYScsIHZhbHVlOiAwLjc1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgbmVpbicsIHZhbHVlOiAwLjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnTmVpbicsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcclxuICAgICAgICB0ZXh0OiAnU29sbGVuIHZlcm1laHJ0IFBlcnNvbmVua29udHJvbGxlbiBhbiBkZXIgU2Nod2VpemVyIEdyZW56ZSBkdXJjaGdlZsO8aHJ0IHdlcmRlbj8nLFxyXG4gICAgICAgIHR5cGU6ICdzZWxlY3Rpb24nLFxyXG4gICAgICAgIG1pblNlbGVjdDogMSxcclxuICAgICAgICBtYXhTZWxlY3Q6IDEsXHJcbiAgICAgICAgYW5zd2VyczogW1xyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdKYScsIHZhbHVlOiAxLjAgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRWhlciBqYScsIHZhbHVlOiAwLjc1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgbmVpbicsIHZhbHVlOiAwLjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnTmVpbicsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcclxuICAgICAgICB0ZXh0OiAnV2llIGjDpHVmaWcgbnV0emVuIFNpZSB0eXBpc2NoZXJ3ZWlzZSBOYWNocmljaHRlbj8gTWl0IE5hY2hyaWNodGVuIG1laW5lbiB3aXIgbmF0aW9uYWxlLCBpbnRlcm5hdGlvbmFsZSwgcmVnaW9uYWxlL2xva2FsZSBOYWNocmljaHRlbiB1bmQgYW5kZXJlIEVyZWlnbmlzc2UsIGRpZSDDvGJlciBkaXZlcnNlIFBsYXR0Zm9ybWVuIGdlbnV0enQgd2VyZGVuIGvDtm5uZW4gKFJhZGlvLCBGZXJuc2VoZW4sIFplaXR1bmcgb2RlciBPbmxpbmUpLicsXHJcbiAgICAgICAgdHlwZTogJ3NlbGVjdGlvbicsXHJcbiAgICAgICAgbWluU2VsZWN0OiAxLFxyXG4gICAgICAgIG1heFNlbGVjdDogMSxcclxuICAgICAgICBhbnN3ZXJzOiBbXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ01laHIgYWxzIDEwIE1hbCBwcm8gVGFnJywgdmFsdWU6IDEgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnWndpc2NoZW4gNiB1bmQgMTAgTWFsIHBybyBUYWcnLCB2YWx1ZTogMiB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdad2lzY2hlbiAyIHVuZCA1IE1hbCBwcm8gVGFnJywgdmFsdWU6IDMgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRWlubWFsIGFtIFRhZycsIHZhbHVlOiA0IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJzQgYmlzIDYgVGFnZSBwcm8gV29jaGUnLCB2YWx1ZTogNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICcyIGJpcyAzIFRhZ2UgcHJvIFdvY2hlJywgdmFsdWU6IDYgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRWlubWFsIHBybyBXb2NoZScsIHZhbHVlOiA3IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ1dlbmlnZXIgYWxzIGVpbm1hbCBwcm8gV29jaGUnLCB2YWx1ZTogOCB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdXZW5pZ2VyIGFscyBlaW5tYWwgcHJvIE1vbmF0JywgdmFsdWU6IDkgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnTmllJywgdmFsdWU6IDAgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnV2Vpc3MgbmljaHQva2VpbmUgQW5nYWJlJywgdmFsdWU6IC0xIH0sXHJcbiAgICAgICAgXSxcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgX2lkOiBSYW5kb20uaWQoKSxcclxuICAgICAgICB0ZXh0OiAnV2llIGludGVyZXNzaWVydCBzaW5kIFNpZSBJaHJlciBBbnNpY2h0IG5hY2ggYW4gTmFjaHJpY2h0ZW4/JyxcclxuICAgICAgICB0eXBlOiAnc2VsZWN0aW9uJyxcclxuICAgICAgICBtaW5TZWxlY3Q6IDEsXHJcbiAgICAgICAgbWF4U2VsZWN0OiAxLFxyXG4gICAgICAgIGFuc3dlcnM6IFtcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnRXh0cmVtIGludGVyZXNzaWVydCcsIHZhbHVlOiAxLjAgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnU2VociBpbnRlcmVzc2llcnQnLCB2YWx1ZTogMC43NSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFdHdhcyBpbnRlcmVzc2llcnQnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdOaWNodCBzZWhyIGludGVyZXNzaWVydCcsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ8OcYmVyaGF1cHQgbmljaHQgaW50ZXJlc3NpZXJ0JywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnV2Vpc3MgbmljaHQva2VpbmUgQW5nYWJlJywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICBdLFxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBfaWQ6IFJhbmRvbS5pZCgpLFxyXG4gICAgICAgIHRleHQ6ICdXaWUgaW50ZXJlc3NpZXJ0IHNpbmQgU2llIElocmVyIEFuc2ljaHQgbmFjaCBhbiBwb2xpdGlzY2hlbiBOYWNocmljaHRlbj8nLFxyXG4gICAgICAgIHR5cGU6ICdzZWxlY3Rpb24nLFxyXG4gICAgICAgIG1pblNlbGVjdDogMSxcclxuICAgICAgICBtYXhTZWxlY3Q6IDEsXHJcbiAgICAgICAgYW5zd2VyczogW1xyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFeHRyZW0gaW50ZXJlc3NpZXJ0JywgdmFsdWU6IDEuMCB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdTZWhyIGludGVyZXNzaWVydCcsIHZhbHVlOiAwLjc1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0V0d2FzIGludGVyZXNzaWVydCcsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ05pY2h0IHNlaHIgaW50ZXJlc3NpZXJ0JywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnw5xiZXJoYXVwdCBuaWNodCBpbnRlcmVzc2llcnQnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdXZWlzcyBuaWNodC9rZWluZSBBbmdhYmUnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogUmFuZG9tLmlkKCksXHJcbiAgICAgICAgdGV4dDogJ01hbmNobWFsIHdlcmRlbiBQYXJ0ZWllbiB1bmQgUG9saXRpa2VySW5uZW4gbWl0IMKrbGlua3PCuywgwqtyZWNodHPCuyB1bmQgwqtNaXR0ZcK7IGJlc2NocmllYmVuLiAoR2VuZXJlbGwgd2VyZGVuIHNvemlhbGlzdGlzY2hlIFBhcnRlaWVuIGFscyDCq2xpbmtzwrsgYmV0cmFjaHRldCwgd8OkaHJlbmQga29uc2VydmF0aXZlIFBhcnRlaWVuIGFscyDCq3JlY2h0c8K7IGJlc2NocmllYmVuIHdlcmRlbi4pIFdpZSB3w7xyZGVuIFNpZSBzaWNoIHZvciBkaWVzZW0gSGludGVyZ3J1bmQgYXVmIGRlciBmb2xnZW5kZW4gU2thbGEgZWlub3JkbmVuPycsXHJcbiAgICAgICAgdHlwZTogJ3NlbGVjdGlvbicsXHJcbiAgICAgICAgbWluU2VsZWN0OiAxLFxyXG4gICAgICAgIG1heFNlbGVjdDogMSxcclxuICAgICAgICBhbnN3ZXJzOiBbXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ1NlaHIgbGlua3MnLCB2YWx1ZTogMS4wIH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgbGlua3MnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFdHdhcyBsaW5rcyB2b24gZGVyIE1pdHRlJywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnTWl0dGUnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdFdHdhcyByZWNodHMgdm9uIGRlciBNaXR0ZScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0VoZXIgcmVjaHRzJywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnU2VociByZWNodHMnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdXZWlzcyBuaWNodC9rZWluZSBBbmdhYmUnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogZnJvbSxcclxuICAgICAgICB0ZXh0OiAnV2VsY2hlIGRlciBmb2xnZW5kZW4gTWVkaWVuIGhhYmVuIFNpZSBsZXR6dGUgV29jaGUgYWxzIE5hY2hyaWNodGVucXVlbGxlIGdlbnV0enQ/IEJpdHRlIHfDpGhsZW4gU2llIGFsbGVzIGF1cywgd2FzIHp1dHJpZmZ0LicsXHJcbiAgICAgICAgdHlwZTogJ3NlbGVjdGlvbicsXHJcbiAgICAgICAgbWluU2VsZWN0OiAxLFxyXG4gICAgICAgIG1heFNlbGVjdDogMCxcclxuICAgICAgICBhbnN3ZXJzOiBbXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJzIwIE1pbnV0ZW4gLyAyMCBtaW51dGVzJywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnMjRoZXVyZXMnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdBYXJnYXVlciBaZWl0dW5nICcsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0Jhc2xlciBaZWl0dW5nICcsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0Jlcm5lciBaZWl0dW5nJywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnQmxpY2snLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdCbGljayBhbSBBYmVuZCcsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ2JsdWV3aW4uY2gnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdnbXguY2gnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdMZSBNYXRpbi9MZSBNYXRpbiBkaW1hbmNoZScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ0xlIE5vdXZlbGxpc3RlJywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnTGUgVGVtcHMnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdMdXplcm5lciBaZWl0dW5nJywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnTVNOIE5ld3MnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdOWlonLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdQcml2YXRmZXJuc2VoZW4nLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdQcml2YXRyYWRpbycsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ1Nvbm50YWdzWmVpdHVuZycsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ1NSRiAvIFJUUyAnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgICAgICB7IF9pZDogUmFuZG9tLmlkKCksIHRleHQ6ICdTdC4gR2FsbGVyIFRhZ2JsYXR0JywgdmFsdWU6IDAuMjUgfSxcclxuICAgICAgICAgICAgeyBfaWQ6IFJhbmRvbS5pZCgpLCB0ZXh0OiAnVGFnZXNBbnplaWdlcicsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ1RyaWJ1bmUgZGUgR2Vuw6h2ZScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ3dhdHNvbi5jaCcsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ1dlbHR3b2NoZScsIHZhbHVlOiAwLjI1IH0sXHJcbiAgICAgICAgICAgIHsgX2lkOiBSYW5kb20uaWQoKSwgdGV4dDogJ1lhaG9vIE5ld3MnLCB2YWx1ZTogMC4yNSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgY2FuQmVTa2lwcGVkOiB0cnVlLFxyXG4gICAgICAgIHNraXBBbnN3ZXJUZXh0OiAnS2VpbmUgQW5nYWJlJyxcclxuICAgICAgICBza2lwQW5zd2VyVmFsdWU6IDAsXHJcbiAgICAgICAgaGFzT3RoZXJPcHRpb246IHRydWUsXHJcbiAgICAgICAgb3RoZXJBbnN3ZXJUZXh0OiAnU29uc3RpZ2VzLCB1bmQgendhcjogX19fX19fXycsXHJcbiAgICAgICAgb3RoZXJBbnN3ZXJWYWx1ZTogLTEsXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogUmFuZG9tLmlkKCksXHJcbiAgICAgICAgdGV4dDogJ1NpZSBoYWJlbiBhbmdlZ2ViZW4sIGRhc3MgU2llIGRpZXNlIE5hY2hyaWNodGVucXVlbGxlbiBsZXR6dGUgV29jaGUgZ2VudXR6dCBoYWJlbi4gV2FzIHfDvHJkZW4gU2llIHNhZ2VuLCB3ZWxjaGUgZGF2b24gaXN0IElocmUgSEFVUFQtUXVlbGxlIGbDvHIgTmFjaHJpY2h0ZW4/JyxcclxuICAgICAgICB0eXBlOiAnc2VsZWN0aW9uJyxcclxuICAgICAgICBtaW5TZWxlY3Q6IDEsXHJcbiAgICAgICAgbWF4U2VsZWN0OiAxLFxyXG4gICAgICAgIGFuc3dlcnM6IFtdLFxyXG4gICAgICAgIHNlbGVjdGlvbnNGcm9tOiB7XHJcbiAgICAgICAgICAgIF9pZDogZnJvbSxcclxuICAgICAgICAgICAgaW5kZXg6IDIwLFxyXG4gICAgICAgICAgICB2YWx1ZTogZnJvbSxcclxuICAgICAgICAgICAgbGFiZWw6ICcyMSAtIFdlbGNoZSBkZXIgZm9sZ2VuZGVuIE1lZGllbiBoYWJlbiBTaWUgbGV0enRlIFdvY2hlIGFscyBOYWNocmljaHRlbnF1ZWxsZSBnZW51dHp0PyBCaXR0ZSB3w6RobGVuIFNpZSBhbGxlcyBhdXMsIHdhcyB6dXRyaWZmdC4nLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgd2l0aEF0TGVhc3Q6IDIsXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIF9pZDogUmFuZG9tLmlkKCksXHJcbiAgICAgICAgdGV4dDogJ0F1ZiB3ZWxjaGUgZGllc2VyIE1lZGllbiwgZGllIFNpZSBsZXR6dGUgV29jaGUgdmVyd2VuZGV0IGhhYmVuLCBoYWJlbiBTaWUgcGVyIEFwcCBhdWYgSWhyZW0gU21hcnRwaG9uZSB6dWdlZ3JpZmZlbj8nLFxyXG4gICAgICAgIHR5cGU6ICdzZWxlY3Rpb24nLFxyXG4gICAgICAgIG1pblNlbGVjdDogMCxcclxuICAgICAgICBtYXhTZWxlY3Q6IDAsXHJcbiAgICAgICAgY2FuQmVTa2lwcGVkOiB0cnVlLFxyXG4gICAgICAgIHNraXBBbnN3ZXJUZXh0OiAnS2VpbmUgQW5nYWJlJyxcclxuICAgICAgICBza2lwQW5zd2VyVmFsdWU6IDAsXHJcbiAgICAgICAgYW5zd2VyczogW10sXHJcbiAgICAgICAgc2VsZWN0aW9uc0Zyb206IHtcclxuICAgICAgICAgICAgX2lkOiBmcm9tLFxyXG4gICAgICAgICAgICBpbmRleDogMjAsXHJcbiAgICAgICAgICAgIHZhbHVlOiBmcm9tLFxyXG4gICAgICAgICAgICBsYWJlbDogJzIxIC0gV2VsY2hlIGRlciBmb2xnZW5kZW4gTWVkaWVuIGhhYmVuIFNpZSBsZXR6dGUgV29jaGUgYWxzIE5hY2hyaWNodGVucXVlbGxlIGdlbnV0enQ/IEJpdHRlIHfDpGhsZW4gU2llIGFsbGVzIGF1cywgd2FzIHp1dHJpZmZ0LicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB3aXRoQXRMZWFzdDogMSxcclxuICAgIH0sXHJcbl07XHJcblxyXG5leHBvcnQgY29uc3QgU1VSVkVZUyA9IFtcclxuICAgIHtcclxuICAgICAgICBfaWQ6ICdkZWZhdWx0LXN1cnZleS1maXh0dXJlLWlkJyxcclxuICAgICAgICBuYW1lOiAnRGVmYXVsdCBGaXh0dXJlIFN1cnZleScsXHJcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIGNyZWF0ZWRCeTogJ1N5c3RlbScsXHJcbiAgICAgICAgaXNBY3RpdmU6IHRydWUsXHJcbiAgICAgICAgcXVlc3Rpb25zOiBRVUVTVElPTlMsXHJcbiAgICAgICAgZXhwZXJpbWVudDogRVhQRVJJTUVOVC5faWQsXHJcbiAgICB9LFxyXG5dO1xyXG4iLCIvLyB3ZSBuZWVkIHRvIGltcG9ydCBhbGwgZmlsZXMgd2l0aCBtZXRlb3IgbWV0aG9kcyBoZXJlIHRvIGJlIGFibGUgdG9cbi8vIGNhbGwgdGhlbS4gSU1QT1JUIEhFUkVcblxuaW1wb3J0ICcuL2ZpeHR1cmVzJztcbmltcG9ydCAnLi9jb25maWdzJztcblxuaW1wb3J0ICcuLi8uLi9hcGkvYXJjaGl2ZSc7XG5pbXBvcnQgJy4uLy4uL2FwaS9hcnRpY2xlcyc7XG5pbXBvcnQgJy4uLy4uL2FwaS9hcnRpY2xlVmlld3MnO1xuaW1wb3J0ICcuLi8uLi9hcGkvcmVhZGluZ0xpc3QnO1xuaW1wb3J0ICcuLi8uLi9hcGkvc3VydmV5cyc7XG5pbXBvcnQgJy4uLy4uL2FwaS9hbnN3ZXJzJztcbmltcG9ydCAnLi4vLi4vYXBpL3NpZ25pbnMnO1xuaW1wb3J0ICcuLi8uLi9hcGkvcGFnZVZpZXdzJztcbmltcG9ydCAnLi4vLi4vYXBpL3VzZXInO1xuaW1wb3J0ICcuLi8uLi9hcGkvYXJ0aWNsZUxpa2VzJztcbmltcG9ydCAnLi4vLi4vYXBpL2V4cGVyaW1lbnRzJztcbmltcG9ydCAnLi4vLi4vYXBpL2V4cGxhbmF0aW9ucyc7XG5pbXBvcnQgJy4uLy4uL2FwaS92aWRlb0FuYWx5dGljcyc7XG5pbXBvcnQgJy4uLy4uL2FwaS9wb2RjYXN0QW5hbHl0aWNzJztcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCBQcm9wVHlwZXMgZnJvbSAncHJvcC10eXBlcyc7XHJcblxyXG5pbXBvcnQgQ29uZmlybWF0aW9uTW9kYWwgZnJvbSAnLi4vLi4vZWxlbWVudHMvbW9kYWwvQ29uZmlybWF0aW9uTW9kYWwnO1xyXG5pbXBvcnQgTW9kYWxIZWFkIGZyb20gJy4uLy4uL2VsZW1lbnRzL21vZGFsL01vZGFsSGVhZCc7XHJcbmltcG9ydCBNb2RhbEJvZHkgZnJvbSAnLi4vLi4vZWxlbWVudHMvbW9kYWwvTW9kYWxCb2R5JztcclxuaW1wb3J0IE1vZGFsRm9vdCBmcm9tICcuLi8uLi9lbGVtZW50cy9tb2RhbC9Nb2RhbEZvb3QnO1xyXG5pbXBvcnQgQnV0dG9uIGZyb20gJy4uLy4uL2VsZW1lbnRzL0J1dHRvbic7XHJcbmltcG9ydCBGYUljb24gZnJvbSAnLi4vLi4vZWxlbWVudHMvRmFJY29uJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIExhdW5jaENvbmZpcm1hdGlvbk1vZGFsKHsgaXNTaG93biwgY2FuY2VsLCBjb25maXJtIH0pIHtcclxuXHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxDb25maXJtYXRpb25Nb2RhbCBpc1Nob3duPXtpc1Nob3dufT5cclxuICAgICAgICAgICAgPE1vZGFsSGVhZD5cclxuICAgICAgICAgICAgICAgIENvbmZpcm1hdGlvbiBSZXF1aXJlZFxyXG4gICAgICAgICAgICA8L01vZGFsSGVhZD5cclxuICAgICAgICAgICAgPE1vZGFsQm9keT5cclxuICAgICAgICAgICAgICAgIDxwPkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBsYXVuY2ggdGhpcyBleHBlcmltZW50PzwvcD5cclxuICAgICAgICAgICAgICAgIDxwPkZvbGxvd2luZyBhY3Rpb25zIGNhbiBub3QgYmUgZG9uZSBhZnRlciBsYXVuY2hpbmc6PC9wPlxyXG4gICAgICAgICAgICAgICAgPGJyLz5cclxuICAgICAgICAgICAgICAgIDx1bD5cclxuICAgICAgICAgICAgICAgICAgICA8bGk+JiM4NTk0OyBSZXZlcnNpbmcgdGhlIGV4cGVyaW1lbnQgYmFjayB0byB0aGUgZGVzaWduIHBoYXNlPC9saT5cclxuICAgICAgICAgICAgICAgICAgICA8bGk+JiM4NTk0OyBBZGRpbmcgYWRkaXRpb25hbCB1c2VyczwvbGk+XHJcbiAgICAgICAgICAgICAgICAgICAgPGxpPiYjODU5NDsgRWRpdGluZyBzdXJ2ZXkgcXVlc3Rpb25zPC9saT5cclxuICAgICAgICAgICAgICAgICAgICA8bGk+JiM4NTk0OyBFZGl0aW5nIGZlZWRiYWNrIHN1cnZleXM8L2xpPlxyXG4gICAgICAgICAgICAgICAgPC91bD5cclxuICAgICAgICAgICAgPC9Nb2RhbEJvZHk+XHJcbiAgICAgICAgICAgIDxNb2RhbEZvb3Q+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbHVtbnMgaXMtcHVsbGVkLXJpZ2h0XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjb2x1bW4gaXMtbmFycm93XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxCdXR0b24gZmxhdCBvbkNsaWNrPXtjYW5jZWx9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2FuY2VsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY29sdW1uIGlzLW5hcnJvd1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8QnV0dG9uIG9uQ2xpY2s9e2NvbmZpcm19PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF1bmNoIGV4cGVyaW1lbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9CdXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPC9Nb2RhbEZvb3Q+XHJcbiAgICAgICAgPC9Db25maXJtYXRpb25Nb2RhbD5cclxuICAgICk7XHJcblxyXG59XHJcblxyXG5MYXVuY2hDb25maXJtYXRpb25Nb2RhbC5wcm9wVHlwZXMgPSB7XHJcbiAgICBpc1Nob3duOiBQcm9wVHlwZXMuYm9vbC5pc1JlcXVpcmVkLFxyXG4gICAgY2FuY2VsOiBQcm9wVHlwZXMuZnVuYy5pc1JlcXVpcmVkLFxyXG4gICAgY29uZmlybTogUHJvcFR5cGVzLmZ1bmMuaXNSZXF1aXJlZCxcclxufTtcclxuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IFByb3BUeXBlcyBmcm9tICdwcm9wLXR5cGVzJztcclxuaW1wb3J0IHsgVHJhbnNpdGlvbiB9IGZyb20gJ3JlYWN0LXRyYW5zaXRpb24tZ3JvdXAnO1xyXG5pbXBvcnQgTW91bnRlciBmcm9tICcuLi9Nb3VudGVyJztcclxuaW1wb3J0IE1vZGFsIGZyb20gJy4vTW9kYWwnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQ29uZmlybWF0aW9uTW9kYWwoeyBpc1Nob3duLCBjaGlsZHJlbiB9KSB7XHJcblxyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8VHJhbnNpdGlvblxyXG4gICAgICAgICAgICBpbj17aXNTaG93bn1cclxuICAgICAgICAgICAgdGltZW91dD17e1xyXG4gICAgICAgICAgICAgICAgZW50ZXI6IDAsXHJcbiAgICAgICAgICAgICAgICBleGl0OiAzMDAsXHJcbiAgICAgICAgICAgICAgICBhcHBlYXI6IDAsXHJcbiAgICAgICAgICAgIH19XHJcbiAgICAgICAgICAgIHVubW91bnRPbkV4aXRcclxuICAgICAgICA+XHJcbiAgICAgICAgICAgIHsoc3RhdGUpID0+IHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoc3RhdGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2VudGVyaW5nJzpcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2VudGVyZWQnOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAnZXhpdGluZyc6XHJcbiAgICAgICAgICAgICAgICBjYXNlICdleGl0ZWQnOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxNb3VudGVyPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2Bjb25maXJtYXRpb25Nb2RhbC1jb250YWluZXIgY29uZmlybWF0aW9uTW9kYWwtY29udGFpbmVyLS0ke3N0YXRlfWB9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxNb2RhbCBjbGFzc05hbWU9XCJjb25maXJtYXRpb25Nb2RhbFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGlzU2hvd24gPyBjaGlsZHJlbiA6IG51bGx9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Nb2RhbD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L01vdW50ZXI+XHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH19XHJcbiAgICAgICAgPC9UcmFuc2l0aW9uPlxyXG4gICAgKTtcclxuXHJcbn1cclxuXHJcbkNvbmZpcm1hdGlvbk1vZGFsLnByb3BUeXBlcyA9IHtcclxuICAgIGlzU2hvd246IFByb3BUeXBlcy5ib29sLmlzUmVxdWlyZWQsXHJcbiAgICBjaGlsZHJlbjogUHJvcFR5cGVzLm5vZGUuaXNSZXF1aXJlZCxcclxufTtcclxuIiwiaW1wb3J0IFJlYWN0LCB7IENvbXBvbmVudCB9IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IFByb3BUeXBlcyBmcm9tICdwcm9wLXR5cGVzJztcclxuaW1wb3J0IHsgY2xhc3NOYW1lcyB9IGZyb20gJy4uLy4uLy4uL2xpYi91dGlscy91dGlscyc7XHJcblxyXG4vKipcclxuICogVGhpcyBjbGFzcyBpbXBsZW1lbnRzIHRoZSBtYWluIGNvbnRhaW5lciBmb3IgYSBtb2RhbC5cclxuICpcclxuICogVXNlIHRoaXMgY29tcG9uZW50IHdpdGhcclxuICpcclxuICogQHNlZSBNb2RhbEhlYWRcclxuICogICAgICAgICAgaGVhZCBjb21wb25lbnQgb2YgdGhlIG1vZGFsLiB0aGlzIHBhcnQgd2lsbCBiZVxyXG4gKiAgICAgICAgICBwb3NpdGlvbmVkIG9uIHRoZSB0b3Agb2YgdGhlIHBhZ2UuXHJcbiAqXHJcbiAqIEBzZWUgTW9kYWxCb2R5XHJcbiAqICAgICAgICAgIGJvZHkgY29tcG9uZW50IG9mIHRoZSBtb2RhbC4gdGhpcyBwYXJ0IHdpbGwgYmVcclxuICogICAgICAgICAgcG9zaXRpb25lZCBiZXR3ZWVuIHRoZSBoZWFkIGFuZCBmb290IHN1Y2ggdGhhdFxyXG4gKiAgICAgICAgICBpdCBzdHJldGNoZXMgYW5kIHVzZXMgYWxsIHRoZSByZW1haW5pbmcgdmVydGljYWwgc3BhY2UuXHJcbiAqXHJcbiAqICAgICAgICAgIHVzaW5nIDxNb2RhbCBjZW50ZXJlZC8+IHdpbGwgY2VudGVyIHRoZSBjb250ZW50IG9mXHJcbiAqICAgICAgICAgIE1vZGFsQm9keSB2ZXJ0aWNhbGx5IGFuZCBob3Jpem9udGFsbHkuXHJcbiAqXHJcbiAqIEBzZWUgTW9kYWxGb290XHJcbiAqICAgICAgICAgIGZvb3QgY29tcG9uZW50IG9mIHRoZSBtb2RhbC4gdGhpcyBwYXJ0IHdpbGwgYmVcclxuICogICAgICAgICAgcG9zaXRpb25lZCBvbiB0aGUgYm90dG9tIG9mIHRoZSBwYWdlIChvciBzaW1wbHkgYmVsb3dcclxuICogICAgICAgICAgdGhlIGJvZHkgY29tcG9uZW50IGlmIHRoZSBtb2RhbCBpcyBsYXJnZXIgdGhhbiB0aGVcclxuICogICAgICAgICAgdmlld3BvcnQgaGVpZ2h0KS5cclxuICpcclxuICogc3VjaCB0aGF0IE1vZGFsIGlzIHVzZWQgYXMgdGhlIGNvbnRhaW5lciBjb21wb25lbnQgb2YgdGhlIG1vZGFsIHN0cnVjdHVyZTpcclxuICpcclxuICogICA8TW9kYWw+XHJcbiAqICAgICAgPE1vZGFsSGVhZD4geW91ciBtb2RhbCBoZWFkIDwvTW9kYWxIZWFkPlxyXG4gKiAgICAgIDxNb2RhbEJvZHk+IHlvdXIgbW9kYWwgaGVhZCA8L01vZGFsQm9keT5cclxuICogICAgICA8TW9kYWxGb290PiB5b3VyIG1vZGFsIGhlYWQgPC9Nb2RhbEZvb3Q+XHJcbiAqICAgPC9Nb2RhbD5cclxuICpcclxuICpcclxuICpcclxuICogSXQgYWRkcyBhIGtleWRvd24gZXZlbnQgYW5kIGF0dGFjaGVzIHRoZSBwYXNzZWQgY2xvc2UgZnVuY3Rpb24gdG8gaXRcclxuICogYW5kIGluY2x1ZGVzIHRoZSBlc2NhcGUgYnV0dG9uIGluIHRoZSB0b3AgcmlnaHQgY29ybmVyIGlmIHN1Y2ggYVxyXG4gKiBmdW5jdGlvbiB3YXMgcHJvdmlkZWQuXHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNb2RhbCBleHRlbmRzIENvbXBvbmVudCB7XHJcblxyXG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcclxuICAgICAgICBzdXBlcihwcm9wcyk7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVLZXlEb3duID0gdGhpcy5oYW5kbGVLZXlEb3duLmJpbmQodGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XHJcbiAgICAgICAgY29uc3QgeyBjbG9zZU1vZGFsIH0gPSB0aGlzLnByb3BzO1xyXG4gICAgICAgIGlmIChjbG9zZU1vZGFsKSB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLmhhbmRsZUtleURvd24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcclxuICAgICAgICBjb25zdCB7IGNsb3NlTW9kYWwgfSA9IHRoaXMucHJvcHM7XHJcbiAgICAgICAgaWYgKGNsb3NlTW9kYWwpIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMuaGFuZGxlS2V5RG93bik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldCBtb2RhbENsYXNzTmFtZXMoKSB7XHJcbiAgICAgICAgY29uc3QgeyBjbGFzc05hbWUsIGNlbnRlcmVkIH0gPSB0aGlzLnByb3BzO1xyXG5cclxuICAgICAgICBjb25zdCBjbGFzc2VzID0ge1xyXG4gICAgICAgICAgICBcImN1c3RvbS1tb2RhbFwiOiB0cnVlLFxyXG4gICAgICAgICAgICAnY3VzdG9tLW1vZGFsLS1pcy1jZW50ZXJlZCc6ICEhY2VudGVyZWQsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGAke2NsYXNzTmFtZXMoY2xhc3Nlcyl9ICR7Y2xhc3NOYW1lfWA7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGVzY0J1dHRvbigpIHtcclxuICAgICAgICBjb25zdCB7IGNsb3NlTW9kYWwgfSA9IHRoaXMucHJvcHM7XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgPGEgY2xhc3NOYW1lPVwiY3VzdG9tLWJ1dHRvbiBidXR0b24tLWdyZXktLWludmVydGVkIGVzYy1idXR0b24tLWhlcm9cIiBvbkNsaWNrPXtjbG9zZU1vZGFsfT5cclxuICAgICAgICAgICAgICAgIGVzY1xyXG4gICAgICAgICAgICA8L2E+XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBoYW5kbGVLZXlEb3duKGV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgeyBjbG9zZU1vZGFsIH0gPSB0aGlzLnByb3BzO1xyXG4gICAgICAgIGNvbnN0IEVTQ0FQRV9LRVkgPSAyNztcclxuICAgICAgICBzd2l0Y2ggKGV2ZW50LmtleUNvZGUpIHtcclxuICAgICAgICBjYXNlIEVTQ0FQRV9LRVk6XHJcbiAgICAgICAgICAgIGNsb3NlTW9kYWwoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlbmRlcigpIHtcclxuICAgICAgICBjb25zdCB7IGNsb3NlTW9kYWwsIGNoaWxkcmVuIH0gPSB0aGlzLnByb3BzO1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXt0aGlzLm1vZGFsQ2xhc3NOYW1lc30+XHJcbiAgICAgICAgICAgICAgICB7IGNsb3NlTW9kYWwgPyB0aGlzLmVzY0J1dHRvbiA6IG51bGwgfVxyXG4gICAgICAgICAgICAgICAgeyBjaGlsZHJlbiB9XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5Nb2RhbC5kZWZhdWx0UHJvcHMgPSB7XHJcbiAgICBjaGlsZHJlbjogPD48Lz4sXHJcbiAgICBjZW50ZXJlZDogZmFsc2UsXHJcbiAgICBjbGFzc05hbWU6ICcnLFxyXG4gICAgY2xvc2VNb2RhbDogbnVsbCxcclxufTtcclxuXHJcbk1vZGFsLnByb3BUeXBlcyA9IHtcclxuICAgIGNoaWxkcmVuOiBQcm9wVHlwZXMubm9kZSxcclxuICAgIGNlbnRlcmVkOiBQcm9wVHlwZXMuYm9vbCxcclxuICAgIGNsYXNzTmFtZTogUHJvcFR5cGVzLnN0cmluZyxcclxuICAgIGNsb3NlTW9kYWw6IFByb3BUeXBlcy5mdW5jLFxyXG59O1xyXG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgUHJvcFR5cGVzIGZyb20gJ3Byb3AtdHlwZXMnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTW9kYWxCb2R5KHsgY2xhc3NOYW1lLCBjaGlsZHJlbiB9KSB7XHJcbiAgICBjb25zdCBjbGFzc2VzID0gYGN1c3RvbS1tb2RhbF9fYm9keSAke2NsYXNzTmFtZX1gO1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT17Y2xhc3Nlc30+XHJcbiAgICAgICAgICAgIHsgY2hpbGRyZW4gfVxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgKTtcclxufVxyXG5cclxuTW9kYWxCb2R5LmRlZmF1bHRQcm9wcyA9IHtcclxuICAgIGNsYXNzTmFtZTogJycsXHJcbn07XHJcblxyXG5Nb2RhbEJvZHkucHJvcFR5cGVzID0ge1xyXG4gICAgY2hpbGRyZW46IFByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXHJcbiAgICBjbGFzc05hbWU6IFByb3BUeXBlcy5zdHJpbmcsXHJcbn07XHJcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCBQcm9wVHlwZXMgZnJvbSAncHJvcC10eXBlcyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBNb2RhbEZvb3QoeyBjbGFzc05hbWUsIGNoaWxkcmVuIH0pIHtcclxuICAgIGNvbnN0IGNsYXNzZXMgPSBgY3VzdG9tLW1vZGFsX19mb290ICR7Y2xhc3NOYW1lfWA7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPXtjbGFzc2VzfT5cclxuICAgICAgICAgICAgeyBjaGlsZHJlbiB9XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICApO1xyXG59XHJcblxyXG5Nb2RhbEZvb3QuZGVmYXVsdFByb3BzID0ge1xyXG4gICAgY2xhc3NOYW1lOiAnJyxcclxufTtcclxuXHJcbk1vZGFsRm9vdC5wcm9wVHlwZXMgPSB7XHJcbiAgICBjaGlsZHJlbjogUHJvcFR5cGVzLm5vZGUuaXNSZXF1aXJlZCxcclxuICAgIGNsYXNzTmFtZTogUHJvcFR5cGVzLnN0cmluZyxcclxufTtcclxuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IFByb3BUeXBlcyBmcm9tICdwcm9wLXR5cGVzJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE1vZGFsSGVhZCh7IGNsYXNzTmFtZSwgY2hpbGRyZW4gfSkge1xyXG4gICAgY29uc3QgY2xhc3NlcyA9IGBjdXN0b20tbW9kYWxfX2hlYWQgJHtjbGFzc05hbWV9YDtcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9e2NsYXNzZXN9PlxyXG4gICAgICAgICAgICB7IGNoaWxkcmVuIH1cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbn1cclxuXHJcbk1vZGFsSGVhZC5kZWZhdWx0UHJvcHMgPSB7XHJcbiAgICBjbGFzc05hbWU6ICcnLFxyXG59O1xyXG5cclxuTW9kYWxIZWFkLnByb3BUeXBlcyA9IHtcclxuICAgIGNoaWxkcmVuOiBQcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxyXG4gICAgY2xhc3NOYW1lOiBQcm9wVHlwZXMuc3RyaW5nLFxyXG59O1xyXG4iLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgUHJvcFR5cGVzIGZyb20gJ3Byb3AtdHlwZXMnO1xyXG5pbXBvcnQgeyBjbGFzc05hbWVzIH0gZnJvbSAnLi4vLi4vbGliL3V0aWxzL3V0aWxzJztcclxuXHJcblxyXG5jb25zdCBCdXR0b24gPSBSZWFjdC5mb3J3YXJkUmVmKCh7XHJcbiAgICBjaXJjbGUsIGNoaWxkcmVuLCBmbGF0LCBocmVmLCBvbkNsaWNrLCByb3VuZCwgdGV4dCwgaWNvbldpdGhMaW5rLCBjbGFzc05hbWUsIHR5cGUsIC4uLnByb3BzXHJcbn0sIHJlZikgPT4ge1xyXG4gICAgY29uc3QgYnV0dG9uQ2xhc3NOYW1lcyA9IHtcclxuICAgICAgICAnY3VzdG9tLWJ1dHRvbic6IHRydWUsXHJcbiAgICAgICAgJ2N1c3RvbS1idXR0b24tLWNpcmNsZSc6IGNpcmNsZSxcclxuICAgICAgICAnY3VzdG9tLWJ1dHRvbi0tZmxhdCc6IGZsYXQsXHJcbiAgICAgICAgJ2N1c3RvbS1idXR0b24tLXJvdW5kJzogcm91bmQsXHJcbiAgICAgICAgJ2N1c3RvbS1idXR0b24tLWxpbmsnOiB0ZXh0LFxyXG4gICAgICAgICdjdXN0b20tYnV0dG9uLS1pY29uLXdpdGgtbGluayc6IGljb25XaXRoTGluayxcclxuICAgICAgICBbY2xhc3NOYW1lXTogdHJ1ZSxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKHR5cGUpIHtcclxuICAgICAgICBidXR0b25DbGFzc05hbWVzW2BjdXN0b20tYnV0dG9uLS0ke3R5cGV9YF0gPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChocmVmKSB7XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgPGFcclxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17Y2xhc3NOYW1lcyhidXR0b25DbGFzc05hbWVzKX1cclxuICAgICAgICAgICAgICAgIGhyZWY9e2hyZWZ9XHJcbiAgICAgICAgICAgICAgICBvbkNsaWNrPXtvbkNsaWNrfVxyXG4gICAgICAgICAgICAgICAgcmVmPXtyZWZ9XHJcbiAgICAgICAgICAgICAgICB7Li4ucHJvcHN9XHJcbiAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgIHtjaGlsZHJlbn1cclxuICAgICAgICAgICAgPC9hPlxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8YnV0dG9uXHJcbiAgICAgICAgICAgIGNsYXNzTmFtZT17Y2xhc3NOYW1lcyhidXR0b25DbGFzc05hbWVzKX1cclxuICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXHJcbiAgICAgICAgICAgIG9uQ2xpY2s9e29uQ2xpY2t9XHJcbiAgICAgICAgICAgIHJlZj17cmVmfVxyXG4gICAgICAgICAgICB7Li4ucHJvcHN9XHJcbiAgICAgICAgPlxyXG4gICAgICAgICAgICB7Y2hpbGRyZW59XHJcbiAgICAgICAgPC9idXR0b24+XHJcbiAgICApO1xyXG59KTtcclxuXHJcbkJ1dHRvbi5wcm9wVHlwZXMgPSB7XHJcbiAgICBjaGlsZHJlbjogUHJvcFR5cGVzLm5vZGUuaXNSZXF1aXJlZCxcclxuICAgIG9uQ2xpY2s6IFByb3BUeXBlcy5mdW5jLFxyXG4gICAgaHJlZjogUHJvcFR5cGVzLnN0cmluZyxcclxuICAgIGZsYXQ6IFByb3BUeXBlcy5ib29sLFxyXG4gICAgY2lyY2xlOiBQcm9wVHlwZXMuYm9vbCxcclxuICAgIHJvdW5kOiBQcm9wVHlwZXMuYm9vbCxcclxuICAgIGljb25XaXRoTGluazogUHJvcFR5cGVzLmJvb2wsXHJcbiAgICBjbGFzc05hbWU6IFByb3BUeXBlcy5zdHJpbmcsXHJcbiAgICB0eXBlOiBQcm9wVHlwZXMuc3RyaW5nLFxyXG59O1xyXG5cclxuQnV0dG9uLmRlZmF1bHRQcm9wcyA9IHtcclxuICAgIG9uQ2xpY2s6IGV2ZW50ID0+IGV2ZW50LnByZXZlbnREZWZhdWx0KCksXHJcbiAgICBocmVmOiAnJyxcclxuICAgIGNpcmNsZTogZmFsc2UsXHJcbiAgICBmbGF0OiBmYWxzZSxcclxuICAgIHJvdW5kOiBmYWxzZSxcclxuICAgIGljb25XaXRoTGluazogZmFsc2UsXHJcbiAgICBjbGFzc05hbWU6ICcnLFxyXG4gICAgdHlwZTogJycsXHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBCdXR0b247XHJcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCBQcm9wVHlwZXMgZnJvbSAncHJvcC10eXBlcyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBGYUljb24oe1xyXG4gICAgY2xhc3NOYW1lLCBpY29uLCByZWd1bGFyLFxyXG59KSB7XHJcblxyXG4gICAgY29uc3QgaWNvbkNsYXNzID0gcmVndWxhciA/ICdmYXInIDogJ2ZhJztcclxuXHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInN5bWJvbFwiPlxyXG4gICAgICAgICAgICA8aSBjbGFzc05hbWU9e2Ake2NsYXNzTmFtZX0gJHtpY29uQ2xhc3N9IGZhLSR7aWNvbn1gfSAvPlxyXG4gICAgICAgIDwvc3Bhbj5cclxuICAgICk7XHJcbn1cclxuXHJcbkZhSWNvbi5wcm9wVHlwZXMgPSB7XHJcbiAgICBpY29uOiBQcm9wVHlwZXMuc3RyaW5nLmlzUmVxdWlyZWQsXHJcbiAgICBjbGFzc05hbWU6IFByb3BUeXBlcy5zdHJpbmcsXHJcbiAgICByZWd1bGFyOiBQcm9wVHlwZXMuYm9vbCxcclxufTtcclxuXHJcbkZhSWNvbi5kZWZhdWx0UHJvcHMgPSB7XHJcbiAgICBjbGFzc05hbWU6ICcnLFxyXG4gICAgcmVndWxhcjogZmFsc2UsXHJcbn07XHJcbiIsImltcG9ydCBSZWFjdERPTSBmcm9tICdyZWFjdC1kb20nO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTW91bnRlcih7IGNoaWxkcmVuIH0pIHtcclxuICAgIGNvbnN0IGFwcFJvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVhY3Qtcm9vdCcpO1xyXG4gICAgcmV0dXJuIFJlYWN0RE9NLmNyZWF0ZVBvcnRhbChjaGlsZHJlbiwgYXBwUm9vdCk7XHJcbn1cclxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XHJcbmltcG9ydCBSZWFjdCwgeyBDb21wb25lbnQgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCBQcm9wVHlwZXMgZnJvbSAncHJvcC10eXBlcyc7XHJcblxyXG5pbXBvcnQgTW9kdWxlIGZyb20gJy4uLy4uL2xheW91dC9Nb2R1bGUnO1xyXG5pbXBvcnQgTW9kdWxlU2VjdGlvbiBmcm9tICcuLi8uLi9sYXlvdXQvTW9kdWxlU2VjdGlvbic7XHJcbmltcG9ydCBCdXR0b24gZnJvbSAnLi4vLi4vZWxlbWVudHMvQnV0dG9uJztcclxuaW1wb3J0IExhdW5jaENvbmZpcm1hdGlvbk1vZGFsIGZyb20gJy4uLy4uL2NvbXBvbmVudHMvZXhwZXJpbWVudHMvTGF1bmNoQ29uZmlybWF0aW9uTW9kYWwnO1xyXG5cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4cGVyaW1lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcclxuICAgICAgICBzdXBlcihwcm9wcyk7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHtcclxuICAgICAgICAgICAgZXhwZXJpbWVudDogcHJvcHMuZXhwZXJpbWVudCxcclxuICAgICAgICAgICAgZXJyb3JNZXNzYWdlOiAnJyxcclxuICAgICAgICAgICAgaXNTYXZpbmc6IGZhbHNlLFxyXG4gICAgICAgICAgICB3YXNTYXZlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIGlzTGF1bmNoQ29uZmlybWF0aW9uU2hvd246IGZhbHNlLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuaGFuZGxlU2VsZWN0RXhwZXJpbWVudCA9IHRoaXMuaGFuZGxlU2VsZWN0RXhwZXJpbWVudC5iaW5kKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuaGFuZGxlSW5wdXRDaGFuZ2UgPSB0aGlzLmhhbmRsZUlucHV0Q2hhbmdlLmJpbmQodGhpcyk7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVMYXVuY2ggPSB0aGlzLmhhbmRsZUxhdW5jaC5iaW5kKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuaGFuZGxlU3VibWl0ID0gdGhpcy5oYW5kbGVTdWJtaXQuYmluZCh0aGlzKTtcclxuICAgIH1cclxuXHJcbiAgICBoYW5kbGVTZWxlY3RFeHBlcmltZW50KCkge1xyXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkID0gU2Vzc2lvbi5nZXQoJ3NlbGVjdGVkRXhwZXJpbWVudCcpO1xyXG4gICAgICAgIGlmIChzZWxlY3RlZCA9PT0gdGhpcy5wcm9wcy5leHBlcmltZW50Ll9pZCkge1xyXG4gICAgICAgICAgICBTZXNzaW9uLnNldCgnc2VsZWN0ZWRFeHBlcmltZW50JywgJycpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIFNlc3Npb24uc2V0KCdzZWxlY3RlZEV4cGVyaW1lbnQnLCB0aGlzLnByb3BzLmV4cGVyaW1lbnQuX2lkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaGFuZGxlSW5wdXRDaGFuZ2UoZXZlbnQpIHtcclxuICAgICAgICBjb25zdCB0YXJnZXQgPSBldmVudC50YXJnZXQ7XHJcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0YXJnZXQudHlwZSA9PSAnY2hlY2tib3gnID8gdGFyZ2V0LmNoZWNrZWQgOiB0YXJnZXQudmFsdWU7XHJcbiAgICAgICAgY29uc3QgbmFtZSA9IHRhcmdldC5uYW1lO1xyXG5cclxuICAgICAgICB0aGlzLnNldFN0YXRlKCh7IGV4cGVyaW1lbnQgfSkgPT4gKHtcclxuICAgICAgICAgICAgZXhwZXJpbWVudDoge1xyXG4gICAgICAgICAgICAgICAgLi4uZXhwZXJpbWVudCxcclxuICAgICAgICAgICAgICAgIFtuYW1lXTogdmFsdWUsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGhhbmRsZUxhdW5jaCgpIHtcclxuICAgICAgICBNZXRlb3IuY2FsbCgnZXhwZXJpbWVudHMubGF1bmNoJywgdGhpcy5wcm9wcy5leHBlcmltZW50Ll9pZCwgKGVycikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHsgZXJyb3JNZXNzYWdlOiBcIlNvbWV0aGluZyB3ZW50IHdyb25nXCIsIGlzU2F2aW5nOiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSgoeyBleHBlcmltZW50IH0pID0+ICh7XHJcbiAgICAgICAgICAgICAgICBleHBlcmltZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uZXhwZXJpbWVudCxcclxuICAgICAgICAgICAgICAgICAgICB0ZXN0aW5nUGhhc2U6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGlzTGF1bmNoQ29uZmlybWF0aW9uU2hvd246IGZhbHNlLFxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGhhbmRsZVN1Ym1pdCgpIHtcclxuICAgICAgICBjb25zdCBleHBlcmltZW50ID0gdGhpcy5zdGF0ZS5leHBlcmltZW50O1xyXG5cclxuICAgICAgICB0aGlzLnNldFN0YXRlKHtcclxuICAgICAgICAgICAgaXNTYXZpbmc6IHRydWUsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIE1ldGVvci5jYWxsKCdleHBlcmltZW50cy51cGRhdGUnLCBleHBlcmltZW50LCAoZXJyKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoeyBlcnJvck1lc3NhZ2U6IFwiU29tZXRoaW5nIHdlbnQgd3JvbmdcIiwgaXNTYXZpbmc6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKHsgd2FzU2F2ZWQ6IHRydWUsIGlzU2F2aW5nOiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgTWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IHdhc1NhdmVkOiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgfSwgMTAwMDApO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGJ1dHRvblRleHQoKSB7XHJcbiAgICAgICAgY29uc3QgeyBpc1NhdmluZywgd2FzU2F2ZWQgfSA9IHRoaXMuc3RhdGU7XHJcbiAgICAgICAgaWYgKGlzU2F2aW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnLi4uc2F2aW5nJztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHdhc1NhdmVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnQ2hhbmdlcyBzYXZlZCEnO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gJ1NhdmUgY2hhbmdlcyc7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGV4cGVyaW1lbnQoKSB7XHJcbiAgICAgICAgY29uc3QgeyBzZWxlY3RlZCB9ID0gdGhpcy5wcm9wcztcclxuXHJcbiAgICAgICAgY29uc3Qgc2VsZWN0QnV0dG9uQ2xhc3NlcyA9IFwic2VsZWN0LWV4cGVyaW1lbnQgaXMtc2l6ZS00IGlzLWZsZXgtZGlyZWN0aW9uLWNvbHVtbiBcIiArIChzZWxlY3RlZCA/IFwiIHNlbGVjdGVkXCIgOiBcIlwiKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgPE1vZHVsZVNlY3Rpb24gY2FyZCBjb250ZW50PlxyXG5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZXhwZXJpbWVudCBjb2x1bW5zXCI+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY29sdW1uIGlzLXR3by1maWZ0aHNcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgY2xhc3NOYW1lPXtzZWxlY3RCdXR0b25DbGFzc2VzfSBvbkNsaWNrPXt0aGlzLmhhbmRsZVNlbGVjdEV4cGVyaW1lbnR9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBzZWxlY3RlZCA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKDw+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXY+U2VsZWN0ZWQ8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJpcy1zaXplLTZcIj5Db250aW51ZSBpbiB0b3AgbWVudTwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvPilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJDbGljayB0byBzZWxlY3QgdGhpcyBleHBlcmltZW50XCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbHVtblwiPlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjb2x1bW5zXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbHVtblwiPk5hbWU8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY29sdW1uXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cIm5hbWVcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17IHRoaXMuc3RhdGUuZXhwZXJpbWVudC5uYW1lIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyB0aGlzLmhhbmRsZUlucHV0Q2hhbmdlIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbHVtbnNcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY29sdW1uXCI+U3RhdHVzPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbHVtblwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdGhpcy5zdGF0ZS5leHBlcmltZW50LnRlc3RpbmdQaGFzZSA/IFwiRGVzaWduXCIgOiBcIkxhdW5jaGVkXCIgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgeyB0aGlzLnN0YXRlLmVycm9yTWVzc2FnZSA/IHRoaXMuZXJyb3JNZXNzYWdlIDogbnVsbCB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbHVtbnNcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY29sdW1uIGlzLW5hcnJvd1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxCdXR0b24gb25DbGljaz17dGhpcy5oYW5kbGVTdWJtaXR9IHR5cGU9e3RoaXMuYnV0dG9uVHlwZX0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdGhpcy5idXR0b25UZXh0IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUuZXhwZXJpbWVudC50ZXN0aW5nUGhhc2UgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbHVtbiBpcy1uYXJyb3dcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJ1dHRvbiBvbkNsaWNrPXsgKCkgPT4geyB0aGlzLnNldFN0YXRlKHsgaXNMYXVuY2hDb25maXJtYXRpb25TaG93bjogdHJ1ZSB9KTsgfSB9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF1bmNoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPC9Nb2R1bGVTZWN0aW9uPlxyXG4gICAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICByZW5kZXIoKSB7XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgPE1vZHVsZT5cclxuXHJcbiAgICAgICAgICAgICAgICB7IHRoaXMuZXhwZXJpbWVudCB9XHJcblxyXG4gICAgICAgICAgICAgICAgPExhdW5jaENvbmZpcm1hdGlvbk1vZGFsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNTaG93bj17dGhpcy5zdGF0ZS5pc0xhdW5jaENvbmZpcm1hdGlvblNob3dufVxyXG4gICAgICAgICAgICAgICAgICAgIGNhbmNlbD17KCkgPT4geyB0aGlzLnNldFN0YXRlKHsgaXNMYXVuY2hDb25maXJtYXRpb25TaG93bjogZmFsc2UgfSkgfX1cclxuICAgICAgICAgICAgICAgICAgICBjb25maXJtPXt0aGlzLmhhbmRsZUxhdW5jaH1cclxuICAgICAgICAgICAgICAgIC8+XHJcblxyXG4gICAgICAgICAgICA8L01vZHVsZT5cclxuICAgICAgICApO1xyXG4gICAgfVxyXG59XHJcblxyXG5FeHBlcmltZW50LmRlZmF1bHRQcm9wcyA9IHtcclxuICAgIGV4cGVyaW1lbnQ6IHtcclxuICAgICAgICBuYW1lOiAnJyxcclxuICAgICAgICB0ZXN0aW5nUGhhc2U6IGZhbHNlLFxyXG4gICAgfSxcclxufTtcclxuXHJcbkV4cGVyaW1lbnQucHJvcFR5cGVzID0ge1xyXG4gICAgZXhwZXJpbWVudDogUHJvcFR5cGVzLm9iamVjdCxcclxufTtcclxuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IFByb3BUeXBlcyBmcm9tICdwcm9wLXR5cGVzJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE1vZHVsZSh7IGNoaWxkcmVuIH0pIHtcclxuXHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibW9kdWxlXCI+XHJcbiAgICAgICAgICAgIHsgY2hpbGRyZW4gfVxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgKTtcclxuXHJcbn1cclxuXHJcbk1vZHVsZS5wcm9wVHlwZXMgPSB7XHJcbiAgICBjaGlsZHJlbjogUHJvcFR5cGVzLm5vZGUuaXNSZXF1aXJlZCxcclxufTtcclxuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IFByb3BUeXBlcyBmcm9tICdwcm9wLXR5cGVzJztcclxuaW1wb3J0IHsgY2xhc3NOYW1lcyB9IGZyb20gJy4uLy4uL2xpYi91dGlscy91dGlscyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBNb2R1bGVTZWN0aW9uKHtcclxuICAgIGJldHdlZW4sIGNhcmQsIGNvbnRlbnQsIGNoaWxkcmVuLCBib3hlZCxcclxufSkge1xyXG5cclxuICAgIGNvbnN0IGNvbnRhaW5lckNsYXNzZXMgPSB7XHJcbiAgICAgICAgJ21vZHVsZS1zZWN0aW9uJzogdHJ1ZSxcclxuICAgICAgICAnbW9kdWxlLXNlY3Rpb24tLWJldHdlZW4nOiBiZXR3ZWVuLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBjb250ZW50Q2xhc3NlcyA9IHtcclxuICAgICAgICAnbW9kdWxlLXNlY3Rpb24tY29udGVudCc6IGNvbnRlbnQgJiYgIWJldHdlZW4sXHJcbiAgICAgICAgJ21vZHVsZS1zZWN0aW9uLWNhcmQnOiBjYXJkLFxyXG4gICAgICAgICdtb2R1bGUtc2VjdGlvbi1jYXJkLS0wJzogY2FyZCxcclxuICAgICAgICAnbW9kdWxlLXNlY3Rpb24tLWJveGVkJzogYm94ZWQsXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9e2NsYXNzTmFtZXMoY29udGFpbmVyQ2xhc3Nlcyl9PlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17Y2xhc3NOYW1lcyhjb250ZW50Q2xhc3Nlcyl9PlxyXG4gICAgICAgICAgICAgICAgeyBjaGlsZHJlbiB9XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgKTtcclxuXHJcbn1cclxuXHJcbk1vZHVsZVNlY3Rpb24uZGVmYXVsdFByb3BzID0ge1xyXG4gICAgYmV0d2VlbjogZmFsc2UsXHJcbiAgICBjYXJkOiBmYWxzZSxcclxuICAgIGNvbnRlbnQ6IGZhbHNlLFxyXG4gICAgYm94ZWQ6IGZhbHNlLFxyXG59O1xyXG5cclxuTW9kdWxlU2VjdGlvbi5wcm9wVHlwZXMgPSB7XHJcbiAgICBjaGlsZHJlbjogUHJvcFR5cGVzLm5vZGUuaXNSZXF1aXJlZCxcclxuICAgIGJldHdlZW46IFByb3BUeXBlcy5ib29sLFxyXG4gICAgY2FyZDogUHJvcFR5cGVzLmJvb2wsXHJcbiAgICBjb250ZW50OiBQcm9wVHlwZXMuYm9vbCxcclxuICAgIGJveGVkOiBQcm9wVHlwZXMuYm9vbCxcclxufTtcclxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XHJcbmltcG9ydCAnLi4vaW1wb3J0cy9zdGFydHVwL3NlcnZlcic7XHJcbmltcG9ydCAnLi4vaW1wb3J0cy9hcGkvc2VydmVyL3B1YmxpY2F0aW9ucyc7XHJcblxyXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XHJcblxyXG4gICAgaWYgKHByb2Nlc3MuZW52Lk1BSUxfVVJMID09PSB1bmRlZmluZWQgfHwgcHJvY2Vzcy5lbnYuTUFJTF9VUkwubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcHJvY2Vzcy5lbnYuTUFJTF9VUkwgPSAnc210cDovL2xvY2FsaG9zdDoyNSc7XHJcbiAgICB9XHJcblxyXG59KTtcclxuIl19
