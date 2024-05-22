import { Mongo } from 'meteor/mongo';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';

export const Questions = new Mongo.Collection(null);

export default class SurveyQuestions {

    static EMPTY_QUESTION = {
        // _id: Random.id(),
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
    };

    static get EMPTY_ANSWER() {
        return {
            _id: Random.id(),
            text: '',
            value: 0,
        };
    }

    static upsert(surveyId, questions) {
        questions.forEach(question => Questions.upsert({ _id: question._id }, { ...question, surveyId }));
    }

    static insert(question) {
        return Questions.insert(question);
    }

    static insertEmptyQuestion(surveyId) {
        this.insert({ surveyId, ...this.EMPTY_QUESTION });
    }

    static remove(questionId) {
        const { surveyId } = Questions.findOne(questionId);
        const numberOfQuestions = Questions.find({ surveyId }).count();
        if (numberOfQuestions > 1) {
            return Questions.remove(questionId);
        } else {
            this.insert({ ...this.EMPTY_QUESTION, surveyId });
            return Questions.remove(questionId);
        }
    }

    static removeAll(surveyId) {
        return Questions.remove({ surveyId });
    }

    static updateQuestion(questionId, field, value) {
        return Questions.update(questionId, { $set: { [field]: value } });
    }

    static addAnswerToQuestion(questionId, answer) {
        return Questions.update(questionId, { $push: { answers: answer } });
    }

    static addEmptyAnswerToQuestion(questionId) {
        this.addAnswerToQuestion(questionId, this.EMPTY_ANSWER);
    }

    static duplicateQuestion(questionId) {
        const question = Questions.findOne(questionId);
        const duplicate = _.omit(question, '_id');
        this.insert(duplicate);
    }

    static updateAnswer(questionId, answerId, field, value) {
        return Questions.update({
            _id: questionId,
            'answers._id': answerId,
        }, {
            $set: {
                [`answers.$.${field}`]: value,
            },
        });
    }

    static removeAnswer(questionId, answerId) {
        const question = Questions.findOne(questionId);
        const answers = question.answers.filter(({ _id }) => _id !== answerId);
        if (answers.length === 0) {
            answers.push(this.EMPTY_ANSWER);
        }
        return Questions.update(questionId, { $set: { answers } });
    }

    static getAllErrors(surveyId) {
        const questions = Questions.find({ surveyId }).fetch();
        const errors = { count: 0 };
        questions.forEach(({ _id }) => {
            errors[_id] = [];
            if (!this.hasValidText(_id)) {
                errors[_id].push('Please add your question');
                errors.count += 1;
            }
            if (!this.hasMinAndMaxSelect(_id)) {
                errors[_id].push('Please set a min and max select value');
                errors.count += 1;
            }
            if (!this.hasValidAnswerTextsAndValues(_id)) {
                errors[_id].push('Please add a text and value to every answer');
                errors.count += 1;
            }
            if (!this.hasValidSelectionsFrom(_id)) {
                errors[_id].push('Please set a value for "with at least"');
                errors.count += 1;
            }
            if (!this.selectionsFromExists(_id)) {
                errors[_id].push('The selected question does not exist');
                errors.count += 1;
            }
            if (!this.hasValidOtherOption(_id)) {
                errors[_id].push('Please set a text and value for the "other option"');
                errors.count += 1;
            }
            if (!this.hasValidSkipOption(_id)) {
                errors[_id].push('Please set a text and value for the "skip answer"');
                errors.count += 1;
            }
        });
        return errors;
    }

    static hasValidText(questionId) {
        const { text } = Questions.findOne(questionId);
        return text && text.length > 0;
    }

    static hasMinAndMaxSelect(questionId) {
        const { minSelect, maxSelect } = Questions.findOne(questionId);
        return (minSelect || minSelect === 0)
            && (maxSelect || maxSelect === 0)
            && (maxSelect >= minSelect || maxSelect === 0);
    }

    static hasValidAnswerTextsAndValues(questionId) {
        const { answers, selectionsFrom } = Questions.findOne(questionId);

        if (selectionsFrom && selectionsFrom._id) {
            return this.hasValidSelectionsFrom(questionId) && this.selectionsFromExists(questionId);
        }

        if (answers.length === 0) {
            return false;
        }

        return answers.every(({ text, value }) => (
            text.length > 0
            && (value
                || value === 0
                || (
                    value.length
                    && value.length > 0
                )
            )
        ));
    }

    static hasValidSelectionsFrom(questionId) {
        const { selectionsFrom, withAtLeast } = Questions.findOne(questionId);
        if (selectionsFrom && selectionsFrom._id) {
            return withAtLeast || withAtLeast === 0;
        }
        return true;
    }

    static selectionsFromExists(questionId) {
        const { selectionsFrom } = Questions.findOne(questionId);
        if (selectionsFrom && selectionsFrom._id) {
            return !!Questions.findOne(selectionsFrom._id);
        }
        return true;
    }

    static hasValidOtherOption(questionId) {
        const { hasOtherOption, otherAnswerText, otherAnswerValue } = Questions.findOne(questionId);

        if (!hasOtherOption) {
            return true;
        }

        return otherAnswerText && otherAnswerText.length > 0
            && (otherAnswerValue
                || otherAnswerValue === 0
                || (
                    otherAnswerValue.length
                    && otherAnswerValue.length > 0
                )
            );
    }

    static hasValidSkipOption(questionId) {
        const { canBeSkipped, skipAnswerText, skipAnswerValue } = Questions.findOne(questionId);

        if (!canBeSkipped) {
            return true;
        }

        return skipAnswerText && skipAnswerText.length > 0
            && (skipAnswerValue
                || skipAnswerValue === 0
                || (
                    skipAnswerValue
                    && skipAnswerValue.length
                    && skipAnswerValue.length > 0
                )
            );
    }
}
