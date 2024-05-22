import React from 'react';
import {
    StyleSheet,
    View,
    Text,
} from 'react-native';
import PropTypes from 'prop-types';
import { DynamicColors, newsArticlesStyleGenerator, withColor } from '../../styles';
import Preview from './Preview';
import { estimateReadTimeMinutes } from '../utils/ReadTimeEstimator';
import Loading from '../screens/Loading';
import Toast from '../elements/Toast';
import I18n from '../../lib/i18n/i18n';

class FurtherRecommendations extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};
    }

    get newsArticles() {
        const { furRecNewsArticles, experimentConfig } = this.props;
        const { isLoadingInitialSet } = this.state;

        return furRecNewsArticles.map(({
            _id,
            image,
            body,
            ...article
        }, index) => (
            <Preview
                _id={_id}
                key={_id}
                {...article}
                {...experimentConfig}
                index={index}
                image={image}
                isInInitialSet={isLoadingInitialSet}
                readTimeMinutes={estimateReadTimeMinutes(body)}
                setToast={err => this.setErrorToast(err)}
            />
        ));
    }

    get emptyFurRecListMessage() {
        return (
            <Text style={styles().text}>{I18n.t('FUR_RECOMMENDED_LIST.FUR_RECOMMENDED_LIST_EMPTY')}</Text>
        );
    }

    get hasArticlesInFurRecList() {
        const { furRecNewsArticles } = this.props;
        return furRecNewsArticles && furRecNewsArticles.count() > 0;
    }

    setErrorToast(text) {
        this.setState({ errorToast: text });
        clearTimeout(this.errorToastTimer);
        this.errorToastTimer = setTimeout(
            () => this.setState({ errorToast: false }),
            5000
        );
    }

    render() {
        const { isLoading, limitArticles } = this.props;

        if (isLoading) {
            return (
                <Loading />
            );
        }

        if (limitArticles === 0) {
            return null;
        }

        if (!this.hasArticlesInFurRecList) {
            return (
                <View style={styles().container}>
                    <View style={styles().subTitleContainer}>
                        <Text style={newsArticlesStyleGenerator().subTitle}>
                            {I18n.t('GLOBAL.FUR_RECOMMENDED_ARTICLES')}
                        </Text>
                    </View>
                    <View style={styles().loadingContainer}>
                        {this.emptyFurRecListMessage}
                    </View>
                </View>
            );
        }

        return (
            <View style={styles().container}>
                <View style={styles().subTitleContainer}>
                    <Text style={newsArticlesStyleGenerator().subTitle}>
                        {I18n.t('GLOBAL.FUR_RECOMMENDED_ARTICLES')}
                    </Text>
                </View>
                <View style={styles().newsArticlesContainer}>
                    {this.newsArticles}
                    {this.state.errorToast
                    && (
                        <View style={styles().toast}>
                            <Toast
                                error
                            >
                                {this.state.errorToast}
                            </Toast>
                        </View>
                    )
                    }
                </View>
            </View>
        );
    }

}

FurtherRecommendations.propTypes = {
    furRecNewsArticles: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.object,
    ]),
    isLoading: PropTypes.bool.isRequired,
    limitArticles: PropTypes.number.isRequired,
    experimentConfig: PropTypes.object.isRequired,
};

FurtherRecommendations.defaultProps = {
    furRecNewsArticles: [],
};


const styles = () => StyleSheet.create({
    container: {
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
        flexDirection: 'column',
        flex: 1,
    },
    subTitleContainer: {
        paddingHorizontal: 20,
    },
    newsArticlesContainer: {
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    toast: {
        position: 'absolute',
        width: '75%',
        left: '12.5%',
        top: 20,
    },
    loadingContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 15,
    },
    text: {
        color: DynamicColors.getColors().PRIMARY_TEXT,
    },
});

export default withColor(FurtherRecommendations);
