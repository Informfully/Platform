import React from 'react';
import {
    StyleSheet,
    View,
    TouchableWithoutFeedback,
    Image,
    ActivityIndicator,
} from 'react-native';
import PropTypes from 'prop-types';
import Meteor, { withTracker } from '@meteorrn/core';
import { DynamicColors, withColor } from '../../styles';
import { collectionManager } from '../../lib/utils/collectionManager';
import { removeWeirdMinusSignsInFrontOfString } from '../../lib/utils/utils';
import { isConnected, execute } from '../utils/RemoteExecutionHandler';
import I18n from '../../lib/i18n/i18n';
import MeteorOffline from '../../lib/meteorOffline/MeteorOffline';

const likeIconEmpty = require('../../assets/icons/likeDislike/thumb_up.png');
const dislikeIconEmpty = require('../../assets/icons/likeDislike/thumb_down.png');
const likeIconFilled = require('../../assets/icons/likeDislike/thumb_up_filled.png');
const dislikeIconFilled = require('../../assets/icons/likeDislike/thumb_down_filled.png');

class LikeDislikeButton extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            isBlocked: false,
        };

        this._mounted = true;

        this.handleLike = this.handleLike.bind(this);
        this.handleDislike = this.handleDislike.bind(this);
    }

    componentDidUpdate() {
        const { isBlocked, expectedIsDisliked, expectedIsLiked } = this.state;
        const { isDisliked, isLiked } = this.props;
        if (isBlocked && expectedIsDisliked === isDisliked && expectedIsLiked === isLiked) {
            this.setState({ isBlocked: false, expectedIsDisliked: isDisliked, expectedIsLiked: isLiked });
        }
    }

    componentWillUnmount() {
        this._mounted = false;
    }

    get likeIcon() {
        const { isLiked } = this.props;
        return isLiked ? likeIconFilled : likeIconEmpty;
    }

    get dislikeIcon() {
        const { isDisliked } = this.props;
        return isDisliked ? dislikeIconFilled : dislikeIconEmpty;
    }

    checkIsConnected() {
        if (!isConnected()) {
            this.props.setToast(I18n.t('GLOBAL.CONNECTION_ERROR'));
        }

        return isConnected();
    }

    resetIsBlocked() {
        this._mounted && this.setState({ isBlocked: false, expectedIsDisliked: this.props.isDisliked, expectedIsLiked: this.props.isLiked });
    }

    handleLike() {
        const {
            experimentId, articleId, articleQuestionId, isLiked, isDisliked,
        } = this.props;

        if (this.state.isBlocked) {
            return;
        }

        if (isLiked) {
            this.setState({ expectedIsLiked: false, isBlocked: true });

            this.checkIsConnected();

            execute(() => Meteor.call('articleLikes.remove', articleId, articleQuestionId, experimentId, (err) => {
                if (err && this._mounted) {
                    this.resetIsBlocked();
                    this.props.setToast(I18n.t('GLOBAL.LIKE_REMOVE_ERROR'));
                    console.warn(err);
                } else if (err) {
                    console.warn(err);
                }
            }));
        } else {
            this.setState({ expectedIsLiked: true, expectedIsDisliked: false, isBlocked: true });

            this.checkIsConnected();

            if (isDisliked) {
                execute(() => Meteor.call('articleDislikes.remove', articleId, articleQuestionId, experimentId, (err) => {
                    if (err && this._mounted) {
                        this.resetIsBlocked();
                        this.props.setToast(I18n.t('GLOBAL.DISLIKE_REMOVE_ERROR'));
                        console.warn(err);
                    } else if (err) {
                        console.warn(err);
                    }
                }));
            }

            execute(() => Meteor.call('articleLikes.insert', articleId, articleQuestionId, experimentId, (err) => {
                if (err && this._mounted) {
                    this.resetIsBlocked();
                    this.props.setToast(I18n.t('GLOBAL.LIKE_SET_ERROR'));
                    console.warn(err);
                } else if (err) {
                    console.warn(err);
                }
            }));
        }
    }

    handleDislike() {
        const {
            experimentId, articleId, articleQuestionId, isDisliked, isLiked,
        } = this.props;

        if (this.state.isBlocked) {
            return;
        }

        if (isDisliked) {
            this.setState({ isBlocked: true, expectedIsDisliked: false });

            this.checkIsConnected();

            execute(() => Meteor.call('articleDislikes.remove', articleId, articleQuestionId, experimentId, (err) => {
                if (err && this._mounted) {
                    this.resetIsBlocked();
                    this.props.setToast(I18n.t('GLOBAL.DISLIKE_REMOVE_ERROR'));
                    console.warn(err);
                } else if (err) {
                    console.warn(err);
                }
            }));
        } else {
            this.setState({ isBlocked: true, expectedIsLiked: false, expectedIsDisliked: true });

            this.checkIsConnected();

            if (isLiked) {
                execute(() => Meteor.call('articleLikes.remove', articleId, articleQuestionId, experimentId, (err) => {
                    if (err && this._mounted) {
                        this.props.setToast(I18n.t('GLOBAL.LIKE_REMOVE_ERROR'));
                        this.resetIsBlocked();
                        console.warn(err);
                    } else if (err) {
                        console.warn(err);
                    }
                }));
            }

            execute(() => Meteor.call('articleDislikes.insert', articleId, articleQuestionId, experimentId, (err) => {
                if (err && this._mounted) {
                    this.resetIsBlocked();
                    this.props.setToast(I18n.t('GLOBAL.DISLIKE_SET_ERROR'));
                    console.warn(err);
                } else if (err) {
                    console.warn(err);
                }
            }));
        }
    }

    render() {
        const { isLiked, isDisliked } = this.props;
        const { isBlocked, expectedIsDisliked, expectedIsLiked } = this.state;

        return (
            <View style={styles().container}>
                <View style={styles().buttonsBase}>
                    <TouchableWithoutFeedback onPress={this.handleLike}>
                        <View style={styles().iconContainer}>
                            {isBlocked && isLiked !== expectedIsLiked
                                ? (
                                    <ActivityIndicator
                                        color={DynamicColors.getColors().CARD_TEXT}
                                        style={styles().buttonIcon}
                                    />
                                )
                                : <Image source={this.likeIcon} style={styles().buttonIcon} />
                            }
                        </View>
                    </TouchableWithoutFeedback>
                </View>

                <View style={styles().buttonsBase}>
                    <TouchableWithoutFeedback onPress={this.handleDislike}>
                        <View style={styles().iconContainer}>
                            {isBlocked && expectedIsDisliked !== isDisliked
                                ? (
                                    <ActivityIndicator
                                        color={DynamicColors.getColors().CARD_TEXT}
                                        style={styles().buttonIcon}
                                    />
                                )
                                : <Image source={this.dislikeIcon} style={styles().buttonIcon} />
                            }
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </View>
        );
    }

}

