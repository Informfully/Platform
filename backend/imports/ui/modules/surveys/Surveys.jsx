import { Meteor } from 'meteor/meteor';
import React, { useState } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';

import { Surveys } from '../../../api/surveys';
import Module from '../../layout/Module';
import ModuleHead from '../../layout/ModuleHead';
import ModuleTitle from '../../layout/ModuleTitle';
import ModuleSection from '../../layout/ModuleSection';
import Button from '../../elements/Button';
import FaIcon from '../../elements/FaIcon';
import Survey from './Survey';
import { useTheme } from '../../context/ThemeContext';
import { useTracker } from 'meteor/react-meteor-data';


export default function SurveysModule() {

    const {themeIsDark} = useTheme();
    const theme = themeIsDark?'is-dark':'';


    const isLoading = useTracker(() => {
        const surveySubscription = Meteor.subscribe('surveys');
        return !surveySubscription.ready();
    }, []);

    function surveys() {

        const selectedExperiment = localStorage.getItem('selectedExperiment');
        const surveys = Surveys.find({ experiment: selectedExperiment }, {
            fields: {
              name: 1,
              _id: 1,
              experiment: 1,
              questions: 1,
              isActive: 1,
            },
        }).fetch();

        if (!surveys.length) {
            return (
                <p className={`${theme}`}>No surveys for selected experiment.</p>
            )
        }

        return surveys.map(survey => (
            <Survey key={survey._id} {...survey}/>
        ));
    }


    return (
        isLoading?
        <p>Loading...</p>
        :
        <Module>
            <ModuleHead>
                <ModuleTitle>
                    Surveys
                </ModuleTitle>
                <div className="level-right">
                    <div className="level-item">
                        <Button href="/surveys/create-new" text={false} type="new">
                            <FaIcon icon="plus" />
                            New Survey
                        </Button>
                    </div>
                </div>
            </ModuleHead>
            <ModuleSection className={`${theme}`}>
                <div className="columns is-multiline">
                    {surveys()}
                </div>
            </ModuleSection>
        </Module>
    );
}
