import React, { useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    SafeAreaView,
    ActivityIndicator,
    Dimensions,
    StatusBar,
    Platform,
    TouchableNativeFeedback,
    TouchableWithoutFeedback,
} from 'react-native';
import {
    Gesture,
    GestureDetector,
    ScrollView,
} from 'react-native-gesture-handler';
import Slider from '@react-native-community/slider';
import { FloatingAction } from 'react-native-floating-action';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'react-navigation-stack';
import { Video, Audio } from 'expo-av';
import Icon from '@expo/vector-icons/FontAwesome5';
import * as ScreenOrientation from 'expo-screen-orientation';
import Meteor, { withTracker, ReactiveDict } from '@meteorrn/core';
import PropTypes from 'prop-types';
import { withNavigation } from 'react-navigation';
import ArticleQuestions from '../articles/ArticleQuestions';
import ExplanationModal from '../articles/ExplanationModal';
import FurtherRecommendations from '../articles/FurtherRecommendations';
import Loading from './Loading';
import BottomBarMusicPlayer from '../elements/bottomBarMusicPlayer';
import Toast from '../elements/Toast';
import { newsArticlesStyleGenerator, DynamicColors, withColor } from '../../styles';
import { isConnected, execute } from '../utils/RemoteExecutionHandler';
import GLOBAL from '../utils/Global';
import I18n from '../../lib/i18n/i18n';
import MeteorOffline from '../../lib/meteorOffline/MeteorOffline';
import { formatDateTime } from '../../lib/utils/date_formatting';
import { collectionManager } from '../../lib/utils/collectionManager';
import { removeWeirdMinusSignsInFrontOfString } from '../../lib/utils/utils';
import { NAVIGATION_ICONS } from '../../lib/parameters/icons';
import * as NavigationBar from 'expo-navigation-bar';

const bookmarkIconSolid = require('../../assets/icons/bookmarks/bookmark__black--solid.png');
const bookmarkIconBordered = require('../../assets/icons/bookmarks/bookmark__black--bordered.png');
const starIconSolid = require('../../assets/icons/favourites/star__black--solid.png');
const starIconBordered = require('../../assets/icons/favourites/star__black--bordered.png');
const explanationIcon = require('../../assets/icons/explanations/explanation__black--bordered.png');

const fullHeight = Dimensions.get('window').height;
const fullWidth = Dimensions.get('window').width;

// Only needed if phone is iOS. Used for the calculation of windowContentHeight
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 24;

const CONTAINER_MARGIN_TOP_ADD = fullHeight * 0.03;
const CONTAINER_MARGIN_TOP = CONTAINER_MARGIN_TOP_ADD;

const fastForwardTimeInMillis = 15000;
const fastBackwardsTimeInMillis = 15000;
const heartBeatIntervalInMillis = 10000;

const LIMIT_ARTICLES = 20;

const options = new ReactiveDict();
options.set('limit', LIMIT_ARTICLES);
options.set('curNews', LIMIT_ARTICLES);
options.set('date', new Date());
options.set('isUpdated', false);

class InnerArticle extends React.Component {

    // Reference for swiping and double tap gesture
    swipeGestureRef = React.createRef();
    doubleTapGestureRef = React.createRef();
    scrollViewRef = React.createRef();

    constructor(props) {
        super(props);

        // max scroll value
        this.maxOffsetValue = 0;
        // window height without stacked navigation height (and without height of the StatusBar for iOS-phones)
        if (Platform.OS === 'ios') {
            this.windowContentHeight = fullHeight - STATUS_BAR_HEIGHT - props.headerHeight;
        } else {
            this.windowContentHeight = fullHeight - props.headerHeight;
        }
        // height of article content, initial value set to 1 to avoid division by 0
        this.articleHeight = 1;

        this.state = {
            imgHeight: 0,
            isBlocked: false,
            fallbackArticle: {},
            explanationVisible: false,
            // video
            currentTime: 0,
            duration: props.article.multimediaDurationInMillis,
            paused: true,
            overlay: true,
            fullscreen: false,
            isPlaying: false,
            isBuffering: true,
            lastHeartbeat: 0,
            // end video
        };

        this.handleClickBookmarkIcon = this.handleClickBookmarkIcon.bind(this);
        this.getBookmarkElement = this.getBookmarkElement.bind(this);
        this.handleClickStarIcon = this.handleClickStarIcon.bind(this);
        this.getStarElement = this.getStarElement.bind(this);
        this.showExplanationIcon = this.showExplanationIcon.bind(this);
        this.handleClickExplanationIcon = this.handleClickExplanationIcon.bind(this);
        this.getExplanationElement = this.getExplanationElement.bind(this);
        this.saveFallbackDataToState = this.saveFallbackDataToState.bind(this);
        this.handlePressCloseExplanationModal = this.handlePressCloseExplanationModal.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.getViewHeight = this.getViewHeight.bind(this);

        this.onPlaybackStatusUpdate = this.onPlaybackStatusUpdate.bind(this);
        this.pauseVideo = this.pauseVideo.bind(this);
        this.progress = this.progress.bind(this);
        this.buffering = this.buffering.bind(this);
        this.jumpToLastTime = this.jumpToLastTime.bind(this);

        this.errorToastTimer = undefined;
        this._mounted = true;

        this.currentOffsetValue = this.props.currentOffsetValue;
        
        // code for the swiping gesture
        this.sensitivityVelocity = 300;
        this.sensitivityDistanceLeft = 75;
        this.sensitivityDistanceRight = 75;
        this.swipeGesture = Gesture.Pan()
            .minDistance(75)
            .onEnd((event) => {
                if (event.translationX <= -this.sensitivityDistanceLeft && event.velocityX <= -this.sensitivityVelocity) {
                    this.handleLeftSwipe();
                }
                if (event.translationX >= this.sensitivityDistanceRight && event.velocityX >= this.sensitivityVelocity) {
                    this.props.navigation.goBack();
                }
            })
            .withRef(this.swipeGestureRef);

        this.doubleTapGesture = Gesture.Tap()
            .numberOfTaps(2)
            .onEnd((_event, success) => {
                if (success) {
                    this.handleClickStarIcon();
                }
            })
            .withRef(this.doubleTapGestureRef);

        this.composedGesture = Gesture.Simultaneous(
            this.swipeGesture,
            this.doubleTapGesture
        );

    }

