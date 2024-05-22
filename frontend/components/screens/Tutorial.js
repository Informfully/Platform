import Carousel, { Pagination } from 'react-native-snap-carousel';
import React, { Component } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, Image, Alert, StatusBar
} from 'react-native';
import { withNavigation } from 'react-navigation';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Meteor from '@meteorrn/core';
import I18n from '../../lib/i18n/i18n';

import FloatingHomeNavigation from '../navigator/FloatingHomeNavigator';
import { DynamicColors, FONT_FAMILY, withColor } from '../../styles';
import { FONT_SIZE, FONT_WEIGHT } from '../../styles/variables/fonts';
import StorageKeys from '../utils/StorageKeys';
import Button from '../elements/Button';
import { execute } from '../utils/RemoteExecutionHandler';
import * as NavigationBar from 'expo-navigation-bar';

const arrowLight = require('../../assets/arrow_light.png');

const articlePreviewSmall = require('../../assets/icons/tutorial/article_preview_small.png');
const articlePreviewLarge = require('../../assets/icons/tutorial/article_preview_large.png');
const articleDetail = require('../../assets/icons/tutorial/article_detail.png');

const bookmarkIconSolid = require('../../assets/icons/bookmarks/bookmark__white--solid.png');
const bookmarkIconBordered = require('../../assets/icons/bookmarks/bookmark__white--bordered.png');
const bookmarkIconChecked = require('../../assets/icons/bookmarks/bookmark__white--checked.png');

const starIconSolid = require('../../assets/icons/favourites/star__black--solid.png');
const starIconBordered = require('../../assets/icons/favourites/star__black--bordered.png');

class Tutorial extends Component {

    constructor(props) {
        super(props);

        this.state = {
            currentIndex: 0,
            notificationsAccepted: 0,
            carouselItems: [
                {
                    title: 'First Tut',
                },
                {
                    title: 'Second Tut',
                },
                {
                    title: 'Third Tut',
                },
                {
                    title: 'Fourth Tut',
                },
                {
                    title: 'Fifth Tut',
                },
            ],
            articleHandlingIntro: true,
            articleHandlingClick: false,
            articleHandlingLongPress: false,
        };

        this.renderItem = this.renderItem.bind(this);
        this.renderBookmarkCard = this.renderBookmarkCard.bind(this);
        this.renderFlaotingButtonTutorial = this.renderFlaotingButtonTutorial.bind(this);
        this.renderPermissionCard = this.renderPermissionCard.bind(this);
        this.renderEndtutorial = this.renderEndtutorial.bind(this);
        this.handleClickImage = this.handleClickImage.bind(this);
        this.onLongPressImage = this.onLongPressImage.bind(this);
        this.handlePressBack = this.handlePressBack.bind(this);
        this.onLongPressImageBack = this.onLongPressImageBack.bind(this);
    }


    finishiTutorial() {
        AsyncStorage.setItem(StorageKeys.TUTORIAL, JSON.stringify(true)).then(() => {
            this.setState({ currentIndex: 0 });
            this.carousel.snapToItem(0);
            this.props.navigation.navigate('Home');
        });
    }

    get articleHandlingIntro() {
        return (
            <View style={styles().card}>
                <Text style={styles().titleCard}>{I18n.t('TUTORIAL.TITLE_ARTICLE')}</Text>
                <Text style={styles().textCard}>{I18n.t('TUTORIAL.CLICK_ARTICLE')}</Text>
                <Text style={styles().textCard}>{I18n.t('TUTORIAL.PRESS_LONG_ARTICLE')}</Text>
                <Text style={styles().textCard}>{I18n.t('TUTORIAL.TRIAL')}</Text>
                <TouchableOpacity
                    onPress={this.handleClickImage}
                    onLongPress={this.onLongPressImage}
                >
                    <Image
                        style={styles().imageIntro}
                        source={articlePreviewSmall}
                    />
                </TouchableOpacity>
            </View>
        );
    }

    get articleHandlingClick() {
        return (
            <View style={styles().card}>
                <Image
                    style={styles().imageClick}
                    source={articleDetail}
                />
                <Button
                    onPress={this.handlePressBack}
                    style={styles().navigationButton}
                    contentContainerStyle={styles().navigationButtonContainer}
                    key="survey-navigationButton-back"
                >
                    {I18n.t('SURVEY_BUTTONS.BACK')}
                </Button>
            </View>
        );
    }

    get articleHandlingLongPress() {
        return (
            <View style={styles().card}>
                <Text style={styles().titleCard}>{I18n.t('TUTORIAL.TITLE_ARTICLE')}</Text>
                <Text />
                <Text style={styles().textCard}>{I18n.t('TUTORIAL.PRESS_LONG_ARTICLE_BACK')}</Text>
                <TouchableOpacity
                    onLongPress={this.onLongPressImageBack}
                >
                    <Image
                        style={styles().imageLongPress}
                        source={articlePreviewLarge}
                    />
                </TouchableOpacity>
            </View>
        );
    }

