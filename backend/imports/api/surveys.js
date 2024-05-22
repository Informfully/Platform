import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { check } from 'meteor/check';
import { Mongo } from 'meteor/mongo';

import { userOwnsSurvey, userOwnsExperiment } from '../lib/utils/utils_account';

export const Surveys = new Mongo.Collection('surveys');
export const UnansweredSurveys = new Mongo.Collection('unansweredSurveys');

Meteor.methods({

    'surveys.create'(surveyName, experimentId) {
        check(surveyName, String);
        check(experimentId, String);

        const user = Meteor.user({ fields: { experiments: 1 } });
        
        if (!user) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        if (!userOwnsExperiment(experimentId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        return Surveys.insert({
            name: surveyName,
            experiment: experimentId,
            createdBy: user._id,
            createdAt: new Date(),
            isActive: true,
            questions: [{
                _id: Random.id(),
                text: '',
                minSelect: 1,
                maxSelect: 1,
                answers: [
                    {
                        _id: Random.id(),
                        text: '',
                        value: 0,
                    },
                ],
            }],
        });
    },

    'surveys.delete'(surveyId) {
        check(surveyId, String);

        if (!userOwnsSurvey(surveyId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        return Surveys.remove(surveyId);
    },

    'surveys.update'(surveyId, isActive) {
        check(surveyId, String);
        check(isActive, Boolean);

        if (!userOwnsSurvey(surveyId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        Surveys.update({ _id: surveyId }, { $set: { isActive }});
    },

    'surveys.changeName'(surveyId, name) {
        check(surveyId, String);
        check(name, String);

        if (!userOwnsSurvey(surveyId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        Surveys.update({ _id: surveyId }, { $set: { name }});
    },

    'surveys.questions.update'(surveyId, surveyQuestions) {
        check(surveyId, String);
        check(surveyQuestions, Array);

        if (!userOwnsSurvey(surveyId)) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        // technically it would be more sensible to parse all inputs
        // on the client side, i.e. inside the modal / form where the
        // questions are edited (inside the change handlers). Unfortunately,
        // using 'parseFloat' inside such a handler, which updates the state
        // directly, leaves us with a very bad UX (to type a float one needs
        // to start with '.', typing '0.' clears the input).
        // thus, we transform all inputs here
        const questions = surveyQuestions.map((question) => {
            const newQuestion = {
                ...question,
                minSelect: parseInt(question.minSelect, 10),
                maxSelect: parseInt(question.maxSelect, 10),
                answers: question.answers.map(({ _id, text, value }) => ({
                    _id,
                    text,
                    value: isNaN(parseFloat(value)) ? value : parseFloat(value),
                })),
            };

            if (question.withAtLeast) {
                newQuestion.withAtLeast = parseInt(question.withAtLeast, 10);
            }

            if (question.selectionsFrom) {
                newQuestion.selectionsFrom = {
                    _id: question.selectionsFrom.value,
                    index: question.selectionsFrom.index,

                    // value and label are used in the select component
                    // in the edit modal.
                    value: question.selectionsFrom.value,
                    label: question.selectionsFrom.label,
                };
            }

            if (question.canBeSkipped) {
                newQuestion.canBeSkipped = question.canBeSkipped;
                newQuestion.skipAnswerText = question.skipAnswerText;
                newQuestion.skipAnswerValue = isNaN(parseFloat(question.skipAnswerValue))
                    ? question.skipAnswerValue
                    : parseFloat(question.skipAnswerValue);
            }

            if (question.hasOtherOption) {
                newQuestion.hasOtherOption = question.hasOtherOption;
                newQuestion.otherAnswerText = question.otherAnswerText;
                newQuestion.otherAnswerValue = isNaN(parseFloat(question.otherAnswerValue))
                    ? question.otherAnswerValue
                    : parseFloat(question.otherAnswerValue);
            }

            return newQuestion;
        });

        return Surveys.update(surveyId, { $set: { questions } });
    },

});