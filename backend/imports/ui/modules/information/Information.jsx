import { Meteor } from 'meteor/meteor';
import React, { useState,useEffect } from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';
import { hasExperimentLaunched } from '../../../lib/utils/utils_account';
import LaunchConfirmationModal from '../../components/experiments/LaunchConfirmationModal';

import Module from '../../layout/Module';
import ModuleSection from '../../layout/ModuleSection';
import ModuleHead from '../../layout/ModuleHead';
import ModuleTitle from '../../layout/ModuleTitle';
import InformationRow from './table/InformationRow';
import Experiments from '../../../api/experiments';
import Button from '../../elements/Button';
import Dropbox from '../../elements/Dropbox';

export default function Information({}) {

    const modes = {0:"Normal",1:"TikTok"};

    const [isLaunchConfirmationShown,setIsLaunchConfirmationShown] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const experimentId = localStorage.getItem('selectedExperiment');

    const isLoading = useTracker(() => {
        const experimentSubscription = Meteor.subscribe('experiments');
        return !experimentSubscription.ready();
    }, []);

    const experiment = useTracker(()=>{
        return Experiments.findOne({ _id: experimentId });
    }, [isLoading]);

    const findModeSelectedIndex = (mode) => {
        for (const [key, value] of Object.entries(modes)) {
            if (value === mode) {
                return key;
            }
        }
        return 0;
    }

    function handleLaunch() {
        Meteor.call('experiments.launch', experiment._id, (err) => {
            if (err) {
                console.error(err);
                setErrorMessage("Something went wrong");
                return false;
            }
        });
        setIsLaunchConfirmationShown(false);
    }

    function handleModeChange(newValue){
        Meteor.call('experiments.updateInformation',experimentId, {key:"mode", value: newValue});
    }

    return (
        isLoading?
        <div>is Loading...</div>
        :
        <Module>
            <ModuleHead>
                <div>
                    <ModuleTitle >
                        {experiment.name}
                    </ModuleTitle>
                    {
                        !experiment.testingPhase?
                        (<Button type="running">
                            Running
                        </Button>)
                        :
                        (<Button type="new" onClick={ () => { setIsLaunchConfirmationShown(true);} }>
                            <span>
                                <i className="fas fa-play"/>
                                &nbsp;&nbsp;&nbsp;Launch
                            </span> 
                        </Button>)
                    }
                </div>
            </ModuleHead>

            <ModuleSection card content>
                <Dropbox data={modes} tag="Mode" currentKey={findModeSelectedIndex(experiment.mode)} updateFuntion={(newValue)=>{handleModeChange(newValue)}}/>
            </ModuleSection>

            <ModuleSection card content>
                <InformationRow experimentId ={experimentId} value={experiment.name} k="name" tag="Experiment Name" />
                <InformationRow experimentId ={experimentId} value={experiment.adminName} k="adminName" tag="Administrator" />
                <InformationRow experimentId ={experimentId} value={experiment.contactInfo} k="contactInfo" tag="Contact" />
                <InformationRow experimentId ={experimentId} value={experiment.description} k="description" tag="Description" />
                <InformationRow experimentId ={experimentId} value={experiment.urlPP} k="urlPP" tag="Url to Privacy Policy" />
                <InformationRow experimentId ={experimentId} value={experiment.urlTC} k="urlTC" tag="Url to Terms & Conditions" />
            </ModuleSection>
            <LaunchConfirmationModal
                isShown={isLaunchConfirmationShown}
                cancel={() => {setIsLaunchConfirmationShown(false);}}
                confirm={handleLaunch}
            />
        </Module>
    );
}