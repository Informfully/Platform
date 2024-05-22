import React, { Component } from 'react';
import {
    StyleSheet,
    Animated,
} from 'react-native';
import PropTypes from 'prop-types';
import { FONT_FAMILY } from '../../../styles/globals';
import { DynamicColors, withColor } from '../../../styles';
import Button from '../../elements/Button';
import { shallowEqualOnlyPrimitives } from '../../../lib/utils/utils';

class MultiSelectListItem extends Component {
    constructor(props) {
        super(props);

        this.state = {
            scaleValue: new Animated.Value(0),
        };

        this.handlePress = this.handlePress.bind(this);
    }

    componentDidMount() {
        const { index } = this.props;
        const { scaleValue } = this.state;
        Animated.timing(scaleValue, {
            toValue: 1,
            duration: 300,
            delay: index * 50,
            useNativeDriver: true,
        }).start();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (!shallowEqualOnlyPrimitives(nextProps, this.props)
            || !shallowEqualOnlyPrimitives(nextState, this.state));
    }

    get animationStyle() {
        const { scaleValue } = this.state;
        return {
            opacity: scaleValue,
            transform: [{
                translateX: scaleValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                }),
            }],
        };
    }

    get buttonStyle() {
        const { selected } = this.props;
        if (selected) {
            return [styles().listItem, styles().listItemSelected];
        }

        return styles().listItem;
    }

    handlePress() {
        const { index, onPressItem } = this.props;
        onPressItem(index);
    }

    render() {
        const { text } = this.props;
        return (
            <Animated.View style={{ ...this.animationStyle }}>
                <Button
                    onPress={this.handlePress}
                    style={this.buttonStyle}
                >
                    {text}
                </Button>
            </Animated.View>
        );
    }
}

MultiSelectListItem.propTypes = {
    index: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
    selected: PropTypes.bool.isRequired,
    onPressItem: PropTypes.func.isRequired,
};

const styles = () => {
    return StyleSheet.create({
        listItem: {
            color: DynamicColors.getColors().CARD_TEXT,
            textAlign: 'center',
            paddingTop: 12,
            paddingBottom: 12,
            fontFamily: FONT_FAMILY.TEXT,
            borderWidth: 1,
            borderColor: DynamicColors.getColors().CARD_TEXT,
            borderRadius: 22,
            marginBottom: 8,
        },

        listItemSelected: {
            color: DynamicColors.getColors().PRIMARY_TEXT,
            backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
        },
    });
};

export default withColor(MultiSelectListItem);