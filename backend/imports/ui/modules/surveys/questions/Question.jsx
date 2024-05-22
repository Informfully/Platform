import { withTracker } from 'meteor/react-meteor-data';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SurveyQuestions, { Questions } from '../../../../api/client/surveys/SurveyQuestions';
import Badge from '../../../elements/Badge';
import Button from '../../../elements/Button';
import FaIcon from '../../../elements/FaIcon';
import Answer from './Answer';
import Settings from './Settings';

class Question extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isSettingsAreaVisible: false,
        };

        this.handleChangeText = this.handleChangeText.bind(this);
        this.handleClickAddAnswer = this.handleClickAddAnswer.bind(this);
        this.handleClickDuplicate = this.handleClickDuplicate.bind(this);
        this.toggleSettingsArea = this.toggleSettingsArea.bind(this);
        this.handleClickRemove = this.handleClickRemove.bind(this);
    }

    get answers() {
        const { questionId, answers } = this.props;

        if (!answers) {
            return null;
        }

        return answers.map(({ _id, text, value }, index) => (
            <Answer
                key={_id}
                questionId={questionId}
                _id={_id}
                text={text}
                value={value}
                index={index}
            />
        ));
    }

    get settingsButtonIcon() {
        const { isSettingsAreaVisible } = this.state;
        if (isSettingsAreaVisible) {
            return 'times';
        }

        return 'wrench';
    }

    get errors() {
        const { errors } = this.props;
        return errors.map(error => (
            <div className="columns">
                <div className="column">
                    <div className="columns" key={error}>
                        <div className="column text-error text-bold">
                            { error }
                        </div>
                    </div>
                </div>
            </div>
        ));
    }

    get hasErrors() {
        const { errors } = this.props;
        return errors.length > 0;
    }

    handleChangeText({ target: { value } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'text', value);
    }

    handleClickAddAnswer() {
        const { questionId } = this.props;
        SurveyQuestions.addEmptyAnswerToQuestion(questionId);
    }

    toggleSettingsArea() {
        this.setState(({ isSettingsAreaVisible }) => ({ isSettingsAreaVisible: !isSettingsAreaVisible }));
    }

    handleClickDuplicate() {
        const { questionId } = this.props;
        SurveyQuestions.duplicateQuestion(questionId);
    }

    handleClickRemove() {
        const { questionId } = this.props;
        SurveyQuestions.remove(questionId);
    }


    render() {
        const { isSettingsAreaVisible } = this.state;
        const {
            questionId, index, text, selectionsFrom,
        } = this.props;
        return (
            <div className="columns">
                <div className="column">
                    { this.hasErrors ? this.errors : null }
                    <div className="question columns">
                        <div className="column is-narrow">
                            <Badge>{ index + 1 }</Badge>
                        </div>
                        <div className="column">
                            <div className="columns">
                                <div className="column">
                                    <textarea
                                        value={text}
                                        onChange={this.handleChangeText}
                                        className="input"
                                        placeholder="What question would you like to ask?"
                                    />
                                </div>
                            </div>
                            { !selectionsFrom || !selectionsFrom._id
                                ? (
                                    <div className="columns">
                                        <div className="column">
                                            { this.answers }
                                        </div>
                                    </div>
                                )
                                : (
                                    <div className="columns">
                                        <div className="column">
                                            Showing answers from
                                            {' '}
                                            <i>{ selectionsFrom.label }</i>
                                        </div>
                                    </div>
                                )
                            }
                            <div className="columns is-mobile">
                                {
                                    !selectionsFrom || !selectionsFrom._id
                                        ? (
                                            <div className="column is-vcentered">
                                                <Button
                                                    type="edit"
                                                    onClick={this.handleClickAddAnswer}
                                                    className="question__button--add-answer is-size-6"
                                                >
                                                    + Answer
                                                </Button>
                                            </div>
                                        )
                                        : null
                                }
                                <div className="column is-narrow is-vcentered">
                                    <a
                                        text="true"
                                        className="question__button"
                                        onClick={this.toggleSettingsArea}
                                    >
                                        <FaIcon icon={this.settingsButtonIcon} />
                                    </a>
                                </div>
                                <div className="column is-narrow is-vcentered">
                                    <a
                                        text="true"
                                        className="question__button"
                                        onClick={this.handleClickDuplicate}
                                    >
                                        <FaIcon icon="clone" />
                                    </a>
                                </div>
                                <div className="column is-narrow is-vcentered">
                                    <a
                                        text="true"
                                        className="question__button question__button--delete"
                                        onClick={this.handleClickRemove}
                                    >
                                        <FaIcon icon="trash-alt" />
                                    </a>
                                </div>
                            </div>
                            { isSettingsAreaVisible
                                ? <Settings questionId={questionId} questionIndex={index} />
                                : null
                            }
                        </div>

                    </div>
                </div>
            </div>
        );
    }

}

Question.defaultProps = {
    selectionsFrom: {},
    answers: [],
    errors: [],
};

Question.propTypes = {
    index: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
    selectionsFrom: PropTypes.object,
    questionId: PropTypes.string.isRequired,
    answers: PropTypes.array,
    errors: PropTypes.array,
};

export default withTracker(({ questionId }) => {
    const question = Questions.findOne(questionId);
    return { ...question };
})(Question);
