import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import AnswersInputGroup from '../../../components/answers/AnswerInputGroup';
import SurveyQuestions from '../../../../api/client/surveys/SurveyQuestions';

export default class Answer extends PureComponent {

    constructor(props) {
        super(props);
        this.handleChangeText = this.handleChangeText.bind(this);
        this.handleChangeValue = this.handleChangeValue.bind(this);
        this.handleClickRemove = this.handleClickRemove.bind(this);
    }

    handleChangeText({ target: { value } }) {
        const { _id, questionId } = this.props;
        SurveyQuestions.updateAnswer(questionId, _id, 'text', value);
    }

    handleChangeValue({ target: { value } }) {
        const { _id, questionId } = this.props;
        SurveyQuestions.updateAnswer(questionId, _id, 'value', value);
    }

    handleClickRemove() {
        const { _id, questionId } = this.props;
        SurveyQuestions.removeAnswer(questionId, _id);
    }

    render() {
        const { _id, text, value } = this.props;

        return (
            <AnswersInputGroup
                key={_id}
                text={text}
                value={value}
                onChangeText={this.handleChangeText}
                onChangeValue={this.handleChangeValue}
                removeAnswer={this.handleClickRemove}
            />
        );
    }
}

Answer.propTypes = {
    _id: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]).isRequired,
    questionId: PropTypes.string.isRequired,
};
