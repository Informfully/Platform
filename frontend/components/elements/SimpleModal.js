import React from 'react';
import PropTypes from 'prop-types';
import {
    Modal, SafeAreaView, View, StyleSheet,
} from 'react-native';

import Button from './Button';
import { DynamicColors, withColor } from '../../styles';
import I18n from '../../lib/i18n/i18n';

function SimpleModal({
    isVisible,
    closeModal,
    confirm,
    children,
    animationType,
    transparent,
    style,
}) {
    return (
        <Modal
            animationType={animationType}
            transparent={transparent}
            visible={isVisible}
            onRequestClose={closeModal}
        >
            <SafeAreaView style={styles().container}>
                <View style={styles().contentContainer}>
                    <View style={[ styles().childrenContainer, style ]}>
                        {children}
                    </View>
                    <View style={styles().buttonContainer}>
                        <Button
                            contentContainerStyle={styles().navigationButton}
                            onPress={closeModal}
                            key="survey-navigationButton-back"
                        >
                            {I18n.t('SIMPLE_MODAL.CANCEL')}
                        </Button>
                        <Button
                            contentContainerStyle={styles().navigationButton}
                            onPress={confirm}
                            key="survey-navigationButton-finish"
                        >
                            {I18n.t('SIMPLE_MODAL.CONFIRM')}
                        </Button>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

SimpleModal.defaultProps = {
    animationType: 'fade',
    transparent: true,
    style: null,
};

SimpleModal.propTypes = {
    isVisible: PropTypes.bool.isRequired,
    closeModal: PropTypes.func.isRequired,
    confirm: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
    animationType: PropTypes.string,
    transparent: PropTypes.bool,
    style: PropTypes.object,
};

const styles = () => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    contentContainer: {
        maxWidth: '90%',
        backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    childrenContainer: {
        padding: 24,
        flexDirection: 'row',
        // justifyContent: 'flex-start',
    },
    buttonContainer: {
        flexDirection: 'row',
    },
    navigationButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default withColor(SimpleModal);
