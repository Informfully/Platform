import { Session } from 'meteor/session';
import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';

import { Meteor } from 'meteor/meteor';
import { NewsArticlesJoined } from '../../../api/articles';
import Preview from '../../components/articles/Preview';
import Module from '../../layout/Module';
import ModuleHead from '../../layout/ModuleHead';
import ModuleTitle from '../../layout/ModuleTitle';
import ModuleSection from '../../layout/ModuleSection';

class Articles extends Component {

    constructor(props) {
        super(props);

        this.handleScroll = this.handleScroll.bind(this);
    }

    componentDidMount() {
        document.getElementById('app-content').addEventListener('scroll', this.handleScroll);
    }

    componentWillUnmount() {
        document.getElementById('app-content').removeEventListener('scroll', this.handleScroll);
    }

    get newsArticles() {
        const { newsArticles } = this.props;
        return newsArticles.map(n => (
            <div
                key={n._id}
                className="column is-one-quarter-widescreen is-one-third-desktop is-half-tablet is-full-mobile"
            >
                <Preview {...n} />
            </div>
        ));
    }

    handleScroll(event) {
        const { isLoading, isLoadingNew } = this.props;

        if (isLoading || isLoadingNew) {
            return false;
        }

        const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
        const fullyScrolled = scrollHeight - scrollTop === clientHeight;

        if (fullyScrolled) {
            Session.set('articles.limit', Session.get('articles.limit') + 50);
        }
    }

    render() {
        const { isLoading, isLoadingNew } = this.props;

        if (isLoading) {
            return <div>loading...</div>;
        }

        return (
            <Module>
                <ModuleHead>
                    <ModuleTitle>
                        Articles
                    </ModuleTitle>
                </ModuleHead>
                <ModuleSection>
                    <div className="columns is-multiline">
                        { this.newsArticles }

                        {
                            isLoadingNew && !isLoading
                                ? (
                                    <div className="column">
                                    loading...
                                    </div>
                                )
                                : null
                        }
                    </div>
                </ModuleSection>
            </Module>
        );
    }
}

Articles.defaultProps = {
    isLoadingNew: false,
};

Articles.propTypes = {
    isLoading: PropTypes.bool.isRequired,
    newsArticles: PropTypes.array.isRequired,
    isLoadingNew: PropTypes.bool,
};

export default withTracker(() => {
    Session.setDefault('articles.limit', 50);

    const limit = Session.get('articles.limit');
    const newsArticlesSubscription = Meteor.subscribe('newsArticlesJoined', limit);
    const newsArticles = NewsArticlesJoined.find({}, { sort: { datePublished: -1 } }).fetch();
    const isLoading = !newsArticles || newsArticles.length === 0;
    const isLoadingNew = !newsArticlesSubscription.ready();

    return {
        isLoading,
        isLoadingNew,
        newsArticles,
    };
})(Articles);
