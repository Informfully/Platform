import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { NewsArticles } from './articles';
import { removeWeirdMinusSignsInFrontOfString } from '../lib/utils/utils_string';

export const ArticleLikes = new Mongo.Collection('articleLikes');
export const ArticleTotalLikes = new Mongo.Collection('articleTotalLikes');

Meteor.methods({

    'articleLikes.insert'(articleId, articleQuestionId, experimentId) {
        check(articleId, String);
        check(articleQuestionId, String);
        check(experimentId, String);

        const userId = Meteor.userId();
        if (!userId) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        // due to a bug in react-native-meteor and/or minimongo-cache
        // some ids include a minus sign in front of them and we need to strip that first
        // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details
        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
        const article = NewsArticles.findOne(cleanArticleId);

        if (!article) {
            throw new Meteor.Error(404, 'Article not found');
        }

        const articleTotalLikesDislikes = ArticleTotalLikes.findOne({
            articleId: cleanArticleId,
            experimentId,
        });
        let questionsArray;
        if (!articleTotalLikesDislikes) {
            ArticleTotalLikes.insert({
                articleId: cleanArticleId,
                experimentId,
                counts: [],
                questions: [],
            });
            questionsArray = [];
        } else {
            questionsArray = articleTotalLikesDislikes.questions;
        }

        if (questionsArray.includes(articleQuestionId)) {
            ArticleTotalLikes.update({
                articleId: cleanArticleId,
                experimentId,
                'counts.articleQuestionId': articleQuestionId,
            }, { $inc: { 'counts.$.countLikes': 1 } });
        } else {
            ArticleTotalLikes.update({
                articleId: cleanArticleId,
                experimentId,
            }, {
                $push: {
                    counts: {
                        articleQuestionId,
                        countLikes: 1,
                        countDislikes: 0,
                    },
                    questions: articleQuestionId,
                },
            });
        }

        return ArticleLikes.insert({
            articleId: cleanArticleId,
            userId,
            articleQuestionId,
            articleAnswer: 1,
            createdAt: new Date(),
        });

    },

    'articleLikes.remove'(articleId, articleQuestionId, experimentId) {
        check(articleId, String);
        check(articleQuestionId, String);
        check(experimentId, String);

        const userId = Meteor.userId();
        if (!userId) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        // due to a bug in react-native-meteor and/or minimongo-cache
        // some ids include a minus sign in front of them and we need to strip that first
        // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details
        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);

        ArticleTotalLikes.update({
            articleId: cleanArticleId,
            experimentId,
            'counts.articleQuestionId': articleQuestionId,
        }, { $inc: { 'counts.$.countLikes': -1 } });

        const articleLike = ArticleLikes.findOne({
            articleId: cleanArticleId, userId, articleQuestionId, articleAnswer: 1,
        },
        { sort: { createdAt: -1 } });
        return ArticleLikes.update(articleLike, { $set: { removedAt: new Date() } });
    },

    'articleDislikes.insert'(articleId, articleQuestionId, experimentId) {
        check(articleId, String);
        check(articleQuestionId, String);
        check(experimentId, String);

        const userId = Meteor.userId();
        if (!userId) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        // due to a bug in react-native-meteor and/or minimongo-cache
        // some ids include a minus sign in front of them and we need to strip that first
        // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details
        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
        const article = NewsArticles.findOne(cleanArticleId);

        if (!article) {
            throw new Meteor.Error(404, 'Article not found');
        }

        const articleTotalLikesDislikes = ArticleTotalLikes.findOne({
            articleId: cleanArticleId,
            experimentId,
        });
        let questionsArray;
        if (!articleTotalLikesDislikes) {
            ArticleTotalLikes.insert({
                articleId: cleanArticleId,
                experimentId,
                counts: [],
                questions: [],
            });
            questionsArray = [];
        } else {
            questionsArray = articleTotalLikesDislikes.questions;
        }

        if (questionsArray.includes(articleQuestionId)) {
            ArticleTotalLikes.update({
                articleId: cleanArticleId,
                experimentId,
                'counts.articleQuestionId': articleQuestionId,
            }, { $inc: { 'counts.$.countDislikes': 1 } });
        } else {
            ArticleTotalLikes.update({
                articleId: cleanArticleId,
                experimentId,
            }, {
                $push: {
                    counts: {
                        articleQuestionId,
                        countLikes: 0,
                        countDislikes: 1,
                    },
                    questions: articleQuestionId,
                },
            });
        }

        return ArticleLikes.insert({
            articleId: cleanArticleId,
            userId,
            articleQuestionId,
            articleAnswer: -1,
            createdAt: new Date(),
        });

    },

    'articleDislikes.remove'(articleId, articleQuestionId, experimentId) {
        check(articleId, String);
        check(articleQuestionId, String);
        check(experimentId, String);

        const userId = Meteor.userId();
        if (!userId) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        // due to a bug in react-native-meteor and/or minimongo-cache
        // some ids include a minus sign in front of them and we need to strip that first
        // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details
        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);

        ArticleTotalLikes.update({
            articleId: cleanArticleId,
            experimentId,
            'counts.articleQuestionId': articleQuestionId,
        }, { $inc: { 'counts.$.countDislikes': -1 } });

        const articleDislike = ArticleLikes.findOne({
            articleId: cleanArticleId, userId, articleQuestionId, articleAnswer: -1,
        },
        { sort: { createdAt: -1 } });
        return ArticleLikes.update(articleDislike, { $set: { removedAt: new Date() } });
    },

});
