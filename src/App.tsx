import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RecipeProvider } from './contexts/RecipeContext';
import { AuthProvider } from './contexts/AuthContext';
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

function App() {
  const [showTimer, setShowTimer] = React.useState(false);

  // Listen for global timer events
  React.useEffect(() => {
    const handleShowTimer = () => {
      setShowTimer(true);
    };

    window.addEventListener('showTimer', handleShowTimer);
    return () => window.removeEventListener('showTimer', handleShowTimer);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <RecipeProvider>
            <div className="min-h-screen" dir="rtl">
              <Header />
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/landing" element={<LandingPage />} />
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
              />
              
              {/* Authentication Modal */}
              <AuthModal />
            </div>
          </RecipeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;