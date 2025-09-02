import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Trash2, Edit3, Eye, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { imageService, RecipeImage, ImageUploadResponse } from '../services/imageService';

interface ImageManagerProps {
  recipeId: string;
  onImagesChange?: (images: RecipeImage[]) => void;
  maxImages?: number;
  className?: string;
  initialImages?: RecipeImage[];
}

const ImageManager: React.FC<ImageManagerProps> = ({
  recipeId,
  onImagesChange,
  maxImages = 6,
  className = '',
  initialImages = []
}) => {
  const [images, setImages] = useState<RecipeImage[]>(initialImages);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [selectedImage, setSelectedImage] = useState<RecipeImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingImage, setEditingImage] = useState<RecipeImage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    // Prevent multiple simultaneous loads or repeated loads
    if (isLoading || hasLoaded) {
      console.log('ImageManager: Already loading or has loaded, skipping...');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('ImageManager: Loading images for recipe:', recipeId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000); // 10 second timeout
      });
      
      const response = await Promise.race([
        imageService.getRecipeImages(recipeId),
        timeoutPromise
      ]) as any;
      
      setImages(response.images || []);
      console.log('ImageManager: Loaded', response.images?.length || 0, 'images');
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading images:', error);
      // If loading fails, start with empty array and don't retry
      setImages([]);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [recipeId, hasLoaded]); // Added hasLoaded to dependencies

  // Simple effect to handle initial images or load from server
  useEffect(() => {
    if (initialImages.length > 0) {
      console.log('ImageManager: Using initial images:', initialImages.length);
      setImages(initialImages);
      setHasLoaded(true);
    } else if (recipeId && !hasLoaded) {
      console.log('ImageManager: Will load from server for recipe:', recipeId);
      // Only load once when component mounts
      const loadOnce = async () => {
        try {
          setIsLoading(true);
          
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await imageService.getRecipeImages(recipeId);
          clearTimeout(timeoutId);
          
          setImages(response.images || []);
          console.log('ImageManager: Loaded', response.images?.length || 0, 'images');
        } catch (error) {
          console.error('Error loading images:', error);
          setImages([]);
          // Show a user-friendly message for timeout/connection issues
          if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('fetch'))) {
            showNotification('warning', 'לא ניתן לטעון תמונות קיימות. תוכל להוסיף תמונות חדשות.');
          }
        } finally {
          setIsLoading(false);
          setHasLoaded(true);
        }
      };
      
      loadOnce();
    }
  }, []); // Empty dependencies to run only once

  // Notify parent of image changes
  useEffect(() => {
    if (onImagesChange) {
      onImagesChange(images);
    }
  }, [images, onImagesChange]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const validation = imageService.validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      showNotification('warning', `חלק מהקבצים לא תקינים:\n${errors.join('\n')}`);
    }

    if (validFiles.length === 0) return;

    // Check if adding these files would exceed the limit
    if (images.length + validFiles.length > maxImages) {
      showNotification('warning', `ניתן להעלות עד ${maxImages} תמונות. כרגע יש לך ${images.length} ואתה מנסה להוסיף ${validFiles.length}.`);
      return;
    }

    await uploadImages(validFiles);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImages = async (files: File[]) => {
    try {
      setIsLoading(true);
      
      // Show upload progress for each file
      const progress: { [key: string]: number } = {};
      files.forEach(file => {
        progress[file.name] = 0;
      });
      setUploadProgress(progress);

      // Upload images
      const response: ImageUploadResponse = await imageService.uploadImages(
        recipeId,
        files,
        'gallery'
      );

      if (response.success) {
        // Add new images to the list
        setImages(prev => [...prev, ...response.images]);
        
        // Show success message
        showNotification('success', `הועלו ${response.uploaded_count} תמונות בהצלחה!`);
      } else {
        showNotification('error', 'שגיאה בהעלאת התמונות. אנא נסה שוב.');
      }

      // Clear progress
      setUploadProgress({});

    } catch (error) {
      console.error('Error uploading images:', error);
      
      // If upload fails, create temporary images for preview
      const tempImages: RecipeImage[] = files.map((file, index) => ({
        id: `temp-upload-${Date.now()}-${index}`,
        recipe_id: recipeId,
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
      }));
      
      // Add temporary images to the list
      setImages(prev => [...prev, ...tempImages]);
      
      showNotification('warning', `התמונות נוספו זמנית. הן יישמרו כשתשמור את המתכון.`);
      setUploadProgress({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (image: RecipeImage) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את התמונה הזו?`)) {
      return;
    }

    try {
      setIsLoading(true);
      
      // If it's a temporary image, just remove it from the list
      if (image.id.startsWith('temp-') || image.id.startsWith('existing-') || image.id.startsWith('temp-upload-')) {
        setImages(prev => prev.filter(img => img.id !== image.id));
        showNotification('success', 'התמונה נמחקה בהצלחה!');
        return;
      }
      
      // Otherwise, delete from server
      await imageService.deleteImage(recipeId, image.id);
      
      // Remove image from list
      setImages(prev => prev.filter(img => img.id !== image.id));
      
      showNotification('success', 'התמונה נמחקה בהצלחה!');
    } catch (error) {
      console.error('Error deleting image:', error);
      showNotification('error', 'שגיאה במחיקת התמונה. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditImage = (image: RecipeImage) => {
    setEditingImage(image);
    setShowEditModal(true);
  };

  const handleUpdateImage = async (updates: { alt_text?: string; image_type?: 'thumbnail' | 'hero' | 'gallery' }) => {
    if (!editingImage) return;

    try {
      setIsLoading(true);
      
      // If it's a temporary image, just update it locally
      if (editingImage.id.startsWith('temp-') || editingImage.id.startsWith('existing-') || editingImage.id.startsWith('temp-upload-')) {
        setImages(prev => prev.map(img => 
          img.id === editingImage.id 
            ? { ...img, ...updates, updated_at: new Date().toISOString() }
            : img
        ));
        
        setShowEditModal(false);
        setEditingImage(null);
        showNotification('success', 'התמונה עודכנה בהצלחה!');
        return;
      }
      
      // Otherwise, update on server
      await imageService.updateImageMetadata(recipeId, editingImage.id, updates);
      
      // Update image in list
      setImages(prev => prev.map(img => 
        img.id === editingImage.id 
          ? { ...img, ...updates, updated_at: new Date().toISOString() }
          : img
      ));
      
      setShowEditModal(false);
      setEditingImage(null);
      showNotification('success', 'התמונה עודכנה בהצלחה!');
    } catch (error) {
      console.error('Error updating image:', error);
      showNotification('error', 'שגיאה בעדכון התמונה. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewImage = (image: RecipeImage) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  // Move image up in order
  const moveImageUp = (index: number) => {
    if (index === 0) return; // Already at top
    
    setImages(prev => {
      const newImages = [...prev];
      [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      return newImages;
    });
    
    showNotification('success', `תמונה #${index + 1} הועברה למעלה`);
  };

  // Move image down in order
  const moveImageDown = (index: number) => {
    if (index === images.length - 1) return; // Already at bottom
    
    setImages(prev => {
      const newImages = [...prev];
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      return newImages;
    });
    
    showNotification('success', `תמונה #${index + 1} הועברה למטה`);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getImageUrl = (image: RecipeImage, size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium') => {
    // If it's a temporary image (from SmartImageSearch), use the URL directly
    if (image.id.startsWith('temp-') || image.id.startsWith('existing-') || image.id.startsWith('temp-upload-')) {
      return image.url;
    }
    // Otherwise, use the image service
    return imageService.getImageUrl(recipeId, image.filename, size);
  };

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className={`image-manager ${className}`}>
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-yellow-100 text-yellow-800 border border-yellow-200'
        }`}>
          {notification.message}
        </div>
      )}



      {/* Images Grid */}
      {isLoading && images.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">טוען תמונות...</p>
        </div>
      ) : images.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {images.map((image, index) => (
            <div key={image.id} className="relative group bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Image */}
              <div className="aspect-square relative">
                <img
                  src={getImageUrl(image, 'medium')}
                  alt={image.alt_text || 'Recipe image'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <div className="flex flex-wrap gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2">
                    <button
                      type="button"
                      onClick={() => handleViewImage(image)}
                      className="p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                      title="הצג תמונה"
                    >
                      <Eye className="w-3 h-3 text-gray-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditImage(image)}
                      className="p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                      title="ערוך תמונה"
                    >
                      <Edit3 className="w-3 h-3 text-gray-700" />
                    </button>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => moveImageUp(index)}
                        className="p-1.5 bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
                        title="העבר למעלה"
                      >
                        <ArrowUp className="w-3 h-3 text-white" />
                      </button>
                    )}
                    {index < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveImageDown(index)}
                        className="p-1.5 bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
                        title="העבר למטה"
                      >
                        <ArrowDown className="w-3 h-3 text-white" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image)}
                      className="p-1.5 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      title="מחק תמונה"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile controls */}
              <div className="absolute top-1 left-1 flex flex-col gap-1 sm:hidden">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveImageUp(index);
                    }}
                    className="p-1 bg-blue-500 rounded shadow-lg hover:bg-blue-600 transition-colors"
                    title="העבר למעלה"
                  >
                    <ArrowUp className="w-3 h-3 text-white" />
                  </button>
                )}
                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveImageDown(index);
                    }}
                    className="p-1 bg-blue-500 rounded shadow-lg hover:bg-blue-600 transition-colors"
                    title="העבר למטה"
                  >
                    <ArrowDown className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>

              {/* Mobile delete button */}
              <div className="absolute top-1 right-1 sm:hidden">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(image);
                  }}
                  className="p-1 bg-red-500 rounded shadow-lg hover:bg-red-600 transition-colors"
                  title="מחק תמונה"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              </div>

              {/* Image info */}
              <div className="p-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs font-medium">#{index + 1}</span>
                    <span className="capitalize text-xs">{image.image_type}</span>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>עדיין לא הועלו תמונות</p>
          <p className="text-sm">הוסף תמונות כדי להפוך את המתכון למושך יותר</p>
        </div>
      )}

      {/* Image View Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Image Preview</h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <img
                src={getImageUrl(selectedImage, 'large')}
                alt={selectedImage.alt_text || 'Recipe image'}
                className="max-w-full max-h-[70vh] object-contain mx-auto"
              />
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {selectedImage.image_type}
                </div>
                <div>
                  <span className="font-medium">Size:</span> {formatFileSize(selectedImage.file_size)}
                </div>
                <div>
                  <span className="font-medium">Dimensions:</span> {selectedImage.width} × {selectedImage.height}
                </div>
                <div>
                  <span className="font-medium">Uploaded:</span> {new Date(selectedImage.created_at).toLocaleDateString()}
                </div>
                {selectedImage.alt_text && (
                  <div className="col-span-2">
                    <span className="font-medium">Alt Text:</span> {selectedImage.alt_text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Image Modal */}
      {showEditModal && editingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Edit Image</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <img
                src={getImageUrl(editingImage, 'medium')}
                alt={editingImage.alt_text || 'Recipe image'}
                className="w-full h-32 object-cover rounded mb-4"
              />
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateImage({
                  alt_text: formData.get('alt_text') as string,
                  image_type: formData.get('image_type') as 'thumbnail' | 'hero' | 'gallery'
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      name="alt_text"
                      defaultValue={editingImage.alt_text || ''}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe this image..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image Type
                    </label>
                    <select
                      name="image_type"
                      defaultValue={editingImage.image_type}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="gallery">Gallery</option>
                      <option value="hero">Hero</option>
                      <option value="thumbnail">Thumbnail</option>
                    </select>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? 'Updating...' : 'Update Image'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageManager;
