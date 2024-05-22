import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Mongo } from 'meteor/mongo';
import { ReadingList } from './readingList';
import { Archive } from './archive';
import { removeWeirdMinusSignsInFrontOfString } from '../lib/utils/utils_string';

export const NewsArticles = new Mongo.Collection('newsArticles');
export const NewsArticlesJoined = new Mongo.Collection('newsArticlesJoined');
export const NewsArticlesInReadingList = new Mongo.Collection('newsArticlesInReadingList');
export const NewsArticlesInArchive = new Mongo.Collection('newsArticlesInArchive');
export const FurtherRecommendedNewsArticles = new Mongo.Collection('furtherRecommendedNewsArticles');


Meteor.methods({
    'newsArticles.bookmark.update'(articleId) {
        check(articleId, String);

        // due to a bug in react-native-meteor and/or minimongo-cache
        // some ids include a minus sign in front of them and we need to strip that first
        // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details
        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);

        const { userId } = this;
        const isInReadingList = ReadingList.find({
            articleId: cleanArticleId,
            userId,
            removedAt: {
                $exists: false,
            },
        }).count() > 0;

        if (isInReadingList) {
            Meteor.call('readingList.article.remove', cleanArticleId);
        } else {
            Meteor.call('readingList.article.add', cleanArticleId);
        }
    },

    'newsArticles.favourite.update'(articleId) {
        check(articleId, String);

        // due to a bug in react-native-meteor and/or minimongo-cache
        // some ids include a minus sign in front of them and we need to strip that first
        // see https://github.com/inProgress-team/react-native-meteor/issues/185 for details
        const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);

        const { userId } = this;
        const isInArchive = Archive.find({
            articleId: cleanArticleId,
            userId,
            removedAt: {
                $exists: false,
            },
        }).count() > 0;

        if (isInArchive) {
            Meteor.call('archive.article.remove', cleanArticleId);
        } else {
            Meteor.call('archive.article.add', cleanArticleId);
        }
    },

    // 'newsArticles.count'(limit = 20) {
    //         return NewsArticlesJoined.find(limit).count()
    // }

});
