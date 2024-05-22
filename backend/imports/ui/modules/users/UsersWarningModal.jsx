import React from 'react';
import Button from '../../elements/Button';

export default function UsersWarningModal(props) {
    return (
        <div className={ "modal" + (props.isActive ? " is-active" : "") }>
            <div className="modal-background"></div>
            <div className="modal-card">
                <div className="modal-card-head">
                    <p className="modal-card-title">Error</p>
                    <button className="delete" onClick={props.onDismiss} aria-label="close"></button>
                </div>
                <div className="modal-card-body is-size-5">
                    The current Experiment has already launched. Users cannot be added at this point.
                </div>
                <div className="modal-card-foot">
                    <Button onClick={props.onDismiss} >OK</Button>
                </div>
            </div>
        </div>
    )
}