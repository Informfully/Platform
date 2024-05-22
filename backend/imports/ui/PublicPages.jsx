import React from 'react';
import PropTypes from 'prop-types';

import Head from './components/static/Head';
import { classNames } from '../lib/utils/utils';
import { ThemeProvider } from './context/ThemeContext'; 

export default function PublicPages({ main, classes }) {
    const allClasses = [ ...classes, 'page-public' ];

    return (
        <div className={classNames(allClasses)}>
            <ThemeProvider>
                <Head />
                { main }
            </ThemeProvider>
        </div>
    );
}

PublicPages.defaultProps = {
    classes: [],
};

PublicPages.propTypes = {
    main: PropTypes.object.isRequired,
    classes: PropTypes.array,
};
