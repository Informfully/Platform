import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import Select from 'react-select';
import SurveyQuestions, { Questions } from '../../../../api/client/surveys/SurveyQuestions';

class Settings extends PureComponent {

    constructor(props) {
        super(props);

        this.handleChangeCanBeSkipped = this.handleChangeCanBeSkipped.bind(this);
        this.handleChangeSkipAnswerText = this.handleChangeSkipAnswerText.bind(this);
        this.handleChangeSkipAnswerValue = this.handleChangeSkipAnswerValue.bind(this);
        this.handleChangeMinSelect = this.handleChangeMinSelect.bind(this);
        this.handleChangeMaxSelect = this.handleChangeMaxSelect.bind(this);
        this.handleChangeSelectionsFrom = this.handleChangeSelectionsFrom.bind(this);
        this.handleChangeWithAtLeast = this.handleChangeWithAtLeast.bind(this);
        this.handleClickRandomOrder = this.handleClickRandomOrder.bind(this);
        this.handleChangeHasOtherOption = this.handleChangeHasOtherOption.bind(this);
        this.handleChangeOtherAnswerText = this.handleChangeOtherAnswerText.bind(this);
        this.handleChangeOtherAnswerValue = this.handleChangeOtherAnswerValue.bind(this);
    }

    handleChangeCanBeSkipped({ target: { checked } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'canBeSkipped', checked);
        SurveyQuestions.updateQuestion(questionId, 'skipAnswerValue', 0);
    }

    handleChangeSkipAnswerText({ target: { value } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'skipAnswerText', value);
    }

    handleChangeSkipAnswerValue({ target: { value } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'skipAnswerValue', value);
    }

    handleChangeMinSelect({ target: { value } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'minSelect', value);
    }

    handleChangeMaxSelect({ target: { value } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'maxSelect', value);
    }

