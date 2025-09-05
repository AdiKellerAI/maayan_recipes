import { useEffect, useRef, useCallback } from 'react';

interface FormData {
  [key: string]: any;
}

interface UseMobileFormPersistenceOptions {
  formKey: string;
  getFormData: () => FormData;
  setFormData: (data: FormData) => void;
  enabled?: boolean;
}

export const useMobileFormPersistence = ({
  formKey,
  getFormData,
  setFormData,
  enabled = true
}: UseMobileFormPersistenceOptions) => {
  const lastSavedDataRef = useRef<FormData>({});
  const isRestoringRef = useRef(false);

  // Save form data to localStorage
  const saveFormData = useCallback(() => {
    if (!enabled) return;
    
    try {
      const formData = getFormData();
      const dataToSave = {
        ...formData,
        timestamp: Date.now()
      };
      localStorage.setItem(`form_${formKey}`, JSON.stringify(dataToSave));
      lastSavedDataRef.current = formData;
      console.log(`📱 Saved form data for ${formKey}:`, dataToSave);
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  }, [formKey, getFormData, enabled]);

  // Restore form data from localStorage
  const restoreFormData = useCallback(() => {
    if (!enabled) return;
    
    try {
      const savedData = localStorage.getItem(`form_${formKey}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Only restore if data is recent (within last 24 hours)
        const isRecent = Date.now() - parsedData.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent) {
          isRestoringRef.current = true;
          const { timestamp, ...formData } = parsedData;
          setFormData(formData);
          lastSavedDataRef.current = formData;
          console.log(`📱 Restored form data for ${formKey}:`, formData);
          // Reset the flag after a short delay to allow form to update
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error restoring form data:', error);
    }
  }, [formKey, setFormData, enabled]);

  // Clear saved form data
  const clearFormData = useCallback(() => {
    if (!enabled) return;
    
    try {
      localStorage.removeItem(`form_${formKey}`);
      lastSavedDataRef.current = {};
      console.log(`📱 Cleared form data for ${formKey}`);
    } catch (error) {
      console.error('Error clearing form data:', error);
    }
  }, [formKey, enabled]);

  // Check if form data has changed
  const hasFormDataChanged = useCallback(() => {
    if (!enabled) return false;
    
    try {
      const currentData = getFormData();
      const lastSaved = lastSavedDataRef.current;
      
      // Simple deep comparison for form data
      return JSON.stringify(currentData) !== JSON.stringify(lastSaved);
    } catch (error) {
      console.error('Error checking form data changes:', error);
      return false;
    }
  }, [getFormData, enabled]);

  // Auto-save form data periodically
  useEffect(() => {
    if (!enabled) return;

    const autoSaveInterval = setInterval(() => {
      if (hasFormDataChanged() && !isRestoringRef.current) {
        saveFormData();
      }
    }, 2000); // Auto-save every 2 seconds

    return () => clearInterval(autoSaveInterval);
  }, [enabled, hasFormDataChanged, saveFormData]);

  // Handle app visibility changes (mobile app switching)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is going to background, save form data
        console.log('📱 App going to background, saving form data');
        saveFormData();
      } else {
        // App is coming to foreground, restore form data
        console.log('📱 App coming to foreground, restoring form data');
        restoreFormData();
      }
    };

    const handleBeforeUnload = () => {
      // Page is being unloaded, save form data
      console.log('📱 Page unloading, saving form data');
      saveFormData();
    };

    const handlePageShow = () => {
      // Page is being shown (back from cache), restore form data
      console.log('📱 Page showing, restoring form data');
      restoreFormData();
    };

    const handlePageHide = () => {
      // Page is being hidden (going to cache), save form data
      console.log('📱 Page hiding, saving form data');
      saveFormData();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    // Restore form data on mount
    restoreFormData();

    return () => {
      // Cleanup event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [enabled, saveFormData, restoreFormData]);

  return {
    saveFormData,
    restoreFormData,
    clearFormData,
    hasFormDataChanged
  };
};
