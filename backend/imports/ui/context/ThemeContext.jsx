import React, {useState, useContext, createContext} from 'react';

const ThemeContext = createContext();

export function ThemeProvider({children}){
    // in case there is no pre-set paramerter themeIsDark, for example: the user open the website for the first time, false is assigned to themeIsDark
    const initialThemeIsDark = localStorage.getItem("themeIsDark") === "true" ? true : false;

    const [themeIsDark,setThemeIsDark] = useState(initialThemeIsDark);

    function toggleTheme(){
        localStorage.setItem("themeIsDark",!themeIsDark);
        setThemeIsDark(!themeIsDark);
    }

    return(
        <ThemeContext.Provider value={{themeIsDark,toggleTheme}}>
            {children}
        </ThemeContext.Provider>
    )

}

export function useTheme(){
    return useContext(ThemeContext);
}