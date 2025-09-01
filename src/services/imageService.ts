import { supabase } from '../lib/supabase';

export interface RecipeImage {
  id: string;
  recipe_id: string;
  filename: string;
  file_path: string;
  url: string;
  image_type: 'thumbnail' | 'hero' | 'gallery';
  file_size: number;
  mime_type: string;
  alt_text?: string;
  width?: number;
  height?: number;
  created_at: string;
  updated_at: string;
}

export interface ImageUploadResponse {
  success: boolean;
  uploaded_count: number;
  total_files: number;
  images: RecipeImage[];
  errors?: Array<{
    filename: string;
    error: string;
  }>;
  partial_success?: boolean;
}

export interface ImageStats {
  database: {
    total_images: number;
    active_images: number;
    deleted_images: number;
    recipes_with_images: number;
    total_size_bytes: number;
    avg_file_size_bytes: number;
  };
  filesystem: {
    totalSize: number;
    fileCount: number;
    recipeCount: number;
    humanReadableSize: string;
  };
  summary: {
    total_size_human: string;
    avg_file_size_human: string;
  };
}

class ImageService {
  private baseUrl = 'http://localhost:3001/api';

  /**
   * Upload images for a recipe
   */
  async uploadImages(
    recipeId: string, 
    files: File[], 
    imageType: 'thumbnail' | 'hero' | 'gallery' = 'gallery',
    altText?: string
  ): Promise<ImageUploadResponse> {
    try {
      const formData = new FormData();
      
      // Add images to form data
      files.forEach(file => {
        formData.append('images', file);
      });
      
      // Add metadata
      formData.append('imageType', imageType);
      if (altText) {
        formData.append('altText', altText);
      }

      const response = await fetch(`${this.baseUrl}/recipes/${recipeId}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload images');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  }

  /**
   * Get all images for a recipe
   */
  async getRecipeImages(
    recipeId: string, 
    size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium',
    includeDeleted: boolean = false
  ): Promise<{ recipe_id: string; total_images: number; images: RecipeImage[] }> {
    try {
      const params = new URLSearchParams({
        size,
        include_deleted: includeDeleted.toString()
      });

      const response = await fetch(`${this.baseUrl}/recipes/${recipeId}/images?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch recipe images');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching recipe images:', error);
      throw error;
    }
  }

  /**
   * Delete a specific image
   */
  async deleteImage(recipeId: string, imageId: string): Promise<{ success: boolean; message: string; image_id: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/recipes/${recipeId}/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete image');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Update image metadata
   */
  async updateImageMetadata(
    recipeId: string, 
    imageId: string, 
    updates: { alt_text?: string; image_type?: 'thumbnail' | 'hero' | 'gallery' }
  ): Promise<{ success: boolean; message: string; image: RecipeImage }> {
    try {
      const response = await fetch(`${this.baseUrl}/recipes/${recipeId}/images/${imageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update image metadata');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating image metadata:', error);
      throw error;
    }
  }

  /**
   * Get image URL for a specific size
   */
  getImageUrl(recipeId: string, filename: string, size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium'): string {
    return `${this.baseUrl}/images/${recipeId}/${size}/${filename}`;
  }

  /**
   * Get image storage statistics
   */
  async getImageStats(): Promise<ImageStats> {
    try {
      const response = await fetch(`${this.baseUrl}/images/stats`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch image statistics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching image stats:', error);
      throw error;
    }
  }

  /**
   * Migrate existing base64 images to file storage
   */
  async migrateBase64Images(): Promise<{ success: boolean; message: string; migrated_count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/images/migrate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to migrate images');
      }

      return await response.json();
    } catch (error) {
      console.error('Error migrating images:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned image files
   */
  async cleanupOrphanedFiles(): Promise<{ success: boolean; message: string; deleted_directories: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/images/cleanup`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cleanup orphaned files');
      }

      return await response.json();
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 10MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Compress image before upload (client-side)
   */
  async compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Convert base64 to file (for migration)
   */
  base64ToFile(base64: string, filename: string): File {
    // Remove data URL prefix if present
    const base64String = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert to blob
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    
    return new File([blob], filename, { type: 'image/jpeg' });
  }

  /**
   * Get optimized image URL with size parameter
   */
  getOptimizedImageUrl(recipeId: string, filename: string, size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium'): string {
    const baseUrl = this.baseUrl.replace('/api', '');
    return `${baseUrl}/api/images/${recipeId}/${size}/${filename}`;
  }

  /**
   * Generate image placeholder URL
   */
  getPlaceholderUrl(width: number = 500, height: number = 500, text: string = 'No Image'): string {
    return `https://via.placeholder.com/${width}x${height}/f3f4f6/6b7280?text=${encodeURIComponent(text)}`;
  }
}

export const imageService = new ImageService();
