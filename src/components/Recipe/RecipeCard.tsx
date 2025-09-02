import React, { useState, useRef, useEffect } from 'react';
import { Heart, Images, Edit, Trash2, Share2, Check } from 'lucide-react';
import { Recipe, ViewMode } from '../../types/recipe';
import { useRecipes } from '../../contexts/RecipeContext';
import { useProtectedAction } from '../../hooks/useProtectedAction';
import { getCategoryColor } from '../../data/categories';
import { useNavigate } from 'react-router-dom';
import { categories } from '../../data/categories';
import { useNavigation } from '../../contexts/NavigationContext';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import { getRecipeShareUrl } from '../../utils/sharing';
import { getImageDisplayUrl, analyzeImageUrl } from '../../utils/imageUtils';

// Category illustrations as emoji/unicode characters
const getCategoryIllustration = (categoryId: string) => {
  const illustrations = {
    salads: '🥗',
    soups: '🍲',
    meat: '🥩',
    vegetarian: '🥬',
    pastries: '🍞',
    cakes: '🎂',
    cookies: '🍪',
    desserts: '🍨',
    breakfast: '🥚',
    sides: '🫘',
    pies: '🥧',
    sauces: '🥣',
    healthy: '🥑',
    drinks: '🥤'
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
  const { 
    toggleFavorite, 
    deleteRecipe, 
    activeRecipeId, 
    handleRecipeClick, 
    handleLongPress 
  } = useRecipes();
  const { executeProtectedAction } = useProtectedAction();
  const navigate = useNavigate();
  const { navigateToLastRecipesPage } = useNavigation();
  const [showDesktopOptions, setShowDesktopOptions] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareFeedback, setShowShareFeedback] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  // Better mobile detection - check for touch support instead of screen width
  const [isMobile, setIsMobile] = useState(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });
  
  useEffect(() => {
    // Update mobile detection based on touch support
    const checkTouch = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    
    // Listen for resize events to recheck if needed
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Long press handler for mobile (works for all view modes)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    // Prevent text selection and context menu
    e.preventDefault();
    
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      handleLongPress(recipe.id);
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

  // Prevent context menu on long press
  const handleContextMenu = (e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault();
    }
  };

  // Desktop hover handlers
  const handleMouseEnter = () => {
    if (!isMobile) {
      setShowDesktopOptions(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setShowDesktopOptions(false);
    }
  };

  const handleCardClick = () => {
    if (isLongPress) {
      setIsLongPress(false);
      return;
    }
    
    const hasActiveIcons = activeRecipeId === recipe.id;
    const clickResult = handleRecipeClick(recipe.id, hasActiveIcons);
    
    switch (clickResult) {
      case 'navigate':
        navigate(`/recipe/${recipe.id}`);
        break;
      case 'hide':
        // Icons already hidden by context
        break;
      case 'ignore':
        // Do nothing - just hide other recipe's icons
        break;
    }
  };

  const handleOptionClick = (action: 'edit' | 'share' | 'delete') => {
    setShowDesktopOptions(false);
    setIsLongPress(false);
    
    switch (action) {
      case 'edit':
        executeProtectedAction(() => navigate(`/edit/${recipe.id}`));
        break;
      case 'share':
        handleShare();
        break;
      case 'delete':
        handleDelete();
        break;
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    executeProtectedAction(async () => {
      try {
        await deleteRecipe(recipe.id);
        setShowDeleteModal(false);
        
        // Navigate to the last recipes page after successful deletion
        setTimeout(() => {
          const targetUrl = navigateToLastRecipesPage();
          navigate(targetUrl, { replace: true });
          console.log('✅ Recipe deleted successfully, navigating to:', targetUrl);
        }, 100);
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        setShowDeleteModal(false);
        // Navigate even if deletion failed to ensure consistent UX
        setTimeout(() => {
          const targetUrl = navigateToLastRecipesPage();
          navigate(targetUrl, { replace: true });
        }, 100);
      }
    });
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    // Reset any active states to prevent unwanted navigation
    setIsLongPress(false);
    setShowDesktopOptions(false);
    // Clear any pending long press timers
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleShare = async () => {
    const shareUrl = getRecipeShareUrl(recipe.id);
    
    console.log('🔍 RECIPE CARD SHARE DEBUG:');
    console.log('  - Recipe ID:', recipe.id);
    console.log('  - Share URL:', shareUrl);
    console.log('  - Navigator.share available:', !!navigator.share);
    console.log('  - User agent:', navigator.userAgent);

    if (navigator.share) {
      try {
        console.log('🔍 Using native share API');
        await navigator.share({
          title: recipe.title,
          text: `מתכון: ${recipe.title}`,
          url: shareUrl
        });
        console.log('🔍 Native share completed successfully');
      } catch (error) {
        console.log('🔍 Native share error:', error);
        // If native share fails, fall back to clipboard
        console.log('🔍 Falling back to clipboard after native share failure');
        try {
          await navigator.clipboard.writeText(shareUrl);
          setShowShareFeedback(true);
          setTimeout(() => setShowShareFeedback(false), 3000); // Longer feedback for mobile
          console.log('🔍 Clipboard fallback successful');
        } catch (clipboardError) {
          console.error('🔍 Clipboard fallback also failed:', clipboardError);
          // Final fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setShowShareFeedback(true);
          setTimeout(() => setShowShareFeedback(false), 3000); // Longer feedback for mobile
          console.log('🔍 Final fallback method used');
        }
      }
    } else {
      console.log('🔍 Using clipboard fallback');
      // Desktop fallback - copy to clipboard with feedback
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShowShareFeedback(true);
        setTimeout(() => setShowShareFeedback(false), 3000); // Longer feedback for mobile
        console.log('🔍 Clipboard copy successful');
      } catch (error) {
        console.error('🔍 Clipboard copy failed:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setShowShareFeedback(true);
        setTimeout(() => setShowShareFeedback(false), 3000); // Longer feedback for mobile
        console.log('🔍 Fallback copy method used');
      }
    }
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
      await executeProtectedAction(() => toggleFavorite(recipe.id));
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

  const primaryImage = recipe.images && recipe.images.length > 0 ? getImageDisplayUrl(recipe.images[0], recipe.title) : null;
  const imageCount = recipe.images ? recipe.images.length : 0;



  // List view (no images) - Refined with smaller fonts and compact design
  if (viewMode === 'list') {
    return (
      <div 
        className="block select-none"
        data-recipe-id={recipe.id}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
      >
        <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer p-2.5 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 leading-tight">
                {recipe.title}
              </h3>
            </div>
            
            <div className="flex items-center space-x-2 rtl:space-x-reverse ml-3 rtl:mr-3 rtl:ml-0">
              {/* Action buttons - shown to the right of category on hover/long press */}
              {((isMobile && activeRecipeId === recipe.id) || (!isMobile && showDesktopOptions)) && (
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionClick('edit');
                    }}
                    className="w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-all duration-200 flex-shrink-0"
                    style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
                    title="ערוך מתכון"
                  >
                    <Edit className="h-3.5 w-3.5 flex-shrink-0" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOptionClick('share');
                      }}
                      className="w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-all duration-200 flex-shrink-0"
                      style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
                      title="שתף מתכון"
                    >
                      <Share2 className="h-3.5 w-3.5 flex-shrink-0" />
                    </button>
                    
                    {/* Copy feedback tooltip */}
                    {showShareFeedback && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-green-500 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 animate-fadeIn">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Check className="h-2.5 w-2.5" />
                          <span>הועתק!</span>
                        </div>
                        {/* Arrow pointing down */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-green-500"></div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionClick('delete');
                    }}
                    className="w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200 flex-shrink-0"
                    style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
                    title="מחק מתכון"
                  >
                    <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                  </button>
                </div>
              )}
              
              <span className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColor(recipe.category)}`}>
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  <span className="text-xs">{getCategoryIllustration(recipe.category)}</span>
                  <span className="text-xs font-medium">{categories.find(c => c.id === recipe.category)?.name || recipe.category}</span>
                </div>
              </span>
              
              {/* Heart icon - always visible, in the rightmost position */}
              <button
                onClick={handleFavoriteClick}
                className="w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-200 heart-button transform hover:scale-110 active:scale-95 flex-shrink-0"
                style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
              >
                <Heart
                  className={`h-4 w-4 flex-shrink-0 transition-all duration-200 ${
                    recipe.is_favorite 
                      ? 'fill-red-500 text-red-500 scale-110' 
                      : 'text-gray-600 hover:text-red-400'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        

      </div>
    );
  }
  if (viewMode === 'large') {
    return (
      <div 
        className="block h-full select-none touch-manipulation"
        data-recipe-id={recipe.id}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
      >
        <div className="group bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 cursor-pointer overflow-hidden h-full flex flex-col transform hover:scale-[1.02] hover:-translate-y-2 before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 relative">
        {primaryImage ? (
          <div className="relative h-56 sm:h-64 md:h-72 overflow-hidden rounded-t-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 via-transparent to-purple-600/20 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <img
              src={primaryImage}
              alt={recipe.title}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
            />
            {/* Category badge - bottom left */}
            <div className={`absolute bottom-4 left-4 rtl:left-4 rtl:right-auto px-3 py-2 rounded-full text-xs font-medium shadow-lg z-20 backdrop-blur-md border border-white/30 ${getCategoryColor(recipe.category)} bg-opacity-80`}>
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <span className="text-sm">{getCategoryIllustration(recipe.category)}</span>
                <span className="text-black font-semibold">{categories.find(c => c.id === recipe.category)?.name || recipe.category}</span>
              </div>
            </div>

            {recipe.images && recipe.images.length > 1 && (
              <div className="absolute bottom-4 right-4 rtl:left-4 rtl:right-auto bg-black/40 backdrop-blur-md text-white px-3 py-2 rounded-full text-xs flex items-center space-x-1 rtl:space-x-reverse border border-white/20 shadow-lg z-20">
                <Images className="h-3.5 w-3.5" />
                <span className="font-medium">{imageCount}</span>
              </div>
            )}
            
            {/* Desktop hover options (top right) */}
            {!isMobile && showDesktopOptions && (
              <div className="absolute top-3 right-3 rtl:left-3 rtl:right-auto flex items-center space-x-2 rtl:space-x-reverse z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('edit');
                  }}
                  className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="ערוך מתכון"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('share');
                  }}
                  className="bg-green-50 text-green-600 hover:bg-green-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="שתף מתכון"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('delete');
                  }}
                  className="bg-red-50 text-red-600 hover:bg-red-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="מחק מתכון"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {/* Heart icon (top left) */}
            <button
              onClick={handleFavoriteClick}
              className="absolute top-4 left-4 rtl:right-4 rtl:left-auto w-12 h-12 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300 flex items-center justify-center heart-button transform hover:scale-110 active:scale-95 border border-white/30 z-20"
            >
              <Heart
                className={`h-6 w-6 transition-all duration-300 ${
                  recipe.is_favorite 
                    ? 'fill-rose-500 text-rose-500 scale-110 drop-shadow-sm' 
                    : 'text-gray-600 hover:text-rose-400 hover:scale-105'
                }`}
              />
            </button>

            {/* Mobile/Desktop options - 3 buttons like medium view */}
            {((isMobile && activeRecipeId === recipe.id) || (!isMobile && showDesktopOptions)) && (
              <div className="absolute top-3 right-3 rtl:left-3 rtl:right-auto flex items-center space-x-2 rtl:space-x-reverse z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('edit');
                  }}
                  className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="ערוך מתכון"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('share');
                  }}
                  className="bg-green-50 text-green-600 hover:bg-green-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="שתף מתכון"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('delete');
                  }}
                  className="bg-red-50 text-red-600 hover:bg-red-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="מחק מתכון"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        ) : (
                  <div className={`relative h-56 sm:h-64 md:h-72 flex items-center justify-center rounded-t-2xl ${getCategoryColor(recipe.category)} bg-gradient-to-br from-white/50 to-transparent`}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-purple-600/10 rounded-t-2xl"></div>
          <div className="text-9xl opacity-80 filter drop-shadow-lg relative z-10 -translate-y-4">
            {getCategoryIllustration(recipe.category)}
          </div>
            
            {/* Category badge - bottom left */}
            <div className={`absolute bottom-4 left-4 rtl:left-4 rtl:right-auto px-3 py-2 rounded-full text-xs font-medium shadow-lg z-20 backdrop-blur-md border border-white/30 ${getCategoryColor(recipe.category)} bg-opacity-90`}>
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <span className="text-sm">{getCategoryIllustration(recipe.category)}</span>
                <span className="text-black font-semibold">{categories.find(c => c.id === recipe.category)?.name || recipe.category}</span>
              </div>
            </div>
            {/* Desktop hover options (top right) */}
            {!isMobile && showDesktopOptions && (
              <div className="absolute top-3 right-3 rtl:left-3 rtl:right-auto flex items-center space-x-2 rtl:space-x-reverse z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('edit');
                  }}
                  className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="ערוך מתכון"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('share');
                  }}
                  className="bg-green-50 text-green-600 hover:bg-green-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="שתף מתכון"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('delete');
                  }}
                  className="bg-red-50 text-red-600 hover:bg-red-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="מחק מתכון"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {/* Heart icon (top left) */}
            <button
              onClick={handleFavoriteClick}
              className="absolute top-3 left-3 rtl:right-3 rtl:left-auto w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all duration-200 flex items-center justify-center heart-button transform hover:scale-110 active:scale-95 z-20"
            >
              <Heart
                className={`h-5 w-5 transition-all duration-200 ${
                  recipe.is_favorite 
                    ? 'fill-red-500 text-red-500 scale-110' 
                    : 'text-gray-600 hover:text-red-400'
                }`}
              />
            </button>
            
            {/* Mobile/Desktop options - 3 buttons like medium view */}
            {((isMobile && activeRecipeId === recipe.id) || (!isMobile && showDesktopOptions)) && (
              <div className="absolute top-3 right-3 rtl:left-3 rtl:right-auto flex items-center space-x-2 rtl:space-x-reverse z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('edit');
                  }}
                  className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="ערוך מתכון"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('share');
                  }}
                  className="bg-green-50 text-green-600 hover:bg-green-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="שתף מתכון"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick('delete');
                  }}
                  className="bg-red-50 text-red-600 hover:bg-red-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                  title="מחק מתכון"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Elegant separator */}
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-amber-50/30 to-transparent"></div>
        </div>
        
        <div className="p-6 flex-1 flex flex-col relative min-h-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50/30 via-white/50 to-amber-50/20 rounded-b-2xl"></div>
          <div className="flex-1 relative z-10 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-3 leading-relaxed tracking-wide text-center">
              {recipe.title}
            </h3>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Medium view
  return (
    <div 
      className="block h-full select-none touch-manipulation"
      data-recipe-id={recipe.id}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
    >
      <div className="group bg-white/85 backdrop-blur-sm border border-white/30 rounded-xl shadow-md hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-400 cursor-pointer overflow-hidden h-full flex flex-col transform hover:scale-[1.03] hover:-translate-y-2 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-400 relative">
      {primaryImage ? (
        <div className="relative h-32 sm:h-36 md:h-40 overflow-hidden rounded-t-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/15 via-transparent to-purple-600/15 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-400"></div>
          <img
            src={primaryImage}
            alt={recipe.title}
            className="w-full h-full object-cover transition-all duration-400 group-hover:scale-105 group-hover:brightness-105"
          />
          {/* Category badge - bottom left */}
          <div className={`absolute bottom-2 left-2 rtl:left-2 rtl:right-auto px-2 py-1 rounded-full text-xs font-medium shadow-md z-20 backdrop-blur-md border border-white/30 ${getCategoryColor(recipe.category)} bg-opacity-80`}>
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
              <span className="text-xs">{getCategoryIllustration(recipe.category)}</span>
              <span className="text-xs text-black font-semibold">{categories.find(c => c.id === recipe.category)?.name || recipe.category}</span>
            </div>
          </div>

          {recipe.images && recipe.images.length > 1 && (
            <div className="absolute bottom-2 right-2 rtl:left-2 rtl:right-auto bg-black/40 backdrop-blur-md text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1 rtl:space-x-reverse border border-white/20 shadow-md z-20">
              <Images className="h-3 w-3" />
              <span className="font-medium">{imageCount}</span>
            </div>
          )}
          
          {/* Desktop hover options (top right) */}
          {!isMobile && showDesktopOptions && (
            <div className="absolute top-2 right-2 rtl:left-2 rtl:right-auto flex items-center space-x-1 rtl:space-x-reverse z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('edit');
                }}
                className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="ערוך מתכון"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('share');
                }}
                className="bg-green-50 text-green-600 hover:bg-green-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="שתף מתכון"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('delete');
                }}
                className="bg-red-50 text-red-600 hover:bg-red-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="מחק מתכון"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          
          {/* Heart icon (top left) */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 left-2 rtl:right-2 rtl:left-auto w-9 h-9 bg-white/90 backdrop-blur-md rounded-full shadow-md hover:shadow-lg hover:bg-white transition-all duration-300 flex items-center justify-center heart-button transform hover:scale-110 active:scale-95 border border-white/30 z-20"
          >
            <Heart
              className={`h-4 w-4 transition-all duration-300 ${
                recipe.is_favorite 
                  ? 'fill-rose-500 text-rose-500 scale-110 drop-shadow-sm' 
                  : 'text-gray-600 hover:text-rose-400 hover:scale-105'
              }`}
            />
          </button>
          
          {/* Mobile/Desktop options */}
          {((isMobile && activeRecipeId === recipe.id) || (!isMobile && showDesktopOptions)) && (
            <div className="absolute top-2 right-2 rtl:left-2 rtl:right-auto flex items-center space-x-1 rtl:space-x-reverse z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('edit');
                }}
                className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="ערוך מתכון"
              >
                <Edit className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('share');
                }}
                className="bg-green-50 text-green-600 hover:bg-green-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="שתף מתכון"
              >
                <Share2 className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('delete');
                }}
                className="bg-red-50 text-red-600 hover:bg-red-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="מחק מתכון"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`relative h-32 sm:h-36 md:h-40 flex items-center justify-center rounded-t-xl ${getCategoryColor(recipe.category)} bg-gradient-to-br from-white/40 to-transparent`}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-purple-600/10 rounded-t-xl"></div>
          <div className="text-6xl opacity-75 filter drop-shadow-md relative z-10 -translate-y-3">
            {getCategoryIllustration(recipe.category)}
          </div>
          
          {/* Category badge - bottom left */}
          <div className={`absolute bottom-2 left-2 rtl:left-2 rtl:right-auto px-2 py-1 rounded-full text-xs font-medium shadow-md z-20 backdrop-blur-md border border-white/30 ${getCategoryColor(recipe.category)} bg-opacity-90`}>
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
              <span className="text-xs">{getCategoryIllustration(recipe.category)}</span>
              <span className="text-xs text-black font-semibold">{categories.find(c => c.id === recipe.category)?.name || recipe.category}</span>
            </div>
          </div>
          {/* Desktop hover options (top right) */}
          {!isMobile && showDesktopOptions && (
            <div className="absolute top-2 right-2 rtl:left-2 rtl:right-auto flex items-center space-x-1 rtl:space-x-reverse">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('edit');
                }}
                className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="ערוך מתכון"
              >
                <Edit className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('share');
                }}
                className="bg-green-50 text-green-600 hover:bg-green-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="שתף מתכון"
              >
                <Share2 className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('delete');
                }}
                className="bg-red-50 text-red-600 hover:bg-red-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="מחק מתכון"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {/* Heart icon (top left) */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 left-2 rtl:right-2 rtl:left-auto w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all duration-200 flex items-center justify-center heart-button transform hover:scale-110 active:scale-95 z-20"
          >
            <Heart
              className={`h-4 w-4 transition-all duration-200 ${
                recipe.is_favorite 
                  ? 'fill-red-500 text-red-500 scale-110' 
                  : 'text-gray-600 hover:text-red-400'
              }`}
            />
          </button>
          
          {/* Mobile/Desktop options */}
          {((isMobile && activeRecipeId === recipe.id) || (!isMobile && showDesktopOptions)) && (
            <div className="absolute top-2 right-2 rtl:left-2 rtl:right-auto flex items-center space-x-1 rtl:space-x-reverse z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('edit');
                }}
                className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="ערוך מתכון"
              >
                <Edit className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('share');
                }}
                className="bg-green-50 text-green-600 hover:bg-green-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="שתף מתכון"
              >
                <Share2 className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionClick('delete');
                }}
                className="bg-red-50 text-red-600 hover:bg-red-100 rounded-full shadow-md transition-all duration-200 flex items-center justify-center flex-shrink-0"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                title="מחק מתכון"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Elegant separator */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent"></div>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-amber-50/20 to-transparent"></div>
      </div>
      
      <div className="p-3 flex-1 flex flex-col relative min-h-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/20 via-white/30 to-amber-50/10 rounded-b-xl"></div>
        <div className="flex-1 relative z-10 flex flex-col justify-center">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-relaxed text-center">
            {recipe.title}
          </h3>
        </div>
      </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

    </div>
  );
};

export default RecipeCard;