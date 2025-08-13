import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, ArrowRight, Trash2, Upload, Camera } from 'lucide-react';
import { useRecipes } from '../contexts/RecipeContext';
import { categories } from '../data/categories';

const EditRecipePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, updateRecipe, deleteRecipe } = useRecipes();
  
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
  const [showAdditionalInstructions, setShowAdditionalInstructions] = useState(false);
  const [additionalInstructions, setAdditionalInstructions] = useState<Record<string, string[]>>({});
  const [showSectionNameModal, setShowSectionNameModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      setShowAdditionalInstructions(Object.keys(recipe.additional_instructions || {}).length > 0);
    }
  }, [recipe]);

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">מתכון לא נמצא</h2>
          <button
            onClick={() => navigate('/')}
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
    setIngredients(prev => [...prev, '']);
  };

  const updateIngredient = (index: number, value: string) => {
    setIngredients(prev => prev.map((item, i) => i === index ? value : item));
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addDirection = () => {
    setDirections(prev => [...prev, '']);
  };

  const updateDirection = (index: number, value: string) => {
    setDirections(prev => prev.map((item, i) => i === index ? value : item));
  };

  const removeDirection = (index: number) => {
    setDirections(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const remainingSlots = 6 - images.length;
      const filesToProcess = files.slice(0, remainingSlots);
      
      let processedCount = 0;
      const newImages: string[] = [];
      
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          newImages.push(result);
          processedCount++;
          
          if (processedCount === filesToProcess.length) {
            setImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
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
      setShowAdditionalInstructions(true);
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
      description: '',
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
                    <div className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Upload className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                      <span>העלה תמונה</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={images.length >= 6}
                      className="hidden"
                    />
                  </label>
                  <label className={`flex-1 cursor-pointer ${images.length >= 6 ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Camera className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                      <span>צלם תמונה</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handleImageUpload}
                      disabled={images.length >= 6}
                      className="hidden"
                    />
                  </label>
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

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              תיאור המתכון *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
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
      </div>
    </div>
  );
};

export default EditRecipePage;