import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import React, { Component } from 'react';

import ModuleHead from '../../layout/ModuleHead';
import ModuleTitle from '../../layout/ModuleTitle';
import ModuleSection from '../../layout/ModuleSection';
import AnswersInputGroup from '../../components/answers/AnswerInputGroup';
import Button from '../../elements/Button';


export default class FeedbackSurvey extends Component {

    constructor(props) {
        super(props);

        this.state = {
            survey: this.props.survey,
            errorMessage: '',
            isSaving: false,
            wasSaved: false,
        };

        this.handleChangeQuestion = this.handleChangeQuestion.bind(this);
        this.handleAddAnswer = this.handleAddAnswer.bind(this);
        this.handleDisableToggle = this.handleDisableToggle.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    
    handleChangeQuestion({ target: { value } }) {
        this.setState(({ survey }) => ({
            wasSaved: false,
            errorMessage: '',
            survey: {
                ...survey,
                question: value,
            },
        }));
    }

    handleChangeAnswerText(value, index) {
        const { survey, survey: { answers } } = this.state;
        const newAnswers = [...answers];
        newAnswers[index].text = value;
        this.setState({
            wasSaved: false,
            errorMessage: '',
            survey: {
                ...survey,
                answers: newAnswers,
            },
        });
    }

    handleChangeAnswerValue(value, index) {
        const { survey, survey: { answers } } = this.state;
        const newAnswers = [...answers];
        newAnswers[index].value = Number(value);
        this.setState({
            wasSaved: false,
            errorMessage: '',
            survey: {
                ...survey,
                answers: newAnswers,
            },
        });
    }

    get isQuestionEmpty() {
        const { survey: { question } } = this.state;
        return question.length === 0;
    }

    get hasAtLeastOneValidAnswer() {
        const { survey: { answers } } = this.state;
        return answers.some(({ text, value }) => text.length !== 0 && value.length !== 0);
    }

    handleSubmit() {
        if (this.isQuestionEmpty) {
            this.setState({
                errorMessage: 'Please add a question to the survey',
            });
            return false;
        }

        if (!this.hasAtLeastOneValidAnswer) {
            this.setState({
                errorMessage: 'Please add at least one valid answer',
            });
            return false;
        }

        const { survey } = this.state;
        const experimentId = this.props.experimentId;
        const method = this.props.isLikeSurvey ? 'experiments.likeSurvey.update' : 'experiments.dislikeSurvey.update';

        this.setState({ isSaving: true });

        Meteor.call(method, experimentId, survey, (err) => {
            if (err) {
                console.error(err);
                this.setState({ errorMessage: "Something went wrong", isSaving: false });
                return false;
            }
            this.setState({ wasSaved: true, isSaving: false });
            Meteor.setTimeout(() => {
                this.setState({ wasSaved: false });
            }, 10000);
        });
    }

    handleClickRemoveButton(index) {
        const { answers } = this.state.survey;
        const newAnswers = [...answers];
        const [removedAnswer] = newAnswers.splice(index, 1);
        removedAnswer.value = '';
        removedAnswer.text = '';
        this.setState(({ survey }) => ({
            errorMessage: '',
            wasSaved: false,
            survey: {
                ...survey,
                answers: newAnswers,
            },
        }));
    }

    handleAddAnswer() {
        const newAnswers = this.state.survey.answers;
        const newAnswer = {
            _id: Random.id(),
            text: 'Another answer',
            value: 0,
        };

        newAnswers.push(newAnswer);

        this.setState(({survey}) => ({
            errorMessage: '',
            wasSaved: false,
            survey: {
                ...survey,
                answers: newAnswers,
            },
        }));
    }

    handleDisableToggle() {
        const { experimentId, isLikeSurvey } = this.props;
        const isSurveyDisabled = this.props.survey === null;

        if (isSurveyDisabled) {
            const method = 'experiments.' + (isLikeSurvey ? 'likeSurvey' : 'dislikeSurvey') + '.update'
            const defaultSurvey =  {
                question: 'Default question',
                answers: [{
                    _id: Random.id(),
                    text: 'Default answer',
                    value: 0,
                }]
            }
            
            this.setState({ survey: defaultSurvey });

            Meteor.call(method, experimentId, defaultSurvey,
                (err) => {
                    if (err) {
                        console.error(err);
                        this.setState({ errorMessage: "Something went wrong", isSaving: false });
                        return false;
                    }
                }
            );

        } else {
            const method = 'experiments.' + (isLikeSurvey ? 'likeSurvey' : 'dislikeSurvey') + '.remove'

            Meteor.call(method, experimentId, (err) => {
                if (err) {
                    console.error(err);
                    this.setState({ errorMessage: "Something went wrong", isSaving: false });
                    return false;
                }

                this.setState({ survey: null });
            });
        }

    }

    get errorMessage() {
        const { errorMessage } = this.state;
        return (
            <div className="columns">
                <div className="column text-error text-bold">
                    { errorMessage }
                </div>
            </div>
        );
    }

    get buttonText() {
        const { isSaving, wasSaved } = this.state;
        if (isSaving) {
            return '...saving';
        }
        if (wasSaved) {
            return 'Changes saved!';
        }
        return 'Save changes';
    }

    get buttonType() {
        const { wasSaved } = this.state;
        if (wasSaved) {
            return 'success';
        }
        return '';
    }

    get surveyAnswers() {
        const { survey: { answers } } = this.state;
        return answers.map(({ _id, text, value }, index) => (
            <AnswersInputGroup
                key={_id}
                text={text}
                value={value}
                onChangeText={event => this.handleChangeAnswerText(event.target.value, index)}
                onChangeValue={event => this.handleChangeAnswerValue(event.target.value, index)}
                removeAnswer={() => this.handleClickRemoveButton(index)}
                disabled={!this.props.testingPhase}
            />
        ));
    }

    get isSurveyEmpty() {
        return !this.state.survey.length;
    }

    render() {
        const { isLikeSurvey, testingPhase } = this.props;

        const {
            errorMessage, survey,
        } = this.state;

        const title = (
            <ModuleHead>
                <ModuleTitle>
                    { isLikeSurvey ? "Like" : "Dislike" } Survey
                </ModuleTitle>
            </ModuleHead>
        )

        if (this.props.survey === null) {
            var content = (
                <ModuleSection card content>
                    <div className="notification is-warning">
                        Survey is disabled
                    </div> 
                    { errorMessage ? this.errorMessage : null }
                    
                    { testingPhase &&
                        <div className="level">
                            <div className="level-right">
                                <div className="level-item">
                                    <Button onClick={this.handleDisableToggle}>
                                        Enable survey
                                    </Button>
                                </div>
                            </div>
                        </div>
                    } 
                </ModuleSection>
            )
        } else {
            var content = (
                <ModuleSection card content>
                    <div className='p-3'>
                        <div className="columns">
                            <div className="column">
                                <span>Define the answers you would like to ask if a user <b>{ isLikeSurvey ? "likes" : "dislikes" }</b> an article:</span>
                            </div>
                        </div>
                        <div className="columns">
                            <div className="column">
                                <span className="has-text-weight-bold">Question</span>
                            </div>
                        </div>
                        <div className="columns">
                            <div className="column">
                                <textarea
                                    placeholder="What question would you like to ask?"
                                    value={survey.question}
                                    onChange={this.handleChangeQuestion}
                                    readOnly={!testingPhase}
                                />
                            </div>
                        </div>
                        <div className="columns">
                            <div className="column">
                                <span className="has-text-weight-bold">Answers</span>
                            </div>
                        </div>
                        <div>
                            { this.surveyAnswers }
                        </div>
    
                        { errorMessage ? this.errorMessage : null }
                        
                        { testingPhase && 
                            <div className="level pt-6">
                                <div className="level-left">
                                    <Button onClick={this.handleSubmit} type={this.buttonType}>
                                        { this.buttonText }
                                    </Button>
                                </div>
            
                                <div className="level-right">
                                    <div className="level-item">
                                        <Button onClick={this.handleAddAnswer} type="new">
                                            + Answer
                                        </Button>
                                    </div>
                                    <div className="level-item">
                                        <Button onClick={this.handleDisableToggle}>
                                            Disable survey
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                </ModuleSection>
            )
        }

        return [title, content]
    }
}
