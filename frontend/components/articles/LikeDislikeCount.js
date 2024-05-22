/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import {
    StyleSheet,
    View,
    Text,
} from 'react-native';
import PropTypes from 'prop-types';
import Meteor, { withTracker } from '@meteorrn/core';
import { newsArticlesStyleGenerator, withColor } from '../../styles';
import { collectionManager } from '../../lib/utils/collectionManager';
import { removeWeirdMinusSignsInFrontOfString } from '../../lib/utils/utils';

class LikeDislikeCount extends React.Component {

    render() {
        const { countLikes, countDislikes } = this.props;

        return (
            <View style={styles().container}>
                <View style={styles().countContainer}>
                    <Text style={[ newsArticlesStyleGenerator().date, { marginTop: 0 }]}>
                        {countLikes}
                    </Text>
                </View>

                <View style={styles().countContainer}>
                    <Text style={[ newsArticlesStyleGenerator().date, { marginTop: 0 }]}>
                        {countDislikes}
                    </Text>
                </View>
            </View>
        );
    }

}

LikeDislikeCount.propTypes = {
    countLikes: PropTypes.number.isRequired,
    countDislikes: PropTypes.number.isRequired,
};

export default withTracker((params) => {
    let { experimentId, articleId, articleQuestionId } = params;
    articleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const articleTotalLikesSubscription = Meteor.subscribe('articleTotalLikes', articleId, experimentId);

    const isLoading = !articleTotalLikesSubscription.ready();

    const articleTotalLikes = collectionManager.collection('articleTotalLikes').findOne({ articleId, experimentId });
    const countsArray = articleTotalLikes && articleTotalLikes.counts ? articleTotalLikes.counts : [];
    const questionsArray = articleTotalLikes && articleTotalLikes.questions ? articleTotalLikes.questions : [];

    let countLikes = 0;
    let countDislikes = 0;
    if (questionsArray.includes(articleQuestionId)) {
        const indexQuestionId = questionsArray.indexOf(articleQuestionId);
        countLikes = countsArray[indexQuestionId].countLikes;
        countDislikes = countsArray[indexQuestionId].countDislikes;
    }

    return {
        isLoading,
        countLikes,
        countDislikes,
    };
})(withColor(LikeDislikeCount));

const styles = () => StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '30%',
        paddingLeft: 5,
    },
    countContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 35,
    },
});
