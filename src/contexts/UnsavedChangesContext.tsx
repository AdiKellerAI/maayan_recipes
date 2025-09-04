import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  navigateWithUnsavedCheck: (path: string) => Promise<void>;
  registerUnsavedChanges: (hasChanges: boolean) => void;
  registerSaveFunction: (saveFn: () => Promise<void>) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export const UnsavedChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveFunction, setSaveFunction] = useState<(() => Promise<void>) | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Reset unsaved changes when navigating to non-edit pages
  useEffect(() => {
    const isEditPage = location.pathname.startsWith('/edit/') || location.pathname === '/add';
    if (!isEditPage) {
      setHasUnsavedChanges(false);
      setSaveFunction(null);
    }
  }, [location.pathname]);

  const navigateWithUnsavedCheck = useCallback(async (path: string) => {
    if (!hasUnsavedChanges) {
      navigate(path);
      return;
    }

    const userChoice = window.confirm('יש שינויים לא שמורים. לשמור? (OK=שמור, Cancel=בטל)');
    if (userChoice) {
      // User chose to save
      if (saveFunction) {
        try {
          await saveFunction();
          setHasUnsavedChanges(false);
          navigate(path);
        } catch (error) {
          console.error('Error saving changes:', error);
          // Still navigate even if save fails
          setHasUnsavedChanges(false);
          navigate(path);
        }
      } else {
        // No save function registered, just navigate
        setHasUnsavedChanges(false);
        navigate(path);
      }
    } else {
      // User chose to discard
      setHasUnsavedChanges(false);
      navigate(path);
    }
  }, [hasUnsavedChanges, navigate, saveFunction]);

  const registerUnsavedChanges = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const registerSaveFunction = useCallback((saveFn: () => Promise<void>) => {
    setSaveFunction(() => saveFn);
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{
      hasUnsavedChanges,
      setHasUnsavedChanges,
      navigateWithUnsavedCheck,
      registerUnsavedChanges,
      registerSaveFunction
    }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChangesContext = () => {
  const context = useContext(UnsavedChangesContext);
  if (context === undefined) {
    throw new Error('useUnsavedChangesContext must be used within an UnsavedChangesProvider');
  }
  return context;
};
