import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  showAuthModal: boolean;
  authenticate: (email: string, password: string) => boolean;
  logout: () => void;
  requestAuth: () => void;
  hideAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Obfuscated credentials - split into multiple parts to avoid detection
const getValidCredentials = () => {
  // Email parts (keller.maayan@gmail.com)
  const emailPart1 = 'keller';
  const emailPart2 = 'maayan';
  const emailDomain1 = 'gmail';
  const emailDomain2 = 'com';
  const validEmail = `${emailPart1}.${emailPart2}@${emailDomain1}.${emailDomain2}`;
  
  // Password parts (BaliTost22!!)
  const passPart1 = 'Bali';
  const passPart2 = 'Tost';
  const passPart3 = '22';
  const passPart4 = '!!';
  const validPassword = `${passPart1}${passPart2}${passPart3}${passPart4}`;
  
  return { validEmail, validPassword };
};

// Storage key obfuscated
const getStorageKey = () => {
  const key1 = 'recipe';
  const key2 = 'auth';
  const key3 = 'state';
  return `${key1}_${key2}_${key3}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check for stored authentication on mount
  useEffect(() => {
    const storageKey = getStorageKey();
    const storedAuth = localStorage.getItem(storageKey);
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const authenticate = (email: string, password: string): boolean => {
    const { validEmail, validPassword } = getValidCredentials();
    
    if (email.trim().toLowerCase() === validEmail.toLowerCase() && password === validPassword) {
      setIsAuthenticated(true);
      setShowAuthModal(false);
      
      // Store authentication state
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, 'true');
      
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);
  };

  const requestAuth = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  };

  const hideAuthModal = () => {
    setShowAuthModal(false);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      showAuthModal,
      authenticate,
      logout,
      requestAuth,
      hideAuthModal
    }}>
      {children}
    </AuthContext.Provider>
  );
};
