import React, { Component } from 'react';
import {
    Image, StyleSheet, Text, View, TouchableWithoutFeedback, Dimensions, ActivityIndicator,
} from 'react-native';
import { withNavigation } from 'react-navigation';
import PropTypes from 'prop-types';
import Meteor from '@meteorrn/core';
import Icon from '@expo/vector-icons/FontAwesome5';
import I18n from '../../lib/i18n/i18n';
import { formatDate } from '../../lib/utils/date_formatting';
import { DynamicColors, withColor, newsArticlesStyleGenerator } from '../../styles';
import PreviewAnimationView from '../utils/PreviewAnimationView';
import { isConnected, execute } from '../utils/RemoteExecutionHandler';

const fallBackIcon = require('../../assets/logo_1024.png');

const bookmarkIconSolid = require('../../assets/icons/bookmarks/bookmark__white--solid.png');
const bookmarkIconBordered = require('../../assets/icons/bookmarks/bookmark__white--bordered.png');

const fullWidth = Dimensions.get('window').width;

class PreviewWithImage extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isBlocked: false,
        };

        this.showExplanationRow = this.showExplanationRow.bind(this);
        this.handleClickBookmarkIcon = this.handleClickBookmarkIcon.bind(this);
        this.handleClickPreviewImage = this.handleClickPreviewImage.bind(this);

        this._mounted = true;
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {
            title,
            lead,
            explanationArticle,
            isInReadingList,
            isInArchive,
            previewTitleLineHeight,
            maxCharacterExplanationTagShort,
            darkMode,
            shake,
        } = this.props;

        const {
            isBlocked,
        } = this.state;

        return title !== nextProps.title
            || lead !== nextProps.lead
            || explanationArticle !== nextProps.explanationArticle
            || isInReadingList !== nextProps.isInReadingList
            || isInArchive !== nextProps.isInArchive
            || previewTitleLineHeight !== nextProps.previewTitleLineHeight
            || maxCharacterExplanationTagShort !== nextProps.maxCharacterExplanationTagShort
            || isBlocked !== nextState.isBlocked
            || darkMode !== nextProps.darkMode
            || shake !== nextProps.shake;
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.isBlocked
            && (this.props.isInArchive !== this.state.prevIsInArchive
            || this.props.isInReadingList !== this.state.prevIsInReadingList)
        ) {
            this.setState({ isBlocked: false, prevIsInArchive: undefined, prevIsInReadingList: undefined });
        }
    }

    componentWillUnmount() {
        this._mounted = false;
    }

    get iconName() {
        const { iconName } = this.props;
        return iconName;
    }

    get previewImage() {
        const { image } = this.props;
        return image ? (
            <Image
                style={styles().articleImg}
                source={{ uri: image }}
            />
        ) : (
            <Image
                style={styles().articleImg}
                source={fallBackIcon}
            />
        );
    }

    get bookmarkIcon() {
        const { isInReadingList } = this.props;

        if (isInReadingList) {
            return bookmarkIconSolid;
        }

        return bookmarkIconBordered;
    }

    get indexForAnimation() {
        const { index, isInInitialSet } = this.props;
        if (!isInInitialSet) {
            return 1;
        }

        return index;
    }

    get explanationTags() {
        const {
            explanationArticle,
            maxCharacterExplanationTagShort,
        } = this.props;

        return (
            <View style={styles().explanationTagsContainer}>
                {explanationArticle.map(({
                    _id,
                    backgroundColorLight,
                    backgroundColorDark,
                    textColorLight,
                    textColorDark,
                    textShort,
                }) => (
                    <View
                        key={_id}
                        style={[ styles().explanationTagContainer, {
                            backgroundColor: DynamicColors.isDarkMode() ? backgroundColorDark : backgroundColorLight,
                        }]}
                    >
                        <Text style={[ newsArticlesStyleGenerator().previewExplanationTag, {
                            color: DynamicColors.isDarkMode() ? textColorDark : textColorLight,
                        }]}
                        >
                            {textShort.substring(0, maxCharacterExplanationTagShort)}
                        </Text>
                    </View>
                ))}
            </View>
        );
    }

    get datePublishedAndReadTime() {
        const { datePublished, readTimeMinutes } = this.props;
        if (readTimeMinutes) {
            return `${formatDate(datePublished)} - ${readTimeMinutes} ${I18n.t('PREVIEW.MINUTES')} ${I18n.t('PREVIEW.READING_TIME')}`;
        }
        return `${formatDate(datePublished)}`;
    }

    get bookmarkElement() {
        return this.state.isBlocked ? (
            <ActivityIndicator
                color={DynamicColors.getColors().CARD_TEXT}
                style={styles().bookmarkIcon}
            />
        ) : (
            <Image
                style={styles().bookmarkIcon}
                source={this.bookmarkIcon}
            />
        );
    }

    showExplanationRow() {
        const { explanationArticle } = this.props;
        return explanationArticle.length !== 0;
    }

    checkIsConnected() {
        if (!isConnected()) {
            this.props.setToast(I18n.t('GLOBAL.CONNECTION_ERROR'));
        }

        return isConnected();
    }

    handleClickPreviewImage() {
        const {
            _id,
            isInReadingList,
            navigation,
            isInArchive,
            primaryCategory,
            maxNrFurtherRecArticles,
        } = this.props;
        if (navigation.state.routeName !== 'Article') {
            navigation.push('Article', {
                articleId: _id, 
                isInReadingList,
                isInArchive,
                primaryCategory,
                maxNrFurtherRecArticles,
                fromArticleScreen: false,
            });
        } else {
            navigation.push('Article', {
                articleId: _id,
                isInReadingList,
                isInArchive,
                primaryCategory,
                maxNrFurtherRecArticles,
                fromArticleScreen: true,
            });
        }
    }

    handleClickBookmarkIcon() {
        const { _id, isInReadingList, isInArchive } = this.props;
        const { isBlocked } = this.state;

        this.checkIsConnected();

        if (!isBlocked) {
            this.setState({ isBlocked: true, prevIsInReadingList: isInReadingList, prevIsInArchive: isInArchive });
            execute(() => Meteor.call('newsArticles.bookmark.update', _id, isInReadingList, (error) => {
                if (error && this._mounted) {
                    // Error -> changing bookmark state on server did not work, reset isBlocked state
                    console.warn(error);
                    this.props.setToast(I18n.t('GLOBAL.BOOKMARK_ERROR'));
                    this.setState({ isBlocked: false, prevIsInArchive: undefined, prevIsInReadingList: undefined });
                } else if (error) {
                    console.warn(error);
                }
            }));
        }
    }

    render() {
        const {
            previewTitleLineHeight, title, fastAnimate, shake,
        } = this.props;

        return (
            <PreviewAnimationView
                style={rawStyles.container}
                index={this.indexForAnimation}
                fastAnimate={fastAnimate}
                shake={shake}
            >
                <TouchableWithoutFeedback onPress={this.handleClickPreviewImage} onLongPress={this.props.onLongPress}>
                    <View style={styles().overflowContainer}>
                        {this.previewImage}
                        <View style={styles().previewImageContainer}>

                            <Icon name={this.iconName} style={styles().icon} />
                        </View>
                        <View style={styles().previewBar}>
                            <View>
                                <Text numberOfLines={previewTitleLineHeight}>
                                    <Text
                                        numberOfLines={previewTitleLineHeight}
                                        style={newsArticlesStyleGenerator().previewTitle}
                                    >
                                        {title}
                                    </Text>
                                </Text>
                            </View>
                            {this.showExplanationRow() ? this.explanationTags : undefined}
                            <View style={styles().articleDateContainer}>
                                <Text style={newsArticlesStyleGenerator().previewDate}>
                                    {this.datePublishedAndReadTime}
                                </Text>
                                <TouchableWithoutFeedback
                                    onPress={this.handleClickBookmarkIcon}
                                    hitSlop={{
                                        top: 20, bottom: 20, left: 20, right: 20,
                                    }}
                                >
                                    <View
                                        style={styles().bookmarkButtonContainer}
                                    >
                                        {this.bookmarkElement}
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </PreviewAnimationView>
        );
    }

}

