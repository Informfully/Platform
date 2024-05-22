import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { classNames } from '../../../lib/utils/utils';

export default class Preview extends Component {

    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }

    get title() {
        const { title } = this.props;
        if (title.length > 70) {
            return `${title}..`;
        }

        return title;
    }

    get hasImage() {
        const { image } = this.props;
        return image && image.length > 0;
    }

    get articlePreviewClassNames() {
        const classes = {
            articlePreview: true,
            'articlePreview--no-image': !this.hasImage,
        };

        return classNames(classes);
    }

    handleClick() {
        const { _id } = this.props;
        FlowRouter.go('articles', { articleId: _id });
    }

    render() {
        const { title, image } = this.props;

        return (
            <div className={this.articlePreviewClassNames} onClick={this.handleClick}>
                { this.hasImage
                    ? <img src={image} alt={title} />
                    : null
                }
                <div className="articlePreview__overlay" />
                <div className="articlePreview__title">
                    { this.title }
                </div>
            </div>
        );
    }

}

Preview.propTypes = {
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
};