    componentDidMount() {
        const { article, navigation } = this.props;
        navigation.setParams({
            getBookmarkElement: this.getBookmarkElement,
            bookmarkCallback: this.handleClickBookmarkIcon,
            getStarElement: this.getStarElement,
            starCallback: this.handleClickStarIcon,
            showExplanationIcon: this.showExplanationIcon,
            getExplanationElement: this.getExplanationElement,
            explanationCallback: this.handleClickExplanationIcon,
        });

        if (article.image) {
            Image.getSize(article.image, (width, height) => {
                this.setState({
                    imgHeight: fullWidth * height / width,
                });
            });
        }

        if (article._id === GLOBAL.btmBarPlrInfos[0].articleId) {
            this.setState({
                playbackInstance: GLOBAL.btmBarPlr[0],
                paused: GLOBAL.btmBarPlrInfos[0].paused,
            });

            if (GLOBAL.btmBarPlr[0] !== undefined) {
                GLOBAL.btmBarPlrInfos[0].articleUpdateFunction = this.onPlaybackStatusUpdate;
            }
        }
        if (article.articleType === 'video') {
            this.loadVideo();
        }

        this.jumpToLastTime();
        this.saveFallbackDataToState();
    }

    async loadVideo() {
        try {
            await this.video.loadAsync({ uri: this.props.article.multimediaURL }, {}, false);
        } catch (error) {
            console.log(error);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.isBlocked && (
            this.props.isInArchive !== this.state.prevIsInArchive
            || this.props.isInReadingList !== this.state.prevIsInReadingList)
        ) {
            this.setState({
                isBlocked: false,
                prevIsInArchive: undefined,
                prevIsInReadingList: undefined,
            });
        }
        if (prevProps.isInArchive !== this.props.isInArchive
            || prevProps.isInReadingList !== this.props.isInReadingList
            || prevState.isBlocked !== this.state.isBlocked
        ) {
            this.props.navigation.setParams({
                getBookmarkElement: this.getBookmarkElement,
                bookmarkCallback: this.handleClickBookmarkIcon,
                getStarElement: this.getStarElement,
                starCallback: this.handleClickStarIcon,
                showExplanationIcon: this.showExplanationIcon,
                getExplanationElement: this.getExplanationElement,
                explanationCallback: this.handleClickExplanationIcon,
            });
        }
        this.saveFallbackDataToState();
    }

    componentWillUnmount() {
        // homescreenstate set bottombarplayer state updateFunction
        GLOBAL.btmBarPlrInfos[0].articleUpdateFunction = undefined;
        if (GLOBAL.btmBarPlrInfos[0].bottomBarMusicPlayerState !== undefined) {
            GLOBAL.btmBarPlrInfos[0].bottomBarMusicPlayerState.setState({ getsUpdates: false });
            GLOBAL.btmBarPlrInfos[0].homeScreenState.homeBottomBarMusicPlayerState.setState({ getsUpdates: false });
        }

        if (GLOBAL.btmBarPlrInfos[0].paused) {
            GLOBAL.btmBarPlrInfos[0].closePlayer();
        }

        this.pauseVideo();
        this.setState({ paused: true });

        this._mounted = false;

        // if the user has scrolled more than 80% of the article, the article is considered as read
        // next time will still reset the currentOffsetValue to 0
        if (this.maxOffsetValue/this.articleHeight>0.8){
            this.currentOffsetValue = 0;
        }
        Meteor.call('articleViews.leaveAt.update', this.props.articleId, this.currentOffsetValue);
    }

    pauseVideo() {
        if (this.video !== undefined && this.props.article.articleType === 'video') {
            this.video.pauseAsync();
        }
    }

    get bookmarkIcon() {
        const { isInReadingList } = this.props;

        if (isInReadingList) {
            return bookmarkIconSolid;
        }

        return bookmarkIconBordered;
    }

    get starIcon() {
        const { isInArchive } = this.props;

        if (isInArchive) {
            return starIconSolid;
        }

        return starIconBordered;
    }

    get articleImage() {
        const { article } = this.props;
        const { imgHeight } = this.state;

        article.image = article.image || this.state.fallbackArticle.image;
        if (!article.image) {
            return null;
        }
        return <Image style={[{ height: imgHeight }, styles().articleImg ]} source={{ uri: article.image }} />;
    }

    get articleDate() {
        const { article = {} } = this.props;

        article.datePublished = article.datePublished || this.state.fallbackArticle.datePublished;
        if (!article.datePublished) {
            return null;
        }

        return (
            <Text style={newsArticlesStyleGenerator().date}>{formatDateTime(article.datePublished)}</Text>
        );
    }

    get articleLead() {
        const { article = {} } = this.props;
        article.lead = article.lead || this.state.fallbackArticle.lead;

        if (!article.lead) {
            return null;
        }
        return (
            <Text style={newsArticlesStyleGenerator().lead}>
                {article.lead}
            </Text>
        );
    }

    get articleBody() {
        const { article = {} } = this.props;
        article.body = article.body || this.state.fallbackArticle.body;

        if (!article.body) {
            return null;
        }

        return article.body.map(({
            text,
            type,
        }, i) => {
            if (text) {
                if (type === 'subtitle') {
                    const nextElement = article.body[i + 1];
                    // if there is no content after a subtitle we don't want to display the subtitle
                    if (!nextElement || nextElement.type === 'subtitle') {
                        // eslint-disable-next-line react/no-array-index-key
                        return null;
                    }
                    // eslint-disable-next-line react/no-array-index-key
                    return <Text key={i} style={newsArticlesStyleGenerator().subTitle}>{text}</Text>;
                }
                if (type === 'text') {
                    // eslint-disable-next-line react/no-array-index-key
                    return <Text key={i} style={newsArticlesStyleGenerator().paragraph}>{text}</Text>;
                }
                if (type === 'quote') {
                    // eslint-disable-next-line react/no-array-index-key
                    return <Text key={i} style={newsArticlesStyleGenerator().quote}>{text}</Text>;
                }
            }
            return null;
        });
    }

    saveFallbackDataToState() {
        if (!this.state.fallbackArticle.body && this.props.article && Array.isArray(this.props.article.body)) {
            this.setState(
                {
                    fallbackArticle: this.props.article,
                }
            );
        }
    }

    showExplanationIcon() {
        const { explanationArticle } = this.props;
        return explanationArticle.length !== 0;
    }

