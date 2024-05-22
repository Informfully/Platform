import NavigationItem from './NavigationItem';
import React from 'react';

export default function HeaderFoot({toggleTheme}){
    
    const navigationItemsFoot = [
        {
            name: 'toggle', 
            icon: <i className="fas fa-moon"/>, 
            // text: "  ",
            key:'toggle',
            onClick:() => toggleTheme(),
        },
        {
            name: 'admins', 
            href: '/admins', 
            text: 'Admins', 
            key:'admins',
            isHidden: !(Meteor.user() && Meteor.user().roles.includes('maintainer'))
        },
        {
            name: 'profile', 
            href: '/profile', 
            text: 'Profile', 
            key:'profile',
        },
        {
            name: 'signout',
            key:'signout',
            text: 'Sign Out',
            onClick: () => { Meteor.logout(); },
        },
    ];

    return navigationItemsFoot.map(n => (
        !n.isHidden &&
        <NavigationItem {...n} key={n.name} />
    ));

}

