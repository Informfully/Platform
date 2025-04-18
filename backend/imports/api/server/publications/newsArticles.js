import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { ReadingList } from '../../readingList';
import { NewsArticles } from '../../articles';
import { Archive } from '../../archive';
import { removeWeirdMinusSignsInFrontOfString } from '../../../lib/utils/utils_string';
import { Recommendations } from '../../recommendations';
import Experiments from '../../experiments';
import { userIsInRole } from '../../../lib/utils/utils_account';
import { Explanations } from '../../explanations';
import { RecommendationListsItem } from '../../recommendationListsItem';

Meteor.publish('newsArticle', (articleId) => {
    check(articleId, String);
    return NewsArticles.find(articleId, { sort: { datePublished: -1 } });
});

Meteor.publish('notification', function () {
    let initializing = true;
    const { userId } = this;
    const limit = 10;

    const recommendationCursor = Recommendations.find({ userId }, { sort: { createdAt: -1 }, limit });
    const newsArticleCursor = NewsArticles.find({}, { sort: { datePublished: -1 }, limit });

    const recommendationObserver = recommendationCursor.observeChanges({
        added: (recommendationId) => {
            if (initializing) {
                return false;
            }

            this.added('notification', recommendationId, { date: new Date() });
        },
    });

    if (recommendationCursor.count() === 0) {
        const newsArticleObserver = newsArticleCursor.observeChanges({
            added: (articleId) => {
                if (initializing) {
                    return false;
                }

                this.added('notification', articleId, { date: new Date() });
            },
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
    const { userId } = this;

    let experiment;
    let user = Meteor.user({ fields: { participatesIn: 1 } });
    if (!user) {
        experiment = null;
    } else {
        experiment = Experiments.findOne({ _id: user.participatesIn });
    }
    if (!experiment) {
        user = Meteor.user({ fields: { experiments: 1 } });
        if (!user || !userIsInRole('admin')) {
            experiment = null;
        } else {
            const ownedExperiments = user.experiments.map(experiment => experiment.experiment);
            experiment = Experiments.findOne({ _id: { $in: ownedExperiments } });
        }
    }
    if (!experiment) {
        experiment = {};
    }

    let { explanationTagsDef, maxNrExplanationTags } = experiment;
    if (explanationTagsDef === undefined) {
        explanationTagsDef = {};
    }
    if (maxNrExplanationTags === undefined) {
        maxNrExplanationTags = 0;
    }

    const recommendations = Recommendations.find({ userId }, { sort: { prediction: -1 }, limit }).fetch();

    if (recommendations && recommendations.length > 0) {
        for (let i = 0; i < recommendations.length; i++) {
            const { articleId, prediction } = recommendations[i];
            const article = NewsArticles.findOne({ _id: articleId });

            if (!article) {
                continue;
            }

            const explanationTags = Explanations.findOne({
                articleId: article._id,
                userId,
            }) || {};
            let { explanationTagsId } = explanationTags;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

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
                removedAt: { $exists: false },
            });

            const isInArchive = Archive.findOne({
                articleId: article._id,
                userId,
                removedAt: { $exists: false },
            });

            this.added('newsArticlesJoined', article._id, {
                ...article,
                explanationArticle,
                isInReadingList: !!isInReadingList,
                isInArchive: !!isInArchive,
                prediction,
            });
        }
    } else {
        const newsArticles = NewsArticles.find({}, { sort: { datePublished: -1 }, limit }).fetch();
        for (let i = 0; i < newsArticles.length; i++) {
            const article = newsArticles[i];

            const explanationTags = Explanations.findOne({
                articleId: article._id,
                userId,
            }) || {};
            let { explanationTagsId } = explanationTags;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

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
                removedAt: { $exists: false },
            });

            const isInArchive = Archive.findOne({
                articleId: article._id,
                userId,
                removedAt: { $exists: false },
            });

            this.added('newsArticlesJoined', article._id, {
                ...article,
                explanationArticle,
                isInReadingList: !!isInReadingList,
                isInArchive: !!isInArchive,
            });

        }
    }

    const explanationsObserver = Explanations.find({ userId }).observe({

        added: (document) => {
            if (initializing) {
                return false;
            }

            let { explanationTagsId } = document;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

            for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                key = explanationTagsId[i];
                tag = explanationTagsDef[key];
                if (tag) {
                    explanationArticle.push(tag);
                }
            }

            this.changed('newsArticlesJoined', document.articleId, { explanationArticle });
        },

        changed: (document) => {
            let { explanationTagsId } = document;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

            for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                key = explanationTagsId[i];
                tag = explanationTagsDef[key];
                if (tag) {
                    explanationArticle.push(tag);
                }
            }

            const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
            this.changed('newsArticlesJoined', articleId, { explanationArticle });
        },

        removed: (fields) => {
            if (initializing) {
                return false;
            }

            const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
            this.changed('newsArticlesJoined', articleId, { explanationArticle: [] });
        },
    });

    const readingListObserver = ReadingList.find({ userId }).observe({

        /**
         * Whenever a document is added to {@link ReadingList}, we update the document in
         * this publication and set isInReadingList to true.
         *
         * @param document
         *          the document that was added
         * @returns {boolean}
         */
        added: (document) => {
            // Before observe returns, added (or addedAt) will be called zero or more times to deliver
            // the initial results of the query. We prevent this by returning false if we are still
            // initializing. Notice that we set initializing to false after completing the first set.
            if (initializing) {
                return false;
            }

            // The following piece of code had to be inserted only due to a Meteor problem.
            // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
            //
            // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
            // document has to be changed. This is normal, as the id of the document is not yet in the
            // collection. To avoid the warning, we need to make sure that the document is added to the
            // collection, before any changes to it can be made. That is why we use this.added. If the
            // document already exists in the collection, this.added will do nothing.

            const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
            const article = NewsArticles.findOne({ _id: articleId });
            const recommendation = Recommendations.findOne({ articleId });

            const explanationTags = Explanations.findOne({ articleId: article._id, userId }) || {};
            let { explanationTagsId } = explanationTags;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

            for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                key = explanationTagsId[i];
                tag = explanationTagsDef[key];
                if (tag) {
                    explanationArticle.push(tag);
                }
            }

            const isInReadingList = ReadingList.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });
            const isInArchive = Archive.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });

            if (recommendation) {
                this.added('newsArticlesJoined', article._id,
                    {
                        ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive, prediction: recommendation.prediction,
                    });
            } else {
                this.added('newsArticlesJoined', article._id,
                    {
                        ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive,
                    });
            }

            this.changed('newsArticlesJoined', article._id, { isInReadingList: true });
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
        changed: (document) => {
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
                const article = NewsArticles.findOne({ _id: articleId });
                const recommendation = Recommendations.findOne({ articleId });

                const explanationTags = Explanations.findOne({ articleId: article._id, userId }) || {};
                let { explanationTagsId } = explanationTags;
                if (explanationTagsId === undefined) {
                    explanationTagsId = [];
                }

                const explanationArticle = [];
                let key; let
                    tag;

                for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                    key = explanationTagsId[i];
                    tag = explanationTagsDef[key];
                    if (tag) {
                        explanationArticle.push(tag);
                    }
                }

                const isInReadingList = ReadingList.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });
                const isInArchive = Archive.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });

                if (recommendation) {
                    this.added('newsArticlesJoined', article._id,
                        {
                            ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive, prediction: recommendation.prediction,
                        });
                } else {
                    this.added('newsArticlesJoined', article._id,
                        {
                            ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive,
                        });
                }

                this.changed('newsArticlesJoined', article._id, { isInReadingList: false });
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
        removed: (fields) => {
            if (initializing) {
                return false;
            }

            // The following piece of code had to be inserted only due to a Meteor problem.
            // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
            //
            // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
            // document has to be changed. This is normal, as the id of the document is not yet in the
            // collection. To avoid the warning, we need to make sure that the document is added to the
            // collection, before any changes to it can be made. That is why we use this.added. If the
            // document already exists in the collection, this.added will do nothing.

            const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
            const article = NewsArticles.findOne({ _id: articleId });
            const recommendation = Recommendations.findOne({ articleId });

            const explanationTags = Explanations.findOne({ articleId: article._id, userId }) || {};
            let { explanationTagsId } = explanationTags;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

            for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                key = explanationTagsId[i];
                tag = explanationTagsDef[key];
                if (tag) {
                    explanationArticle.push(tag);
                }
            }

            const isInReadingList = ReadingList.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });
            const isInArchive = Archive.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });

            if (recommendation) {
                this.added('newsArticlesJoined', article._id,
                    {
                        ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive, prediction: recommendation.prediction,
                    });
            } else {
                this.added('newsArticlesJoined', article._id,
                    {
                        ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive,
                    });
            }

            this.changed('newsArticlesJoined', article._id, { isInReadingList: false });
        },
    });

    const archiveObserver = Archive.find({ userId }).observe({

        /**
         * Whenever a document is added to {@link Archive}, we update the document in
         * this publication and set isInArchive to true.
         *
         * @param document
         *          the document that was added
         * @returns {boolean}
         */
        added: (document) => {
            // Before observe returns, added (or addedAt) will be called zero or more times to deliver
            // the initial results of the query. We prevent this by returning false if we are still
            // initializing. Notice that we set initializing to false after completing the first set.
            if (initializing) {
                return false;
            }

            // The following piece of code had to be inserted only due to a Meteor problem.
            // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
            //
            // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
            // document has to be changed. This is normal, as the id of the document is not yet in the
            // collection. To avoid the warning, we need to make sure that the document is added to the
            // collection, before any changes to it can be made. That is why we use this.added. If the
            // document already exists in the collection, this.added will do nothing.

            const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
            const article = NewsArticles.findOne({ _id: articleId });
            const recommendation = Recommendations.findOne({ articleId });

            const explanationTags = Explanations.findOne({ articleId: article._id, userId }) || {};
            let { explanationTagsId } = explanationTags;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

            for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                key = explanationTagsId[i];
                tag = explanationTagsDef[key];
                if (tag) {
                    explanationArticle.push(tag);
                }
            }

            const isInReadingList = ReadingList.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });
            const isInArchive = Archive.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });

            if (recommendation) {
                this.added('newsArticlesJoined', article._id,
                    {
                        ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive, prediction: recommendation.prediction,
                    });
            } else {
                this.added('newsArticlesJoined', article._id,
                    {
                        ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive,
                    });
            }

            this.changed('newsArticlesJoined', article._id, { isInArchive: true });
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
        changed: (document) => {
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
                const article = NewsArticles.findOne({ _id: articleId });
                const recommendation = Recommendations.findOne({ articleId });

                const explanationTags = Explanations.findOne({ articleId: article._id, userId }) || {};
                let { explanationTagsId } = explanationTags;
                if (explanationTagsId === undefined) {
                    explanationTagsId = [];
                }

                const explanationArticle = [];
                let key; let
                    tag;

                for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                    key = explanationTagsId[i];
                    tag = explanationTagsDef[key];
                    if (tag) {
                        explanationArticle.push(tag);
                    }
                }

                const isInReadingList = ReadingList.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });
                const isInArchive = Archive.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });

                if (recommendation) {
                    this.added('newsArticlesJoined', article._id,
                        {
                            ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive, prediction: recommendation.prediction,
                        });
                } else {
                    this.added('newsArticlesJoined', article._id,
                        {
                            ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive,
                        });
                }

                this.changed('newsArticlesJoined', article._id, { isInArchive: false });
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
        removed: (fields) => {
            if (initializing) {
                return false;
            }

            // The following piece of code had to be inserted only due to a Meteor problem.
            // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
            //
            // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
            // document has to be changed. This is normal, as the id of the document is not yet in the
            // collection. To avoid the warning, we need to make sure that the document is added to the
            // collection, before any changes to it can be made. That is why we use this.added. If the
            // document already exists in the collection, this.added will do nothing.

            const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
            const article = NewsArticles.findOne({ _id: articleId });
            const recommendation = Recommendations.findOne({ articleId });

            const explanationTags = Explanations.findOne({ articleId: article._id, userId }) || {};
            let { explanationTagsId } = explanationTags;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

            for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                key = explanationTagsId[i];
                tag = explanationTagsDef[key];
                if (tag) {
                    explanationArticle.push(tag);
                }
            }

            const isInReadingList = ReadingList.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });
            const isInArchive = Archive.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });

            if (recommendation) {
                this.added('newsArticlesJoined', article._id,
                    {
                        ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive, prediction: recommendation.prediction,
                    });
            } else {
                this.added('newsArticlesJoined', article._id,
                    {
                        ...article, explanationArticle, isInReadingList: !!isInReadingList, isInArchive: !!isInArchive,
                    });
            }

            this.changed('newsArticlesJoined', article._id, { isInArchive: false });
        },
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
    const { userId } = this;

    let experiment;
    let user = Meteor.user({ fields: { participatesIn: 1 } });
    if (!user) {
        experiment = null;
    } else {
        experiment = Experiments.findOne({ _id: user.participatesIn });
    }
    if (!experiment) {
        user = Meteor.user({ fields: { experiments: 1 } });
        if (!user || !userIsInRole('admin')) {
            experiment = null;
        } else {
            const ownedExperiments = user.experiments.map(experiment => experiment.experiment);
            experiment = Experiments.findOne({ _id: { $in: ownedExperiments } });
        }
    }
    if (!experiment) {
        experiment = {};
    }

    let { explanationTagsDef, maxNrExplanationTags } = experiment;
    if (explanationTagsDef === undefined) {
        explanationTagsDef = {};
    }
    if (maxNrExplanationTags === undefined) {
        maxNrExplanationTags = 0;
    }

    const newsArticlesInReadingList = ReadingList.find({ userId, removedAt: { $exists: false } }).fetch();
    const newsArticleIds = newsArticlesInReadingList.map(({ articleId }) => articleId);
    const newsArticles = NewsArticles.find({ _id: { $in: newsArticleIds } }).fetch();

    for (let i = 0; i < newsArticles.length; i++) {
        const article = newsArticles[i];

        const explanationTags = Explanations.findOne({
            articleId: article._id,
            userId,
        }) || {};
        let { explanationTagsId } = explanationTags;
        if (explanationTagsId === undefined) {
            explanationTagsId = [];
        }

        const explanationArticle = [];
        let key; let
            tag;

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
            removedAt: { $exists: false },
        });

        this.added('newsArticlesInReadingList', article._id, {
            ...article,
            explanationArticle,
            isInReadingList: true,
            isInArchive: !!isInArchive,
        });
    }

    const explanationsObserver = Explanations.find({ userId }).observe({

        added: (document) => {
            if (initializing) {
                return false;
            }

            let { explanationTagsId } = document;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

            for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                key = explanationTagsId[i];
                tag = explanationTagsDef[key];
                if (tag) {
                    explanationArticle.push(tag);
                }
            }

            this.changed('newsArticlesInReadingList', document.articleId, { explanationArticle });
        },

        changed: (document) => {
            let { explanationTagsId } = document;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

            for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                key = explanationTagsId[i];
                tag = explanationTagsDef[key];
                if (tag) {
                    explanationArticle.push(tag);
                }
            }

            const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
            this.changed('newsArticlesInReadingList', articleId, { explanationArticle });
        },

        removed: (fields) => {
            if (initializing) {
                return false;
            }

            const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
            this.changed('newsArticlesInReadingList', articleId, { explanationArticle: [] });
        },
    });

    const readingListObserver = ReadingList.find({ userId }).observe({

        /**
         * Whenever a document is added to {@link ReadingList}, we add the document in this
         * publication too
         *
         * @param document
         *          the document that was added
         * @returns {boolean}
         */
        added: (document) => {
            if (initializing) {
                return false;
            }

            const article = NewsArticles.findOne(document.articleId);

            const isInArchive = Archive.findOne({
                articleId: article._id,
                userId,
                removedAt: { $exists: false },
            });

            if (article) {
                this.added('newsArticlesInReadingList', article._id, {
                    ...article,
                    isInReadingList: true,
                    isInArchive: !!isInArchive,
                });
            }
        },

        changed: (document) => {
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
        removed: (fields) => {
            if (initializing) {
                return false;
            }
            const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
            this.removed('newsArticlesInReadingList', articleId);
        },
    });

    const archiveObserver = Archive.find({ userId }).observe({

        /**
         * Whenever a document is added to {@link Archive}, we update the document in
         * this publication and set isInArchive to true.
         *
         * @param document
         *          the document that was added
         * @returns {boolean}
         */
        added: (document) => {
            if (initializing) {
                return false;
            }

            const article = ReadingList.findOne({
                articleId: document.articleId,
                userId,
                removedAt: { $exists: false },
            });

            if (article) {
                const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
                this.changed('newsArticlesInReadingList', articleId, { isInArchive: true });
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
        changed: (document) => {
            const article = ReadingList.findOne({
                articleId: document.articleId,
                userId,
                removedAt: { $exists: false },
            });

            if (document.removedAt) {
                if (article) {
                    const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
                    this.changed('newsArticlesInReadingList', articleId, { isInArchive: false });
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
        removed: (fields) => {
            if (initializing) {
                return false;
            }

            const article = ReadingList.findOne({
                articleId: document.articleId,
                userId,
                removedAt: { $exists: false },
            });

            if (article) {
                const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
                this.changed('newsArticlesInReadingList', articleId, { isInArchive: false });
            }
        },
    });

    const newsArticlesObserver = NewsArticles.find().observe({

        /**
         * If an article is removed from {@link NewsArticles}, we simply remove it from this publication as well.
         *
         * @param document
         *          the document that was removed
         */
        removed: (document) => {
            const documentId = removeWeirdMinusSignsInFrontOfString(document._id);
            this.removed('newsArticlesInReadingList', documentId);
        },

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
    const { userId } = this;

    let experiment;
    let user = Meteor.user({ fields: { participatesIn: 1 } });
    if (!user) {
        experiment = null;
    } else {
        experiment = Experiments.findOne({ _id: user.participatesIn });
    }
    if (!experiment) {
        user = Meteor.user({ fields: { experiments: 1 } });
        if (!user || !userIsInRole('admin')) {
            experiment = null;
        } else {
            const ownedExperiments = user.experiments.map(experiment => experiment.experiment);
            experiment = Experiments.findOne({ _id: { $in: ownedExperiments } });
        }
    }
    if (!experiment) {
        experiment = {};
    }

    let { explanationTagsDef, maxNrExplanationTags } = experiment;
    if (explanationTagsDef === undefined) {
        explanationTagsDef = {};
    }
    if (maxNrExplanationTags === undefined) {
        maxNrExplanationTags = 0;
    }

    const newsArticlesInArchive = Archive.find({ userId, removedAt: { $exists: false } }).fetch();
    const newsArticleIds = newsArticlesInArchive.map(({ articleId }) => articleId);
    const newsArticles = NewsArticles.find({ _id: { $in: newsArticleIds } }).fetch();

    for (let i = 0; i < newsArticles.length; i++) {
        const article = newsArticles[i];

        const explanationTags = Explanations.findOne({
            articleId: article._id,
            userId,
        }) || {};
        let { explanationTagsId } = explanationTags;
        if (explanationTagsId === undefined) {
            explanationTagsId = [];
        }

        const explanationArticle = [];
        let key; let
            tag;

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
            removedAt: { $exists: false },
        });

        this.added('newsArticlesInArchive', article._id, {
            ...article,
            explanationArticle,
            isInReadingList: !!isInReadingList,
            isInArchive: true,
        });
    }

    const explanationsObserver = Explanations.find({ userId }).observe({

        added: (document) => {
            if (initializing) {
                return false;
            }

            let { explanationTagsId } = document;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

            for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                key = explanationTagsId[i];
                tag = explanationTagsDef[key];
                if (tag) {
                    explanationArticle.push(tag);
                }
            }

            this.changed('newsArticlesInArchive', document.articleId, { explanationArticle });
        },

        changed: (document) => {
            let { explanationTagsId } = document;
            if (explanationTagsId === undefined) {
                explanationTagsId = [];
            }

            const explanationArticle = [];
            let key; let
                tag;

            for (let i = 0; i < Math.min(explanationTagsId.length, maxNrExplanationTags); i++) {
                key = explanationTagsId[i];
                tag = explanationTagsDef[key];
                if (tag) {
                    explanationArticle.push(tag);
                }
            }

            const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
            this.changed('newsArticlesInArchive', articleId, { explanationArticle });
        },

        removed: (fields) => {
            if (initializing) {
                return false;
            }

            const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
            this.changed('newsArticlesInArchive', articleId, { explanationArticle: [] });
        },
    });

    const archiveObserver = Archive.find({ userId }).observe({

        /**
         * Whenever a document is added to {@link Archive}, we add the document in this
         * publication too
         *
         * @param document
         *          the document that was added
         * @returns {boolean}
         */
        added: (document) => {
            if (initializing) {
                return false;
            }

            const article = NewsArticles.findOne(document.articleId);

            const isInReadingList = ReadingList.findOne({
                articleId: article._id,
                userId,
                removedAt: { $exists: false },
            });

            if (article) {
                this.added('newsArticlesInArchive', article._id, {
                    ...article,
                    isInReadingList: !!isInReadingList,
                    isInArchive: true,
                });
            }
        },

        changed: (document) => {
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
        removed: (fields) => {
            if (initializing) {
                return false;
            }

            const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
            this.removed('newsArticlesInArchive', articleId);
        },
    });

    const readingListObserver = ReadingList.find({ userId }).observe({

        /**
         * Whenever a document is added to {@link ReadingList}, we update the document in
         * this publication and set isInReadingList to true.
         *
         * @param document
         *          the document that was added
         * @returns {boolean}
         */
        added: (document) => {
            if (initializing) {
                return false;
            }

            const article = Archive.findOne({
                articleId: document.articleId,
                userId,
                removedAt: { $exists: false },
            });

            if (article) {
                const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
                this.changed('newsArticlesInArchive', articleId, { isInReadingList: true });
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
        changed: (document) => {
            const article = Archive.findOne({
                articleId: document.articleId,
                userId,
                removedAt: { $exists: false },
            });

            if (document.removedAt) {
                if (article) {
                    const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
                    this.changed('newsArticlesInArchive', articleId, { isInReadingList: false });
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
        removed: (fields) => {
            if (initializing) {
                return false;
            }

            const article = Archive.findOne({
                articleId: fields.articleId,
                userId,
                removedAt: { $exists: false },
            });

            if (article) {
                const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
                this.changed('newsArticlesInArchive', articleId, { isInReadingList: false });
            }
        },
    });

    const newsArticlesObserver = NewsArticles.find().observe({

        /**
         * If an article is removed from {@link NewsArticles}, we simply remove it from this publication as well.
         *
         * @param document
         *          the document that was removed
         */
        removed: (document) => {
            const documentId = removeWeirdMinusSignsInFrontOfString(document._id);
            this.removed('newsArticlesInArchive', documentId);
        },

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

    /**
     * This function is used to select a limited number of entries based on their probability of being selected, 
     * @param {*} entries 
     * @param {*} limit 
     * @returns the limited number of entries
     */
    function weightedSample(entries, limit) {
        var totalWeight = entries.reduce((sum, item) => sum + (item.selectionProbability || 1), 0);
        var results = [];
  
        while (results.length < limit && entries.length > 0) {
            let r = Math.random() * totalWeight;
            let i = 0;
  
            for (; i < entries.length; i++) {
                const weight = entries[i].selectionProbability || 1;
                if (r < weight) break;
                r -= weight;
            }
  
            if (entries[i]) {
                results.push(entries[i]);
                totalWeight -= entries[i].selectionProbability || 1;
                entries.splice(i, 1);
            }
        }  
        return results;
    }

    check(limit, Number);
    check(primaryCategory, String);
    check(articleId, String);

    let initializing = true;
    const { userId } = this;

    const cleanId = removeWeirdMinusSignsInFrontOfString(articleId);

    /**
     * Allow for featured recommendations below items to be dynamic.
     * Enables recommending user-specific follow-up items.
     * E.g., for content-based recommendations of similar items as the one currently open.
     * The feature is optional and fully backwards compatible.
     * If there is no entry in the recommendaitonListsItems colleciton, the default content is loaded.
     * (By default, articles of the same topic are displayed it the feature is enabled for an experiment.)
     */
    
    // Get list of specific recommendations for an item (can be for a specific user or generic recommendation)
    const recListItem = RecommendationListsItem.find({
        articleId: cleanId,
        $or: [
          { userId: userId }, // for a specific user
          { userId: "" }      // generic, for all users
        ]
      }).fetch();

    // Select a subset of the entries limited to a certain amount, based on the probability of being selected
    const selectedEntries = weightedSample(recListItem, limit);

    if (selectedEntries.length > 0) {
        for (const entry of selectedEntries) {
            const article = NewsArticles.findOne({ _id: entry.relatedArticleId });

            if (!article) continue;

            const isInReadingList = ReadingList.findOne({
                articleId: article._id,
                userId,
                removedAt: { $exists: false },
            });

            const isInArchive = Archive.findOne({
                articleId: article._id,
                userId,
                removedAt: { $exists: false },
            });

            this.added('furtherRecommendedNewsArticles', article._id, {
                ...article,
                explanationArticle: [],
                isInReadingList: !!isInReadingList,
                isInArchive: !!isInArchive,
                prediction: entry.selectionProbability,
            });
        }
    } else {

        const recommendations = Recommendations.find({ userId, primaryCategory, articleId: { $ne: cleanId } }, { sort: { prediction: -1 }, limit }).fetch();

        if (recommendations && recommendations.length > 0) {
            for (let i = 0; i < recommendations.length; i++) {
                const { articleId, prediction } = recommendations[i];
                const article = NewsArticles.findOne({ _id: articleId });

                if (!article) {
                    continue;
                }

                const isInReadingList = ReadingList.findOne({
                    articleId: article._id,
                    userId,
                    removedAt: { $exists: false },
                });

                const isInArchive = Archive.findOne({
                    articleId: article._id,
                    userId,
                    removedAt: { $exists: false },
                });

                console.log('before adding article', article._id)

                this.added('furtherRecommendedNewsArticles', article._id, {
                    ...article,
                    explanationArticle: [],
                    isInReadingList: !!isInReadingList,
                    isInArchive: !!isInArchive,
                    prediction,
                });
            }
        } else {

            const newsArticles = NewsArticles.find({ primaryCategory, _id: { $ne: cleanId } }, { sort: { datePublished: -1 }, limit }).fetch();
            for (let i = 0; i < newsArticles.length; i++) {
                const article = newsArticles[i];
    
                const isInReadingList = ReadingList.findOne({
                    articleId: article._id,
                    userId,
                    removedAt: { $exists: false },
                });
    
                const isInArchive = Archive.findOne({
                    articleId: article._id,
                    userId,
                    removedAt: { $exists: false },
                });
    
                this.added('furtherRecommendedNewsArticles', article._id, {
                    ...article,
                    explanationArticle: [],
                    isInReadingList: !!isInReadingList,
                    isInArchive: !!isInArchive,
                });
            }                
        }
    }
        

    const readingListObserver = ReadingList.find({ userId }).observe({

        added: (document) => {
            if (initializing) {
                return false;
            }

            // The following piece of code had to be inserted only due to a Meteor problem.
            // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
            //
            // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
            // document has to be changed. This is normal, as the id of the document is not yet in the
            // collection. To avoid the warning, we need to make sure that the document is added to the
            // collection, before any changes to it can be made. That is why we use this.added. If the
            // document already exists in the collection, this.added will do nothing.

            const articleId = removeWeirdMinusSignsInFrontOfString(document.articleId);
            const article = NewsArticles.findOne({ _id: articleId });
            const recommendation = Recommendations.findOne({ articleId });
            const isInReadingList = ReadingList.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });
            const isInArchive = Archive.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });

            if (recommendation) {
                this.added('furtherRecommendedNewsArticles', article._id,
                    {
                        ...article, explanationArticle: [], isInReadingList: !!isInReadingList, isInArchive: !!isInArchive, prediction: recommendation.prediction,
                    });
            } else {
                this.added('furtherRecommendedNewsArticles', article._id,
                    {
                        ...article, explanationArticle: [], isInReadingList: !!isInReadingList, isInArchive: !!isInArchive,
                    });
            }

            this.changed('furtherRecommendedNewsArticles', article._id, { isInReadingList: true });
        },

        changed: (document) => {
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
                const article = NewsArticles.findOne({ _id: articleId });
                const recommendation = Recommendations.findOne({ articleId });
                const isInReadingList = ReadingList.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });
                const isInArchive = Archive.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });

                if (recommendation) {
                    this.added('furtherRecommendedNewsArticles', article._id,
                        {
                            ...article, explanationArticle: [], isInReadingList: !!isInReadingList, isInArchive: !!isInArchive, prediction: recommendation.prediction,
                        });
                } else {
                    this.added('furtherRecommendedNewsArticles', article._id,
                        {
                            ...article, explanationArticle: [], isInReadingList: !!isInReadingList, isInArchive: !!isInArchive,
                        });
                }

                this.changed('furtherRecommendedNewsArticles', article._id, { isInReadingList: false });
            }
        },

        removed: (fields) => {
            if (initializing) {
                return false;
            }

            // The following piece of code had to be inserted only due to a Meteor problem.
            // WARNING: IT IS DUPLICATED AT DIFFERENT PLACES IN newsArticles.js.
            //
            // this.changed generates a Meteor warning, if a document is not yet in the collection, however we say the
            // document has to be changed. This is normal, as the id of the document is not yet in the
            // collection. To avoid the warning, we need to make sure that the document is added to the
            // collection, before any changes to it can be made. That is why we use this.added. If the
            // document already exists in the collection, this.added will do nothing.

            const articleId = removeWeirdMinusSignsInFrontOfString(fields.articleId);
            const article = NewsArticles.findOne({ _id: articleId });
            const recommendation = Recommendations.findOne({ articleId });
            const isInReadingList = ReadingList.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });
            const isInArchive = Archive.findOne({ articleId: article._id, userId, removedAt: { $exists: false } });

            if (recommendation) {
                this.added('furtherRecommendedNewsArticles', article._id,
                    {
                        ...article, explanationArticle: [], isInReadingList: !!isInReadingList, isInArchive: !!isInArchive, prediction: recommendation.prediction,
                    });
            } else {
                this.added('furtherRecommendedNewsArticles', article._id,
                    {
                        ...article, explanationArticle: [], isInReadingList: !!isInReadingList, isInArchive: !!isInArchive,
                    });
            }

            this.changed('furtherRecommendedNewsArticles', article._id, { isInReadingList: false });
        },
    });

    // If at some point the article Preview component has to be extended by showing the star symbol, similar to the
    // bookmark symbol currently, then an archiveListObserver will have to be added (similar to the
    // readingListObserver above).

    this.ready();
    initializing = false;

    this.onStop(() => {
        readingListObserver.stop();
    });
});
