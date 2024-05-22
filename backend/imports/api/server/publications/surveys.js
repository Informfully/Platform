import { Meteor } from 'meteor/meteor';
import { Surveys } from '../../surveys';
import { Answers } from '../../answers';

Meteor.publish('surveys', () => {
    const user = Meteor.user({ fields: { experiments: 1 } });
    if (!user) {
        throw new Meteor.Error(403, 'Permission Denied');
    }

    experiments = user.experiments.map(experiment => experiment.experiment)

    return Surveys.find({ experiment: { $in: experiments } });
});

Meteor.publish('surveys.unanswered', function unansweredSurveysPublication() {
    let initializing = true;

    const { userId } = this;
    const user = Meteor.user();

    if (!userId || !user) {
        return [];
    }
    const { participatesIn } = user;

    const answeredSurveysIds = Answers.find({ userId }, { fields: { surveyId: 1 } })
        .map(({ surveyId }) => surveyId);

    Surveys.find({
        _id: { $nin: answeredSurveysIds },
        experiment: participatesIn,
    }, {
        sort: { createdAt: 1 },
    }).forEach(survey => (
        this.added('unansweredSurveys', survey._id, survey)
    ));

    const answersObserver = Answers.find({ userId }).observe({

        added: (document) => {
            if (initializing) {
                return false;
            }

            const { surveyId } = document;
            this.removed('unansweredSurveys', surveyId);
        },

        removed: (document) => {
            const { surveyId } = document;
            const survey = Surveys.findOne({ _id: surveyId });
            this.added('unansweredSurveys', surveyId, survey);
        },

    });

    const surveysObserver = Surveys.find({ experiment: participatesIn }).observeChanges({

        added: (id, fields) => {
            if (initializing) {
                return false;
            }

            const hasAnsweredSurvey = Answers.find({ userId, surveyId: id }).count() > 0;

            if (!hasAnsweredSurvey) {
                this.added('unansweredSurveys', id, fields);
            }
        },

        removed: (id) => {
            this.removed('unansweredSurveys', id);
        },

    });

    this.ready();
    initializing = false;

    this.onStop(() => {
        answersObserver.stop();
        surveysObserver.stop();
    });
});
