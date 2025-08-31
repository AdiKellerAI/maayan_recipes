import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationContextType {
  lastRecipesUrl: string;
  setLastRecipesUrl: (url: string) => void;
  navigateToLastRecipesPage: () => string;
  setReferrerFromRecipes: (url: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastRecipesUrl, setLastRecipesUrl] = useState('/recipes');
  const [referrerFromRecipes, setReferrerFromRecipes] = useState<string | null>(null);
  const location = useLocation();

  // Track when user visits pages that display recipes to save the URL with filters/search
  useEffect(() => {
    // Track recipes page, home page, and search results page
    if (location.pathname === '/recipes' || location.pathname === '/' || location.pathname === '/search') {
      const fullUrl = location.pathname + location.search;
      setLastRecipesUrl(fullUrl);
      // Clear any referrer since we're now on a recipes-displaying page
      setReferrerFromRecipes(null);
    }
  }, [location.pathname, location.search]);

  const navigateToLastRecipesPage = () => {
    // If we have a referrer from recipes, use that instead
    return referrerFromRecipes || lastRecipesUrl;
  };

  const setReferrerFromRecipesHandler = (url: string) => {
    setReferrerFromRecipes(url);
  };

  return (
    <NavigationContext.Provider value={{
      lastRecipesUrl,
      setLastRecipesUrl,
      navigateToLastRecipesPage,
      setReferrerFromRecipes: setReferrerFromRecipesHandler
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
