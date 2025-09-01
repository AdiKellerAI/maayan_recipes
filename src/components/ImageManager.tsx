import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Trash2, Edit3, Eye, Download } from 'lucide-react';
import { imageService, RecipeImage, ImageUploadResponse } from '../services/imageService';

interface ImageManagerProps {
  recipeId: string;
  onImagesChange?: (images: RecipeImage[]) => void;
  maxImages?: number;
  className?: string;
}

const ImageManager: React.FC<ImageManagerProps> = ({
  recipeId,
  onImagesChange,
  maxImages = 6,
  className = ''
}) => {
  const [images, setImages] = useState<RecipeImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [selectedImage, setSelectedImage] = useState<RecipeImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingImage, setEditingImage] = useState<RecipeImage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load images on component mount
  useEffect(() => {
    loadImages();
  }, [recipeId]);

  // Notify parent of image changes
  useEffect(() => {
    onImagesChange?.(images);
  }, [images, onImagesChange]);

  const loadImages = async () => {
    try {
      setIsLoading(true);
      const response = await imageService.getRecipeImages(recipeId);
      setImages(response.images);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      alert(`Some files were invalid:\n${errors.join('\n')}`);
    }

    if (validFiles.length === 0) return;

    // Check if adding these files would exceed the limit
    if (images.length + validFiles.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images. You currently have ${images.length} and are trying to add ${validFiles.length}.`);
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
        if (response.uploaded_count === response.total_files) {
          alert(`Successfully uploaded ${response.uploaded_count} images!`);
        } else if (response.partial_success) {
          alert(`Uploaded ${response.uploaded_count} out of ${response.total_files} images. Some files failed to upload.`);
        }
      } else {
        alert('Failed to upload images. Please try again.');
      }

      // Clear progress
      setUploadProgress({});

    } catch (error) {
      console.error('Error uploading images:', error);
      alert(`Error uploading images: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadProgress({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (image: RecipeImage) => {
    if (!confirm(`Are you sure you want to delete this image?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await imageService.deleteImage(recipeId, image.id);
      
      // Remove image from list
      setImages(prev => prev.filter(img => img.id !== image.id));
      
      alert('Image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
      alert(`Error deleting image: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      await imageService.updateImageMetadata(recipeId, editingImage.id, updates);
      
      // Update image in list
      setImages(prev => prev.map(img => 
        img.id === editingImage.id 
          ? { ...img, ...updates, updated_at: new Date().toISOString() }
          : img
      ));
      
      setShowEditModal(false);
      setEditingImage(null);
      alert('Image updated successfully!');
    } catch (error) {
      console.error('Error updating image:', error);
      alert(`Error updating image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewImage = (image: RecipeImage) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getImageUrl = (image: RecipeImage, size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium') => {
    return imageService.getImageUrl(recipeId, image.filename, size);
  };

  return (
    <div className={`image-manager ${className}`}>
      {/* Upload Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recipe Images</h3>
          <span className="text-sm text-gray-500">
            {images.length} / {maxImages} images
          </span>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLoading || images.length >= maxImages}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || images.length >= maxImages}
            className="flex flex-col items-center justify-center w-full h-32 space-y-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-8 h-8 text-gray-400" />
            <div className="text-sm text-gray-600">
              {images.length >= maxImages ? (
                'Maximum images reached'
              ) : (
                <>
                  <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  <br />
                  <span className="text-xs">PNG, JPG, WEBP up to 10MB</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mt-4 space-y-2">
            {Object.entries(uploadProgress).map(([filename, progress]) => (
              <div key={filename} className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">{filename}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Images Grid */}
      {isLoading && images.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading images...</p>
        </div>
      ) : images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group bg-white rounded-lg shadow-md overflow-hidden">
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
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => handleViewImage(image)}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                      title="View image"
                    >
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => handleEditImage(image)}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                      title="Edit image"
                    >
                      <Edit3 className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => handleDeleteImage(image)}
                      className="p-2 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      title="Delete image"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Image info */}
              <div className="p-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{image.image_type}</span>
                  <span>{formatFileSize(image.file_size)}</span>
                </div>
                {image.alt_text && (
                  <p className="text-xs text-gray-600 mt-1 truncate" title={image.alt_text}>
                    {image.alt_text}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No images uploaded yet</p>
          <p className="text-sm">Upload some images to make your recipe more appealing</p>
        </div>
      )}

      {/* Image View Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Image Preview</h3>
              <button
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
