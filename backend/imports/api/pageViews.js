import {Mongo} from 'meteor/mongo';
import {check} from 'meteor/check';
import {Meteor} from 'meteor/meteor';
import {removeWeirdMinusSignsInFrontOfString} from '../lib/utils/utils_string';

export const PageViews = new Mongo.Collection('pageViews');

Meteor.methods({

    'pageViews.add'(page, previousPage, currentParameters, prevParameters) {
        check(page, String);
        check(previousPage, String);
        check(currentParameters, Object);
        check(prevParameters, Object);

        const {userId} = this;

        if (!userId) {
            throw new Meteor.Error(400, 'Permission Denied');
        }

        const currentParametersHardCopy = {...currentParameters};
        if (currentParametersHardCopy.articleId) {
            currentParametersHardCopy.articleId = removeWeirdMinusSignsInFrontOfString(currentParametersHardCopy.articleId);
        }

        const prevParametersHardCopy = {...prevParameters};
        if (prevParametersHardCopy.articleId) {
            prevParametersHardCopy.articleId = removeWeirdMinusSignsInFrontOfString(prevParametersHardCopy.articleId);
        }

        if (page === 'Article') {
            Meteor.call('articleViews.add', currentParametersHardCopy.articleId);
        }

        if (previousPage === 'Article') {
            Meteor.call('articleViews.duration.update', prevParametersHardCopy.articleId);
        }

        // Save in PageViews parameters of current open screen, unless the previous one was an Article screen
        let parameters = currentParametersHardCopy;
        if (previousPage === 'Article') {
            parameters = prevParametersHardCopy;
        }

        return PageViews.insert({
            userId,
            page,
            previousPage,
            parameters,
            createdAt: new Date(),
        });
    },

});
