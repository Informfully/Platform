import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Meteor } from 'meteor/meteor';

import { Surveys } from '../../../api/surveys';
import Experiments from '../../../api/experiments';

import Module from '../../layout/Module';
import ModuleHead from '../../layout/ModuleHead';
import ModuleTitle from '../../layout/ModuleTitle';
import ModuleSection from '../../layout/ModuleSection';
import Button from '../../elements/Button';
import DeleteConfirmationModal from '../../components/surveys/DeleteConfirmationModal';
import SurveyQuestionsEditor from './questions/SurveyQuestionsEditor';
import SurveyQuestionsReadOnly from './questions/SurveyQuestionsReadOnly';

class Survey extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isConfirmationModalShown: false,
            isActive: props.isActive,
        };

        this.handleSurveyInput = this.handleSurveyInput.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.toggleConfirmationModal = this.toggleConfirmationModal.bind(this);
        this.removeSurvey = this.removeSurvey.bind(this);
    }

    componentDidUpdate(prevProps) {
        if (this.props.isActive !== prevProps.isActive) {
          this.setState({ isActive: this.props.isActive });
        }
      }

    toggleConfirmationModal() {
        this.setState(({ isConfirmationModalShown }) => ({ isConfirmationModalShown: !isConfirmationModalShown }));
    }

    removeSurvey() {
        const { _id } = this.props;
        Meteor.call('surveys.delete', _id, (err) => {
            if (err) {
                return false;
            }

            FlowRouter.go('surveys');
        });
    }

    handleSurveyInput(event) {
        const { target } = event;
        const value = target.checked;
        const { name } = target;

        this.setState({
            [name]: value,
        });
    }

    handleSubmit() {
        Meteor.call('surveys.update', this.props._id, this.state.isActive, (err) => {
            if (err) { console.log(err); }
        });
    }

    render() {
        const {
            _id,
            name,
            questions,
            isLoading,
        } = this.props;
        const { isConfirmationModalShown } = this.state;

        if (isLoading) {
            return (
                <div>Loading...</div>
            );
        }

        return (
            <Module>
                <ModuleHead>
                    <ModuleTitle>
                        { name }
                    </ModuleTitle>
                </ModuleHead>

                <ModuleSection card content>
                    <div className="columns">
                        <div className="column is-narrow mt-2">
                            Active
                        </div>
                        <div className="column">
                            <input id="isActive" type="checkbox" name="isActive" checked={this.state.isActive} onChange={this.handleSurveyInput} />
                        </div>
                    </div>
                    <div className="level">
                        <div className="level-left">
                            <Button className="level-item" onClick={this.handleSubmit}>
                                Save
                            </Button>
                        </div>
                        <div className="level-right">
                            <Button type="danger" className="level-item" onClick={this.toggleConfirmationModal}>
                                Delete this Survey
                            </Button>
                        </div>
                    </div>
                </ModuleSection>

                <DeleteConfirmationModal
                    isShown={isConfirmationModalShown}
                    cancel={this.toggleConfirmationModal}
                    confirm={this.removeSurvey}
                />

                { this.props.experiment.testingPhase
                    ? <SurveyQuestionsEditor surveyId={_id} initialQuestions={questions} />
                    : <SurveyQuestionsReadOnly questions={questions} />
                }
            </Module>

        );
    }

}

Survey.defaultProps = {
    _id: '',
    name: '',
    questions: [],
    isActive: false,
};

Survey.propTypes = {
    isLoading: PropTypes.bool.isRequired,
    questions: PropTypes.array,
    // from the survey object
    _id: PropTypes.string,
    name: PropTypes.string,
    isActive: PropTypes.bool,
};

export default withTracker(({ surveyId }) => {
    const surveySubscription = Meteor.subscribe('surveys');
    const experimentSubscription = Meteor.subscribe('experiments');

    const isLoading = !surveySubscription.ready() || !experimentSubscription.ready();

    if (!isLoading) {
        var survey = Surveys.findOne(surveyId);
        var experiment = Experiments.findOne({ _id: survey.experiment }, { fields: { testingPhase: 1 } });
    }

    return {
        isLoading,
        ...survey,
        experiment,
    };

})(Survey);
