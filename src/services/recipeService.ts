import { cacheManager, CACHE_KEYS } from '../lib/cache';
import { sampleRecipes } from '../data/sampleRecipes';
import type { Recipe, RecipeInsert, RecipeUpdate } from '../types/recipe';

// Convert database row to Recipe type
const mapRowToRecipe = (row: any): Recipe => ({
  id: row.id,
  title: row.title,
  images: row.images || [],
  category: row.category,
  ingredients: row.ingredients,
  directions: row.directions,
  additional_instructions: row.additional_instructions || {},
  prep_time: row.prep_time,
  difficulty: row.difficulty as 'קל' | 'בינוני' | 'קשה' | undefined,
  is_favorite: row.is_favorite,
  created_at: new Date(row.created_at),
  updated_at: new Date(row.updated_at)
});

// Check if API server and PostgreSQL are available
const isAPIAvailable = async (): Promise<boolean> => {
  try {
    console.log('🔍 SERVICE: Testing API connection...');
    
    const response = await fetch('/api/test-connection', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      console.warn('❌ SERVICE: API response not OK:', response.status, response.statusText);
      return false;
    }
    
    const result = await response.json();
    console.log('🔍 SERVICE: API response:', result);
    
    return result.connected === true || result.success === true || result.message?.includes('connected');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('❌ SERVICE: API connection timeout');
    } else {
      console.warn('❌ SERVICE: API connection test failed:', error);
    }
    console.log('📦 Using localStorage fallback');
    return false;
  }
};

// Retry logic for API calls
const retryApiCall = async <T>(
  apiCall: () => Promise<T>, 
  maxRetries: number = 3, 
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ API call attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError!;
};

