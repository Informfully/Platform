import { Accounts } from 'meteor/accounts-base'
import { Meteor } from 'meteor/meteor';
import '../imports/startup/server';

  
if (Meteor.users.find().count() === 0) {

    const new_user = {
        "username": "adam",
        "email": "adam@your.domain",
        "password": "password",
        "roles": [
            "user", "admin", "maintainer"
        ]   
    };

    Accounts.createUser(new_user);

    console.log("First user created");

}