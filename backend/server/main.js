import { Meteor } from 'meteor/meteor';
import '../imports/startup/server';
import '../imports/api/server/publications';
import './genesis'

Meteor.startup(() => {

    if (process.env.MAIL_URL === undefined || process.env.MAIL_URL.length === 0) {
        process.env.MAIL_URL = 'smtp://localhost:25';
    }

});