    handleClickBookmarkIcon() {
        const {
            articleId,
            isInReadingList,
        } = this.props;
        const { isBlocked } = this.state;
        if (!isBlocked) {
            this.checkIsConnected();
            this.setState({
                isBlocked: true,
                prevIsInReadingList: isInReadingList,
            });
            execute(() => Meteor.call('newsArticles.bookmark.update', articleId, isInReadingList, (error) => {
                if (error) {
                    // Error -> changing bookmark state on server did not work, reset isBlocked state
                    console.warn(error);
                    this.setState({
                        isBlocked: false,
                        prevIsInReadingList: undefined,
                    });
                    this.setToast(I18n.t('GLOBAL.BOOKMARK_ERROR'));
                }
            }));
        }
    }

    handleClickStarIcon() {
        const {
            articleId,
            isInArchive,
        } = this.props;
        const { isBlocked } = this.state;
        if (!isBlocked) {
            this.checkIsConnected();
            this.setState({
                isBlocked: true,
                prevIsInArchive: isInArchive,
            });
            execute(() => Meteor.call('newsArticles.favourite.update', articleId, isInArchive, (error) => {
                if (error) {
                    // Error -> changing bookmark state on server did not work, reset isBlocked state
                    console.warn(error);
                    this.setState({
                        isBlocked: false,
                        prevIsInArchive: undefined,
                    });
                    this.setToast(I18n.t('GLOBAL.FAVOURITE_ERROR'));
                }
            }));
        }
    }

    handleClickExplanationIcon() {
        const { articleId } = this.props;
        const { isBlocked } = this.state;
        if (!isBlocked) {
            this.checkIsConnected();
            this.setState({
                isBlocked: true,
                explanationVisible: true,
            });
            execute(() => Meteor.call('explanationViews.insert', articleId, (error) => {
                if (error) {
                    // Error -> adding click on explanation icon to server did not work, reset isBlocked state
                    console.warn(error);
                    this.setState({ isBlocked: false });
                    this.setToast(I18n.t('GLOBAL.EXPLANATION_ERROR'));
                }
            }));
        }
    }

    getViewHeight({ nativeEvent }) {
        this.articleHeight = nativeEvent.layout.height;
    }

    handleScroll({ nativeEvent }) {
        const {
            articleId,
            maxScrolledContentDB,
        } = this.props;

        this.maxOffsetValue = Math.min(this.articleHeight - this.windowContentHeight,
            Math.max(this.maxOffsetValue, nativeEvent.contentOffset.y));

        const maxScrolledContent = (this.windowContentHeight + this.maxOffsetValue) / this.articleHeight;

        this.currentOffsetValue = nativeEvent.contentOffset.y;
        
        if (maxScrolledContent > maxScrolledContentDB) {
            this.checkIsConnected();
            Meteor.call('articleViews.maxScrolledContent.update', articleId, maxScrolledContent);
        }

        Meteor.call('articleViewsUpgrade.maxScrolledContent.update', articleId, maxScrolledContent);
    }

