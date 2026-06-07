import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('merge_theme') || 'system';
    } catch (e) {
      return 'system';
    }
  });

  useEffect(() => {
    const applyTheme = (currentTheme) => {
      const root = window.document.documentElement;
      
      // Remove any existing theme classes safely
      root.classList.remove('light', 'dark');

      if (currentTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        // Only apply 'dark' if it's the system preference. Otherwise leave it clean for Light mode.
        if (systemTheme === 'dark') {
          root.classList.add('dark');
        }
      } else if (currentTheme === 'dark') {
        root.classList.add('dark');
      }
      // If 'light', we don't add any class, keeping the default index.css variables exactly as they are.
    };

    applyTheme(theme);
    try {
      localStorage.setItem('merge_theme', theme);
    } catch (e) {
      console.error('Failed to save theme setting', e);
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const value = { theme, setTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
