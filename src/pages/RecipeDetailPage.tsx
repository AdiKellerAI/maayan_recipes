import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, ChefHat, Share2, Edit, ArrowRight, ChevronLeft, ChevronRight, Trash2, X, RotateCcw } from 'lucide-react';
import { useRecipes } from '../contexts/RecipeContext';
import { categories } from '../data/categories';
import { getCategoryColor } from '../data/categories';
import ProgressTracker from '../components/Recipe/ProgressTracker';

const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, toggleFavorite, deleteRecipe } = useRecipes();
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showImageModal, setShowImageModal] = React.useState(false);
  const [additionalCurrentSteps, setAdditionalCurrentSteps] = React.useState<{ [key: string]: number }>({});
  
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
    // For now, don't update database - just handle locally
    setAdditionalCurrentSteps(prev => {
      const reset: { [key: string]: number } = {};
      Object.keys(prev).forEach(key => {
        reset[key] = 0;
      });
      return reset;
    });
    console.log('Progress reset');
  };

  // Initialize additional steps from recipe data
  React.useEffect(() => {
    if (recipe?.additional_instructions) {
      const initialSteps: { [key: string]: number } = {};
      Object.keys(recipe.additional_instructions).forEach(sectionName => {
        initialSteps[sectionName] = 0;
      });
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
    try {
      await deleteRecipe(recipe.id);
      // Return to previous page immediately after successful deletion
      setShowDeleteModal(false);
      navigate(-1);
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      // You could add a toast notification here instead of alert
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
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
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-900"
          >
            <ArrowRight className="h-5 w-5" />
            <span>חזור</span>
          </button>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => {
                const timerEvent = new CustomEvent('showTimer');
                window.dispatchEvent(timerEvent);
              }}
              className="p-2 rounded-full bg-white text-gray-600 hover:text-orange-600 hover:bg-orange-50 shadow-sm transition-colors border border-gray-200"
              title="טיימר בישול"
            >
              <span className="text-lg">⏰</span>
            </button>
            <button
              onClick={resetProgress}
              className="p-2 rounded-full bg-white text-gray-600 hover:text-blue-600 hover:bg-blue-50 shadow-sm transition-colors border border-gray-200"
              title="איפוס התקדמות"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white text-gray-600 hover:text-gray-900 shadow-sm border border-gray-200"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-full bg-white text-red-600 hover:text-red-700 hover:bg-red-50 shadow-sm transition-colors border border-gray-200"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <Link
              to={`/edit/${recipe.id}`}
              className="p-2 rounded-full bg-white text-gray-600 hover:text-gray-900 shadow-sm border border-gray-200"
            >
              <Edit className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Recipe Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Hero Image */}
          {currentImage ? (
          <div 
            className="relative h-64 md:h-80 group"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={currentImage}
              alt={recipe.title}
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowImageModal(true)}
            />
            
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
              onClick={() => toggleFavorite(recipe.id)}
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
                <div className="text-6xl opacity-50">
                  {/* Category icon would go here */}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-6 rtl:right-6 rtl:left-auto text-white">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{recipe?.title}</h1>
              </div>
              <button
                onClick={() => recipe && toggleFavorite(recipe.id)}
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
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6 rtl:space-x-reverse">
                {category && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                     <span className="text-lg font-medium text-gray-900">{category.name}</span>
                  </div>
                )}
                {recipe.difficulty && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
                    <ChefHat className="h-5 w-5" />
                    <span>{recipe.difficulty}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Ingredients */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">רכיבים</h2>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                      <span className="text-gray-700">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Progress Tracker */}
              <div>
                <ProgressTracker
                  directions={recipe.directions}
                  currentStep={recipe.current_step || 0}
                  onStepClick={handleStepClick}
                  additionalInstructions={recipe.additional_instructions}
                  onAdditionalStepClick={handleAdditionalStepClick}
                  additionalCurrentSteps={additionalCurrentSteps}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 mx-2 sm:mx-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">מחיקת מתכון</h3>
              </div>
              <button
                onClick={cancelDelete}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2 text-sm sm:text-base">
                האם אתה בטוח שברצונך למחוק את המתכון הזה?
              </p>
              <p className="text-sm text-red-600 font-medium">
                פעולה זו לא ניתנת לביטול.
              </p>
            </div>
            
            <div className="flex space-x-3 rtl:space-x-reverse">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm sm:text-base"
              >
                ביטול
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm sm:text-base"
              >
                מחק מתכון
              </button>
            </div>
          </div>
        </div>
      )}

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