import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { NewsArticles } from './articles';
import { removeWeirdMinusSignsInFrontOfString } from '../lib/utils/utils_string';

export const PodcastAnalytics = new Mongo.Collection('podcastAnalytics');

Meteor.methods({

    'podcastAnalytics.insert'(articleId, action, podcastTimestamp) {
        check(articleId, String);
        check(action, String);
        check(podcastTimestamp, Number);

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

        return PodcastAnalytics.insert({
            articleId: cleanArticleId,
            userId,
            action,
            podcastTimestamp,
            createdAt: new Date(),
        });

    },

});
