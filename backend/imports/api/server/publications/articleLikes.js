import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ArticleLikes } from '../../articleLikes';
import { removeWeirdMinusSignsInFrontOfString } from '../../../lib/utils/utils_string';

Meteor.publish('articleLikes', (articleId) => {
    check(articleId, String);
    const userId = Meteor.userId();
    if (!userId) {
        return null;
    }
    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    return ArticleLikes.find(
        {
            articleId: cleanArticleId,
            userId,
            removedAt: { $exists: false },
        },
        {
            sort: { createdAt: -1 },
        }
    );
});
