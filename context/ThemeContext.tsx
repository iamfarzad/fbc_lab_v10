import React, { createContext, useContext } from 'react';
import { useDarkMode } from 'src/hooks/ui/useDarkMode';

interface ThemeContextType {
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isDarkMode, toggle } = useDarkMode({
        defaultValue: false,
        applyDarkClass: true,
    });

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme: toggle }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
