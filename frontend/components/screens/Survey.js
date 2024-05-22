import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    StyleSheet,
    SafeAreaView,
    View,
    Dimensions,
    ScrollView,
    StatusBar,
} from 'react-native';
import Meteor, { withTracker } from '@meteorrn/core';
import MultiSelectList from '../utils/list/MultiSelectList';
import SurveyButtons from '../survey/SurveyButtons';
import { shuffle } from '../../lib/utils/utils_array';
import SurveyModal from '../survey/SurveyModal';
import LoadingSurvey from './loading/LoadingSurvey';
import { FONT_FAMILY } from '../../styles/globals';
import { DynamicColors, withColor } from '../../styles';
import { getSelectionTextFromMinAndMaxSelect } from '../../lib/utils/utils_survey';
import Answer from '../survey/answer/Answer';
import { collectionManager } from '../../lib/utils/collectionManager';
import * as NavigationBar from 'expo-navigation-bar';

const fullWidth = Dimensions.get('window').width;

class Survey extends Component {
    constructor(props) {
        super(props);

        this.state = this.defaultState;

        this.handlePressNext = this.handlePressNext.bind(this);
        this.handlePressBack = this.handlePressBack.bind(this);
        this.handlePressAnswer = this.handlePressAnswer.bind(this);
        this.handlePressFinish = this.handlePressFinish.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.openModal = this.openModal.bind(this);
        this.confirmModalClose = this.confirmModalClose.bind(this);
        this.renderMultiSelectListItem = this.renderMultiSelectListItem.bind(this);

        this.scrollViewRef = React.createRef();
    }

    componentDidUpdate(prevProps, prevState) {
        const { step, isSaving } = this.state;
        // user clicked next or back
        // check if the current question should be skipped
        if (step !== prevState.step && step !== 0) {
            const { questions } = this.props;
            const question = questions[step];

            const { selectionsFrom } = question;
            if (selectionsFrom) {
                const { withAtLeast } = question;
                const index = this.selectionsFromIndex;

                if (this.numberOfSelectedAnswersForIndex(index) < withAtLeast) {
                    // move one into the same direction
                    const nextStep = step + (step - prevState.step);
                    if (questions.length < nextStep + 1) {
                        // complete the survey
                        this.handlePressFinish();
                    } else {
                        // proceed in the same direction
                        this.gotoStep(nextStep);
                    }
                }
            }
        }

        if (isSaving && this.props._id !== prevProps._id) {
            this.setState(this.defaultState);
        }
    }

    get defaultState() {
        return {
            step: 0,
            // notice that we set a single empty object by default.
            // this is because we use objects to store the selections
            // from the survey. for every step, there must be an object
            // to store the selections. A new empty object is added
            // in {@link handlePressAnswer} when `step` is incremented.
            hasError: false,
            answers: [{}],
            isModalVisible: false,
            isSaving: false,
        };
    }

    get selectionsFromIndex() {
        const { step } = this.state;
        const { questions } = this.props;
        const question = questions[step];
        const { selectionsFrom: { _id } } = question;

        for (let i = 0; i < questions.length; i++) {
            if (questions[i]._id === _id) {
                return i;
            }
        }

        return null;
    }

    get isActionEnabled() {
        const { step, answers } = this.state;
        const { questions } = this.props;
        const { maxSelect } = questions[step];
        const numberOfAnswers = Object.keys(answers[step]).filter(k => answers[step][k]).length;
        return numberOfAnswers === 0 || maxSelect === 0 || numberOfAnswers < maxSelect;
    }

    get numberOfSelectedAnswers() {
        const { step, answers } = this.state;
        return Object.keys(answers[step]).filter(field => !!answers[step][field]).length;
    }

    get answers() {
        const { step } = this.state;
        const { questions } = this.props;
        const question = questions[step];
        const { selectionsFrom, canBeSkipped, hasOtherOption } = question;
        const answers = [];

        if (selectionsFrom) {
            answers.push(...this.answersFromPreviousSelections);
        }

        answers.push(...this.answersFromQuestion);

        if (canBeSkipped) {
            const { skipAnswerText, skipAnswerValue } = question;
            answers.push({
                _id: 'skipAnswer',
                text: skipAnswerText,
                value: skipAnswerValue,
            });
        }

        if (hasOtherOption) {
            const { otherAnswerText, otherAnswerValue } = question;
            const userInput = this.otherAnswerUserInput;
            answers.push({
                _id: 'otherAnswer',
                text: otherAnswerText,
                value: otherAnswerValue,
                userInput,
            });
        }

        return answers;
    }

    get answersFromQuestion() {
        const { step } = this.state;
        const { questions } = this.props;
        const question = questions[step];

        return question.answers.map(a => ({ ...a }));
    }

