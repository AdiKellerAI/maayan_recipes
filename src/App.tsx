import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RecipeProvider } from './contexts/RecipeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import Header from './components/Layout/Header';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import AddRecipePage from './pages/AddRecipePage';
import EditRecipePage from './pages/EditRecipePage';
import SearchResultsPage from './pages/SearchResultsPage';
import ErrorBoundary from './components/ErrorBoundary';
import MultiTimer from './components/Timer/MultiTimer';
import AuthModal from './components/AuthModal';
import DatabaseStatus from './components/DatabaseStatus';

function App() {
  const [showTimer, setShowTimer] = React.useState(false);
  const [showDatabaseStatus, setShowDatabaseStatus] = React.useState(false);

  // Handle database status changes
  const handleDatabaseStatusChange = React.useCallback((status: 'checking' | 'connected' | 'disconnected' | 'error') => {
    // Show status window only if there's a problem
    if (status === 'disconnected' || status === 'error') {
      setShowDatabaseStatus(true);
    } else if (status === 'connected') {
      // Hide status window after a short delay when connection is restored
      setTimeout(() => {
        setShowDatabaseStatus(false);
      }, 2000);
    }
  }, []);

  // Check database status on app load
  React.useEffect(() => {
    // Create a hidden database status component to check connection
    const checkInitialConnection = async () => {
      try {
        const response = await fetch('/api/test-connection', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          handleDatabaseStatusChange('error');
          return;
        }
        
        const result = await response.json();
        if (result.connected === true || result.success === true) {
          handleDatabaseStatusChange('connected');
        } else {
          handleDatabaseStatusChange('disconnected');
        }
      } catch (error) {
        handleDatabaseStatusChange('error');
      }
    };

    checkInitialConnection();
  }, [handleDatabaseStatusChange]);

  // Listen for global timer events
  const [initialTimerName, setInitialTimerName] = React.useState('');
  
  React.useEffect(() => {
    const handleShowTimer = (event: CustomEvent) => {
      const recipeName = event.detail?.recipeName;
      if (recipeName) {
        setInitialTimerName(recipeName);
      } else {
        setInitialTimerName('');
      }
      setShowTimer(true);
    };

    window.addEventListener('showTimer', handleShowTimer as EventListener);
    return () => window.removeEventListener('showTimer', handleShowTimer as EventListener);
  }, []);

  // Show database status on development or when there are issues
  React.useEffect(() => {
    // Show database status in development or when user presses Ctrl+Shift+D
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDatabaseStatus(!showDatabaseStatus);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showDatabaseStatus]);

  // Add CSS to prevent pull-to-refresh on mobile
  React.useEffect(() => {
    // Add CSS rule to prevent overscroll behavior on mobile
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overscroll-behavior: none;
        -webkit-overflow-scrolling: touch;
      }
      
      /* Prevent pull-to-refresh specifically */
      body {
        overscroll-behavior-y: contain;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <RecipeProvider>
            <NavigationProvider>
              <div className="min-h-screen" dir="rtl">
                <Header />
                <main>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/recipes" element={<HomePage />} />
                    <Route path="/recipe/:id" element={<RecipeDetailPage />} />
                    <Route path="/add" element={<AddRecipePage />} />
                    <Route path="/edit/:id" element={<EditRecipePage />} />
                    <Route path="/search" element={<SearchResultsPage />} />
                  </Routes>
                </main>
                
                {/* Global Multi Timer */}
                            <MultiTimer 
                isVisible={showTimer}
                onClose={() => setShowTimer(false)}
                initialTimerName={initialTimerName}
              />
                
                {/* Authentication Modal */}
                <AuthModal />
                
                {/* Database Status Diagnostic (Ctrl+Shift+D to toggle) */}
                <DatabaseStatus 
                  isVisible={showDatabaseStatus}
                  onStatusChange={handleDatabaseStatusChange}
                  onClose={() => setShowDatabaseStatus(false)}
                />
              </div>
            </NavigationProvider>
          </RecipeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;