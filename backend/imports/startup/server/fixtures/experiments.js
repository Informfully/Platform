import { Random } from 'meteor/random';

const EXPERIMENT = {
    _id: 'default-experiment',
    name: 'default experiment',
    testingPhase: true,
    dislikeSurvey: null,
    likeSurvey: {
        question: 'Wieso mögen Sie den Artikel?',
        answers: [
            {
                _id: Random.id(),
                text: 'Ich stimme den Aussagen des Artikels zu.',
                value: 0,
            },
            {
                _id: Random.id(),
                text: 'Ich mag den Schreibstil.',
                value: 0,
            },
            {
                _id: Random.id(),
                text: 'Das Thema interessiert mich.',
                value: 0,
            },
        ],
    },
    feedbackEmail: 'placeholder@your.domain',
    explanationTagsDef: {
        '60feefd58bd1b5012ad6e689': {
            _id: '60feefd58bd1b5012ad6e689',
            textShort: 'Mmmmmmmmmmm',
            textLong: 'Interests',
            textColorLight: '#FFFFFF',
            textColorDark: '#FFFFFF',
            backgroundColorLight: '#44546A',
            backgroundColorDark: '#44546A',
            detailedExplanation: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut dignissim et enim a tempor. Etiam justo nunc, pellentesque ac placerat id, elementum vel nisl. Curabitur sollicitudin commodo ligula sed rutrum. Aliquam elementum malesuada velit, eget facilisis urna finibus eleifend.',
        },
    },
    maxNrExplanationTags: 3,
    maxCharacterExplanationTagShort: 5,
    maxNrFurtherRecArticles: 3,
    totalLikesDislikesEnabled: true,
    previewTitleLineHeight: 2,
};
export { EXPERIMENT };