    get answersFromPreviousSelections() {
        const { answers } = this.state;
        const index = this.selectionsFromIndex;

        return Object.keys(answers[index]).reduce((result, key) => {
            if (key === 'otherAnswer') {
                result.push({
                    ...answers[index][key],
                    _id: 'otherAnswerPrevious',
                });
            } else if (key !== 'skipAnswer') {
                result.push(answers[index][key]);
            }
            return result;
        }, []);
    }

    get otherAnswerUserInput() {
        const { step, answers } = this.state;
        if (!answers[step].otherAnswer) {
            return '';
        }
        return answers[step].otherAnswer.userInput || '';
    }

    gotoStep(step) {
        const { answers } = this.state;
        const newAnswers = [...answers];

        // if answers does not include an object for the next step
        // we add an empty object. see {@link handlePressAnswer} to
        // see how it is used.
        if (answers.length <= step) {
            newAnswers.push({});
        }

        this.scrollToTop();
        this.setState({
            step,
            answers: newAnswers,
        });
    }

    scrollToTop() {
        this.scrollViewRef.current.scrollTo({
            x: 0,
            y: 0,
            animated: false,
        });
    }

    numberOfSelectedAnswersForIndex(index) {
        const { questions } = this.props;
        const { answers } = this.state;
        return questions[index].answers.filter(({ _id }) => answers[index][_id]).length;
    }

    handlePressAnswer(answer) {
        const { _id } = answer;
        const { step, answers } = this.state;
        const { questions } = this.props;
        const { minSelect, maxSelect } = questions[step];

        const prevValue = answers[step][_id] || {};
        const hasValue = !!prevValue._id;

        // deselecting is always fine
        if (hasValue) {
            this.removeAnswer(_id);
        } else if ((minSelect === 1 && maxSelect === 1) || _id === 'skipAnswer') {
            // if the user can only select at most one answer, deselect
            // all previously selected answers
            this.updateAnswerAndResetOtherAnswers(answer);
        } else if (this.isActionEnabled) {
            this.updateAnswer(answer);
        }
    }

    removeAnswer(answerId) {
        const { step, answers } = this.state;
        const newAnswers = [...answers];
        delete newAnswers[step][answerId];
        this.setState({ answers: newAnswers });
    }

    updateAnswer(answer) {
        const { _id } = answer;
        const { step, answers } = this.state;
        const newAnswers = [...answers];
        newAnswers[step][_id] = answer;

        if (newAnswers[step].skipAnswer) {
            delete newAnswers[step].skipAnswer;
        }

        this.setState({ answers: newAnswers });
    }

    updateAnswerAndResetOtherAnswers(answer) {
        const { step, answers } = this.state;
        const newAnswers = [...answers];
        const { _id } = answer;
        newAnswers[step] = { [_id]: answer };
        this.setState({ answers: newAnswers });
    }

    confirmModalClose(value) {
        this.handleChangeModalTextInput(value);
        this.closeModal();
    }

    handleChangeModalTextInput(value) {
        const { step } = this.state;
        const { questions } = this.props;
        const question = questions[step];
        const { otherAnswerText, otherAnswerValue } = question;

        if (!value) {
            this.removeAnswer('otherAnswer');
        } else {
            this.updateAnswer({
                _id: 'otherAnswer',
                text: otherAnswerText,
                value: otherAnswerValue,
                userInput: value,
            });
        }
    }

    handlePressFinish() {
        const { step, answers } = this.state;
        const { _id } = this.props;

        this.setState({ hasError: false });
        const { questions } = this.props;

        const { minSelect } = questions[step];
        if (minSelect > this.numberOfSelectedAnswers) {
            this.setState({ hasError: true });
            return false;
        }

        this.setState({ isSaving: true });

        Meteor.call('answers.add', _id, answers, (err) => {
            if (err) {
                console.warn(err);
            }
        });
    }

    handlePressNext() {
        const { questions } = this.props;
        const { step, answers } = this.state;
        const newAnswers = [...answers];

        this.setState({ hasError: false });

        const { minSelect } = questions[step];
        if (minSelect > this.numberOfSelectedAnswers) {
            this.setState({ hasError: true });
            return false;
        }


        // if answers does not include an object for the next step
        // we add an empty object. see {@link handlePressAnswer} to
        // see how it is used.
        if (answers.length <= step + 1) {
            newAnswers.push({});
        }

        this.scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
        this.setState(prevState => ({
            step: Math.min(prevState.step + 1, questions.length - 1),
            answers: newAnswers,
        }));
    }

    handlePressBack() {
        this.scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
        this.setState(prevState => ({
            step: Math.max(prevState.step - 1, 0),
        }));
    }

