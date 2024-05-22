import { Meteor } from 'meteor/meteor';
import React, { Component,useState } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import PropTypes from 'prop-types';
import { hasExperimentLaunched } from '../../../lib/utils/utils_account';

import Module from '../../layout/Module';
import ModuleSection from '../../layout/ModuleSection';
import ModuleHead from '../../layout/ModuleHead';
import ModuleTitle from '../../layout/ModuleTitle';
import ProfileRow from './table/ProfileRow';
import ExperimentsCollection from '../../../api/experiments';

function Profile(props) {
 
    const [name,setName] = useState(props.name);
    const [address, setAddress] = useState(props.address);
    const [phone, setPhone] = useState(props.phone);
    const [email, setEmail] = useState(props.email);
    const [selfIntro, setSelfIntro] = useState(props.selfIntro);

    return (
            (props.isLoading)?
            (<div>loading...</div>)
            :
            (<Module>
            <ModuleHead>
                <ModuleTitle>
                    {`Personal Profile`}
                </ModuleTitle>
            </ModuleHead>
            <ModuleSection card content>
                <ProfileRow value={name} k="name" tag="Name" onChange={(value)=>setName(value)}/>
                <ProfileRow value={address} k="address" tag="Home Address:" onChange={(value)=>setAddress(value)}/>
                <ProfileRow value={phone} k="phone" tag="Phone(Mobile/Home):" onChange={(value)=>setPhone(value)}/>
                <ProfileRow value={email} k="email" tag="Email:" onChange={(value)=>setEmail(value)}/>
                <ProfileRow value={selfIntro} k="selfIntro" tag="Short Introduction:" onChange={(value)=>setSelfIntro(value)}/>
            </ModuleSection>
             </Module>)
    )
}       

 
Profile.defaultProps = {
    isLoading: true,
};

Profile.propTypes = {
    isLoading: PropTypes.bool.isRequired,
};

export default withTracker(() => {
    const userSubscription = Meteor.subscribe('users.all');
    const user = Meteor.users.find(Meteor.userId()).fetch();
    const isLoading = !userSubscription.ready();
    const userData = user && user.length > 0 ? user[0] : {};

    const email = userData.emails && userData.emails.length > 0 ? userData.emails[0].address : '';
    const name = userData.profile.name || '';
    const address = userData.profile.address || '';
    const phone = userData.profile.phone || '';
    const selfIntro = userData.profile.selfIntro || '';

    return {
        isLoading,
        email,
        name,
        address,
        phone,
        selfIntro,
    };
})(Profile);

// export default Profile;