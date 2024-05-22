import React from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { DynamicColors, withColor } from '../../styles'

function Loading() {
    return (
        <View style={styles().container}>
            <ActivityIndicator size="small" color={DynamicColors.getColors().PRIMARY_TEXT} />
        </View>
    );
}

export default withColor(Loading);

const styles = () => StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
    },
});
