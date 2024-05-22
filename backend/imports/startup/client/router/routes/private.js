import { Meteor } from 'meteor/meteor';
import { mount } from 'react-mounter';
import { FlowRouter } from 'meteor/kadira:flow-router';
import React from 'react';
import Root from '../../../../ui/Root';
import { firstGrantedRoute, routeGranted } from '../utils_routes';
import Experiments from '../../../../ui/modules/experiments/Experiments';
import Articles from '../../../../ui/modules/articles/Articles';
import Article from '../../../../ui/modules/articles/Article';
import Users from '../../../../ui/modules/users/Users';
import FeedbackSurveys from '../../../../ui/modules/feedbackSurveys/FeedbackSurveys';
import SurveyEditPanel from '../../../../ui/modules/surveys/SurveyEditPanel';
import ModalSurvey from '../../../../ui/components/surveys/ModalSurvey';
import SurveysModule from '../../../../ui/modules/surveys/Surveys';
import TestModule from '../../../../ui/modules/TestModule';
import ModalCreateExperiment from '../../../../ui/components/experiments/ModalCreateExperiment';
import ModalEditExperiment from '../../../../ui/components/experiments/ModalEditExperiment';
import Admins from '../../../../ui/modules/admins/Admins';
import Information from  '../../../../ui/modules/information/Information';
import Algorithms from  '../../../../ui/modules/algorithms/Algorithms';
import Profile from '../../../../ui/modules/profile/Profile';


// a list of all names of all private routes.
// this list is used in {@link firstGrantedRoute}
export const privateRouteNames = [
    'home',
    'users',
    'experiments.create',
    'users',
    'article',
    'articles',
    'feedbacksurveys',
    'surveys',
    'surveys.create',
    'surveys.single',
    'admins',
    'test',
    'information',
    'algorithms',
    'profile',
];


/**
 * create a FlowRouter group and assign the function
 * that should be executed whenever a route in this
 * group is entered.
 * This is the place where we check if the user is
 * signed in and if the user is signed in, we check
 * whether the user has access to the route he is
 * trying to access.
 *
 * @see firstGrantedRoute
 *          returns the first route the user is allowed
 *          to access. This is the route that the user
 *          is redirected to in the case that he is
 *          missing the permissions to access the given
 *          route
 *
 * @see routeGranted
 *          returns whether the user is allowed to access
 *          the given route.
 *
 */
const privateRoutes = FlowRouter.group({
    name: 'private',
    triggersEnter: [
        (context, redirect) => {
            if (!Meteor.user()) {
                const redirectRoute = firstGrantedRoute('signin');
                redirect(redirectRoute);
            } else if (!routeGranted(context.route.name)) {
                const redirectRoute = firstGrantedRoute('experiments');
                redirect(redirectRoute);
            }
        },
    ],
});


/**
 *  Definition of Routes
 *
 *  Please see the FlowRouter documentation for details on this.
 */
privateRoutes.route('/experiments', {
    name: 'experiments',
    action() {
        mount(Root, {
            main: <Experiments />,
            isAtHome: true,
            isNaviHidden: true,
        });
    }
})

privateRoutes.route('/articles', {
    name: 'articles',
    action() {
        mount(Root, {
            main: <Articles />,
        });
    },
});

privateRoutes.route('/articles/:articleId', {
    name: 'articles',
    action({ articleId }) {
        mount(Root, {
            main: <Articles />,
            modal: <Article articleId={articleId} />,
        });
    },
});

privateRoutes.route('/information', {
    name: 'information',
    action() {
        mount(Root, {
            main: <Information />,
        });
    },
});

privateRoutes.route('/users', {
    name: 'users',
    action() {
        mount(Root, {
            main: <Users />,
        });
    },
});

privateRoutes.route('/algorithms', {
    name: 'algorithms',
    action() {
        mount(Root, {
            main: <Algorithms />,
        });
    },
});

privateRoutes.route('/experiments/create', {
    name: 'experiments.create',
    action() {
        mount(Root, {
            main: <></>,
            modal: <ModalCreateExperiment />,
        });
    },
});

privateRoutes.route('/feedbacksurveys', {
    name: 'feedbacksurveys',
    action() {
        mount(Root, {
            main: <FeedbackSurveys />
        });
    },
});

const surveyRoutes = FlowRouter.group({
    name: 'surveys',
    prefix: '/surveys',
});

surveyRoutes.route('/', {
    name: 'surveys',
    action() {
        mount(Root, {
            main: <SurveysModule />,
        });
    },
});

surveyRoutes.route('/create-new', {
    name: 'surveys.create',
    action() {
        mount(Root, {
            main: <SurveysModule />,
            modal: <ModalSurvey />,
        });
    },
});

surveyRoutes.route('/:surveyId', {
    name: 'surveys.single',
    action(params) {
        mount(Root, {
            main: <SurveyEditPanel surveyId={params.surveyId} />,
        });
    },
});


privateRoutes.route('/admins', {
    name: 'admins',
    action() {
        mount(Root, {
            main: <Admins />,
            isNaviHidden: true
        });
    },
});

privateRoutes.route('/profile', {
    name: 'profile',
    action() {
        mount(Root, {
            main: <Profile />,
            isNaviHidden: true
        });
    },
});

privateRoutes.route('/test', {
    name: 'test',
    action() {
        mount(Root, {
            main: <TestModule />,
        });
    },
});
