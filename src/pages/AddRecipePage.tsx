import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { useProtectedAction } from '../hooks/useProtectedAction';
import { useUnsavedChangesContext } from '../contexts/UnsavedChangesContext';
import { useMobileFormPersistence } from '../hooks/useMobileFormPersistence';
import type { RecipeInsert, RecipeSection } from '../types/recipe';
import { categories } from '../data/categories';
import { Plus, X, Upload, Camera, Sparkles, Link } from 'lucide-react';
import SmartImageSearch from '../components/SmartImageSearch';
import { RecipeImage } from '../services/imageService';
import { mobileImageService } from '../services/mobileImageService';


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
  
  // Controls for optional main sections
  const [includeMainIngredients, setIncludeMainIngredients] = useState(true);
  const [includeMainDirections, setIncludeMainDirections] = useState(true);

  const [showSmartImport, setShowSmartImport] = useState(false);
  const [smartImportText, setSmartImportText] = useState('');
  const [smartImportUrl, setSmartImportUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'url'>('text');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSectionNameModal, setShowSectionNameModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const sectionTitleRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const [showSmartImageSearch, setShowSmartImageSearch] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [saveButtonFilled, setSaveButtonFilled] = useState(false);
  const [cancelButtonFilled, setCancelButtonFilled] = useState(false);

  // Animation state for showing/hiding main sections
  const [isHiding, setIsHiding] = useState<{ ingredients: boolean; directions: boolean }>({ ingredients: false, directions: false });
  const [isEntering, setIsEntering] = useState<{ ingredients: boolean; directions: boolean }>({ ingredients: false, directions: false });

  
  // Image upload states
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadStatus, setUploadStatus] = useState<string>('');
  
  // Refs for auto-focusing new input fields
  const ingredientRefs = useRef<(HTMLInputElement | null)[]>([]);
  const directionRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const sectionIngredientRefs = useRef<{ [key: string]: (HTMLInputElement | null)[] }>({});
  const sectionDirectionRefs = useRef<{ [key: string]: (HTMLTextAreaElement | null)[] }>({});
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

  // Mobile form persistence
  const getFormData = () => ({
    title,
    category,
    difficulty,
    ingredients,
    directions,
    additionalInstructions,
    additionalSections,
    includeMainIngredients,
    includeMainDirections,
    smartImportText,
    smartImportUrl,
    activeTab
  });

  const setFormData = (data: any) => {
    if (data.title !== undefined) setTitle(data.title);
    if (data.category !== undefined) setCategory(data.category);
    if (data.difficulty !== undefined) setDifficulty(data.difficulty);
    if (data.ingredients !== undefined) setIngredients(data.ingredients);
    if (data.directions !== undefined) setDirections(data.directions);
    if (data.additionalInstructions !== undefined) setAdditionalInstructions(data.additionalInstructions);
    if (data.additionalSections !== undefined) setAdditionalSections(data.additionalSections);
    if (data.includeMainIngredients !== undefined) setIncludeMainIngredients(data.includeMainIngredients);
    if (data.includeMainDirections !== undefined) setIncludeMainDirections(data.includeMainDirections);
    if (data.smartImportText !== undefined) setSmartImportText(data.smartImportText);
    if (data.smartImportUrl !== undefined) setSmartImportUrl(data.smartImportUrl);
    if (data.activeTab !== undefined) setActiveTab(data.activeTab);
  };

  const { clearFormData } = useMobileFormPersistence({
    formKey: 'add-recipe',
    getFormData,
    setFormData,
    enabled: true
  });

  // Check authentication when page loads
  useEffect(() => {
    executeProtectedAction(() => {
      // If not authenticated, the modal will show
      // If authenticated, nothing happens and user can proceed
    });
    
    // Always scroll to top when page loads
    window.scrollTo(0, 0);
  }, []);

  // Intersection Observer for button animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Buttons are visible, start fill animation
            if (!buttonsVisible) {
              setButtonsVisible(true);
              // Animate save button - faster timing
              setTimeout(() => setSaveButtonFilled(true), 100);
              // Animate cancel button with slight delay
              setTimeout(() => setCancelButtonFilled(true), 200);
            }
          } else {
            // Buttons are not visible, reset them
            setButtonsVisible(false);
            setSaveButtonFilled(false);
            setCancelButtonFilled(false);
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



  const addIngredient = () => {
    const newIndex = ingredients.length;
    setIngredients([...ingredients, '']);
    setHasUnsavedChanges(true);
    
    // Focus the new input field immediately after render without losing focus
    // Use multiple strategies to prevent keyboard from closing on mobile
    setTimeout(() => {
      if (ingredientRefs.current[newIndex]) {
        const input = ingredientRefs.current[newIndex];
        if (input) {
          // Prevent default behavior that might close keyboard
          input.focus({ preventScroll: true });
          // Ensure input is visible and focused
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Additional focus to maintain keyboard
          setTimeout(() => {
            input.focus({ preventScroll: true });
          }, 100);
        }
      }
    }, 50);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    
    const currentIngredient = ingredients[index] || '';
    if (currentIngredient.trim() && !window.confirm('האם אתה בטוח שברצונך למחוק את הרכיב הזה?')) {
      return;
    }
    
    setIngredients(ingredients.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
    setHasUnsavedChanges(true);
  };

  const addDirection = () => {
    const newIndex = directions.length;
    setDirections([...directions, '']);
    setHasUnsavedChanges(true);
    
    // Focus the new textarea field immediately after render without losing focus
    // Use multiple strategies to prevent keyboard from closing on mobile
    setTimeout(() => {
      if (directionRefs.current[newIndex]) {
        const textarea = directionRefs.current[newIndex];
        if (textarea) {
          // Prevent default behavior that might close keyboard
          textarea.focus({ preventScroll: true });
          // Ensure textarea is visible and focused
          textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Additional focus to maintain keyboard
          setTimeout(() => {
            textarea.focus({ preventScroll: true });
          }, 100);
        }
      }
    }, 50);
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

  const removeDirection = (index: number) => {
    if (directions.length <= 1) return;
    
    const currentDirection = directions[index] || '';
    if (currentDirection.trim() && !window.confirm('האם אתה בטוח שברצונך למחוק את השלב הזה?')) {
      return;
    }
    
    setDirections(directions.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const updateDirection = (index: number, value: string) => {
    const newDirections = [...directions];
    newDirections[index] = value;
    setDirections(newDirections);
    setHasUnsavedChanges(true);
  };

  // Helper function to detect if we're on mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('📸 Processing images:', files.length, 'Mobile:', isMobile());
    
    // Filter out non-image files
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
    
    // Check if adding these images would exceed the 4 image limit
    if (images.length + imageFiles.length > 4) {
      alert(`ניתן להעלות עד 4 תמונות בלבד. כרגע יש לך ${images.length} תמונות ואתה מנסה להוסיף ${imageFiles.length} נוספות.`);
      e.target.value = '';
      return;
    }

    setIsUploadingImages(true);
    setUploadStatus('מעבד תמונות...');

    try {
      const tempImages: RecipeImage[] = [];
      
      // Use mobile service for mobile devices, regular processing for desktop
      if (isMobile()) {
        console.log('📱 Using mobile image service...');
        
        for (const file of imageFiles) {
          try {
            // Use mobile image service to save the image
            const tempRecipeId = `temp-recipe-${Date.now()}`;
            const imageId = await mobileImageService.saveImage(file, tempRecipeId);
            
            // Get the saved image data
            const imageData = await mobileImageService.getImage(imageId);
            
            if (imageData) {
              const tempImage: RecipeImage = {
                id: `mobile-${imageId}`,
                recipe_id: tempRecipeId,
                filename: file.name,
                file_path: '',
                url: imageData,
                image_type: 'gallery',
                file_size: file.size,
                mime_type: file.type,
                alt_text: `תמונה: ${file.name}`,
                width: 0,
                height: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              tempImages.push(tempImage);
              console.log(`✅ Mobile: Saved ${file.name} with ID: ${imageId}`);
            }
          } catch (error) {
            console.error(`❌ Mobile: Failed to process ${file.name}:`, error);
            // Fallback to regular base64 processing
            try {
              const processedFile = await compressImageSimple(file);
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(processedFile);
              });

              const tempImage: RecipeImage = {
                id: `temp-fallback-${Date.now()}-${Math.random()}`,
                recipe_id: '',
                filename: file.name,
                file_path: '',
                url: base64,
                image_type: 'gallery',
                file_size: processedFile.size,
                mime_type: 'image/jpeg',
                alt_text: `תמונה: ${file.name}`,
                width: 0,
                height: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              tempImages.push(tempImage);
              console.log(`✅ Fallback: Added ${file.name} as base64`);
            } catch (fallbackError) {
              console.error(`❌ Fallback also failed for ${file.name}:`, fallbackError);
            }
          }
        }
      } else {
        console.log('💻 Using desktop processing...');
        
        // Desktop processing with base64 conversion
        for (const file of imageFiles) {
          try {
            const processedFile = await compressImageSimple(file);
            
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const sizeInKB = Math.round(result.length / 1024);
                console.log(`📸 Base64 size for ${file.name}: ${sizeInKB}KB`);
                
                if (sizeInKB > 800) {
                  console.warn(`⚠️ Large base64 image: ${file.name} (${sizeInKB}KB)`);
                }
                
                resolve(result);
              };
              reader.onerror = reject;
              reader.readAsDataURL(processedFile);
            });

            const tempImage: RecipeImage = {
              id: `temp-${Date.now()}-${Math.random()}`,
              recipe_id: '',
              filename: file.name,
              file_path: '',
              url: base64,
              image_type: 'gallery',
              file_size: processedFile.size,
              mime_type: 'image/jpeg',
              alt_text: `תמונה: ${file.name}`,
              width: 0,
              height: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            tempImages.push(tempImage);
          } catch (error) {
            console.error(`❌ Failed to process ${file.name}:`, error);
          }
        }
      }

      if (tempImages.length > 0) {
        setImages(prev => [...prev, ...tempImages]);
        setUploadStatus(`הועלו ${tempImages.length} תמונות בהצלחה!`);
        console.log(`✅ Added ${tempImages.length} images (Mobile: ${isMobile()})`);
      } else {
        setUploadStatus('שגיאה בעיבוד התמונות');
      }

    } catch (error) {
      console.error('❌ Image upload failed:', error);
      setUploadStatus('שגיאה בהעלאת התמונות');
      alert(`שגיאה בהעלאת התמונות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsUploadingImages(false);
      // Clear upload status after 3 seconds
      setTimeout(() => {
        setUploadStatus('');
      }, 3000);
      
      // Reset the input
      e.target.value = '';
    }
  };

  const removeImage = async (index: number) => {
    console.log('🗑️ Removing image at index:', index);
    const imageToRemove = images[index];
    
    // If it's a mobile image, clean it up from mobileImageService
    if (imageToRemove.id.startsWith('mobile-')) {
      try {
        const imageId = imageToRemove.id.replace('mobile-', '');
        await mobileImageService.deleteImage(imageId);
        console.log(`🧹 Cleaned up mobile image: ${imageToRemove.filename}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup mobile image ${imageToRemove.filename}:`, error);
      }
    }
    
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
    if (images.length >= 4) {
      alert('ניתן להעלות עד 4 תמונות בלבד.');
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









  const addNewSection = () => {
    // Create a new section with empty title that user can fill
    const newSectionId = `section-${Date.now()}`;
    setAdditionalSections(prev => ({
      ...prev,
      [newSectionId]: {
        title: '', // Empty title that user can fill
        ingredients: [''],
        directions: ['']
      }
    }));
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
    
    // Focus the new input field to keep keyboard open
    setTimeout(() => {
      const newIndex = additionalInstructions[sectionName]?.length || 0;
      const inputSelector = `textarea[name="additionalInstructions.${sectionName}.${newIndex}"]`;
      const input = document.querySelector(inputSelector) as HTMLTextAreaElement;
      if (input) {
        input.focus({ preventScroll: true });
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          input.focus({ preventScroll: true });
        }, 100);
      }
    }, 50);
  };

  const removeAdditionalInstructionStep = (sectionName: string, index: number) => {
    setAdditionalInstructions(prev => ({
      ...prev,
      [sectionName]: prev[sectionName].filter((_, i) => i !== index)
    }));
  };

  // Functions for managing new sections with ingredients and directions
  const removeNewSection = (sectionId: string) => {
    setAdditionalSections(prev => {
      const newSections = { ...prev };
      delete newSections[sectionId];
      return newSections;
    });
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        title: title
      }
    }));
  };

  const updateSectionIngredient = (sectionId: string, index: number, value: string) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        ingredients: prev[sectionId].ingredients.map((item, i) => i === index ? value : item)
      }
    }));
  };

  const addSectionIngredient = (sectionId: string) => {
    setAdditionalSections(prev => {
      const currentIngredients = prev[sectionId]?.ingredients || [''];
      const newIndex = currentIngredients.length;
      
      // Focus the new input field after render with mobile keyboard handling
      setTimeout(() => {
        if (sectionIngredientRefs.current[sectionId]?.[newIndex]) {
          const input = sectionIngredientRefs.current[sectionId][newIndex];
          if (input) {
            input.focus({ preventScroll: true });
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              input.focus({ preventScroll: true });
            }, 100);
          }
        }
      }, 50);
      
      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          ingredients: [...currentIngredients, '']
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const removeSectionIngredient = (sectionId: string, index: number) => {
    const currentIngredient = additionalSections[sectionId]?.ingredients[index] || '';
    
    if (currentIngredient.trim() && !window.confirm('האם אתה בטוח שברצונך למחוק את הרכיב הזה?')) {
      return;
    }
    
    setAdditionalSections(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        ingredients: prev[sectionId].ingredients.filter((_, i) => i !== index)
      }
    }));
  };

  const updateSectionDirection = (sectionId: string, index: number, value: string) => {
    setAdditionalSections(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        directions: prev[sectionId].directions.map((item, i) => i === index ? value : item)
      }
    }));
  };

  const addSectionDirection = (sectionId: string) => {
    setAdditionalSections(prev => {
      const currentDirections = prev[sectionId]?.directions || [''];
      const newIndex = currentDirections.length;
      
      // Focus the new textarea field after render with mobile keyboard handling
      setTimeout(() => {
        if (sectionDirectionRefs.current[sectionId]?.[newIndex]) {
          const textarea = sectionDirectionRefs.current[sectionId][newIndex];
          if (textarea) {
            textarea.focus({ preventScroll: true });
            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              textarea.focus({ preventScroll: true });
            }, 100);
          }
        }
      }, 50);
      
      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          directions: [...currentDirections, '']
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const removeSectionDirection = (sectionId: string, index: number) => {
    const currentDirection = additionalSections[sectionId]?.directions[index] || '';
    
    if (currentDirection.trim() && !window.confirm('האם אתה בטוח שברצונך למחוק את השלב הזה?')) {
      return;
    }
    
    setAdditionalSections(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        directions: prev[sectionId].directions.filter((_, i) => i !== index)
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

      // Content validation - at least one section must have content
      const hasMainIngredients = includeMainIngredients && filteredIngredients.length > 0;
      const hasMainDirections = includeMainDirections && filteredDirections.length > 0;
      const hasAdditionalSections = Object.keys(additionalSections).length > 0;
      
      if (!hasMainIngredients && !hasMainDirections && !hasAdditionalSections) {
        alert('המתכון חייב לכלול לפחות אחד מהבאים: רכיבים עיקריים, הוראות עיקריות, או שלבים נוספים');
        return;
      }

      setIsSaving(true);
      setUploadStatus('שומר מתכון...');
      
      try {
        // Filter additional sections to only include non-empty ones
        const filteredAdditionalSections: { [key: string]: RecipeSection } = {};
        let missingTitleSectionId: string | null = null;
        Object.entries(additionalSections).forEach(([sectionId, section]) => {
          const filteredIngredients = section.ingredients.filter(ing => ing.trim());
          const filteredDirections = section.directions.filter(dir => dir.trim());
          if (filteredIngredients.length > 0 || filteredDirections.length > 0 || (section.title && section.title.trim())) {
            // Check if section has content but no proper title
            const sectionTitle = section.title?.trim();
            if (!sectionTitle) {
              missingTitleSectionId = sectionId;
              return; // mark and handle after loop
            }
            
            // Use the section title as the key, but ensure it's not a technical ID
            let finalKey = sectionTitle || sectionId;
            if (finalKey.startsWith('section-') || finalKey.startsWith('temp_')) {
              finalKey = 'חלק נוסף';
            }
            
            filteredAdditionalSections[finalKey] = {
              title: sectionTitle || (sectionId.startsWith('section-') ? 'חלק נוסף' : ''),
              ingredients: filteredIngredients,
              directions: filteredDirections
            };
          }
        });

        if (missingTitleSectionId) {
          setIsSaving(false);
          setUploadStatus('');
          // Scroll and focus the missing title input
          const el = sectionTitleRefs.current[missingTitleSectionId];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => el.focus(), 300);
          }
          alert('נא להוסיף כותרת לחלק הנוסף שהוספת (למשל: מלית, בצק, רוטב)');
          return;
        }

        // Process images for storage (universal for all platforms)
        const processedImages: string[] = [];
        
        for (const img of images) {
          if (img.id.startsWith('mobile-')) {
            // For mobile images, get the actual image data from mobileImageService
            try {
              const imageId = img.id.replace('mobile-', '');
              const imageData = await mobileImageService.getImage(imageId);
              if (imageData) {
                processedImages.push(imageData);
                console.log(`📱 Retrieved mobile image: ${img.filename}`);
              } else {
                console.warn(`⚠️ Failed to retrieve mobile image: ${img.filename}`);
                // Fallback to the stored URL
                processedImages.push(img.url);
              }
            } catch (error) {
              console.error(`❌ Error retrieving mobile image ${img.filename}:`, error);
              // Fallback to the stored URL
              processedImages.push(img.url);
            }
          } else {
            // For regular images, use the URL directly
            processedImages.push(img.url);
          }
        }
        
        console.log(`📸 Using ${processedImages.length} images (${images.filter(img => img.id.startsWith('mobile-')).length} mobile, ${images.filter(img => !img.id.startsWith('mobile-')).length} desktop)`);

        const newRecipe: RecipeInsert = {
          title: title.trim(),
          category,
          difficulty: difficulty || undefined,
          ingredients: includeMainIngredients ? filteredIngredients : [],
          directions: includeMainDirections ? filteredDirections : [],
          images: processedImages, // Use processed images
          additional_instructions: Object.keys(additionalInstructions).length > 0 ? additionalInstructions : undefined,
          additional_sections: filteredAdditionalSections,
          is_favorite: false
        };

        console.log('🔄 Submitting recipe:', {
          title: newRecipe.title,
          category: newRecipe.category,
          imagesCount: newRecipe.images?.length || 0,
          ingredientsCount: newRecipe.ingredients?.length || 0,
          directionsCount: newRecipe.directions?.length || 0,
          additionalSectionsCount: Object.keys(filteredAdditionalSections).length,
          additionalSections: filteredAdditionalSections
        });
        
        // Save the recipe directly
        setUploadStatus('שומר מתכון...');
        const savedRecipe = await addRecipe(newRecipe);
        
        // Only show success if the recipe was actually saved
        if (savedRecipe && savedRecipe.id) {
          console.log('✅ Recipe saved successfully:', {
            id: savedRecipe.id,
            title: savedRecipe.title,
            imagesCount: savedRecipe.images?.length || 0
          });
          
          setUploadStatus('המתכון נשמר בהצלחה!');
          setTimeout(() => {
            alert('המתכון נשמר בהצלחה!');
          }, 500);
        } else {
          throw new Error('Failed to save recipe to database');
        }
        
        // Clean up mobile images after successful save
        for (const img of images) {
          if (img.id.startsWith('mobile-')) {
            try {
              const imageId = img.id.replace('mobile-', '');
              await mobileImageService.deleteImage(imageId);
              console.log(`🧹 Cleaned up mobile image: ${img.filename}`);
            } catch (error) {
              console.warn(`⚠️ Failed to cleanup mobile image ${img.filename}:`, error);
            }
          }
        }
        
        // Force refresh recipes in context to ensure the new recipe is visible
        await refreshRecipes();
        
        // Clear form data from localStorage since recipe was saved successfully
        clearFormData();
        
        // Navigate to recipe detail page
        // Use replace: true to remove add page from history so back button goes to recipes page
        navigate(`/recipe/${savedRecipe.id}`, { replace: true });
        
        console.log('✅ Recipe submission completed successfully');
        
        // Reset saving state
        setIsSaving(false);
        setHasUnsavedChanges(false);
        
        // Clear status after navigation
        setTimeout(() => {
          setUploadStatus('');
          setUploadProgress({});
        }, 1000);
        
      } catch (error) {
        console.error('❌ Error adding recipe:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          type: typeof error,
          errorObject: error
        });
        
        // Better error handling for mobile
        let errorMessage = 'שגיאה בשמירת המתכון';
        if (error instanceof Error) {
          console.log('📝 Analyzing error message:', error.message);
          
          if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
            errorMessage = 'התמונה גדולה מדי. נא לנסות תמונה קטנה יותר או לדחוס אותה.';
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
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
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
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
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
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
                  onChange={(e) => {
                    setDifficulty(e.target.value as "קל" | "בינוני" | "קשה" | "");
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full md:w-1/2 p-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300 focus:border-orange-400 transition-all duration-150 text-sm"
                >
                  <option value="">בחר רמת קושי</option>
                  <option value="קל">קל</option>
                  <option value="בינוני">בינוני</option>
                  <option value="קשה">קשה</option>
                </select>
              </div>
            </div>

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
                        // Trigger enter transition: start hidden then show next tick
                        setIsEntering(prev => ({ ...prev, ingredients: true }));
                        setTimeout(() => {
                          setIsEntering(prev => ({ ...prev, ingredients: false }));
                        }, 20);
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
                        // Trigger enter transition: start hidden then show next tick
                        setIsEntering(prev => ({ ...prev, directions: true }));
                        setTimeout(() => {
                          setIsEntering(prev => ({ ...prev, directions: false }));
                        }, 20);
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
                {/* Hide ingredients section */}
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
                  onClick={(e) => {
                    e.preventDefault();
                    addIngredient();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addIngredient();
                  }}
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium bg-white hover:bg-orange-50 px-3 py-2 rounded-md transition-all duration-200 border border-dashed border-orange-300 hover:border-orange-400 w-full justify-center text-sm touch-manipulation mobile-form-add-button"
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
                {/* Hide directions section */}
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
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addDirection();
                  }}
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium bg-white hover:bg-orange-50 px-3 py-2 rounded-md transition-all duration-200 border border-dashed border-orange-300 hover:border-orange-400 w-full justify-center text-sm touch-manipulation mobile-form-add-button"
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
                שלבים נוספים
              </h2>
              
              {Object.keys(additionalSections).length === 0 ? (
                <div className="text-center py-2">
                  <p className="text-gray-400 text-xs">
                    לחץ על "הוסף שלב חדש" כדי להוסיף מלית, בצק, רוטב או חלק אחר
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    החלק ייווצר עם שדה ריק שתוכל למלא
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(additionalSections).map(([sectionId, section]) => (
                    <div key={sectionId} className="bg-white p-3 rounded-lg border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <input
                          type="text"
                          value={section.title || ''}
                          onChange={(e) => updateSectionTitle(sectionId, e.target.value)}
                          className="flex-1 p-2 border-2 border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-medium"
                          placeholder="כותרת החלק (לדוגמא: מלית, בצק, רוטב...)"
                          ref={(el) => { sectionTitleRefs.current[sectionId] = el; }}
                        />
                        <button
                          type="button"
                          onClick={() => removeNewSection(sectionId)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-all duration-200 ml-2"
                          title="הסר חלק"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    
                      <div className="grid md:grid-cols-2 gap-3">
                        {/* Section Ingredients */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-blue-800 flex items-center gap-1 text-xs">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                            מרכיבים
                          </h4>
                          <div className="space-y-2">
                            {section.ingredients.map((ingredient, index) => {
                              // Initialize refs for this section if not exists
                              if (!sectionIngredientRefs.current[sectionId]) {
                                sectionIngredientRefs.current[sectionId] = [];
                              }
                              
                              return (
                                <div key={index} className="flex gap-2 items-center group">
                                  <div className="flex-shrink-0 w-4 h-4 bg-green-400 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                    {index + 1}
                                  </div>
                                  <input
                                    ref={(el) => {
                                      if (sectionIngredientRefs.current[sectionId]) {
                                        sectionIngredientRefs.current[sectionId][index] = el;
                                      }
                                    }}
                                    type="text"
                                    value={ingredient}
                                    onChange={(e) => updateSectionIngredient(sectionId, index, e.target.value)}
                                    className="flex-1 p-1.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all duration-150 text-sm"
                                    placeholder={`רכיב ${index + 1}`}
                                  />
                                  {section.ingredients.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeSectionIngredient(sectionId, index)}
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
                              onClick={() => addSectionIngredient(sectionId)}
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
                            שלבי הכנה
                          </h4>
                          <div className="space-y-2">
                            {section.directions.map((direction, index) => {
                              // Initialize refs for this section if not exists
                              if (!sectionDirectionRefs.current[sectionId]) {
                                sectionDirectionRefs.current[sectionId] = [];
                              }
                              
                              return (
                                <div key={index} className="flex gap-2 group">
                                  <div className="bg-blue-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1">
                                    {index + 1}
                                  </div>
                                  <textarea
                                    ref={(el) => {
                                      if (sectionDirectionRefs.current[sectionId]) {
                                        sectionDirectionRefs.current[sectionId][index] = el;
                                      }
                                    }}
                                    value={direction}
                                    onChange={(e) => updateSectionDirection(sectionId, index, e.target.value)}
                                    rows={2}
                                    className="flex-1 p-1.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all duration-150 text-sm resize-none"
                                    placeholder={`שלב ${index + 1}`}
                                  />
                                  {section.directions.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeSectionDirection(sectionId, index)}
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
                              onClick={() => addSectionDirection(sectionId)}
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
              )}
              
              {/* Add New Section Button - Inside the container */}
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={addNewSection}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 px-4 py-3 rounded-lg transition-all duration-200 border border-dashed border-blue-300 hover:border-blue-400 mx-auto text-sm"
                >
                  <Plus className="w-4 h-4" />
                  הוסף שלב חדש (רכיבים והוראות הכנה)
                </button>
              </div>
            </div>

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
                תמונות (עד 4)
              </h2>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap justify-center">
                  <label className="flex items-center gap-2 bg-white hover:bg-gray-50 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 border border-gray-200 hover:border-pink-300 font-medium text-gray-700 hover:text-pink-600 text-sm">
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">העלה תמונות</span>
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
                      multiple
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

            {/* Submit Section - Centered Design */}
            <div ref={buttonsRef} className="pt-6 border-t border-gray-100">
              {/* Centered buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="submit"
                  disabled={isSaving || isUploadingImages}
                  className={`group relative overflow-hidden px-6 py-2.5 rounded-full transition-all duration-500 font-medium text-sm shadow-sm hover:shadow-md active:shadow-md focus:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-manipulation ${
                    saveButtonFilled
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border border-green-500'
                      : 'bg-white border border-green-200 text-green-700 hover:text-white active:text-white focus:text-white hover:border-green-300 active:border-green-300 focus:border-green-300'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 transition-transform duration-300 ease-out ${
                    saveButtonFilled ? 'translate-x-0' : 'translate-x-full group-hover:translate-x-0 group-active:translate-x-0 group-focus:translate-x-0'
                  }`}></div>
                  <div className="relative flex items-center gap-2">
                    {isSaving || isUploadingImages ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent"></div>
                        <span>{isUploadingImages ? 'מעלה תמונות...' : 'שומר...'}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>שמור</span>
                      </>
                    )}
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigateWithUnsavedCheck('/recipes');
                    } catch (error) {
                      console.error('Navigation error:', error);
                    }
                  }}
                  className={`group relative overflow-hidden px-4 py-2.5 rounded-full transition-all duration-500 font-medium text-sm shadow-sm hover:shadow-md active:shadow-md focus:shadow-md flex items-center gap-2 touch-manipulation ${
                    cancelButtonFilled
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border border-red-500'
                      : 'bg-white border border-red-200 text-red-600 hover:text-white active:text-white focus:text-white hover:border-red-300 active:border-red-300 focus:border-red-300'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 transition-transform duration-300 ease-out ${
                    cancelButtonFilled ? 'translate-x-0' : 'translate-x-full group-hover:translate-x-0 group-active:translate-x-0 group-focus:translate-x-0'
                  }`}></div>
                  <div className="relative flex items-center gap-2">
                    <X className="h-3.5 w-3.5" />
                    <span>ביטול</span>
                  </div>
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