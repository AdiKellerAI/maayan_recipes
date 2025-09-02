import React, { useState, useEffect } from 'react';
import { Search, Heart, Plus, Filter, Menu, X, ChefHat, Database, Shield, ShieldCheck, Trash2 } from 'lucide-react';
import { useRecipes } from '../../contexts/RecipeContext';
import { useProtectedAction } from '../../hooks/useProtectedAction';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clearAllMemory } from '../../utils/storage';
import { recipeService } from '../../services/recipeService';

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
    recipes,
    refreshRecipes
  } = useRecipes();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClearingMemory, setIsClearingMemory] = useState(false);
  const [memoryCleanupMessage, setMemoryCleanupMessage] = useState<string | null>(null);
  
  // Global flag to prevent API calls during memory cleanup
  useEffect(() => {
    if (isClearingMemory) {
      // Set a global flag to prevent API calls
      (window as any).__isClearingMemory = true;
    } else {
      (window as any).__isClearingMemory = false;
    }
  }, [isClearingMemory]);
  const navigate = useNavigate();
  const { executeProtectedAction } = useProtectedAction();
  const { isAuthenticated } = useAuth();
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

  // Check if we're on a recipe detail page
  const isRecipeDetailPage = location.pathname.startsWith('/recipe/');

  useEffect(() => {
    if (location.pathname === '/') {
      setSearchQuery('');
      setLocalSearchQuery('');
    }
  }, [location.pathname, setSearchQuery]);

  // Auto-sync localStorage recipes to server when connection is restored
  useEffect(() => {
    const checkConnectionAndSync = async () => {
      try {
        // Check if we're in the middle of memory cleanup
        if ((window as any).__isClearingMemory) {
          console.log('⚠️ AUTO-SYNC: Memory cleanup in progress, skipping sync');
          return;
        }
        
        // First check if API is available
        try {
          const testResponse = await fetch('/api/test-connection', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
          });
          
          if (!testResponse.ok) {
            console.log('⚠️ AUTO-SYNC: API not available, skipping sync');
            return;
          }
        } catch (testError) {
          console.log('⚠️ AUTO-SYNC: API test failed, skipping sync:', testError);
          return;
        }
        
        // Check if we have any fallback recipes to sync
        const fallbackRecipes = JSON.parse(localStorage.getItem('fallback_recipes') || '[]');
        const recipesToSync = fallbackRecipes.filter((recipe: any) => recipe.id?.startsWith('fallback-'));
        
        if (recipesToSync.length > 0) {
          console.log(`🔄 AUTO-SYNC: Found ${recipesToSync.length} recipes to sync`);
          
          // Try to sync them
          const result = await recipeService.syncLocalStorageToServer();
          
          if (result.synced > 0) {
            let logMessage = `✅ AUTO-SYNC: Successfully synced ${result.synced} recipes`;
            if (result.imagesSynced > 0) {
              logMessage += ` and ${result.imagesSynced} images`;
            }
            console.log(logMessage);
            // Refresh recipes to show the synced ones - force refresh for auto-sync
            await refreshRecipes(true);
          }
          
          // Also sync images for existing recipes
          try {
            const imageResult = await recipeService.syncImagesOnly();
            if (imageResult.synced > 0) {
              console.log(`✅ AUTO-SYNC: Successfully synced ${imageResult.synced} additional images`);
            }
          } catch (imageError) {
            console.warn('⚠️ AUTO-SYNC: Failed to sync additional images:', imageError);
          }
        }
      } catch (error) {
        console.warn('⚠️ AUTO-SYNC: Failed to sync recipes:', error);
      }
    };

    // Check for sync on app load
    checkConnectionAndSync();

    // Also check when connection is restored
    const handleOnline = () => {
      console.log('🌐 Connection restored, checking for sync...');
      setTimeout(checkConnectionAndSync, 2000); // Wait a bit for connection to stabilize
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshRecipes]);

  // Handle scroll to show/hide search bar on recipe detail pages
  useEffect(() => {
    if (!isRecipeDetailPage) {
      setIsScrolled(false);
      return;
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isRecipeDetailPage]);

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
    setFlourFilter('');
    setShowFavoritesOnly(false);
    setShowRecentOnly(false);
  };

  const hasActiveFilters = difficultyFilter || imageFilter || flourFilter;

  // Function to attempt database connection with multiple strategies
  const handleDatabaseConnect = async () => {
    if (isConnecting) return;
    
    // Check if we're in the middle of memory cleanup
    if ((window as any).__isClearingMemory) {
      console.log('⚠️ Database connection: Memory cleanup in progress, skipping connection attempt');
      return;
    }
    
    setIsConnecting(true);
    console.log('🔄 Attempting to reconnect to database...');
    
    try {
      // Strategy 1: Use the new reconnect endpoint for force reconnection
      console.log('🔄 Strategy 1: Force reconnection...');
      try {
        const reconnectResponse = await fetch('/api/reconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });
        
        if (reconnectResponse.ok) {
          const result = await reconnectResponse.json();
          console.log('📊 Reconnection result:', result);
          
          if (result.connected) {
            console.log('✅ Database reconnection successful!');
            await refreshRecipes(true);
            alert('חיבור למאגר המידע הושלם בהצלחה!');
            return;
          }
        } else {
          console.warn('⚠️ Reconnect endpoint returned status:', reconnectResponse.status);
        }
      } catch (reconnectError) {
        console.warn('⚠️ Reconnect endpoint failed:', reconnectError);
      }
      
      // Strategy 2: Test connection with extended timeout
      console.log('🔄 Strategy 2: Connection test with extended timeout...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const testResponse = await fetch('/api/test-connection', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000)
        });
        
        if (testResponse.ok) {
          const result = await testResponse.json();
          console.log('📊 Connection test result:', result);
          
          if (result.connected) {
            console.log('✅ Database connection successful via test!');
            await refreshRecipes(true);
            alert('חיבור למאגר המידע הושלם בהצלחה!');
            return;
          }
        } else {
          console.warn('⚠️ Test connection endpoint returned status:', testResponse.status);
        }
      } catch (testError) {
        console.warn('⚠️ Test connection endpoint failed:', testError);
      }
      
      // Strategy 3: Force refresh recipes even if connection fails
      console.log('🔄 Strategy 3: Force refresh with local data...');
      await refreshRecipes(true);
      
      alert('לא הצלחנו להתחבר למאגר המידע, אך המערכת תמשיך לעבוד עם נתונים מקומיים.');
      console.log('⚠️ Connection failed but continuing with cached/local data');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      
      // Still try to refresh recipes in case we have cached data
      try {
        await refreshRecipes(true);
        alert('שגיאה בחיבור למאגר המידע. המערכת תמשיך לעבוד עם נתונים מקומיים.');
      } catch (refreshError) {
        console.error('❌ Failed to refresh recipes:', refreshError);
        alert('שגיאה בטעינת המתכונים. אנא רענן את הדף ונסה שוב.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleMemoryCleanup = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך לנקות את כל הזיכרון? פעולה זו תמחק את כל הנתונים השמורים מקומית ותאפס את האתר.')) {
      return;
    }

    setIsClearingMemory(true);
    setMemoryCleanupMessage(null);
    
    try {
      // Close the menu first to prevent any navigation issues
      setIsMenuOpen(false);
      
      // Set global flag to prevent API calls
      (window as any).__isClearingMemory = true;
      
      const result = await clearAllMemory();
      
      if (result.success) {
        setMemoryCleanupMessage(result.message);
        console.log('🧹 Memory cleanup completed:', result.clearedItems);
        
        // Show success message briefly before reload
        setTimeout(() => {
          setMemoryCleanupMessage('מעמיס מחדש את האתר...');
          
          // Use a shorter delay and ensure clean reload
          setTimeout(() => {
            // Clear any remaining state before reload
            setIsClearingMemory(false);
            setMemoryCleanupMessage(null);
            (window as any).__isClearingMemory = false;
            
            // Navigate to home page instead of reloading current page to avoid 404
            // This ensures a clean state and avoids any URL parameter issues
            navigate('/', { replace: true });
            
            // Force a full page reload to ensure all state is cleared
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }, 1000);
        }, 1000);
      } else {
        setMemoryCleanupMessage(result.message);
        console.error('❌ Memory cleanup failed');
        (window as any).__isClearingMemory = false;
      }
    } catch (error) {
      console.error('❌ Error during memory cleanup:', error);
      setMemoryCleanupMessage('שגיאה בניקוי הזיכרון. נסה שוב.');
      (window as any).__isClearingMemory = false;
    } finally {
      setIsClearingMemory(false);
    }
  };

  const handleSyncData = async () => {
    // Check if we're in the middle of memory cleanup
    if ((window as any).__isClearingMemory) {
      console.log('⚠️ Data sync: Memory cleanup in progress, skipping sync');
      return;
    }
    
    setIsConnecting(true);
    setMemoryCleanupMessage(null);
    
    try {
      console.log('🔄 Manual data sync initiated...');
      
      // Check if API is available before attempting sync
      try {
        const testResponse = await fetch('/api/test-connection', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        
        if (!testResponse.ok) {
          setMemoryCleanupMessage('מאגר המידע לא זמין כרגע');
          console.warn('⚠️ API not available for sync');
          return;
        }
      } catch (testError) {
        setMemoryCleanupMessage('מאגר המידע לא זמין כרגע');
        console.warn('⚠️ API test failed:', testError);
        return;
      }
      
      // Step 1: Sync recipes from localStorage
      console.log('🔄 Step 1: Syncing recipes from localStorage...');
      const recipeResult = await recipeService.syncLocalStorageToServer();
      
      let totalSynced = recipeResult.synced;
      let totalImagesSynced = recipeResult.imagesSynced;
      let totalErrors = recipeResult.errors;
      
      // Step 2: Sync images for existing recipes
      console.log('🖼️ Step 2: Syncing images for existing recipes...');
      const imageResult = await recipeService.syncImagesOnly();
      
      totalImagesSynced += imageResult.synced;
      totalErrors += imageResult.errors;
      
      // Show results
      if (totalSynced > 0 || totalImagesSynced > 0) {
        let message = '';
        if (totalSynced > 0) {
          message += `סנכרן ${totalSynced} מתכונים`;
        }
        if (totalImagesSynced > 0) {
          if (message) message += ' ו';
          message += `${totalImagesSynced} תמונות`;
        }
        message += ' בהצלחה!';
        
        setMemoryCleanupMessage(message);
        console.log(`✅ Manual data sync completed: ${totalSynced} recipes, ${totalImagesSynced} images synced`);
        
        // Refresh recipes to show the synced data - force refresh to ensure UI updates
        await refreshRecipes(true);
        
        // Close menu to show updated content
        setIsMenuOpen(false);
        
        // If we're on a specific page, trigger a re-render by updating the location
        if (location.pathname.startsWith('/recipe/')) {
          // For recipe detail pages, we need to ensure the recipe data is updated
          const currentRecipeId = location.pathname.split('/recipe/')[1];
          if (currentRecipeId) {
            // Trigger a navigation refresh to ensure the recipe detail page updates
            navigate(location.pathname, { replace: true });
          }
        }
      } else if (totalErrors > 0) {
        setMemoryCleanupMessage(`שגיאה בסנכרון ${totalErrors} פריטים`);
        console.error(`❌ Manual data sync failed: ${totalErrors} errors`);
      } else {
        setMemoryCleanupMessage('אין נתונים לסנכרון');
        console.log('ℹ️ Manual data sync: No data to sync');
      }
    } catch (error) {
      console.error('❌ Error during manual data sync:', error);
      setMemoryCleanupMessage('שגיאה בסנכרון הנתונים');
    } finally {
      setIsConnecting(false);
      
      // Clear message after delay
      setTimeout(() => {
        setMemoryCleanupMessage(null);
      }, 3000);
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-[9997] border-b border-gray-200">
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
              className={`py-2 rounded-lg shadow-md border h-10 flex items-center justify-center transition-all duration-500 ease-in-out bg-gradient-to-br from-orange-500/80 to-yellow-600/80 border-orange-400/80 hover:from-orange-600/80 hover:to-yellow-700/80 ${
                location.pathname === '/' 
                  ? 'px-4 md:px-16' // 4x wider on desktop landing page
                  : 'px-4'         // normal width on other pages
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
            <div className={`hidden sm:flex mx-8 transition-all duration-300 ${
              isRecipeDetailPage && isScrolled 
                ? 'flex-none w-0 opacity-0 overflow-hidden' 
                : 'flex-1 max-w-md opacity-100'
            }`}>
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

            <button
              onClick={() => setIsFilterOpen(true)}
              className={`p-2 rounded-lg transition-colors relative transform active:scale-95 ${
                hasActiveFilters
                  ? 'bg-green-100 text-green-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="סינון מתכונים"
            >
              <Filter className="h-5 w-5" />
              {hasActiveFilters && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </button>
            
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
              className="fixed inset-0 bg-black bg-opacity-50 z-[99998]"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Sidebar */}
            <div className="fixed top-0 right-0 w-56 bg-gradient-to-b from-white via-gray-50 to-white shadow-xl z-[99999] transform transition-transform duration-300 ease-in-out rounded-l-2xl border-l border-gray-200">
              {/* Header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200">
                <h2 className="text-base font-bold text-black">תפריט</h2>
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
                  <span className="text-xs font-semibold text-black">הוספת מתכון</span>
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
                  <span className="text-xs font-semibold text-black">מועדפים</span>
                </button>
                
                {/* Filter Button */}
                <button
                  onClick={() => {
                    setIsFilterOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2 rtl:space-x-reverse py-2 px-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    hasActiveFilters
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-300 shadow-md' 
                      : 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 border border-green-200 hover:border-green-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    hasActiveFilters ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'
                  }`}>
                    <Filter className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-black">סינון מתכונים</span>
                  {hasActiveFilters && (
                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse ml-auto rtl:mr-auto rtl:ml-0"></div>
                  )}
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-200 my-3"></div>
                
                {/* Quick Actions */}
                <div className="space-y-1.5">
                  <h5 className="text-xs font-semibold text-black uppercase tracking-wide">פעולות מהירות</h5>
                  
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
                    <span className="text-xs font-semibold text-black">טיימר בישול</span>
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
                    <span className="text-xs font-semibold text-black">דף הבית</span>
                  </button>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-200 my-3"></div>
                  
                  {/* Database Section */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-semibold text-black uppercase tracking-wide">ניהול נתונים</h5>
                    
                    {/* Database Connection Status */}
                    <div className="w-full flex items-center justify-between py-1.5 px-2.5">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          postgresqlStatus === 'connected' 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                            : postgresqlStatus === 'disconnected'
                            ? 'bg-gradient-to-br from-red-500 to-red-600'
                            : 'bg-gradient-to-br from-yellow-500 to-orange-600'
                        }`}>
                          <Database className="h-2.5 w-2.5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-black">
                          {postgresqlStatus === 'connected' ? 'מאגר מידע מחובר' : 
                           postgresqlStatus === 'disconnected' ? 'מאגר מידע מנותק' : 'בודק...'}
                        </span>
                      </div>
                      
                      {/* Connect Button - only show when disconnected */}
                      {postgresqlStatus === 'disconnected' && (
                        <button
                          onClick={handleDatabaseConnect}
                          disabled={isConnecting}
                          className={`${
                            isConnecting
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-gradient-to-br from-orange-500/80 to-yellow-600/80 border border-orange-400/80 text-white hover:from-orange-600/80 hover:to-yellow-700/80 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95'
                          } px-3 py-0 rounded-md font-medium flex items-center justify-center`}
                          style={{
                            height: '24px',
                            fontSize: '0.75rem',
                            lineHeight: '1.2',
                            minHeight: '24px'
                          }}
                          title="נסה להתחבר למאגר המידע"
                        >
                          {isConnecting ? 'מתחבר...' : 'התחבר'}
                        </button>
                      )}
                    </div>
                    
                    {/* Access Level Status */}
                    <div className="w-full flex items-center justify-between py-1.5 px-2.5">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isAuthenticated 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                            : 'bg-gradient-to-br from-red-500 to-red-600'
                        }`}>
                          {isAuthenticated ? (
                            <ShieldCheck className="h-2.5 w-2.5 text-white" />
                          ) : (
                            <Shield className="h-2.5 w-2.5 text-white" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-black">
                          {isAuthenticated ? 'גישה מלאה' : 'גישה מוגבלת'}
                        </span>
                      </div>
                      
                      {/* Login Button - only show when not authenticated */}
                      {!isAuthenticated && (
                        <button
                          onClick={() => {
                            executeProtectedAction(() => {});
                            setIsMenuOpen(false);
                          }}
                          className="bg-gradient-to-br from-orange-500/80 to-yellow-600/80 border border-orange-400/80 text-white px-3 py-0 rounded-md hover:from-orange-600/80 hover:to-yellow-700/80 transition-all duration-300 font-medium shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 flex items-center justify-center"
                          style={{
                            height: '24px',
                            fontSize: '0.75rem',
                            lineHeight: '1.2',
                            minHeight: '24px',
                            width: '60px'
                          }}
                        >
                          כניסה
                        </button>
                      )}
                    </div>
                    
                    {/* Sync Data Section */}
                    <div className="w-full flex items-center justify-between py-1.5 px-2.5">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isConnecting 
                            ? 'bg-blue-400' 
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}>
                          <Database className="h-2.5 w-2.5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-black">
                          {isConnecting ? 'מסנכרן...' : 'סנכרון נתונים'}
                        </span>
                      </div>
                      
                      {/* Sync Data Button */}
                      <button
                        onClick={handleSyncData}
                        disabled={isConnecting}
                        className={`${
                          isConnecting
                            ? 'bg-blue-100 text-blue-400 border-blue-200 cursor-not-allowed'
                            : 'bg-gradient-to-br from-blue-500/80 to-indigo-600/80 border border-blue-400/80 text-white hover:from-blue-600/80 hover:to-indigo-700/80 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95'
                        } px-3 py-0 rounded-md font-medium flex items-center justify-center`}
                        style={{
                          height: '24px',
                          fontSize: '0.75rem',
                          lineHeight: '1.2',
                          minHeight: '24px',
                          width: '60px'
                        }}
                        title="סנכרן נתונים ותמונות לשרת"
                      >
                        {isConnecting ? 'מסנכרן...' : 'סנכרן'}
                      </button>
                    </div>

                    {/* Memory Cleanup Section */}
                    <div className="w-full flex items-center justify-between py-1.5 px-2.5">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isClearingMemory 
                            ? 'bg-gray-400' 
                            : 'bg-gradient-to-br from-gray-500 to-slate-600'
                        }`}>
                          <Trash2 className="h-2.5 w-2.5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-black">
                          {isClearingMemory ? 'מנקה...' : 'ניקוי זיכרון'}
                        </span>
                      </div>
                      
                      {/* Memory Cleanup Button */}
                      <button
                        onClick={handleMemoryCleanup}
                        disabled={isClearingMemory}
                        className={`${
                          isClearingMemory
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-gradient-to-br from-gray-500/80 to-slate-600/80 border border-gray-400/80 text-white hover:from-gray-600/80 hover:to-slate-700/80 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95'
                        } px-3 py-0 rounded-md font-medium flex items-center justify-center`}
                        style={{
                          height: '24px',
                          fontSize: '0.75rem',
                          lineHeight: '1.2',
                          minHeight: '24px',
                          width: '60px'
                        }}
                        title="נקה את כל הזיכרון המקומי"
                      >
                        {isClearingMemory ? 'מנקה...' : 'נקה'}
                      </button>
                    </div>
                    
                    {/* Memory Cleanup Message */}
                    {memoryCleanupMessage && (
                      <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg mt-1">
                        <p className="text-xs text-blue-700 font-medium">{memoryCleanupMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile Search Bar - Collapsible */}
      {location.pathname !== '/' && (
        <div className={`md:hidden bg-white border-b border-gray-200 px-4 transition-all duration-300 overflow-hidden ${
          isRecipeDetailPage && isScrolled 
            ? 'h-0 py-0 opacity-0' 
            : 'h-auto py-1.5 opacity-100'
        }`}>
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
      
      </header>
      
      {/* Filter Modal - Elegant and modern design */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full max-h-[56vh] overflow-hidden border border-gray-100 transform transition-all duration-300">
            {/* Header with gradient background */}
            <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-b border-green-100 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                    <Filter className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800">
                      סינון מתכונים
                    </h3>
                    <p className="text-xs text-gray-600">
                      בחר קריטריונים לחיפוש
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1.5 hover:bg-white/50 rounded-lg transition-all duration-200 hover:scale-110"
                  type="button"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(56vh-64px)]">
              <div className="p-4">
                {/* Filter Options */}
                <div className="space-y-3">
                  {/* Difficulty Filter */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                      רמת קושי
                    </label>
                    <select
                      value={difficultyFilter}
                      onChange={(e) => {
                        setDifficultyFilter(e.target.value);
                        navigate('/recipes');
                      }}
                      className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm bg-white shadow-sm transition-all duration-200 hover:border-green-300"
                    >
                      <option value="">כל הרמות</option>
                      <option value="קל">קל</option>
                      <option value="בינוני">בינוני</option>
                      <option value="קשה">קשה</option>
                    </select>
                  </div>
                  
                  {/* Image Filter */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                      תמונות
                    </label>
                    <select
                      value={imageFilter}
                      onChange={(e) => {
                        setImageFilter(e.target.value);
                        navigate('/recipes');
                      }}
                      className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm bg-white shadow-sm transition-all duration-200 hover:border-green-300"
                    >
                      <option value="">הכל</option>
                      <option value="with">עם תמונות</option>
                      <option value="without">ללא תמונות</option>
                    </select>
                  </div>
                  
                  {/* Flour Filter */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="w-2 h-2 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full mr-2 rtl:ml-2 rtl:mr-0"></span>
                      קמח
                    </label>
                    <select
                      value={flourFilter}
                      onChange={(e) => {
                        setFlourFilter(e.target.value);
                        navigate('/recipes');
                      }}
                      className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm bg-white shadow-sm transition-all duration-200 hover:border-green-300"
                    >
                      <option value="">הכל</option>
                      <option value="with">עם קמח</option>
                      <option value="without">ללא קמח</option>
                    </select>
                  </div>
                  
                  {/* Clear Filters Button */}
                  {hasActiveFilters && (
                    <div className="pt-2">
                      <button
                        onClick={clearFilters}
                        className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                        type="button"
                      >
                        <X className="h-4 w-4" />
                        <span>נקה פילטרים</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;