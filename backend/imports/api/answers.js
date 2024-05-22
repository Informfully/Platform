import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Mongo } from 'meteor/mongo';
import { Surveys } from './surveys';

export const Answers = new Mongo.Collection('answers');

Meteor.methods({

    'answers.add'(surveyId, surveyAnswers) {
        check(surveyId, String);
        check(surveyAnswers, Array);

        const userId = Meteor.userId();
        if (!userId) {
            throw new Meteor.Error(403, 'Permission Denied');
        }

        const initialSurvey = Surveys.findOne(surveyId);
        const { questions } = initialSurvey;
        const createdAt = new Date();
        const answers = [];

        surveyAnswers.forEach((a, i) => {
            answers.push({
                questionId: questions[i]._id,
                questionText: questions[i].text,
                selections: Object.keys(a).map(key => a[key]),
            });
        });

        Answers.insert({
            surveyId,
            userId,
            createdAt,
            answers,
        });
    },

});
