import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '../../../lib/utils/utils';

/**
 * This class implements the main container for a modal.
 *
 * Use this component with
 *
 * @see ModalHead
 *          head component of the modal. this part will be
 *          positioned on the top of the page.
 *
 * @see ModalBody
 *          body component of the modal. this part will be
 *          positioned between the head and foot such that
 *          it stretches and uses all the remaining vertical space.
 *
 *          using <Modal centered/> will center the content of
 *          ModalBody vertically and horizontally.
 *
 * @see ModalFoot
 *          foot component of the modal. this part will be
 *          positioned on the bottom of the page (or simply below
 *          the body component if the modal is larger than the
 *          viewport height).
 *
 * such that Modal is used as the container component of the modal structure:
 *
 *   <Modal>
 *      <ModalHead> your modal head </ModalHead>
 *      <ModalBody> your modal head </ModalBody>
 *      <ModalFoot> your modal head </ModalFoot>
 *   </Modal>
 *
 *
 *
 * It adds a keydown event and attaches the passed close function to it
 * and includes the escape button in the top right corner if such a
 * function was provided.
 */
export default class Modal extends Component {

    constructor(props) {
        super(props);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    componentDidMount() {
        const { closeModal } = this.props;
        if (closeModal) {
            document.addEventListener('keydown', this.handleKeyDown);
        }
    }

    componentWillUnmount() {
        const { closeModal } = this.props;
        if (closeModal) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
    }

    get modalClassNames() {
        const { className, centered } = this.props;

        const classes = {
            "custom-modal": true,
            'custom-modal--is-centered': !!centered,
        };

        return `${classNames(classes)} ${className}`;
    }

    get escButton() {
        const { closeModal } = this.props;
        return (
            <a className="custom-button button--grey--inverted esc-button--hero" onClick={closeModal}>
                esc
            </a>
        );
    }

    handleKeyDown(event) {
        const { closeModal } = this.props;
        const ESCAPE_KEY = 27;
        switch (event.keyCode) {
        case ESCAPE_KEY:
            closeModal();
            break;
        default:
            break;
        }
    }

    render() {
        const { closeModal, children } = this.props;
        return (
            <div className={this.modalClassNames}>
                { closeModal ? this.escButton : null }
                { children }
            </div>
        );
    }

}

Modal.defaultProps = {
    children: <></>,
    centered: false,
    className: '',
    closeModal: null,
};

Modal.propTypes = {
    children: PropTypes.node,
    centered: PropTypes.bool,
    className: PropTypes.string,
    closeModal: PropTypes.func,
};
