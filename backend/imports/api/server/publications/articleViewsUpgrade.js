import { Meteor } from 'meteor/meteor';
import { ArticleViewsUpgrade } from '../../articleViewsUpgrade';

Meteor.publish('articleViewsUpgrade', () => {
    const userId = Meteor.userId();
    if (!userId) {
        return null;
    }
    return ArticleViewsUpgrade.find(
        {
            userId,
        },
    );
});
