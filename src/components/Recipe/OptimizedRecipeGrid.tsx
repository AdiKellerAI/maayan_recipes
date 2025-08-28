import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { optimizedRecipeService, RecipeSummary, RecipeQuery, PaginatedResponse } from '../../services/optimizedRecipeService';
import OptimizedRecipeCard from './OptimizedRecipeCard';

interface OptimizedRecipeGridProps {
  query: RecipeQuery;
  viewMode: 'large' | 'medium' | 'list';
  onRecipeClick?: (id: string) => void;
}

interface LoadingState {
  initial: boolean;
  loadingMore: boolean;
  error: string | null;
}

const OptimizedRecipeGrid: React.FC<OptimizedRecipeGridProps> = ({ 
  query, 
  viewMode, 
  onRecipeClick 
}) => {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    initial: true,
    loadingMore: false,
    error: null
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Refs for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  // Track if we should use infinite scroll or manual load more
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(true);

  // Load recipes function
  const loadRecipes = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(prev => ({ ...prev, initial: true, error: null }));
        setRecipes([]);
      } else {
        setLoading(prev => ({ ...prev, loadingMore: true }));
      }

      const limit = viewMode === 'large' ? 8 : viewMode === 'medium' ? 12 : 16;
      const response: PaginatedResponse<RecipeSummary> = await optimizedRecipeService.getRecipeSummaries({
        ...query,
        page,
        limit
      });

      if (append && page > 1) {
        setRecipes(prev => [...prev, ...response.recipes]);
      } else {
        setRecipes(response.recipes);
      }
      
      setPagination(response.pagination);
      setLoading(prev => ({ ...prev, initial: false, loadingMore: false, error: null }));
      
      if (!hasInitialized) {
        setHasInitialized(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load recipes';
      setLoading(prev => ({ 
        ...prev, 
        initial: false, 
        loadingMore: false, 
        error: errorMessage 
      }));
      console.error('Error loading recipes:', error);
    }
  }, [query, viewMode, hasInitialized]);

  // Load more recipes
  const loadMore = useCallback(() => {
    if (pagination.hasNext && !loading.loadingMore) {
      loadRecipes(pagination.page + 1, true);
    }
  }, [pagination.hasNext, pagination.page, loading.loadingMore, loadRecipes]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!useInfiniteScroll || !loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && pagination.hasNext && !loading.loadingMore) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [useInfiniteScroll, pagination.hasNext, loading.loadingMore, loadMore]);

  // Load initial data when query changes
  useEffect(() => {
    loadRecipes(1, false);
  }, [loadRecipes]);

  // Adjust infinite scroll based on device
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    setUseInfiniteScroll(!isMobile); // Disable infinite scroll on mobile for better performance
  }, []);

  const getGridClasses = () => {
    switch (viewMode) {
      case 'large':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
      case 'medium':
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 md:gap-4';
      case 'list':
        return 'space-y-3';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
    }
  };

  // Initial loading state
  if (loading.initial && recipes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">טוען מתכונים...</p>
          <p className="text-sm text-gray-400 mt-2">
            מיטב ביצועים עם טעינה חכמה
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (loading.error && recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">שגיאה בטעינת המתכונים</h3>
        <p className="text-gray-600 mb-4">{loading.error}</p>
        <button
          onClick={() => loadRecipes(1, false)}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  // Empty state
  if (!loading.initial && recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">🍽️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו מתכונים</h3>
        <p className="text-gray-600">נסה לחפש משהו אחר או שנה את הפילטרים</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance info */}
      {hasInitialized && (
        <div className="text-sm text-gray-500 text-center">
          מציג {recipes.length} מתוך {pagination.total} מתכונים
          {pagination.totalPages > 1 && (
            <span> • עמוד {pagination.page} מתוך {pagination.totalPages}</span>
          )}
        </div>
      )}

      {/* Recipe Grid */}
      <div className={`${getGridClasses()} animate-fadeIn`}>
        {recipes.map((recipe, index) => (
          <div 
            key={recipe.id} 
            className="animate-slideUp" 
            style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
          >
            <OptimizedRecipeCard 
              recipe={recipe} 
              viewMode={viewMode}
              onClick={() => onRecipeClick?.(recipe.id)}
            />
          </div>
        ))}
      </div>

      {/* Loading more indicator */}
      {loading.loadingMore && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">טוען מתכונים נוספים...</p>
          </div>
        </div>
      )}

      {/* Load more button (for mobile or when infinite scroll is disabled) */}
      {!useInfiniteScroll && pagination.hasNext && !loading.loadingMore && (
        <div className="text-center py-6">
          <button
            onClick={loadMore}
            className="inline-flex items-center px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
          >
            <span>טען עוד מתכונים</span>
            <ChevronDown className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
          </button>
        </div>
      )}

      {/* Infinite scroll trigger (invisible) */}
      {useInfiniteScroll && pagination.hasNext && (
        <div 
          ref={loadMoreRef} 
          className="h-10 flex items-center justify-center"
          aria-hidden="true"
        >
          {/* This div triggers infinite scroll when visible */}
        </div>
      )}

      {/* End indicator */}
      {!pagination.hasNext && recipes.length > 0 && (
        <div className="text-center py-6 border-t border-gray-200">
          <p className="text-gray-500 text-sm">
            זה הכל! הצגת כל {pagination.total} המתכונים
          </p>
        </div>
      )}
    </div>
  );
};

export default OptimizedRecipeGrid;
