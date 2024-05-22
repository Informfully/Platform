import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { NewsArticles } from './articles';
import { removeWeirdMinusSignsInFrontOfString } from '../lib/utils/utils_string';

export const ArticleViewsUpgrade = new Mongo.Collection('articleViewsUpgrade');

Meteor.methods({

    'articleViewsUpgrade.create'(articleId) {
        const { userId } = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }
        
        check(articleId, String);

        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
        
        const article = NewsArticles.findOne(cleanArticleId);

        if (!article) {
            throw new Meteor.Error(404, 'Article not found');
        }

        const { dateScraped } = article;

        const existingArticleViews = ArticleViewsUpgrade.findOne({
            userId,
            "articleCollection.articleId": cleanArticleId
        });

        if(!existingArticleViews){
            return ArticleViewsUpgrade.update(
                {
                    userId,
                },
                {
                    $addToSet:{
                        articleCollection:
                            {
                                articleId: cleanArticleId,
                                articlePublishedDate: dateScraped,
                                createdAt: 0,
                                duration: 0,
                                maxScrolledContent: 0,
                                views: 0,
                            }
                    }
                },
                {
                    upsert: true
                }
            );
        }
    },

    'articleViewsUpgrade.add'(articleId) {
        check(articleId, String);

        const { userId } = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }

        const article = NewsArticles.findOne(articleId);

        if (!article) {
            throw new Meteor.Error(404, 'Article not found');
        }

        const now = new Date();
        const existingArticleViews = ArticleViewsUpgrade.findOne({
            userId,
            "articleCollection.articleId": articleId
        });
        const createdAtValue = existingArticleViews.articleCollection.find(item => item.articleId === articleId)?.createdAt;
        const createdAt = createdAtValue == 0 ? now : createdAtValue;

        // no need for reactivity in this operation
        return ArticleViewsUpgrade.update(
            {
                userId,
                "articleCollection.articleId": articleId,
            },
            {
                $set: {
                    "articleCollection.$.updatedAt": now,
                    "articleCollection.$.createdAt": createdAt,
                },
                $inc: { "articleCollection.$.views": 1 },
            },
        );
    },


    'articleViewsUpgrade.duration.update'(articleId) {
        check(articleId, String);

        const { userId } = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }

        const now = new Date();
        const existingArticleViews = ArticleViewsUpgrade.findOne({
            userId,
            "articleCollection.articleId": articleId
        });
        const updateAtValue = existingArticleViews.articleCollection.find(item => item.articleId === articleId)?.updatedAt;

        const durationIncrement = now - updateAtValue;
        return ArticleViewsUpgrade.update(
            {
                userId,
                "articleCollection.articleId": articleId
            }, 
            { $inc: { "articleCollection.$.duration": durationIncrement } }
        );
    },

    'articleViewsUpgrade.maxScrolledContent.update'(articleId, maxScrolledContent) {
        check(articleId, String);

        const { userId } = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }

        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
        return ArticleViewsUpgrade.update(
            {
                userId,
                "articleCollection.articleId": cleanArticleId
            },
            {
                $max: {
                    "articleCollection.$.maxScrolledContent": maxScrolledContent
                }
            }
        );
    },

    'articleViewsUpgrade.leaveAt.update'(articleId, currentOffsetValue) {
        check(articleId, String);

        const { userId } = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }

        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
        return ArticleViewsUpgrade.update(
            {
                userId,
                "articleCollection.articleId": cleanArticleId
            },
            {
                $set:{
                    "articleCollection.leaveAt": currentOffsetValue
                }
            }
        );
    },
    
});