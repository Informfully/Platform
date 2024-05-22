import React, { Component,useEffect,useState } from 'react';
import PropTypes from 'prop-types';
import Header from './components/header/Header';
import ModalContainer from './elements/modal/ModalContainer';
import Head from './components/static/Head';
import { classNames } from '../lib/utils/utils';
import { useTheme, ThemeProvider } from './context/ThemeContext';

export default function App({ main, modal, isAtHome, isNaviHidden }){

    const { themeIsDark, toggleTheme } = useTheme();

    return (
        <div id="app-root">
            <Head />
            <ModalContainer
                isShown={!!modal}
            >
                { modal }
            </ModalContainer>
            <Header isAtHome={isAtHome} isNaviHidden={isNaviHidden} toggleTheme={toggleTheme}/>
            <div id="app-content" className={themeIsDark ? 'is-dark':'is-light'}>
                { main }
            </div>
        </div>
    );
}

App.propTypes = {
    main: PropTypes.node.isRequired,
    modal: PropTypes.node,
};

App.defaultProps = {
    modal: null,
};
