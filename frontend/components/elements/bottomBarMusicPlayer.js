import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableWithoutFeedback,
    Dimensions,
} from 'react-native';
import { withNavigation } from 'react-navigation';
import Meteor from '@meteorrn/core';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@expo/vector-icons/FontAwesome5';
import PropTypes from 'prop-types';
import { withColor } from '../../styles';
import GLOBAL from '../utils/Global';
import { execute } from '../utils/RemoteExecutionHandler';


const fullWidth = Dimensions.get('window').width;

class BottomBarMusicPlayer extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            // Podcast
            overlay: true,
            currentTime: 0,
            duration: GLOBAL.btmBarPlrInfos[0].multimediaDurationInMillis,
            isPlaying: true,
            shrinked: props.shrinked,
            playbackInstance: GLOBAL.btmBarPlr[0],
            open: true,
            getsUpdates: false,
            lastHeartbeat: 0,
            paused: !props.homescreen,
        };

        if (props.homescreen) {
            GLOBAL.btmBarPlrInfos[0].homeScreenState.homeBottomBarMusicPlayerState = this;
        }

        GLOBAL.btmBarPlrInfos[0].bottomBarMusicPlayerState = this;

        this.handleClickGoToArticle = this.handleClickGoToArticle.bind(this);

        this._mounted = true;
    }

    async componentDidMount() {
        this.setState({ playbackInstance: GLOBAL.btmBarPlr[0] });
        GLOBAL.btmBarPlr[0].setOnPlaybackStatusUpdate(this.onPlaybackStatusUpdate);
        GLOBAL.btmBarPlrInfos[0].bottomBarMusicPlayerState = this;
        GLOBAL.btmBarPlrInfos[0].closePlayer = this.closePlayer;

        try {
            await Audio.setAudioModeAsync({
                staysActiveInBackground: true,
                interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
                interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
                shouldDuckAndroid: false,
                playThroughEarpieceAndroid: false,
                playsInSilentModeIOS: true,
            });
        } catch (e) {
            console.log(e);
        }
    }

    componentDidUpdate() {
        const { getsUpdates } = this.state;

        if (GLOBAL.btmBarPlr[0] !== undefined && !getsUpdates) {
            GLOBAL.btmBarPlrInfos[0].bottomBarMusicPlayerState = this;
            GLOBAL.btmBarPlr[0].setOnPlaybackStatusUpdate(this.onPlaybackStatusUpdate);
        }
    }

    async componentWillUnmount() {
        if (GLOBAL.btmBarPlr[0] !== undefined) {
            GLOBAL.btmBarPlr[0].setOnPlaybackStatusUpdate(undefined);
        }

        this.setState({
            playbackInstance: undefined,
        });

        this._mounted = false;
    }

    handleClickGoToArticle() {
        const { navigation } = this.props;
        const {
            articleId, isInReadingList, isInArchive, primaryCategory, maxNrFurtherRecArticles,
        } = GLOBAL.btmBarPlrInfos[0];
        navigation.navigate('Article', {
            articleId,
            isInReadingList,
            isInArchive,
            primaryCategory,
            maxNrFurtherRecArticles,
            fromArticleScreen: false,
        });

        // analytics insert
        execute(() => Meteor.call('podcastAnalytics.insert', GLOBAL.btmBarPlrInfos[0].articleId, 'clickOnBottomPlayer', GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
            if (err) {
                console.warn(err);
            }
        }));
        // end analytics insert
    }

    onPlaybackStatusUpdate = (status) => {
        if (this._mounted) {
            const { open } = this.state;
            this.setState({ getsUpdates: true });

            if (GLOBAL.btmBarPlr[0] !== undefined && !open) {
                this.setState({ open: true });
            }

            this.setState({
                isBuffering: status.isBuffering,
                paused: GLOBAL.btmBarPlrInfos[0].paused,
            });

            if (status.positionMillis !== undefined && !isNaN(status.positionMillis)) {
                GLOBAL.btmBarPlrInfos[0].currentTime = status.positionMillis;
            }

            if (GLOBAL.btmBarPlrInfos[0].articleUpdateFunction !== undefined) {
                GLOBAL.btmBarPlrInfos[0].articleUpdateFunction(status);
            }

            if (status.positionMillis - this.state.lastHeartbeat > 10000) {
                this.setState({
                    lastHeartbeat: status.positionMillis,
                });

                // analytics insert
                execute(() => Meteor.call('podcastAnalytics.insert', GLOBAL.btmBarPlrInfos[0].articleId, 'heartbeat', GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                    if (err) {
                        console.warn(err);
                    }
                }));
                // end analytics insert
            }
        }
    };

    closePlayer() {
        // stop current file
        if ((GLOBAL.btmBarPlr) !== undefined && (GLOBAL.btmBarPlr[0]) !== undefined) {
            GLOBAL.btmBarPlr[0].stopAsync();
            GLOBAL.btmBarPlr[0].unloadAsync();
        }

        GLOBAL.btmBarPlrInfos[0].homeScreenState.setState({ bottomPlayer: false });

        GLOBAL.btmBarPlrInfos[0].paused = true;

        GLOBAL.btmBarPlr[0] = undefined;

        // analytics insert
        execute(() => Meteor.call('podcastAnalytics.insert', GLOBAL.btmBarPlrInfos[0].articleId, 'closeBottomPlayer', GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
            if (err) {
                console.warn(err);
            }
        }));
        // end analytics insert
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
    };


    progress = (positionMillis) => {
        this.setState({ currentTime: positionMillis });
    }; // here the current time is upated

    backward = () => {
        const { currentTime } = this.state;
        GLOBAL.btmBarPlr[0].setPositionAsync(currentTime - 5000);
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => this.setState({ overlay: false }), 3000);
    };

    forward = () => {
        const { currentTime } = this.state;
        GLOBAL.btmBarPlr[0].setPositionAsync(currentTime + 5000);
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => this.setState({ overlay: false }), 3000);
    };

    playPause = async () => {
        GLOBAL.btmBarPlrInfos[0].paused ? await GLOBAL.btmBarPlr[0].playAsync() : await GLOBAL.btmBarPlr[0].pauseAsync();
        if (GLOBAL.btmBarPlrInfos[0].paused) {
            // analytics insert
            execute(() => Meteor.call('podcastAnalytics.insert', GLOBAL.btmBarPlrInfos[0].articleId, 'playBottomBarPlayer', GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                if (err) {
                    console.warn(err);
                }
            }));
            // end analytics insert
        } else {
            // analytics insert
            execute(() => Meteor.call('podcastAnalytics.insert', GLOBAL.btmBarPlrInfos[0].articleId, 'pauseBottomBarPlayer', GLOBAL.btmBarPlrInfos[0].currentTime, (err) => {
                if (err) {
                    console.warn(err);
                }
            }));
            // end analytics insert
        }

        GLOBAL.btmBarPlrInfos[0].paused = !GLOBAL.btmBarPlrInfos[0].paused;
        this.setState({ paused: GLOBAL.btmBarPlrInfos[0].paused });
    };

    shortenTitle(str) {
        const { shrinked } = this.state;

        if (str === undefined) {
            return 'undefined';
        }

        if (shrinked && str.length > 22) {
            return `${str.substring(0, 22)}...`;
        } if (!shrinked && str.length > 40) {
            return `${str.substring(0, 40)}...`;
        }

        return str;
    }


    render() {
        const {
            currentTime,
            duration,
            shrinked,
            paused,
            open,
        } = this.state;

        return (
            <View style={styles().root}>
                {open

                && (
                    <View style={styles().container}>

                        <View style={shrinked ? styles().innerContainer : styles().innerContainerStretched}>
                            <Icon
                                name={paused ? 'play' : 'pause'}
                                style={styles().icon}
                                onPress={this.playPause}
                            />
                            <TouchableWithoutFeedback style={styles().textContainer} onPress={this.handleClickGoToArticle}>

                                <View>

                                    <Text
                                        style={styles().title}
                                    >
                                        {this.shortenTitle(GLOBAL.btmBarPlrInfos[0].articleTitle)}
                                    </Text>
                                    <Text
                                        style={{ color: 'white' }}
                                    >
                                        {this.getTime(GLOBAL.btmBarPlrInfos[0].currentTime)}
                                        {' '}
                                        /
                                        {this.getTime(GLOBAL.btmBarPlrInfos[0].multimediaDurationInMillis)}
                                    </Text>
                                </View>

                            </TouchableWithoutFeedback>
                            {this.props.homescreen && <Icon name="times" style={styles().icon} onPress={this.closePlayer} />}
                        </View>

                        {shrinked === 1

                        && (
                            <LinearGradient
                                style={styles().gradient}
                                colors={[ 'rgba(050,050,050,0.8)', 'transparent' ]}
                                end={[ 0.9, 0 ]}
                            />
                        )
                        }
                    </View>
                )
                }
            </View>


        );
    }

}

BottomBarMusicPlayer.propTypes = {
    navigation: PropTypes.object.isRequired,
};


const styles = () => StyleSheet.create({
    title: {
        flexWrap: 'wrap',
        color: 'white',
    },
    innerContainer: {
        backgroundColor: 'rgba(050,050,050,0.8)',
        flexDirection: 'row',
    },
    innerContainerStretched: {
        backgroundColor: 'rgba(050,050,050,0.8)',
        flexDirection: 'row',
        width: fullWidth,
    },
    textContainer: {
        margin: 5,
        backgroundColor: 'transparent',
    },
    icon: {
        fontSize: 30,
        margin: 8,
        color: 'white',
        alignSelf: 'center',
    },
    spacer: {
        position: 'relative',
        marginBottom: 60,
        width: 1,
        height: 1,
    },
    root: {
        width: fullWidth,
    },
    container: {
        height: 60,
        flexDirection: 'row',
        bottom: 0,
        borderTopWidth: 2,
        borderTopColor: 'black',
    },
    gradient: {
        width: 100,
        marginRight: 50,
    },
});

export default withColor(withNavigation(BottomBarMusicPlayer));
