import React, { Component } from 'react';
import {
    Image, StyleSheet, Text, View, TouchableWithoutFeedback, Dimensions, Platform, ActivityIndicator,
} from 'react-native';
import { withNavigation } from 'react-navigation';
import PropTypes from 'prop-types';
import Meteor from '@meteorrn/core';
import Icon from '@expo/vector-icons/FontAwesome5';
import I18n from '../../lib/i18n/i18n';
import { formatDate } from '../../lib/utils/date_formatting';
import { DynamicColors, withColor } from '../../styles/DynamicColors';
import { newsArticlesStyleGenerator } from '../../styles/newsArticles';
import PreviewAnimationView from '../utils/PreviewAnimationView';
import { isConnected, execute } from '../utils/RemoteExecutionHandler';

const bookmarkIconSolid = require('../../assets/icons/bookmarks/bookmark__white--solid.png');
const bookmarkIconBordered = require('../../assets/icons/bookmarks/bookmark__white--bordered.png');

const fullWidth = Dimensions.get('window').width;
const marginBetweenTitleAndLead = Platform.OS === 'ios' ? '\n \n' : '\n';

class LargePreviewWithImage extends Component {

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

    get previewImage() {
        const { image } = this.props;
        return { uri: image };
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
            return `${formatDate(datePublished)} — ${readTimeMinutes} ${I18n.t('PREVIEW.MINUTES')} ${I18n.t('PREVIEW.READING_TIME')}`;
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

    get iconName() {
        const { iconName } = this.props;
        return iconName;
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
            title, lead, fastAnimate, image, shake,
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
                        {image ? (
                            <Image
                                style={styles().articleImg}
                                source={this.previewImage}
                            />
                        ) : undefined}
                        <View style={styles().previewImageContainer}>

                            <Icon name={this.iconName} style={styles().icon} />

                        </View>
                        <View style={styles().previewBar}>
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
                            <View>
                                <Text>
                                    {/* the next line is to avoid title clipping on android */}
                                    <Text style={{ lineHeight: 5 }}>
                                        {Platform.OS === 'android' ? '\n' : ''}
                                    </Text>
                                    <Text
                                        style={newsArticlesStyleGenerator().previewTitle}
                                    >
                                        {title}
                                    </Text>
                                    <Text style={{ lineHeight: 8 }}>
                                        {lead ? marginBetweenTitleAndLead : ''}
                                    </Text>
                                    <Text style={newsArticlesStyleGenerator().previewLead}>
                                        {lead}
                                    </Text>
                                </Text>
                            </View>
                            {this.showExplanationRow() ? this.explanationTags : undefined}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </PreviewAnimationView>
        );
    }

}

LargePreviewWithImage.propTypes = {
    _id: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    lead: PropTypes.string.isRequired,
    setToast: PropTypes.func.isRequired,
    datePublished: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]).isRequired,
    image: PropTypes.string.isRequired,
    isInInitialSet: PropTypes.bool,
    explanationArticle: PropTypes.array.isRequired,
    isInReadingList: PropTypes.bool.isRequired,
    isInArchive: PropTypes.bool.isRequired,
    maxNrFurtherRecArticles: PropTypes.number.isRequired,
    maxCharacterExplanationTagShort: PropTypes.number.isRequired,
    navigation: PropTypes.object.isRequired,
    readTimeMinutes: PropTypes.number,
    fastAnimate: PropTypes.bool,
};

LargePreviewWithImage.defaultProps = {
    isInInitialSet: false,
    readTimeMinutes: null,
    fastAnimate: false,
};

const imageHeight = fullWidth / 2;

const rawStyles = {
    container: {
        // full width minus the margins on both sides
        width: fullWidth - 10,
        // height: height,
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
        flexDirection: 'column',
        // height: height,
    },
    articleImg: {
        width: fullWidth - 10,
        height: imageHeight,
    },
    previewBar: {
        flexDirection: 'column',
        flex: 1,
        padding: 5,
        // height: height - imageHeight,
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
    },
    explanationTagsContainer: {
        flexDirection: 'row',
        // flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginVertical: 5,
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
        width: fullWidth - 20, // full Width minus padding and bookmark icon
        height: 29, // Height bookmark icon + padding
    },
    bookmarkButtonContainer: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        padding: 5,
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
        fontSize: 35,
        height: 50,
        width: 50,
        textShadowColor: 'black',
        textShadowRadius: 5,
        paddingLeft: 5,
        paddingTop: 5,
    },
});

export default withNavigation(withColor(LargePreviewWithImage));
