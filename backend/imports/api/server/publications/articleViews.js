import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ArticleViews } from '../../articleViews';
import { removeWeirdMinusSignsInFrontOfString } from '../../../lib/utils/utils_string';

Meteor.publish('articleViews', (articleId) => {
    check(articleId, String);
    const userId = Meteor.userId();
    if (!userId) {
        return null;
    }
    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    return ArticleViews.find(
        {
            articleId: cleanArticleId,
            userId,
        },
    );
});
