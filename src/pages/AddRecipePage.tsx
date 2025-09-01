import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { useProtectedAction } from '../hooks/useProtectedAction';
import type { RecipeInsert, RecipeSection } from '../types/recipe';
import { categories } from '../data/categories';
import { Plus, X, Upload, Camera, Sparkles, Link } from 'lucide-react';
import { compressImages } from '../utils/imageCompression';
import SmartImageSearch from '../components/SmartImageSearch';
import { recipeService } from '../services/recipeService';
import { imageService, RecipeImage } from '../services/imageService';
import { blobToBase64, analyzeImageUrl, processImagesForStorage, detectPlatform } from '../utils/imageUtils';

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
  const [images, setImages] = useState<RecipeImage[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [additionalInstructions, setAdditionalInstructions] = useState<{ [key: string]: string[] }>({});
  const [additionalSections, setAdditionalSections] = useState<{ [key: string]: RecipeSection }>({});

  const [showSmartImport, setShowSmartImport] = useState(false);
  const [smartImportText, setSmartImportText] = useState('');
  const [smartImportUrl, setSmartImportUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'url'>('text');
  const [isSaving, setIsSaving] = useState(false);
  const [showSectionNameModal, setShowSectionNameModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionNameWithIngredients, setNewSectionNameWithIngredients] = useState('');
  const [showSmartImageSearch, setShowSmartImageSearch] = useState(false);
  
  // Image upload states
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadStatus, setUploadStatus] = useState<string>('');
  
  // Refs for auto-focusing new input fields
  const ingredientRefs = useRef<(HTMLInputElement | null)[]>([]);
  const directionRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const sectionIngredientRefs = useRef<{ [key: string]: (HTMLInputElement | null)[] }>({});
  const sectionDirectionRefs = useRef<{ [key: string]: (HTMLTextAreaElement | null)[] }>({});

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
    const newIndex = ingredients.length;
    setIngredients([...ingredients, '']);
    
    // Focus the new input field immediately after render without losing focus
    setTimeout(() => {
      if (ingredientRefs.current[newIndex]) {
        ingredientRefs.current[newIndex]?.focus();
      }
    }, 10); // Reduced timeout for smoother experience
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    
    const currentIngredient = ingredients[index] || '';
    if (currentIngredient.trim() && !window.confirm('האם אתה בטוח שברצונך למחוק את הרכיב הזה?')) {
      return;
    }
    
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const addDirection = () => {
    const newIndex = directions.length;
    setDirections([...directions, '']);
    
    // Focus the new textarea field immediately after render without losing focus
    setTimeout(() => {
      if (directionRefs.current[newIndex]) {
        directionRefs.current[newIndex]?.focus();
      }
    }, 10); // Reduced timeout for smoother experience
  };

  const removeDirection = (index: number) => {
    if (directions.length <= 1) return;
    
    const currentDirection = directions[index] || '';
    if (currentDirection.trim() && !window.confirm('האם אתה בטוח שברצונך למחוק את השלב הזה?')) {
      return;
    }
    
    setDirections(directions.filter((_, i) => i !== index));
  };

  const updateDirection = (index: number, value: string) => {
    const newDirections = [...directions];
    newDirections[index] = value;
    setDirections(newDirections);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('📸 Processing images:', files.length);
      
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
        e.target.value = '';
        return;
      }

      // Validate files
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of imageFiles) {
        const validation = imageService.validateFile(file);
        if (validation.isValid) {
          validFiles.push(file);
        } else {
          errors.push(`${file.name}: ${validation.errors.join(', ')}`);
        }
      }

      if (errors.length > 0) {
        alert(`Some files were invalid:\n${errors.join('\n')}`);
      }

      if (validFiles.length === 0) {
        e.target.value = '';
        return;
      }

      // Add files to state for later upload
      setImageFiles(prev => [...prev, ...validFiles]);
      
      // Create temporary preview images
      const tempImages: RecipeImage[] = [];
      for (const file of validFiles) {
        const tempImage: RecipeImage = {
          id: `temp-${Date.now()}-${Math.random()}`,
          recipe_id: '',
          filename: file.name,
          file_path: '',
          url: URL.createObjectURL(file),
          image_type: 'gallery',
          file_size: file.size,
          mime_type: file.type,
          alt_text: `תמונה זמנית: ${file.name}`,
          width: 0,
          height: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        tempImages.push(tempImage);
      }

      setImages(prev => [...prev, ...tempImages]);
      
      // Reset the input
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    console.log('🗑️ Removing image at index:', index);
    const imageToRemove = images[index];
    
    // If it's a temporary image, remove from imageFiles as well
    if (imageToRemove.id.startsWith('temp-')) {
      const tempIndex = imageFiles.findIndex(file => file.name === imageToRemove.filename);
      if (tempIndex !== -1) {
        setImageFiles(prev => prev.filter((_, i) => i !== tempIndex));
      }
    }
    
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      console.log('📸 Images after removal:', newImages.length);
      return newImages;
    });
  };

  const handleSmartImageSelect = (imageUrl: string) => {
    if (images.length >= 6) {
      alert('ניתן להעלות עד 6 תמונות בלבד.');
      return;
    }
    
    // Create a temporary image from URL
    const tempImage: RecipeImage = {
      id: `temp-url-${Date.now()}`,
      recipe_id: '',
      filename: 'smart-image.jpg',
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
    
    setImages(prev => [...prev, tempImage]);
    setShowSmartImageSearch(false); // Close the modal after selecting an image
    console.log('✨ Smart image added:', imageUrl);
  };

  // Universal image processing for all platforms
  const processImagesForRecipe = async (images: RecipeImage[]): Promise<string[]> => {
    const platform = detectPlatform();
    console.log(`🔄 Processing images for ${platform} platform...`);
    
    const imageUrls = images.map(img => img.url);
    const processedUrls = await processImagesForStorage(imageUrls, title);
    
    console.log(`✅ Processed ${processedUrls.length} images for ${platform}`);
    return processedUrls;
  };

  // Upload images to server
  const uploadImagesToServer = async (recipeId: string): Promise<RecipeImage[]> => {
    if (imageFiles.length === 0) {
      return images.filter(img => !img.id.startsWith('temp-'));
    }

    setIsUploadingImages(true);
    setUploadStatus('מעלה תמונות...');
    
    // Initialize progress for each file
    const progress: { [key: string]: number } = {};
    imageFiles.forEach(file => {
      progress[file.name] = 0;
    });
    setUploadProgress(progress);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          Object.keys(newProgress).forEach(filename => {
            if (newProgress[filename] < 90) {
              newProgress[filename] += Math.random() * 10;
            }
          });
          return newProgress;
        });
      }, 200);

      const response = await imageService.uploadImages(recipeId, imageFiles, 'gallery');
      
      clearInterval(progressInterval);
      
      // Set all progress to 100%
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        Object.keys(newProgress).forEach(filename => {
          newProgress[filename] = 100;
        });
        return newProgress;
      });
      
      if (response.success) {
        setUploadStatus(`הועלו ${response.uploaded_count} תמונות בהצלחה`);
        
        // Replace temporary images with uploaded ones
        const uploadedImages = response.images;
        const existingImages = images.filter(img => !img.id.startsWith('temp-'));
        
        return [...existingImages, ...uploadedImages];
      } else {
        throw new Error('Failed to upload images');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      setUploadStatus('שגיאה בהעלאת התמונות');
      throw error;
    } finally {
      setIsUploadingImages(false);
      setImageFiles([]);
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress({});
        setUploadStatus('');
      }, 2000);
    }
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

  // Functions for managing new sections with ingredients and directions
  const removeNewSection = (sectionName: string) => {
    setAdditionalSections(prev => {
      const newSections = { ...prev };
      delete newSections[sectionName];
      return newSections;
    });
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
    setAdditionalSections(prev => {
      const currentIngredients = prev[sectionName]?.ingredients || [''];
      const newIndex = currentIngredients.length;
      
      // Focus the new input field after render
      setTimeout(() => {
        if (sectionIngredientRefs.current[sectionName]?.[newIndex]) {
          sectionIngredientRefs.current[sectionName][newIndex]?.focus();
        }
      }, 10);
      
      return {
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          ingredients: [...currentIngredients, '']
        }
      };
    });
  };

  const removeSectionIngredient = (sectionName: string, index: number) => {
    const currentIngredient = additionalSections[sectionName]?.ingredients[index] || '';
    
    if (currentIngredient.trim() && !window.confirm('האם אתה בטוח שברצונך למחוק את הרכיב הזה?')) {
      return;
    }
    
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
    setAdditionalSections(prev => {
      const currentDirections = prev[sectionName]?.directions || [''];
      const newIndex = currentDirections.length;
      
      // Focus the new textarea field after render
      setTimeout(() => {
        if (sectionDirectionRefs.current[sectionName]?.[newIndex]) {
          sectionDirectionRefs.current[sectionName][newIndex]?.focus();
        }
      }, 10);
      
      return {
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          directions: [...currentDirections, '']
        }
      };
    });
  };

  const removeSectionDirection = (sectionName: string, index: number) => {
    const currentDirection = additionalSections[sectionName]?.directions[index] || '';
    
    if (currentDirection.trim() && !window.confirm('האם אתה בטוח שברצונך למחוק את השלב הזה?')) {
      return;
    }
    
    setAdditionalSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        directions: prev[sectionName].directions.filter((_, i) => i !== index)
      }
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
    let parsedAdditionalSections: { [key: string]: RecipeSection } = {};

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
    setAdditionalSections(parsedAdditionalSections);
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
      setUploadStatus('שומר מתכון...');
      
      try {
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

        // Process images for storage (universal for all platforms)
        let processedImages: string[] = [];
        if (images.length > 0) {
          try {
            console.log('🔄 Processing images before saving...');
            processedImages = await processImagesForRecipe(images);
            console.log(`✅ Processed ${processedImages.length} images`);
          } catch (error) {
            console.error('❌ Error processing images:', error);
            // Continue without images if processing fails
            processedImages = [];
          }
        }

        const newRecipe: RecipeInsert = {
          title: title.trim(),
          category,
          difficulty: difficulty || undefined,
          ingredients: filteredIngredients,
          directions: filteredDirections,
          images: processedImages, // Use processed images
          additional_instructions: Object.keys(additionalInstructions).length > 0 ? additionalInstructions : undefined,
          additional_sections: filteredAdditionalSections,
          is_favorite: false
        };

        console.log('🔄 Submitting recipe:', newRecipe);
        
        const savedRecipe = await addRecipe(newRecipe);
        console.log('✅ Recipe saved successfully:', savedRecipe);
        
        // Verify that recipe and images were saved to database
        try {
          console.log('🔍 Verifying recipe save to database...');
          const verification = await recipeService.verifyRecipeSave(savedRecipe.id, processedImages);
          
          if (verification.success) {
            console.log('✅ Recipe and images verified in database');
            setUploadStatus('המתכון והתמונות נשמרו בהצלחה במאגר הנתונים!');
            setTimeout(() => {
              alert('המתכון והתמונות נשמרו בהצלחה במאגר הנתונים!');
            }, 500);
          } else {
            console.warn('⚠️ Recipe saved but verification failed:', verification.message);
            setUploadStatus('המתכון נשמר, אך יש בעיה עם התמונות במאגר הנתונים');
            setTimeout(() => {
              alert('המתכון נשמר, אך יש בעיה עם התמונות במאגר הנתונים.\n\nהמתכון יסונכרן אוטומטית כשהחיבור יחזור.');
            }, 500);
          }
        } catch (verifyError) {
          console.error('❌ Error verifying recipe save:', verifyError);
          setUploadStatus('המתכון נשמר, אך לא ניתן לוודא את השמירה במאגר הנתונים');
          setTimeout(() => {
            alert('המתכון נשמר, אך לא ניתן לוודא את השמירה במאגר הנתונים.\n\nהמתכון יסונכרן אוטומטית כשהחיבור יחזור.');
          }, 500);
        }
        
        // Force refresh recipes in context to ensure the new recipe is visible
        await refreshRecipes();
        
        // Navigate to recipe detail page
        navigate(`/recipe/${savedRecipe.id}`);
        
        console.log('✅ Recipe submission completed successfully');
        
        // Reset saving state
        setIsSaving(false);
        
        // Clear status after navigation
        setTimeout(() => {
          setUploadStatus('');
          setUploadProgress({});
        }, 1000);
        
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
        
        setUploadStatus(`שגיאה: ${errorMessage}`);
        setTimeout(() => {
          alert(errorMessage);
        }, 500);
        
        // Reset saving state
        setIsSaving(false);
        
        // Clear status
        setTimeout(() => {
          setUploadStatus('');
          setUploadProgress({});
        }, 2000);
      }
    });
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-rose-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-100/50 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">הוספת מתכון חדש</h1>
                <p className="text-orange-100 text-sm">צרו מתכון חדש בקלות ובאלגנטיות</p>
              </div>
              <button
                onClick={() => setShowSmartImport(true)}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all duration-300 border border-white/30 shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
                יבוא חכם
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
                  <label className="block text-xs font-medium text-gray-600">
                    שם המתכון
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-400 transition-all duration-150 text-sm"
                    placeholder="הכנס שם המתכון..."
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-600">
                    קטגוריה
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-400 transition-all duration-150 text-sm"
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

              <div className="mt-4 space-y-1.5">
                <label className="block text-xs font-medium text-gray-600">
                  רמת קושי
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "קל" | "בינוני" | "קשה" | "")}
                  className="w-full md:w-1/2 p-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-400 transition-all duration-150 text-sm"
                >
                  <option value="">בחר רמת קושי</option>
                  <option value="קל">קל</option>
                  <option value="בינוני">בינוני</option>
                  <option value="קשה">קשה</option>
                </select>
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
                  onClick={(e) => {
                    e.preventDefault();
                    addIngredient();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addIngredient();
                  }}
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium bg-white hover:bg-orange-50 px-3 py-2 rounded-md transition-all duration-200 border border-dashed border-orange-300 hover:border-orange-400 w-full justify-center text-sm touch-manipulation"
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
                          // Auto-resize textarea to match content
                          if (el) {
                            el.style.height = 'auto';
                            const minHeight = 40; // Match ingredient input height
                            el.style.height = Math.max(minHeight, el.scrollHeight) + 'px';
                          }
                        }}
                        value={direction}
                        onChange={(e) => {
                          updateDirection(index, e.target.value);
                          // Auto-resize on change
                          const el = e.target as HTMLTextAreaElement;
                          el.style.height = 'auto';
                          const minHeight = 40; // Match ingredient input height
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
                  onClick={(e) => {
                    e.preventDefault();
                    addDirection();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addDirection();
                  }}
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium bg-white hover:bg-orange-50 px-3 py-2 rounded-md transition-all duration-200 border border-dashed border-orange-300 hover:border-orange-400 w-full justify-center text-sm touch-manipulation"
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
                            {section.ingredients.map((ingredient, index) => {
                              // Initialize refs for this section if not exists
                              if (!sectionIngredientRefs.current[sectionName]) {
                                sectionIngredientRefs.current[sectionName] = [];
                              }
                              
                              return (
                                <div key={index} className="flex gap-2 items-center group">
                                  <div className="flex-shrink-0 w-4 h-4 bg-green-400 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                    {index + 1}
                                  </div>
                                  <input
                                    ref={(el) => {
                                      if (sectionIngredientRefs.current[sectionName]) {
                                        sectionIngredientRefs.current[sectionName][index] = el;
                                      }
                                    }}
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
                                      title="הסר רכיב"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => addSectionIngredient(sectionName)}
                              onTouchStart={(e) => {
                                // Only prevent default if it's not a primary touch (to allow click events)
                                if (e.touches.length > 1) {
                                  e.preventDefault();
                                }
                              }}
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
                            {section.directions.map((direction, index) => {
                              // Initialize refs for this section if not exists
                              if (!sectionDirectionRefs.current[sectionName]) {
                                sectionDirectionRefs.current[sectionName] = [];
                              }
                              
                              return (
                                <div key={index} className="flex gap-2 group">
                                  <div className="bg-blue-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1">
                                    {index + 1}
                                  </div>
                                  <textarea
                                    ref={(el) => {
                                      if (sectionDirectionRefs.current[sectionName]) {
                                        sectionDirectionRefs.current[sectionName][index] = el;
                                      }
                                    }}
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
                                      title="הסר שלב"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => addSectionDirection(sectionName)}
                              onTouchStart={(e) => {
                                // Only prevent default if it's not a primary touch (to allow click events)
                                if (e.touches.length > 1) {
                                  e.preventDefault();
                                }
                              }}
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

            {/* Additional Instructions */}
            {Object.keys(additionalInstructions).length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-xl border border-yellow-100">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  הוראות נוספות
                </h2>
                <div className="space-y-4">
                  {Object.entries(additionalInstructions).map(([sectionName, instructions]) => (
                    <div key={sectionName} className="bg-white p-5 rounded-xl border-2 border-yellow-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-yellow-900 flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          {sectionName}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeAdditionalInstructionSection(sectionName)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-300"
                          title={`הסר ${sectionName}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {instructions.map((instruction, index) => (
                          <div key={index} className="flex gap-3 group">
                            <div className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1">
                              {index + 1}
                            </div>
                            <textarea
                              value={instruction}
                              onChange={(e) => updateAdditionalInstruction(sectionName, index, e.target.value)}
                              rows={2}
                              className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-200 focus:border-yellow-300 transition-all duration-200 text-sm resize-none"
                              placeholder={`שלב ${index + 1} ב${sectionName}`}
                            />
                            {instructions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAdditionalInstructionStep(sectionName, index)}
                                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100 self-start"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addAdditionalInstructionStep(sectionName)}
                          className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700 font-medium text-sm bg-yellow-50 hover:bg-yellow-100 px-3 py-2 rounded-lg transition-all duration-300 border border-yellow-200"
                        >
                          <Plus className="w-4 h-4" />
                          הוסף שלב ל{sectionName}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


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
                          src={image.url}
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
            {(isUploadingImages || uploadStatus) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {isUploadingImages && (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">
                      {uploadStatus || 'מעבד תמונות...'}
                    </p>
                    {Object.keys(uploadProgress).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(uploadProgress).map(([filename, progress]) => (
                          <div key={filename} className="flex items-center gap-2">
                            <div className="flex-1 bg-blue-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-blue-600">{filename}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Section */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isSaving || isUploadingImages}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 px-6 rounded-lg hover:from-orange-600 hover:to-rose-600 transition-all duration-200 font-semibold disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {isSaving || isUploadingImages ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>{isUploadingImages ? 'מעלה תמונות...' : 'שומר מתכון...'}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                      <span>שמור מתכון</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/recipes')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-white hover:border-gray-400 transition-all duration-200 font-medium"
                >
                  ביטול
                </button>
              </div>
            </div>
          </form>
          </div>
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

      {/* New Section Modal (with ingredients and directions) */}
      {showNewSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 mx-2 sm:mx-0">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">הוסף חלק חדש עם מרכיבים</h3>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">הכנס שם לחלק החדש (למשל: רוטב, בצק, מילוי, קרם):</p>
            <input
              type="text"
              value={newSectionNameWithIngredients}
              onChange={(e) => setNewSectionNameWithIngredients(e.target.value)}
              className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-base"
              placeholder="שם החלק..."
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddNewSection();
                }
              }}
            />
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-xs text-blue-700">
                חלק זה יכלול גם מרכיבים וגם שלבי הכנה נפרדים
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddNewSection}
                disabled={!newSectionNameWithIngredients.trim()}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                הוסף חלק
              </button>
              <button
                onClick={handleCancelNewSection}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Image Search Modal */}
      {showSmartImageSearch && (
        <SmartImageSearch
          recipeName={title}
          category={category}
          onImageSelect={handleSmartImageSelect}
          onClose={() => setShowSmartImageSearch(false)}
        />
      )}
    </div>
  );
};

export default AddRecipePage;