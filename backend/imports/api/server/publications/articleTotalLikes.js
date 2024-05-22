import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ArticleTotalLikes } from '../../articleLikes';
import { removeWeirdMinusSignsInFrontOfString } from '../../../lib/utils/utils_string';

Meteor.publish('articleTotalLikes', (articleId, experimentId) => {
    check(articleId, String);
    check(experimentId, String);

    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    return ArticleTotalLikes.find(
        {
            articleId: cleanArticleId,
            experimentId,
        },
    );
});
