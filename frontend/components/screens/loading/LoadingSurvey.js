import React from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { DynamicColors, withColor } from '../../../styles';

function LoadingSurvey() {
    return (
        <View style={styles().container}>
            <ActivityIndicator size="small" color={DynamicColors.getColors().CARD_TEXT} />
        </View>
    );
}

const styles = () => {
    return StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
        },
    });
};

export default withColor(LoadingSurvey);