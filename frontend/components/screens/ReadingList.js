import React from 'react';
import {
    StyleSheet, Text, View, Dimensions, ScrollView, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Meteor, { withTracker } from '@meteorrn/core';
import PropTypes from 'prop-types';
import I18n from '../../lib/i18n/i18n';
import { DynamicColors, withColor } from '../../styles';
import { collectionManager } from '../../lib/utils/collectionManager';
import Preview from '../articles/Preview';
import { estimateReadTimeMinutes } from '../utils/ReadTimeEstimator';
import Loading from './Loading';
import Toast from '../elements/Toast';
import * as NavigationBar from 'expo-navigation-bar';

const fullWidth = Dimensions.get('window').width;

class InnerReadingList extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};
    }

    get newsArticles() {
        const { newsArticlesInReadingList, experimentConfig } = this.props;
        const { isLoadingInitialSet } = this.state;

        return newsArticlesInReadingList.map(({
            _id,
            image,
            body,
            ...article
        }, index) => (
            <Preview
                _id={_id}
                key={_id}
                setToast={() => this.setToast}
                {...article}
                {...experimentConfig}
                index={index}
                image={image}
                isInInitialSet={isLoadingInitialSet}
                readTimeMinutes={estimateReadTimeMinutes(body)}
            />
        ));
    }

    get emptyReadingListMessage() {
        return (
            <Text style={styles().text}>{I18n.t('READING_LIST.READING_LIST_EMPTY')}</Text>
        );
    }

    get hasArticlesInReadingList() {
        const { newsArticlesInReadingList } = this.props;
        return newsArticlesInReadingList.count() > 0;
    }

    get numberOfArticles() {
        const { newsArticlesInReadingList } = this.props;
        return newsArticlesInReadingList.count() || 0;
    }

    setToast(text) {
        this.setState({ errorToast: text });
        clearTimeout(this.errorToastTimer);
        this.errorToastTimer = setTimeout(
            () => this.setState({ errorToast: false }),
            5000
        );
    }


    render() {
        const { isLoading, insets } = this.props;

        if (isLoading) {
            return (
                <Loading />
            );
        }

        if (!this.hasArticlesInReadingList) {
            return (
                <View style={styles().loadingContainer}>
                    {this.emptyReadingListMessage}
                </View>
            );
        }
        if(Platform.OS === 'android'){
            NavigationBar.setBackgroundColorAsync(DynamicColors.getColors().PRIMARY_BACKGROUND);
        }

        return (
            <View style={styles().container}>
                {Platform.OS === 'ios' ? <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} /> : <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} backgroundColor={DynamicColors.getColors().PRIMARY_BACKGROUND}/>}
                <ScrollView
                    scrollEventThrottle={100}
                    refreshControl={this.refreshControl}
                    contentContainerStyle={styles().scrollView}

                    // FIX for bug in ios 13, scroll Views all over the place
                    scrollIndicatorInsets={{ right: 1 }}
                >
                    {this.newsArticles}
                    <View style={{ height: insets.bottom }} />
                </ScrollView>
                { this.state.errorToast
                    && (
                        <View style={styles().toast}>
                            <Toast error>
                                {this.state.errorToast}
                            </Toast>
                        </View>
                    )
                }
            </View>
        );
    }

}

InnerReadingList.propTypes = {

    // TODO: Check why we get objects in empty cases (Meteor?)
    newsArticlesInReadingList: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.object,
    ]),
    isLoading: PropTypes.bool.isRequired,
    experimentConfig: PropTypes.object.isRequired,
};

InnerReadingList.defaultProps = {
    newsArticlesInReadingList: [],
    experimentConfig: { maxNrFurtherRecArticles: 0, previewTitleLineHeight: 2, maxCharacterExplanationTagShort: 5 },
};

const styles = () => StyleSheet.create({
    loadingContainer: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
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
    screenContainer: {
        width: fullWidth,
    },
    screen: {
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1,
    },
    text: {
        color: DynamicColors.getColors().PRIMARY_TEXT,
    },
    toast: {
        position: 'absolute',
        width: '75%',
        left: '12.5%',
        top: 20,
    },
});

const ReadingList = (props) => {
    const insets = useSafeAreaInsets();
    return (
        <InnerReadingList
            insets={insets}
            {...props}
        />
    );
};

export default withTracker(() => {
    const newsArticlesInReadingListSubscription = Meteor.subscribe('newsArticlesInReadingList');

    const isLoading = !newsArticlesInReadingListSubscription.ready();
    const newsArticlesInReadingList = collectionManager.collection('newsArticlesInReadingList').find(
        {}, { sort: { datePublished: -1 } }
    );

    // Reuse subscription from Home.js for activeExperiment or experiments
    const config = collectionManager.collection('activeExperiment').findOne() || collectionManager.collection('experiments').findOne() || {};
    const maxNrFurtherRecArticles = config.maxNrFurtherRecArticles ? config.maxNrFurtherRecArticles : 0;
    const previewTitleLineHeight = config.previewTitleLineHeight ? config.previewTitleLineHeight : 2;
    const maxCharacterExplanationTagShort = config.maxCharacterExplanationTagShort ? config.maxCharacterExplanationTagShort : 5;
    const experimentConfig = { maxNrFurtherRecArticles, previewTitleLineHeight, maxCharacterExplanationTagShort };

    return {
        isLoading,
        newsArticlesInReadingList,
        experimentConfig,
    };
})(withColor(ReadingList));
