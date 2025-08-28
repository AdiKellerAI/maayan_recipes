import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, ArrowRight, Trash2, Upload, Camera, Sparkles } from 'lucide-react';
import { useRecipes } from '../contexts/RecipeContext';
import { useProtectedAction } from '../hooks/useProtectedAction';
import { categories } from '../data/categories';
import { compressImages } from '../utils/imageCompression';
import { searchImages, imageUrlToDataUrl, ImageSearchResult } from '../services/imageSearchService';

const EditRecipePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, updateRecipe, deleteRecipe } = useRecipes();
  const { executeProtectedAction } = useProtectedAction();
  
  const recipe = recipes.find(r => r.id === id);
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    difficulty: '' as '' | 'קל' | 'בינוני' | 'קשה'
  });
  
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [directions, setDirections] = useState<string[]>(['']);
  const [images, setImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [additionalInstructions, setAdditionalInstructions] = useState<Record<string, string[]>>({});
  const [showSectionNameModal, setShowSectionNameModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Smart image search states
  const [showSmartImageSearch, setShowSmartImageSearch] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<ImageSearchResult[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);
  
  // Refs for auto-focusing new input fields
  const ingredientRefs = useRef<(HTMLInputElement | null)[]>([]);
  const directionRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    if (recipe) {
      setFormData({
        title: recipe.title,
        category: recipe.category,
        difficulty: recipe.difficulty || ''
      });
      setIngredients(recipe.ingredients);
      setDirections(recipe.directions);
      setImages(recipe.images || []);
      setAdditionalInstructions(recipe.additional_instructions || {});
    }
  }, [recipe]);

  // Check authentication when page loads
  useEffect(() => {
    executeProtectedAction(() => {
      // If not authenticated, the modal will show
      // If authenticated, nothing happens and user can proceed
    });
    
    // Always scroll to top when page loads
    window.scrollTo(0, 0);
  }, []);

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">מתכון לא נמצא</h2>
          <button
            onClick={() => navigate('/recipes')}
            className="text-amber-600 hover:text-amber-700"
          >
            חזור לדף הבית
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addIngredient = () => {
    setIngredients(prev => {
      const newIndex = prev.length;
      const newIngredients = [...prev, ''];
      
      // Focus the new input field immediately after render without losing focus
      setTimeout(() => {
        if (ingredientRefs.current[newIndex]) {
          ingredientRefs.current[newIndex]?.focus();
        }
      }, 10); // Reduced timeout for smoother experience
      
      return newIngredients;
    });
  };

  const updateIngredient = (index: number, value: string) => {
    setIngredients(prev => prev.map((item, i) => i === index ? value : item));
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addDirection = () => {
    setDirections(prev => {
      const newIndex = prev.length;
      const newDirections = [...prev, ''];
      
      // Focus the new textarea field immediately after render without losing focus
      setTimeout(() => {
        if (directionRefs.current[newIndex]) {
          directionRefs.current[newIndex]?.focus();
        }
      }, 10); // Reduced timeout for smoother experience
      
      return newDirections;
    });
  };

  const updateDirection = (index: number, value: string) => {
    setDirections(prev => prev.map((item, i) => i === index ? value : item));
  };

  const removeDirection = (index: number) => {
    setDirections(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('📸 Uploading images:', files.length);
      
      // Filter out non-image files (workaround for Android 14 compatibility)
      const imageFiles = Array.from(files).filter(file => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
          console.log('⚠️ Skipping non-image file:', file.name, file.type);
        }
        return isImage;
      });
      
      if (imageFiles.length === 0) {
        alert('אנא בחר קבצי תמונה בלבד (JPG, PNG, WEBP, HEIC).');
        e.target.value = '';
        return;
      }
      
      if (imageFiles.length !== files.length) {
        alert(`נבחרו ${imageFiles.length} קבצי תמונה מתוך ${files.length} קבצים. רק קבצי התמונה יועלו.`);
      }
      
      // Check if adding these images would exceed the 6 image limit
      if (images.length + imageFiles.length > 6) {
        alert(`ניתן להעלות עד 6 תמונות בלבד. כרגע יש לך ${images.length} תמונות ואתה מנסה להוסיף ${imageFiles.length} נוספות.`);
        // Reset the input
        e.target.value = '';
        return;
      }
      
      // Show loading indicator for mobile
      const loadingToast = setTimeout(() => {
        console.log('📸 Processing images...');
      }, 500);
      
      // Convert Array to FileList-like object for compression
      const fileList = imageFiles as unknown as FileList;
      
      compressImages(fileList) // Use HD quality compression
        .then(compressedImages => {
          clearTimeout(loadingToast);
          console.log('✅ Images compressed successfully:', compressedImages.length);
          setImages(prev => {
            const newImages = [...prev, ...compressedImages];
            console.log('📸 Total images after upload:', newImages.length);
            return newImages.slice(0, 6); // Ensure we never exceed 6 images
          });
          // Reset the input to allow selecting the same file again if needed
          e.target.value = '';
        })
        .catch(error => {
          clearTimeout(loadingToast);
          console.error('❌ Error compressing images:', error);
          const errorMessage = error.message || 'שגיאה בדחיסת התמונות. אנא נסה שוב.';
          
          // Provide more specific error messages for mobile users
          if (errorMessage.includes('timed out')) {
            alert('עיבוד התמונה נמשך יותר מדי. אנא נסה תמונה קטנה יותר או בפורמט JPG/PNG.');
          } else if (errorMessage.includes('Failed to load image')) {
            alert('לא ניתן לטעון את התמונה. אנא נסה פורמט אחר (JPG, PNG) או תמונה אחרת.');
          } else if (errorMessage.includes('גדול מדי')) {
            alert('התמונה גדולה מדי. אנא בחר תמונה קטנה יותר (עד 10MB).');
          } else {
            alert(errorMessage);
          }
          
          // Reset the input
          e.target.value = '';
        });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const addAdditionalInstructionSection = () => {
    setShowSectionNameModal(true);
  };

  const handleAddSection = () => {
    if (newSectionName.trim()) {
      setAdditionalInstructions(prev => ({
        ...prev,
        [newSectionName.trim()]: ['']
      }));
      setNewSectionName('');
      setShowSectionNameModal(false);
    }
  };

  const handleCancelSection = () => {
    setNewSectionName('');
    setShowSectionNameModal(false);
  };

  const removeAdditionalInstructionSection = (sectionName: string) => {
    setAdditionalInstructions(prev => {
      const newInstructions = { ...prev };
      delete newInstructions[sectionName];
      return newInstructions;
    });
  };

  const updateAdditionalInstruction = (sectionName: string, index: number, value: string) => {
    setAdditionalInstructions(prev => ({
      ...prev,
      [sectionName]: prev[sectionName].map((item, i) => i === index ? value : item)
    }));
  };

  const addAdditionalInstructionStep = (sectionName: string) => {
    setAdditionalInstructions(prev => ({
      ...prev,
      [sectionName]: [...prev[sectionName], '']
    }));
  };

  const removeAdditionalInstructionStep = (sectionName: string, index: number) => {
    setAdditionalInstructions(prev => ({
      ...prev,
      [sectionName]: prev[sectionName].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSaving) return;
    
    executeProtectedAction(async () => {
      const filteredIngredients = ingredients.filter(item => item.trim());
      const filteredDirections = directions.filter(item => item.trim());
      
      if (!formData.title || !formData.category || 
          filteredIngredients.length === 0 || filteredDirections.length === 0) {
        alert('נא למלא את שם המתכון, הקטגוריה, הרכיבים וההוראות');
        return;
      }

      setIsSaving(true);
      const updatedRecipe = {
        ...formData,
        ingredients: filteredIngredients,
        directions: filteredDirections,
        images: images,
        difficulty: formData.difficulty || undefined,
        additional_instructions: additionalInstructions
      };

      try {
        await updateRecipe(recipe.id, updatedRecipe);
        navigate(`/recipe/${recipe.id}`);
      } catch (error) {
        console.error('Failed to update recipe:', error);
        // Error is already handled in the context
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleDelete = async () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    executeProtectedAction(async () => {
      try {
        await deleteRecipe(recipe.id);
        // Return to previous page immediately after successful deletion
        setShowDeleteModal(false);
        navigate(-1);
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        // You could add a toast notification here instead of alert
      }
    });
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Smart image search functions
  const handleSmartImageSearch = async () => {
    if (!formData.title.trim() && ingredients.filter(ing => ing.trim()).length === 0) {
      alert('אנא הכנס שם מתכון או רכיבים לפני החיפוש החכם');
      return;
    }

    setIsSearchingImages(true);
    setImageSearchError(null);
    setShowSmartImageSearch(true);

    try {
      // Create search query from recipe title and ingredients
      const searchQuery = formData.title.trim() || ingredients.filter(ing => ing.trim()).slice(0, 3).join(' ');
      
      const results = await searchImages({
        query: searchQuery,
        count: 4
      });

      setImageSearchResults(results);
    } catch (error) {
      console.error('Smart image search failed:', error);
      setImageSearchError(error instanceof Error ? error.message : 'שגיאה בחיפוש תמונות');
    } finally {
      setIsSearchingImages(false);
    }
  };

  const handleSelectSearchImage = async (searchResult: ImageSearchResult) => {
    if (images.length >= 6) {
      alert('ניתן להעלות עד 6 תמונות בלבד');
      return;
    }

    try {
      // Convert the selected image URL to data URL and add to images
      const dataUrl = await imageUrlToDataUrl(searchResult.url);
      setImages(prev => [...prev, dataUrl]);
      setShowSmartImageSearch(false);
      setImageSearchResults([]);
    } catch (error) {
      console.error('Failed to add selected image:', error);
      alert('שגיאה בהוספת התמונה. אנא נסה שוב.');
    }
  };

  const closeSmartImageSearch = () => {
    setShowSmartImageSearch(false);
    setImageSearchResults([]);
    setImageSearchError(null);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/recipe/${recipe.id}`)}
            className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-900"
          >
            <ArrowRight className="h-5 w-5" />
            <span>חזור</span>
          </button>
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <h1 className="text-2xl font-bold text-gray-900">עריכת מתכון</h1>
            <button
              onClick={handleDelete}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="h-5 w-5" />
            </button>
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
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                שם המתכון *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                קטגוריה *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">בחר קטגוריה</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                תמונות (עד 6)
              </label>
              <div className="space-y-3">
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <label className={`flex-1 cursor-pointer ${images.length >= 6 ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation">
                      <Upload className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                      <span>העלה תמונה</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,text/plain"
                      multiple
                      onChange={handleImageUpload}
                      disabled={images.length >= 6}
                      className="hidden"
                      title="העלה תמונה"
                    />
                  </label>
                  <label className={`flex-1 cursor-pointer ${images.length >= 6 ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation">
                      <Camera className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                      <span>צלם תמונה</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,text/plain"
                      capture="environment"
                      onChange={handleImageUpload}
                      disabled={images.length >= 6}
                      className="hidden"
                      title="צלם תמונה"
                    />
                  </label>
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleSmartImageSearch}
                    disabled={images.length >= 6}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      images.length >= 6
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg'
                    }`}
                    title="חיפוש חכם לתמונות מתאימות למתכון"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>חיפוש חכם</span>
                  </button>
                </div>
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`תצוגה מקדימה ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 rtl:left-1 rtl:right-auto p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-1 left-1 rtl:right-1 rtl:left-auto bg-primary-500 text-white text-xs px-1 py-0.5 rounded">
                            ראשית
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                רמת קושי
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">בחר רמת קושי</option>
                <option value="קל">קל</option>
                <option value="בינוני">בינוני</option>
                <option value="קשה">קשה</option>
              </select>
            </div>
          </div>



          {/* Additional Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              הוראות נוספות (אופציונלי)
            </label>
            <p className="text-sm text-gray-500 mb-4">הוסף חלקים נוספים כמו רוטב, בצק, מילוי וכו'</p>
            
            <div className="space-y-4">
              {Object.entries(additionalInstructions).map(([sectionName, instructions]) => (
                <div key={sectionName} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{sectionName}</h4>
                    <button
                      type="button"
                      onClick={() => removeAdditionalInstructionSection(sectionName)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {instructions.map((instruction, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-2">
                          {index + 1}
                        </div>
                        <textarea
                          value={instruction}
                          onChange={(e) => updateAdditionalInstruction(sectionName, index, e.target.value)}
                          rows={2}
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                          placeholder={`שלב ${index + 1} ב${sectionName}`}
                        />
                        {instructions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAdditionalInstructionStep(sectionName, index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addAdditionalInstructionStep(sectionName)}
                      className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      הוסף שלב ל{sectionName}
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addAdditionalInstructionSection}
                className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
              >
                <Plus className="w-5 h-5" />
                הוסף חלק הוראות חדש
              </button>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              רכיבים *
            </label>
            <div className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center space-x-2 rtl:space-x-reverse">
                  <input
                    ref={(el) => ingredientRefs.current[index] = el}
                    type="text"
                    value={ingredient}
                    onChange={(e) => updateIngredient(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addIngredient}
                onMouseDown={(e) => e.preventDefault()} // Prevent focus on button click
                onTouchStart={(e) => e.preventDefault()} // Prevent focus on touch
                className="flex items-center space-x-1 rtl:space-x-reverse text-amber-600 hover:text-amber-700"
              >
                <Plus className="h-4 w-4" />
                <span>הוספת רכיב</span>
              </button>
            </div>
          </div>

          {/* Directions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              הוראות הכנה *
            </label>
            <div className="space-y-2">
              {directions.map((direction, index) => (
                <div key={index} className="flex items-start space-x-2 rtl:space-x-reverse">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-medium mt-1">
                    {index + 1}
                  </div>
                  <textarea
                    ref={(el) => directionRefs.current[index] = el}
                    value={direction}
                    onChange={(e) => updateDirection(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows={2}
                  />
                  {directions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDirection(index)}
                      className="p-2 text-red-500 hover:text-red-700 mt-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addDirection}
                onMouseDown={(e) => e.preventDefault()} // Prevent focus on button click
                onTouchStart={(e) => e.preventDefault()} // Prevent focus on touch
                className="flex items-center space-x-1 rtl:space-x-reverse text-amber-600 hover:text-amber-700"
              >
                <Plus className="h-4 w-4" />
                <span>הוספת שלב</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-amber-500 text-white px-6 py-3 rounded-lg hover:bg-amber-600 transition-colors disabled:bg-amber-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>שומר...</span>
                </>
              ) : (
                <span>שמור שינויים</span>
              )}
            </button>
          </div>
          
          {/* Add padding to prevent content from being hidden behind fixed button */}
          <div className="h-20"></div>
        </form>

        {/* Section Name Modal */}
        {showSectionNameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">הוסף חלק הוראות חדש</h3>
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSection()}
                placeholder="שם החלק (למשל: רוטב, בצק, מילוי)"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-4 text-base"
                autoFocus
              />
              <div className="flex space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={handleCancelSection}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={handleAddSection}
                  disabled={!newSectionName.trim()}
                  className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:bg-amber-300 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  הוסף
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Smart Image Search Modal */}
        {showSmartImageSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                    <h2 className="text-xl font-bold text-gray-900">חיפוש חכם לתמונות</h2>
                  </div>
                  <button
                    onClick={closeSmartImageSearch}
                    className="text-gray-500 hover:text-gray-700 p-1"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {isSearchingImages ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">מחפש תמונות מתאימות...</p>
                    </div>
                  </div>
                ) : imageSearchError ? (
                  <div className="text-center py-12">
                    <div className="text-red-400 text-4xl mb-4">⚠️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">שגיאה בחיפוש</h3>
                    <p className="text-red-600 mb-4">{imageSearchError}</p>
                    <button
                      onClick={handleSmartImageSearch}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      נסה שוב
                    </button>
                  </div>
                ) : imageSearchResults.length > 0 ? (
                  <div>
                    <p className="text-gray-600 mb-4 text-center">
                      בחר תמונה מתאימה למתכון שלך:
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {imageSearchResults.map((result) => (
                        <div key={result.id} className="group cursor-pointer" onClick={() => handleSelectSearchImage(result)}>
                          <div className="relative overflow-hidden rounded-lg border-2 border-transparent group-hover:border-purple-500 transition-colors">
                            <img
                              src={result.thumbnailUrl}
                              alt={result.title}
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="bg-white rounded-full p-2 shadow-lg">
                                  <Plus className="h-6 w-6 text-purple-600" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-center">
                            <p className="text-sm text-gray-700 font-medium truncate">{result.title}</p>
                            <p className="text-xs text-gray-500">{result.source}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו תמונות</h3>
                    <p className="text-gray-600 mb-4">נסה חיפוש אחר או הוסף תמונה ידנית</p>
                  </div>
                )}

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={closeSmartImageSearch}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    סגור
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditRecipePage;