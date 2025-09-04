import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  onSave?: () => void | Promise<void>;
  onDiscard?: () => void;
  message?: string;
}

export const useUnsavedChanges = ({
  hasUnsavedChanges,
  onSave,
  onDiscard,
  message = 'יש שינויים לא שמורים. לשמור? (OK=שמור, Cancel=בטל)'
}: UseUnsavedChangesOptions) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle navigation away from the page
  const handleNavigation = useCallback((targetPath: string) => {
    if (!hasUnsavedChanges) {
      navigate(targetPath);
      return;
    }

    const userChoice = window.confirm(message);
    if (userChoice) {
      // User chose to save
      if (onSave) {
        onSave().then(() => {
          navigate(targetPath);
        }).catch((error) => {
          console.error('Error saving changes:', error);
          // Still navigate even if save fails
          navigate(targetPath);
        });
      } else {
        navigate(targetPath);
      }
    } else {
      // User chose to discard
      if (onDiscard) {
        onDiscard();
      }
      navigate(targetPath);
    }
  }, [hasUnsavedChanges, message, onSave, onDiscard, navigate]);

  // Create a custom navigate function that checks for unsaved changes
  const navigateWithUnsavedCheck = useCallback((path: string) => {
    handleNavigation(path);
  }, [handleNavigation]);

  return {
    navigateWithUnsavedCheck,
    handleNavigation
  };
};
