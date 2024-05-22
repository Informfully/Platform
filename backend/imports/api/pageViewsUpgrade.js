import {Mongo} from 'meteor/mongo';
import {check} from 'meteor/check';
import {Meteor} from 'meteor/meteor';
import {removeWeirdMinusSignsInFrontOfString} from '../lib/utils/utils_string';

export const PageViewsUpgrade = new Mongo.Collection('pageViewsUpgrade');

Meteor.methods({

    'pageViewsUpgrade.add'(page, previousPage, currentParameters, prevParameters) {
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
            Meteor.call('articleViewsUpgrade.add', currentParametersHardCopy.articleId);
        }

        if (previousPage === 'Article') {
            Meteor.call('articleViewsUpgrade.duration.update', prevParametersHardCopy.articleId);
        }

        // Save in PageViewsUpgrade parameters of current open screen, unless the previous one was an Article screen
        let parameters = currentParametersHardCopy;
        if (previousPage === 'Article') {
            parameters = prevParametersHardCopy;
        }

        return PageViewsUpgrade.update(
            {
                userId,
            },
            {
                $addToSet:{
                    pageCollection:
                    {
                        page,
                        previousPage,
                        parameters,
                        createdAt: new Date(),
                    }
                }
            },
            {
                upsert: true
            }
        );
    },

});
