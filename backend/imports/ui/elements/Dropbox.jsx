import React, { useState } from 'react';
import PropTypes from 'prop-types';
import FaIcon from './FaIcon';


function Dropbox({ data, tag , currentKey, updateFuntion}) {
    const [showDropDown, setShowDropDown] = useState(false);
    const [choices, setChoices] = useState(data);
    const [selectedKey, setSelectedKey] = useState(currentKey);


    const handleChoice = (key) => {
        setSelectedKey(key);
        setShowDropDown(false);
        updateFuntion(choices[key]);
    };


    return (
        <div>
            <div>
                <b className='pr-2'>{tag}</b>
            </div>
            <div onClick={() => setShowDropDown(!showDropDown)}>
                {!showDropDown? 
                <div className="is-hoverable flex flex-row justify-center rounded-md ">
                    <span className='pr-2'>{choices[selectedKey]}</span>
                    <FaIcon icon="chevron-down" className="text-[#333333] text-xs" /> 
                </div>
                :
                <div className="flex flex-col">
                    {Object.keys(choices).map((key) => (
                        <div className='is-hoverable'  key={key}>
                            <button
                                onClick={() => handleChoice(key)}
                                style={{
                                    padding: 0, // Removes default padding
                                    margin: 0, // Removes default margin
                                    border: 'none', // Removes border
                                    background: 'none', // Removes default background
                                    color: 'inherit', // Inherits from parent element
                                    outline: 'none', // Removes focus outline
                                    // Add more custom styles here as needed
                                }}
                            >
                                <span className='pr-2'>{choices[key]}</span>
                                {key === selectedKey? 
                                    <FaIcon icon="check" className="pl-1" /> 
                                    :
                                    <></>
                                }
                            </button>
                        </div>
                    ))}
                </div>
                }
            </div>
        </div>
    );
}

export default Dropbox;
