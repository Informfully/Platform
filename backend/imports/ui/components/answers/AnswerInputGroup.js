import React from 'react';
import PropTypes from 'prop-types';

import Button from '../../elements/Button';
import FaIcon from '../../elements/FaIcon';

export default function AnswersInputGroup({
    text,
    value,
    onChangeText,
    onChangeValue,
    removeAnswer,
    disabled
}) {

    return (
        <div className="level is-mobile answer pb-2">
            <div className="level-item">
                <input
                    type="text"
                    value={text}        
                    placeholder="Choice"
                    onChange={onChangeText}
                    disabled={disabled}
                />
            </div>
            <div className="level-item is-narrow">
                <input
                    type="text"  
                    value={value}
                    placeholder="0"
                    onChange={onChangeValue}
                    disabled={disabled}
                />
            </div>
            {
                !disabled && 
                <div className="level-item is-narrow">
                    <a onClick={removeAnswer} >
                        <FaIcon icon="times-circle" className="is-align-content-center" />
                    </a>
                </div>
            }
        </div>
    );

}

AnswersInputGroup.propTypes = {
    text: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]).isRequired,
    onChangeText: PropTypes.func.isRequired,
    onChangeValue: PropTypes.func.isRequired,
    removeAnswer: PropTypes.func.isRequired,
};
