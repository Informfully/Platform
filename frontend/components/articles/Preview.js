import React from 'react';
import PropTypes from 'prop-types';
import PreviewWithImage from './PreviewWithImage';
import LargePreviewWithImage from './LargePreviewWithImage';

export default class Preview extends React.Component {

    constructor(props) {
        super(props);
        this.state = { large: props.large, fastAnimate: false, shake: false };
    }

    componentDidUpdate(prevProps) {
        if (this.props.large !== prevProps.large) {
            this.setState({ large: this.props.large, fastAnimate: true });
        }
    }

    onLongPress() {
        const { shake } = this.state;
        if (this.props.onLongPress) {
            this.props.onLongPress();
        } else {
            this.setState({ shake: !shake });
        }
    }

    get iconName() {
        const { articleType } = this.props;
        switch (articleType) {
        case 'video':
            return 'play';
        case 'podcast':
            return 'volume-up';
        default:
            return '';
        }
    }


    render() {
        const {
            index,
            isInInitialSet,
            readTimeMinutes,
            image,
            lead,
            setToast,
        } = this.props;

        const { large, fastAnimate, shake } = this.state;
        if (large) {
            return (
                <LargePreviewWithImage
                    {...this.props}
                    lead={lead}
                    iconName={this.iconName}
                    image={image}
                    index={index}
                    isInInitialSet={isInInitialSet}
                    readTimeMinutes={readTimeMinutes}
                    fastAnimate={fastAnimate}
                    onLongPress={() => this.onLongPress()}
                    shake={shake}
                    setToast={setToast}
                />
            );
        } if (image) {
            return (
                <PreviewWithImage
                    {...this.props}
                    onLongPress={() => this.onLongPress()}
                    image={image}
                    iconName={this.iconName}
                    index={index}
                    isInInitialSet={isInInitialSet}
                    readTimeMinutes={readTimeMinutes}
                    shake={shake}
                    setToast={setToast}
                />
            );
        }
        return (
            <PreviewWithImage
                {...this.props}
                image={image}
                iconName={this.iconName}
                index={index}
                isInInitialSet={isInInitialSet}
                readTimeMinutes={readTimeMinutes}
                onLongPress={() => this.onLongPress()}
                shake={shake}
                setToast={setToast}
            />
        );
    }

}

Preview.defaultProps = {
    index: 1,
    isInInitialSet: false,
    readTimeMinutes: null,
    image: '',
    large: false,
};

Preview.propTypes = {
    index: PropTypes.number,
    isInInitialSet: PropTypes.bool,
    readTimeMinutes: PropTypes.number,
    image: PropTypes.string,
    large: PropTypes.bool,
    setToast: PropTypes.func.isRequired,
    articleType: PropTypes.string.isRequired,

};