    getBookmarkElement() {
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

    getStarElement() {
        return this.state.isBlocked ? (
            <ActivityIndicator
                color={DynamicColors.getColors().CARD_TEXT}
                style={styles().starIcon}
            />
        ) : (
            <Image
                style={styles().starIcon}
                source={this.starIcon}
            />
        );
    }

    jumpToLastTime(){
        this.scrollViewRef.current.scrollTo({ y: this.props.currentOffsetValue, animated: true });
    }


    getExplanationElement() {
        return this.state.isBlocked ? (
            <ActivityIndicator
                color={DynamicColors.getColors().CARD_TEXT}
                style={styles().explanationIcon}
            />
        ) : (
            <Image
                style={styles().explanationIcon}
                source={explanationIcon}
            />
        );
    }

    handlePressCloseExplanationModal() {
        this._mounted && this.setState({ explanationVisible: false });
    }

    checkIsConnected() {
        if (!isConnected()) {
            this.setToast(I18n.t('GLOBAL.CONNECTION_ERROR'));
        }

        return isConnected();
    }

    setToast(text) {
        if (!this._mounted) {
            return;
        }
        this.setState({ errorToast: text || error });
        clearTimeout(this.errorToastTimer);
        this.errorToastTimer = setTimeout(
            () => {
                if (this._mounted) {
                    this.setState({ errorToast: false });
                }
            },
            5000
        );
    }


    // start Podcast Controls

    backward_podcast = () => {
        if (GLOBAL.btmBarPlr[0] === undefined) {
            return;
        }
        GLOBAL.btmBarPlr[0].setPositionAsync(GLOBAL.btmBarPlrInfos[0].currentTime - fastBackwardsTimeInMillis);
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => this.setState({ overlay: false }), 3000);

        // analytics insert
        execute(() => Meteor.call('podcastAnalytics.insert', this.props.articleId, 'backwards',
            GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                if (err) {
                    console.warn(err);
                }
            }));
        // end analytics insert
    }

    forward_podcast = () => {
        if (GLOBAL.btmBarPlr[0] === undefined) {
            return;
        }
        GLOBAL.btmBarPlr[0].setPositionAsync(GLOBAL.btmBarPlrInfos[0].currentTime + fastForwardTimeInMillis);
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => this.setState({ overlay: false }), 3000);

        // analytics insert
        execute(() => Meteor.call('podcastAnalytics.insert', this.props.articleId, 'fastForward',
            GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                if (err) {
                    console.warn(err);
                }
            }));
        // end analytics insert
    }

    onslide_podcast = (slide) => {
        if (GLOBAL.btmBarPlr[0] === undefined) {
            return;
        }
        if (!isNaN(slide)) {
            GLOBAL.btmBarPlr[0].setPositionAsync(slide * this.state.duration);
        }
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => { if (this._mounted) { this.setState({ overlay: false }); } }, 3000);

        // analytics insert
        execute(() => Meteor.call('podcastAnalytics.insert', this.props.articleId, 'sliderSearch',
            GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                if (err) {
                    console.warn(err);
                }
            }));
        // end analytics insert
    }

    youtubeSeekLeft_podcast = () => {
        this.handleDoubleTap(() => {
            GLOBAL.btmBarPlr[0].setPositionAsync(GLOBAL.btmBarPlrInfos[0].currentTime - fastBackwardsTimeInMillis);

            // analytics insert
            execute(() => Meteor.call('podcastAnalytics.insert', this.props.articleId, 'doubleTapLeft',
                GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        },
        () => {
            this.setState({ overlay: true });
            this.overlayTimer = setTimeout(() => this.setState({ overlay: false }), 3000);

            // analytics insert
            execute(() => Meteor.call('podcastAnalytics.insert', this.props.articleId, 'singleTapLeft',
                GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        });
    }

    youtubeSeekRight_podcast = () => {
        this.handleDoubleTap(() => { // this fn is used to detect the double tap first callback
            GLOBAL.btmBarPlr[0].setPositionAsync(GLOBAL.btmBarPlrInfos[0].currentTime + fastForwardTimeInMillis);

            // analytics insert
            execute(() => Meteor.call('podcastAnalytics.insert', this.props.articleId, 'doubleTapRight',
                GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        },
        () => {
            this.setState({ overlay: true });
            this.overlayTimer = setTimeout(() => { this.setState({ overlay: false }); }, 3000);

            // analytics insert
            execute(() => Meteor.call('podcastAnalytics.insert', this.props.articleId, 'singleTapRight',
                GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        });
    }

    playPause_podcast = async () => {
        const { paused } = this.state;

        if (paused) {
            // if there is no bottombarplayer or the article id is different from the currently playing podcast, load
            // the new audio
            if (GLOBAL.btmBarPlr[0] === undefined || this.props.articleId !== GLOBAL.btmBarPlrInfos[0].articleId) {
                if ((GLOBAL.btmBarPlr) !== undefined && (GLOBAL.btmBarPlr[0]) !== undefined) {
                    // stop current file
                    await GLOBAL.btmBarPlr[0].stopAsync();
                    await GLOBAL.btmBarPlr[0].unloadAsync();
                }

                await this.loadAudio();


                GLOBAL.btmBarPlrInfos[0].homeScreenState.setState({ bottomPlayer: true });
                await GLOBAL.btmBarPlr[0].playAsync();
                GLOBAL.btmBarPlrInfos[0].paused = false;
                GLOBAL.btmBarPlrInfos[0].bottomBarMusicPlayerState.setState({
                    isPlaying: true,
                    paused: false,
                    getsUpdates: false,
                });
            }

            // analytics insert
            execute(() => Meteor.call('podcastAnalytics.insert', this.props.articleId, 'play',
                GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        }

        this.setState({ paused: GLOBAL.btmBarPlrInfos[0].paused });
        GLOBAL.btmBarPlrInfos[0].bottomBarMusicPlayerState.setState(
            { isPlaying: !GLOBAL.btmBarPlrInfos[0].paused, paused: GLOBAL.btmBarPlrInfos[0].paused }
        );
    }

    async stopPlayer() {
        const { playbackInstance } = this.state;

        playbackInstance.pauseAsync();
        await playbackInstance.stopAsync();
        await playbackInstance.unloadAsync();

        // analytics insert
        execute(() => Meteor.call('podcastAnalytics.insert', this.props.articleId, 'stop',
            GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                if (err) {
                    console.warn(err);
                }
            }));
        // end analytics insert
    }

    onPlaybackStatusUpdate(status) {
        const { article } = this.props;

        this.setState({
            isBuffering: status.isBuffering,
        });
        if (article.articleType === 'podcast') {
            this.setState({
                paused: GLOBAL.btmBarPlrInfos[0].paused,
            });
        }


        if (status.positionMillis !== undefined && !isNaN(status.positionMillis)) {
            if (Date.now() - this.state.lastHeartbeat > heartBeatIntervalInMillis) {
                this.setState({
                    lastHeartbeat: Date.now(),
                });

                if (article.articleType === 'video') {
                    // analytics insert
                    execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'heartbeat',
                        status.positionMillis, (err) => {
                            if (err) {
                                console.warn(err);
                            }
                        }));
                    // end analytics insert
                } else if (article.articleType === 'podcast') {
                    // analytics insert
                    execute(() => Meteor.call('podcastAnalytics.insert', this.props.articleId, 'heartbeat',
                        status.positionMillis, (err) => {
                            if (err) {
                                console.warn(err);
                            }
                        }));
                    // end analytics insert
                }
            }
        }
    }

    async loadAudio() {
        const { isPlaying, volume } = this.state;
        const {
            article, articleId, isInReadingList, isInArchive, primaryCategory, limit,
        } = this.props;

        GLOBAL.btmBarPlrInfos[0].articleTitle = article.title;
        GLOBAL.btmBarPlrInfos[0].multimediaDurationInMillis = article.multimediaDurationInMillis;
        GLOBAL.btmBarPlrInfos[0].articleId = articleId;
        GLOBAL.btmBarPlrInfos[0].isInReadingList = isInReadingList;
        // GLOBAL.btmBarPlrInfos[0].navigation= this.props.navigation;
        GLOBAL.btmBarPlrInfos[0].isInArchive = isInArchive;
        GLOBAL.btmBarPlrInfos[0].primaryCategory = primaryCategory;
        GLOBAL.btmBarPlrInfos[0].maxNrFurtherRecArticles = limit;
        GLOBAL.btmBarPlrInfos[0].paused = true;
        GLOBAL.btmBarPlrInfos[0].articleUpdateFunction = this.onPlaybackStatusUpdate;

        try {
            GLOBAL.btmBarPlr[0] = new Audio.Sound();
            const source = {
                uri: this.props.article.multimediaURL,
            };

            const status = {
                shouldPlay: isPlaying,
                volume,
            };

            await GLOBAL.btmBarPlr[0].loadAsync(source, status, false);
        } catch (e) {
            console.log(e);
        }
    }

    // End podcast control

    handleLeftSwipe() {
        const {
            articleId,
            furRecNewsArticles,
            isInReadingList,
            navigation,
            isInArchive,
            primaryCategory,
            experimentConfig,
            nextNews,
        } = this.props;
        const maxNrFurtherRecArticles = experimentConfig.maxNrFurtherRecArticles;
        var id = articleId
        if(furRecNewsArticles._docs.length > 0){
            console.log(furRecNewsArticles._docs.length);
            id = furRecNewsArticles._docs[0]._id;
        }

        navigation.push('Article', {
            articleId: nextNews,
            isInReadingList,
            isInArchive,
            primaryCategory,
            maxNrFurtherRecArticles,
            fromArticleScreen: true,
        });
    }

    // Start video controls

    lastTap = null;

    handleDoubleTap = (doubleTapCallback, singleTapCallback) => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (this.lastTap && (now - this.lastTap) < DOUBLE_PRESS_DELAY) {
            clearTimeout(this.timer);
            doubleTapCallback();
        } else {
            this.lastTap = now;
            this.timer = setTimeout(() => {
                singleTapCallback();
            }, DOUBLE_PRESS_DELAY);
        }
    }

    getTime = (t) => {
        const digit = n => (n < 10 ? `0${n}` : `${n}`);
        // const t = Math.round(time);
        const sec = digit(Math.floor((t / 1000) % 60));
        const min = digit(Math.floor((t / 60000) % 60));
        const hr = digit(Math.floor((t / 3600000) % 60));
        if (hr < 1) {
            return `${min}:${sec}`; // this will convert sec to timer string
        }
        return `${hr}:${min}:${sec}`; // this will convert sec to timer string
        // 33 -> 00:00:33
        // this is done here
        // ok now the theme is good to look
    }

    // here the current time is upated
    progress(positionMillis) {
        this.setState({ currentTime: positionMillis });
    }

    buffering(isBuffering) {
        this.setState({ isBuffering });
    }

    backward = () => {
        const { currentTime } = this.state;
        this.video.setPositionAsync(currentTime - fastBackwardsTimeInMillis);
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => this.setState({ overlay: false }), 3000);

        // analytics insert
        execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'backwards', currentTime, (err) => {
            if (err) {
                console.warn(err);
            }
        }));
        // end analytics insert
    }

    forward = () => {
        const { currentTime } = this.state;
        this.video.setPositionAsync(currentTime + fastForwardTimeInMillis);
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => this.setState({ overlay: false }), 3000);

        // analytics insert
        execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'fastForward', currentTime, (err) => {
            if (err) {
                console.warn(err);
            }
        }));
        // end analytics insert
    }

    onSlidingComplete = () => {
        // analytics insert
        execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'sliderSearchComplete',
            this.state.currentTime, (err) => {
                if (err) {
                    console.warn(err);
                }
            }));
        // end analytics insert
    }

    // Callback continuously called while the user is dragging the slider.
    // onpress + dragging already occured
    onslide = (slide) => {
        if (!isNaN(slide)) {
            this.video.setPositionAsync(slide * this.state.duration);
        }
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => { if (this._mounted) { this.setState({ overlay: false }); } }, 3000);
    }

    youtubeSeekLeft = () => {
        const { currentTime } = this.state;
        this.handleDoubleTap(() => {
            this.video.setPositionAsync(currentTime - fastBackwardsTimeInMillis);

            // analytics insert
            execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'doubleTapLeft',
                currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        },
        () => {
            this.setState({ overlay: true });
            this.overlayTimer = setTimeout(() => { if (this._mounted) { this.setState({ overlay: false }); } }, 3000);

            // analytics insert
            execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'singleTapLeft',
                currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        });
    }

    youtubeSeekRight = () => {
        const { currentTime } = this.state;
        this.handleDoubleTap(() => { // this fn is used to detect the double tap first callback
            this.video.setPositionAsync(currentTime + fastForwardTimeInMillis);

            // analytics insert
            execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'doubleTapRight',
                currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        },
        () => {
            this.setState({ overlay: true });
            this.overlayTimer = setTimeout(() => { if (this._mounted) { this.setState({ overlay: false }); } }, 3000);

            // analytics insert
            execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'singleTapRight',
                currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        });
    }

    onFullscreenUpdate(event) {
        const {
            fullscreen,
            currentTime,
        } = this.state;

        if (fullscreen && event.fullscreenUpdate === 3) {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
            // this.video.dismissFullscreenPlayer()
            this.setState({ fullscreen: false });

            // analytics insert
            execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'fullscreenExit',
                currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        }
    }

    fullscreen = async () => {
        const { fullscreen, currentTime } = this.state;
        await ScreenOrientation.unlockAsync();

        if (fullscreen) {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
            await this.video.dismissFullscreenPlayer();

            // analytics insert
            execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'fullscreenExit',
                currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        } else {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
            await this.video.presentFullscreenPlayer();

            // analytics insert
            execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'fullscreenActivate',
                currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
            // end analytics insert
        }

        this.setState({ fullscreen: !fullscreen });
    }

    playPause = () => {
        const { paused, currentTime } = this.state;

        if (paused) {
            this.video.playAsync();
            this.overlayTimer = setTimeout(() => this.setState({ overlay: false }), 1000);

            // analytics insert
            execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'play', currentTime, (err) => {
                if (err) {
                    console.warn(err);
                }
            }));
            // end analytics insert
        } else {
            this.video.pauseAsync();

            // analytics insert
            execute(() => Meteor.call('videoAnalytics.insert', this.props.articleId, 'pause', currentTime, (err) => {
                if (err) {
                    console.warn(err);
                }
            }));
            // end analytics insert
        }

        this.setState({ paused: !paused });
    }

    navigateToContact(context) {
        context.props.navigation.navigate('Contact');
    }

    // End video controls

    render() {
        const {
            articleId,
            furRecNewsArticles,
            isLoading,
            article = {},
            insets,
            limit,
            totalLikesDislikesEnabled,
            experimentConfig,
            fromArticleScreen,
            navigation,
        } = this.props;

        const {
            currentTime,
            duration,
            overlay,
            fullscreen,
            paused,
            isBuffering,
        } = this.state;

        if (isLoading && Object.keys(article).length === 0) {
            return (
                <Loading />
            );
        }

        if (!article) {
            return (
                <SafeAreaView>
                    <Text>
                        {`Could not find article with _id ${articleId}`}
                    </Text>
                </SafeAreaView>
            );
        }

        if(Platform.OS === 'android'){
            NavigationBar.setBackgroundColorAsync(DynamicColors.getColors().PRIMARY_BACKGROUND);
        }

        return (
                <View style={styles().container}>
                    {Platform.OS === "ios" ? (
                        <StatusBar
                            barStyle={DynamicColors.getStatusBarStyle()}
                            hidden={false}
                        />
                    ) : (
                        <StatusBar
                            barStyle={DynamicColors.getStatusBarStyle()}
                            hidden={false}
                            backgroundColor={DynamicColors.getColors().PRIMARY_BACKGROUND}
                        />
                    )}
                    <ScrollView
                        onMomentumScrollEnd={this.handleScroll}
                        onScrollEndDrag={this.handleScroll}
                        contentContainerStyle={[
                            styles().scrollViewContent,
                            { paddingBottom: insets.bottom },
                        ]}
                        // FIX for bug in ios 13, scroll Views all over the place
                        scrollIndicatorInsets={{ right: 1 }}
                        simultaneousHandlers={[this.swipeGestureRef, this.doubleTapGestureRef]}
                        ref={this.scrollViewRef}
                        onLayout={() => this.jumpToLastTime()}
                    >
                        <ExplanationModal
                            isVisible={this.state.explanationVisible}
                            closeModal={this.handlePressCloseExplanationModal}
                            explanationArticle={this.props.explanationArticle}
                        />
                        <GestureDetector gesture={this.composedGesture}>
                            <View onLayout={this.getViewHeight}>
                                <TouchableWithoutFeedback
                                    onPress={this.handleDoubleTapFavorite}
                                >
                                    <View style={styles().headerContainer}>
                                        <Text style={newsArticlesStyleGenerator().title}>
                                            {article.title || this.state.fallbackArticle.title}
                                        </Text>
                                        {this.articleLead}
                                        {this.articleDate}
                                    </View>
                                </TouchableWithoutFeedback>

                                {article.articleType === "text" && this.articleImage}
                                {
                                    article.articleType === "video" && (
                                        <View style={styles().container}>
                                            <View style={styles().video}>
                                                <Video
                                                    ref={(r) => (this.video = r)}
                                                    resizeMode="cover"
                                                    style={{ ...StyleSheet.absoluteFill }}
                                                    onPlaybackStatusUpdate={(playbackStatus) => {
                                                        if (this._mounted) {
                                                            this.progress(playbackStatus.positionMillis);
                                                            this.buffering(playbackStatus.isBuffering);
                                                            this.onPlaybackStatusUpdate(playbackStatus);
                                                        }
                                                    }}
                                                    // shouldPlay={true}
                                                    onFullscreenUpdate={(event) =>
                                                        this.onFullscreenUpdate(event)
                                                    }
                                                />

                                                {isBuffering && (
                                                    <ActivityIndicator
                                                        size="large"
                                                        color="#ffffff"
                                                        style={styles().overlay}
                                                    />
                                                )}
                                                <View style={styles().overlay}>
                                                    {/* now we can remove this not */}
                                                    {overlay ? (
                                                        <View
                                                            style={{
                                                                ...styles().overlaySet,
                                                                backgroundColor: "#0006",
                                                            }}
                                                        >
                                                            <Icon
                                                                name="backward"
                                                                style={styles().icon_overlay}
                                                                onPress={this.backward}
                                                            />
                                                            <Icon
                                                                name={paused ? "play" : "pause"}
                                                                style={styles().icon_overlay}
                                                                onPress={this.playPause}
                                                            />

                                                            <Icon
                                                                name="forward"
                                                                style={styles().icon_overlay}
                                                                onPress={this.forward}
                                                            />
                                                            <View style={styles().sliderCont}>
                                                                <View style={styles().timer}>
                                                                    <Text style={{ color: "white" }}>
                                                                        {this.getTime(currentTime)} /
                                                                        {this.getTime(duration)}
                                                                    </Text>
                                                                    {!isNaN(currentTime) &&
                                                                        currentTime > 0.1 && (
                                                                            <Slider
                                                                                // we want to add some param here
                                                                                maximumTrackTintColor="white"
                                                                                minimumTrackTintColor="white"
                                                                                // now the slider and the time will work
                                                                                thumbTintColor="white"
                                                                                // slier input is 0 - 1 only so we want to convert sec to 0 - 1
                                                                                value={currentTime / duration}
                                                                                onValueChange={this.onslide}
                                                                                onSlidingComplete={
                                                                                    this.onSlidingComplete
                                                                                }
                                                                                style={{ width: "60%" }}
                                                                            />
                                                                        )}
                                                                    <Icon
                                                                        onPress={this.fullscreen}
                                                                        name={
                                                                            fullscreen ? "compress" : "expand"
                                                                        }
                                                                        style={{
                                                                            fontSize: 25,
                                                                            color: "white",
                                                                        }}
                                                                    />
                                                                </View>
                                                            </View>
                                                        </View>
                                                    ) : (
                                                        <View style={styles().overlaySet}>
                                                            <TouchableWithoutFeedback
                                                                onPress={this.youtubeSeekLeft}
                                                            >
                                                                <View style={{ flex: 1 }} />
                                                            </TouchableWithoutFeedback>
                                                            <TouchableWithoutFeedback
                                                                onPress={this.youtubeSeekRight}
                                                            >
                                                                <View style={{ flex: 1 }} />
                                                            </TouchableWithoutFeedback>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    )
                                    // end video
                                }
                                {
                                    article.articleType === "podcast" && (
                                        // /start podcast
                                        <View style={styles().container}>
                                            <View
                                                style={
                                                    fullscreen
                                                        ? styles().fullscreenVideo
                                                        : styles().podcast
                                                }
                                            >
                                                {this.articleImage}

                                                <View style={styles().overlay}>
                                                    {/* now we can remove this not */}
                                                    {overlay ? (
                                                        <View
                                                            style={{
                                                                ...styles().overlaySet,
                                                                backgroundColor: "#0006",
                                                            }}
                                                        >
                                                            <Icon
                                                                name="backward"
                                                                style={styles().icon_overlay}
                                                                onPress={this.backward_podcast}
                                                            />
                                                            {(GLOBAL.btmBarPlr[0] === undefined ||
                                                                article._id !==
                                                                GLOBAL.btmBarPlrInfos[0].articleId) && (
                                                                    <Icon
                                                                        name="play"
                                                                        style={styles().icon_overlay}
                                                                        onPress={this.playPause_podcast}
                                                                    />
                                                                )}

                                                            <Icon
                                                                name="forward"
                                                                style={styles().icon_overlay}
                                                                onPress={this.forward_podcast}
                                                            />
                                                            {article._id ===
                                                                GLOBAL.btmBarPlrInfos[0].articleId && (
                                                                    <View style={styles().sliderCont}>
                                                                        <View style={styles().timer}>
                                                                            <Text style={{ color: "white" }}>
                                                                                {this.getTime(
                                                                                    GLOBAL.btmBarPlrInfos[0].currentTime
                                                                                )}{" "}
                                                                                /{this.getTime(duration)}
                                                                            </Text>
                                                                            {!isNaN(
                                                                                GLOBAL.btmBarPlrInfos[0].currentTime
                                                                            ) &&
                                                                                GLOBAL.btmBarPlrInfos[0].currentTime >
                                                                                1 && (
                                                                                    <Slider
                                                                                        // we want to add some param here
                                                                                        maximumTrackTintColor="white"
                                                                                        minimumTrackTintColor="white"
                                                                                        // now the slider and the time will work
                                                                                        thumbTintColor="white"
                                                                                        // slier input is 0 - 1 only so we want to convert sec to 0 - 1
                                                                                        value={
                                                                                            GLOBAL.btmBarPlrInfos[0]
                                                                                                .currentTime / duration
                                                                                        }
                                                                                        onValueChange={
                                                                                            this.onslide_podcast
                                                                                        }
                                                                                        style={{ width: "70%" }}
                                                                                    />
                                                                                )}
                                                                        </View>
                                                                    </View>
                                                                )}
                                                        </View>
                                                    ) : (
                                                        <View style={styles().overlaySet}>
                                                            <TouchableNativeFeedback
                                                                onPress={this.youtubeSeekLeft_podcast}
                                                            >
                                                                <View style={{ flex: 1 }} />
                                                            </TouchableNativeFeedback>
                                                            <TouchableNativeFeedback
                                                                onPress={this.youtubeSeekRight_podcast}
                                                            >
                                                                <View style={{ flex: 1 }} />
                                                            </TouchableNativeFeedback>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    )

                                    // end podcast
                                }

                                <TouchableWithoutFeedback
                                    onPress={this.handleDoubleTapFavorite}
                                >
                                    <View style={styles().bodyContainer}>
                                        {this.articleBody}
                                    </View>
                                </TouchableWithoutFeedback>
                             </View>
                            </GestureDetector>

                            <ArticleQuestions
                                articleId={articleId}
                                setToast={(text) => this.setToast(text)}
                                showTotal={totalLikesDislikesEnabled}
                            />

                            <FurtherRecommendations
                                furRecNewsArticles={furRecNewsArticles}
                                isLoading={isLoading}
                                limitArticles={limit}
                                experimentConfig={experimentConfig}
                                onPress={this.pauseVideo}
                            />

                            <View style={styles().containerImprint}>
                                <TouchableNativeFeedback
                                    onPress={() => {
                                        navigation.navigate("Contact");
                                    }}
                                >
                                    <Text
                                        style={[
                                            newsArticlesStyleGenerator().paragraph,
                                            { marginBottom: 0, textDecorationLine: "underline" },
                                        ]}
                                    >
                                        {I18n.t("SETTINGS.IMPRINT")}
                                    </Text>
                                </TouchableNativeFeedback>
                            </View>

                            {/* Additional empty space is added, in order to make sure that the floating button does not
                            cover any elements at the end. The space is added only if the floating button appears, but the
                            bottom player does not. */}
                            {fromArticleScreen && GLOBAL.btmBarPlr[0] === undefined && (
                                <View style={{ paddingTop: 30 }} />
                            )}
                    </ScrollView>

                    {GLOBAL.btmBarPlr[0] !== undefined && (
                        <BottomBarMusicPlayer shrinked={fromArticleScreen ? 1 : 0} />
                    )}

                    {(
                        <FloatingAction
                            onPressMain={() => {
                                navigation.navigate("Home");
                            }}
                            showBackground={false}
                            floatingIcon={NAVIGATION_ICONS.home.active}
                            iconWidth={20}
                            iconHeight={20}
                            color={DynamicColors.getColors().ACCENT_BACKGROUND}
                        />
                    )}

                    {/* this is to have blackscreen when returning from fullscreen to normal */}
                    {fullscreen && <View style={styles().containerFullscreen} />}

                    {this.state.errorToast && (
                        <View style={styles().toast}>
                            <Toast error>{this.state.errorToast}</Toast>
                        </View>
                    )}
                </View>
        );
    }

}

InnerArticle.propTypes = {
    articleId: PropTypes.string.isRequired,
    isLoading: PropTypes.bool.isRequired,
    totalLikesDislikesEnabled: PropTypes.bool.isRequired,
    isInReadingList: PropTypes.bool.isRequired,
    isInArchive: PropTypes.bool.isRequired,
    explanationArticle: PropTypes.array.isRequired,
    furRecNewsArticles: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.object,
    ]),
    article: PropTypes.object,
    navigation: PropTypes.object.isRequired,
    experimentConfig: PropTypes.object.isRequired,
    primaryCategory: PropTypes.string.isRequired,
    limit: PropTypes.number.isRequired,
    headerHeight: PropTypes.number.isRequired,
    fromArticleScreen: PropTypes.bool.isRequired,
    maxScrolledContentDB: PropTypes.number.isRequired,
};

InnerArticle.defaultProps = {
    article: {},
    furRecNewsArticles: [],
};

const styles = () => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
        alignItems: 'center',
        justifyContent: 'center',
    },
    containerFullscreen: {
        ...StyleSheet.absoluteFillObject,
        color: 'black',
        backgroundColor: 'black',
        height: '100%',
    },
    headerContainer: {
        marginTop: CONTAINER_MARGIN_TOP,
        marginBottom: 15,
        paddingTop: 15,
        paddingHorizontal: 20,
    },
    articleImg: {
        marginBottom: 15,
    },
    containerImprint: {
        flexDirection: 'row',
        padding: 20,
    },
    bodyContainer: {
        paddingHorizontal: 20,
    },
    scrollView: {
        width: '100%',
    },
    scrollViewContent: {
        justifyContent: 'flex-start',
    },
    bookmarkIcon: {
        width: 17,
        height: 22,
        tintColor: DynamicColors.getColors().CARD_TEXT,
    },
    starIcon: {
        width: 22,
        height: 22,
        tintColor: DynamicColors.getColors().CARD_TEXT,
    },
    explanationIcon: {
        width: 22,
        height: 22,
        tintColor: DynamicColors.getColors().CARD_TEXT,
    },
    arrowButtonContainer: {
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 20,
        paddingRight: 20,
    },
    backArrowIcon: {
        width: 25,
        height: 25,
        tintColor: DynamicColors.getColors().PRIMARY_TEXT,
    },
    toast: {
        position: 'absolute',
        width: '75%',
        left: '12.5%',
        top: 20,
    },
    // VIDEO

    buttons: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    overlaySet: {
        flex: 1,
        flexDirection: 'row',
    },
    icon: {
        color: 'white',
        flex: 1,
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: 25,
    },
    icon_overlay: {
        color: 'white',
        flex: 1,
        textAlign: 'center',
        fontSize: 25,
        top: 90,
    },
    sliderCont: {
        position: 'absolute',
        left: 15,
        right: 15,
        bottom: 10,
    },
    timer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    video: { width: fullWidth, height: fullWidth * 0.6, backgroundColor: 'black' },
    podcast: { width: fullWidth, height: fullWidth * 0.56, backgroundColor: 'black' },
    fullscreenVideo: {
        backgroundColor: 'black',
        ...StyleSheet.absoluteFill,
        elevation: 1,
    },
    // END VIDEO
});