    handleClickImage() {
        this.setState({ articleHandlingIntro: false, articleHandlingClick: true });
    }

    onLongPressImage() {
        this.setState({ articleHandlingIntro: false, articleHandlingLongPress: true });
    }

    handlePressBack() {
        this.setState({ articleHandlingIntro: true, articleHandlingClick: false });
    }

    onLongPressImageBack() {
        this.setState({ articleHandlingIntro: true, articleHandlingLongPress: false });
    }

    renderLongClickTutorial(item) {
        const { articleHandlingIntro, articleHandlingClick, articleHandlingLongPress } = this.state;

        if (articleHandlingIntro) {
            return this.articleHandlingIntro;
        }
        if (articleHandlingClick) {
            return this.articleHandlingClick;
        }
        if (articleHandlingLongPress) {
            return this.articleHandlingLongPress;
        }
    }

    renderBookmarkCard(item) {
        return (
            <View style={styles().card}>
                <Text style={styles().titleCard}>{I18n.t('TUTORIAL.TITLE_BOOKMARK')}</Text>
                <View style={styles().entryContainer}>
                    <Text style={styles().textCard}>{I18n.t('TUTORIAL.BOOKMARK_ARTICLE')}</Text>
                    <View style={styles().bookmarkContainer}>
                        <Image
                            style={styles().bookmarkIcon}
                            source={bookmarkIconBordered}
                        />
                        <Image
                            style={styles().bookmarkIcon}
                            source={bookmarkIconSolid}
                        />
                    </View>
                </View>
                <View style={styles().entryContainer}>
                    <Text style={styles().textCard}>{I18n.t('TUTORIAL.FAVOURITE_ARTICLE')}</Text>
                    <View style={styles().bookmarkContainer}>
                        <Image
                            style={[ styles().bookmarkIcon, { width: 40 }]}
                            source={starIconBordered}
                        />
                        <Image
                            style={[ styles().bookmarkIcon, { width: 40 }]}
                            source={starIconSolid}
                        />
                    </View>
                </View>
                <Text />
            </View>
        );
    }

    renderPermissionCard(item) {
        const { notificationsAccepted } = this.state;

        return (
            <View style={styles().card}>
                <Text style={styles().titleCard}>{I18n.t('TUTORIAL.TITLE_NOTIFICATIONS')}</Text>
                {notificationsAccepted
                    ? <Text style={styles().textCard}>{I18n.t('TUTORIAL.NOTIFICATIONS_ACCEPTED')}</Text>
                    : (
                        <View>
                            <Text style={styles().textCard}>{I18n.t('TUTORIAL.NOTIFICATIONS_EXPLAIN')}</Text>

                        </View>
                    )}
                <Text />
            </View>
        );
    }

    renderFlaotingButtonTutorial(item) {
        return (
            <View style={styles().cardImage}>
                <View style={styles().innerCardImage}>
                    <Text style={styles().titleCard}>{I18n.t('TUTORIAL.TITLE_FLOATING_BUTTON')}</Text>
                    <Text style={styles().textCard}>{I18n.t('TUTORIAL.FLOATING_BUTTON')}</Text>
                </View>
                <Image
                    source={arrowLight}
                    style={styles().arrow}
                />
                <FloatingHomeNavigation
                    distanceToEdge={offsetFloatingButton}
                    deactivateButtons
                />
            </View>
        );
    }

    renderEndtutorial(item) {
        return (
            <View style={styles().card}>
                <Text style={styles().titleCard}>{I18n.t('TUTORIAL.TITLE_START')}</Text>
                <Button
                    style={styles().startButton}
                    onPress={() => this.finishiTutorial()}
                >
                    {I18n.t('TUTORIAL.START_BUTTON')}
                </Button>
                <View />
            </View>
        );
    }

    renderItem({ item, index }) {
        switch (index) {
        case 0:
            return this.renderLongClickTutorial(item);
        case 1:
            return this.renderBookmarkCard(item);
        case 2:
            return this.renderFlaotingButtonTutorial(item);
        case 3:
            return this.renderPermissionCard(item);
        default:
            return this.renderEndtutorial(item);
        }
    }

    renderPagination() {
        const { currentIndex, carouselItems } = this.state;
        return (
            <View style={styles().paginationContainer}>
                <Pagination
                    dotsLength={carouselItems.length}
                    activeDotIndex={currentIndex}
                    dotStyle={styles().activeDot}
                    inactiveDotStyle={styles().inactiveDot}
                />
            </View>
        );
    }

