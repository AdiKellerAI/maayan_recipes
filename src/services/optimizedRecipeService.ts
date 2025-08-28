import { enhancedCache, ENHANCED_CACHE_KEYS } from '../lib/enhancedCache';
import type { Recipe, RecipeInsert, RecipeUpdate } from '../types/recipe';

// Optimized recipe summary type for list views
export interface RecipeSummary {
  id: string;
  title: string;
  category: string;
  difficulty?: string;
  prep_time?: string;
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
  first_image?: any;
  image_count: number;
  ingredient_count: number;
  step_count: number;
}

// Pagination response type
export interface PaginatedResponse<T> {
  recipes: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query parameters for recipe fetching
export interface RecipeQuery {
  page?: number;
  limit?: number;
  category?: string;
  favorites?: boolean;
  search?: string;
  difficulty?: string;
  hasImages?: boolean;
  sortBy?: string;
}

// Performance monitoring
export interface PerformanceMetrics {
  requestStart: number;
  requestEnd: number;
  duration: number;
  cacheHit: boolean;
  endpoint: string;
}

class OptimizedRecipeService {
  private performanceMetrics: PerformanceMetrics[] = [];

  // Track performance metrics
  private startPerformanceTracking(endpoint: string): number {
    return Date.now();
  }

  private endPerformanceTracking(endpoint: string, startTime: number, cacheHit: boolean = false) {
    const endTime = Date.now();
    const metric: PerformanceMetrics = {
      requestStart: startTime,
      requestEnd: endTime,
      duration: endTime - startTime,
      cacheHit,
      endpoint
    };
    
    this.performanceMetrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
    
    console.log(`📊 Performance: ${endpoint} took ${metric.duration}ms ${cacheHit ? '(cached)' : '(fresh)'}`);
  }

  // Use enhanced cache instead of local cache
  private getCachedData<T>(key: string): T | null {
    return enhancedCache.get<T>(key);
  }

  // Cache request data using enhanced cache
  private setCachedData<T>(key: string, data: T, ttl?: number): void {
    enhancedCache.set(key, data, ttl);
  }

  // Check if API is available
  async isAPIAvailable(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get paginated recipe summaries (optimized for list views)
  async getRecipeSummaries(query: RecipeQuery = {}): Promise<PaginatedResponse<RecipeSummary>> {
    const startTime = this.startPerformanceTracking('getRecipeSummaries');
    const cacheKey = ENHANCED_CACHE_KEYS.RECIPE_SUMMARIES(JSON.stringify(query));
    
    // Check cache first
    const cached = this.getCachedData<PaginatedResponse<RecipeSummary>>(cacheKey);
    if (cached) {
      this.endPerformanceTracking('getRecipeSummaries', startTime, true);
      return cached;
    }

    const {
      page = 1,
      limit = 12,
      category,
      favorites,
      search,
      difficulty,
      hasImages,
      sortBy = 'created_at_desc'
    } = query;

    const isAvailable = await this.isAPIAvailable();
    
    if (!isAvailable) {
      // Fallback to localStorage with client-side pagination
      const allRecipes = this.getFallbackRecipes();
      const summaries = this.convertToSummaries(allRecipes);
      const filtered = this.filterSummariesLocally(summaries, query);
      const paginated = this.paginateLocally(filtered, page, limit);
      
      this.endPerformanceTracking('getRecipeSummaries', startTime, false);
      return paginated;
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        detailed: 'false' // Request optimized summaries
      });

      if (category) params.append('category', category);
      if (favorites) params.append('favorites', 'true');
      if (search) params.append('search', search);
      if (difficulty) params.append('difficulty', difficulty);
      if (hasImages !== undefined) params.append('hasImages', hasImages.toString());

      const response = await fetch(`/api/recipes?${params}`, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Convert to RecipeSummary format
      const result: PaginatedResponse<RecipeSummary> = {
        recipes: data.recipes.map((recipe: any) => ({
          id: recipe.id,
          title: recipe.title,
          category: recipe.category,
          difficulty: recipe.difficulty,
          prep_time: recipe.prep_time,
          is_favorite: recipe.is_favorite,
          created_at: new Date(recipe.created_at),
          updated_at: new Date(recipe.updated_at),
          first_image: recipe.first_image,
          image_count: recipe.image_count,
          ingredient_count: recipe.ingredient_count,
          step_count: recipe.step_count
        })),
        pagination: data.pagination
      };

      // Cache the result with shorter TTL for dynamic data
      this.setCachedData(cacheKey, result, 3 * 60 * 1000); // 3 minutes for recipe lists
      this.endPerformanceTracking('getRecipeSummaries', startTime, false);
      
      return result;
    } catch (error) {
      console.warn('API request failed, falling back to localStorage:', error);
      
      // Fallback to localStorage
      const allRecipes = this.getFallbackRecipes();
      const summaries = this.convertToSummaries(allRecipes);
      const filtered = this.filterSummariesLocally(summaries, query);
      const paginated = this.paginateLocally(filtered, page, limit);
      
      this.endPerformanceTracking('getRecipeSummaries', startTime, false);
      return paginated;
    }
  }