LikeDislikeButton.propTypes = {
    style: PropTypes.object,
    experimentId: PropTypes.string.isRequired,
    articleId: PropTypes.string.isRequired,
    articleQuestionId: PropTypes.string.isRequired,
    isLiked: PropTypes.bool.isRequired,
    isDisliked: PropTypes.bool.isRequired,
    setToast: PropTypes.func.isRequired,
};

LikeDislikeButton.defaultProps = {
    style: null,
    isLiked: false,
    isDisliked: false,
};

export default withTracker((params) => {
    let { articleId, articleQuestionId } = params;
    articleId = removeWeirdMinusSignsInFrontOfString(articleId);

    const isLiked = !!collectionManager.collection('articleLikes')
        .findOne({
            articleId, userId: MeteorOffline.user()._id, articleQuestionId, articleAnswer: 1,
        });
    const isDisliked = !!collectionManager.collection('articleLikes')
        .findOne({
            articleId, userId: MeteorOffline.user()._id, articleQuestionId, articleAnswer: -1,
        });

    return {
        isLiked,
        isDisliked,
    };
})(withColor(LikeDislikeButton));

const styles = () => StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '30%',
        paddingLeft: 5,
    },
    buttonsBase: {},
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonIcon: {
        width: 35,
        height: 35,
        tintColor: DynamicColors.getColors().CARD_TEXT,
    },
});
