import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { withTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';
import '@fortawesome/fontawesome-free/js/all';
import ModuleSection from '../../../layout/ModuleSection';
import ModuleHead from '../../../layout/ModuleHead';
import ModuleTitle from '../../../layout/ModuleTitle';
import Button from '../../../elements/Button';
import FaIcon from '../../../elements/FaIcon';
import SurveyQuestions, { Questions } from '../../../../api/client/surveys/SurveyQuestions';
import NewQuestion from './Question';

class SurveyQuestionsEditor extends Component {

    constructor(props) {
        super(props);

        this.state = {
            errors: { count: 0 },
        };

        this.handleClickAddQuestion = this.handleClickAddQuestion.bind(this);
        this.handleClickSave = this.handleClickSave.bind(this);
    }

    componentWillUnmount() {
        const { surveyId } = this.props;
        SurveyQuestions.removeAll(surveyId);
        Session.set('survey.edit.loaded', false);
    }

    get questions() {
        const { questions } = this.props;
        const { errors } = this.state;
        return questions.map(({ _id }, index) => {
            const errorsForQuestion = errors[_id] || [];
            return (
                <NewQuestion
                    key={_id}
                    questionId={_id}
                    index={index}
                    errors={errorsForQuestion}
                />
            );
        });
    }

    handleClickSave() {
        const { surveyId } = this.props;

        const errors = SurveyQuestions.getAllErrors(surveyId);
        this.setState({ errors });

        if (errors.count > 0) {
            return false;
        }
        const questions = Questions.find({ surveyId }).fetch();

        Meteor.call('surveys.questions.update', surveyId, questions, (err, res) => {
            if (err) {
                console.log(err);
            }
        });
    }

    handleClickAddQuestion() {
        const { surveyId } = this.props;
        SurveyQuestions.insertEmptyQuestion(surveyId);
    }

    render() {
        const { isLoading } = this.props;

        if (isLoading) {
            return (
                <div>...loading</div>
            );
        }

        return (
            <>
            <ModuleHead>
                <ModuleTitle>
                    Questions
                </ModuleTitle>
            </ModuleHead>
            <ModuleSection className="modal-survey-edit__body" card content>
                <div className="columns">
                    <div className="column">
                        { this.questions }
                    </div>
                </div>
                <div className="columns">
                    <div className="column">
                        <Button type="edit" onClick={this.handleClickAddQuestion} className="is-size-6">
                            + Question
                        </Button>
                    </div>
                </div>
                <div className="columns is-centered">
                    <div className="column is-narrow">
                        <Button onClick={this.handleClickSave}>
                            Save questions
                        </Button>
                    </div>
                </div>
            </ModuleSection>
            </>
        );
    }
}

SurveyQuestionsEditor.defaultProps = {
    questions: [],
};

SurveyQuestionsEditor.propTypes = {
    surveyId: PropTypes.string.isRequired,
    isLoading: PropTypes.bool,
    questions: PropTypes.array,
};

export default withTracker(({ surveyId, initialQuestions }) => {
    if (!surveyId) {
        return {};
    }

    Session.setDefault('survey.edit.loaded', false);
    const loaded = Session.get('survey.edit.loaded');

    if (!loaded && initialQuestions) {
        SurveyQuestions.upsert(surveyId, initialQuestions);
        Session.set('survey.edit.loaded', true);
    }

    const questions = Questions.find({ surveyId }, { fields: { _id: 1 } }).fetch();

    return {
        questions,
        name,
    };
})(SurveyQuestionsEditor);