    handleChangeSelectionsFrom(value) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'selectionsFrom', value);
        SurveyQuestions.updateQuestion(questionId, 'withAtLeast', 1);
    }

    handleChangeWithAtLeast({ target: { value } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'withAtLeast', value);
    }

    handleClickRandomOrder({ target: { checked } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'randomOrder', checked);
    }

    handleChangeHasOtherOption({ target: { checked } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'hasOtherOption', checked);
        SurveyQuestions.updateQuestion(questionId, 'otherAnswerValue', 0);
    }

    handleChangeOtherAnswerText({ target: { value } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'otherAnswerText', value);
    }

    handleChangeOtherAnswerValue({ target: { value } }) {
        const { questionId } = this.props;
        SurveyQuestions.updateQuestion(questionId, 'otherAnswerValue', value);
    }

    render() {

        const {
            _id, minSelect, maxSelect, selectionsFrom, randomOrder,
            withAtLeast, canBeSkipped, skipAnswerText, skipAnswerValue,
            hasOtherOption, otherAnswerText, otherAnswerValue, options,
        } = this.props;

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
                                id={`${_id}-checkbox-skipped`}
                                type="checkbox"
                                checked={canBeSkipped}
                                onChange={this.handleChangeCanBeSkipped}
                            />
                        </div>
                        <div className="column">
                            <b htmlFor={`${_id}-checkbox-skipped`}>Add &quot;none of the above&quot;</b>
                        </div>
                    </div>
                    { canBeSkipped
                        ? (
                            <div className="columns">
                                <div className="column">
                                    <b>Skip Option Text</b>
                                    <input
                                        type="text"
                                        value={skipAnswerText}
                                        onChange={this.handleChangeSkipAnswerText}
                                    />
                                </div>
                                <div className="column">
                                    <b>Skip Option Value</b>
                                    <input
                                        type="text"
                                        value={skipAnswerValue}
                                        onChange={this.handleChangeSkipAnswerValue}
                                    />
                                </div>
                            </div>
                        )
                        : null

                    }
                    <div className="columns">
                        <div className="column">
                            <b>Min Select</b>
                            <input
                                type="number"
                                value={minSelect}
                                onChange={this.handleChangeMinSelect}
                                disabled={canBeSkipped}
                                min={1}
                            />
                        </div>
                        <div className="column">
                            <b>Max Select</b>
                            <input type="number" value={maxSelect} onChange={this.handleChangeMaxSelect} />
                        </div>
                    </div>
                    <div className="columns">
                        <div className="column">
                            <b>Show Answers of Question</b>
                            <Select
                                isClearable
                                value={selectionsFrom}
                                onChange={this.handleChangeSelectionsFrom}
                                options={options}
                            />
                        </div>
                        <div className="column">
                            <b>if at least this many were selected</b>
                            <input type="number" value={withAtLeast} onChange={this.handleChangeWithAtLeast} />
                        </div>
                    </div>
                    <div className="columns">
                        <div className="column is-narrow is-vcentered">
                            <input
                                id={`${_id}-checkbox-random`}
                                type="checkbox"
                                checked={!!randomOrder}
                                onChange={this.handleClickRandomOrder}
                            />
                        </div>
                        <div className="column is-vcentered">
                            <b htmlFor={`${_id}-checkbox-random`}>Display answers in random order</b>
                        </div>
                    </div>

                    <div className="columns is-mobile">
                        <div className="column is-narrow is-vcentered">
                            <input
                                id={`${_id}-checkbox-other`}
                                type="checkbox"
                                checked={hasOtherOption}
                                onChange={this.handleChangeHasOtherOption}
                            />
                        </div>
                        <div className="column is-vcentered">
                            <b htmlFor={`${_id}-checkbox-other`}>Add &quot;other&quot; option</b>
                        </div>
                    </div>
                    { hasOtherOption
                        ? (

                            <div className="columns">
                                <div className="column">
                                    <b>Other option text</b>
                                    <input
                                        type="text"
                                        value={otherAnswerText}
                                        onChange={this.handleChangeOtherAnswerText}
                                    />
                                </div>
                                <div className="column">
                                    <b>Other option value</b>
                                    <input
                                        type="text"
                                        value={otherAnswerValue}
                                        onChange={this.handleChangeOtherAnswerValue}
                                    />
                                </div>
                            </div>
                        )
                        : null
                    }
                </div>
            </div>
        );
    }
}

Settings.defaultProps = {
    minSelect: 1,
    maxSelect: 1,
    selectionsFrom: {},
    randomOrder: false,
    withAtLeast: 0,
    options: [],
    canBeSkipped: false,
    skipAnswerText: '',
    skipAnswerValue: 0,
    hasOtherOption: false,
    otherAnswerText: '',
    otherAnswerValue: 0,
};

Settings.propTypes = {
    _id: PropTypes.string.isRequired,
    questionId: PropTypes.string.isRequired,
    minSelect: PropTypes.number,
    maxSelect: PropTypes.number,
    selectionsFrom: PropTypes.object,
    randomOrder: PropTypes.bool,
    withAtLeast: PropTypes.number,
    options: PropTypes.array,
    canBeSkipped: PropTypes.bool,
    skipAnswerText: PropTypes.string,
    skipAnswerValue: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    hasOtherOption: PropTypes.bool,
    otherAnswerText: PropTypes.string,
    otherAnswerValue: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
};

export default withTracker(({ questionId, questionIndex }) => {
    const question = Questions.findOne(questionId);
    const { surveyId } = question;
    const options = Questions.find({ surveyId }).fetch()
        .reduce((result, { _id, text, selectionsFrom }, index) => {
            if (!selectionsFrom) {
                result.push({
                    value: _id,
                    label: `${index + 1} - ${text}`,
                    text,
                    index,
                    _id,
                });
            }
            return result;
        }, [])
        .filter(({ _id }, index) => _id !== questionId && index < questionIndex);
    return { ...question, options };
})(Settings);
