import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { useProtectedAction } from '../hooks/useProtectedAction';
import type { RecipeInsert, Recipe } from '../types/recipe';
import { categories } from '../data/categories';
import { Plus, X, Upload, Camera, Sparkles, Link, Eye, Edit, Trash2 } from 'lucide-react';
import { compressImages } from '../utils/imageCompression';

const AddRecipePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addRecipe, refreshRecipes } = useRecipes();
  const { executeProtectedAction } = useProtectedAction();
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [difficulty, setDifficulty] = useState<"קל" | "בינוני" | "קשה" | "">('');
  const [ingredients, setIngredients] = useState(['']);
  const [directions, setDirections] = useState(['']);
  const [images, setImages] = useState<string[]>([]);
  const [additionalInstructions, setAdditionalInstructions] = useState<{ [key: string]: string[] }>({});
  const [showAdditionalInstructions, setShowAdditionalInstructions] = useState(false);
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [smartImportText, setSmartImportText] = useState('');
  const [smartImportUrl, setSmartImportUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'url'>('text');
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSectionNameModal, setShowSectionNameModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Check authentication when page loads
  useEffect(() => {
    executeProtectedAction(() => {
      // If not authenticated, the modal will show
      // If authenticated, nothing happens and user can proceed
    });
    
    // Always scroll to top when page loads
    window.scrollTo(0, 0);
  }, []);

  const addIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const addDirection = () => {
    setDirections([...directions, '']);
  };

  const removeDirection = (index: number) => {
    if (directions.length > 1) {
      setDirections(directions.filter((_, i) => i !== index));
    }
  };

  const updateDirection = (index: number, value: string) => {
    const newDirections = [...directions];
    newDirections[index] = value;
    setDirections(newDirections);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      console.log('📸 Uploading images:', files.length);
      
      // Check if adding these images would exceed the 6 image limit
      if (images.length + files.length > 6) {
        alert(`ניתן להעלות עד 6 תמונות בלבד. כרגע יש לך ${images.length} תמונות ואתה מנסה להוסיף ${files.length} נוספות.`);
        return;
      }
      
      compressImages(files) // Use HD quality compression
        .then(compressedImages => {
          console.log('✅ Images compressed successfully:', compressedImages.length);
          setImages(prev => {
            const newImages = [...prev, ...compressedImages];
            console.log('📸 Total images after upload:', newImages.length);
            return newImages.slice(0, 6); // Ensure we never exceed 6 images
          });
        })
        .catch(error => {
          console.error('❌ Error compressing images:', error);
          alert(error.message || 'שגיאה בדחיסת התמונות');
        });
    }
  };

  const removeImage = (index: number) => {
    console.log('🗑️ Removing image at index:', index);
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      console.log('📸 Images after removal:', newImages.length);
      return newImages;
    });
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

  const parseSmartImport = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    
    let parsedTitle = '';
    let parsedCategory = '';
    let parsedDifficulty: "קל" | "בינוני" | "קשה" | "" = '';
    let parsedIngredients: string[] = [];
    let parsedDirections: string[] = [];
    let parsedAdditionalInstructions: { [key: string]: string[] } = {};

    let currentSection = '';
    let currentAdditionalSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim().replace(/^[•\-*]\s*/, ''); // Remove bullet points
      
      // Parse title - look for "שם המתכון" section
      if (trimmedLine.includes('שם המתכון') || trimmedLine.includes('שם') && trimmedLine.includes('מתכון')) {
        currentSection = 'title';
        continue;
      }
      
      // If we're in title section and haven't found title yet
      if (currentSection === 'title' && !parsedTitle && trimmedLine.length > 0) {
        parsedTitle = trimmedLine;
        currentSection = '';
        continue;
      }
      
      if (trimmedLine.includes('קטגוריה') || trimmedLine.includes('category')) {
        currentSection = 'category';
        const catMatch = trimmedLine.split(':')[1];
        continue;
      }
      
      // If we're in category section
      if (currentSection === 'category' && trimmedLine.length > 0) {
        const cat = trimmedLine.toLowerCase();
        if (cat.includes('עוגה') || cat.includes('cake')) parsedCategory = 'cakes';
        else if (cat.includes('מרק') || cat.includes('soup')) parsedCategory = 'soups';
        else if (cat.includes('סלט') || cat.includes('salad')) parsedCategory = 'salads';
        else if (cat.includes('בשר') || cat.includes('meat')) parsedCategory = 'meat';
        else if (cat.includes('צמחוני') || cat.includes('vegetarian')) parsedCategory = 'vegetarian';
        else if (cat.includes('מאפה') || cat.includes('pastry')) parsedCategory = 'pastries';
        else if (cat.includes('עוגיות') || cat.includes('cookies')) parsedCategory = 'cookies';
        else if (cat.includes('קינוח') || cat.includes('dessert')) parsedCategory = 'desserts';
        else if (cat.includes('ארוחת בוקר') || cat.includes('breakfast')) parsedCategory = 'breakfast';
        else if (cat.includes('תוספת') || cat.includes('טיבול') || cat.includes('sides')) parsedCategory = 'sides';
        else if (cat.includes('פשטידה') || cat.includes('פשטידות') || cat.includes('pie') || cat.includes('pies')) parsedCategory = 'pies';
        currentSection = '';
        continue;
      }
      
      if (trimmedLine.includes('קושי') || trimmedLine.includes('difficulty')) {
        currentSection = 'difficulty';
        const diffMatch = trimmedLine.split(':')[1];
        continue;
      }
      
      // If we're in difficulty section
      if (currentSection === 'difficulty' && trimmedLine.length > 0) {
        const diff = trimmedLine.toLowerCase();
        if (diff.includes('קל') || diff.includes('easy')) parsedDifficulty = 'קל';
        else if (diff.includes('בינוני') || diff.includes('medium')) parsedDifficulty = 'בינוני';
        else if (diff.includes('קשה') || diff.includes('hard')) parsedDifficulty = 'קשה';
        currentSection = '';
        continue;
      }
      
      if (trimmedLine.includes('רכיבים') || trimmedLine.includes('ingredients')) {
        // Check if it's additional ingredients section
        if (trimmedLine.includes('רכיבים ל') || trimmedLine.includes('ingredients for')) {
          const sectionName = trimmedLine.replace(/רכיבים ל|ingredients for/gi, '').trim();
          currentAdditionalSection = sectionName;
          currentSection = 'additional_ingredients';
          if (!parsedAdditionalInstructions[sectionName]) {
            parsedAdditionalInstructions[sectionName] = [];
          }
        } else {
          currentSection = 'ingredients';
          currentAdditionalSection = '';
        }
        continue;
      }
      
      if (trimmedLine.includes('הוראות') || trimmedLine.includes('directions') || trimmedLine.includes('אופן הכנה')) {
        currentSection = 'directions';
        currentAdditionalSection = '';
        continue;
      }
      
      if (currentSection === 'ingredients' && trimmedLine.length > 0) {
        parsedIngredients.push(trimmedLine);
      } else if (currentSection === 'additional_ingredients' && trimmedLine.length > 0 && currentAdditionalSection) {
        parsedAdditionalInstructions[currentAdditionalSection].push(trimmedLine);
      } else if (currentSection === 'directions' && trimmedLine.length > 0) {
        parsedDirections.push(trimmedLine.replace(/^\d+\.\s*/, ''));
      }
    }

    // If no title found in structured format, use first line
    if (!parsedTitle && lines.length > 0) {
      parsedTitle = lines[0].trim().replace(/^[•\-*]\s*/, '');
    }

    if (parsedIngredients.length === 0) parsedIngredients = [''];
    if (parsedDirections.length === 0) parsedDirections = [''];

    setTitle(parsedTitle);
    setCategory(parsedCategory);
    setDifficulty(parsedDifficulty);
    setIngredients(parsedIngredients);
    setDirections(parsedDirections);
    setAdditionalInstructions(parsedAdditionalInstructions);
    setShowSmartImport(false);
    setSmartImportText('');
  };

  const handleSmartImportFromUrl = async () => {
    if (!smartImportUrl.trim()) {
      alert('אנא הכנס קישור תקין');
      return;
    }

    try {
      // Use a CORS proxy to fetch the content
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(smartImportUrl)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (data.contents) {
        // Parse the HTML content to extract recipe information
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        
        // Try to extract recipe data from common recipe schema formats
        let extractedTitle = '';
        let extractedIngredients: string[] = [];
        let extractedDirections: string[] = [];
        
        // Try JSON-LD structured data first
        const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
        for (const script of jsonLdScripts) {
          try {
            const jsonData = JSON.parse(script.textContent || '');
            if (jsonData['@type'] === 'Recipe' || (Array.isArray(jsonData) && jsonData.some(item => item['@type'] === 'Recipe'))) {
              const recipe = Array.isArray(jsonData) ? jsonData.find(item => item['@type'] === 'Recipe') : jsonData;
              if (recipe) {
                extractedTitle = recipe.name || '';
                if (recipe.recipeIngredient) {
                  extractedIngredients = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [recipe.recipeIngredient];
                }
                if (recipe.recipeInstructions) {
                  extractedDirections = Array.isArray(recipe.recipeInstructions) 
                    ? recipe.recipeInstructions.map((inst: any) => inst.text || inst)
                    : [recipe.recipeInstructions];
                }
                break;
              }
            }
          } catch (e) {
            // Continue to next script if parsing fails
          }
        }
        
        // Fallback to HTML parsing if no structured data found
        if (!extractedTitle) {
          const titleElement = doc.querySelector('h1') || doc.querySelector('title');
          extractedTitle = titleElement?.textContent?.trim() || '';
        }
        

        
        if (extractedIngredients.length === 0) {
          const ingredientElements = doc.querySelectorAll('.recipe-ingredient, .ingredient, li');
          extractedIngredients = Array.from(ingredientElements)
            .map(el => el.textContent?.trim())
            .filter((text): text is string => text !== undefined && text.length > 0)
            .slice(0, 20); // Limit to reasonable number
        }
        
        if (extractedDirections.length === 0) {
          const directionElements = doc.querySelectorAll('.recipe-instruction, .instruction, .step, ol li');
          extractedDirections = Array.from(directionElements)
            .map(el => el.textContent?.trim())
            .filter((text): text is string => text !== undefined && text.length > 0)
            .slice(0, 20); // Limit to reasonable number
        }
        
        // Set the extracted data
        if (extractedTitle) setTitle(extractedTitle);
        if (extractedIngredients.length > 0) setIngredients(extractedIngredients);
        if (extractedDirections.length > 0) setDirections(extractedDirections);
        
        setShowSmartImport(false);
        setSmartImportUrl('');
        
        if (extractedTitle || extractedIngredients.length > 0) {
          alert('המתכון יובא בהצלחה! בדוק את השדות ועדכן לפי הצורך.');
        } else {
          alert('לא הצלחנו לחלץ מידע מהקישור. נסה להעתיק את התוכן ידנית.');
        }
      } else {
        alert('לא הצלחנו לקרוא את התוכן מהקישור. נסה קישור אחר.');
      }
    } catch (error) {
      console.error('Error importing from URL:', error);
      alert('שגיאה בקריאת הקישור. נסה שוב או השתמש ביבוא מטקסט.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSaving) return;
    
    // Protect the submit action
    executeProtectedAction(async () => {
      if (!title.trim() || !category) {
        alert('אנא מלא את שם המתכון והקטגוריה');
        return;
      }

      const filteredIngredients = ingredients.filter(ing => ing.trim());
      const filteredDirections = directions.filter(dir => dir.trim());

      if (filteredIngredients.length === 0 || filteredDirections.length === 0) {
        alert('אנא הוסף לפחות רכיב אחד והוראה אחת');
        return;
      }

      setIsSaving(true);
      
      try {
        const newRecipe: RecipeInsert = {
          title: title.trim(),
          category,
          difficulty: difficulty || undefined,
          ingredients: filteredIngredients,
          directions: filteredDirections,
          images,
          additional_instructions: Object.keys(additionalInstructions).length > 0 ? additionalInstructions : undefined,
          is_favorite: false
        };

        console.log('🔄 Submitting recipe:', newRecipe);
        
        const savedRecipe = await addRecipe(newRecipe);
        console.log('✅ Recipe saved successfully:', savedRecipe);
        
        // Force refresh recipes in context to ensure the new recipe is visible
        await refreshRecipes();
        
        setPreviewRecipe({
          ...savedRecipe,
          is_favorite: savedRecipe.is_favorite,
          created_at: savedRecipe.created_at,
          updated_at: savedRecipe.updated_at
        });
        
        console.log('✅ Recipe submission completed successfully');
        
      } catch (error) {
        console.error('❌ Error adding recipe:', error);
        
        // Better error handling for mobile
        let errorMessage = 'שגיאה בשמירת המתכון';
        if (error instanceof Error) {
          if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'בעיית חיבור לאינטרנט. המתכון נשמר במכשיר ויסונכרן כשהחיבור יחזור.';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'הבקשה לקחה זמן רב מדי. המתכון נשמר במכשיר ויסונכרן בהמשך.';
          } else {
            errorMessage = `שגיאה: ${error.message}`;
          }
        }
        
        alert(errorMessage);
        
        // Reset saving state
        setIsSaving(false);
      }
    });
  };

  const handlePreviewAction = (action: 'view' | 'edit' | 'delete') => {
    if (!previewRecipe) return;

    switch (action) {
      case 'view':
        navigate(`/recipe/${previewRecipe.id}`);
        break;
      case 'edit':
        navigate(`/edit/${previewRecipe.id}`);
        break;
      case 'delete':
        executeProtectedAction(() => {
          // Delete the recipe and reset form
          setPreviewRecipe(null);
          setTitle('');
          setCategory('');
          setDifficulty('');
          setIngredients(['']);
          setDirections(['']);
          setImages([]);
          setAdditionalInstructions({});
        });
        break;
    }
  };

  if (previewRecipe) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">המתכון נשמר בהצלחה!</h1>
              <p className="text-gray-600">בחר מה תרצה לעשות עכשיו:</p>
            </div>

            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => handlePreviewAction('view')}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Eye className="w-5 h-5" />
                אישור ותצוגה
              </button>
              <button
                onClick={() => handlePreviewAction('edit')}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-5 h-5" />
                ערוך מתכון
              </button>
              <button
                onClick={() => handlePreviewAction('delete')}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                מחק מתכון
              </button>
            </div>

            <h2 className="text-xl font-bold mb-4">{previewRecipe.title}</h2>

            {previewRecipe.images && previewRecipe.images.length > 0 && (
              <div className="mb-4">
                <img
                  src={previewRecipe.images[0]}
                  alt={previewRecipe.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="font-semibold">קטגוריה: </span>
                <span>{categories.find(cat => cat.id === previewRecipe.category)?.name}</span>
              </div>
              <div>
                <span className="font-semibold">רמת קושי: </span>
                <span>{previewRecipe.difficulty}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">רכיבים:</h3>
                <ul className="space-y-2">
                  {previewRecipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">הוראות הכנה:</h3>
                <ol className="space-y-3">
                  {previewRecipe.directions.map((direction, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span>{direction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">הוספת מתכון חדש</h1>
            <button
              onClick={() => setShowSmartImport(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              יבוא חכם
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם המתכון *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="הכנס שם המתכון..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קטגוריה *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">בחר קטגוריה</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                רמת קושי
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as "קל" | "בינוני" | "קשה" | "")}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">בחר רמת קושי</option>
                <option value="קל">קל</option>
                <option value="בינוני">בינוני</option>
                <option value="קשה">קשה</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                רכיבים *
              </label>
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={ingredient}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={`רכיב ${index + 1}`}
                    />
                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIngredient}
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  הוסף רכיב
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                הוראות הכנה *
              </label>
              <div className="space-y-2">
                {directions.map((direction, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-2">
                      {index + 1}
                    </div>
                    <textarea
                      value={direction}
                      onChange={(e) => updateDirection(index, e.target.value)}
                      rows={2}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={`שלב ${index + 1}`}
                    />
                    {directions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDirection(index)}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDirection}
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  הוסף שלב
                </button>
              </div>
            </div>

            {/* Additional Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                הוראות נוספות (אופציונלי)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                הוסף חלקים נוספים כמו רוטב, בצק, מילוי וכו'
              </p>
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
                          <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-2">
                            {index + 1}
                          </div>
                          <textarea
                            value={instruction}
                            onChange={(e) => updateAdditionalInstruction(sectionName, index, e.target.value)}
                            rows={2}
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
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
                        className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
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
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  הוסף חלק הוראות חדש
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תמונות
              </label>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-5 h-5" />
                    העלה תמונות
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  <label className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg cursor-pointer transition-colors">
                    <Camera className="w-5 h-5" />
                    צלם תמונה
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`תמונה ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:bg-orange-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>שומר...</span>
                  </>
                ) : (
                  <span>שמור מתכון</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/recipes')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Smart Import Modal */}
      {showSmartImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">יבוא חכם</h2>
                <button
                  onClick={() => setShowSmartImport(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex mb-4 border-b">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'text'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  מטקסט
                </button>
                <button
                  onClick={() => setActiveTab('url')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'url'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  מקישור
                </button>
              </div>

              {activeTab === 'text' ? (
                <div>
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-blue-800 mb-2">💡 חשוב לדעת:</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      <strong>חלק את הטקסט לחלקים עם כותרות ברורות:</strong>
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1 mr-4">
                      <li>• <strong>שם המתכון</strong></li>
                      <li>• <strong>קטגוריה</strong></li>
                      <li>• <strong>רמת קושי</strong></li>
                      <li>• <strong>רכיבים</strong></li>
                      <li>• <strong>רכיבים לרוטב</strong> (אופציונלי)</li>
                      <li>• <strong>הוראות הכנה</strong></li>
                    </ul>
                  </div>
                  <p className="text-gray-600 mb-4">
                    הדבק את טקסט המתכון והמערכת תמלא את השדות אוטומטית:
                  </p>
                  <textarea
                    value={smartImportText}
                    onChange={(e) => setSmartImportText(e.target.value)}
                    rows={8}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="דוגמה (חשוב לכתוב כותרות):
שם המתכון
• עוגת שוקולד
קטגוריה: עוגות
• עוגות
רמת קושי: קל
• קל

רכיבים:
• 2 כוסות קמח
• 1 כוס סוכר
• 3 ביצים

הוראות הכנה:
• מערבבים את הקמח והסוכר
• מוסיפים את הביצים
• אופים ב-180 מעלות"
                  />
                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={() => parseSmartImport(smartImportText)}
                      disabled={!smartImportText.trim()}
                      className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      יבא מתכון
                    </button>
                    <button
                      onClick={() => setShowSmartImport(false)}
                      className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">
                    הכנס קישור למתכון מאתרים נתמכים והמערכת תייבא אותו אוטומטית:
                  </p>
                  <input
                    type="url"
                    value={smartImportUrl}
                    onChange={(e) => setSmartImportUrl(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
                    placeholder="https://example.com/recipe"
                  />
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-blue-800 mb-2">אתרים נתמכים:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• אתרי מתכונים ישראליים</li>
                      <li>• בלוגי בישול</li>
                      <li>• אתרי מתכונים בינלאומיים</li>
                    </ul>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleSmartImportFromUrl}
                      disabled={!smartImportUrl.trim()}
                      className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Link className="w-5 h-5" />
                      יבא מקישור
                    </button>
                    <button
                      onClick={() => setShowSmartImport(false)}
                      className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section Name Modal */}
      {showSectionNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 mx-2 sm:mx-0">
            <h3 className="text-lg font-semibold mb-4">הוסף חלק הוראות חדש</h3>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">הכנס שם לחלק ההוראות (למשל: רוטב, בצק, מילוי):</p>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4 text-base"
              placeholder="שם החלק..."
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddSection();
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleAddSection}
                disabled={!newSectionName.trim()}
                className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                הוסף
              </button>
              <button
                onClick={handleCancelSection}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
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

export default AddRecipePage;