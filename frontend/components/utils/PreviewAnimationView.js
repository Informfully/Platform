import React from 'react';
import { Animated } from 'react-native';
import PropTypes from 'prop-types';

export default class PreviewAnimationView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            fadeAnim: new Animated.Value(0),
            shakeAnim: new Animated.Value(0)
        };
    }

    componentDidMount() {
        const { fadeAnim } = this.state;
        const { index, fastAnimate } = this.props;
        Animated.timing(
            fadeAnim,
            {
                toValue: 1,
                duration: fastAnimate ? 250 : 500,
                delay: fastAnimate ? 0 : 150 * index,
                useNativeDriver: true,
            },
        ).start();
    }

    componentDidUpdate(prevProps) {
        let { shakeAnim } = this.state;
        if (prevProps.shake != this.props.shake) {
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true })
            ]).start();
        }
    }

    get animationStyle() {
        const { fadeAnim, shakeAnim } = this.state;
        return {
            opacity: fadeAnim,
            transform: [{
                translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                })
            }, {
                translateX: shakeAnim.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-50, 50],
                }),
            }],
        };
    }

    render() {
        const { style, children } = this.props;

        return (
            <Animated.View
                style={{
                    ...style,
                    ...this.animationStyle,
                }}
            >
                { children}
            </Animated.View>
        );
    }
}

PreviewAnimationView.propTypes = {
    style: PropTypes.object,
    children: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    index: PropTypes.number,
    fastAnimate: PropTypes.bool,
};

PreviewAnimationView.defaultProps = {
    style: {},
    children: [],
    index: 0,
    fastAnimate: true,
};
