import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import Button from '../elements/Button';

export default class SignIn extends Component {

    constructor(props) {
        super(props);

        this.state = {
            errorMessage: '',
            isLoading: false,
        };

        this.handleSubmit = this.handleSubmit.bind(this);
    }

    get errorMessage() {
        const { errorMessage } = this.state;

        return (
            <div className="form__field">
                <span className="text-error">{ errorMessage }</span>
            </div>
        );
    }

    get submitButtonValue() {
        const { isLoading } = this.state;

        if (isLoading) {
            return 'Loading...';
        }

        return 'Sign in';
    }

    handleSubmit(event) {
        event.preventDefault();
        this.setState({ errorMessage: '', isLoading: true });

        const email = event.target.email.value;
        const password = event.target.password.value;      
    
        Meteor.loginWithPassword(email, password, (err) => {
            if (err) {
                this.setState({ errorMessage: err.reason, isLoading: false });
            }
        });
    }

    render() {
        const { errorMessage } = this.state;

        return (
            <div className="hero is-fullheight">
                <div className="hero-body">
                    <div className="public-form-container">
                        <h1 className="text-center">Sign in</h1>
                        <div className="divider" />
                        <form className="form" onSubmit={this.handleSubmit}>

                            { errorMessage ? this.errorMessage : null }

                            <div className="form__field">
                                <div className="form__field__title">
                                    Email
                                </div>
                                <input type="email" name="email" />
                            </div>

                            <div className="form__field">
                                <div className="form__field__title">
                                    Password
                                </div>
                                <input type="password" name="password" />
                            </div>

                            <div className="form__field text-center">
                                <input type="submit" value={this.submitButtonValue} className="button" />
                            </div>
                            <div className="form__field text-center">
                                <Button href="/forgot-password" text>Forgot password?</Button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="hero-foot">
                    <div className="columns">
                        <div className="column text-center">
                            <div className="column is-narrow">
                                <Button href="/privacy-policy" text>Privacy Policy</Button>
                            </div>
                            <div className="column is-narrow">
                                <Button href="/terms-and-conditions" text>Terms & Conditions</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
