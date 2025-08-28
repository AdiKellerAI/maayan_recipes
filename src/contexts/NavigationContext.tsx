import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationContextType {
  lastRecipesUrl: string;
  setLastRecipesUrl: (url: string) => void;
  navigateToLastRecipesPage: () => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastRecipesUrl, setLastRecipesUrl] = useState('/recipes');
  const location = useLocation();

  // Track when user visits recipes page to save the URL with filters/search
  useEffect(() => {
    if (location.pathname === '/recipes') {
      const fullUrl = location.pathname + location.search;
      setLastRecipesUrl(fullUrl);
    }
  }, [location.pathname, location.search]);

  const navigateToLastRecipesPage = () => {
    return lastRecipesUrl;
  };

  return (
    <NavigationContext.Provider value={{
      lastRecipesUrl,
      setLastRecipesUrl,
      navigateToLastRecipesPage
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
