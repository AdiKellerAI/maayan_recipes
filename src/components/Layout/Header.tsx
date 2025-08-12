import React, { useState } from 'react';
import { Search, Heart, Plus, Menu, X, Clock, ChefHat, Filter, Database, ArrowUpDown, Timer } from 'lucide-react';
import { useRecipes } from '../../contexts/RecipeContext';
import { Link, useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { 
    showFavoritesOnly, 
    setShowFavoritesOnly, 
    showRecentOnly, 
    setShowRecentOnly, 
    setSearchQuery,
    difficultyFilter,
    setDifficultyFilter,
    imageFilter,
    setImageFilter,
    flourFilter,
    setFlourFilter,
    sortBy,
    setSortBy,
    postgresqlStatus,
    resetFilters
  } = useRecipes();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchQuery.trim()) {
      setSearchQuery(localSearchQuery.trim());
      navigate('/');
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
    navigate('/');
  };

  const toggleRecent = () => {
    setShowRecentOnly(!showRecentOnly);
    setShowFavoritesOnly(false);
    navigate('/');
  };

  const clearFilters = () => {
    setDifficultyFilter('');
    setImageFilter('');
    setShowFavoritesOnly(false);
    setShowRecentOnly(false);
  };

  const hasActiveFilters = difficultyFilter || imageFilter || showFavoritesOnly || showRecentOnly;

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center"
            onClick={(e) => {
              e.preventDefault();
              resetFilters();
              navigate('/');
            }}
          >
            <div className="relative">
              {/* PostgreSQL Status Indicator */}
              <div className="absolute -top-1 -right-1 z-10">
                <div className={`w-3 h-3 rounded-full border-2 border-white ${
                  postgresqlStatus === 'connected' ? 'bg-green-500' :
                  postgresqlStatus === 'disconnected' ? 'bg-red-500' :
                  'bg-yellow-500 animate-pulse'
                }`} title={
                  postgresqlStatus === 'connected' ? 'PostgreSQL מחובר' :
                  postgresqlStatus === 'disconnected' ? 'PostgreSQL לא זמין - משתמש ב-localStorage' :
                  'בודק חיבור PostgreSQL...'
                }></div>
              </div>
              <div className="bg-primary-500 px-4 py-2 rounded-lg shadow-md border border-primary-600 h-10 flex items-center justify-center">
                <ChefHat className="h-5 w-5 text-white mr-3 rtl:ml-3 rtl:mr-0" />
                <div className="text-base font-bold text-white tracking-wide">
                  המטבח של מעיין
                </div>
              </div>
            </div>
          </Link>

          {/* Fixed Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 rtl:space-x-reverse">

            <button
              onClick={() => {
                // Open timer for desktop
                const timerEvent = new CustomEvent('showTimer');
                window.dispatchEvent(timerEvent);
              }}
              className={`p-2 rounded-lg transition-colors transform active:scale-95 ${
                'text-gray-600 hover:bg-gray-100 hover:text-orange-600'
              }`}
              title="טיימר בישול"
            >
              <span className="text-xl">⏰</span>
            </button>

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
                  {/* PostgreSQL Status in Filter Menu */}
                  <div className="mb-4 p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm">
                      <Database className="h-4 w-4" />
                      <span className="font-medium">מסד נתונים:</span>
                      <div className={`w-2 h-2 rounded-full ${
                        postgresqlStatus === 'connected' ? 'bg-green-500' :
                        postgresqlStatus === 'disconnected' ? 'bg-red-500' :
                        'bg-yellow-500 animate-pulse'
                      }`}></div>
                      <span className={`text-xs ${
                        postgresqlStatus === 'connected' ? 'text-green-700' :
                        postgresqlStatus === 'disconnected' ? 'text-red-700' :
                        'text-yellow-700'
                      }`}>
                        {postgresqlStatus === 'connected' ? 'PostgreSQL' :
                         postgresqlStatus === 'disconnected' ? 'localStorage' :
                         'בודק...'}
                      </span>
                    </div>
                  </div>
                  
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
            
            <Link
              to="/add"
              className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600 active:bg-primary-700 transition-colors transform active:scale-95"
              title="הוספת מתכון"
            >
              <Plus className="h-5 w-5" />
            </Link>
            
          </div>

          {/* Mobile Menu Button */}
          {/* Mobile Icons - Always Visible */}
          <div className="md:hidden flex items-center space-x-2 rtl:space-x-reverse">

            <button
              onClick={() => {
                // Open timer for mobile
                const timerEvent = new CustomEvent('showTimer');
                window.dispatchEvent(timerEvent);
              }}
              className="p-2 rounded-lg transition-colors transform active:scale-95 text-gray-600 hover:bg-gray-100 hover:text-orange-600 timer-button"
              title="טיימר בישול"
            >
              <span className="text-xl">⏰</span>
            </button>

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

            <button
              onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); }}
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

            <Link
              to="/add"
              className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600 active:bg-primary-700 transition-colors transform active:scale-95"
              title="הוספת מתכון"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </div>


          {/* Mobile Filter Dropdown */}
          {isFilterOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 max-h-[70vh] overflow-y-auto">
              <div className="p-4 space-y-4">
                <h4 className="text-base font-semibold text-gray-800 mb-3">סינון</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">רמת קושי</label>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
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
                    onChange={(e) => setImageFilter(e.target.value)}
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
                    onChange={(e) => setFlourFilter(e.target.value)}
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
        </div>

      </div>

      {/* Fixed Mobile Search Bar */}
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
      
      {/* Click outside to close filters */}
      {(isFilterOpen || isMenuOpen) && (
        <div 
          className="fixed inset-0 z-40 md:hidden" 
          onClick={() => {
            setIsFilterOpen(false);
            setIsMenuOpen(false);
          }}
        />
      )}
      </header>
      
      {/* Mobile Filter Overlay - Separate from desktop */}
      {isFilterOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30 md:hidden"
          onClick={() => {
            setIsFilterOpen(false);
          }}
        />
      )}
    </>
  );
};

export default Header;