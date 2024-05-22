import React, { useState, useEffect } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import NavigationItem from './NavigationItem';
import { getExperimentName } from '../../../lib/utils/utils';
import HeaderFoot from './HeaderFoot';

function Header({isAtHome, isNaviHidden, toggleTheme}){

    const [selectedMenuItem,setSelectedMenuItem] = useState('information');


    function handleNavigation(selectedMenuItem) {
        setSelectedMenuItem(selectedMenuItem);
    }

    function handleExit(){
        window.location.href = "/experiments";
    }

    function navigation() {
        const navigationItemsExperiment = [
            {
                name: 'information', href: '/information', text: 'Information', 
            },
            {
                name: 'users', href: '/users', text: 'Users',
            },
            {
                name: 'algorithms', href: '/algorithms', text: 'Algorithms', 
            },
            {
                name: 'surveys', href: '/surveys', text: 'Surveys', 
            },
            {
                name: 'feedbacksurveys', href: '/feedbacksurveys', text: 'Feedback',
            },
            {
                name: 'articles', href: '/articles', text: 'Articles', 
            },
        ];
        const navigationItems = navigationItemsExperiment.map(n => (
            <NavigationItem
                {...n}
                isSelected={n.name === selectedMenuItem}
                key={`navigationItem-${n.name}`}
                onClick={() => { handleNavigation(n.name); }}
            />
        ));

        return [...navigationItems];
    }

    return (
        <div className="navbar">
            <div id="navigation-menu" className={`navbar-menu is-size-5`}>
                {!isAtHome && <div className="navbar-start">
                    <NavigationItem
                        name="Back"
                        key="Back"
                        text = "back"
                        icon= {<div className='pr-4'><i className="fas fa-arrow-left"/></div>}
                        onClick={() => { handleExit() }}
                        classname = "Back-button"
                    />
                </div>}
                {!isNaviHidden && <div className="navbar-menu">
                    { navigation() }
                </div>}
                <div className="navbar-end">
                    <HeaderFoot toggleTheme={toggleTheme}/>
                </div>
            </div>
        </div>
    );
    
}


export default withTracker(() => {
    const experimentsSubscription = Meteor.subscribe('experiments');
    const isLoading = !experimentsSubscription.ready();

    return {
        isLoading,
    };
})(Header);
