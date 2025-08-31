import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, ChefHat, Share2, Edit, ArrowRight, ChevronLeft, ChevronRight, Trash2, X, RotateCcw } from 'lucide-react';
import { useRecipes } from '../contexts/RecipeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useProtectedAction } from '../hooks/useProtectedAction';
import { categories } from '../data/categories';
import { getCategoryColor } from '../data/categories';
import ProgressTracker from '../components/Recipe/ProgressTracker';
import { recipeProgressCache } from '../lib/cache';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

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
  const [additionalCurrentSteps, setAdditionalCurrentSteps] = React.useState<{ [key: string]: number }>({});
  const [progressTrackerKey, setProgressTrackerKey] = React.useState(0);
  
  // Touch gesture states
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);
  
  // Scroll to top when component mounts
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const recipe = recipes.find(r => r.id === id);
  const isFavorite = recipe ? recipe.is_favorite : false;
  const category = recipe ? categories.find(c => c.id === recipe.category) : null;
  const images = recipe?.images || [];
  const currentImage = images.length > 0 ? images[currentImageIndex] : null;

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
    // For now, don't update database - just handle locally
    console.log('Step clicked:', stepIndex);
  };

  const handleAdditionalStepClick = (sectionName: string, stepIndex: number) => {
    setAdditionalCurrentSteps(prev => ({
      ...prev,
      [sectionName]: stepIndex === prev[sectionName] ? stepIndex + 1 : stepIndex
    }));
  };

  const resetProgress = async () => {
    if (!id) return;
    
    // Clear progress from cache
    recipeProgressCache.clearProgress(id);
    
    // Reset local state
    setAdditionalCurrentSteps(prev => {
      const reset: { [key: string]: number } = {};
      Object.keys(prev).forEach(key => {
        reset[key] = 0;
      });
      return reset;
    });
    
    // Force re-render of ProgressTracker by updating its key
    setProgressTrackerKey(prev => prev + 1);
    console.log('Progress reset');
  };

  // Initialize additional steps from recipe data
  React.useEffect(() => {
    // Initialize additional steps for both legacy additional_instructions and new additional_sections
    const initialSteps: { [key: string]: number } = {};
    
    if (recipe?.additional_instructions) {
      Object.keys(recipe.additional_instructions).forEach(sectionName => {
        initialSteps[sectionName] = 0;
      });
    }
    
    if (recipe?.additional_sections) {
      Object.keys(recipe.additional_sections).forEach(sectionName => {
        initialSteps[sectionName] = 0;
      });
    }
    
    if (Object.keys(initialSteps).length > 0) {
      setAdditionalCurrentSteps(initialSteps);
    }
  }, [recipe]);

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
      <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 py-6">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(navigateToLastRecipesPage())}
            className="group flex items-center space-x-2 rtl:space-x-reverse text-slate-600 hover:text-slate-900 transition-all duration-200"
          >
            <div className="p-2 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm group-hover:shadow-md transition-all duration-200 border border-slate-200/50">
              <ArrowRight className="h-5 w-5" />
            </div>
            <span className="font-medium">חזור</span>
          </button>
          
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={() => {
                const timerEvent = new CustomEvent('showTimer', {
                  detail: { recipeName: recipe.title }
                });
                window.dispatchEvent(timerEvent);
              }}
              className="p-3 rounded-xl bg-white/80 backdrop-blur-sm text-slate-600 hover:text-orange-600 hover:bg-orange-50/80 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/50"
              title="טיימר בישול"
            >
              <span className="text-lg">⏰</span>
            </button>
            <button
              onClick={resetProgress}
              className="p-3 rounded-xl bg-white/80 backdrop-blur-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/50"
              title="איפוס התקדמות"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={handleShare}
              className="p-3 rounded-xl bg-white/80 backdrop-blur-sm text-slate-600 hover:text-slate-900 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/50"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-3 rounded-xl bg-white/80 backdrop-blur-sm text-red-500 hover:text-red-600 hover:bg-red-50/80 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/50"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleEdit}
              className="p-3 rounded-xl bg-white/80 backdrop-blur-sm text-slate-600 hover:text-slate-900 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/50"
            >
              <Edit className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Recipe Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-slate-200/50">
          {/* Hero Image */}
          {currentImage ? (
          <div 
            className="relative h-64 md:h-80 group overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="absolute inset-2 rounded-xl overflow-hidden shadow-inner">
              <img
                src={currentImage}
                alt={recipe.title}
                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-all duration-300 rounded-xl"
                onClick={() => setShowImageModal(true)}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200/20 via-transparent to-slate-200/20 pointer-events-none"></div>
            
            {/* Image Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                   className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-opacity z-10"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                   className="absolute right-4 rtl:left-4 rtl:right-auto top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-opacity z-10"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                
                {/* Image Indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 rtl:space-x-reverse">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-6 left-6 rtl:right-6 rtl:left-auto text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{recipe.title}</h1>
            </div>
            <button
              onClick={() => executeProtectedAction(() => toggleFavorite(recipe.id))}
              className={`absolute top-6 right-6 rtl:left-6 rtl:right-auto p-3 rounded-full backdrop-blur-sm transition-colors ${
                isFavorite 
                  ? 'bg-red-100/80 text-red-500' 
                  : 'bg-white/80 text-gray-600 hover:text-red-500'
              }`}
            >
              <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
          ) : (
            <div className={`relative h-64 md:h-80 flex items-center justify-center ${getCategoryColor(recipe?.category || '')}`}>
              {category && (
                <div className="text-8xl md:text-9xl opacity-80 filter drop-shadow-lg -translate-y-8">
                  {getCategoryIllustration(recipe?.category || '')}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-6 rtl:right-6 rtl:left-auto text-white">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{recipe?.title}</h1>
              </div>
              <button
                onClick={() => recipe && executeProtectedAction(() => toggleFavorite(recipe.id))}
                className={`absolute top-6 right-6 rtl:left-6 rtl:right-auto p-3 rounded-full backdrop-blur-sm transition-colors ${
                  isFavorite 
                    ? 'bg-red-100/80 text-red-500' 
                    : 'bg-white/80 text-gray-600 hover:text-red-500'
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

            <div className="grid lg:grid-cols-2 gap-3 sm:gap-6">
              {/* Ingredients */}
              <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 px-2 py-4 sm:px-3 md:px-6 rounded-2xl border border-amber-200/30">
                <h2 className="text-xl font-bold text-slate-900 mb-4">רכיבים</h2>
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start space-x-4 rtl:space-x-reverse group">
                      <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center mt-0.5 shadow-sm">
                        <span className="text-xs font-bold text-white">{index + 1}</span>
                      </div>
                      <span className="text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors text-base">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Progress Tracker */}
              <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 px-2 py-4 sm:px-3 md:px-6 rounded-2xl border border-amber-200/30">
                <ProgressTracker
                  key={progressTrackerKey}
                  recipeId={recipe.id}
                  directions={recipe.directions}
                  currentStep={recipe.current_step || 0}
                  onStepClick={handleStepClick}
                  additionalInstructions={recipe.additional_instructions}
                  additionalSections={recipe.additional_sections}
                  onAdditionalStepClick={handleAdditionalStepClick}
                  additionalCurrentSteps={additionalCurrentSteps}
                />
              </div>
            </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-2 sm:p-4 z-50">
          <div 
            className="relative w-full h-full flex items-center justify-center"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 rtl:left-4 rtl:right-auto z-10 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            {/* Image */}
            <img
              src={currentImage}
              alt={recipe.title}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
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