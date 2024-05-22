import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Mongo } from 'meteor/mongo';
import { removeWeirdMinusSignsInFrontOfString } from '../lib/utils/utils_string';
import { NewsArticles } from './articles';

export const ReadingList = new Mongo.Collection('readingList');

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
        }

        // due to a bug in react-native-meteor and/or minimongo-cache
        // some ids include a minus sign in front of them and we need to strip that first
        // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details
        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
        const article = NewsArticles.findOne(cleanArticleId);

        if (!article) {
            throw new Meteor.Error(404, 'Article not found');
        }

        const { dateScraped } = article;

        return ReadingList.insert({
            articleId: cleanArticleId,
            userId,
            createdAt: new Date(),
            articlePublishedDate: dateScraped,
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
        }

        // due to a bug in react-native-meteor and/or minimongo-cache
        // some ids include a minus sign in front of them and we need to strip that first
        // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details
        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
        return ReadingList.update({
            articleId: cleanArticleId,
            userId,
            removedAt: {
                $exists: false,
            },
        }, {
            $set: {
                removedAt: new Date(),
            },
        }, {
            multi: true,
        });
    },

});
