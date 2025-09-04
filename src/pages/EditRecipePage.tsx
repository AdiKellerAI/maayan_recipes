import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, Trash2, Upload, Camera, Image as ImageIcon } from 'lucide-react';
import { useRecipes } from '../contexts/RecipeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useProtectedAction } from '../hooks/useProtectedAction';
import { useUnsavedChangesContext } from '../contexts/UnsavedChangesContext';
import { categories } from '../data/categories';
import type { RecipeSection } from '../types/recipe';
import { RecipeImage } from '../services/imageService';
import ImageManager from '../components/ImageManager';


const EditRecipePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, updateRecipe, deleteRecipe } = useRecipes();
  const { navigateToLastRecipesPage, setReferrerFromRecipes } = useNavigation();
  const { executeProtectedAction } = useProtectedAction();
  
  const recipe = recipes.find(r => r.id === id);
  
  // Debug logging
  console.log('🔍 EDIT: Looking for recipe with ID:', id);
  console.log('🔍 EDIT: Available recipes:', recipes.map(r => ({ id: r.id, title: r.title })));
  console.log('🔍 EDIT: Found recipe:', recipe ? { id: recipe.id, title: recipe.title } : 'NOT FOUND');
  
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
  const [sectionTitles, setSectionTitles] = useState<{ [key: string]: string }>({});
  
  // Controls for optional main sections
  const [includeMainIngredients, setIncludeMainIngredients] = useState(true);
  const [includeMainDirections, setIncludeMainDirections] = useState(true);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSmartImageSearch, setShowSmartImageSearch] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [saveButtonFilled, setSaveButtonFilled] = useState(false);
  const [deleteButtonFilled, setDeleteButtonFilled] = useState(false);
  // Animations for main sections
  const [isHiding, setIsHiding] = useState<{ ingredients: boolean; directions: boolean }>({ ingredients: false, directions: false });
  const [isEntering, setIsEntering] = useState<{ ingredients: boolean; directions: boolean }>({ ingredients: false, directions: false });
  
  // Refs for auto-focusing
  const ingredientRefs = useRef<(HTMLInputElement | null)[]>([]);
  const directionRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const buttonsRef = useRef<HTMLDivElement>(null);

  // Unsaved changes handling
  const { navigateWithUnsavedCheck, registerUnsavedChanges, registerSaveFunction } = useUnsavedChangesContext();
  
  // Register unsaved changes with global context
  useEffect(() => {
    registerUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, registerUnsavedChanges]);

  // Register save function with global context
  useEffect(() => {
    registerSaveFunction(async () => {
      if (hasUnsavedChanges) {
        await handleSubmit(new Event('submit') as any);
      }
    });
  }, [hasUnsavedChanges, registerSaveFunction]);



  // Initialize form data when recipe loads
  useEffect(() => {
    if (recipe) {
      console.log('🔄 EDIT: Loading recipe data, images:', recipe.images?.length || 0);
      setFormData({
        title: recipe.title,
        category: recipe.category,
        difficulty: recipe.difficulty || ''
      });
      setIngredients(recipe.ingredients || []);
      setDirections(recipe.directions || []);
      
      // Set flags based on existing data
      setIncludeMainIngredients((recipe.ingredients && recipe.ingredients.length > 0) || false);
      setIncludeMainDirections((recipe.directions && recipe.directions.length > 0) || false);
      
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
        alt_text: `תמונה ${index + 1}`,
        width: 0,
        height: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      console.log('🖼️ EDIT: Converted images:', existingImages.map(img => ({ id: img.id, url: img.url.substring(0, 50) + '...' })));
      setImages(existingImages);
      setAdditionalSections(recipe.additional_sections || {});
      // Initialize section titles with existing section names
      const titles: { [key: string]: string } = {};
      Object.keys(recipe.additional_sections || {}).forEach(sectionName => {
        // If the section name looks like a technical ID, give it a default name
        if (sectionName.startsWith('section-') || sectionName.startsWith('temp_')) {
          titles[sectionName] = 'חלק נוסף';
        } else {
          titles[sectionName] = sectionName;
        }
      });
      setSectionTitles(titles);
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



  // Note: beforeunload handling is now managed by useUnsavedChanges hook

  // Intersection Observer for button animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Buttons are visible, start fill animation
            if (!buttonsVisible) {
              setButtonsVisible(true);
              // Animate save button first (right to left in RTL) - faster timing
              setTimeout(() => setSaveButtonFilled(true), 100);
              // Then animate delete button - faster timing
              setTimeout(() => setDeleteButtonFilled(true), 500);
            }
          } else {
            // Buttons are not visible, reset them
            setButtonsVisible(false);
            setSaveButtonFilled(false);
            setDeleteButtonFilled(false);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (buttonsRef.current) {
      observer.observe(buttonsRef.current);
    }

    return () => observer.disconnect();
  }, [buttonsVisible]);

  // Safe navigation function
  const safeNavigate = useCallback(async (path: string) => {
    if (isNavigating) return; // Prevent multiple navigations
    
    setIsNavigating(true);
    
    // Use the unsaved changes hook to handle navigation
    await navigateWithUnsavedCheck(path);
    
    // Reset navigation state after a delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 200);
  }, [navigateWithUnsavedCheck, isNavigating]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  };

  // Simple image compression function
  const compressImageSimple = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Cannot get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate new dimensions - more aggressive sizing for base64 with 4 image limit
        let { width, height } = img;
        const maxDimension = 600; // Reduced from 800 to 600 for better PostgreSQL compatibility
        
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        // Additional aggressive resizing for very large images
        if (file.size > 3 * 1024 * 1024) { // If original > 3MB (reduced from 5MB)
          const aggressiveMaxDimension = 500; // Reduced from 600 to 500
          if (width > aggressiveMaxDimension || height > aggressiveMaxDimension) {
            const ratio = Math.min(aggressiveMaxDimension / width, aggressiveMaxDimension / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`✅ Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          0.3 // More aggressive compression for base64 conversion with 4 image limit
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };



  // Handle file selection for images
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('📸 Processing images in EditRecipePage:', files.length, 'files');

    // Check image limit
    if (images.length + files.length > 4) {
      alert(`ניתן להעלות עד 4 תמונות בלבד. כרגע יש לך ${images.length} תמונות ואתה מנסה להוסיף ${files.length} נוספות.`);
      e.target.value = '';
      return;
    }

    try {
      setIsLoading(true);
      setUploadStatus('מעבד תמונות...');

      const fileArray = Array.from(files);
      
      // Convert files to RecipeImage objects with base64
      const newImages: RecipeImage[] = await Promise.all(
        fileArray.map(async (file, index) => {
          // Always compress images for better upload performance
          console.log(`🔄 Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
          const processedFile = await compressImageSimple(file);
          
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Additional check for base64 size
              const sizeInKB = Math.round(result.length / 1024);
              console.log(`📸 Base64 size for ${file.name}: ${sizeInKB}KB`);
              
              // Warn if still too large
              if (sizeInKB > 800) {
                console.warn(`⚠️ Large base64 image: ${file.name} (${sizeInKB}KB)`);
              }
              
              resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(processedFile);
          });

          return {
            id: `temp-${Date.now()}-${index}`,
            recipe_id: id || '',
            filename: file.name,
            file_path: '',
            url: base64, // Use base64 directly
            image_type: 'gallery',
            file_size: processedFile.size, // Use compressed file size
            mime_type: 'image/jpeg', // Always JPEG after compression,
            alt_text: `תמונה ${images.length + index + 1}`,
            width: 0,
            height: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        })
      );

      setImages(prev => [...prev, ...newImages]);
      setHasUnsavedChanges(true);
      setUploadStatus(`הועלו ${newImages.length} תמונות בהצלחה!`);
      console.log('✅ EDIT: Added', newImages.length, 'new images as base64');
      
      // Clear status after 2 seconds
      setTimeout(() => setUploadStatus(''), 2000);

    } catch (error) {
      console.error('❌ EDIT: Error processing images:', error);
      setUploadStatus('שגיאה בעיבוד התמונות');
      setTimeout(() => setUploadStatus(''), 3000);
    } finally {
      setIsLoading(false);
      // Reset file input
      e.target.value = '';
    }
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



  // Additional sections management
  const addNewSection = () => {
    // Add a new section with empty title, ingredients and directions
    const tempKey = `temp_${Date.now()}`;
    setAdditionalSections(prev => ({
      ...prev,
      [tempKey]: {
        ingredients: [''],
        directions: ['']
      }
    }));
    setSectionTitles(prev => ({
      ...prev,
      [tempKey]: ''
    }));
    setHasUnsavedChanges(true);
  };

  const updateSectionTitle = (sectionKey: string, newTitle: string) => {
    // Always update the temporary title state immediately
    setSectionTitles(prev => ({
      ...prev,
      [sectionKey]: newTitle
    }));
    setHasUnsavedChanges(true);
  };

  const finalizeSectionTitle = (oldKey: string) => {
    const newTitle = sectionTitles[oldKey]?.trim();
    
    if (!newTitle) {
      return; // Keep temp key if no title
    }
    
    // If this is a temp section and we have a title, update the section key
    if (oldKey.startsWith('temp_') && newTitle) {
      // Check if the new title already exists
      if (additionalSections[newTitle]) {
        alert('כותרת זו כבר קיימת, נא לבחור כותרת אחרת');
        return;
      }
      
      setAdditionalSections(prev => {
        const newSections = { ...prev };
        const sectionData = newSections[oldKey];
        delete newSections[oldKey];
        newSections[newTitle] = sectionData;
        return newSections;
      });
      
      setSectionTitles(prev => {
        const newTitles = { ...prev };
        delete newTitles[oldKey];
        newTitles[newTitle] = newTitle;
        return newTitles;
      });
    }
  };

  const removeNewSection = (sectionName: string) => {
    setAdditionalSections(prev => {
      const newSections = { ...prev };
      delete newSections[sectionName];
      return newSections;
    });
    setSectionTitles(prev => {
      const newTitles = { ...prev };
      delete newTitles[sectionName];
      return newTitles;
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
      
      // Basic validation
      if (!formData.title || !formData.category) {
        alert('נא למלא את שם המתכון והקטגוריה');
        return;
      }
      
      // Content validation - at least one section must have content
      const hasMainIngredients = includeMainIngredients && filteredIngredients.length > 0;
      const hasMainDirections = includeMainDirections && filteredDirections.length > 0;
      const hasAdditionalSections = Object.keys(additionalSections).length > 0;
      
      if (!hasMainIngredients && !hasMainDirections && !hasAdditionalSections) {
        alert('המתכון חייב לכלול לפחות אחד מהבאים: רכיבים עיקריים, הוראות עיקריות, או חלקים נוספים');
        return;
      }

      setIsSaving(true);
      setUploadStatus('שומר מתכון...');
      
      // Filter and validate additional sections
      const filteredAdditionalSections: { [key: string]: RecipeSection } = {};
      for (const [sectionName, section] of Object.entries(additionalSections)) {
        const filteredIngredients = section.ingredients.filter(ing => ing.trim());
        const filteredDirections = section.directions.filter(dir => dir.trim());
        
        if (filteredIngredients.length > 0 || filteredDirections.length > 0) {
          // Check if section has content but no proper title
          const sectionTitle = sectionTitles[sectionName]?.trim();
          if (!sectionTitle || sectionName.startsWith('temp_')) {
            alert('נא להוסיף כותרת לחלק הנוסף שהוספת (למשל: מלית, בצק, רוטב)');
            setIsSaving(false);
            setUploadStatus('');
            return;
          }
          
          // Use the final title as the key, but ensure it's not a technical ID
          let finalKey = sectionTitle || sectionName;
          if (finalKey.startsWith('section-') || finalKey.startsWith('temp_')) {
            finalKey = 'חלק נוסף';
          }
          
          filteredAdditionalSections[finalKey] = {
            ingredients: filteredIngredients,
            directions: filteredDirections
          };
        }
      }

              // Use images directly without complex processing
        const finalImageUrls: string[] = images.map(img => img.url);
        console.log(`📸 Using ${finalImageUrls.length} images directly:`, finalImageUrls.map(url => url.substring(0, 50) + '...'));
      
              const updatedRecipe = {
          id: recipe!.id, // Include the recipe ID
          ...formData,
          ingredients: includeMainIngredients ? filteredIngredients : [],
          directions: includeMainDirections ? filteredDirections : [],
          images: finalImageUrls,
          difficulty: formData.difficulty || undefined,
          additional_sections: filteredAdditionalSections
        };

      try {
        console.log('🔄 EDIT: Updating recipe with images:', images.length);
        
        // Handle temporary images from SmartImageSearch
        console.log('📸 EDIT: Skipping temporary image processing - using direct save');
        
        // Save the recipe directly
        setUploadStatus('מעדכן מתכון...');
        console.log('🔄 Updating recipe:', {
          id: recipe!.id,
          title: updatedRecipe.title,
          imagesCount: finalImageUrls?.length || 0,
          fullUpdatedRecipe: updatedRecipe
        });
        
        console.log('🔄 EDIT: About to call updateRecipe with ID:', recipe!.id);
        console.log('🔄 EDIT: ID type:', typeof recipe!.id);
        console.log('🔄 EDIT: Recipe exists before update:', recipe ? 'YES' : 'NO');
        console.log('🔄 EDIT: Recipe object:', recipe);
        
        const updateResult = await updateRecipe(recipe!.id, updatedRecipe);
        
        console.log('🔄 EDIT: Update result:', updateResult);
        console.log('🔄 EDIT: Recipe exists after update:', recipe ? 'YES' : 'NO');
        
        // Only show success if the update actually succeeded
        if (updateResult) {
          console.log('✅ EDIT: Recipe updated successfully');
          setHasUnsavedChanges(false);
          setUploadStatus('המתכון עודכן בהצלחה!');
          
          setTimeout(() => {
            alert('המתכון עודכן בהצלחה!');
          }, 500);
        } else {
          throw new Error('Failed to update recipe in database');
        }
        
        // Navigate to recipe detail page after successful save
        // Use replace: true to remove edit page from history so back button goes to recipes page
        setTimeout(() => {
          setIsNavigating(false);
          navigate(`/recipe/${recipe!.id}`, { replace: true });
        }, 1000);
        
      } catch (error) {
        console.error('❌ EDIT: Failed to update recipe:', error);
        console.error('❌ EDIT: Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          type: typeof error,
          errorObject: error
        });
        
        let errorMessage = 'שגיאה בעדכון המתכון';
        if (error instanceof Error) {
          console.log('📝 EDIT: Analyzing error message:', error.message);
          
          // Handle specific payload too large error
          if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
            errorMessage = 'התמונה גדולה מדי. נא לנסות תמונה קטנה יותר או לדחוס אותה.';
          }
          
          if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'בעיית חיבור לאינטרנט. נא לבדוק את החיבור ולנסות שוב.';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'הבקשה לקחה זמן רב מדי. נא לנסות שוב.';
          } else if (error.message.includes('JSON')) {
            errorMessage = 'שגיאה בעיבוד הנתונים. נא לנסות שוב.';
          } else {
            errorMessage = `שגיאה: ${error.message}`;
          }
        }
        
        setUploadStatus(`שגיאה: ${errorMessage}`);
        
        // Show error alert
        setTimeout(() => {
          alert(errorMessage);
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

  // Handle image changes
  const handleImagesChange = useCallback((newImages: RecipeImage[]) => {
    setImages(newImages);
    setHasUnsavedChanges(true);
  }, []);

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
          <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white">עריכת מתכון</h1>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="bg-white/20 backdrop-blur-sm text-white p-1.5 rounded-lg hover:bg-white/30 transition-all duration-300 border border-white/30"
                title="סגור"
                disabled={isNavigating}
              >
                <X className="h-4 w-4" />
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

              {/* Images Section - Elegant Design */}
              {images.length > 0 && (
                <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4 rounded-xl border border-pink-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                      תמונות המתכון ({images.length}/4)
                    </h2>
                  </div>
                  
                  {/* Elegant Image Display */}
                  <div className="space-y-3">
                    {/* Main Image - Larger display for first image */}
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-md group">
                      <img
                        src={images[0].url}
                        alt={images[0].alt_text || 'תמונה ראשית'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          console.warn('🖼️ EDIT: Failed to load main image:', images[0].url);
                        }}
                        onLoad={() => {
                          console.log('🖼️ EDIT: Successfully loaded main image:', images[0].url.substring(0, 50) + '...');
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('האם אתה בטוח שברצונך למחוק את התמונה הזו?')) {
                            setImages(prev => prev.filter((_, index) => index !== 0));
                            setHasUnsavedChanges(true);
                          }
                        }}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="מחק תמונה"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    
                                         {/* Additional Images Grid */}
                     {images.length > 1 && (
                       <div className="grid grid-cols-4 gap-2">
                         {images.slice(1, 5).map((image, index) => (
                           <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 shadow-sm group">
                             <img
                               src={image.url}
                               alt={image.alt_text || `תמונה ${index + 2}`}
                               className="w-full h-full object-cover"
                               onError={(e) => {
                                 const target = e.target as HTMLImageElement;
                                 target.style.display = 'none';
                                 console.warn('🖼️ EDIT: Failed to load image:', image.url);
                               }}
                             />
                             <button
                               type="button"
                               onClick={() => {
                                 if (window.confirm('האם אתה בטוח שברצונך למחוק את התמונה הזו?')) {
                                   setImages(prev => prev.filter((_, imgIndex) => imgIndex !== index + 1));
                                   setHasUnsavedChanges(true);
                                 }
                               }}
                               className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                               title="מחק תמונה"
                             >
                               <X className="w-2.5 h-2.5" />
                             </button>
                           </div>
                         ))}
                        {images.length > 5 && (
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm">
                            <div className="text-center">
                              <span className="text-sm font-medium text-gray-600">+{images.length - 5}</span>
                              <div className="text-xs text-gray-500">תמונות נוספות</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Add More Images and Manage Images Buttons */}
                    <div className="pt-2">
                      <div className="flex gap-2">
                        {images.length < 4 && (
                          <>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="add-more-images-input"
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById('add-more-images-input')?.click()}
                              disabled={isLoading}
                              className="flex-1 flex items-center justify-center gap-2 bg-blue-500/90 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            >
                              <Upload className="w-4 h-4" />
                              הוסף תמונות
                            </button>
                          </>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => setShowSmartImageSearch(true)}
                          className={`flex items-center justify-center gap-2 bg-gray-500/90 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium ${images.length < 6 ? 'flex-1' : 'w-full'}`}
                        >
                          <ImageIcon className="w-4 h-4" />
                          ניהול תמונות
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Images Button - Only show when no images */}
              {images.length === 0 && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-3 rounded-lg border border-pink-200">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                      תמונות (0/4)
                    </h2>
                  </div>
                  
                  {/* Mobile Upload Buttons */}
                  <div className="flex gap-2 sm:hidden">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="mobile-camera-input"
                      disabled={isLoading || images.length >= 4}
                    />
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="mobile-gallery-input"
                      disabled={isLoading || images.length >= 4}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('mobile-gallery-input')?.click()}
                      disabled={isLoading || images.length >= 4}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-500/90 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      בחר תמונות
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('mobile-camera-input')?.click()}
                      disabled={isLoading || images.length >= 4}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500/90 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Camera className="w-4 h-4" />
                      צלם
                    </button>
                  </div>

                  {/* Desktop Upload Button */}
                  <div className="hidden sm:block">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="desktop-gallery-input"
                      disabled={isLoading || images.length >= 4}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('desktop-gallery-input')?.click()}
                      disabled={isLoading || images.length >= 4}
                      className="w-full flex items-center justify-center gap-2 bg-blue-500/90 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      בחר תמונות
                    </button>
                  </div>
                </div>
              )}

              {/* Removed: Main Sections Toggle */}

              {/* Restore hidden main sections */}
              {(!includeMainIngredients || !includeMainDirections) && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-center justify-between transition-all duration-300">
                  <span className="text-sm text-blue-800">חלקים עיקריים הוסתרו. ניתן להחזירם:</span>
                  <div className="flex gap-2">
                    {!includeMainIngredients && (
                      <button
                        type="button"
                        onClick={() => {
                          setIncludeMainIngredients(true);
                          setIsEntering(prev => ({ ...prev, ingredients: true }));
                          setTimeout(() => setIsEntering(prev => ({ ...prev, ingredients: false })), 20);
                        }}
                        className="px-2 py-1 text-xs bg-white border border-blue-300 rounded-md hover:bg-blue-100 text-blue-700"
                      >
                        החזר רכיבים
                      </button>
                    )}
                    {!includeMainDirections && (
                      <button
                        type="button"
                        onClick={() => {
                          setIncludeMainDirections(true);
                          setIsEntering(prev => ({ ...prev, directions: true }));
                          setTimeout(() => setIsEntering(prev => ({ ...prev, directions: false })), 20);
                        }}
                        className="px-2 py-1 text-xs bg-white border border-blue-300 rounded-md hover:bg-blue-100 text-blue-700"
                      >
                        החזר הוראות
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Ingredients Section */}
              {includeMainIngredients && (
                <div className={`relative bg-gradient-to-r from-orange-50 to-rose-50 p-4 rounded-lg border border-orange-200 transition-all duration-300 ${isEntering.ingredients ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'} ${isHiding.ingredients ? 'opacity-0 -translate-y-2' : ''}`}
                  onAnimationEnd={() => {
                    if (isEntering.ingredients) setIsEntering(prev => ({ ...prev, ingredients: false }));
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsHiding(prev => ({ ...prev, ingredients: true }));
                      setTimeout(() => {
                        setIncludeMainIngredients(false);
                        setIngredients(['']);
                        setIsHiding(prev => ({ ...prev, ingredients: false }));
                      }, 250);
                    }}
                    className="absolute top-2 left-2 z-10 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50/70 rounded-md transition-colors"
                    title="הסתר רכיבים"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
              )}

              {/* Directions Section */}
              {includeMainDirections && (
                <div className={`relative bg-gradient-to-r from-orange-50 to-rose-50 p-4 rounded-lg border border-orange-200 transition-all duration-300 ${isEntering.directions ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'} ${isHiding.directions ? 'opacity-0 -translate-y-2' : ''}`}
                  onAnimationEnd={() => {
                    if (isEntering.directions) setIsEntering(prev => ({ ...prev, directions: false }));
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsHiding(prev => ({ ...prev, directions: true }));
                      setTimeout(() => {
                        setIncludeMainDirections(false);
                        setDirections(['']);
                        setIsHiding(prev => ({ ...prev, directions: false }));
                      }, 250);
                    }}
                    className="absolute top-2 left-2 z-10 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50/70 rounded-md transition-colors"
                    title="הסתר הוראות"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
              )}

              {/* Additional Sections */}
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-4 rounded-lg border border-blue-200">
                <h2 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  חלקים נוספים
                </h2>
                <div className="space-y-3">
                  {Object.keys(additionalSections).length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <p className="text-sm">אין חלקים נוספים עדיין</p>
                      <p className="text-xs mt-1">לחץ על "הוסף חלק חדש" כדי להוסיף מלית, בצק, רוטב או חלק אחר</p>
                    </div>
                  )}
                  {Object.entries(additionalSections).map(([sectionName, section]) => (
                    <div key={sectionName} className="bg-white p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1 mr-2">
                          <input
                            type="text"
                            value={sectionTitles[sectionName] || ''}
                            onChange={(e) => updateSectionTitle(sectionName, e.target.value)}
                            onBlur={() => finalizeSectionTitle(sectionName)}
                            className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                            placeholder="כותרת החלק (לדוגמא: מלית, בצק, רוטב...)"
                            autoFocus={sectionName.startsWith('temp_')}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewSection(sectionName)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-all duration-200"
                          title={`הסר חלק`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                        <div className="grid md:grid-cols-2 gap-3">
                          {/* Section Ingredients */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-blue-800 flex items-center gap-1 text-xs">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                              מרכיבים {sectionTitles[sectionName] ? `ל${sectionTitles[sectionName]}` : ''}
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
                              שלבי הכנה {sectionTitles[sectionName] ? `ל${sectionTitles[sectionName]}` : ''}
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
                  
                  {/* Add New Section Button */}
                  <div className="text-center pt-3">
                    <button
                      type="button"
                      onClick={addNewSection}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 px-4 py-3 rounded-lg transition-all duration-200 border border-dashed border-blue-300 hover:border-blue-400 mx-auto text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      הוסף חלק חדש
                    </button>
                  </div>
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
                <div ref={buttonsRef} className="flex items-center justify-center gap-3">
                  <button
                    type="submit"
                    disabled={isSaving || isNavigating}
                    className={`group relative overflow-hidden border px-6 py-2.5 rounded-full transition-all duration-500 font-medium text-sm shadow-sm hover:shadow-md active:shadow-md focus:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-manipulation ${
                      saveButtonFilled 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 border-green-500 text-white' 
                        : 'bg-white border-green-200 text-green-700 hover:text-white active:text-white focus:text-white hover:border-green-300 active:border-green-300 focus:border-green-300'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 transition-transform duration-300 ease-out ${
                      saveButtonFilled ? 'translate-x-0' : 'translate-x-full group-hover:translate-x-0 group-active:translate-x-0 group-focus:translate-x-0'
                    }`}></div>
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
                    className={`group relative overflow-hidden border px-4 py-2.5 rounded-full transition-all duration-500 font-medium text-sm shadow-sm hover:shadow-md active:shadow-md focus:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-manipulation ${
                      deleteButtonFilled 
                        ? 'bg-gradient-to-r from-red-500 to-red-600 border-red-500 text-white' 
                        : 'bg-white border-red-200 text-red-600 hover:text-white active:text-white focus:text-white hover:border-red-300 active:border-red-300 focus:border-red-300'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 transition-transform duration-300 ease-out ${
                      deleteButtonFilled ? 'translate-x-0' : 'translate-x-full group-hover:translate-x-0 group-active:translate-x-0 group-focus:translate-x-0'
                    }`}></div>
                    <div className="relative flex items-center gap-2">
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>מחק</span>
                    </div>
                  </button>
                </div>
              </div>
            </form>
            


            {/* Image Management Modal */}
            {showSmartImageSearch && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden">
                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl mx-auto">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                      ניהול תמונות המתכון
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowSmartImageSearch(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                      title="סגור"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                    <ImageManager
                      recipeId={id || ''}
                      initialImages={images}
                      onImagesChange={handleImagesChange}
                      maxImages={4}
                      className="space-y-3"
                    />
                  </div>
                </div>
              </div>
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