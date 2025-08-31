import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, Trash2, Upload, Camera, Sparkles } from 'lucide-react';
import { useRecipes } from '../contexts/RecipeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useProtectedAction } from '../hooks/useProtectedAction';
import { categories } from '../data/categories';
import type { RecipeSection } from '../types/recipe';
import { compressImages } from '../utils/imageCompression';
import SmartImageSearch from '../components/SmartImageSearch';

const EditRecipePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, updateRecipe, deleteRecipe } = useRecipes();
  const { navigateToLastRecipesPage } = useNavigation();
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [additionalInstructions, setAdditionalInstructions] = useState<Record<string, string[]>>({});
  const [additionalSections, setAdditionalSections] = useState<{ [key: string]: RecipeSection }>({});
  const [showSectionNameModal, setShowSectionNameModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionNameWithIngredients, setNewSectionNameWithIngredients] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSmartImageSearch, setShowSmartImageSearch] = useState(false);
  
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
      setAdditionalSections(recipe.additional_sections || {});
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
  };

  const removeDirection = (index: number) => {
    setDirections(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
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

  const handleSmartImageSelect = (imageUrl: string) => {
    if (images.length >= 6) {
      alert('ניתן להעלות עד 6 תמונות בלבד.');
      return;
    }
    
    setImages(prev => [...prev, imageUrl]);
    console.log('✨ Smart image added:', imageUrl);
  };



  const addNewSection = () => {
    setShowNewSectionModal(true);
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

  const handleAddNewSection = () => {
    if (newSectionNameWithIngredients.trim()) {
      setAdditionalSections(prev => ({
        ...prev,
        [newSectionNameWithIngredients.trim()]: {
          ingredients: [''],
          directions: ['']
        }
      }));
      setNewSectionNameWithIngredients('');
      setShowNewSectionModal(false);
    }
  };

  const handleCancelNewSection = () => {
    setNewSectionNameWithIngredients('');
    setShowNewSectionModal(false);
  };



  // Functions for managing new sections with ingredients and directions
  const removeNewSection = (sectionName: string) => {
    setAdditionalSections(prev => {
      const newSections = { ...prev };
      delete newSections[sectionName];
      return newSections;
    });
    setHasUnsavedChanges(true);
  };

  const updateSectionIngredient = (sectionName: string, index: number, value: string) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        ingredients: prev[sectionName].ingredients.map((item, i) => i === index ? value : item)
      }
    }));
  };

  const addSectionIngredient = (sectionName: string) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        ingredients: [...prev[sectionName].ingredients, '']
      }
    }));
  };

  const removeSectionIngredient = (sectionName: string, index: number) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        ingredients: prev[sectionName].ingredients.filter((_, i) => i !== index)
      }
    }));
  };

  const updateSectionDirection = (sectionName: string, index: number, value: string) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        directions: prev[sectionName].directions.map((item, i) => i === index ? value : item)
      }
    }));
  };

  const addSectionDirection = (sectionName: string) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        directions: [...prev[sectionName].directions, '']
      }
    }));
  };

  const removeSectionDirection = (sectionName: string, index: number) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        directions: prev[sectionName].directions.filter((_, i) => i !== index)
      }
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
      
      // Filter additional sections to only include non-empty ones
      const filteredAdditionalSections: { [key: string]: RecipeSection } = {};
      Object.entries(additionalSections).forEach(([sectionName, section]) => {
        const filteredIngredients = section.ingredients.filter(ing => ing.trim());
        const filteredDirections = section.directions.filter(dir => dir.trim());
        if (filteredIngredients.length > 0 || filteredDirections.length > 0) {
          filteredAdditionalSections[sectionName] = {
            ingredients: filteredIngredients,
            directions: filteredDirections
          };
        }
      });

      const updatedRecipe = {
        ...formData,
        ingredients: filteredIngredients,
        directions: filteredDirections,
        images: images,
        difficulty: formData.difficulty || undefined,
        additional_instructions: additionalInstructions,
        additional_sections: filteredAdditionalSections
      };

      try {
        await updateRecipe(recipe.id, updatedRecipe);
        setHasUnsavedChanges(false);
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
        // Return to last recipes page immediately after successful deletion
        setShowDeleteModal(false);
        navigate(navigateToLastRecipesPage());
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        // You could add a toast notification here instead of alert
      }
    });
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת מבלי לשמור?');
      if (confirmClose) {
        navigate(`/recipe/${recipe.id}`);
      }
    } else {
      navigate(`/recipe/${recipe.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-rose-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-100/50 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">עריכת מתכון</h1>
                  <p className="text-orange-100 text-sm">ערוך ועדכן את המתכון שלך</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/30 transition-all duration-300 border border-white/30"
                title="סגור"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information Section */}
          <div className="bg-gradient-to-r from-orange-50 to-rose-50 p-4 rounded-lg border border-orange-200">
            <h2 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
              מידע בסיסי
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="title" className="block text-xs font-medium text-gray-600">
                  שם המתכון
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-400 transition-all duration-150 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="category" className="block text-xs font-medium text-gray-600">
                  קטגוריה
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-400 transition-all duration-150 text-sm"
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

            <div className="mt-4 space-y-1.5">
              <label htmlFor="difficulty" className="block text-xs font-medium text-gray-600">
                רמת קושי
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="w-full md:w-1/2 p-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-400 transition-all duration-150 text-sm"
              >
                <option value="">בחר רמת קושי</option>
                <option value="קל">קל</option>
                <option value="בינוני">בינוני</option>
                <option value="קשה">קשה</option>
              </select>
            </div>
          </div>

          {/* Images Section */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg border border-pink-200">
            <h2 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
              תמונות (עד 6)
            </h2>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap justify-center">
                <label className="flex items-center gap-2 bg-white hover:bg-gray-50 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 border border-gray-200 hover:border-pink-300 font-medium text-gray-700 hover:text-pink-600 text-sm">
                  <Upload className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">העלה</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,text/plain"
                    onChange={handleImageUpload}
                    className="hidden"
                    title="העלה"
                  />
                </label>
                <label className="flex items-center gap-2 bg-white hover:bg-gray-50 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 border border-gray-200 hover:border-pink-300 font-medium text-gray-700 hover:text-pink-600 text-sm">
                  <Camera className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">צלם</span>
                  <input
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,text/plain"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                    title="צלם"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowSmartImageSearch(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium text-sm"
                  title="חיפוש חכם לתמונות"
                >
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">חיפוש חכם</span>
                </button>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`תמונה ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="הסר תמונה"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {images.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">לא נבחרו תמונות עדיין</p>
                  <p className="text-xs">הוסף תמונות כדי להפוך את המתכון למושך יותר</p>
                </div>
              )}
            </div>
          </div>




          




          {/* Ingredients Section */}
          <div className="bg-gradient-to-r from-orange-50 to-rose-50 p-4 rounded-lg border border-orange-200">
            <h2 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
              רכיבים
            </h2>
            <div className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2 items-center group">
                  <div className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <input
                    ref={(el) => ingredientRefs.current[index] = el}
                    type="text"
                    value={ingredient}
                    onChange={(e) => updateIngredient(index, e.target.value)}
                    className="flex-1 p-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-400 transition-all duration-150 text-sm"
                    placeholder={`רכיב ${index + 1}`}
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100"
                      title="הסר רכיב"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addIngredient}
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium bg-white hover:bg-orange-50 px-3 py-2 rounded-md transition-all duration-200 border border-dashed border-orange-300 hover:border-orange-400 w-full justify-center text-sm"
              >
                <Plus className="w-4 h-4" />
                הוסף רכיב נוסף
              </button>
            </div>
          </div>

          {/* Directions Section */}
          <div className="bg-gradient-to-r from-orange-50 to-rose-50 p-4 rounded-lg border border-orange-200">
            <h2 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
              הוראות הכנה
            </h2>
            <div className="space-y-2">
              {directions.map((direction, index) => (
                <div key={index} className="flex gap-2 group">
                  <div className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <textarea
                      ref={(el) => directionRefs.current[index] = el}
                      value={direction}
                      onChange={(e) => updateDirection(index, e.target.value)}
                      rows={2}
                      className="w-full p-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-400 transition-all duration-150 resize-none text-sm"
                      placeholder={`שלב ${index + 1}...`}
                    />
                  </div>
                  {directions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDirection(index)}
                      className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 self-start mt-1"
                      title="הסר שלב"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addDirection}
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium bg-white hover:bg-orange-50 px-3 py-2 rounded-md transition-all duration-200 border border-dashed border-orange-300 hover:border-orange-400 w-full justify-center text-sm"
              >
                <Plus className="w-4 h-4" />
                הוסף שלב נוסף
              </button>
            </div>
          </div>

          {/* Additional Sections */}
          {Object.keys(additionalSections).length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-4 rounded-lg border border-blue-200">
              <h2 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                חלקים נוספים
              </h2>
              <div className="space-y-3">
                {Object.entries(additionalSections).map(([sectionName, section]) => (
                  <div key={sectionName} className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-blue-900 text-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {sectionName}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeNewSection(sectionName)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-all duration-200"
                        title={`הסר חלק ${sectionName}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  
                    <div className="grid md:grid-cols-2 gap-3">
                      {/* Section Ingredients */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-blue-800 flex items-center gap-1 text-xs">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                          מרכיבים ל{sectionName}
                        </h4>
                        <div className="space-y-2">
                          {section.ingredients.map((ingredient, index) => (
                            <div key={index} className="flex gap-2 items-center group">
                              <div className="flex-shrink-0 w-4 h-4 bg-green-400 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </div>
                              <input
                                type="text"
                                value={ingredient}
                                onChange={(e) => updateSectionIngredient(sectionName, index, e.target.value)}
                                className="flex-1 p-1.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all duration-150 text-sm"
                                placeholder={`רכיב ${index + 1}`}
                              />
                              {section.ingredients.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSectionIngredient(sectionName, index)}
                                  className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addSectionIngredient(sectionName)}
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium text-xs bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md transition-all duration-200 border border-green-200"
                          >
                            <Plus className="w-3 h-3" />
                            הוסף רכיב
                          </button>
                        </div>
                      </div>

                      {/* Section Directions */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-blue-800 flex items-center gap-1 text-xs">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          שלבי הכנה ל{sectionName}
                        </h4>
                        <div className="space-y-2">
                          {section.directions.map((direction, index) => (
                            <div key={index} className="flex gap-2 group">
                              <div className="bg-blue-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1">
                                {index + 1}
                              </div>
                              <textarea
                                value={direction}
                                onChange={(e) => updateSectionDirection(sectionName, index, e.target.value)}
                                rows={2}
                                className="flex-1 p-1.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all duration-150 text-sm resize-none"
                                placeholder={`שלב ${index + 1}`}
                              />
                              {section.directions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSectionDirection(sectionName, index)}
                                  className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 self-start"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addSectionDirection(sectionName)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-all duration-200 border border-blue-200"
                          >
                            <Plus className="w-3 h-3" />
                            הוסף שלב
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Section Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={addNewSection}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 px-4 py-3 rounded-lg transition-all duration-200 border border-dashed border-blue-300 hover:border-blue-400 mx-auto text-sm"
            >
              <Plus className="w-4 h-4" />
              הוסף חלק חדש (עם מרכיבים ושלבים)
            </button>
          </div>

          {/* Submit Section */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-[2] bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-md hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md text-sm"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    <span>שומר שינויים...</span>
                  </>
                ) : (
                  <span>שמור שינויים</span>
                )}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-4 rounded-md hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md text-sm"
              >
                <Trash2 className="h-3 w-3" />
                <span>מחק מתכון</span>
              </button>
            </div>
          </div>
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

        {/* New Section Modal (with ingredients and directions) */}
        {showNewSectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-4">
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-4">הוסף חלק חדש עם מרכיבים</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">הכנס שם לחלק החדש (למשל: רוטב, בצק, מילוי, קרם):</p>
              <input
                type="text"
                value={newSectionNameWithIngredients}
                onChange={(e) => setNewSectionNameWithIngredients(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddNewSection()}
                placeholder="שם החלק..."
                className="w-full px-3 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-base"
                autoFocus
              />
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-xs text-blue-700">
                  חלק זה יכלול גם מרכיבים וגם שלבי הכנה נפרדים
                </p>
              </div>
              <div className="flex space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={handleCancelNewSection}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={handleAddNewSection}
                  disabled={!newSectionNameWithIngredients.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  הוסף חלק
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Smart Image Search Modal */}
        {showSmartImageSearch && (
          <SmartImageSearch
            recipeName={formData.title}
            ingredients={ingredients}
            onImageSelect={handleSmartImageSelect}
            onClose={() => setShowSmartImageSearch(false)}
          />
        )}
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
    </div>
  );
};

export default EditRecipePage;