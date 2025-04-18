import { Meteor } from 'meteor/meteor';
import '../imports/startup/server';
import '../imports/api/server/publications';
import './genesis'
import { RecommendationListsItem } from '../imports/api/recommendationListsItem';

Meteor.startup(() => {

    if (process.env.MAIL_URL === undefined || process.env.MAIL_URL.length === 0) {
        process.env.MAIL_URL = 'smtp://localhost:25';
    }

    RecommendationListsItem.rawCollection().createIndex({ articleId: 1, userId: 1 });
    console.log('RecommendationListsItem index created');

});
