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
  refreshRecipes: () => Promise<void>;
  resetFilters: () => void;
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
  const location = useLocation();

  // Load recipes from Supabase
  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      setPostgresqlStatus('checking');
      
      const data = await recipeService.getAllRecipes();
      console.log(`🎯 CONTEXT: Setting ${data.length} recipes in state`);
      setRecipes(data);
      
      // Check if we got data from PostgreSQL or fallback
      const isUsingPostgreSQL = await recipeService.checkPostgreSQLConnection();
      setPostgresqlStatus(isUsingPostgreSQL ? 'connected' : 'disconnected');
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

  const syncWithDatabase = async () => {
    try {
      // Always sync with database to ensure consistency
      console.log('Syncing with database...');
      await loadRecipes();
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
    // Only sync if we don't have recipes yet
    if (recipes.length === 0 && !loading) {
      console.log('🔄 ROUTE CHANGE: Loading recipes for first time...');
      loadRecipes();
    }
  }, [location.pathname]);

  // Additional sync on window focus (for mobile switching between apps)
  useEffect(() => {
    const handleFocus = async () => {
      // Only sync if we haven't loaded recently (avoid excessive syncing)
      if (!loading) {
        try {
          console.log('👁️ WINDOW FOCUS: Syncing with PostgreSQL...');
          await loadRecipes();
        } catch (err) {
          console.warn('Error syncing on focus:', err);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 VISIBILITY CHANGE: App became visible - syncing...');
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
  }, [recipes.length, loading]);

  const addRecipe = async (recipe: RecipeInsert): Promise<Recipe> => {
    try {
      console.log('➕ Context: Adding recipe', recipe.title);
      const newRecipe = await recipeService.addRecipe(recipe);
      console.log('✅ Context: Recipe added, refreshing list...');
      // Force refresh to ensure the UI shows the new recipe
      await loadRecipes();
      console.log('✅ Context: Recipe list refreshed');
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
      const updatedRecipe = await recipeService.updateRecipe(id, updates);
      setRecipes(prev => prev.map(recipe => 
        recipe.id === id ? updatedRecipe : recipe
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update recipe';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      console.log('🗑️ CONTEXT DEBUG: Starting deletion for recipe', id);
      console.log('🗑️ CONTEXT DEBUG: Current recipes count:', recipes.length);
      console.log('🗑️ CONTEXT DEBUG: Recipe exists in context:', recipes.some(r => r.id === id));
      
      // Immediately remove from local state for instant UI update
      const originalRecipes = [...recipes];
      setRecipes(prev => prev.filter(recipe => recipe.id !== id));
      console.log('🗑️ CONTEXT DEBUG: Removed from local state, new count should be:', recipes.length - 1);
      
      await recipeService.deleteRecipe(id);
      console.log('✅ CONTEXT DEBUG: Service deletion completed, refreshing list...');
      // Force refresh to ensure the UI is updated
      await loadRecipes();
      console.log('✅ CONTEXT DEBUG: Recipe list refreshed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete recipe';
      console.error('❌ CONTEXT DEBUG: Delete recipe error:', err);
      setError(errorMessage);
      // If deletion failed, restore the recipe in UI and refresh
      console.log('🔄 CONTEXT DEBUG: Deletion failed, refreshing to restore correct state');
      await loadRecipes();
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

  const refreshRecipes = async () => {
    await loadRecipes();
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
      resetFilters
    }}>
      {children}
    </RecipeContext.Provider>
  );
};