import React, { Component } from 'react';
import { Accounts } from 'meteor/accounts-base';
import PropTypes from 'prop-types';

export default class ResetPassword extends Component {

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

        return 'Reset Password';
    }

    handleSubmit(event) {
        event.preventDefault();
        this.setState({ errorMessage: '', isLoading: true });

        const { token } = this.props;
        const password = event.target.password.value;

        Accounts.resetPassword(token, password, (err) => {
            if (err) {
                this.setState({ errorMessage: err.reason });
            }
        });
    }

    render() {
        const { errorMessage } = this.state;
        const { token } = this.props;

        if (!token) {
            return (
                <div className="hero is-fullheight">
                    <div className="hero-body">
                        <div className="public-form-container">
                            <h1>An error occurred</h1>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="hero is-fullheight">
                <div className="hero-body">
                    <div className="public-form-container">
                        <h1>Reset Password</h1>

                        <div className="divider" />

                        <form className="form" onSubmit={this.handleSubmit}>

                            { errorMessage ? this.errorMessage : null }

                            <div className="form__field">
                                <div className="form__field__title">
                                    New Password
                                </div>
                                <input type="password" name="password" />
                            </div>
                            <div className="form__field">
                                <input className="button" type="submit" value={this.submitButtonValue} />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}

ResetPassword.propTypes = {
    token: PropTypes.object.isRequired,
};
