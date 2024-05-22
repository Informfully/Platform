import React, { Component } from 'react';
import { Accounts } from 'meteor/accounts-base';
import Button from '../elements/Button';

export default class ForgotPassword extends Component {

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

        return 'Request Password Reset Link';
    }

    handleSubmit(event) {
        event.preventDefault();
        this.setState({ errorMessage: '', isLoading: true });

        const email = event.target.email.value;

        if (!email) {
            this.setState({ errorMessage: 'Please enter your email address' });
            return false;
        }

        Accounts.forgotPassword({ email }, (err) => {
            if (err) {
                this.setState({ errorMessage: err.reason, isLoading: false });
            } else {
                this.setState({ isLoading: false });
            }
        });
    }

    render() {
        const { errorMessage } = this.state;

        return (
            <div className="hero is-fullheight">
                <div className="hero-body">
                    <div className="public-form-container">
                        <h1 className="text-center">Forgot Password</h1>
                        <div className="divider" />
                        <form className="form" onSubmit={this.handleSubmit}>

                            { errorMessage ? this.errorMessage : null }

                            <div className="form__field">
                                <div className="form__field__title">
                                    Email
                                </div>
                                <input type="email" name="email" />
                            </div>

                            <div className="form__field text-center">
                                <input className="button" type="submit" value={this.submitButtonValue} />
                            </div>

                            <div className="form__field text-center">
                                <Button text href="/signin">Sign in</Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}
