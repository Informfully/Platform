import { Meteor } from 'meteor/meteor';
import React, { Component, useState } from 'react';
import { components } from 'react-select';
import { useTracker } from 'meteor/react-meteor-data';
import Module from '../../layout/Module';
import ModuleSection from '../../layout/ModuleSection';
import ModuleHead from '../../layout/ModuleHead';
import ModuleTitle from '../../layout/ModuleTitle';
import Button from '../../elements/Button';
import AdminsCreation from './AdminsCreation';
import AdminsTable from './table/AdminsTable';
import PropTypes from 'prop-types';


export default function Admins(){

    const [searchString,setSearchString] = useState("");
    const [inputedString,setInputedString] = useState("")
    const [showAdminsCreation,setShowAdminsCreation] = useState(false);

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    const { isLoading, admins } = useTracker(() => {

        const escapedSearchString = escapeRegExp(searchString);
        const regexp = new RegExp(escapedSearchString, 'i');
        const query = {
            $or: [
                { 'emails.address': regexp },
            ],
        };

        const adminsSubscription = Meteor.subscribe('admins.all');
        const isLoading = !adminsSubscription.ready();

        const admins = Meteor.users.find(query).fetch();
        
        return {
            isLoading,
            admins,
        };
        
    },[searchString]);

    function handleSearchAdmins() {
        setSearchString(inputedString)
    }

    function handleExpandAdminsCreation() {
        setShowAdminsCreation(!showAdminsCreation);
    }

    function handleInputChange(event) {
        setInputedString(event.target.value)
        if(event.target.value==''){
            setSearchString(event.target.value)
        }
    }



    return (
        isLoading?
        <div>
            is loading...
        </div>
        :
        <Module>
            <ModuleHead>
                <ModuleTitle>
                    {`Administrators`}
                </ModuleTitle>
                <div className="level-right">
                    <div className="level-item">
                        <input
                            autoFocus
                            type="search"
                            placeholder="Search Admin..."
                            value={inputedString}
                            onChange={(event)=>handleInputChange(event)}
                        />
                    </div>
                    <div className="level-item">
                        <Button onClick={()=>handleSearchAdmins()}>
                            Search
                        </Button>
                    </div>
                    <div className="level-item">
                        <Button onClick={()=>handleExpandAdminsCreation()}>
                            Add Admins
                        </Button>
                    </div>
                </div> 
            </ModuleHead>
            {showAdminsCreation
                && (
            <ModuleSection card content>
                <AdminsCreation />
            </ModuleSection>)}
            <ModuleSection card content>
                <AdminsTable admins={admins} />
            </ModuleSection>
        </Module>
    );
}

Admins.defaultProps = {
    isLoading: true,
    admins: [],
};

Admins.propTypes = {
    isLoading: PropTypes.bool.isRequired,
    admins: PropTypes.array,
};

