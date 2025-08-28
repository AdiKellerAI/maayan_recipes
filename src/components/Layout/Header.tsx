import React, { useState, useEffect } from 'react';
import { Search, Heart, Plus, Filter, Menu, X, ChefHat, Database } from 'lucide-react';
import { useRecipes } from '../../contexts/RecipeContext';
import { useProtectedAction } from '../../hooks/useProtectedAction';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const { 
    showFavoritesOnly, 
    setShowFavoritesOnly, 
    setShowRecentOnly, 
    setSearchQuery,
    difficultyFilter,
    setDifficultyFilter,
    imageFilter,
    setImageFilter,
    flourFilter,
    setFlourFilter,
    postgresqlStatus,
    resetFilters,
    recipes
  } = useRecipes();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const navigate = useNavigate();
  const { executeProtectedAction } = useProtectedAction();
  const location = useLocation();

  // Get current recipe name if we're on a recipe detail page
  const getCurrentRecipeName = () => {
    const pathMatch = location.pathname.match(/^\/recipe\/(.+)$/);
    if (pathMatch) {
      const recipeId = pathMatch[1];
      const recipe = recipes.find(r => r.id === recipeId);
      return recipe?.title || '';
    }
    return '';
  };

  useEffect(() => {
    if (location.pathname === '/') {
      setSearchQuery('');
      setLocalSearchQuery('');
    }
  }, [location.pathname, setSearchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchQuery.trim()) {
      setSearchQuery(localSearchQuery.trim());
      navigate('/recipes');
    } else {
      setSearchQuery('');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    // חיפוש בזמן אמת
    setSearchQuery(value.trim());
  };

  const toggleFavorites = () => {
    setShowFavoritesOnly(!showFavoritesOnly);
    setShowRecentOnly(false);
    navigate('/recipes');
    setIsMenuOpen(false);
  };



  const clearFilters = () => {
    setDifficultyFilter('');
    setImageFilter('');
    setShowFavoritesOnly(false);
    setShowRecentOnly(false);
  };

  const hasActiveFilters = difficultyFilter || imageFilter || flourFilter;

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Menu Button - Left side for both mobile and desktop */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {/* Show menu button on all screens */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Timer Button - Always visible */}
            <button
              onClick={() => {
                // Open timer with current recipe name if available
                const recipeName = getCurrentRecipeName();
                const timerEvent = new CustomEvent('showTimer', {
                  detail: { recipeName }
                });
                window.dispatchEvent(timerEvent);
              }}
              className="p-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 hover:text-orange-600"
              title="טיימר בישול"
            >
              <span className="text-xl">⏰</span>
            </button>
          </div>

          {/* Logo - Right side */}
          <Link 
            to="/" 
            className="flex items-center"
            onClick={(e) => {
              e.preventDefault();
              resetFilters();
              navigate('/');
            }}
          >
            <div 
              className={`px-4 py-2 rounded-lg shadow-md border h-10 flex items-center justify-center transition-all duration-500 ease-in-out bg-gradient-to-br from-orange-500/80 to-yellow-600/80 border-orange-400/80 hover:from-orange-600/80 hover:to-yellow-700/80 ${
                location.pathname === '/' 
                  ? 'md:px-16' // 4x wider on desktop landing page
                  : 'px-4'     // normal width on other pages
              }`}
            >
              <ChefHat className="h-5 w-5 text-white mr-3 rtl:ml-3 rtl:mr-0" />
              <div className="text-base font-bold text-white tracking-wide">
                המטבח של מעיין
              </div>
            </div>
          </Link>

          {/* Fixed Search Bar - Desktop */}
          {location.pathname !== '/' && (
            <div className="hidden sm:flex flex-1 max-w-md mx-8">
              <form onSubmit={handleSearch} className="relative w-full">
                <input
                  type="text"
                  value={localSearchQuery}
                  onChange={handleSearchChange}
                  placeholder="חפש מתכונים..."
                  className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                />
                <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 h-4 w-4 text-gray-400" />
              </form>
            </div>
          )}

          {/* Desktop Navigation - Show on medium screens and up */}
          <div className="hidden sm:flex items-center space-x-4 rtl:space-x-reverse">

            <button
              onClick={toggleFavorites}
              className={`p-2 rounded-lg transition-colors transform active:scale-95 ${
                showFavoritesOnly 
                  ? 'bg-red-100 text-red-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="מתכונים מועדפים"
            >
              <Heart className={`h-5 w-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            </button>

            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-2 rounded-lg transition-colors relative transform active:scale-95 ${
                  hasActiveFilters || isFilterOpen
                    ? 'bg-primary-100 text-primary-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="סינון מתכונים"
              >
                <Filter className="h-5 w-5" />
                {hasActiveFilters && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                )}
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">סינון</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">רמת קושי</label>
                      <select
                        value={difficultyFilter}
                        onChange={(e) => setDifficultyFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      >
                        <option value="">כל הרמות</option>
                        <option value="קל">קל</option>
                        <option value="בינוני">בינוני</option>
                        <option value="קשה">קשה</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">תמונות</label>
                      <select
                        value={imageFilter}
                        onChange={(e) => setImageFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      >
                        <option value="">הכל</option>
                        <option value="with">עם תמונות</option>
                        <option value="without">ללא תמונות</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">קמח</label>
                      <select
                        value={flourFilter}
                        onChange={(e) => setFlourFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      >
                        <option value="">הכל</option>
                        <option value="with">עם קמח</option>
                        <option value="without">ללא קמח</option>
                      </select>
                    </div>
                    
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        נקה פילטרים
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => executeProtectedAction(() => navigate('/add'))}
              className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600 active:bg-primary-700 transition-colors transform active:scale-95"
              title="הוספת מתכון"
            >
              <Plus className="h-5 w-5" />
            </button>
            
          </div>
        </div>

        {/* Sidebar Menu - Visible on all screens */}
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Sidebar */}
            <div className="fixed top-0 right-0 w-56 bg-gradient-to-b from-white via-gray-50 to-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out rounded-l-2xl border-l border-gray-200">
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">תפריט</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-all duration-300 hover:scale-110"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              
              {/* Menu Items */}
              <div className="p-3 space-y-2">
                {/* Add Recipe Button */}
                <button
                  onClick={() => {
                    executeProtectedAction(() => navigate('/add'));
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 rtl:space-x-reverse py-2 px-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100 border border-blue-200 hover:border-blue-300"
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Plus className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold">הוספת מתכון</span>
                </button>
                
                {/* Favorites Button */}
                <button
                  onClick={toggleFavorites}
                  className={`w-full flex items-center space-x-2 rtl:space-x-reverse py-2 px-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    showFavoritesOnly 
                      ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border border-red-300 shadow-md' 
                      : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 hover:from-red-100 hover:to-pink-100 border border-red-200 hover:border-red-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    showFavoritesOnly ? 'bg-gradient-to-br from-red-500 to-pink-600' : 'bg-gradient-to-br from-red-500 to-pink-600'
                  }`}>
                    <Heart className={`h-3.5 w-3.5 ${showFavoritesOnly ? 'text-white fill-current' : 'text-white'}`} />
                  </div>
                  <span className="text-xs font-semibold">מועדפים</span>
                </button>
                
                {/* Filter Button */}
                <button
                  onClick={() => {
                    setIsFilterOpen(!isFilterOpen);
                    // Close menu immediately on mobile to show filter overlay properly
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2 rtl:space-x-reverse py-2 px-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    hasActiveFilters
                      ? 'bg-gradient-to-r from-green-100 to-teal-100 text-green-700 border border-green-300 shadow-md' 
                      : 'bg-gradient-to-r from-green-50 to-teal-50 text-green-700 hover:from-green-100 hover:to-teal-100 border border-green-200 hover:border-green-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    hasActiveFilters ? 'bg-gradient-to-br from-green-500 to-teal-600' : 'bg-gradient-to-br from-green-500 to-teal-600'
                  }`}>
                    <Filter className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold">סינון מתכונים</span>
                  {hasActiveFilters && (
                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse ml-auto rtl:mr-auto rtl:ml-0"></div>
                  )}
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-200 my-3"></div>
                
                {/* Quick Actions */}
                <div className="space-y-1.5">
                  <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">פעולות מהירות</h5>
                  
                  {/* Timer Button */}
                  <button
                    onClick={() => {
                      const recipeName = getCurrentRecipeName();
                      const timerEvent = new CustomEvent('showTimer', {
                        detail: { recipeName }
                      });
                      window.dispatchEvent(timerEvent);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 rtl:space-x-reverse py-2 px-2.5 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 text-orange-700 hover:from-orange-100 hover:to-yellow-100 transition-all duration-300 transform hover:scale-105 border border-orange-200 hover:border-orange-300"
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-sm text-white">⏰</span>
                    </div>
                    <span className="text-xs font-semibold">טיימר בישול</span>
                  </button>
                  
                  {/* Landing Page Button */}
                  <button
                    onClick={() => {
                      resetFilters();
                      navigate('/');
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 rtl:space-x-reverse py-2 px-2.5 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 hover:from-violet-100 hover:to-purple-100 transition-all duration-300 transform hover:scale-105 border border-violet-200 hover:border-violet-300"
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                      <ChefHat className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-xs font-semibold">דף הבית</span>
                  </button>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-200 my-3"></div>
                  
                  {/* Database Section */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">מאגר מידע</h5>
                    
                    {/* Database Connection Status */}
                    <div className="w-full flex items-center space-x-2 rtl:space-x-reverse py-1.5 px-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        postgresqlStatus === 'connected' 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                          : postgresqlStatus === 'disconnected'
                          ? 'bg-gradient-to-br from-red-500 to-red-600'
                          : 'bg-gradient-to-br from-yellow-500 to-orange-600'
                      }`}>
                        <Database className="h-2.5 w-2.5 text-white" />
                      </div>
                      <span className={`text-xs font-medium ${
                        postgresqlStatus === 'connected' 
                          ? 'text-green-700' 
                          : postgresqlStatus === 'disconnected'
                          ? 'text-red-700'
                          : 'text-yellow-700'
                      }`}>
                        {postgresqlStatus === 'connected' ? 'מחובר' : 
                         postgresqlStatus === 'disconnected' ? 'מנותק' : 'בודק...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed Mobile Search Bar */}
      {location.pathname !== '/' && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-1.5">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={localSearchQuery}
              onChange={handleSearchChange}
              placeholder="חפש מתכונים..."
              className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            />
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 h-4 w-4 text-gray-400" />
          </form>
        </div>
      )}
      
      {/* Click outside to close filters and menu */}
      {isFilterOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-30" 
          onClick={() => setIsFilterOpen(false)}
        />
      )}
      </header>
      
      {/* Mobile Filter Overlay - Fixed positioning for better mobile support */}
      {isFilterOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 max-h-[70vh] overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-800">סינון מתכונים</h4>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">רמת קושי</label>
              <select
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value);
                  navigate('/recipes'); // Navigate to home to show filtered results
                }}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base bg-white"
              >
                <option value="">כל הרמות</option>
                <option value="קל">קל</option>
                <option value="בינוני">בינוני</option>
                <option value="קשה">קשה</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">תמונות</label>
              <select
                value={imageFilter}
                onChange={(e) => {
                  setImageFilter(e.target.value);
                  navigate('/recipes'); // Navigate to home to show filtered results
                }}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base bg-white"
              >
                <option value="">הכל</option>
                <option value="with">עם תמונות</option>
                <option value="without">ללא תמונות</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">קמח</label>
              <select
                value={flourFilter}
                onChange={(e) => {
                  setFlourFilter(e.target.value);
                  navigate('/recipes'); // Navigate to home to show filtered results
                }}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base bg-white"
              >
                <option value="">הכל</option>
                <option value="with">עם קמח</option>
                <option value="without">ללא קמח</option>
              </select>
            </div>
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full px-3 py-3 text-base text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                נקה פילטרים
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;