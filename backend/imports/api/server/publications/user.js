import { Meteor } from 'meteor/meteor';
import { userIsInRole } from '../../../lib/utils/utils_account';

Meteor.publish('userData', function userDataPublication() {
    return Meteor.users.find(this.userId, {
        fields: {
            roles: 1,
            experiments: 1,
            fullName: 1,
        },
    });
});

Meteor.publish('users.all', () => {
    const user = Meteor.user();
    if (!user) {
        throw new Meteor.Error(403, 'Permission Denied');
    }

    if (!userIsInRole('admin')) {
        throw new Meteor.Error(403, 'Permission Denied');
    }

    experimentsList = user.experiments.map( experimentsObject => experimentsObject.experiment );

    return Meteor.users.find({ participatesIn: { $in: experimentsList }});
});


Meteor.publish('admins.all', ()=> {
    const query = { roles: { $in: ['admin'] } };
    const options = { fields: { _id: 1, emails: 1, roles: 1, createdAt: 1,profile:1 } };
    return Meteor.users.find(query,options);
});

// Meteor.publish('users.inUserGroup', (experimentId,userGroup)=> {
//     const query = { participatesIn: { $eq: experimentId }, userGroup:{$eq: userGroup}};
//     return Meteor.users.find(query);
// });

Meteor.publish('users.inUserGroup', ()=> {
    return Meteor.users.find({}, { fields: { _id: 1,participatesIn:1,userGroup:1 } }); // Adjust the fields as per your requirements
  });
  