import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, ChefHat, Share2, Edit, ArrowRight, ChevronLeft, ChevronRight, Trash2, X, RotateCcw, Check } from 'lucide-react';
import { useRecipes } from '../contexts/RecipeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useProtectedAction } from '../hooks/useProtectedAction';
import { categories } from '../data/categories';
import { getCategoryColor } from '../data/categories';
// ProgressTracker removed from main section; using inline compact layout
import { recipeProgressCache } from '../lib/cache';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

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

const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, toggleFavorite, deleteRecipe } = useRecipes();
  const { navigateToLastRecipesPage, setReferrerFromRecipes } = useNavigation();
  const { executeProtectedAction } = useProtectedAction();
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showImageModal, setShowImageModal] = React.useState(false);
  // Main directions current step
  const [mainCurrentStep, setMainCurrentStep] = React.useState(0);
  
  // Touch gesture states
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);
  
  // Scroll state for sticky navigation
  const [isScrolled, setIsScrolled] = React.useState(false);
  
  // Scroll to top when component mounts
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle scroll to show/hide compact navigation
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const recipe = recipes.find(r => r.id === id);
  const isFavorite = recipe ? recipe.is_favorite : false;
  const category = recipe ? categories.find(c => c.id === recipe.category) : null;
  const images = recipe?.images || [];
  const currentImage = images.length > 0 ? images[currentImageIndex] : null;

  // Pastel background schemes for additional sections
  const additionalColorSchemes = [
    {
      containerBg: 'from-rose-50/60 via-white to-pink-50/40',
      containerBorder: 'border-rose-300/70',
      subBg: 'from-rose-50/50 to-pink-50/30',
      subBorder: 'border-rose-200/30'
    },
    {
      containerBg: 'from-blue-50/60 via-white to-sky-50/40',
      containerBorder: 'border-blue-300/70',
      subBg: 'from-blue-50/50 to-sky-50/30',
      subBorder: 'border-blue-200/30'
    },
    {
      containerBg: 'from-emerald-50/60 via-white to-teal-50/40',
      containerBorder: 'border-emerald-300/70',
      subBg: 'from-emerald-50/50 to-teal-50/30',
      subBorder: 'border-emerald-200/30'
    },
    {
      containerBg: 'from-violet-50/60 via-white to-purple-50/40',
      containerBorder: 'border-violet-300/70',
      subBg: 'from-violet-50/50 to-purple-50/30',
      subBorder: 'border-violet-200/30'
    }
  ];

  // Track progress per additional section (for step marking)
  const [additionalSectionSteps, setAdditionalSectionSteps] = React.useState<{ [key: string]: number }>({});

  // Initialize additional section steps from recipe data and cache
  React.useEffect(() => {
    if (!recipe) return;
    const initial: { [key: string]: number } = {};
    if (recipe?.additional_sections) {
      Object.keys(recipe.additional_sections).forEach((name) => {
        initial[name] = 0;
      });
    }
    const cached = recipeProgressCache.loadProgress(recipe.id);
    const cachedAdd = cached?.additionalSteps || {};
    const merged: { [key: string]: number } = { ...initial };
    Object.keys(cachedAdd).forEach((name) => {
      if (name in merged) merged[name] = cachedAdd[name];
    });
    setAdditionalSectionSteps(merged);
  }, [recipe]);

  // Initialize main step from cache/recipe
  React.useEffect(() => {
    if (!recipe) return;
    const cached = recipeProgressCache.loadProgress(recipe.id);
    setMainCurrentStep(cached?.currentStep ?? (recipe.current_step || 0));
  }, [recipe]);

  const handleAdditionalSectionStepClick = (sectionName: string, stepIndex: number) => {
    if (!recipe) return;
    const current = additionalSectionSteps[sectionName] ?? 0;
    const newStep = stepIndex === current ? stepIndex + 1 : stepIndex;
    const newMap = { ...additionalSectionSteps, [sectionName]: newStep };
    setAdditionalSectionSteps(newMap);
    recipeProgressCache.saveProgress(recipe.id, mainCurrentStep, newMap);
  };

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🍽️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">מתכון לא נמצא</h2>
          <p className="text-gray-600 mb-4">המתכון שחיפשת לא קיים או הוסר</p>
          <Link to="/" className="text-amber-600 hover:text-amber-700">
            חזור לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  const handleStepClick = async (stepIndex: number) => {
    if (!recipe) return;
    const newStep = stepIndex === mainCurrentStep ? stepIndex + 1 : stepIndex;
    setMainCurrentStep(newStep);
    recipeProgressCache.saveProgress(recipe.id, newStep, additionalSectionSteps);
  };

  // No-op: additional sections handled separately below

  const resetProgress = async () => {
    if (!id) return;
    
    // Clear progress from cache
    recipeProgressCache.clearProgress(id);
    
    // Reset local steps
    if (recipe?.additional_sections) {
      const reset: { [key: string]: number } = {};
      Object.keys(recipe.additional_sections).forEach((name) => (reset[name] = 0));
      setAdditionalSectionSteps(reset);
    }
    setMainCurrentStep(0);
    console.log('Progress reset');
  };

  // Additional sections are rendered independently; no local step tracking here

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: recipe.title,
        text: `מתכון: ${recipe.title}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(`${recipe.title} - ${window.location.href}`);
    }
  };

  const handleDelete = async () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    executeProtectedAction(async () => {
      try {
        await deleteRecipe(recipe.id);
        // Close modal first
        setShowDeleteModal(false);
        
        // Add a small delay before navigation to ensure state updates are processed
        setTimeout(() => {
          const targetUrl = navigateToLastRecipesPage();
          navigate(targetUrl, { replace: true });
        }, 100);
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        setShowDeleteModal(false);
        // Navigate away even if deletion failed, since the UI might be in an inconsistent state
        setTimeout(() => {
          navigate(navigateToLastRecipesPage(), { replace: true });
        }, 100);
      }
    });
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleEdit = () => {
    // Set the current recipes page as referrer before navigating to edit
    setReferrerFromRecipes(navigateToLastRecipesPage());
    navigate(`/edit/${recipe.id}`);
  };

  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  // Touch gesture handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      nextImage(); // Swipe left = next image
    }
    if (isRightSwipe && images.length > 1) {
      prevImage(); // Swipe right = previous image
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Sticky Navigation Bar - Dynamic based on scroll */}
      <div className={`sticky top-16 z-[9990] bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-50/95 backdrop-blur-md border-b border-slate-200/50 transition-all duration-300 ${
        isScrolled ? 'shadow-lg' : ''
      }`}>
        <div className={`max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 transition-all duration-300 ${
          isScrolled ? 'py-2' : 'py-4'
        }`}>
          <div className="flex items-center justify-between">
            {/* Back Button - Always visible */}
            <button
              onClick={() => {
                // Always go back to the last recipes page, regardless of device
                navigate(navigateToLastRecipesPage());
              }}
              className={`group flex items-center space-x-2 rtl:space-x-reverse text-slate-600 hover:text-slate-900 transition-all duration-200 ${
                isScrolled ? 'space-x-1 rtl:space-x-reverse' : ''
              }`}
            >
              <div className={`rounded-xl bg-white/80 backdrop-blur-sm shadow-sm group-hover:shadow-md transition-all duration-200 border border-slate-200/50 ${
                isScrolled ? 'p-1.5' : 'p-2'
              }`}>
                <ArrowRight className={`${isScrolled ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </div>
              {!isScrolled && <span className="font-medium">חזור</span>}
            </button>
            
            {/* Action Buttons */}
            <div className={`flex items-center rtl:space-x-reverse transition-all duration-300 ${
              isScrolled ? 'space-x-1 sm:space-x-2' : 'space-x-2 sm:space-x-3'
            }`}>
              {/* Timer Button */}
              <button
                onClick={() => {
                  const timerEvent = new CustomEvent('showTimer', {
                    detail: { recipeName: recipe.title }
                  });
                  window.dispatchEvent(timerEvent);
                }}
                className={`rounded-xl bg-white/80 backdrop-blur-sm text-slate-600 hover:text-orange-600 hover:bg-orange-50/80 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/50 ${
                  isScrolled ? 'p-1.5' : 'p-2 sm:p-3'
                }`}
                title="טיימר בישול"
              >
                <span className={`${isScrolled ? 'text-sm' : 'text-base sm:text-lg'}`}>⏰</span>
              </button>

              {/* Reset Progress Button */}
              <button
                onClick={resetProgress}
                className={`rounded-xl bg-white/80 backdrop-blur-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/50 ${
                  isScrolled ? 'p-1.5' : 'p-2 sm:p-3'
                }`}
                title="איפוס התקדמות"
              >
                <RotateCcw className={`${isScrolled ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className={`rounded-xl bg-white/80 backdrop-blur-sm text-slate-600 hover:text-slate-900 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/50 ${
                  isScrolled ? 'p-1.5' : 'p-2 sm:p-3'
                }`}
                title="שיתוף מתכון"
              >
                <Share2 className={`${isScrolled ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
              </button>

              {/* Delete Button */}
              <button
                onClick={handleDelete}
                className={`rounded-xl bg-white/80 backdrop-blur-sm text-red-500 hover:text-red-600 hover:bg-red-50/80 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/50 ${
                  isScrolled ? 'p-1.5' : 'p-2 sm:p-3'
                }`}
                title="מחיקת מתכון"
              >
                <Trash2 className={`${isScrolled ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
              </button>

              {/* Edit Button */}
              <button
                onClick={handleEdit}
                className={`rounded-xl bg-white/80 backdrop-blur-sm text-slate-600 hover:text-slate-900 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/50 ${
                  isScrolled ? 'p-1.5' : 'p-2 sm:p-3'
                }`}
                title="עריכת מתכון"
              >
                <Edit className={`${isScrolled ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 py-6">

        {/* Recipe Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-slate-200/50">
          {/* Hero Image */}
          {currentImage ? (
          <>
          <div className="p-4 flex justify-center">
            <div 
              className="relative group cursor-pointer overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 w-full max-w-sm"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onClick={() => setShowImageModal(true)}
            >
              <img
                src={currentImage}
                alt={recipe.title}
                className="w-full h-auto object-cover rounded-xl group-hover:scale-[1.02] transition-transform duration-300"
              />
              
              {/* Subtle overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 rounded-xl"></div>
              
              {/* Image Navigation - subtle and minimal */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  
                  {/* Minimal indicators */}
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                        className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/60 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
              
              {/* Title overlay - bottom-right with readable pill */}
              <div className="absolute bottom-3 left-3 rtl:right-3 rtl:left-auto">
                <div className="max-w-[75vw]">
                  <span className="inline-block bg-black/30 text-white px-3 py-1.5 rounded-lg backdrop-blur-[2px] shadow-sm">
                    <span className="text-base md:text-lg font-semibold leading-tight break-words">{recipe.title}</span>
                  </span>
                </div>
              </div>

              {/* Favorite button - moved to top-right */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  executeProtectedAction(() => toggleFavorite(recipe.id));
                }}
                className={`absolute top-3 right-3 rtl:left-3 rtl:right-auto p-2 rounded-full shadow-sm transition-all duration-200 ${
                  isFavorite 
                    ? 'bg-red-50 text-red-500 hover:bg-red-100' 
                    : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
          </>
          ) : (
            <div className={`relative h-64 md:h-80 flex items-center justify-center ${getCategoryColor(recipe?.category || '')}`}>
              {category && (
                <div className="text-8xl md:text-9xl opacity-80 filter drop-shadow-lg -translate-y-8">
                  {getCategoryIllustration(recipe?.category || '')}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              {/* Title overlay for no-image state - bottom-left */}
              <div className="absolute bottom-3 left-3 rtl:right-3 rtl:left-auto">
                <div className="max-w-[75vw]">
                  <span className="inline-block bg-black/30 text-white px-3 py-1.5 rounded-lg backdrop-blur-[2px] shadow-sm">
                    <span className="text-xl md:text-2xl font-bold leading-tight break-words">{recipe?.title}</span>
                  </span>
                </div>
              </div>
              {/* Favorite button moved to top-right */}
              <button
                onClick={() => recipe && executeProtectedAction(() => toggleFavorite(recipe.id))}
                className={`absolute top-3 right-3 rtl:left-3 rtl:right-auto p-3 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg ring-1 ring-white/20 hover:scale-110 z-20 ${
                  isFavorite 
                    ? 'bg-red-100/90 text-red-500 hover:bg-red-100' 
                    : 'bg-white/30 text-white hover:bg-white/40 hover:text-red-400'
                }`}
              >
                <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          )}

          {/* Recipe Info */}
          <div className="p-3 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6 rtl:space-x-reverse">
                {category && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-lg">{getCategoryIllustration(recipe?.category || '')}</span>
                    <span className="text-sm font-medium text-slate-700">{category.name}</span>
                  </div>
                )}
                {recipe.difficulty && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <ChefHat className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">{recipe.difficulty}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main section compact like additional sections, desktop layout: ingredients right, directions left */}
            <div className="grid md:grid-cols-2 gap-3 md:gap-4">
              {/* Ingredients (right on desktop) */}
              <div className="order-1 md:order-1 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 px-2 py-4 md:px-3 rounded-2xl border border-amber-200/40 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-4">רכיבים</h2>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start space-x-3 rtl:space-x-reverse group">
                      <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center mt-0.5 shadow-sm">
                        <span className="text-xs font-bold text-white">{index + 1}</span>
                      </div>
                      <span className="text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Directions (left on desktop) with step marking preserved */}
              <div className="order-2 md:order-2 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 px-2 py-4 md:px-3 rounded-2xl border border-amber-200/40 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-4">הוראות הכנה</h2>
                <ol className="space-y-2">
                  {recipe.directions.map((direction, index) => {
                    const cached = recipeProgressCache.loadProgress(recipe.id);
                    const currentStep = cached?.currentStep ?? (recipe.current_step || 0);
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    return (
                      <li key={index} className="flex space-x-4 rtl:space-x-reverse group">
                        <button
                          onClick={() => handleStepClick(index)}
                          className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold transition-all duration-300 hover:scale-110 touch-manipulation shadow-sm ${
                            isCompleted
                              ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-200'
                              : isCurrent
                              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-orange-200 ring-2 ring-orange-200/50'
                              : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 hover:from-slate-200 hover:to-slate-300'
                          }`}
                          style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="text-xs">{index + 1}</span>
                          )}
                        </button>
                        <div
                          className={`flex-1 pt-1 cursor-pointer transition-all duration-200 ${
                            isCompleted
                              ? 'text-slate-500 line-through opacity-70'
                              : isCurrent
                              ? 'text-slate-900 font-medium bg-white/60 px-4 py-4 rounded-xl border border-amber-200/30'
                              : 'text-slate-700 hover:text-slate-900 px-4 py-4 hover:bg-white/40 rounded-xl transition-colors'
                          }`}
                          onClick={() => handleStepClick(index)}
                        >
                          <div className={`leading-relaxed text-base ${
                            direction.length <= 50 ? 'min-h-[36px] flex items-center' : 'min-h-[56px]'
                          }`}>
                            {direction}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
            {/* Additional Sections Title across full width */}
            {(recipe.additional_sections && Object.keys(recipe.additional_sections).length > 0) && (
              <div className="mt-12">
                {/* Enhanced separator with gradient line */}
                <div className="relative mb-6 mt-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <div className="bg-gradient-to-r from-white via-slate-50 to-white px-8 py-3 rounded-full shadow-md border border-slate-200/50 backdrop-blur-sm">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-2 h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-wide">חלקים נוספים</h2>
                        <div className="w-2 h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Render additional sections in two columns like main layout */}
                <div className="space-y-8">
                  {Object.entries(recipe.additional_sections || {}).map(([sectionName, section], idx) => {
                    const cs = additionalColorSchemes[idx % additionalColorSchemes.length];
                    return (
                    <div key={sectionName} className={`relative bg-gradient-to-br ${cs.containerBg} px-2 py-4 md:px-4 rounded-2xl border ${cs.containerBorder} shadow-sm`}>
                      {/* Section separator line for sections after the first */}
                      {idx > 0 && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-slate-300/40 to-transparent"></div>
                      )}
                      
                      {/* Enhanced section header */}
                      <div className="mb-2">
                        <div className="flex items-center justify-center">
                          <div className="bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200/30">
                            <h3 className="text-xl font-bold text-slate-900 tracking-wide">{sectionName}</h3>
                          </div>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                        {/* Ingredients Right (desktop) */}
                        <div className={`order-1 md:order-1 bg-gradient-to-br ${cs.subBg} px-2 py-4 md:px-3 rounded-xl border ${cs.subBorder}`}>
                          <h4 className="text-lg font-bold text-slate-800 mb-4">מרכיבים ל{sectionName}</h4>
                          <ul className="space-y-2">
                            {section.ingredients.map((ingredient, i) => (
                              <li key={i} className="flex items-start space-x-3 rtl:space-x-reverse">
                                <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center mt-0.5 shadow-sm">
                                  <span className="text-xs font-bold text-white">{i + 1}</span>
                                </div>
                                <span className="text-slate-700 leading-relaxed">{ingredient}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* Directions Left (desktop) */}
                        <div className={`order-2 md:order-2 bg-gradient-to-br ${cs.subBg} px-2 py-4 md:px-3 rounded-xl border ${cs.subBorder}`}>
                          <h4 className="text-lg font-bold text-slate-800 mb-4">הוראות הכנה ל{sectionName}</h4>
                          <ol className="space-y-2">
                            {section.directions.map((direction, i) => {
                              const isCompleted = i < (additionalSectionSteps[sectionName] ?? 0);
                              const isCurrent = i === (additionalSectionSteps[sectionName] ?? 0);
                              return (
                                <li key={i} className="flex space-x-4 rtl:space-x-reverse group">
                                  <button
                                    onClick={() => handleAdditionalSectionStepClick(sectionName, i)}
                                    className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold transition-all duration-300 hover:scale-110 touch-manipulation shadow-sm ${
                                      isCompleted
                                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-200'
                                        : isCurrent
                                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-orange-200 ring-2 ring-orange-200/50'
                                        : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 hover:from-slate-200 hover:to-slate-300'
                                    }`}
                                    style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
                                  >
                                    {isCompleted ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <span className="text-xs">{i + 1}</span>
                                    )}
                                  </button>
                                  <div className={`flex-1 pt-1 cursor-pointer transition-all duration-200 ${
                                      isCompleted
                                        ? 'text-slate-500 line-through opacity-70'
                                        : isCurrent
                                        ? 'text-slate-900 font-medium bg-white/60 px-4 py-4 rounded-xl border border-amber-200/30'
                                        : 'text-slate-700 hover:text-slate-900 px-4 py-4 hover:bg-white/40 rounded-xl transition-colors'
                                    }`}
                                    onClick={() => handleAdditionalSectionStepClick(sectionName, i)}
                                  >
                                    <div className={`leading-relaxed text-base ${
                                      direction.length <= 50 ? 'min-h-[36px] flex items-center' : 'min-h-[56px]'
                                    }`}>
                                      {direction}
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Image Modal for Full Size View */}
      {showImageModal && currentImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-2 sm:p-4 z-50"
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Image Container with Close Button */}
            <div className="relative">
              <img
                src={currentImage}
                alt={recipe.title}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              
              {/* Close Button - Positioned on the image */}
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-2 right-2 rtl:left-2 rtl:right-auto z-20 bg-black/80 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/90 transition-all duration-200 shadow-xl border border-white/30 hover:scale-110"
                title="סגור תמונה"
              >
                <X className="h-5 w-5 stroke-2" />
              </button>
            </div>
            
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-colors z-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 rtl:left-4 rtl:right-auto top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-colors z-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                
                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetailPage;