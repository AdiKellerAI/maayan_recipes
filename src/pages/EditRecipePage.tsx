import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, Trash2, Upload, Camera, Sparkles } from 'lucide-react';
import { useRecipes } from '../contexts/RecipeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useProtectedAction } from '../hooks/useProtectedAction';
import { categories } from '../data/categories';
import type { RecipeSection } from '../types/recipe';
import { compressImages } from '../utils/imageCompression';
import SmartImageSearch from '../components/SmartImageSearch';
import { recipeService } from '../services/recipeService';
import { imageService, RecipeImage } from '../services/imageService';
import ImageManager from '../components/ImageManager';

const EditRecipePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, updateRecipe, deleteRecipe } = useRecipes();
  const { navigateToLastRecipesPage, setReferrerFromRecipes } = useNavigation();
  const { executeProtectedAction } = useProtectedAction();
  
  const recipe = recipes.find(r => r.id === id);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    difficulty: '' as '' | 'קל' | 'בינוני' | 'קשה'
  });
  
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [directions, setDirections] = useState<string[]>(['']);
  const [images, setImages] = useState<RecipeImage[]>([]);
  const [additionalSections, setAdditionalSections] = useState<{ [key: string]: RecipeSection }>({});
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionNameWithIngredients, setNewSectionNameWithIngredients] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSmartImageSearch, setShowSmartImageSearch] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Refs for auto-focusing
  const ingredientRefs = useRef<(HTMLInputElement | null)[]>([]);
  const directionRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Initialize form data when recipe loads
  useEffect(() => {
    if (recipe) {
      console.log('🔄 EDIT: Loading recipe data, images:', recipe.images?.length || 0);
      setFormData({
        title: recipe.title,
        category: recipe.category,
        difficulty: recipe.difficulty || ''
      });
      setIngredients(recipe.ingredients);
      setDirections(recipe.directions);
      // Convert string URLs to RecipeImage objects for existing images
      const existingImages: RecipeImage[] = (recipe.images || []).map((url, index) => ({
        id: `existing-${index}`,
        recipe_id: recipe.id,
        filename: `existing-image-${index}.jpg`,
        file_path: '',
        url: url,
        image_type: 'gallery',
        file_size: 0,
        mime_type: 'image/jpeg',
        alt_text: `תמונה קיימת ${index + 1}`,
        width: 0,
        height: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      setImages(existingImages);
      setAdditionalSections(recipe.additional_sections || {});
      setHasUnsavedChanges(false);
      console.log('✅ EDIT: Recipe data loaded successfully');
    }
  }, [recipe]);

  // Check authentication and setup navigation
  useEffect(() => {
    executeProtectedAction(() => {
      // Authentication check completed
    });
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Capture referrer for navigation
    const referrer = document.referrer;
    if (referrer && referrer.includes('/recipes')) {
      const url = new URL(referrer);
      const recipesPath = url.pathname + url.search;
      setReferrerFromRecipes(recipesPath);
    }
  }, [setReferrerFromRecipes]);

  // Connection status monitoring for mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      const checkConnection = async () => {
        try {
          setConnectionStatus('checking');
          const isConnected = await recipeService.checkPostgreSQLConnection();
          setConnectionStatus(isConnected ? 'online' : 'offline');
        } catch (error) {
          setConnectionStatus('offline');
        }
      };

      checkConnection();
      
      const handleOnline = () => {
        console.log('📱 MOBILE: Connection restored');
        setConnectionStatus('online');
      };

      const handleOffline = () => {
        console.log('📱 MOBILE: Connection lost');
        setConnectionStatus('offline');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      const interval = setInterval(checkConnection, 30000);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
      };
    }
  }, []);

  // Prevent navigation if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Safe navigation function
  const safeNavigate = useCallback((path: string) => {
    if (isNavigating) return; // Prevent multiple navigations
    
    setIsNavigating(true);
    setHasUnsavedChanges(false);
    
    // Use setTimeout to ensure state updates before navigation
    setTimeout(() => {
      navigate(path);
      // Reset navigation state after navigation
      setTimeout(() => {
        setIsNavigating(false);
      }, 200);
    }, 100);
  }, [navigate, isNavigating]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  };

  // Ingredient management
  const addIngredient = () => {
    setIngredients(prev => {
      const newIngredients = [...prev, ''];
      const newIndex = newIngredients.length - 1;
      
      setTimeout(() => {
        if (ingredientRefs.current[newIndex]) {
          ingredientRefs.current[newIndex]?.focus();
        }
      }, 10);
      
      return newIngredients;
    });
    setHasUnsavedChanges(true);
  };

  const updateIngredient = (index: number, value: string) => {
    setIngredients(prev => prev.map((item, i) => i === index ? value : item));
    setHasUnsavedChanges(true);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  // Direction management
  const addDirection = () => {
    setDirections(prev => {
      const newDirections = [...prev, ''];
      const newIndex = newDirections.length - 1;
      
      setTimeout(() => {
        if (directionRefs.current[newIndex]) {
          directionRefs.current[newIndex]?.focus();
        }
      }, 10);
      
      return newDirections;
    });
    setHasUnsavedChanges(true);
  };

  const updateDirection = (index: number, value: string) => {
    setDirections(prev => prev.map((item, i) => i === index ? value : item));
    setHasUnsavedChanges(true);
  };

  const removeDirection = (index: number) => {
    if (directions.length <= 1) return;
    setDirections(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  // Image management
  const handleSmartImageSelect = (imageUrl: string) => {
    if (images.length >= 6) {
      alert('ניתן להעלות עד 6 תמונות בלבד.');
      return;
    }
    
    // Create a temporary RecipeImage object for the smart image
    const tempImage: RecipeImage = {
      id: `temp-smart-${Date.now()}`,
      recipe_id: recipe?.id || '',
      filename: `smart-image-${Date.now()}.jpg`,
      file_path: '',
      url: imageUrl,
      image_type: 'gallery',
      file_size: 0,
      mime_type: 'image/jpeg',
      alt_text: 'תמונה מחפש חכם',
      width: 0,
      height: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add the temporary image to the images array
    setImages(prev => [...prev, tempImage]);
    setHasUnsavedChanges(true);
    // Don't close the modal automatically - let the user stay in edit mode
    // setShowSmartImageSearch(false); // Removed to prevent navigation away from edit page
    console.log('✨ EDIT: Smart image added:', imageUrl);
  };

  // Additional sections management
  const addNewSection = () => {
    setShowNewSectionModal(true);
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
      setHasUnsavedChanges(true);
    }
  };

  const handleCancelNewSection = () => {
    setNewSectionNameWithIngredients('');
    setShowNewSectionModal(false);
  };

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
    setHasUnsavedChanges(true);
  };

  const addSectionIngredient = (sectionName: string) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        ingredients: [...prev[sectionName].ingredients, '']
      }
    }));
    setHasUnsavedChanges(true);
  };

  const removeSectionIngredient = (sectionName: string, index: number) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        ingredients: prev[sectionName].ingredients.filter((_, i) => i !== index)
      }
    }));
    setHasUnsavedChanges(true);
  };

  const updateSectionDirection = (sectionName: string, index: number, value: string) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        directions: prev[sectionName].directions.map((item, i) => i === index ? value : item)
      }
    }));
    setHasUnsavedChanges(true);
  };

  const addSectionDirection = (sectionName: string) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        directions: [...prev[sectionName].directions, '']
      }
    }));
    setHasUnsavedChanges(true);
  };

  const removeSectionDirection = (sectionName: string, index: number) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        directions: prev[sectionName].directions.filter((_, i) => i !== index)
      }
    }));
    setHasUnsavedChanges(true);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSaving || isNavigating) return;
    
    executeProtectedAction(async () => {
      const filteredIngredients = ingredients.filter(item => item.trim());
      const filteredDirections = directions.filter(item => item.trim());
      
      if (!formData.title || !formData.category || 
          filteredIngredients.length === 0 || filteredDirections.length === 0) {
        alert('נא למלא את שם המתכון, הקטגוריה, הרכיבים וההוראות');
        return;
      }

      setIsSaving(true);
      setUploadStatus('שומר מתכון...');
      
      // Filter additional sections
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

              // After processing temporary images, get the final image URLs
        const finalImageUrls = images.map(img => img.url);
      
              const updatedRecipe = {
          ...formData,
          ingredients: filteredIngredients,
          directions: filteredDirections,
          images: finalImageUrls,
          difficulty: formData.difficulty || undefined,
          additional_sections: filteredAdditionalSections
        };

      try {
        console.log('🔄 EDIT: Updating recipe with images:', images.length);
        
        // Handle temporary images from SmartImageSearch
        const tempSmartImages = images.filter(img => img.id.startsWith('temp-smart-'));
        const tempUploadImages = images.filter(img => img.id.startsWith('temp-upload-'));
        
        if (tempSmartImages.length > 0 || tempUploadImages.length > 0) {
          console.log('📸 EDIT: Processing temporary images...');
          
          // Save temporary smart images to the recipe
          for (const tempImage of tempSmartImages) {
            try {
              // Download and save the smart image
              const response = await fetch(tempImage.url);
              const blob = await response.blob();
              const file = new File([blob], tempImage.filename, { type: tempImage.mime_type });
              
              // Upload the image to the server
              const uploadResponse = await imageService.uploadImages(recipe!.id, [file], 'gallery');
              if (uploadResponse.success && uploadResponse.images.length > 0) {
                // Replace the temporary image with the uploaded one
                const uploadedImage = uploadResponse.images[0];
                setImages(prev => prev.map(img => 
                  img.id === tempImage.id ? uploadedImage : img
                ));
              }
            } catch (uploadError) {
              console.error('Error uploading smart image:', uploadError);
              // Keep the temporary image for now
            }
          }
          
          // Handle temp upload images (these were already processed as files)
          for (const tempImage of tempUploadImages) {
            // These images will be handled by the normal save process
            console.log('📸 EDIT: Temp upload image will be saved:', tempImage.filename);
          }
        }
        
        await updateRecipe(recipe!.id, updatedRecipe);
        
        console.log('✅ EDIT: Recipe updated successfully');
        setHasUnsavedChanges(false);
        setUploadStatus('המתכון נשמר בהצלחה!');
        
        // Navigate to recipe detail page after successful save
        setTimeout(() => {
          setIsNavigating(false); // Reset navigation state before navigating
          safeNavigate(`/recipe/${recipe!.id}`);
        }, 1000);
        
      } catch (error) {
        console.error('❌ EDIT: Failed to update recipe:', error);
        const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
        setUploadStatus(`שגיאה: ${errorMessage}`);
        
        // Show error alert
        setTimeout(() => {
          alert(`שגיאה בשמירת המתכון: ${errorMessage}`);
        }, 500);
      } finally {
        setIsSaving(false);
        
        // Clear status after delay
        setTimeout(() => {
          setUploadStatus('');
        }, 2000);
      }
    });
  };

  // Delete recipe
  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (isNavigating) return;
    
    executeProtectedAction(async () => {
      try {
        await deleteRecipe(recipe!.id);
        setShowDeleteModal(false);
        setIsNavigating(false); // Reset navigation state before navigating
        safeNavigate(navigateToLastRecipesPage());
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        alert('שגיאה במחיקת המתכון');
      }
    });
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Check if there are actual changes
  const hasActualChanges = useMemo(() => {
    if (!recipe) return false;
    
    // Check basic form data
    if (formData.title !== recipe.title ||
        formData.category !== recipe.category ||
        formData.difficulty !== (recipe.difficulty || '')) {
      return true;
    }
    
    // Check ingredients
    if (ingredients.length !== recipe.ingredients.length ||
        ingredients.some((ing, i) => ing !== recipe.ingredients[i])) {
      return true;
    }
    
    // Check directions
    if (directions.length !== recipe.directions.length ||
        directions.some((dir, i) => dir !== recipe.directions[i])) {
      return true;
    }
    
    // Check images
    const currentImageUrls = images.map(img => img.url);
    if (currentImageUrls.length !== (recipe.images?.length || 0) ||
        currentImageUrls.some((url, i) => url !== (recipe.images?.[i] || ''))) {
      return true;
    }
    
    // Check additional sections
    const currentSections = Object.keys(additionalSections);
    const originalSections = Object.keys(recipe.additional_sections || {});
    
    if (currentSections.length !== originalSections.length) {
      return true;
    }
    
    for (const sectionName of currentSections) {
      const currentSection = additionalSections[sectionName];
      const originalSection = recipe.additional_sections?.[sectionName];
      
      if (!originalSection) {
        return true;
      }
      
      if (currentSection.ingredients.length !== originalSection.ingredients.length ||
          currentSection.directions.length !== originalSection.directions.length ||
          currentSection.ingredients.some((ing, i) => ing !== originalSection.ingredients[i]) ||
          currentSection.directions.some((dir, i) => dir !== originalSection.directions[i])) {
        return true;
      }
    }
    
    return false;
  }, [recipe, formData, ingredients, directions, images, additionalSections]);

  // Close page
  const handleClose = () => {
    if (hasActualChanges) {
      const confirmClose = window.confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת מבלי לשמור?');
      if (confirmClose) {
        setIsNavigating(false); // Reset navigation state before navigating
        safeNavigate(`/recipe/${recipe!.id}`);
      }
    } else {
      setIsNavigating(false); // Reset navigation state before navigating
      safeNavigate(`/recipe/${recipe!.id}`);
    }
  };

  // Loading state
  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">מתכון לא נמצא</h2>
          <button
            type="button"
            onClick={() => safeNavigate('/recipes')}
            className="text-amber-600 hover:text-amber-700"
          >
            חזור לדף הבית
          </button>
        </div>
      </div>
    );
  }

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
                  {/* Connection Status Indicator for Mobile */}
                  {window.innerWidth < 768 && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                      connectionStatus === 'online' 
                        ? 'bg-green-500/20 text-green-100 border border-green-300/30' 
                        : connectionStatus === 'offline'
                        ? 'bg-red-500/20 text-red-100 border border-red-300/30'
                        : 'bg-yellow-500/20 text-yellow-100 border border-yellow-300/30'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        connectionStatus === 'online' ? 'bg-green-400' 
                        : connectionStatus === 'offline' ? 'bg-red-400'
                        : 'bg-yellow-400 animate-pulse'
                      }`}></div>
                      <span>
                        {connectionStatus === 'online' ? 'מאגר נתונים מחובר' 
                         : connectionStatus === 'offline' ? 'מאגר נתונים לא מחובר'
                         : 'בודק חיבור למאגר...'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/30 transition-all duration-300 border border-white/30"
                title="סגור"
                disabled={isNavigating}
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
                <ImageManager
                  recipeId={id || ''}
                  initialImages={images}
                  onImagesChange={useCallback((newImages: RecipeImage[]) => {
                    setImages(newImages);
                    setHasUnsavedChanges(true);
                  }, [setImages, setHasUnsavedChanges])}
                  maxImages={6}
                  className="space-y-3"
                />
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
                          ref={(el) => {
                            directionRefs.current[index] = el;
                            if (el) {
                              el.style.height = 'auto';
                              const minHeight = 40;
                              el.style.height = Math.max(minHeight, el.scrollHeight) + 'px';
                            }
                          }}
                          value={direction}
                          onChange={(e) => {
                            updateDirection(index, e.target.value);
                            const el = e.target as HTMLTextAreaElement;
                            el.style.height = 'auto';
                            const minHeight = 40;
                            el.style.height = Math.max(minHeight, el.scrollHeight) + 'px';
                          }}
                          rows={1}
                          className="w-full p-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-400 transition-all duration-150 resize-none text-sm min-h-[40px] overflow-hidden"
                          placeholder={`שלב ${index + 1}...`}
                          style={{ minHeight: '40px' }}
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

              {/* Upload Status */}
              {uploadStatus && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">
                        {uploadStatus}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Section - Centered Design */}
              <div className="pt-6 border-t border-gray-100">
                {/* Unsaved changes indicator */}
                {hasActualChanges && (
                  <div className="flex items-center justify-center gap-2 text-amber-600 text-xs mb-4">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    <span>יש שינויים שלא נשמרו</span>
                  </div>
                )}
                
                {/* Centered buttons */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="submit"
                    disabled={isSaving || isNavigating}
                    className="group relative overflow-hidden bg-white border border-green-200 text-green-700 hover:text-white px-6 py-2.5 rounded-full transition-all duration-300 font-medium text-sm shadow-sm hover:shadow-md hover:border-green-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
                    <div className="relative flex items-center gap-2">
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent"></div>
                          <span>שומר...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>שמור שינויים</span>
                        </>
                      )}
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isNavigating}
                    className="group relative overflow-hidden bg-white border border-red-200 text-red-600 hover:text-white px-4 py-2.5 rounded-full transition-all duration-300 font-medium text-sm shadow-sm hover:shadow-md hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
                    <div className="relative flex items-center gap-2">
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>מחק</span>
                    </div>
                  </button>
                </div>
              </div>
            </form>
            
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
                category={formData.category}
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
                type="button"
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
                type="button"
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm sm:text-base"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isNavigating}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
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