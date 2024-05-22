import React, { Component } from 'react';
import {
    StyleSheet, View, ScrollView, ActivityIndicator, RefreshControl, StatusBar, Platform, Text, Alert,
} from 'react-native';
import Meteor, { withTracker, ReactiveDict, Mongo } from '@meteorrn/core';
import PropTypes from 'prop-types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Notifications from 'expo-notifications';
import Toast from '../elements/Toast';
import I18n from '../../lib/i18n/i18n';
import { estimateReadTimeMinutes } from '../utils/ReadTimeEstimator';
import Preview from '../articles/Preview';
import { DynamicColors, withColor } from '../../styles';
import { collectionManager } from '../../lib/utils/collectionManager';
import FloatingHomeNavigation from '../navigator/FloatingHomeNavigator';
import Loading from './Loading';
import BottomBarMusicPlayer from '../elements/bottomBarMusicPlayer';
import GLOBAL from '../utils/Global';
import { execute } from '../utils/RemoteExecutionHandler';
import * as NavigationBar from 'expo-navigation-bar';

const LIMIT_ARTICLES = 20;

const options = new ReactiveDict();
options.set('limit', LIMIT_ARTICLES);
options.set('date', new Date());

class InnerHome extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoadingInitialSet: true,
            isLoadingNew: false,
            toastsBlocked: false,
            newToastVisible: false,
            scrollToastVisible: false,
            oldNewsArticles: undefined, // cached old articles in case of reconnect
            bottomPlayer: false,
            homeBottomBarMusicPlayerState: undefined,
        };

        GLOBAL.btmBarPlrInfos[0] = {
            articleTitle: 'test0',
            articleId: undefined,
            isInReadingList: undefined,
            // navigation: undefined,
            isInArchive: undefined,
            primaryCategory: undefined,
            maxNrFurtherRecArticles: undefined,
            paused: false,
            duration: 1,
            currentTime: 1,
            articleUpdateFunction: undefined,
            homeScreenState: this,
            bottomBarMusicPlayerState: undefined,
        };
        GLOBAL.btmBarPlr[0] = undefined;

        this.handleScroll = this.handleScroll.bind(this);
        this.refreshSubscription = this.refreshSubscription.bind(this);
        this.toastsVisible = this.toastsVisible.bind(this);
        this.latestArticleDate = new Date(0);
        this.toastBlockedTimeout = undefined;
        this.scrollToastTimeout = undefined;
        this.newToastTimeout = undefined;
        this.timerId = undefined;
    }

    componentDidMount() {
        this.notificationObserver = setInterval(() => {
            this.checkNotification();
        }, 10000);
    }

    componentWillUnmount() {
        clearInterval(this.notificationObserver);
        clearTimeout(this.toastBlockedTimeout);
        clearTimeout(this.scrollToastTimeout);
        clearTimeout(this.newToastTimeout);
    }

    componentDidUpdate(prevProps) {
        const { isLoadingNew } = this.state;
        const { newsArticles, isSubscriptionLoading } = this.props;

        if (isLoadingNew && prevProps.newsArticles.count(true) < newsArticles.count(true)) {
            // eslint-disable-next-line react/no-did-update-set-state
            this.setState({ isLoadingNew: false });
        }

        if (!isSubscriptionLoading && prevProps.isSubscriptionLoading) {
            // eslint-disable-next-line react/no-did-update-set-state
            this.setState({ isLoadingInitialSet: false });
        }

        // if (prevProps.newsArticles.count(true) < newsArticles.count(true)) {
        //     this.setState({oldNewsArticles: newsArticles});
        // }
    }

    get newsArticles() {
        const { newsArticles, experimentConfig } = this.props;
        const { isLoadingInitialSet, currentLargePreview, oldNewsArticles } = this.state;

        // if (oldNewsArticles && oldNewsArticles.count(true) > newsArticles.count(true)) {
        //     newsArticles = oldNewsArticles;
        // }

        const newsArticlesNum = newsArticles._docs.length;
        const newNewsArticles = newsArticlesNum > 20 ? newsArticlesNum - 20 : 0;

        for(var i = newsArticlesNum - 1; i >= newNewsArticles; i--){
            Meteor.call('articleViews.create',newsArticles._docs[i]._id);
            Meteor.call('articleViewsUpgrade.create',newsArticles._docs[i]._id);
        }

        return newsArticles.map(({
            _id,
            image,
            body,
            articleType,
            multimediaURL,
            multimediaDurationInMillis,
            ...article
        }, index) => (
            <Preview
                _id={_id}
                key={_id}
                {...article}
                {...experimentConfig}
                index={index % LIMIT_ARTICLES}
                image={image}
                articleType={articleType}
                multimediaURL={multimediaURL}
                multimediaDurationInMillis={multimediaDurationInMillis}
                isInInitialSet={isLoadingInitialSet}
                readTimeMinutes={estimateReadTimeMinutes(body)}
                setToast={err => this.setErrorToast(err)}
                large={index === 0 || article.largePreview || _id == currentLargePreview}

                // If the preview can be enlarged and changed give handler, else not, also if already large make small
                onLongPress={index === 0 || article.largePreview || !article.lead
                    ? undefined
                    : () => this.setState({ currentLargePreview: currentLargePreview == _id ? undefined : _id })
                }
            />
        ));
    }

    get loadingIndicator() {

        if (this.timerId != null) {
            clearTimeout(this.timerId);
        }
        this.timerId = setTimeout(() => {
            options.set('isLoadedAll', true);
        }, 5000);

        return ( !options.get('isLoadedAll') ? (
            <View style={styles().loadingItem}>
                <ActivityIndicator size="small" color={DynamicColors.getColors().PRIMARY_TEXT} />
            </View>
        ) : (
            <View style={styles().loadedAllItem}>
                <Text style={styles().loadedAllText}>All News Loaded!</Text>
            </View>
        ));
    }

    get refreshControl() {
        const { isLoading } = this.props;
        return (
            <RefreshControl
                refreshing={isLoading}
                onRefresh={this.refreshSubscription}
            />
        );
    }

    setErrorToast(text) {
        this.setState({ errorToast: text });
        clearTimeout(this.errorToastTimer);
        this.errorToastTimer = setTimeout(
            () => this.setState({ errorToast: false }),
            5000
        );
    }


    checkNotification() {
        const newestArticle = collectionManager.collection('notification').findOne({}, { sort: { date: -1 } });

        if (newestArticle === undefined) {
            return;
        }

        if (newestArticle.date > this.latestArticleDate) {
            this.latestArticleDate = newestArticle.date;
            this.setNewToastVisible();
        }
    }

    refreshSubscription() {
        options.set('date', new Date());
        options.set('limit', LIMIT_ARTICLES);
    }

    isCloseToBottom({ layoutMeasurement, contentOffset, contentSize }) {
        const paddingBottom = 20;
        return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingBottom;
    }

    handleScroll({ nativeEvent }) {
        const { isLoadingNew } = this.state;
        const offset = nativeEvent.contentOffset.y;

        // Handle endless scrolling close to bottom
        if (!isLoadingNew && this.isCloseToBottom(nativeEvent)) {
            options.set('limit', options.get('limit') + LIMIT_ARTICLES);
            options.set('isLoadedAll',false);
            this.setState({ isLoadingNew: true });
            this.setToastsBlocked();
        }

        // Handle Scroll to top toast if user scrolls upwards, remove toast if user scrolls down again
        // Other possibilities, keep last few scroll positions and consider only if continous scroll to top or certain velocity
        if (!this.toastsVisible() && offset > 1000 && this.state.offset > offset && !this.isCloseToBottom(nativeEvent)) {
            this.setScrollToastVisible();
        } else if (this.state.scrollToastVisible && this.state.offset < offset) {
            clearTimeout(this.scrollToastTimeout);
            this.setState({ scrollToastVisible: false });
        }

        this.setState({ offset });
    }

    toastsVisible() {
        return this.state.scrollToastVisible || this.state.newToastVisible;
    }

    handleToastClick() {
        this.refs.scrollView.scrollTo({ y: 0 });
        this.setState({ newToastVisible: false, scrollToastVisible: false, toastsBlocked: true });
        this.setToastsBlocked();
        clearTimeout(this.scrollToastTimeout);
        clearTimeout(this.newToastTimeout);
    }

    setToastsBlocked(timeout = 3000) {
        this.setState({ toastsBlocked: true });
        clearTimeout(this.toastBlockedTimeout);
        this.toastBlockedTimeout = setTimeout(() => this.setState({ toastsBlocked: false }), timeout);
    }

    setNewToastVisible() {
        if (this.state.scrollToastVisible || this.state.newToastVisible || this.state.toastsBlocked) {
            return;
        }
        this.setState({ newToastVisible: true });
        clearTimeout(this.newToastTimeout);
        setTimeout(() => {
            this.setState({ newToastVisible: false });
            this.setToastsBlocked(1500);
        }, 5000);
    }

    setScrollToastVisible() {
        if (this.state.scrollToastVisible || this.state.newToastVisible || this.state.toastsBlocked) {
            return;
        }
        this.setState({ scrollToastVisible: true });
        clearTimeout(this.scrollToastTimeout);
        setTimeout(() => {
            this.setState({ scrollToastVisible: false });
            this.setToastsBlocked(1500);
        }, 5000);
    }

    render() {
        const {
            isLoadingNew, newToastVisible, oldNewsArticles, bottomPlayer,
        } = this.state;
        const { isLoading, insets } = this.props;
        if (isLoading && (!oldNewsArticles || oldNewsArticles.count(true) == 0)) {
            return (
                <Loading />
            );
        }

        if(Platform.OS === 'android'){
            NavigationBar.setBackgroundColorAsync(DynamicColors.getColors().PRIMARY_BACKGROUND);
        }

        return (
            <View style={styles().container}>
                {Platform.OS === 'ios'
                    ? <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} /> : <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} backgroundColor={DynamicColors.getColors().PRIMARY_BACKGROUND}/>}
                <ScrollView
                    ref="scrollView"
                    onScroll={this.handleScroll}
                    scrollEventThrottle={100}
                    refreshControl={this.refreshControl}
                    contentContainerStyle={styles().scrollView}

                    // FIX for bug in ios 13, scroll Views all over the place
                    scrollIndicatorInsets={{ right: 1 }}
                >
                    <View style={{ height: insets.top }} />
                    {this.newsArticles}
                    {isLoadingNew ? this.loadingIndicator : null}
                </ScrollView>
                {(bottomPlayer || GLOBAL.btmBarPlr[0] !== undefined)
                    && (
                        <BottomBarMusicPlayer
                            shrinked={1}
                            homescreen={1}
                        />
                    )
                }
                <FloatingHomeNavigation />
                {this.toastsVisible() && !this.state.errorToast
                && (
                    <View style={StyleSheet.flatten([ styles().toast, { top: 1.1 * insets.top }])}>
                        <Toast
                            onPress={() => this.handleToastClick()}
                        >
                            {newToastVisible ? I18n.t('GLOBAL.NEW_ARTICLES') : I18n.t('GLOBAL.SCROLL_TO_TOP')}
                        </Toast>
                    </View>
                )
                }


                {this.state.errorToast
                && (
                    <View style={StyleSheet.flatten([ styles().toast, { top: 1.1 * insets.top }])}>
                        <Toast
                            error
                        >
                            {this.state.errorToast}
                        </Toast>
                    </View>
                )
                }
            </View>
        );
    }

}

