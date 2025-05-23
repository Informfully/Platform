import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import { Meteor } from 'meteor/meteor';
import { NewsArticles } from '../../../api/articles';
import Modal from '../../elements/modal/Modal';
import ModalHead from '../../elements/modal/ModalHead';
import ModalBody from '../../elements/modal/ModalBody';

class Article extends Component {

    get hasImage() {
        const { image } = this.props;
        return image && image.length > 0;
    }

    get body() {
        const { body } = this.props;
        const paragraphs = [];
        body.forEach(({ type, text }) => {
            if (type === 'text' && text.length > 0) {
                paragraphs.push(
                    <p>{ text }</p>
                );
            } else if (type === 'subtitle' && text.length > 0) {
                paragraphs.push(
                    <h2>{ text }</h2>
                );
            } else if (type === 'quote' && text.length > 0) {
                paragraphs.push(
                    <p className="quote">{ text }</p>
                );
            }
        });
        return paragraphs;
    }

    hide() {
        FlowRouter.go('/articles');
    }

    render() {
        const {
            exists, isLoading, title, image,
            author, outlet, datePublished,
        } = this.props;

        if (isLoading) {
            return <div>loading...</div>;
        }

        if (!exists) {
            return (
                <div>Article not found :(</div>
            );
        }

        return (
            <Modal closeModal={this.hide} className="modal-article">
                <ModalHead>
                    <h1>{ title }</h1>
                    <span className="modal-article__infotext">
                        {`${author} (${outlet}) - ${datePublished}`}
                    </span>
                </ModalHead>
                <ModalBody>
                    { this.hasImage
                        ? <img src={image} alt={title} />
                        : null
                    }
                    { this.body }
                </ModalBody>
            </Modal>
        );
    }
}

Article.defaultProps = {
    title: '',
    image: '',
    author: '',
    outlet: '',
    body: [],
};

Article.propTypes = {
    title: PropTypes.string,
    isLoading: PropTypes.bool.isRequired,
    exists: PropTypes.bool.isRequired,
    image: PropTypes.string,
    author: PropTypes.string,
    outlet: PropTypes.string,
    datePublished: PropTypes.object.isRequired,
    body: PropTypes.array,
};

export default withTracker(({ articleId }) => {
    const newsArticlesSubscription = Meteor.subscribe('newsArticle', articleId);
    const isLoading = !newsArticlesSubscription.ready();
    const newsArticle = NewsArticles.findOne(articleId);
    const exists = !!newsArticle;

    return {
        isLoading,
        exists,
        ...newsArticle,
    };
})(Article);