    render() {
        if(Platform.OS === 'android'){
            NavigationBar.setBackgroundColorAsync(DynamicColors.getColors().PRIMARY_BACKGROUND);
        }

        return (
            <View style={styles().container}>
                <Carousel
                    layout="default"
                    ref={ref => this.carousel = ref}
                    data={this.state.carouselItems}
                    sliderWidth={fullWidth}
                    itemWidth={widthCard}
                    renderItem={this.renderItem}
                    onSnapToItem={index => this.setState({ currentIndex: index })}
                />
                
                {Platform.OS === 'ios' ? <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} /> : <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} backgroundColor={DynamicColors.getColors().PRIMARY_BACKGROUND}/>}

                {this.renderPagination()}
            </View>
        );
    }

}

const heightPagination = 100;
const paddingCard = 8;
const offsetFloatingButton = { vertical: 30, horizontal: 25 };

const fullWidth = Dimensions.get('window').width;
const widthCard = fullWidth - 10;

const fullHeight = Dimensions.get('window').height - (Platform.OS === 'ios' ? getStatusBarHeight() : 0);
const cardHeight = fullHeight - heightPagination - 2 * paddingCard;

const arrowDimension = Math.min(cardHeight * 0.4, widthCard * 0.5);

const styles = () => StyleSheet.create({
    container: {
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
        paddingTop: (Platform.OS === 'ios' ? getStatusBarHeight() : 0) + 10,
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',

    },
    card: {
        width: widthCard,
        height: cardHeight,
        backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
        borderRadius: paddingCard,
        padding: paddingCard,
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardImage: {
        width: widthCard,
        height: cardHeight,
        backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
        borderRadius: paddingCard,
        padding: paddingCard,
    },
    innerCardImage: {
        width: widthCard,

        // Caluclate height of left over space from arrow, leaeve some space between
        height: Math.min(cardHeight - 3 * paddingCard - arrowDimension - (paddingCard + 30 - 0.17 * arrowDimension), cardHeight / 2),
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paginationContainer: {
        height: 100,
    },
    activeDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginHorizontal: 8,
        backgroundColor: DynamicColors.getColors().PAGINATION_ACTIVE,
    },
    inactiveDot: {
        backgroundColor: DynamicColors.getColors().PAGINATION_ACTIVE,
    },
    titleCard: {
        fontSize: FONT_SIZE.EXTRA_LARGE,
        fontWeight: FONT_WEIGHT.NORMAL,
        marginTop: 50,
        color: DynamicColors.getColors().CARD_TEXT,
    },
    textCard: {
        fontSize: FONT_SIZE.MEDIUM,
        fontWeight: FONT_WEIGHT.LIGHT,
        textAlign: 'center',
        paddingLeft: 20,
        paddingRight: 20,
        color: DynamicColors.getColors().CARD_TEXT,
    },
    arrow: {
        width: arrowDimension,
        height: arrowDimension,
        resizeMode: 'contain',
        position: 'absolute',
        // Allign lowest point of arrow with bottom of floating button
        // Consider aspect ratio of image
        bottom: paddingCard + 30 - 0.17 * arrowDimension,

        // Allign Arrow in front of the floating button
        right: 89,
        tintColor: DynamicColors.getColors().CARD_TEXT,

    },
    imageIntro: {
        resizeMode: 'contain',
        marginBottom: 30,
    },
    imageClick: {
        resizeMode: 'contain',
        // Card height minus padding and borderRadius of card minus paddingVertical, borderRadius, text height and
        // borderWidth of navigationButton minus marginTop of imageClick. Text height has been estimated to be max
        // at around 16.
        maxHeight: cardHeight - 2 * paddingCard - paddingCard - 2 * 12 - 16 - 1 - 22 - paddingCard,
        marginTop: paddingCard,
    },
    navigationButton: {
        flex: 1,
        color: DynamicColors.getColors().CARD_TEXT,
        textAlign: 'center',
        paddingVertical: 12,
        fontFamily: FONT_FAMILY.TEXT,
        borderWidth: 1,
        borderColor: DynamicColors.getColors().CARD_TEXT,
        borderRadius: 22,
        backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
    },
    navigationButtonContainer: {
        flexDirection: 'row',
        paddingHorizontal: paddingCard,
    },
    imageLongPress: {
        resizeMode: 'contain',
    },
    bookmarkContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: widthCard / 2,
        paddingTop: 20,
    },
    entryContainer: {
        flexDirection: 'column',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    bookmarkIcon: {
        width: 30,
        height: 40,
        tintColor: DynamicColors.getColors().CARD_TEXT,
    },
    startButton: {
        color: DynamicColors.getColors().ACCENT_TEXT,
        backgroundColor: DynamicColors.getColors().ACCENT_BACKGROUND,
        width: widthCard - 2 * paddingCard,
    },
});

export default withColor(withNavigation(Tutorial));
