import { Meteor } from 'meteor/meteor';
import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';
import Experiments from '../../../api/experiments';

import Module from '../../layout/Module';
import FeedbackSurvey from './FeedbackSurvey';
import ModuleSection from '../../layout/ModuleSection';
import { useTheme }  from '../../context/ThemeContext'


class FeedbackSurveys extends Component {
    render() {
        const { isLoading } = this.props;

        if (isLoading) {
            return (<p>Loading...</p>);
        }


        const {
            dislikeSurvey, likeSurvey, testingPhase,
        } = this.props;


        const experimentId = localStorage.getItem('selectedExperiment');

        if (experimentId=='') {
            return (<p>No experiment selected</p>);
        }

        return (
            <Module>
                {
                    !testingPhase
                    && (
                        <ModuleSection>
                            <div className="notification is-warning">
                                The feedback surveys can't be modified as the experiment has already launched!
                            </div>
                        </ModuleSection>
                    )
                }
                <FeedbackSurvey survey={likeSurvey} isLikeSurvey experimentId={experimentId} testingPhase={testingPhase} />
                <FeedbackSurvey survey={dislikeSurvey} isLikeSurvey={false} experimentId={experimentId} testingPhase={testingPhase} />
            </Module>
        );
    }
}

FeedbackSurveys.defaultProps = {
    isLoading: true,
    dislikeSurvey: {
        question: '',
        answers: [],
    },
    likeSurvey: {
        question: '',
        answers: [],
    },
    testingPhase: true,
};

FeedbackSurveys.propTypes = {
    isLoading: PropTypes.bool,
    dislikeSurvey: PropTypes.object,
    likeSurvey: PropTypes.object,
};

export default withTracker(() => {
    const selectedExperiment = localStorage.getItem('selectedExperiment');
    const experimentSubscription = Meteor.subscribe('experiments');
    const isLoading = !experimentSubscription.ready();

    const experiment = Experiments.findOne({
        _id: selectedExperiment,
    }, {
        fields: {
            dislikeSurvey: 1,
            likeSurvey: 1,
            testingPhase: 1,
        },
    });

    if (experiment !== undefined) {
        var { dislikeSurvey } = experiment;
        var { likeSurvey } = experiment;
        var { testingPhase } = experiment;
    }

    return {
        isLoading,
        dislikeSurvey,
        likeSurvey,
        testingPhase,
    };

})(FeedbackSurveys);
