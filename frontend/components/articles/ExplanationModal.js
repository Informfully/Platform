/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import PropTypes from 'prop-types';
import {
    Modal, ScrollView, View, Text, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../elements/Button';
import { DynamicColors, newsArticlesStyleGenerator, withColor } from '../../styles';
import I18n from '../../lib/i18n/i18n';

class InnerExplanationModal extends React.Component {

    render() {
        const {
            isVisible,
            closeModal,
            explanationArticle,
            animationType,
            transparent,
            insets,
        } = this.props;

        return (
            <Modal
                animationType={animationType}
                transparent={transparent}
                visible={isVisible}
                onRequestClose={closeModal}
            >
                <View style={styles().outerContainer}>
                    <View style={styles().innerContainer}>

                        <ScrollView
                            contentContainerStyle={[ styles().scrollViewContent, { paddingBottom: insets.bottom }]}
                            scrollIndicatorInsets={{ right: 1 }}
                        >
                            <View style={styles().contentContainer}>

                                <View style={styles().titleContainer}>
                                    <Text style={newsArticlesStyleGenerator().subTitle}>
                                        {I18n.t('EXPLANATION_MODAL.TITLE')}
                                    </Text>
                                </View>
                                <View style={[styles().explanationContainer]}>
                                    {explanationArticle.map(({
                                        _id,
                                        backgroundColorLight,
                                        backgroundColorDark,
                                        detailedExplanation,
                                        textColorLight,
                                        textColorDark,
                                        textLong,
                                    }) => (
                                        <View key={_id}>
                                            <View style={styles().explanationTagContainer}>
                                                <View style={{
                                                    backgroundColor: DynamicColors.isDarkMode()
                                                        ? backgroundColorDark : backgroundColorLight,
                                                    borderRadius: 8,
                                                }}
                                                >
                                                    <Text style={[ newsArticlesStyleGenerator().explanationTag, {
                                                        color: DynamicColors.isDarkMode()
                                                            ? textColorDark : textColorLight,
                                                    }]}
                                                    >
                                                        {textLong}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={newsArticlesStyleGenerator().paragraph}>
                                                {detailedExplanation}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                        <View style={styles().buttonContainer}>
                            <Button
                                contentContainerStyle={styles().navigationButton}
                                onPress={closeModal}
                                key="survey-navigationButton-back"
                            >
                                {I18n.t('EXPLANATION_MODAL.CLOSE')}
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

}

InnerExplanationModal.defaultProps = {
    animationType: 'fade',
    transparent: true,
};

InnerExplanationModal.propTypes = {
    isVisible: PropTypes.bool.isRequired,
    closeModal: PropTypes.func.isRequired,
    animationType: PropTypes.string,
    transparent: PropTypes.bool,
};

const styles = () => StyleSheet.create({
    outerContainer: {
        flexDirection: 'column',
        backgroundColor: 'rgba(0,0,0,0.5)',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerContainer: {
        flexDirection: 'column',
        maxWidth: '90%',
        maxHeight: '90%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
        borderRadius: 8,
    },
    scrollViewContent: {
        justifyContent: 'center',
        alignItems: 'center',
        margin: 6,
    },
    contentContainer: {
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
        borderRadius: 8,
    },
    buttonContainer: {
        paddingTop: 12,
        paddingRight: 12,
        paddingLeft: 12,
        flexDirection: 'row',
    },
    navigationButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingRight: 24,
        paddingLeft: 24,
    },
    explanationContainer: {
        flexDirection: 'column',
        paddingLeft: 24,
        paddingRight: 24,
    },
    explanationTagContainer: {
        flexDirection: 'row',
        marginBottom: 4,
    },
});

const ExplanationModal = (props) => {
    const insets = useSafeAreaInsets();
    return (
        <InnerExplanationModal
            insets={insets}
            {...props}
        />
    );
};

export default withColor(ExplanationModal);
