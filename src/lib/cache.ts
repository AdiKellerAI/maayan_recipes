// Browser-only cache system
class CacheManager {
  private readonly CACHE_TTL = 5 * 60; // 5 minutes

  constructor() {
    // Browser-only cache, no Node.js dependencies
  }

  // Cache methods using localStorage only
  set(key: string, value: any, ttl?: number): void {
    this.setBrowserCache(key, value, ttl);
  }

  get(key: string): any {
    return this.getBrowserCache(key);
  }

  delete(key: string): void {
    this.deleteBrowserCache(key);
  }

  clear(): void {
    this.clearBrowserCache();
    // Also clear any recipe-related localStorage items
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fallback_recipes');
      localStorage.removeItem('recipes-cache');
      localStorage.removeItem('recipes-cache-timestamp');
      localStorage.removeItem('hebrew-recipes');
      localStorage.removeItem('recipe-favorites');
      localStorage.removeItem('recipe-view-mode');
    }
  }

  // Browser cache methods (localStorage)
  private setBrowserCache(key: string, value: any, ttl?: number): void {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheData = {
        value,
        timestamp: Date.now(),
        ttl: (ttl || this.CACHE_TTL) * 1000 // Convert to milliseconds
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to set browser cache:', error);
    }
  }

  private getBrowserCache(key: string): any {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();
      
      if (now - cacheData.timestamp > cacheData.ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return cacheData.value;
    } catch (error) {
      console.warn('Failed to get browser cache:', error);
      return null;
    }
  }

  private deleteBrowserCache(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`cache_${key}`);
  }

  private clearBrowserCache(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  }

  // Cache statistics
  getStats() {
    if (typeof window === 'undefined') return { browserKeys: 0 };
    
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    
    return {
      browserKeys: cacheKeys.length
    };
  }
}

export const cacheManager = new CacheManager();

// Cache keys
export const CACHE_KEYS = {
  ALL_RECIPES: 'all_recipes',
  RECIPE_BY_ID: (id: string) => `recipe_${id}`,
  RECIPES_BY_CATEGORY: (category: string) => `recipes_category_${category}`,
  FAVORITE_RECIPES: 'favorite_recipes',
  RECENT_RECIPES: 'recent_recipes',
  RECIPE_PROGRESS: (id: string) => `recipe_progress_${id}`
};

// Recipe progress cache functions
export const recipeProgressCache = {
  // Save recipe progress
  saveProgress(recipeId: string, currentStep: number, additionalSteps?: { [key: string]: number }) {
    if (typeof window === 'undefined') return;
    
    try {
      const progressData = {
        currentStep,
        additionalSteps: additionalSteps || {},
        timestamp: Date.now()
      };
      localStorage.setItem(`recipe_progress_${recipeId}`, JSON.stringify(progressData));
    } catch (error) {
      console.warn('Failed to save recipe progress:', error);
    }
  },

  // Load recipe progress
  loadProgress(recipeId: string): { currentStep: number; additionalSteps: { [key: string]: number } } | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(`recipe_progress_${recipeId}`);
      if (!cached) return null;

      const progressData = JSON.parse(cached);
      return {
        currentStep: progressData.currentStep || 0,
        additionalSteps: progressData.additionalSteps || {}
      };
    } catch (error) {
      console.warn('Failed to load recipe progress:', error);
      return null;
    }
  },

  // Clear progress for a specific recipe
  clearProgress(recipeId: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`recipe_progress_${recipeId}`);
  },

  // Clear all recipe progress
  clearAllProgress() {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('recipe_progress_')) {
        localStorage.removeItem(key);
      }
    });
  }
};