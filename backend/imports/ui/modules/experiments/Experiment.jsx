import { Meteor } from 'meteor/meteor';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Module from '../../layout/Module';
import ModuleSection from '../../layout/ModuleSection';
import ModuleSubtitle from '../../layout/ModuleSubtitle';
import LaunchConfirmationModal from '../../components/experiments/LaunchConfirmationModal';
import FaIcon from '../../elements/FaIcon';




export default class Experiment extends Component {
    constructor(props) {
        super(props);
        this.state = {
            experiment: props.experiment,
            userNumber:props.userNumber,
        };

        this.handleSelectExperiment = this.handleSelectExperiment.bind(this);
    }

    handleSelectExperiment(event) {
        localStorage.setItem('selectedExperiment', this.props.experiment._id);
        if (!event.target.classList.contains("custom-button")) {
            window.location.href = "/information";
        }
    }

    get experiment() {

        return (
            <ModuleSection card content onClick={this.handleSelectExperiment}>
                <ModuleSubtitle > 
                    {this.props.experiment.name} 
                </ModuleSubtitle>
                <div className="level-left">
                    <div className='pt-4'>
                        <div className='pt-0.5'>
                            {this.props.experiment.testingPhase ? 
                            <div>
                                <FaIcon icon="fas fa-cog"/> Status:  <i style={{ color: "gray" }}> Testing </i>
                            </div>
                        :
                            <div>
                                <FaIcon icon="fas fa-sync fa-spin"/> Status:  <i style={{ color: "green" }}> Running </i>
                            </div>}
                        </div>
                        <div className='pt-0.5'>
                            <FaIcon icon="fa-solid fa-id-card"/> <i> Experiment Id: </i>{this.props.experiment._id}
                        </div>
                        <div className='pt-0.5'>
                            <FaIcon icon="fas fa-users"/> <i> Number of Users: </i>{this.props.userNumber}
                        </div>
                    </div>
                </div>
            </ModuleSection>
        )
    }

    render() {
        return (
            <Module>
                { this.experiment }
            </Module>
        );
    }
}

Experiment.defaultProps = {
    experiment: {
        name: '',
        testingPhase: false,
    },
};

Experiment.propTypes = {
    experiment: PropTypes.object,
};

