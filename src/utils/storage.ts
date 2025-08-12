import { Recipe } from '../types/recipe';

const STORAGE_KEY = 'hebrew-recipes';

export const saveRecipes = (recipes: Recipe[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
};

export const loadRecipes = (): Recipe[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

export const saveFavorites = (favorites: string[]) => {
  localStorage.setItem('recipe-favorites', JSON.stringify(favorites));
};

export const loadFavorites = (): string[] => {
  const stored = localStorage.getItem('recipe-favorites');
  return stored ? JSON.parse(stored) : [];
};

export const saveViewMode = (mode: string) => {
  localStorage.setItem('recipe-view-mode', mode);
};

export const loadViewMode = (): string => {
  return localStorage.getItem('recipe-view-mode') || 'medium';
};

// Cache management for recipes
const CACHE_KEY = 'recipes-cache';
const CACHE_TIMESTAMP_KEY = 'recipes-cache-timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const saveRecipesToCache = (recipes: Recipe[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(recipes));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Failed to save recipes to cache:', error);
  }
};

export const loadRecipesFromCache = (): Recipe[] | null => {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return null;
    
    const cacheAge = Date.now() - parseInt(timestamp);
    if (cacheAge > CACHE_DURATION) {
      // Cache expired, clear it
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Failed to load recipes from cache:', error);
    return null;
  }
};

export const clearRecipesCache = () => {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
};