    openModal() {
        if (this.isActionEnabled) {
            this.setState({ isModalVisible: true });
        }
    }

    closeModal() {
        this.setState({ isModalVisible: false });
    }

    renderMultiSelectListItem({ index, item }) {
        const { step, answers } = this.state;
        const { _id } = item;
        const selected = !!answers[step][_id];

        return (
            <Answer
                index={index}
                text={item.userInput ? item.userInput : item.text}
                isSelected={selected}
                onPress={this.handlePressAnswer}
                onPressOther={this.openModal}
                item={item}
            />
        );
    }

    render() {
        const {
            step, hasError, answers, isModalVisible, isSaving, finished
        } = this.state;
        const { isLoading, questions } = this.props;

        if (isLoading || isSaving) {
            return (
                <LoadingSurvey />
            );
        }

        const question = questions[step];
        const selected = answers[step];

        const { minSelect, maxSelect } = question;

        if(Platform.OS === 'android'){
            NavigationBar.setBackgroundColorAsync(DynamicColors.getColors().PRIMARY_BACKGROUND);
        }

        return (
            <SafeAreaView style={styles().containerBackground}>
                <SurveyModal
                    isVisible={isModalVisible}
                    closeModal={this.closeModal}
                    onCancel={this.closeModal}
                    onConfirm={this.confirmModalClose}
                    onChangeTextInput={this.handleChangeModalTextInput}
                    textInputValue={this.otherAnswerUserInput}
                />

                {Platform.OS === 'ios' ? <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} /> : <StatusBar barStyle={DynamicColors.getStatusBarStyle()} hidden={false} backgroundColor={DynamicColors.getColors().PRIMARY_BACKGROUND}/>}

                <ScrollView
                    contentContainerStyle={styles().scrollContainer}
                    ref={this.scrollViewRef}
                    contentInsetAdjustmentBehavior="never"

                    // FIX for bug in ios 13, scroll Views all over the place
                    scrollIndicatorInsets={{ right: 1 }}
                >
                    <View style={styles().body}>
                        <Text style={styles().title}>
                            {question.text}
                        </Text>
                        <Text style={[styles().information, hasError && styles().informationError]}>
                            {getSelectionTextFromMinAndMaxSelect(minSelect, maxSelect)}
                        </Text>
                        <MultiSelectList
                            selected={selected}
                            data={this.answers}
                            step={step}
                            renderItem={this.renderMultiSelectListItem}
                        />
                    </View>
                    <View style={styles().footer}>
                        <SurveyButtons
                            step={step}
                            numberOfQuestions={questions.length}
                            handlePressNext={this.handlePressNext}
                            handlePressBack={this.handlePressBack}
                            handlePressFinish={this.handlePressFinish}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }
}

Survey.defaultProps = {
    _id: '',
    questions: [],
};

Survey.propTypes = {
    _id: PropTypes.string,
    isLoading: PropTypes.bool.isRequired,
    questions: PropTypes.array,
};

export default withTracker(() => {
    const surveysSubscription = Meteor.subscribe('surveys.unanswered');
    const isLoading = !surveysSubscription.ready();
    const survey = collectionManager.collection('unansweredSurveys').findOne();
    const questions = survey ? survey.questions : [];
    const surveyQuestions = questions.map((question) => {
        const { randomOrder } = question;
        if (randomOrder) {
            return {
                ...question,
                answers: shuffle(question.answers),
            };
        }
        return question;
    });

    return {
        isLoading,
        ...survey,
        questions: surveyQuestions,
    };
})(withColor(Survey));

const styles = () => {
    return StyleSheet.create({
        containerBackground: {
            width: fullWidth,
            backgroundColor: DynamicColors.getColors().PRIMARY_BACKGROUND,
            flex: 1,
        },
        scrollContainer: {
            flexGrow: 1,
        },
        body: {
            flexGrow: 1,
            justifyContent: 'flex-start',
            flexDirection: 'column',
            paddingLeft: '6%',
            paddingRight: '6%',
        },
        footer: {
            flexDirection: 'row',
            paddingTop: 0,
            marginBottom: 0,
            paddingBottom: 0,
            marginTop: 18,
        },
        information: {
            color: DynamicColors.getColors().PRIMARY_TEXT,
            fontSize: 14,
            marginTop: 24,
            marginBottom: 24,
            textAlign: 'center',
        },
        informationError: {
            color: DynamicColors.getColors().ERROR_TEXT,
        },
        title: {
            color: DynamicColors.getColors().PRIMARY_TEXT,
            fontSize: 22,
            fontWeight: 'bold',
            marginTop: 35,
            fontFamily: FONT_FAMILY.SERIF.BOLD,
        },
    });
};