const Article = (props) => {
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    return (
        <InnerArticle
            insets={insets}
            // React Navigation: get stack header height
            headerHeight={headerHeight}
            {...props}
        />
    );
};

export default withTracker(({ navigation }) => {
    const articleId = navigation.getParam('articleId', null);
    const primaryCategory = navigation.getParam('primaryCategory', null);
    const limit = navigation.getParam('maxNrFurtherRecArticles', null);
    const newsLimit = options.get('limit');
    const date = options.get('date');
    const isUpdated = options.get('isUpdated');

    if (!articleId || !primaryCategory) {
        return {
            isLoading: false,
            notFound: true,
        };
    }

    // Reuse subscription from Home.js for newsArticlesJoined so we cover all articles loaded but not too many
    const newsArticlesInReadingListSubscription = Meteor.subscribe('newsArticlesInReadingList');
    const newsArticlesInArchiveSubscription = Meteor.subscribe('newsArticlesInArchive');
    const furtherRecommendedNewsArticlesSubscription = Meteor.subscribe('furtherRecommendedNewsArticles',
        limit, primaryCategory, articleId);
    const articleViewsSubscription = Meteor.subscribe('articleViews', articleId);
    const articleViewsUpgradeSubscription = Meteor.subscribe('articleViewsUpgrade');
    // console.log(articleViewsUpgradeSubscription);

    const article = collectionManager.collection('newsArticlesJoined')
        .findOne(articleId)
        || collectionManager.collection('newsArticlesInReadingList')
            .findOne(articleId)
        || collectionManager.collection('newsArticlesInArchive')
            .findOne(articleId)
        || collectionManager.collection('furtherRecommendedNewsArticles')
            .findOne(articleId)
        || {};

    const furRecNewsArticles = collectionManager.collection('furtherRecommendedNewsArticles')
        .find({
            primaryCategory,
            _id: { $ne: articleId },
        }, {
            limit,
            sort: {
                prediction: -1,
                datePublished: -1,
            },
        });

    const newsArticlesSubscription = Meteor.subscribe('newsArticlesJoined', newsLimit, date);
    const recList = collectionManager.collection('newsArticlesJoined').find({}, {
        newsLimit,
        sort: { prediction: -1, datePublished: -1 },
    });
    const newsNum = recList._docs.length;
    options.set('curNews',newsNum);
    if(newsLimit>LIMIT_ARTICLES && newsNum == newsLimit){
        options.set('isUpdated', false);
    }
    var nextNews = articleId;
    for(var i=0; i<newsNum; i++){
        if(articleId === recList._docs[i]._id){
            nextNews = recList._docs[(i+1) % newsNum]._id;
            if(!isUpdated && i == newsNum-1){
                options.set('isUpdated', true);
                options.set('limit', options.get('limit') + LIMIT_ARTICLES);
            }
            break;
        }
    }

    const cleanArticleId = removeWeirdMinusSignsInFrontOfString(articleId);
    const articleViews = collectionManager.collection('articleViews')
        .findOne({
            articleId: cleanArticleId,
            userId: MeteorOffline.user()._id,
        });
    const articleViewsUpgrade = collectionManager.collection('articleViewsUpgrade')
    .findOne({
        userId: MeteorOffline.user()._id,
    });
    // console.log(articleViewsUpgrade);

    // Also reuse subscription from Home.js for activeExperiment or experiments
    const config = collectionManager.collection('activeExperiment').findOne()
        || collectionManager.collection('experiments').findOne()
        || {};

    const isLoading = !newsArticlesInReadingListSubscription.ready()
        || !newsArticlesInArchiveSubscription.ready()
        || !furtherRecommendedNewsArticlesSubscription.ready()
        || !articleViewsSubscription.ready()
        || article._id !== articleId;
        // || !articleViewsUpgradeSubscription.ready()
        // todo: activate again when articleViewsUpgrade is on prod server




    const totalLikesDislikesEnabled = config.totalLikesDislikesEnabled ? config.totalLikesDislikesEnabled : false;
    const maxNrFurtherRecArticles = config.maxNrFurtherRecArticles ? config.maxNrFurtherRecArticles : 0;
    const previewTitleLineHeight = config.previewTitleLineHeight ? config.previewTitleLineHeight : 2;
    const maxCharacterExplanationTagShort = config.maxCharacterExplanationTagShort
        ? config.maxCharacterExplanationTagShort : 5;
    const experimentConfig = { maxNrFurtherRecArticles, previewTitleLineHeight, maxCharacterExplanationTagShort };

    const isInReadingList = article && article.isInReadingList ? article.isInReadingList : false;
    const isInArchive = article && article.isInArchive ? article.isInArchive : false;
    let explanationArticle = article && article.explanationArticle ? article.explanationArticle : [];
    const maxScrolledContentDB = articleViews && articleViews.maxScrolledContent ? articleViews.maxScrolledContent : 0;

    const currentOffsetValue = articleViews && articleViews.currentOffsetValue ? articleViews.currentOffsetValue : 0;
   
    // fromArticleScreen is necessary to know whether to load the Article explanations or to not
    const fromArticleScreen = navigation.getParam('fromArticleScreen', false);
    if (fromArticleScreen) {
        explanationArticle = [];
    }

    return {
        articleId,
        isLoading,
        article,
        totalLikesDislikesEnabled,
        isInReadingList,
        isInArchive,
        explanationArticle,
        furRecNewsArticles,
        experimentConfig,
        primaryCategory,
        limit,
        fromArticleScreen,
        maxScrolledContentDB,
        nextNews,
        currentOffsetValue,
    };
})(withColor(withNavigation(Article)));
