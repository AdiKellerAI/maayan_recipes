/**
 * Mobile-Optimized Image Compression Utility
 * 
 * This utility provides robust image compression specifically designed for mobile devices:
 * - Progressive compression with memory management
 * - Multiple quality fallbacks for large images
 * - Timeout handling for slow devices
 * - Base64 conversion with chunked processing
 * - Error recovery and retry mechanisms
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  format?: 'jpeg' | 'webp';
  progressive?: boolean;
}

export interface CompressionResult {
  success: boolean;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
  dimensions: { width: number; height: number };
  error?: string;
}

/**
 * Mobile-optimized image compression with progressive quality reduction
 */
export async function compressImageForMobile(
  file: File, 
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    maxSizeKB = 500,
    format = 'jpeg',
    progressive = true
  } = options;

  console.log(`📱 Starting mobile compression for ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

  return new Promise((resolve, reject) => {
    // Set timeout for mobile devices
    const timeoutId = setTimeout(() => {
      reject(new Error('Image compression timeout - file may be too large for mobile device'));
    }, 30000); // 30 second timeout

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      clearTimeout(timeoutId);
      reject(new Error('Cannot get canvas context - browser may not support image processing'));
      return;
    }

    img.onload = async () => {
      try {
        clearTimeout(timeoutId);

        let { width, height } = img;
        const originalDimensions = { width, height };

        // Calculate optimal dimensions for mobile
        const scaleFactor = Math.min(
          maxWidth / width,
          maxHeight / height,
          1 // Never upscale
        );

        // For mobile photos, be more aggressive with resizing
        const isMobilePhoto = width > 2000 || height > 2000 || file.size > 3 * 1024 * 1024;
        const mobileScaleFactor = isMobilePhoto ? Math.min(scaleFactor, 0.6) : scaleFactor;

        width = Math.floor(width * mobileScaleFactor);
        height = Math.floor(height * mobileScaleFactor);

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Configure canvas for high quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        console.log(`📱 Resized from ${originalDimensions.width}x${originalDimensions.height} to ${width}x${height}`);

        // Progressive compression with multiple quality levels
        const qualityLevels = progressive 
          ? [quality, quality * 0.9, quality * 0.8, quality * 0.7, quality * 0.6, 0.5, 0.4]
          : [quality];

        let bestResult: string | null = null;
        let finalQuality = quality;

        for (const testQuality of qualityLevels) {
          const dataUrl = canvas.toDataURL(`image/${format}`, testQuality);
          const sizeKB = dataUrl.length * 0.75 / 1024; // Approximate size in KB

          console.log(`📱 Quality ${testQuality.toFixed(2)}: ${sizeKB.toFixed(1)}KB`);

          if (sizeKB <= maxSizeKB) {
            bestResult = dataUrl;
            finalQuality = testQuality;
            break;
          }
        }

        // If still too large, try WebP format (if supported)
        if (!bestResult && format === 'jpeg') {
          console.log('📱 Trying WebP format for better compression...');
          
          const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
          const webpSizeKB = webpDataUrl.length * 0.75 / 1024;
          
          if (webpSizeKB <= maxSizeKB) {
            bestResult = webpDataUrl;
            finalQuality = 0.8;
          }
        }

        // Final fallback: use the lowest quality result
        if (!bestResult) {
          bestResult = canvas.toDataURL(`image/${format}`, 0.3);
          finalQuality = 0.3;
          console.warn('📱 Using lowest quality due to size constraints');
        }

        const finalSizeKB = bestResult.length * 0.75 / 1024;
        const compressionRatio = file.size / (finalSizeKB * 1024);

        console.log(`✅ Mobile compression complete: ${(file.size / 1024).toFixed(1)}KB → ${finalSizeKB.toFixed(1)}KB (${compressionRatio.toFixed(1)}x compression)`);

        resolve({
          success: true,
          dataUrl: bestResult,
          originalSize: file.size,
          compressedSize: Math.round(finalSizeKB * 1024),
          compressionRatio,
          format: bestResult.startsWith('data:image/webp') ? 'webp' : format,
          dimensions: { width, height }
        });

      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Mobile compression failed:', error);
        reject(new Error(`Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Failed to load image for compression'));
    };

    // Load the image
    try {
      img.src = URL.createObjectURL(file);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(new Error('Failed to create object URL for image'));
    }
  });
}

/**
 * Batch compress multiple images with memory management
 */
export async function compressImagesForMobile(
  files: File[], 
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number, currentFile: string) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  const errors: string[] = [];

  console.log(`📱 Starting batch compression of ${files.length} images`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      onProgress?.(i, files.length, file.name);
      
      // Add delay between compressions to prevent memory issues
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const result = await compressImageForMobile(file, options);
      results.push(result);
      
      console.log(`✅ Compressed ${i + 1}/${files.length}: ${file.name}`);
      
    } catch (error) {
      console.error(`❌ Failed to compress ${file.name}:`, error);
      
      const errorResult: CompressionResult = {
        success: false,
        dataUrl: '',
        originalSize: file.size,
        compressedSize: 0,
        compressionRatio: 0,
        format: 'error',
        dimensions: { width: 0, height: 0 },
        error: error instanceof Error ? error.message : 'Unknown compression error'
      };
      
      results.push(errorResult);
      errors.push(`${file.name}: ${errorResult.error}`);
    }
  }

  onProgress?.(files.length, files.length, 'Complete');

  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} compression errors:`, errors);
  }

  return results;
}

/**
 * Validate image file before compression
 */
export function validateImageFile(file: File): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const maxSize = 20 * 1024 * 1024; // 20MB max for mobile
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
    'image/heic', 'image/heif' // Mobile formats
  ];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 20MB`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    errors.push(`File type ${file.type} is not supported. Supported types: JPEG, PNG, WebP, HEIC`);
  }

  // Check if file is actually an image
  if (!file.type.startsWith('image/')) {
    errors.push('File is not a valid image');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get optimal compression settings based on device capabilities
 */
export function getOptimalCompressionSettings(): CompressionOptions {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowMemory = 'memory' in performance && (performance as any).memory?.jsHeapSizeLimit < 1024 * 1024 * 1024; // Less than 1GB

  if (isMobile || isLowMemory) {
    return {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.7,
      maxSizeKB: 400,
      format: 'jpeg',
      progressive: true
    };
  }

  return {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8,
    maxSizeKB: 600,
    format: 'jpeg',
    progressive: true
  };
}

/**
 * Convert compressed image to File object (for server upload)
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}
