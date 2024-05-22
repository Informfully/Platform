import { Meteor } from 'meteor/meteor';
import React, { Component,useState } from 'react';
import Button from '../../elements/Button';
import { Random } from 'meteor/random';
import { number } from 'prop-types';

export default class AdminsCreation extends Component {
    constructor(props) {
        super(props);

        this.state = {
            email: '',
            role: 'Administrator',
            maxUserAccount: 100,
            errorMessage: '',
        };

        this.handleChangeEmail = this.handleChangeEmail.bind(this);
        this.handleRoleSelect = this.handleRoleSelect.bind(this);
        this.handleUserAccountNumSelect = this.handleUserAccountNumSelect.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
 
    handleChangeEmail=(event)=> {
        this.setState({ 
            email: event.target.value
        });
    }

    handleRoleSelect(event){
        this.setState({
            role: event.target.value
        });
    }

    handleUserAccountNumSelect(event){
        const value = parseInt(event.target.value, 10);
        this.setState({
            maxUserAccount: value
        });
    }

    handleSubmit() {
        const initialPassword =  Random.id(10);
        const newUser = {
            email: this.state.email,
            password: initialPassword,
            profile: {
                roles:this.state.role,
                maxUserAccount:this.state.maxUserAccount,
                createdAccount:0,
                plainTextInitialPassword:initialPassword,
            },
        }
        Meteor.call('user.create',newUser);
    }

    render() {
        return  (  
            <div>
                <div className="text-error">
                    { this.state.errorMessage }
                </div>
                <div className="columns-userCreation">
                    <div className='column is-narrow'>
                        <div className='has-text-weight-bold mb-2'>Email</div>
                        <input
                            type="email"
                            value={this.state.email}
                            onChange={this.handleChangeEmail}
                            placeholder='firstname.lastname@uzh.ch'
                        />
                    </div>
                        
                    <div className='column is-narrow'>
                        <div className='has-text-weight-bold mb-2'>Role</div>
                        <div>
                            <select value={this.state.role} onChange={this.handleRoleSelect}>
                                <option value="Administrator">Administrator</option>
                                <option value="Maintainer">Maintainer</option>
                            </select>
                        </div>
                    </div>

                    <div className='column is-one-third'>
                        <div className='has-text-weight-bold mb-2'>Maximum User Account</div>
                        <input
                            type="number"
                            value={this.state.maxUserAccount}
                            onChange={this.handleUserAccountNumSelect}
                            placeholder='100'
                            list="maxUserAccount-options"
                        />
                        <datalist id="maxUserAccount-options">
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                            <option value={500}>500</option>
                            <option value={800}>800</option>
                            <option value={1000}>1000</option>
                        </datalist>
                    </div>
                    <div className="column is-narrow">
                        <Button onClick={this.handleSubmit}>
                            Create
                        </Button>
                    </div>
                </div>
            </div>
        )
    }
}