InnerHome.defaultProps = {
    newsArticles: [],
    experimentConfig: { maxNrFurtherRecArticles: 0, previewTitleLineHeight: 2, maxCharacterExplanationTagShort: 5 },
    isSubscriptionLoading: true,
    isLoading: true,
};

InnerHome.propTypes = {
    newsArticles: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.object,
    ]),
    experimentConfig: PropTypes.object,
    isSubscriptionLoading: PropTypes.bool,
    isLoading: PropTypes.bool,
};

const styles = () => StyleSheet.create({
    loadingContainer: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
    },
    loadedAllText: {
        color: DynamicColors.getColors().PRIMARY_TEXT,
    },
    loadingItem: {
        paddingTop: 15,
        paddingBottom: 30,
    },
    loadedAllItem: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 15,
        paddingBottom: 30,
    },
    container: {
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
        flex: 1,
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    scrollView: {
        justifyContent: 'flex-start',
        flexGrow: 1,
    },
    toast: {
        position: 'absolute',
        width: '75%',
        left: '12.5%',
    },
});

const Home = withColor((props) => {
    const insets = useSafeAreaInsets();
    return (
        <InnerHome
            insets={insets}
            {...props}
        />
    );
});


export default withTracker(() => {
    const date = options.get('date');
    const limit = options.get('limit');

    const newsArticlesSubscription = Meteor.subscribe('newsArticlesJoined', limit, date);
    const newsArticles = collectionManager.collection('newsArticlesJoined').find({}, {
        limit,
        sort: { prediction: -1, datePublished: -1 },
    });

    const notificationSubscription = Meteor.subscribe('notification');

    const configSubscription = Meteor.subscribe('experiments');
    const activeExperimentSubscription = Meteor.subscribe('activeExperiment');
    const config = collectionManager.collection('activeExperiment').findOne() || collectionManager.collection('experiments').findOne() || {};
    const maxNrFurtherRecArticles = config.maxNrFurtherRecArticles ? config.maxNrFurtherRecArticles : 0;
    const previewTitleLineHeight = config.previewTitleLineHeight ? config.previewTitleLineHeight : 2;
    const maxCharacterExplanationTagShort = config.maxCharacterExplanationTagShort ? config.maxCharacterExplanationTagShort : 5;
    const experimentConfig = { maxNrFurtherRecArticles, previewTitleLineHeight, maxCharacterExplanationTagShort };

    const isLoading = !newsArticles || newsArticles.count() === 0;
    const isSubscriptionLoading = !newsArticlesSubscription.ready() || !notificationSubscription.ready() || (!configSubscription.ready() && !activeExperimentSubscription.ready());

    return {
        isLoading,
        isSubscriptionLoading,
        newsArticles,
        experimentConfig,
    };
})(Home);
