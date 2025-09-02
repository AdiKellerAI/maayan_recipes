/**
 * Enhanced Mobile Image Service
 * 
 * This service provides a complete solution for mobile image handling:
 * - Robust image compression and resizing
 * - Multiple storage strategies (PostgreSQL, localStorage, IndexedDB)
 * - Error recovery and retry mechanisms
 * - Progress tracking and user feedback
 * - Memory management for mobile devices
 */

import { compressImageForMobile, compressImagesForMobile, validateImageFile, getOptimalCompressionSettings, type CompressionResult } from '../utils/mobileImageCompression';
import { imageService, type RecipeImage, type ImageUploadResponse } from './imageService';
import { detectPlatform } from '../utils/imageUtils';

export interface MobileImageUploadOptions {
  recipeId?: string;
  imageType?: 'thumbnail' | 'hero' | 'gallery';
  altText?: string;
  compressionOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeKB?: number;
  };
  onProgress?: (completed: number, total: number, currentFile: string) => void;
  onStatusUpdate?: (status: string) => void;
}

export interface MobileImageUploadResult {
  success: boolean;
  images: RecipeImage[];
  errors: Array<{ filename: string; error: string }>;
  compressionStats: {
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageCompressionRatio: number;
    processingTime: number;
  };
}

class EnhancedMobileImageService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private readonly BATCH_SIZE = 2; // Process 2 images at a time on mobile

  /**
   * Upload and process images with mobile optimization
   */
  async uploadImages(
    files: File[], 
    options: MobileImageUploadOptions = {}
  ): Promise<MobileImageUploadResult> {
    const startTime = Date.now();
    const platform = detectPlatform();
    const isMobile = platform === 'mobile';
    
    console.log(`📱 Enhanced mobile image upload started (${platform}): ${files.length} files`);
    
    const {
      recipeId = '',
      imageType = 'gallery',
      altText,
      compressionOptions,
      onProgress,
      onStatusUpdate
    } = options;

    // Get optimal compression settings for device
    const optimalSettings = getOptimalCompressionSettings();
    const finalCompressionOptions = { ...optimalSettings, ...compressionOptions };

    const results: MobileImageUploadResult = {
      success: false,
      images: [],
      errors: [],
      compressionStats: {
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageCompressionRatio: 0,
        processingTime: 0
      }
    };

    try {
      // Step 1: Validate all files
      onStatusUpdate?.('בודק קבצים...');
      const validFiles: File[] = [];
      
      for (const file of files) {
        const validation = validateImageFile(file);
        if (validation.isValid) {
          validFiles.push(file);
          results.compressionStats.totalOriginalSize += file.size;
        } else {
          results.errors.push({
            filename: file.name,
            error: validation.errors.join(', ')
          });
        }
      }

      if (validFiles.length === 0) {
        throw new Error('No valid image files found');
      }

      console.log(`📱 Validated ${validFiles.length}/${files.length} files`);

      // Step 2: Compress images with mobile optimization
      onStatusUpdate?.('דוחס תמונות...');
      
      const compressionResults = await this.compressImagesWithRetry(
        validFiles,
        finalCompressionOptions,
        onProgress
      );

      // Process compression results
      const successfulCompressions: CompressionResult[] = [];
      for (const result of compressionResults) {
        if (result.success) {
          successfulCompressions.push(result);
          results.compressionStats.totalCompressedSize += result.compressedSize;
        } else {
          results.errors.push({
            filename: validFiles[compressionResults.indexOf(result)]?.name || 'Unknown',
            error: result.error || 'Compression failed'
          });
        }
      }

      if (successfulCompressions.length === 0) {
        throw new Error('All image compressions failed');
      }

      console.log(`📱 Successfully compressed ${successfulCompressions.length}/${validFiles.length} images`);

      // Step 3: Upload to server or save locally
      onStatusUpdate?.('שומר תמונות...');
      
      if (recipeId) {
        // Upload to server (for recipe editing)
        const uploadResults = await this.uploadToServerWithRetry(
          successfulCompressions,
          recipeId,
          imageType,
          altText
        );
        results.images = uploadResults.images;
        results.errors.push(...(uploadResults.errors || []));
      } else {
        // Create temporary images (for recipe creation)
        results.images = this.createTemporaryImages(successfulCompressions, imageType, altText);
      }

      // Calculate final stats
      results.compressionStats.averageCompressionRatio = 
        results.compressionStats.totalOriginalSize / Math.max(results.compressionStats.totalCompressedSize, 1);
      results.compressionStats.processingTime = Date.now() - startTime;

      results.success = results.images.length > 0;
      
      const successCount = results.images.length;
      const errorCount = results.errors.length;
      
      console.log(`✅ Mobile upload complete: ${successCount} successful, ${errorCount} errors`);
      console.log(`📊 Compression: ${(results.compressionStats.totalOriginalSize / 1024 / 1024).toFixed(1)}MB → ${(results.compressionStats.totalCompressedSize / 1024 / 1024).toFixed(1)}MB (${results.compressionStats.averageCompressionRatio.toFixed(1)}x)`);
      
      onStatusUpdate?.(
        successCount > 0 
          ? `הועלו ${successCount} תמונות בהצלחה${errorCount > 0 ? ` (${errorCount} שגיאות)` : ''}` 
          : 'שגיאה בהעלאת התמונות'
      );

      return results;

    } catch (error) {
      console.error('❌ Mobile image upload failed:', error);
      
      results.success = false;
      results.compressionStats.processingTime = Date.now() - startTime;
      
      if (results.errors.length === 0) {
        results.errors.push({
          filename: 'System Error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
      
      onStatusUpdate?.('שגיאה בהעלאת התמונות');
      return results;
    }
  }

  /**
   * Compress images with retry logic for mobile stability
   */
  private async compressImagesWithRetry(
    files: File[],
    compressionOptions: any,
    onProgress?: (completed: number, total: number, currentFile: string) => void
  ): Promise<CompressionResult[]> {
    const platform = detectPlatform();
    const isMobile = platform === 'mobile';
    
    // On mobile, process images in smaller batches to prevent memory issues
    if (isMobile && files.length > this.BATCH_SIZE) {
      return this.compressInBatches(files, compressionOptions, onProgress);
    }

    // For desktop or small batches, process all at once
    let attempt = 0;
    while (attempt < this.MAX_RETRIES) {
      try {
        return await compressImagesForMobile(files, compressionOptions, onProgress);
      } catch (error) {
        attempt++;
        console.warn(`⚠️ Compression attempt ${attempt} failed:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          console.log(`🔄 Retrying compression in ${this.RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        } else {
          throw error;
        }
      }
    }

    throw new Error('All compression attempts failed');
  }

  /**
   * Process images in batches for mobile memory management
   */
  private async compressInBatches(
    files: File[],
    compressionOptions: any,
    onProgress?: (completed: number, total: number, currentFile: string) => void
  ): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];
    const totalFiles = files.length;
    
    console.log(`📱 Processing ${totalFiles} images in batches of ${this.BATCH_SIZE}`);
    
    for (let i = 0; i < files.length; i += this.BATCH_SIZE) {
      const batch = files.slice(i, i + this.BATCH_SIZE);
      console.log(`📱 Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(files.length / this.BATCH_SIZE)}`);
      
      try {
        const batchResults = await compressImagesForMobile(
          batch, 
          compressionOptions, 
          (completed, total, currentFile) => {
            const overallCompleted = i + completed;
            onProgress?.(overallCompleted, totalFiles, currentFile);
          }
        );
        
        results.push(...batchResults);
        
        // Add delay between batches to prevent memory issues
        if (i + this.BATCH_SIZE < files.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i / this.BATCH_SIZE) + 1} failed:`, error);
        
        // Add error results for failed batch
        for (const file of batch) {
          results.push({
            success: false,
            dataUrl: '',
            originalSize: file.size,
            compressedSize: 0,
            compressionRatio: 0,
            format: 'error',
            dimensions: { width: 0, height: 0 },
            error: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Upload compressed images to server with retry logic
   */
  private async uploadToServerWithRetry(
    compressionResults: CompressionResult[],
    recipeId: string,
    imageType: 'thumbnail' | 'hero' | 'gallery',
    altText?: string
  ): Promise<ImageUploadResponse> {
    // Convert compressed data URLs back to File objects
    const files: File[] = compressionResults.map((result, index) => {
      const arr = result.dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      const extension = mime.includes('webp') ? 'webp' : 'jpg';
      return new File([u8arr], `compressed_image_${index + 1}.${extension}`, { type: mime });
    });

    let attempt = 0;
    while (attempt < this.MAX_RETRIES) {
      try {
        console.log(`📡 Uploading ${files.length} compressed images to server (attempt ${attempt + 1})`);
        return await imageService.uploadImages(recipeId, files, imageType, altText);
      } catch (error) {
        attempt++;
        console.warn(`⚠️ Upload attempt ${attempt} failed:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`🔄 Retrying upload in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    throw new Error('All upload attempts failed');
  }

  /**
   * Create temporary image objects for recipe creation
   */
  private createTemporaryImages(
    compressionResults: CompressionResult[],
    imageType: 'thumbnail' | 'hero' | 'gallery',
    altText?: string
  ): RecipeImage[] {
    return compressionResults.map((result, index) => ({
      id: `temp-${Date.now()}-${index}`,
      recipe_id: '',
      filename: `compressed_image_${index + 1}.${result.format}`,
      file_path: '',
      url: result.dataUrl,
      image_type: imageType,
      file_size: result.compressedSize,
      mime_type: `image/${result.format}`,
      alt_text: altText || `Compressed image ${index + 1}`,
      width: result.dimensions.width,
      height: result.dimensions.height,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }

  /**
   * Check if device has sufficient resources for image processing
   */
  async checkDeviceCapabilities(): Promise<{
    canProcessImages: boolean;
    recommendedBatchSize: number;
    maxImageSize: number;
    supportedFormats: string[];
    memoryInfo?: any;
  }> {
    const isMobile = detectPlatform() === 'mobile';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Test canvas support
    const canProcessImages = !!ctx;
    
    // Get memory info if available
    const memoryInfo = 'memory' in performance ? (performance as any).memory : undefined;
    
    // Determine optimal settings based on device
    const recommendedBatchSize = isMobile ? 2 : 5;
    const maxImageSize = isMobile ? 10 * 1024 * 1024 : 20 * 1024 * 1024; // 10MB mobile, 20MB desktop
    
    // Test format support
    const supportedFormats = ['jpeg'];
    if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
      supportedFormats.push('webp');
    }
    
    return {
      canProcessImages,
      recommendedBatchSize,
      maxImageSize,
      supportedFormats,
      memoryInfo
    };
  }

  /**
   * Clean up temporary resources
   */
  cleanup(): void {
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
    
    console.log('🧹 Mobile image service cleanup completed');
  }
}

// Export singleton instance
export const enhancedMobileImageService = new EnhancedMobileImageService();
export default enhancedMobileImageService;
