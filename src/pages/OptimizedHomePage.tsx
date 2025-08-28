import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpDown, Settings, Activity } from 'lucide-react';
import { categories } from '../data/categories';
import { RecipeQuery } from '../services/optimizedRecipeService';
import CategoryNav from '../components/Layout/CategoryNav';
import ViewModeToggle from '../components/Layout/ViewModeToggle';
import OptimizedRecipeGrid from '../components/Recipe/OptimizedRecipeGrid';
import PerformanceMonitor from '../components/Performance/PerformanceMonitor';

type ViewMode = 'large' | 'medium' | 'list';
type SortOption = 'created_at_desc' | 'created_at_asc' | 'name_asc' | 'name_desc';

const OptimizedHomePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('medium');
  const [sortBy, setSortBy] = useState<SortOption>('created_at_desc');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showPerfMonitor, setShowPerfMonitor] = useState(false);
  
  // URL-based filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load view mode preference
  useEffect(() => {
    const savedViewMode = localStorage.getItem('recipe-view-mode') as ViewMode;
    if (savedViewMode && ['large', 'medium', 'list'].includes(savedViewMode)) {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode preference
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('recipe-view-mode', mode);
  };

  // Handle URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const favoritesParam = urlParams.get('favorites');
    const categoryParam = urlParams.get('category');
    const searchParam = urlParams.get('search');
    
    setShowFavoritesOnly(favoritesParam === 'true');
    setSelectedCategory(categoryParam || '');
    setSearchQuery(searchParam ? decodeURIComponent(searchParam) : '');
    
    // Clear conflicting filters
    if (favoritesParam === 'true') {
      setSelectedCategory('');
      setSearchQuery('');
    } else if (categoryParam) {
      setShowFavoritesOnly(false);
      setSearchQuery('');
    } else if (searchParam) {
      setShowFavoritesOnly(false);
      setSelectedCategory('');
    }
    
    // Scroll to top on filter change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.search]);

  // Build query object for API
  const query: RecipeQuery = useMemo(() => {
    const baseQuery: RecipeQuery = {
      sortBy,
      limit: viewMode === 'large' ? 8 : viewMode === 'medium' ? 12 : 16
    };

    if (selectedCategory) {
      baseQuery.category = selectedCategory;
    }
    
    if (showFavoritesOnly) {
      baseQuery.favorites = true;
    }
    
    if (searchQuery) {
      baseQuery.search = searchQuery;
    }

    return baseQuery;
  }, [selectedCategory, showFavoritesOnly, searchQuery, sortBy, viewMode]);

  // Get selected category data for display
  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  // Handle recipe click
  const handleRecipeClick = (id: string) => {
    navigate(`/recipe/${id}`);
  };

  // Get page title
  const getPageTitle = () => {
    if (searchQuery) {
      return `תוצאות חיפוש עבור "${searchQuery}"`;
    }
    if (showFavoritesOnly) {
      return 'המתכונים המועדפים שלי';
    }
    if (selectedCategoryData) {
      return selectedCategoryData.name;
    }
    return 'כל המתכונים';
  };

  // Get page subtitle
  const getPageSubtitle = () => {
    if (searchQuery) {
      return 'מתכונים שנמצאו';
    }
    if (showFavoritesOnly) {
      return 'המתכונים שאהבת הכי הרבה';
    }
    if (selectedCategoryData) {
      return `מתכונים בקטגוריית ${selectedCategoryData.name}`;
    }
    return 'כל המתכונים הזמינים';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CategoryNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {getPageTitle()}
            </h1>
            <p className="text-gray-600 mt-2">
              {getPageSubtitle()}
            </p>
          </div>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {/* Performance Monitor Button */}
            <button
              onClick={() => setShowPerfMonitor(true)}
              className="p-2 rounded-lg transition-all duration-200 transform active:scale-95 border-2 text-gray-600 hover:bg-gray-50 border-gray-200 hover:border-gray-300"
              title="מוניטור ביצועים"
            >
              <Activity className="h-5 w-5" />
            </button>

            {/* Sort Button */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`p-2 rounded-lg transition-all duration-200 transform active:scale-95 border-2 ${
                  sortBy !== 'created_at_desc' || isSortOpen
                    ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
                title="מיון מתכונים"
              >
                <ArrowUpDown className="h-5 w-5" />
              </button>
              
              {isSortOpen && (
                <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">מיון</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setSortBy('created_at_desc'); setIsSortOpen(false); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'created_at_desc' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      תאריך העלאה (חדש לישן)
                    </button>
                    <button
                      onClick={() => { setSortBy('created_at_asc'); setIsSortOpen(false); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'created_at_asc' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      תאריך העלאה (ישן לחדש)
                    </button>
                    <button
                      onClick={() => { setSortBy('name_asc'); setIsSortOpen(false); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'name_asc' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      שם מתכון (א-ת)
                    </button>
                    <button
                      onClick={() => { setSortBy('name_desc'); setIsSortOpen(false); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'name_desc' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      שם מתכון (ת-א)
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <ViewModeToggle 
              viewMode={viewMode} 
              onViewModeChange={handleViewModeChange} 
            />
          </div>
        </div>

        {/* Performance indicator */}
        <div className="mb-4 text-sm text-gray-500 flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>מיטב ביצועים פעיל</span>
          </div>
          <div className="text-xs text-gray-400">
            טעינה חכמה • מטמון מתקדם • תמונות עצלות
          </div>
        </div>

        {/* Optimized Recipe Grid */}
        <OptimizedRecipeGrid 
          query={query}
          viewMode={viewMode}
          onRecipeClick={handleRecipeClick}
        />
      </div>

      {/* Performance Monitor Modal */}
      <PerformanceMonitor 
        isVisible={showPerfMonitor}
        onClose={() => setShowPerfMonitor(false)}
      />
    </div>
  );
};

export default OptimizedHomePage;