  // Get full recipe details (for detail view)
  async getRecipeDetails(id: string): Promise<Recipe | null> {
    const startTime = this.startPerformanceTracking('getRecipeDetails');
    const cacheKey = ENHANCED_CACHE_KEYS.RECIPE_DETAILS(id);
    
    // Check cache first
    const cached = this.getCachedData<Recipe>(cacheKey);
    if (cached) {
      this.endPerformanceTracking('getRecipeDetails', startTime, true);
      return cached;
    }

    const isAvailable = await this.isAPIAvailable();
    
    if (!isAvailable) {
      const fallbackRecipes = this.getFallbackRecipes();
      const recipe = fallbackRecipes.find(r => r.id === id) || null;
      this.endPerformanceTracking('getRecipeDetails', startTime, false);
      return recipe;
    }

    try {
      const response = await fetch(`/api/recipes/${id}?detailed=true`, {
        signal: AbortSignal.timeout(10000)
      });

      if (response.status === 404) {
        this.endPerformanceTracking('getRecipeDetails', startTime, false);
        return null;
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const recipe = await response.json();
      const processedRecipe = {
        ...recipe,
        created_at: new Date(recipe.created_at),
        updated_at: new Date(recipe.updated_at)
      };

      // Cache the result with longer TTL for stable data
      this.setCachedData(cacheKey, processedRecipe, 10 * 60 * 1000); // 10 minutes for recipe details
      this.endPerformanceTracking('getRecipeDetails', startTime, false);
      
      return processedRecipe;
    } catch (error) {
      console.warn('API request failed, checking fallback data:', error);
      
      const fallbackRecipes = this.getFallbackRecipes();
      const recipe = fallbackRecipes.find(r => r.id === id) || null;
      this.endPerformanceTracking('getRecipeDetails', startTime, false);
      return recipe;
    }
  }

  // Convert full recipes to summaries
  private convertToSummaries(recipes: Recipe[]): RecipeSummary[] {
    return recipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      category: recipe.category,
      difficulty: recipe.difficulty,
      prep_time: recipe.prep_time,
      is_favorite: recipe.is_favorite,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
      first_image: recipe.images?.[0] || null,
      image_count: recipe.images?.length || 0,
      ingredient_count: recipe.ingredients?.length || 0,
      step_count: recipe.directions?.length || 0
    }));
  }

  // Client-side filtering for fallback mode
  private filterSummariesLocally(summaries: RecipeSummary[], query: RecipeQuery): RecipeSummary[] {
    let filtered = [...summaries];

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.title.toLowerCase().includes(searchLower)
      );
    }

    if (query.category) {
      filtered = filtered.filter(recipe => recipe.category === query.category);
    }

    if (query.favorites) {
      filtered = filtered.filter(recipe => recipe.is_favorite);
    }

    if (query.difficulty) {
      filtered = filtered.filter(recipe => recipe.difficulty === query.difficulty);
    }

    if (query.hasImages !== undefined) {
      filtered = filtered.filter(recipe => 
        query.hasImages ? recipe.image_count > 0 : recipe.image_count === 0
      );
    }

    // Apply sorting
    if (query.sortBy) {
      switch (query.sortBy) {
        case 'name_asc':
          filtered.sort((a, b) => a.title.localeCompare(b.title, 'he'));
          break;
        case 'name_desc':
          filtered.sort((a, b) => b.title.localeCompare(a.title, 'he'));
          break;
        case 'created_at_asc':
          filtered.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
          break;
        default:
          filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      }
    }

    return filtered;
  }

  // Client-side pagination for fallback mode
  private paginateLocally<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);
    
    return {
      recipes: paginatedItems,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: Math.ceil(items.length / limit),
        hasNext: offset + paginatedItems.length < items.length,
        hasPrev: page > 1
      }
    };
  }

  // Get fallback recipes from localStorage
  private getFallbackRecipes(): Recipe[] {
    try {
      const keys = ['fallback_recipes', 'hebrew-recipes'];
      for (const key of keys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(recipe => ({
              ...recipe,
              created_at: new Date(recipe.created_at),
              updated_at: new Date(recipe.updated_at)
            }));
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load fallback recipes:', error);
    }
    return [];
  }

  // Clear all caches
  clearCache(): void {
    enhancedCache.clear();
    console.log('All caches cleared');
  }

  // Get performance metrics
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  // Get cache statistics
  getCacheStats() {
    const enhancedStats = enhancedCache.getStats();
    const averageResponseTime = this.performanceMetrics.length > 0 
      ? Math.round(this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / this.performanceMetrics.length)
      : 0;
    const cacheHitRate = this.performanceMetrics.length > 0
      ? Math.round((this.performanceMetrics.filter(m => m.cacheHit).length / this.performanceMetrics.length) * 100)
      : 0;
    
    return {
      ...enhancedStats,
      averageResponseTime,
      cacheHitRate
    };
  }
}

// Export singleton instance
export const optimizedRecipeService = new OptimizedRecipeService();
