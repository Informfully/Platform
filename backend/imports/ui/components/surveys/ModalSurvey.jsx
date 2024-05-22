import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import '@fortawesome/fontawesome-free/js/all';
import ModalBody from '../../elements/modal/ModalBody';
import ModalFoot from '../../elements/modal/ModalFoot';
import Modal from '../../elements/modal/Modal';
import Button from '../../elements/Button';

export default class ModalSurvey extends Component {

    constructor(props) {
        super(props);

        this.state = {
            surveyName:'',
            errorMessage: '',
            isLoading: false,
        };
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleClickIcon = this.handleClickIcon.bind(this);
        this.formRef = React.createRef();
    }

    componentDidMount() {
        const selectedExperiment = localStorage.getItem('selectedExperiment');
        if (selectedExperiment==='') {
            this.hide();
        }
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
        FlowRouter.go('/surveys');
    }

    handleClickIcon() {
        this.formRef.current.dispatchEvent(new Event('submit', { cancelable: true }));
    }

    handleInputChange = (event) => {
        this.setState({ surveyName : event.target.value.trim()});
    };

    handleSubmit() {
        const surveyName = this.state.surveyName;
        const selectedExperiment = localStorage.getItem('selectedExperiment');
        

        if (!surveyName || !surveyName.length) {
            this.setState({ errorMessage: 'Invalid input' });
            return false;
        }

        this.setState({ isLoading: true });

        Meteor.call('surveys.create', surveyName, selectedExperiment, (err, res) => {
            if (err) {
                this.setState({ errorMessage: err.reason });
            }

            if (res) {
                FlowRouter.redirect(`/surveys/${res}`);
            }
            
            this.setState({ isLoading: false });
        });
    }

    render() {
        const { isLoading, errorMessage } = this.state;

        if (isLoading) {
            return (
                <Modal className="modal-survey-new" centered>
                    <ModalBody>
                        ...loading :
                    </ModalBody>
                </Modal>
            );
        }

        return (
            <Modal className="modal-survey-new" centered closeModal={this.hide}>
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
                                placeholder="Enter a name for your survey"
                                autoFocus
                                name="surveyName"
                                onChange={this.handleInputChange}
                            />
                            <span className="icon-arrow" onClick={this.handleClickIcon}>
                                <i className="fas fa-arrow-circle-right" />
                            </span>
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
                    </div>
                </ModalFoot>
            </Modal>
        );
    }
}
