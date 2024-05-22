import React, { Component } from 'react';
import PropTypes from 'prop-types';
import '@fortawesome/fontawesome-free/js/all';
import ModuleSection from '../../../layout/ModuleSection';
import ModuleHead from '../../../layout/ModuleHead';
import ModuleTitle from '../../../layout/ModuleTitle';
import Badge from '../../../elements/Badge';
import Select from 'react-select';

export default class SurveyQuestionsReadOnly extends Component {

    get questions() {
        const { questions } = this.props;

        if (questions.length <= 0) {
            return (
                <h2>No questions in survey</h2>
            )
        }

        return questions.map(( question, index ) => {
            const { _id, text, answers } = question;

            return (
                <div className="columns" key={_id}>
                    <div className="column">
                        <div className="question columns">

                            <div className="column is-narrow">
                                <Badge>{ index + 1 }</Badge>
                            </div>
                            <div className="column">
                                <textarea
                                    value={text}
                                    className="input strong input--transparent"
                                    readOnly
                                />

                                { this.answers(answers) }
                    
                                { this.settings(question) }
                                
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    }

    answers(answers) {
        return answers.map(({ _id, text, value }) => {
            return (
                <div className="columns answer" key={_id}>
                    <div className="column">
                        <input
                            type="text"
                            value={text}
                            disabled
                        />
                    </div>
                    <div className="column is-one-quarter">
                        <input
                            type="text"
                            value={value}
                            disabled
                        />
                    </div>
                </div>
            )
        });
    }

    settings(question) {
        const {
            _id, minSelect, maxSelect, selectionsFrom, randomOrder,
            withAtLeast, canBeSkipped, skipAnswerText, skipAnswerValue,
            hasOtherOption, otherAnswerText, otherAnswerValue, options,
        } = question;

        return (
            <div className="question__settings-area columns">
                <div className="column">
                    <div className="columns">
                        <div className="question__settings-area__title column">
                            Settings
                        </div>
                    </div>
                    <div className="columns is-mobile">
                        <div className="column is-narrow is-vcentered">
                            <input
                                type="checkbox"
                                checked={canBeSkipped}
                                disabled
                            />
                        </div>
                        <div className="column is-vcentered">
                            <label htmlFor={`${_id}-checkbox-skipped`}>Add &quot;none of the above&quot;</label>
                        </div>
                    </div>
                    { canBeSkipped
                        ? (
                            <div className="columns">
                                <div className="column">
                                    <label>Skip Option Text</label>
                                    <input
                                        type="text"
                                        value={skipAnswerText}
                                        disabled
                                    />
                                </div>
                                <div className="column">
                                    <label>Skip Option Value</label>
                                    <input
                                        type="text"
                                        value={skipAnswerValue}
                                        disabled
                                    />
                                </div>
                            </div>
                        )
                        : null

                    }

                    <div className="columns">
                        <div className="column">
                            <label>Min Select</label>
                            <input
                                type="text"
                                value={minSelect}
                                disabled
                            />
                        </div>
                        <div className="column">
                            <label>Max Select</label>
                            <input
                                type="text"
                                value={maxSelect}
                                disabled
                            />
                        </div>
                    </div>
                    <div className="columns">
                        <div className="column">
                            <label>Show Answers of Question</label>
                            <input
                                type="text"
                                value={selectionsFrom}
                                disabled
                            />
                        </div>
                        <div className="column">
                            <label>if at least this many were selected</label>
                            <input
                                type="text"
                                value={withAtLeast}
                                disabled
                            />
                        </div>
                    </div>
                    <div className="columns">
                        <div className="column is-narrow is-vcentered">
                            <input
                                type="checkbox"
                                checked={!!randomOrder}
                                disabled
                            />
                        </div>
                        <div className="column is-vcentered">
                            <label htmlFor={`${_id}-checkbox-random`}>Display answers in random order</label>
                        </div>
                    </div>

                    <div className="columns is-mobile">
                        <div className="column is-narrow is-vcentered">
                            <input
                                type="checkbox"
                                checked={hasOtherOption}
                                disabled
                            />
                        </div>
                        <div className="column is-vcentered">
                            <label htmlFor={`${_id}-checkbox-other`}>Add &quot;other&quot; option</label>
                        </div>
                    </div>
                    { hasOtherOption
                        ? (

                            <div className="columns">
                                <div className="column">
                                    <label>Other option text</label>
                                    <input
                                        type="text"
                                        value={otherAnswerText}
                                        disabled
                                    />
                                </div>
                                <div className="column">
                                    <label>Other option value</label>
                                    <input
                                        type="text"
                                        value={otherAnswerValue}
                                        disabled
                                    />
                                </div>
                            </div>
                        )
                        : null
                    }
                </div>
            </div>
        )
    }

    render() {
        return (
            <>
            <ModuleHead>
                <ModuleTitle>Questions</ModuleTitle>
            </ModuleHead>
            <ModuleSection className="modal-survey-edit__body" card content>

                <div className="notification is-warning">
                    Editing the question is locked because the experiment has already launched.
                </div>

                <div className="columns">
                    <div className="column">
                        { this.questions }
                    </div>
                </div>

            </ModuleSection>
            </>
        );
    }
}

SurveyQuestionsReadOnly.defaultProps = {
    questions: [],
};

SurveyQuestionsReadOnly.propTypes = {
    questions: PropTypes.array,
};