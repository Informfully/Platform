import { Mongo } from 'meteor/mongo';
import {Meteor} from "meteor/meteor";
import {check} from "meteor/check";
import {removeWeirdMinusSignsInFrontOfString} from "../lib/utils/utils_string";
import {NewsArticles} from "./articles";

export const Explanations = new Mongo.Collection('explanations');
const explanationViews = new Mongo.Collection('explanationViews');

Meteor.methods({

    'explanationViews.insert'(articleId) {
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

        return explanationViews.insert({
            articleId: cleanArticleId,
            userId,
            createdAt: new Date(),
        });

    },

});
