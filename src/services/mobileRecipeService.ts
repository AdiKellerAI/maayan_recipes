/**
 * Mobile-Optimized Recipe Service
 * 
 * This service handles recipe operations on mobile devices with special attention to:
 * 1. Image storage optimization using IndexedDB
 * 2. Avoiding localStorage quota exceeded errors
 * 3. Smart fallback mechanisms
 * 4. Mobile-specific error handling and user feedback
 */

import { mobileImageService } from './mobileImageService';
import type { Recipe, RecipeInsert, RecipeUpdate } from '../types/recipe';

interface MobileRecipeMetadata {
  id: string;
  title: string;
  category: string;
  ingredients: string[];
  directions: string[];
  additional_instructions?: { [key: string]: string[] };
  additional_sections?: { [key: string]: any };
  prep_time?: string;
  difficulty?: 'קל' | 'בינוני' | 'קשה';
  is_favorite: boolean;
  imageCount: number;
  createdAt: number;
  updatedAt: number;
  storage: 'indexeddb' | 'localstorage' | 'hybrid';
}

interface MobileStorageStatus {
  localStorage: {
    available: boolean;
    used: number;
    remaining: number;
    quota: number;
  };
  indexedDB: {
    available: boolean;
    ready: boolean;
  };
  hybrid: {
    available: boolean;
    strategy: 'images_indexeddb_metadata_localstorage' | 'fallback_localstorage' | 'fallback_placeholder';
  };
}

class MobileRecipeService {
  private readonly METADATA_KEY_PREFIX = 'mobile_recipe_meta_';
  private readonly RECIPE_LIST_KEY = 'mobile_recipes_list';
  private readonly MAX_LOCALSTORAGE_SIZE = 4 * 1024 * 1024; // 4MB to be safe

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the mobile recipe service
   */
  private async initializeService(): Promise<void> {
    try {
      // Check storage availability
      const status = await this.checkStorageStatus();
      console.log('📱 Mobile Recipe Service initialized with status:', status);

      // Clean up old data if needed
      if (status.localStorage.used > this.MAX_LOCALSTORAGE_SIZE * 0.8) {
        console.log('🧹 Storage usage high, cleaning up old data...');
        await this.cleanupOldData();
      }
    } catch (error) {
      console.error('❌ Failed to initialize mobile recipe service:', error);
    }
  }

  /**
   * Check storage availability and status
   */
  async checkStorageStatus(): Promise<MobileStorageStatus> {
    const status: MobileStorageStatus = {
      localStorage: { available: false, used: 0, remaining: 0, quota: 5 * 1024 * 1024 },
      indexedDB: { available: false, ready: false },
      hybrid: { available: false, strategy: 'fallback_placeholder' }
    };

    // Check localStorage
    try {
      const testKey = '__mobile_test__';
      const testValue = 'x'.repeat(1024);
      
      localStorage.setItem(testKey, testValue);
      localStorage.removeItem(testKey);
      
      status.localStorage.available = true;
      
      // Calculate usage
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          used += localStorage.getItem(key)?.length || 0;
        }
      }
      
