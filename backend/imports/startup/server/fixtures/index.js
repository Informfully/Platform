import { NewsArticles } from '../../../api/articles';
import { Surveys } from '../../../api/surveys';
import { NEWS_ARTICLES } from './newsArticles';
import { SURVEYS } from './surveys';
import Experiments from '../../../api/experiments';
import Algorithms from '../../../api/algorithms';
import { EXPERIMENT } from './experiments';
import {ALGORITHMS} from './algorithms';

const numberOfNewsArticlesInDatabase = NewsArticles.find().count();
if (numberOfNewsArticlesInDatabase === 0) {
    NEWS_ARTICLES.forEach((n) => {
        NewsArticles.insert(n);
    });
}

const numberOfSurveysInDatabase = Surveys.find().count();
if (numberOfSurveysInDatabase === 0) {
    SURVEYS.forEach((s) => {
        Surveys.insert(s);
    });
}

const numberOfExperimentsInDatabase = Experiments.find().count();
if (numberOfExperimentsInDatabase === 0) {
    Experiments.insert(EXPERIMENT);
}

const numberOfAlgorithmsInDatabase = Algorithms.find().count();
if (numberOfAlgorithmsInDatabase === 0) {
    ALGORITHMS.forEach((a) => {
        Algorithms.insert(a);
    });
}
