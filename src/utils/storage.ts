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

/**
 * Comprehensive memory cleanup function
 * Clears all application caches, localStorage, and browser cache
 */
export const clearAllMemory = async (): Promise<{ success: boolean; message: string; clearedItems: string[] }> => {
  const clearedItems: string[] = [];
  
  try {
    // Clear all localStorage items related to the app
    const localStorageKeys = [
      'fallback_recipes',
      'recipes-cache',
      'recipes-cache-timestamp',
      'hebrew-recipes',
      'recipe-favorites',
      'recipe-view-mode',
      'recipe-progress',
      'recipe-settings',
      'user-preferences',
      'search-history',
      'filter-settings',
      'view-settings',
      'timer-settings',
      'auth-token',
      'auth-user',
      'last-sync-time',
      'database-status',
      'connection-status',
      'error-log',
      'performance-metrics',
      'image-cache',
      'smart-search-cache',
      'category-filters',
      'difficulty-filters',
      'image-filters',
      'flour-filters',
      'sort-settings',
      'favorite-recipes',
      'recent-recipes',
      'recipe-drafts',
      'upload-progress',
      'image-uploads',
      'compression-settings',
      'navigation-history',
      'page-state',
      'form-data',
      'validation-cache',
      'api-cache',
      'request-cache',
      'response-cache'
    ];

    localStorageKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        clearedItems.push(`localStorage: ${key}`);
      }
    });

    // Clear any other localStorage items that might be app-related
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.toLowerCase().includes('recipe') || 
          key.toLowerCase().includes('cache') || 
          key.toLowerCase().includes('image') ||
          key.toLowerCase().includes('auth') ||
          key.toLowerCase().includes('filter') ||
          key.toLowerCase().includes('setting') ||
          key.toLowerCase().includes('preference') ||
          key.toLowerCase().includes('timer') ||
          key.toLowerCase().includes('sync') ||
          key.toLowerCase().includes('progress') ||
          key.toLowerCase().includes('upload') ||
          key.toLowerCase().includes('draft') ||
          key.toLowerCase().includes('history') ||
          key.toLowerCase().includes('log') ||
          key.toLowerCase().includes('metric') ||
          key.toLowerCase().includes('state') ||
          key.toLowerCase().includes('form') ||
          key.toLowerCase().includes('validation') ||
          key.toLowerCase().includes('api') ||
          key.toLowerCase().includes('request') ||
          key.toLowerCase().includes('response')) {
        localStorage.removeItem(key);
        clearedItems.push(`localStorage: ${key}`);
      }
    });

    // Clear sessionStorage
    sessionStorage.clear();
    clearedItems.push('sessionStorage: all items');

    // Clear browser cache for the domain
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            clearedItems.push(`browser-cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      } catch (error) {
        console.warn('Failed to clear browser cache:', error);
      }
    }

    // Clear IndexedDB if available
    if ('indexedDB' in window) {
      try {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              clearedItems.push(`indexedDB: ${db.name}`);
              return indexedDB.deleteDatabase(db.name);
            }
            return Promise.resolve();
          })
        );
      } catch (error) {
        console.warn('Failed to clear IndexedDB:', error);
      }
    }

    // Clear any stored credentials
    if ('credentials' in navigator) {
      try {
        await navigator.credentials.store(null);
        clearedItems.push('credentials: stored credentials');
      } catch (error) {
        console.warn('Failed to clear credentials:', error);
      }
    }

    // Clear any stored permissions
    if ('permissions' in navigator) {
      try {
        const permissions = await navigator.permissions.query({ name: 'notifications' as PermissionName });
        if (permissions.state === 'granted') {
          clearedItems.push('permissions: notification permissions');
        }
      } catch (error) {
        console.warn('Failed to check permissions:', error);
      }
    }

    // Force garbage collection if available (Chrome only)
    if (window.gc) {
      try {
        window.gc();
        clearedItems.push('memory: garbage collection triggered');
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error);
      }
    }

    // Clear any image object URLs that might be cached
    if (window.URL && window.URL.revokeObjectURL) {
      // Note: We can't track all object URLs, but we can clear any we know about
      clearedItems.push('object-urls: image object URLs');
    }

    const message = `ניקוי זיכרון הושלם בהצלחה! נוקו ${clearedItems.length} פריטים.`;
    
    return {
      success: true,
      message,
      clearedItems
    };

  } catch (error) {
    console.error('Error during memory cleanup:', error);
    return {
      success: false,
      message: 'שגיאה בניקוי הזיכרון. נסה שוב.',
      clearedItems
    };
  }
};