      status.localStorage.used = used;
      status.localStorage.remaining = Math.max(0, status.localStorage.quota - used);
    } catch (error) {
      status.localStorage.available = false;
    }

    // Check IndexedDB
    status.indexedDB.available = !!window.indexedDB;
    if (status.indexedDB.available) {
      try {
        // Test IndexedDB access
        const testDB = indexedDB.open('__test_db__', 1);
        testDB.onsuccess = () => {
          status.indexedDB.ready = true;
          testDB.result.close();
          indexedDB.deleteDatabase('__test_db__');
        };
        testDB.onerror = () => {
          status.indexedDB.ready = false;
        };
      } catch (error) {
        status.indexedDB.ready = false;
      }
    }

    // Determine hybrid strategy
    if (status.localStorage.available && status.indexedDB.available && status.indexedDB.ready) {
      status.hybrid.available = true;
      status.hybrid.strategy = 'images_indexeddb_metadata_localstorage';
    } else if (status.localStorage.available && status.localStorage.remaining > 1024 * 1024) {
      status.hybrid.available = true;
      status.hybrid.strategy = 'fallback_localstorage';
    } else {
      status.hybrid.available = false;
      status.hybrid.strategy = 'fallback_placeholder';
    }

    return status;
  }

  /**
   * Save recipe with mobile-optimized storage strategy
   */
  async saveRecipe(recipe: RecipeInsert): Promise<Recipe> {
    try {
      console.log('📱 Mobile: Starting recipe save process...');
      
      const status = await this.checkStorageStatus();
      const recipeId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Process images first
      let processedImages: string[] = [];
      if (recipe.images && recipe.images.length > 0) {
        console.log(`📱 Mobile: Processing ${recipe.images.length} images...`);
        
        for (let i = 0; i < recipe.images.length; i++) {
          const imageData = recipe.images[i];
          
          if (imageData.startsWith('data:image/')) {
            try {
              // Convert base64 to File object
              const base64Data = imageData.split(',')[1];
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              
              for (let j = 0; j < byteCharacters.length; j++) {
                byteNumbers[j] = byteCharacters.charCodeAt(j);
              }
              
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'image/jpeg' });
              const file = new File([blob], `recipe_${i}.jpg`, { type: 'image/jpeg' });
              
              console.log(`📱 Mobile: Processing image ${i + 1}/${recipe.images.length} (${Math.round(file.size / 1024)}KB)`);
              
              // Save using mobile image service
              const imageId = await mobileImageService.saveImage(file, recipeId);
              if (imageId && imageId !== 'placeholder') {
                processedImages.push(imageId);
                console.log(`✅ Mobile: Image ${i + 1} saved successfully`);
              } else {
                console.warn(`⚠️ Mobile: Image ${i + 1} failed to save, using placeholder`);
                processedImages.push('placeholder');
              }
            } catch (error) {
              console.warn(`⚠️ Mobile: Failed to process image ${i}:`, error);
              // Use placeholder for failed images
              processedImages.push('placeholder');
            }
          } else {
            // Keep external URLs
            processedImages.push(imageData);
          }
        }
        
        console.log(`📱 Mobile: Successfully processed ${processedImages.filter(img => img !== 'placeholder').length}/${recipe.images.length} images`);
      }

      // Create recipe object
      const mobileRecipe: Recipe = {
        id: recipeId,
        title: recipe.title,
        category: recipe.category,
        ingredients: recipe.ingredients,
        directions: recipe.directions,
        additional_instructions: recipe.additional_instructions || {},
        additional_sections: recipe.additional_sections || {},
        prep_time: recipe.prep_time || '',
        difficulty: recipe.difficulty,
        is_favorite: recipe.is_favorite || false,
        images: processedImages,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Save based on storage strategy
      if (status.hybrid.strategy === 'images_indexeddb_metadata_localstorage') {
        await this.saveRecipeHybrid(mobileRecipe);
      } else if (status.hybrid.strategy === 'fallback_localstorage') {
        await this.saveRecipeLocalStorage(mobileRecipe);
      } else {
        await this.saveRecipePlaceholder(mobileRecipe);
      }

      console.log(`✅ Mobile: Recipe "${recipe.title}" saved successfully`);
      return mobileRecipe;
    } catch (error) {
      console.error('❌ Mobile: Failed to save recipe:', error);
      throw new Error('Failed to save recipe on mobile device');
    }
  }

  /**
   * Save recipe using hybrid storage (images in IndexedDB, metadata in localStorage)
   */
  private async saveRecipeHybrid(recipe: Recipe): Promise<void> {
    console.log('📱 Mobile: Using hybrid storage strategy...');
    
    // Save recipe metadata to localStorage
    const metadata: MobileRecipeMetadata = {
      id: recipe.id,
      title: recipe.title,
      category: recipe.category,
      ingredients: recipe.ingredients,
      directions: recipe.directions,
      additional_instructions: recipe.additional_instructions,
      additional_sections: recipe.additional_sections,
      prep_time: recipe.prep_time,
      difficulty: recipe.difficulty,
      is_favorite: recipe.is_favorite,
      imageCount: recipe.images.length,
      createdAt: recipe.created_at.getTime(),
      updatedAt: recipe.updated_at.getTime(),
      storage: 'hybrid'
    };

    const metadataKey = this.METADATA_KEY_PREFIX + recipe.id;
    localStorage.setItem(metadataKey, JSON.stringify(metadata));

    // Update recipe list
    const recipeList = this.getRecipeList();
    recipeList.unshift(recipe.id);
    localStorage.setItem(this.RECIPE_LIST_KEY, JSON.stringify(recipeList));

    console.log('✅ Mobile: Recipe saved using hybrid storage');
  }

  /**
   * Save recipe using localStorage fallback
   */
  private async saveRecipeLocalStorage(recipe: Recipe): Promise<void> {
    console.log('📱 Mobile: Using localStorage fallback...');
    
    // Check if we have enough space
    const status = await this.checkStorageStatus();
    const recipeSize = JSON.stringify(recipe).length;
    
    if (recipeSize > status.localStorage.remaining) {
      console.warn('⚠️ Mobile: Not enough localStorage space, cleaning up...');
      await this.cleanupOldData();
      
      // Check again after cleanup
      const newStatus = await this.checkStorageStatus();
      if (recipeSize > newStatus.localStorage.remaining) {
        throw new Error('Not enough storage space even after cleanup');
      }
    }

    // Save full recipe to localStorage
    const recipeKey = this.METADATA_KEY_PREFIX + recipe.id;
    localStorage.setItem(recipeKey, JSON.stringify(recipe));

    // Update recipe list
    const recipeList = this.getRecipeList();
    recipeList.unshift(recipe.id);
    localStorage.setItem(this.RECIPE_LIST_KEY, JSON.stringify(recipeList));

    console.log('✅ Mobile: Recipe saved to localStorage');
  }

  /**
   * Save recipe with placeholder images (last resort)
   */
  private async saveRecipePlaceholder(recipe: Recipe): Promise<void> {
    console.log('📱 Mobile: Using placeholder strategy (no image storage available)...');
    
    // Replace images with placeholders
    const placeholderRecipe: Recipe = {
      ...recipe,
      images: recipe.images.map(() => 'placeholder')
    };

    // Save metadata only
    const metadata: MobileRecipeMetadata = {
      id: recipe.id,
      title: recipe.title,
      category: recipe.category,
      ingredients: recipe.ingredients,
      directions: recipe.directions,
      additional_instructions: recipe.additional_instructions,
      additional_sections: recipe.additional_sections,
      prep_time: recipe.prep_time,
      difficulty: recipe.difficulty,
      is_favorite: recipe.is_favorite,
      imageCount: recipe.images.length,
      createdAt: recipe.created_at.getTime(),
      updatedAt: recipe.updated_at.getTime(),
      storage: 'hybrid'
    };

    const metadataKey = this.METADATA_KEY_PREFIX + recipe.id;
    localStorage.setItem(metadataKey, JSON.stringify(metadata));

    // Update recipe list
    const recipeList = this.getRecipeList();
    recipeList.unshift(recipe.id);
    localStorage.setItem(this.RECIPE_LIST_KEY, JSON.stringify(recipeList));

    console.log('✅ Mobile: Recipe saved with placeholder images');
  }

  /**
   * Get all saved recipes
   */
  async getAllRecipes(): Promise<Recipe[]> {
    try {
      const recipeList = this.getRecipeList();
      const recipes: Recipe[] = [];

      for (const recipeId of recipeList) {
        const recipe = await this.getRecipe(recipeId);
        if (recipe) {
          recipes.push(recipe);
        }
      }

      return recipes;
    } catch (error) {
      console.error('❌ Mobile: Failed to get recipes:', error);
      return [];
    }
  }

  /**
   * Get recipe by ID
   */
  async getRecipe(id: string): Promise<Recipe | null> {
    try {
      const metadataKey = this.METADATA_KEY_PREFIX + id;
      const metadataStr = localStorage.getItem(metadataKey);
      
      if (!metadataStr) {
        return null;
      }

      const metadata: MobileRecipeMetadata = JSON.parse(metadataStr);
      
      if (metadata.storage === 'hybrid') {
        // Reconstruct recipe from metadata and images
        const recipe: Recipe = {
          id: metadata.id,
          title: metadata.title,
          category: metadata.category,
          ingredients: metadata.ingredients,
          directions: metadata.directions,
          additional_instructions: metadata.additional_instructions || {},
          additional_sections: metadata.additional_sections || {},
          prep_time: metadata.prep_time || '',
          difficulty: metadata.difficulty,
          is_favorite: metadata.is_favorite,
          images: [], // Will be populated from image service
          created_at: new Date(metadata.createdAt),
          updated_at: new Date(metadata.updatedAt)
        };

        // Get images from image service
        if (metadata.imageCount > 0) {
          try {
            const images = await mobileImageService.getRecipeImages(id);
            recipe.images = images;
          } catch (error) {
            console.warn(`⚠️ Mobile: Failed to get images for recipe ${id}:`, error);
            // Use placeholder images
            recipe.images = Array(metadata.imageCount).fill('placeholder');
          }
        }

        return recipe;
      } else {
        // Full recipe stored in localStorage
        const recipeKey = this.METADATA_KEY_PREFIX + id;
        const recipeStr = localStorage.getItem(recipeKey);
        
        if (recipeStr) {
          const recipe = JSON.parse(recipeStr);
          // Convert date strings back to Date objects
          recipe.created_at = new Date(recipe.created_at);
          recipe.updated_at = new Date(recipe.updated_at);
          return recipe;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Mobile: Failed to get recipe:', error);
      return null;
    }
  }

  /**
   * Update recipe
   */
  async updateRecipe(id: string, updates: RecipeUpdate): Promise<Recipe | null> {
    try {
      const existingRecipe = await this.getRecipe(id);
      if (!existingRecipe) {
        throw new Error('Recipe not found');
      }

      // Apply updates
      const updatedRecipe: Recipe = {
        ...existingRecipe,
        ...updates,
        updated_at: new Date()
      };

      // Handle image updates
      if (updates.images) {
        console.log(`📱 Mobile: Updating ${updates.images.length} images for recipe ${id}...`);
        
        // Process new images
        const processedImages: string[] = [];
        for (let i = 0; i < updates.images.length; i++) {
          const imageData = updates.images[i];
          
          if (imageData.startsWith('data:image/')) {
            try {
              // Convert base64 to File object
              const base64Data = imageData.split(',')[1];
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              
              for (let j = 0; j < byteCharacters.length; j++) {
                byteNumbers[j] = byteCharacters.charCodeAt(j);
              }
              
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'image/jpeg' });
              const file = new File([blob], `recipe_${i}.jpg`, { type: 'image/jpeg' });
              
              console.log(`📱 Mobile: Processing updated image ${i + 1}/${updates.images.length} (${Math.round(file.size / 1024)}KB)`);
              
              // Save using mobile image service
              const imageId = await mobileImageService.saveImage(file, id);
              if (imageId && imageId !== 'placeholder') {
                processedImages.push(imageId);
                console.log(`✅ Mobile: Updated image ${i + 1} saved successfully`);
              } else {
                console.warn(`⚠️ Mobile: Updated image ${i + 1} failed to save, using placeholder`);
                processedImages.push('placeholder');
              }
            } catch (error) {
              console.warn(`⚠️ Mobile: Failed to process updated image ${i}:`, error);
              // Use placeholder for failed images
              processedImages.push('placeholder');
            }
          } else {
            processedImages.push(imageData);
          }
        }
        
        updatedRecipe.images = processedImages;
        console.log(`📱 Mobile: Successfully processed ${processedImages.filter(img => img !== 'placeholder').length}/${updates.images.length} updated images`);
      }

      // Save updated recipe
      await this.saveRecipe(updatedRecipe);

      console.log(`✅ Mobile: Recipe "${updatedRecipe.title}" updated successfully`);
      return updatedRecipe;
    } catch (error) {
      console.error('❌ Mobile: Failed to update recipe:', error);
      return null;
    }
  }

  /**
   * Delete recipe
   */
  async deleteRecipe(id: string): Promise<boolean> {
    try {
      // Delete images first
      const recipe = await this.getRecipe(id);
      if (recipe && recipe.images.length > 0) {
        for (const imageId of recipe.images) {
          if (imageId !== 'placeholder') {
            try {
              await mobileImageService.deleteImage(imageId);
            } catch (error) {
              console.warn(`⚠️ Mobile: Failed to delete image ${imageId}:`, error);
            }
          }
        }
      }

      // Remove recipe metadata
      const metadataKey = this.METADATA_KEY_PREFIX + id;
      localStorage.removeItem(metadataKey);

      // Remove from recipe list
      const recipeList = this.getRecipeList();
      const updatedList = recipeList.filter(recipeId => recipeId !== id);
      localStorage.setItem(this.RECIPE_LIST_KEY, JSON.stringify(updatedList));

      console.log(`✅ Mobile: Recipe ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error('❌ Mobile: Failed to delete recipe:', error);
      return false;
    }
  }

  /**
   * Get recipe list from localStorage
   */
  private getRecipeList(): string[] {
    try {
      const listStr = localStorage.getItem(this.RECIPE_LIST_KEY);
      return listStr ? JSON.parse(listStr) : [];
    } catch (error) {
      console.warn('⚠️ Mobile: Failed to get recipe list:', error);
      return [];
    }
  }

  /**
   * Clean up old data to free storage
   */
  private async cleanupOldData(): Promise<number> {
    try {
      const recipeList = this.getRecipeList();
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      let deletedCount = 0;

      for (const recipeId of recipeList) {
        try {
          const metadataKey = this.METADATA_KEY_PREFIX + recipeId;
          const metadataStr = localStorage.getItem(metadataKey);
          
          if (metadataStr) {
            const metadata: MobileRecipeMetadata = JSON.parse(metadataStr);
            
            if (now - metadata.createdAt > maxAge) {
              await this.deleteRecipe(recipeId);
              deletedCount++;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Mobile: Failed to process recipe ${recipeId} during cleanup:`, error);
        }
      }

      console.log(`🧹 Mobile: Cleaned up ${deletedCount} old recipes`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Mobile: Failed to cleanup old data:', error);
      return 0;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalRecipes: number;
    totalImages: number;
    localStorageUsed: number;
    localStorageRemaining: number;
    strategy: string;
  }> {
    try {
      const status = await this.checkStorageStatus();
      const recipeList = this.getRecipeList();
      
      let totalImages = 0;
      for (const recipeId of recipeList) {
        const recipe = await this.getRecipe(recipeId);
        if (recipe) {
          totalImages += recipe.images.length;
        }
      }

      return {
        totalRecipes: recipeList.length,
        totalImages,
        localStorageUsed: status.localStorage.used,
        localStorageRemaining: status.localStorage.remaining,
        strategy: status.hybrid.strategy
      };
    } catch (error) {
      console.error('❌ Mobile: Failed to get storage stats:', error);
      return {
        totalRecipes: 0,
        totalImages: 0,
        localStorageUsed: 0,
        localStorageRemaining: 0,
        strategy: 'unknown'
      };
    }
  }
}

// Export singleton instance
export const mobileRecipeService = new MobileRecipeService();
export default mobileRecipeService;