PreviewWithImage.propTypes = {
    _id: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    datePublished: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]).isRequired,
    setToast: PropTypes.func.isRequired,
    image: PropTypes.string.isRequired,
    isInInitialSet: PropTypes.bool,
    explanationArticle: PropTypes.array.isRequired,
    isInReadingList: PropTypes.bool.isRequired,
    isInArchive: PropTypes.bool.isRequired,
    maxNrFurtherRecArticles: PropTypes.number.isRequired,
    previewTitleLineHeight: PropTypes.number.isRequired,
    maxCharacterExplanationTagShort: PropTypes.number.isRequired,
    navigation: PropTypes.object.isRequired,
    readTimeMinutes: PropTypes.number,
};

PreviewWithImage.defaultProps = {
    isInInitialSet: false,
    readTimeMinutes: null,
};

const widthImage = fullWidth / 3.63;

const rawStyles = {
    container: {
        // full width minus the margins on both sides
        width: fullWidth - 10,
        height: widthImage,
        margin: 5,
        borderRadius: 8,
        justifyContent: 'flex-start',
        // shadow iOS:
        shadowColor: 'rgb(50,50,50)',
        // this is not working for some reason
        shadowOffset: { width: 2, height: 15 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        // shadow Android:
        elevation: 15,
    },
};

const styles = () => StyleSheet.create({
    container: rawStyles.container,
    overflowContainer: {
        borderRadius: 8,
        overflow: 'hidden',
        flexDirection: 'row',
        height: '100%',
    },
    articleImg: {
        width: widthImage,
        height: widthImage,
    },
    previewBar: {
        flexDirection: 'column',
        flex: 1,
        padding: 10,
        justifyContent: 'space-between',
        backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
    },
    explanationTagsContainer: {
        flexDirection: 'row',
        // flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    explanationTagContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        marginRight: 4,
    },
    articleDateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bookmarkButtonContainer: {
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    },
    bookmarkIcon: {
        width: 15,
        height: 19,
        tintColor: DynamicColors.getColors().CARD_TEXT,
    },
    previewImageContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'visible',
    },
    icon: {
        color: 'white',
        fontSize: 25,
        height: 40,
        width: 40,
        textShadowColor: 'black',
        textShadowRadius: 5,
        paddingLeft: 5,
        paddingTop: 5,
    },
});

export default withColor(withNavigation(PreviewWithImage));
