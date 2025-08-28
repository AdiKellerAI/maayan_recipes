import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationContextType {
  lastRecipesPage: string;
  setLastRecipesPage: (path: string) => void;
  navigateToLastRecipesPage: () => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastRecipesPage, setLastRecipesPageState] = useState<string>('/recipes');
  const location = useLocation();

  // Track when user visits recipes pages
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    
    // Track visits to recipes pages (main recipes page, search results, landing page with filters)
    if (
      location.pathname === '/recipes' ||
      location.pathname === '/search' ||
      (location.pathname === '/' && location.search) // Landing page with query params
    ) {
      console.log('📍 Navigation: Tracking last recipes page:', currentPath);
      setLastRecipesPageState(currentPath);
    }
  }, [location.pathname, location.search]);

  const setLastRecipesPage = (path: string) => {
    console.log('📍 Navigation: Manually setting last recipes page:', path);
    setLastRecipesPageState(path);
  };

  const navigateToLastRecipesPage = () => {
    console.log('📍 Navigation: Returning to last recipes page:', lastRecipesPage);
    return lastRecipesPage;
  };

  return (
    <NavigationContext.Provider value={{
      lastRecipesPage,
      setLastRecipesPage,
      navigateToLastRecipesPage
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
