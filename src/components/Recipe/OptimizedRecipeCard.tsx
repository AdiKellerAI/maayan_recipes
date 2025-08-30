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
        className={`flex items-center p-4 bg-white/80 backdrop-blur-sm border border-white/30 rounded-xl shadow-md hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer transform hover:scale-[1.01] hover:-translate-y-1 ${
          isHovered ? 'shadow-lg shadow-amber-500/20' : ''
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
            className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              isFavorite 
                ? 'text-rose-500 hover:text-rose-600 bg-rose-50' 
                : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50'
            }`}
          >
            <Heart className={`h-4 w-4 transition-all duration-300 ${isFavorite ? 'fill-current scale-110 drop-shadow-sm' : 'hover:scale-105'}`} />
          </button>
        </div>
      </div>
    );
  }

  // Card layout for medium and large views
  const isLarge = viewMode === 'large';
  const cardHeight = isLarge ? 'h-80' : 'h-64';
  const imageHeight = isLarge ? 'h-56 sm:h-64 md:h-72' : 'h-32 sm:h-36 md:h-40';

  return (
    <div
      className={`group bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 overflow-hidden transition-all duration-500 cursor-pointer ${cardHeight} transform hover:scale-[1.02] hover:-translate-y-2 before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 relative ${
        isHovered ? 'shadow-2xl shadow-amber-500/20' : ''
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className={`relative ${imageHeight} overflow-hidden ${isLarge ? 'rounded-t-2xl' : 'rounded-t-xl'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 via-transparent to-purple-600/20 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <LazyImage
          src={getImageUrl()}
          alt={recipe.title}
          className="w-full h-full group-hover:scale-110 group-hover:brightness-110 transition-all duration-500"
          fallback={
            <div className={`flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-white/50 to-transparent relative ${isLarge ? 'rounded-t-2xl' : 'rounded-t-xl'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-purple-600/10 rounded-t-xl"></div>
              <ImageIcon className={`${isLarge ? 'h-12 w-12' : 'h-8 w-8'} mb-2 relative z-10 filter drop-shadow-md`} />
              <span className="text-xs relative z-10">אין תמונה</span>
            </div>
          }
        />

        {/* Category badge - bottom left */}
        <div className={`absolute ${isLarge ? 'bottom-4 left-4' : 'bottom-2 left-2'} rtl:left-2 rtl:right-auto ${isLarge ? 'px-3 py-2' : 'px-2 py-1'} rounded-full text-xs font-medium shadow-lg z-20 backdrop-blur-md border border-white/30 bg-amber-500/80`}>
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
            <span className="text-xs">🍽️</span>
            <span className="text-xs text-black font-semibold">{recipe.category}</span>
          </div>
        </div>

        {/* Overlay with quick stats */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-500 flex items-end">
          <div className={`w-full p-${isLarge ? '4' : '3'} bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}>
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <span className="flex items-center bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20">
                  <Eye className="h-3 w-3 ml-1 rtl:mr-1 rtl:ml-0" />
                  {recipe.step_count} שלבים
                </span>
                <span className="bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20">{recipe.ingredient_count} מרכיבים</span>
              </div>
            </div>
          </div>
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute ${isLarge ? 'top-4 left-4' : 'top-3 left-3'} rtl:right-3 rtl:left-auto ${isLarge ? 'w-12 h-12' : 'w-10 h-10'} bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300 flex items-center justify-center border border-white/30 z-20 transform hover:scale-110 active:scale-95`}
        >
          <Heart className={`${isLarge ? 'h-6 w-6' : 'h-5 w-5'} transition-all duration-300 ${
            isFavorite 
              ? 'fill-rose-500 text-rose-500 scale-110 drop-shadow-sm' 
              : 'text-gray-600 hover:text-rose-400 hover:scale-105'
          }`} />
        </button>
      </div>

      {/* Elegant separator */}
      <div className="relative">
        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${isLarge ? 'via-amber-300/40' : 'via-amber-300/30'} to-transparent`}></div>
        <div className={`absolute inset-x-0 top-0 ${isLarge ? 'h-2 bg-gradient-to-b from-amber-50/30' : 'h-1 bg-gradient-to-b from-amber-50/20'} to-transparent`}></div>
      </div>

      {/* Content Section */}
      <div className={`${isLarge ? 'p-6' : 'p-3'} flex-grow flex flex-col justify-center relative min-h-0`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${isLarge ? 'from-gray-50/30 via-white/50 to-amber-50/20' : 'from-gray-50/20 via-white/30 to-amber-50/10'} ${isLarge ? 'rounded-b-2xl' : 'rounded-b-xl'}`}></div>
        <div className="relative z-10 flex flex-col justify-center">
          <h3 className={`font-semibold text-gray-900 text-center line-clamp-3 leading-relaxed tracking-wide ${
            isLarge ? 'text-xl' : 'text-sm'
          }`}>
            {recipe.title}
          </h3>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/30 relative z-10">
          <div className="flex items-center text-sm text-gray-500 space-x-3 rtl:space-x-reverse">
            {recipe.prep_time && (
              <span className="flex items-center bg-white/60 backdrop-blur-sm px-2 py-1 rounded-full border border-white/30">
                <Clock className="h-3 w-3 ml-1 rtl:mr-1 rtl:ml-0 text-amber-600" />
                <span className="text-xs font-medium">{recipe.prep_time}</span>
              </span>
            )}
            {recipe.difficulty && (
              <span className="flex items-center bg-white/60 backdrop-blur-sm px-2 py-1 rounded-full border border-white/30">
                <ChefHat className="h-3 w-3 ml-1 rtl:mr-1 rtl:ml-0 text-amber-600" />
                <span className="text-xs font-medium">{recipe.difficulty}</span>
              </span>
            )}
          </div>
          
          {recipe.image_count > 1 && (
            <span className="text-xs text-gray-500 bg-white/60 backdrop-blur-sm px-2 py-1 rounded-full border border-white/30 font-medium">
              +{recipe.image_count - 1} תמונות
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizedRecipeCard;
