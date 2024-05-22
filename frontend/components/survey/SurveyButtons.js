import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import { DynamicColors, withColor } from '../../styles';
import { FONT_FAMILY } from '../../styles/globals';
import Button from '../elements/Button';
import I18n from '../../lib/i18n/i18n';

function SurveyButtons({
    step, numberOfQuestions, handlePressNext, handlePressBack, handlePressFinish,
}) {
    let backButton = null;
    let nextButton = (
        <Button
            onPress={handlePressNext}
            style={styles().navigationButton}
            contentContainerStyle={styles().navigationButtonContainer}
            key="survey-navigationButton-next"
        >
            {I18n.t('SURVEY_BUTTONS.NEXT')}
        </Button>
    );

    if (step !== 0) {
        backButton = (
            <Button
                onPress={handlePressBack}
                style={styles().navigationButton}
                contentContainerStyle={styles().navigationButtonContainer}
                key="survey-navigationButton-back"
            >
                {I18n.t('SURVEY_BUTTONS.BACK')}
            </Button>
        );
    }

    if (step === numberOfQuestions - 1) {
        nextButton = (
            <Button
                onPress={handlePressFinish}
                style={styles().navigationButton}
                contentContainerStyle={styles().navigationButtonContainer}
                key="survey-navigationButton-finish"
            >
                {I18n.t('SURVEY_BUTTONS.FINISH')}
            </Button>
        );
    }

    return (
        <Fragment>
            {backButton}
            {nextButton}
        </Fragment>
    );
}

SurveyButtons.propTypes = {
    step: PropTypes.number.isRequired,
    numberOfQuestions: PropTypes.number.isRequired,
    handlePressNext: PropTypes.func.isRequired,
    handlePressBack: PropTypes.func.isRequired,
    handlePressFinish: PropTypes.func.isRequired,
};


const styles = () => {
    return StyleSheet.create({
        navigationButton: {
            color: DynamicColors.getColors().CARD_TEXT,
            textAlign: 'center',
            paddingTop: 12,
            paddingBottom: 12,
            fontFamily: FONT_FAMILY.TEXT,
            borderWidth: 1,
            borderColor: DynamicColors.getColors().CARD_TEXT,
            borderRadius: 22,
            marginBottom: 8,
            backgroundColor: DynamicColors.getColors().CARD_BACKGROUND,
        },
        navigationButtonContainer: {
            alignItems: 'center',
            flex: 1,
            paddingLeft: '6%',
            paddingRight: '6%',
            paddingTop: 12,
            paddingBottom: 12,
        }
    });
};

export default withColor(SurveyButtons);