import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Recipe, ViewMode, RecipeInsert } from '../types/recipe';
import { recipeService } from '../services/recipeService';
import { saveViewMode, loadViewMode } from '../utils/storage';
import { useLocation } from 'react-router-dom';

interface RecipeContextType {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  postgresqlStatus: 'connected' | 'disconnected' | 'checking';
  viewMode: ViewMode;
  searchQuery: string;
  selectedCategory: string;
  showFavoritesOnly: boolean;
  showRecentOnly: boolean;
  difficultyFilter: string;
  imageFilter: string;
  flourFilter: string;
  sortBy: string;
  lastSyncTime: Date | null;
  isInitialized: boolean;
  addRecipe: (recipe: RecipeInsert) => Promise<Recipe>;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setShowFavoritesOnly: (show: boolean) => void;
  setShowRecentOnly: (show: boolean) => void;
  setDifficultyFilter: (difficulty: string) => void;
  setImageFilter: (filter: string) => void;
  setFlourFilter: (filter: string) => void;
  setSortBy: (sort: string) => void;
  getFilteredRecipes: () => Recipe[];
  refreshRecipes: (forceRefresh?: boolean) => Promise<void>;
  resetFilters: () => void;
  getSyncStatus: () => { lastSync: string; isStale: boolean; cacheAge: number };
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
};

