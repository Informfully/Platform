import React from 'react';
import ReactDOM from 'react-dom';
import App from './App'; // Your root component
import { ThemeProvider } from './context/ThemeContext'; 


export default function Root (props){
    return(
        <ThemeProvider>
            <App {...props} />
        </ThemeProvider>
    )
}
