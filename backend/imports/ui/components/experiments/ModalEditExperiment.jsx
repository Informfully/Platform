import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '@fortawesome/fontawesome-free/js/all';
import ModalBody from '../../elements/modal/ModalBody';
import ModalFoot from '../../elements/modal/ModalFoot';
import Modal from '../../elements/modal/Modal';
import Button from '../../elements/Button';

export default class ModalEditExperiment extends Component {

    constructor(props) {
        super(props);

        this.state = {
            errorMessage: '',
            isLoading: false,
        };

        this.handleSubmit = this.handleSubmit.bind(this);
        this.submitForm = this.submitForm.bind(this);
        this.formRef = React.createRef();
    }

    get errorMessage() {
        const { errorMessage } = this.state;
        return (
            <div className="columns">
                <div className="column">
                    <div className="text-error">
                        { errorMessage }
                    </div>
                </div>
            </div>
        );
    }

    hide() {
        FlowRouter.go('/users');
    }

    submitForm() {
        this.formRef.current.dispatchEvent(new Event('submit'));
    }

    handleSubmit(event) {
        event.preventDefault();

        const name = event.target.name.value.trim();

        if (!name || !name.length) {
            this.setState({ errorMessage: 'Invalid input' });
            return false;
        }

        this.setState({ isLoading: true });

        Meteor.call('experiments.create', name, (err) => {
            if (err) {
                this.setState({ errorMessage: err.reason });
                return false;
            }

            FlowRouter.go('users');
        });
    }

    render() {
        const { isLoading, errorMessage } = this.state;

        if (isLoading) {
            return (
                <Modal className="modal-survey-new" centered>
                    <ModalBody>
                        ...loading :)
                    </ModalBody>
                </Modal>
            );
        }

        return (
            <Modal centered closeModal={this.hide}>
                <ModalBody className="text-center">

                    <form
                        className="form-container"
                        onSubmit={this.handleSubmit}
                        ref={this.formRef}
                    >
                        { errorMessage ? this.errorMessage : null }

                        <div className="form-container__row">
                            <input
                                type="text"
                                placeholder="Enter a name for your experiment"
                                autoFocus
                                name="name"
                            />
                        </div>
                    </form>

                </ModalBody>
                <ModalFoot>
                    <div className="columns is-centered">
                        <div className="column is-narrow">
                            <Button onClick={this.hide} className="button--grey--inverted">
                                Cancel
                            </Button>
                        </div>
                        <div className="column is-narrow">
                            <Button onClick={this.submitForm}>
                                Create Experiment
                            </Button>
                        </div>
                    </div>
                </ModalFoot>
            </Modal>
        );
    }
}
