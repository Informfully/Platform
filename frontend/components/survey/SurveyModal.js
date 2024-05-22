import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, TextInput } from 'react-native';
import SimpleModal from '../elements/SimpleModal';
import { DynamicColors, withColor } from '../../styles';

class SurveyModal extends Component {
    constructor(props) {
        super(props);

        const { textInputValue } = props;

        this.state = {
            textInputValue,
        };

        this.handleChangeTextInput = this.handleChangeTextInput.bind(this);
        this.handlePressConfirm = this.handlePressConfirm.bind(this);
    }

    /**
     * Updates the state with the last confirmed input text value when
     * the component transitioned from visible to hidden.
     *
     * Notice that inside this component, when the user changes the text
     * in the input field, we only change the state of this component.
     * This makes it easier to deal with updates and allows us to change the
     * value in the text input without changing the value 'selected' (in the
     * case that the user clicks the cancel button and wants to close the
     * modal without applying his changes).
     * We thus only update the value in the parent component in the case the
     * user confirms his changes.
     * In this method, we reset the state to the latest value in the parent
     * component. This is needed for the case that a user opens the modal,
     * changes the text and confirms, opens it again, changes the text, cancels
     * and opens it again.
     *
     * @param props
     * @returns {*}
     */
    static getDerivedStateFromProps(props) {
        const { textInputValue, isVisible } = props;
        if (!isVisible) {
            return { textInputValue };
        }
        return null;
    }

    handleChangeTextInput(textInputValue) {
        this.setState({ textInputValue });
    }

    handlePressConfirm() {
        const { onConfirm } = this.props;
        const { textInputValue } = this.state;
        onConfirm(textInputValue);
    }

    render() {
        const { isVisible, closeModal } = this.props;
        const { textInputValue } = this.state;

        return (
            <SimpleModal
                isVisible={isVisible}
                closeModal={closeModal}
                confirm={this.handlePressConfirm}
            >
                <TextInput
                    style={styles().input}
                    onChangeText={this.handleChangeTextInput}
                    placeholder="Ihre Eingabe.."
                    placeholderTextColor={DynamicColors.getColors().CARD_TEXT}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    value={textInputValue}
                    keyboardType="email-address"
                    clearButtonMode="always"
                    multiline
                />
            </SimpleModal>
        );
    }
}

SurveyModal.defaultProps = {
    textInputValue: '',
};

SurveyModal.propTypes = {
    isVisible: PropTypes.bool.isRequired,
    closeModal: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    textInputValue: PropTypes.string,
};

const styles = () => {
    return StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
        },
        contentContainer: {
            maxWidth: '80%',
            backgroundColor: '#ffffff',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 8,
        },
        inputContainer: {
            padding: 16,
            flexDirection: 'row',
        },
        input: {
            paddingRight: 12,
            paddingLeft: 12,
            paddingTop: 12,
            paddingBottom: 12,
            borderRadius: 4,
            backgroundColor: '#e5e5e5',
            flex: 1,
        },
        buttonContainer: {
            flexDirection: 'row',
        },
    });
};

export default withColor(SurveyModal);