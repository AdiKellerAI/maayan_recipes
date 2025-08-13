import React, { useState, useRef, useEffect } from 'react';
import { Heart, Users, ChefHat, Images, Edit, Trash2, Share2, Eye } from 'lucide-react';
import { Recipe, ViewMode } from '../../types/recipe';
import { useRecipes } from '../../contexts/RecipeContext';
import { getCategoryColor } from '../../data/categories';
import { Link, useNavigate } from 'react-router-dom';
import { categories } from '../../data/categories';

// Category illustrations as emoji/unicode characters
const getCategoryIllustration = (categoryId: string) => {
  const illustrations = {
    salads: '🥗',
    soups: '🍲',
    meat: '🥩',
    vegetarian: '🥬',
    pastries: '🥐',
    cakes: '🎂',
    cookies: '🍪',
    desserts: '🍨',
    breakfast: '🥚',
    sides: '🫘'
  };
  return illustrations[categoryId as keyof typeof illustrations] || '🍽️';
};

interface RecipeCardProps {
  recipe: Recipe;
  viewMode: ViewMode;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  viewMode
}) => {
  const { toggleFavorite, deleteRecipe } = useRecipes();
  const navigate = useNavigate();
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Long press handler for mobile
  const handleTouchStart = () => {
    if (!isMobile) return;
    
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      setShowMobileOptions(true);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCardClick = () => {
    if (showMobileOptions) {
      setShowMobileOptions(false);
      setIsLongPress(false);
      return;
    }
    
    if (isLongPress) {
      setIsLongPress(false);
      return;
    }
    
    // Normal click - navigate to recipe
    navigate(`/recipe/${recipe.id}`);
  };

  const handleDelete = async () => {
    if (confirm('האם אתה בטוח שברצונך למחוק את המתכון הזה?')) {
      try {
        await deleteRecipe(recipe.id);
        setShowMobileOptions(false);
        setIsLongPress(false);
        // Don't navigate - let the user stay on the current page
        // The recipe will be removed from the list automatically
      } catch (error) {
        console.error('Failed to delete recipe:', error);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: `מתכון: ${recipe.title}`,
          url: window.location.origin + `/recipe/${recipe.id}`
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.origin + `/recipe/${recipe.id}`);
      alert('הקישור הועתק ללוח');
    }
    setShowMobileOptions(false);
    setIsLongPress(false);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Prevent double-clicks on mobile
    if (e.currentTarget.getAttribute('data-processing') === 'true') {
      return;
    }
    
    // Mark as processing
    e.currentTarget.setAttribute('data-processing', 'true');
    
    console.log('🔄 Toggling favorite for recipe:', recipe.id, 'Current state:', recipe.is_favorite);
    
    try {
      await toggleFavorite(recipe.id);
      console.log('✅ Favorite toggled successfully');
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      // Don't show alert to user, just log the error
    } finally {
      // Remove processing flag after a short delay
      setTimeout(() => {
        e.currentTarget.removeAttribute('data-processing');
      }, 300);
    }
  };

  const primaryImage = recipe.images && recipe.images.length > 0 ? recipe.images[0] : null;
  const imageCount = recipe.images ? recipe.images.length : 0;

  // List view (no images)
  if (viewMode === 'list') {
    return (
      <div 
        className="block"
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {recipe.title}
              </h3>
            </div>
            
            <div className="flex items-center space-x-3 rtl:space-x-reverse mr-4 rtl:ml-4 rtl:mr-0">
              <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(recipe.category)}`}>
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  <span className="text-sm">{getCategoryIllustration(recipe.category)}</span>
                  <span>{categories.find(c => c.id === recipe.category)?.name || recipe.category}</span>
                </div>
              </span>
              
              <button
                onClick={handleFavoriteClick}
                className="p-2 rounded-full hover:bg-gray-100 transition-all duration-200 heart-button transform hover:scale-110 active:scale-95"
              >
                <Heart
                  className={`h-5 w-5 transition-all duration-200 ${
                    recipe.is_favorite 
                      ? 'fill-red-500 text-red-500 scale-110' 
                      : 'text-gray-600 hover:text-red-400'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Options Overlay */}
        {showMobileOptions && isMobile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-center mb-4">{recipe.title}</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  <Eye className="h-5 w-5" />
                  <span>פתח מתכון</span>
                </button>
                <button
                  onClick={() => navigate(`/edit/${recipe.id}`)}
                  className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100"
                >
                  <Edit className="h-5 w-5" />
                  <span>ערוך מתכון</span>
                </button>
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                >
                  <Share2 className="h-5 w-5" />
                  <span>שתף מתכון</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>מחק מתכון</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileOptions(false);
                    setIsLongPress(false);
                  }}
                  className="w-full p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  if (viewMode === 'large') {
    return (
      <div 
        className="block h-full"
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden h-full flex flex-col">
        {primaryImage ? (
          <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
            <img
              src={primaryImage}
              alt={recipe.title}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
            {recipe.images && recipe.images.length > 1 && (
              <div className="absolute bottom-3 left-3 rtl:right-3 rtl:left-auto bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1 rtl:space-x-reverse">
                <Images className="h-3 w-3" />
                <span>{imageCount}</span>
              </div>
            )}
            <button
              onClick={handleFavoriteClick}
              className="absolute top-3 right-3 rtl:left-3 rtl:right-auto w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all duration-200 flex items-center justify-center heart-button transform hover:scale-110 active:scale-95"
            >
              <Heart
                className={`h-5 w-5 transition-all duration-200 ${
                  recipe.is_favorite 
                    ? 'fill-red-500 text-red-500 scale-110' 
                    : 'text-gray-600 hover:text-red-400'
                }`}
              />
            </button>
          </div>
        ) : (
          <div className={`relative h-48 sm:h-56 md:h-64 flex items-center justify-center ${getCategoryColor(recipe.category)}`}>
            <div className="text-8xl opacity-70">
              {getCategoryIllustration(recipe.category)}
            </div>
            <button
              onClick={handleFavoriteClick}
              className="absolute top-3 right-3 rtl:left-3 rtl:right-auto w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all duration-200 flex items-center justify-center heart-button transform hover:scale-110 active:scale-95"
            >
              <Heart
                className={`h-5 w-5 transition-all duration-200 ${
                  recipe.is_favorite 
                    ? 'fill-red-500 text-red-500 scale-110' 
                    : 'text-gray-600 hover:text-red-400'
                }`}
              />
            </button>
          </div>
        )}
        
        <div className="p-4 sm:p-6 flex-1 flex flex-col">
          <div className="flex-1 transform transition-transform duration-300 hover:scale-[1.02]">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2">
              {recipe.title}
            </h3>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
            <div className="flex items-center space-x-4">
              {/* Removed servings as it doesn't exist in Recipe type */}
            </div>
            
            <div className="flex items-center">
              <ChefHat className="h-4 w-4 mr-1" />
              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(recipe.category)}`}>
                {categories.find(c => c.id === recipe.category)?.name || recipe.category}
              </span>
            </div>
          </div>
        </div>
        </div>
        
        {/* Mobile Options Overlay */}
        {showMobileOptions && isMobile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-center mb-4">{recipe.title}</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  <Eye className="h-5 w-5" />
                  <span>פתח מתכון</span>
                </button>
                <button
                  onClick={() => navigate(`/edit/${recipe.id}`)}
                  className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100"
                >
                  <Edit className="h-5 w-5" />
                  <span>ערוך מתכון</span>
                </button>
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                >
                  <Share2 className="h-5 w-5" />
                  <span>שתף מתכון</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>מחק מתכון</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileOptions(false);
                    setIsLongPress(false);
                  }}
                  className="w-full p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Medium view
  return (
    <div 
      className="block h-full"
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden h-full flex flex-col transform hover:scale-[1.02] hover:-translate-y-1">
      {primaryImage ? (
        <div className="relative h-24 sm:h-28 md:h-32 overflow-hidden">
          <img
            src={primaryImage}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          {recipe.images && recipe.images.length > 1 && (
            <div className="absolute bottom-1 left-1 rtl:right-1 rtl:left-auto bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full text-xs flex items-center space-x-1 rtl:space-x-reverse">
              <Images className="h-2.5 w-2.5" />
              <span>{imageCount}</span>
            </div>
          )}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 rtl:left-2 rtl:right-auto w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all duration-200 flex items-center justify-center heart-button transform hover:scale-110 active:scale-95"
          >
            <Heart
              className={`h-4 w-4 transition-all duration-200 ${
                recipe.is_favorite 
                  ? 'fill-red-500 text-red-500 scale-110' 
                  : 'text-gray-600 hover:text-red-400'
              }`}
            />
          </button>
        </div>
      ) : (
        <div className={`relative h-24 sm:h-28 md:h-32 flex items-center justify-center ${getCategoryColor(recipe.category)}`}>
          <div className="text-5xl opacity-70">
            {getCategoryIllustration(recipe.category)}
          </div>
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 rtl:left-2 rtl:right-auto w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all duration-200 flex items-center justify-center heart-button transform hover:scale-110 active:scale-95"
          >
            <Heart
              className={`h-4 w-4 transition-all duration-200 ${
                recipe.is_favorite 
                  ? 'fill-red-500 text-red-500 scale-110' 
                  : 'text-gray-600 hover:text-red-400'
              }`}
            />
          </button>
        </div>
      )}
      
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 transform transition-transform duration-200 hover:scale-105">
          {recipe.title}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
          <div className="flex items-center space-x-2">
          </div>
          
          <span className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColor(recipe.category)}`}>
            {categories.find(c => c.id === recipe.category)?.name || recipe.category}
          </span>
        </div>
      </div>
      </div>
      
      {/* Mobile Options Overlay */}
      {showMobileOptions && isMobile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-center mb-4">{recipe.title}</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
              >
                <Eye className="h-5 w-5" />
                <span>פתח מתכון</span>
              </button>
              <button
                onClick={() => navigate(`/edit/${recipe.id}`)}
                className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100"
              >
                <Edit className="h-5 w-5" />
                <span>ערוך מתכון</span>
              </button>
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
              >
                <Share2 className="h-5 w-5" />
                <span>שתף מתכון</span>
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                <Trash2 className="h-5 w-5" />
                <span>מחק מתכון</span>
              </button>
              <button
                onClick={() => {
                  setShowMobileOptions(false);
                  setIsLongPress(false);
                }}
                className="w-full p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeCard;