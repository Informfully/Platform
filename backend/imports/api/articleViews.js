import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { NewsArticles } from './articles';
import { removeWeirdMinusSignsInFrontOfString } from '../lib/utils/utils_string';

export const ArticleViews = new Mongo.Collection('articleViews');

Meteor.methods({

        // record news articles that shows on the screen but doesn't click
        'articleViews.create'(articleId) {
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
    
            return ArticleViews.update({
                userId,
                articleId: cleanArticleId,
            },
            {
                $setOnInsert:{
                    userId,
                    articleId: cleanArticleId,
                    articlePublishedDate: dateScraped,
                    createdAt: 0,
                    duration: 0,
                    maxScrolledContent: 0,
                    views: 0,
                }
            },
            {
                upsert: true
            }
            )
        },

    'articleViews.add'(articleId) {
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
        const view = ArticleViews.findOne({ userId, articleId });
        const createdAt = view.createdAt == 0 ? now : view.createdAt;

        // no need for reactivity in this operation
        return ArticleViews.update(
            {
                userId,
                articleId,
            },
            {
                $set: {
                    updatedAt: now,
                    createdAt: createdAt,
                },
                $inc: { views: 1 },
            },
        );
    },

    'articleViews.duration.update'(articleId) {
        check(articleId, String);

        const { userId } = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }

        const now = new Date();
        const view = ArticleViews.findOne({ userId, articleId });
        const durationIncrement = now - view.updatedAt;
        return ArticleViews.update(view, { $inc: { duration: durationIncrement } });
    },

    'articleViews.maxScrolledContent.update'(articleId, maxScrolledContent) {
        check(articleId, String);

        const { userId } = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }

        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
        return ArticleViews.update({ userId, articleId: cleanArticleId }, { $max: { maxScrolledContent } });
    },

    'articleViews.leaveAt.update'(articleId, currentOffsetValue) {
        check(articleId, String);

        const { userId } = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }

        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
        return ArticleViews.update({ userId, articleId: cleanArticleId }, { $set: { currentOffsetValue } });
    },

});
