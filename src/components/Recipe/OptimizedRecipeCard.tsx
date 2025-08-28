import React, { useState, useRef, useEffect } from 'react';
import { Heart, Clock, ChefHat, Image as ImageIcon, Eye } from 'lucide-react';
import { RecipeSummary } from '../../services/optimizedRecipeService';

interface OptimizedRecipeCardProps {
  recipe: RecipeSummary;
  viewMode: 'large' | 'medium' | 'list';
  onClick?: () => void;
}

// Lazy loading hook for images
const useLazyLoading = (src: string | null, rootMargin: string = '50px') => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  return { isLoaded, isInView, imgRef, setIsLoaded };
};

// Optimized image component with lazy loading
const LazyImage: React.FC<{
  src: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}> = ({ src, alt, className, fallback }) => {
  const { isLoaded, isInView, imgRef, setIsLoaded } = useLazyLoading(src);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  if (!src || hasError) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        {fallback || <ImageIcon className="h-8 w-8 text-gray-400" />}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
        </div>
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
};

// Performance-optimized recipe card
const OptimizedRecipeCard: React.FC<OptimizedRecipeCardProps> = ({ 
  recipe, 
  viewMode, 
  onClick 
}) => {
  const [isFavorite, setIsFavorite] = useState(recipe.is_favorite);
  const [isHovered, setIsHovered] = useState(false);

  // Optimistic favorite toggle
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    
    // TODO: Integrate with optimized recipe service
    // await optimizedRecipeService.toggleFavorite(recipe.id, !isFavorite);
  };

  // Get image URL from first_image
  const getImageUrl = () => {
    if (!recipe.first_image) return null;
    
    if (typeof recipe.first_image === 'string') {
      return recipe.first_image;
    }
    
    if (recipe.first_image.url) {
      return recipe.first_image.url;
    }
    
    return null;
  };

  // Render different layouts based on view mode
  if (viewMode === 'list') {
    return (
      <div
        className={`flex items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer ${
          isHovered ? 'scale-[1.01]' : ''
        }`}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image */}
        <div className="flex-shrink-0 w-16 h-16 ml-4 rtl:mr-4 rtl:ml-0">
          <LazyImage
            src={getImageUrl()}
            alt={recipe.title}
            className="w-full h-full rounded-lg"
          />
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-right">
            {recipe.title}
          </h3>
          <div className="flex items-center text-sm text-gray-500 mt-1 justify-end">
            {recipe.prep_time && (
              <span className="flex items-center ml-4 rtl:mr-4 rtl:ml-0">
                <Clock className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0" />
                {recipe.prep_time}
              </span>
            )}
            {recipe.difficulty && (
              <span className="flex items-center ml-4 rtl:mr-4 rtl:ml-0">
                <ChefHat className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0" />
                {recipe.difficulty}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <button
            onClick={handleFavoriteClick}
            className={`p-2 rounded-full transition-colors ${
              isFavorite 
                ? 'text-red-500 hover:text-red-600' 
                : 'text-gray-400 hover:text-red-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // Card layout for medium and large views
  const isLarge = viewMode === 'large';
  const cardHeight = isLarge ? 'h-80' : 'h-64';
  const imageHeight = isLarge ? 'h-48' : 'h-32';

  return (
    <div
      className={`group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer ${cardHeight} ${
        isHovered ? 'scale-[1.02] shadow-xl' : ''
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className={`relative ${imageHeight} overflow-hidden`}>
        <LazyImage
          src={getImageUrl()}
          alt={recipe.title}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
          fallback={
            <div className="flex flex-col items-center justify-center text-gray-400">
              <ImageIcon className="h-8 w-8 mb-2" />
              <span className="text-xs">אין תמונה</span>
            </div>
          }
        />

        {/* Overlay with quick stats */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-end">
          <div className="w-full p-3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <span className="flex items-center">
                  <Eye className="h-3 w-3 ml-1 rtl:mr-1 rtl:ml-0" />
                  {recipe.step_count} שלבים
                </span>
                <span>{recipe.ingredient_count} מרכיבים</span>
              </div>
            </div>
          </div>
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 left-3 rtl:right-3 rtl:left-auto p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${
            isFavorite 
              ? 'bg-red-500 text-white shadow-lg' 
              : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <h3 className={`font-semibold text-gray-900 text-right line-clamp-2 ${
            isLarge ? 'text-lg' : 'text-base'
          }`}>
            {recipe.title}
          </h3>
          
          <div className="flex items-center justify-between mt-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              recipe.category === 'עוגות' ? 'bg-pink-100 text-pink-700' :
              recipe.category === 'סלטים' ? 'bg-green-100 text-green-700' :
              recipe.category === 'מנות עיקריות' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {recipe.category}
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-500 space-x-3 rtl:space-x-reverse">
            {recipe.prep_time && (
              <span className="flex items-center">
                <Clock className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0" />
                {recipe.prep_time}
              </span>
            )}
            {recipe.difficulty && (
              <span className="flex items-center">
                <ChefHat className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0" />
                {recipe.difficulty}
              </span>
            )}
          </div>
          
          {recipe.image_count > 1 && (
            <span className="text-xs text-gray-400">
              +{recipe.image_count - 1} תמונות
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizedRecipeCard;