// Get fallback recipes from localStorage or sample data
const getFallbackRecipes = (): Recipe[] => {
  try {
    console.log('🔍 Checking localStorage for recipes...');
    const stored = localStorage.getItem('fallback_recipes');
    console.log('🔍 fallback_recipes key contains:', stored ? `${stored.length} characters` : 'null');
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('🔍 Parsed fallback_recipes:', Array.isArray(parsed) ? `${parsed.length} recipes` : typeof parsed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    
    // Check hebrew-recipes key as backup
    const hebrewStored = localStorage.getItem('hebrew-recipes');
    console.log('🔍 hebrew-recipes key contains:', hebrewStored ? `${hebrewStored.length} characters` : 'null');
    if (hebrewStored) {
      const parsed = JSON.parse(hebrewStored);
      console.log('🔍 Parsed hebrew-recipes:', Array.isArray(parsed) ? `${parsed.length} recipes` : typeof parsed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load fallback recipes from localStorage:', error);
  }
  
  // Return sample data as last resort and SAVE IT to localStorage
  console.log('🔍 No recipes in localStorage, using sample data and saving it');
  const sampleAsRecipes: Recipe[] = sampleRecipes.map((recipe, index) => ({
    id: `sample-${index}`,
    title: recipe.title,
    images: recipe.images || [],
    category: recipe.category,
    ingredients: recipe.ingredients,
    directions: recipe.directions,
    additional_instructions: recipe.additional_instructions || {},
    prep_time: recipe.prep_time || '',
    difficulty: recipe.difficulty,
    is_favorite: recipe.is_favorite || false,
    current_step: recipe.current_step || 0,
    created_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000)
  }));
  
  // Save sample data to localStorage so it can be modified
  saveFallbackRecipes(sampleAsRecipes);
  console.log('🔍 Saved sample data to localStorage');
  
  return sampleAsRecipes;
};

// Save fallback recipes to localStorage
const saveFallbackRecipes = (recipes: Recipe[]) => {
  try {
    // Save to multiple keys to ensure consistency
    const keys = ['fallback_recipes', 'hebrew-recipes'];
    for (const key of keys) {
      localStorage.setItem(key, JSON.stringify(recipes));
    }
    console.log(`💾 Saved ${recipes.length} recipes to localStorage`);
  } catch (error) {
    console.warn('Failed to save fallback recipes to localStorage:', error);
  }
};

export const recipeService = {
  // Get all recipes
  async getAllRecipes(): Promise<Recipe[]> {
    console.log('🔄 Getting all recipes...');
    
    // Check cache first for faster initial load
    const cached = cacheManager.get(CACHE_KEYS.ALL_RECIPES);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      console.log(`📦 Using cached recipes (${cached.length} recipes)`);
      return cached;
    }
    
    const isAvailable = await isAPIAvailable();
    
    if (isAvailable) {
      try {
        console.log('📊 Fetching recipes from API...');
        
        const recipes = await retryApiCall(async () => {
          const response = await fetch('/api/recipes', {
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }
          
          return await response.json();
        });
        
        console.log(`✅ Loaded ${recipes.length} recipes from API`);
        
        // Convert date strings back to Recipe type
        const processedRecipes = recipes.map((recipe: any) => ({
          id: recipe.id,
          title: recipe.title,
          images: recipe.images || [],
          category: recipe.category,
          ingredients: recipe.ingredients,
          directions: recipe.directions,
          additional_instructions: recipe.additional_instructions || {},
          prep_time: recipe.prep_time || '',
          difficulty: recipe.difficulty as 'קל' | 'בינוני' | 'קשה' | undefined,
          is_favorite: recipe.is_favorite || false,
          created_at: new Date(recipe.created_at),
          updated_at: new Date(recipe.updated_at)
        })) as Recipe[];
        
        // Save to localStorage as backup
        saveFallbackRecipes(processedRecipes);
        
        // Cache the results
        cacheManager.set(CACHE_KEYS.ALL_RECIPES, processedRecipes);
        
        return processedRecipes;
      } catch (error) {
        console.warn('❌ API request failed:', error);
        console.log('📦 Falling back to localStorage...');
        const fallbackRecipes = getFallbackRecipes();
        console.log(`📦 Loaded ${fallbackRecipes.length} fallback recipes`);
        return fallbackRecipes;
      }
    } else {
      console.log('📦 API not available, using localStorage fallback');
      const fallbackRecipes = getFallbackRecipes();
      console.log(`📦 Loaded ${fallbackRecipes.length} fallback recipes`);
      return fallbackRecipes;
    }
  },

  // Get recipe by ID
  async getRecipeById(id: string): Promise<Recipe | null> {
    const isAvailable = await isAPIAvailable();
    
    if (isAvailable) {
      try {
        const response = await fetch(`/api/recipes/${id}`, {
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.status === 404) return null;
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const recipe = await response.json();
        const processedRecipe = {
          ...recipe,
          created_at: new Date(recipe.created_at),
          updated_at: new Date(recipe.updated_at)
        };
        
        const cacheKey = CACHE_KEYS.RECIPE_BY_ID(id);
        cacheManager.set(cacheKey, processedRecipe);
        return processedRecipe;
      } catch (error) {
        console.warn('API request failed, checking fallback data:', error);
        const allRecipes = await this.getAllRecipes();
        return allRecipes.find(recipe => recipe.id === id) || null;
      }
    } else {
      const allRecipes = await this.getAllRecipes();
      return allRecipes.find(recipe => recipe.id === id) || null;
    }
  },

  // Add new recipe
  async addRecipe(recipe: RecipeInsert): Promise<Recipe> {
    console.log('➕ Adding new recipe:', recipe.title);
    const isAvailable = await isAPIAvailable();
    
    if (isAvailable) {
      try {
        console.log('💾 Saving via API...');
        const response = await fetch('/api/recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(recipe),
          signal: AbortSignal.timeout(15000) // 15 second timeout for creation
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error || ''}`);
        }
        
        const savedRecipe = await response.json();
        const processedRecipe = {
          ...savedRecipe,
          created_at: new Date(savedRecipe.created_at),
          updated_at: new Date(savedRecipe.updated_at)
        };
        
        console.log('✅ Recipe saved via API with ID:', processedRecipe.id);
        
        // Clear caches to ensure fresh data
        cacheManager.clear();
        return processedRecipe;
      } catch (error) {
        console.warn('❌ API request failed:', error);
        console.log('📦 Falling back to localStorage...');
        return this.addRecipeToLocalStorage(recipe);
      }
    } else {
      console.log('📦 API not available, using localStorage');
      return this.addRecipeToLocalStorage(recipe);
    }
  },

  // Helper method to add recipe to localStorage
  async addRecipeToLocalStorage(recipe: RecipeInsert): Promise<Recipe> {
    try {
      const currentRecipes = getFallbackRecipes();
      
      // Generate unique ID for new recipe
      const newId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create new recipe with all required fields
      const newRecipe: Recipe = {
        id: newId,
        title: recipe.title,
        category: recipe.category,
        ingredients: recipe.ingredients,
        directions: recipe.directions,
        additional_instructions: recipe.additional_instructions || {},
        prep_time: recipe.prep_time || '',
        difficulty: recipe.difficulty || undefined,
        is_favorite: recipe.is_favorite || false,
        images: recipe.images || [],
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Add new recipe to the beginning of the list
      const updatedRecipes = [newRecipe, ...currentRecipes];
      
      // Save updated list back to localStorage
      saveFallbackRecipes(updatedRecipes);
      
      // Clear caches
      cacheManager.clear();
      
      console.log(`✅ Recipe "${recipe.title}" added to localStorage`);
      return newRecipe;
    } catch (error) {
      console.error('❌ Failed to add recipe to localStorage:', error);
      throw new Error('Failed to add recipe');
    }
  },

  // Update recipe
  async updateRecipe(id: string, updates: RecipeUpdate): Promise<Recipe> {
    const isAvailable = await isAPIAvailable();
    
    if (isAvailable) {
      try {
        console.log('Updating recipe via API');
        const response = await fetch(`/api/recipes/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
          signal: AbortSignal.timeout(15000)
        });
        
        if (response.status === 404) {
          throw new Error('Recipe not found');
        }
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error || ''}`);
        }
        
        const updatedRecipe = await response.json();
        const processedRecipe = {
          ...updatedRecipe,
          created_at: new Date(updatedRecipe.created_at),
          updated_at: new Date(updatedRecipe.updated_at)
        };
        
        cacheManager.delete(CACHE_KEYS.ALL_RECIPES);
        cacheManager.delete(CACHE_KEYS.RECIPE_BY_ID(id));
        if (updates.category) {
          cacheManager.delete(CACHE_KEYS.RECIPES_BY_CATEGORY(updates.category));
        }
        return processedRecipe;
      } catch (error) {
        console.warn('API update failed:', error);
        console.log('📦 Falling back to localStorage...');
        return this.updateRecipeInLocalStorage(id, updates);
      }
    } else {
      console.log('📦 API not available, using localStorage');
      return this.updateRecipeInLocalStorage(id, updates);
    }
  },

  // Helper method to update recipe in localStorage
  async updateRecipeInLocalStorage(id: string, updates: RecipeUpdate): Promise<Recipe> {
    try {
      console.log(`🔍 UPDATE DEBUG: Starting update for recipe ID: "${id}"`);
      console.log(`🔍 UPDATE DEBUG: Updates:`, JSON.stringify(updates));
      
      // Get current recipes from localStorage
      let currentRecipes: Recipe[] = [];
      let storageKey = '';
      
      // Try different possible storage keys
      const possibleKeys = ['fallback_recipes', 'hebrew-recipes', 'recipes-cache'];
      
      for (const key of possibleKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              currentRecipes = parsed;
              storageKey = key;
              console.log(`📦 UPDATE DEBUG: Found ${parsed.length} recipes in key: ${key}`);
              break;
            }
          } catch (e) {
            console.warn(`Failed to parse localStorage key ${key}:`, e);
          }
        }
      }
      
      if (currentRecipes.length === 0) {
        console.error(`No recipes found in localStorage for update`);
        throw new Error('Recipe not found in localStorage');
      }
      
      // Find the recipe to update
      const recipeIndex = currentRecipes.findIndex(recipe => {
        const match = recipe.id === id || recipe.id.toString() === id || id.toString() === recipe.id;
        if (match) {
          console.log(`🔍 Found recipe match: "${recipe.id}" === "${id}"`);
        }
        return match;
      });
      
      if (recipeIndex === -1) {
        console.error(`Recipe "${id}" not found. Available IDs:`, currentRecipes.map(r => `"${r.id}"`));
        console.error(`Recipe types:`, currentRecipes.map(r => `${r.id} (${typeof r.id})`));
        throw new Error(`Recipe with ID "${id}" not found in localStorage`);
      }
      
      // Get the existing recipe
      const existingRecipe = currentRecipes[recipeIndex];
      console.log(`🔍 Updating recipe: "${existingRecipe.title}"`);
      
      // Apply updates to the existing recipe
      const updatedRecipe: Recipe = {
        ...existingRecipe,
        ...updates,
        id: existingRecipe.id, // Ensure ID doesn't change
        created_at: existingRecipe.created_at, // Preserve creation date
        updated_at: new Date() // Update the timestamp
      };
      
      console.log(`🔍 Recipe updated successfully: "${updatedRecipe.title}"`);
      console.log(`🔍 New favorite status: ${updatedRecipe.is_favorite}`);
      
      // Replace the recipe in the array
      currentRecipes[recipeIndex] = updatedRecipe;
      
      // Save updated list back to localStorage using the same key
      console.log(`💾 Saving ${currentRecipes.length} recipes to localStorage`);
      localStorage.setItem(storageKey, JSON.stringify(currentRecipes));
      
      // Also update other possible keys to keep them in sync
      for (const key of possibleKeys) {
        if (key !== storageKey && localStorage.getItem(key)) {
          console.log(`🔄 Syncing localStorage key: ${key}`);
          localStorage.setItem(key, JSON.stringify(currentRecipes));
        }
      }
      
      // Clear all caches
      cacheManager.clear();
      
      console.log(`✅ Recipe "${id}" updated successfully in localStorage`);
      
      return updatedRecipe;
    } catch (error) {
      console.error('❌ Failed to update recipe in localStorage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update recipe: ${errorMessage}`);
    }
  },

  // Delete recipe
  async deleteRecipe(id: string): Promise<void> {
    console.log('🗑️ Deleting recipe:', id);
    const isAvailable = await isAPIAvailable();
    
    if (isAvailable) {
      try {
        console.log('💾 Deleting via API...');
        const response = await fetch(`/api/recipes/${id}`, {
          method: 'DELETE',
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.status === 404) {
          console.log('⚠️ Recipe not found via API, checking localStorage...');
          // Try to delete from localStorage as fallback
          return this.deleteRecipeFromLocalStorage(id);
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error || ''}`);
        }
        
        console.log(`✅ Recipe ${id} deleted via API`);
        
        // Clear all caches and localStorage to ensure consistency
        cacheManager.clear();
        this.deleteRecipeFromLocalStorage(id); // Also remove from localStorage backup
        return;
      } catch (error) {
        console.warn('❌ API delete failed:', error);
        console.log('📦 Trying localStorage fallback...');
        return this.deleteRecipeFromLocalStorage(id);
      }
    } else {
      console.log('📦 API not available, using localStorage');
      return this.deleteRecipeFromLocalStorage(id);
    }
  },

  // Helper method to delete recipe from localStorage
  async deleteRecipeFromLocalStorage(id: string): Promise<void> {
    try {
      console.log(`🔍 DELETION DEBUG: Starting deletion for recipe ID: ${id}`);
      
      // Get recipes from all possible localStorage keys
      let currentRecipes: Recipe[] = [];
      let storageKey = '';
      
      // Try different possible storage keys
      const possibleKeys = ['fallback_recipes', 'hebrew-recipes', 'recipes-cache'];
      
      console.log(`🔍 DELETION DEBUG: Checking localStorage keys:`, possibleKeys);
      
      for (const key of possibleKeys) {
        const stored = localStorage.getItem(key);
        console.log(`🔍 DELETION DEBUG: Key "${key}" contains:`, stored ? `${stored.length} characters` : 'null');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            console.log(`🔍 DELETION DEBUG: Parsed "${key}":`, Array.isArray(parsed) ? `${parsed.length} items` : typeof parsed);
            if (Array.isArray(parsed) && parsed.length > 0) {
              currentRecipes = parsed;
              storageKey = key;
              console.log(`📦 DELETION DEBUG: Using recipes from localStorage key: ${key} (${parsed.length} recipes)`);
              console.log(`📦 DELETION DEBUG: Recipe IDs in storage:`, parsed.map(r => r.id));
              break;
            }
          } catch (e) {
            console.warn(`🔍 DELETION DEBUG: Failed to parse ${key}:`, e);
          }
        }
      }
      
      if (currentRecipes.length === 0) {
        console.log(`⚠️ DELETION DEBUG: No recipes found in localStorage`);
        return;
      }
      
      // Check if recipe exists
      const recipeExists = currentRecipes.some(recipe => recipe.id === id);
      console.log(`🔍 DELETION DEBUG: Recipe ${id} exists in storage:`, recipeExists);
      if (!recipeExists) {
        console.log(`⚠️ DELETION DEBUG: Recipe ${id} not found in localStorage. Available IDs:`, currentRecipes.map(r => r.id));
        return; // Don't throw error, just return
      }
      
      // Filter out the recipe to delete
      const updatedRecipes = currentRecipes.filter(recipe => recipe.id !== id);
      console.log(`🗑️ DELETION DEBUG: Removing recipe ${id}. Before: ${currentRecipes.length}, After: ${updatedRecipes.length}`);
      
      if (currentRecipes.length === updatedRecipes.length) {
        console.error(`❌ DELETION DEBUG: Recipe count didn't change! Something is wrong with the filter.`);
        console.log(`❌ DELETION DEBUG: Looking for ID "${id}" in:`, currentRecipes.map(r => `"${r.id}"`));
        return;
      }
      
      // Save updated list back to localStorage using the same key
      console.log(`💾 DELETION DEBUG: Saving ${updatedRecipes.length} recipes to localStorage key: ${storageKey}`);
      localStorage.setItem(storageKey, JSON.stringify(updatedRecipes));
      
      // Also update other possible keys to keep them in sync
      for (const key of possibleKeys) {
        if (key !== storageKey && localStorage.getItem(key)) {
          console.log(`🔄 DELETION DEBUG: Syncing key: ${key}`);
          localStorage.setItem(key, JSON.stringify(updatedRecipes));
        }
      }
      
      // Clear all caches
      cacheManager.clear();
      console.log(`🧹 DELETION DEBUG: Cleared all caches`);
      
      console.log(`✅ DELETION DEBUG: Recipe ${id} deleted from localStorage (${storageKey})`);
      
      // Verify deletion worked
      const verification = localStorage.getItem(storageKey);
      if (verification) {
        const verifyParsed = JSON.parse(verification);
        console.log(`✅ DELETION DEBUG: Verification - localStorage now has ${verifyParsed.length} recipes`);
      }
      
      return;
    } catch (error) {
      console.error('❌ DELETION DEBUG: Failed to delete recipe from localStorage:', error);
      throw new Error('Failed to delete recipe');
    }
  },

  // Toggle favorite status
  async toggleFavorite(id: string, isFavorite: boolean): Promise<Recipe> {
    console.log('🔄 SERVICE: Toggling favorite for recipe:', id, 'to:', isFavorite);
    try {
      const updatedRecipe = await this.updateRecipe(id, { is_favorite: isFavorite });
      console.log('✅ SERVICE: Favorite toggled successfully:', updatedRecipe.is_favorite);
      return updatedRecipe;
    } catch (error) {
      console.error('❌ SERVICE: Error toggling favorite:', error);
      throw error;
    }
  },

  // Get recipes by category (with caching)
  async getRecipesByCategory(category: string): Promise<Recipe[]> {
    const cacheKey = CACHE_KEYS.RECIPES_BY_CATEGORY(category);
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const allRecipes = await this.getAllRecipes();
    const filtered = allRecipes.filter(recipe => recipe.category === category);
    
    cacheManager.set(cacheKey, filtered);
    return filtered;
  },

  // Get favorite recipes (with caching)
  async getFavoriteRecipes(): Promise<Recipe[]> {
    const cached = cacheManager.get(CACHE_KEYS.FAVORITE_RECIPES);
    if (cached) {
      return cached;
    }

    const allRecipes = await this.getAllRecipes();
    const favorites = allRecipes.filter(recipe => recipe.is_favorite);
    
    cacheManager.set(CACHE_KEYS.FAVORITE_RECIPES, favorites);
    return favorites;
  },

  // Sync with database - check for changes
  async syncWithDatabase(): Promise<{ hasChanges: boolean; newRecipes: Recipe[] }> {
    const isAvailable = await isAPIAvailable();
    
    if (isAvailable) {
      try {
        // Clear cache to force fresh data
        cacheManager.clear();
        return { hasChanges: true, newRecipes: [] };
      } catch (error) {
        console.warn('Error syncing with database:', error);
        return { hasChanges: false, newRecipes: [] };
      }
    } else {
      return { hasChanges: false, newRecipes: [] };
    }
  },

  // Clear all caches
  clearCache(): void {
    cacheManager.clear();
    console.log('All caches cleared - next request will fetch fresh from PostgreSQL');
  },

  // Check PostgreSQL connection status
  async checkPostgreSQLConnection(): Promise<boolean> {
    return await isAPIAvailable();
  },

  // Get cache statistics
  getCacheStats() {
    return cacheManager.getStats();
  }
};