export const RecipeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>('large');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showRecentOnly, setShowRecentOnly] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [imageFilter, setImageFilter] = useState('');
  const [flourFilter, setFlourFilter] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [postgresqlStatus, setPostgresqlStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const location = useLocation();

  // Smart loading with caching and incremental updates
  const loadRecipes = async (forceRefresh = false) => {
    try {
      // Don't reload if we have recent data and not forcing refresh
      if (!forceRefresh && isInitialized && lastSyncTime && 
          Date.now() - lastSyncTime.getTime() < 5 * 60 * 1000) { // 5 minutes cache
        console.log('🔄 Using cached recipes (last sync:', lastSyncTime.toLocaleTimeString(), ')');
        return;
      }

      setLoading(true);
      setError(null);
      setPostgresqlStatus('checking');
      
      const data = await recipeService.getAllRecipes();
      console.log(`🎯 CONTEXT: Setting ${data.length} recipes in state`);
      setRecipes(data);
      
      // Check if we got data from PostgreSQL or fallback
      const isUsingPostgreSQL = await recipeService.checkPostgreSQLConnection();
      setPostgresqlStatus(isUsingPostgreSQL ? 'connected' : 'disconnected');
      
      setLastSyncTime(new Date());
      setIsInitialized(true);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה בטעינת המתכונים';
      setError(errorMessage);
      console.error('Error loading recipes:', err);
      setPostgresqlStatus('disconnected');
      // Don't clear recipes on error, keep existing ones
    } finally {
      setLoading(false);
    }
  };

  // Incremental sync - only fetch changes since last sync
  const syncWithDatabase = async (incremental = true) => {
    try {
      if (incremental && lastSyncTime) {
        console.log('🔄 Incremental sync since:', lastSyncTime.toLocaleTimeString());
        // For now, we'll do a full refresh, but in the future this could be incremental
        await loadRecipes(false); // Use cache if available
      } else {
        console.log('🔄 Full sync with database...');
        await loadRecipes(true); // Force refresh
      }
    } catch (err) {
      console.warn('Error syncing with database:', err);
      // Don't show error to user for sync failures
    }
  };

  useEffect(() => {
    loadRecipes();
    
    const savedViewMode = loadViewMode() as ViewMode;
    setViewModeState(savedViewMode === 'large' || savedViewMode === 'list' ? 'medium' : savedViewMode);
  }, []);

  useEffect(() => {
    // Only sync if we don't have recipes yet or if it's been a while
    if (recipes.length === 0 && !loading) {
      console.log('🔄 ROUTE CHANGE: Loading recipes for first time...');
      loadRecipes();
    } else if (isInitialized && lastSyncTime && 
               Date.now() - lastSyncTime.getTime() > 10 * 60 * 1000) { // 10 minutes
      console.log('🔄 ROUTE CHANGE: Recipes are stale, refreshing...');
      syncWithDatabase(true); // Incremental sync
    }
  }, [location.pathname]);

  // Additional sync on window focus (for mobile switching between apps)
  useEffect(() => {
    const handleFocus = async () => {
      // Only sync if we haven't loaded recently (avoid excessive syncing)
      if (!loading && isInitialized) {
        try {
          console.log('👁️ WINDOW FOCUS: Checking if sync needed...');
          if (!lastSyncTime || Date.now() - lastSyncTime.getTime() > 5 * 60 * 1000) {
            console.log('👁️ WINDOW FOCUS: Syncing with PostgreSQL...');
            await syncWithDatabase(true); // Incremental sync
          } else {
            console.log('👁️ WINDOW FOCUS: Using cached data');
          }
        } catch (err) {
          console.warn('Error syncing on focus:', err);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 VISIBILITY CHANGE: App became visible - checking sync...');
        // Debounce visibility changes
        setTimeout(handleFocus, 500);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Mobile-specific events
    window.addEventListener('pageshow', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handleFocus);
    };
  }, [recipes.length, loading, isInitialized, lastSyncTime]);

  const addRecipe = async (recipe: RecipeInsert): Promise<Recipe> => {
    try {
      console.log('➕ Context: Adding recipe', recipe.title);
      const newRecipe = await recipeService.addRecipe(recipe);
      console.log('✅ Context: Recipe added, refreshing list...');
      
      // Add to local state immediately for instant UI update
      setRecipes(prev => [newRecipe, ...prev]);
      
      // Then sync with database in background
      setTimeout(async () => {
        try {
          await syncWithDatabase(true);
        } catch (err) {
          console.warn('Background sync failed:', err);
        }
      }, 100);
      
      console.log('✅ Context: Recipe list updated');
      return newRecipe;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add recipe';
      console.error('Add recipe error:', err);
      setError(errorMessage);
      throw err;
    }
  };

  const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
    try {
      // Optimistically update local state first
      setRecipes(prev => prev.map(recipe => 
        recipe.id === id ? { ...recipe, ...updates } : recipe
      ));
      
      // Then update backend
      const updatedRecipe = await recipeService.updateRecipe(id, updates);
      
      // Update with the actual response from backend
      setRecipes(prev => prev.map(recipe => 
        recipe.id === id ? updatedRecipe : recipe
      ));
      
      // Sync with database in background
      setTimeout(async () => {
        try {
          await syncWithDatabase(true);
        } catch (err) {
          console.warn('Background sync after update failed:', err);
        }
      }, 100);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update recipe';
      setError(errorMessage);
      
      // Revert optimistic update on error
      await loadRecipes(true);
      throw err;
    }
  };

  const deleteRecipe = async (id: string) => {
    // Save the recipe before deletion for potential restoration
    const recipeToDelete = recipes.find(r => r.id === id);
    
    try {
      console.log('🗑️ CONTEXT DEBUG: Starting deletion for recipe', id);
      console.log('🗑️ CONTEXT DEBUG: Current recipes count:', recipes.length);
      console.log('🗑️ CONTEXT DEBUG: Recipe exists in context:', recipes.some(r => r.id === id));
      
      // Immediately remove from local state for instant UI update
      setRecipes(prev => prev.filter(recipe => recipe.id !== id));
      console.log('🗑️ CONTEXT DEBUG: Removed from local state, new count should be:', recipes.length - 1);
      
      // Delete from backend without waiting for sync
      await recipeService.deleteRecipe(id);
      console.log('✅ CONTEXT DEBUG: Service deletion completed');
      
      // Don't sync immediately to avoid loading states
      // The UI is already updated, so no need to refresh
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete recipe';
      console.error('❌ CONTEXT DEBUG: Delete recipe error:', err);
      setError(errorMessage);
      // If deletion failed, restore the recipe in UI
      console.log('🔄 CONTEXT DEBUG: Deletion failed, restoring recipe in UI');
      if (recipeToDelete) {
        setRecipes(prev => [...prev, recipeToDelete]);
      }
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      console.log('🔄 CONTEXT: Toggling favorite for recipe ID:', `"${id}"`);
      const recipe = recipes.find(r => r.id === id);
      if (!recipe) return;
      
      const newFavoriteState = !recipe.is_favorite;
      console.log('🔄 CONTEXT: Changing favorite from', recipe.is_favorite, 'to', newFavoriteState);
      
      // Optimistically update the UI first
      setRecipes(prev => prev.map(r => 
        r.id === id ? { ...r, is_favorite: newFavoriteState } : r
      ));
      
      // Then update the backend
      try {
        const updatedRecipe = await recipeService.toggleFavorite(id, newFavoriteState);
        console.log('✅ CONTEXT: Favorite toggled successfully:', updatedRecipe.is_favorite);
        
        // Update with the actual response from backend (in case of any differences)
        setRecipes(prev => prev.map(r => 
          r.id === id ? updatedRecipe : r
        ));
        
        // Sync with database in background
        setTimeout(async () => {
          try {
            await syncWithDatabase(true);
          } catch (err) {
            console.warn('Background sync after favorite toggle failed:', err);
          }
        }, 100);
        
      } catch (updateError) {
        console.error('❌ CONTEXT: Backend update failed:', updateError);
        
        // Revert the optimistic update on error
        setRecipes(prev => prev.map(r => 
          r.id === id ? { ...r, is_favorite: recipe.is_favorite } : r
        ));
        
        // Don't throw error on mobile to prevent crashes
        console.warn('⚠️ CONTEXT: Favorite toggle failed, reverted to original state');
      }
      
    } catch (err) {
      console.error('❌ CONTEXT: Error toggling favorite:', err);
      // Don't throw error to prevent UI crashes
      console.warn('⚠️ CONTEXT: Favorite toggle failed');
    }
  };

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    saveViewMode(mode);
  };

  const getFilteredRecipes = () => {
    let filtered = recipes;

    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(recipe => 
        recipe.title.toLowerCase().includes(query) ||
        recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(query)) ||
        recipe.directions.some(direction => direction.toLowerCase().includes(query))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(recipe => recipe.category === selectedCategory);
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter(recipe => recipe.is_favorite);
    }

    if (difficultyFilter) {
      filtered = filtered.filter(recipe => recipe.difficulty === difficultyFilter);
    }

    if (imageFilter === 'with') {
      filtered = filtered.filter(recipe => recipe.images && recipe.images.length > 0);
    } else if (imageFilter === 'without') {
      filtered = filtered.filter(recipe => !recipe.images || recipe.images.length === 0);
    }

    if (flourFilter === 'with') {
      filtered = filtered.filter(recipe => 
        recipe.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('קמח')
        )
      );
    } else if (flourFilter === 'without') {
      filtered = filtered.filter(recipe => 
        !recipe.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('קמח')
        )
      );
    }

    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'name-asc':
          filtered = filtered.sort((a, b) => a.title.localeCompare(b.title, 'he'));
          break;
        case 'name-desc':
          filtered = filtered.sort((a, b) => b.title.localeCompare(a.title, 'he'));
          break;
        case 'date-newest':
          filtered = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'date-oldest':
          filtered = filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          break;
        default:
          break;
      }
    }

    if (showRecentOnly) {
      filtered = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    return filtered;
  };

  const refreshRecipes = async (forceRefresh = false) => {
    if (forceRefresh) {
      await loadRecipes(true);
    } else {
      await syncWithDatabase(true); // Incremental sync
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setShowFavoritesOnly(false);
    setShowRecentOnly(false);
    setDifficultyFilter('');
    setImageFilter('');
    setFlourFilter('');
    setSortBy('');
  };

  const getSyncStatus = () => {
    if (!lastSyncTime) {
      return { lastSync: 'Never synced', isStale: true, cacheAge: 0 };
    }
    const cacheAge = Date.now() - lastSyncTime.getTime();
    const isStale = cacheAge > 10 * 60 * 1000; // 10 minutes stale
    return {
      lastSync: lastSyncTime.toLocaleTimeString(),
      isStale,
      cacheAge: Math.round(cacheAge / (1000 * 60)) // minutes
    };
  };

  return (
    <RecipeContext.Provider value={{
      recipes,
      loading,
      error,
      postgresqlStatus,
      viewMode,
      searchQuery,
      selectedCategory,
      showFavoritesOnly,
      showRecentOnly,
      difficultyFilter,
      imageFilter,
      flourFilter,
      sortBy,
      lastSyncTime,
      isInitialized,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      toggleFavorite,
      setViewMode,
      setSearchQuery,
      setSelectedCategory,
      setShowFavoritesOnly,
      setShowRecentOnly,
      setDifficultyFilter,
      setImageFilter,
      setFlourFilter,
      setSortBy,
      getFilteredRecipes,
      refreshRecipes,
      resetFilters,
      getSyncStatus
    }}>
      {children}
    </RecipeContext.Provider>
  );
};