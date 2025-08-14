import { useAuth } from '../contexts/AuthContext';

export const useProtectedAction = () => {
  const { isAuthenticated, requestAuth } = useAuth();

  const executeProtectedAction = (action: () => void | Promise<void>) => {
    if (isAuthenticated) {
      return action();
    } else {
      requestAuth();
      return Promise.resolve();
    }
  };

  return {
    isAuthenticated,
    executeProtectedAction
  };
};
