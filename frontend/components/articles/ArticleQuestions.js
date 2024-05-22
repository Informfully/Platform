/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import {
    StyleSheet,
    View,
    Text,
} from 'react-native';
import PropTypes from 'prop-types';
import Meteor, { withTracker } from '@meteorrn/core';
import { collectionManager } from '../../lib/utils/collectionManager';
import { DynamicColors, newsArticlesStyleGenerator, withColor } from '../../styles';
import LikeDislikeButton from './LikeDislikeButton';
import LikeDislikeCount from './LikeDislikeCount';
import I18n from '../../lib/i18n/i18n';
import { removeWeirdMinusSignsInFrontOfString } from '../../lib/utils/utils';

class ArticleQuestions extends React.Component {

    render() {
        const { likeSurvey } = this.props;

        if (!likeSurvey) {
            return null;
        }

        const { answers } = likeSurvey;

        return (
            <View style={styles().container}>
                <Text style={newsArticlesStyleGenerator().subTitle}>
                    {I18n.t('GLOBAL.ARTICLE_QUESTIONS')}
                </Text>
                {answers
                    .filter(({ text, value }) => text && (value || value === 0))
                    .map(({ _id, text, value }) => (
                        <View key={_id + text + value}>
                            <View style={styles().containerQuestionAndButton}>
                                <View style={styles().containerQuestion}>
                                    <Text style={[ newsArticlesStyleGenerator().paragraph, { marginBottom: 0 }]}>
                                        {text}
                                    </Text>
                                </View>
                                <LikeDislikeButton
                                    experimentId={this.props._id}
                                    articleId={this.props.articleId}
                                    setToast={this.props.setToast}
                                    articleQuestionId={_id}
                                />
                            </View>
                            {this.props.showTotal
                            && (
                                <View style={styles().containerTextAndCounts}>
                                    <View style={styles().containerText}>
                                        <Text style={[ newsArticlesStyleGenerator().date, { marginTop: 0 }]}>
                                            {/* {I18n.t('GLOBAL.TOTAL_LIKESDISLIKES')} */}
                                        </Text>
                                    </View>
                                    <LikeDislikeCount
                                        experimentId={this.props._id}
                                        articleId={this.props.articleId}
                                        articleQuestionId={_id}
                                    />
                                </View>
                            )}
                            <View style={styles().line} />
                        </View>
                    ))
                }
            </View>
        );
    }

}

ArticleQuestions.propTypes = {
    _id: PropTypes.string,
    articleId: PropTypes.string.isRequired,
    likeSurvey: PropTypes.object,
    setToast: PropTypes.func.isRequired,
    showTotal: PropTypes.bool.isRequired,
};

export default withTracker((params) => {
    let { articleId } = params;
    articleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const articleLikeSubscription = Meteor.subscribe('articleLikes', articleId);

    // Reuse subscription from Home.js for activeExperiment or experiments
    const config = collectionManager.collection('activeExperiment').findOne()
        || collectionManager.collection('experiments').findOne() || {};

    const isLoading = !articleLikeSubscription.ready();

    return {
        isLoading,
        ...config,
    };
})(withColor(ArticleQuestions));


const styles = () => StyleSheet.create({
    container: {
        flexDirection: 'column',
        paddingHorizontal: 20,
    },
    containerQuestionAndButton: {
        flexDirection: 'row',
        alignItems: 'center',
        // backgroundColor: 'green'
    },
    containerQuestion: {
        width: '70%',
        paddingRight: 5,
    },
    containerTextAndCounts: {
        flexDirection: 'row',
        alignItems: 'center',
        // backgroundColor: 'yellow'
    },
    containerText: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '70%',
        paddingRight: 5,
    },
    line: {
        borderBottomWidth: 1,
        borderBottomColor: DynamicColors.getColors().CARD_TEXT,
        marginVertical: 10,
    },
});
