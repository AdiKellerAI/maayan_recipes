/**
 * Image utility functions for handling different image formats
 * and ensuring consistent image URLs across the application
 */

export interface ImageInfo {
  url: string;
  type: 'blob' | 'data' | 'server' | 'external' | 'placeholder';
  isValid: boolean;
  originalUrl?: string;
}

/**
 * Analyze image URL and determine its type
 */
export function analyzeImageUrl(url: string): ImageInfo {
  if (!url || typeof url !== 'string') {
    return {
      url: getPlaceholderUrl(),
      type: 'placeholder',
      isValid: false
    };
  }

  // Check if it's a blob URL (temporary, will break after memory clear)
  if (url.startsWith('blob:')) {
    return {
      url,
      type: 'blob',
      isValid: false,
      originalUrl: url
    };
  }

  // Check if it's a data URL (base64 encoded)
  if (url.startsWith('data:image/')) {
    return {
      url,
      type: 'data',
      isValid: true,
      originalUrl: url
    };
  }

  // Check if it's a server URL (our API)
  if (url.includes('/api/images/') || url.includes('/api/recipes/')) {
    return {
      url,
      type: 'server',
      isValid: true,
      originalUrl: url
    };
  }

  // Check if it's an external URL (like Pixabay)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return {
      url,
      type: 'external',
      isValid: true,
      originalUrl: url
    };
  }

  // Invalid or unknown format
  return {
    url: getPlaceholderUrl(),
    type: 'placeholder',
    isValid: false,
    originalUrl: url
  };
}

/**
 * Get a placeholder image URL
 */
export function getPlaceholderUrl(width: number = 500, height: number = 500, text: string = 'תמונה לא זמינה'): string {
  return `https://via.placeholder.com/${width}x${height}/f3f4f6/6b7280?text=${encodeURIComponent(text)}`;
}

/**
 * Convert blob URL to base64 data URL
 */
export async function blobToBase64(blobUrl: string): Promise<string> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting blob to base64:', error);
    throw error;
  }
}

/**
 * Convert base64 data URL to File object
 */
export function base64ToFile(base64: string, filename: string = 'image.jpg'): File {
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
 * Get optimized image URL for display
 * This ensures we always have a valid, consistent image URL
 */
export function getOptimizedImageUrl(imageUrl: string, fallbackText?: string): string {
  const imageInfo = analyzeImageUrl(imageUrl);
  
  // If it's already a valid server or external URL, use it
  if (imageInfo.isValid && (imageInfo.type === 'server' || imageInfo.type === 'external')) {
    return imageUrl;
  }
  
  // If it's a data URL, it's valid but might be large
  if (imageInfo.type === 'data') {
    return imageUrl;
  }
  
  // For blob URLs or invalid URLs, return placeholder
  return getPlaceholderUrl(500, 500, fallbackText || 'תמונה לא זמינה');
}

/**
 * Check if image URL is a temporary blob URL that will break
 */
export function isTemporaryImage(url: string): boolean {
  return url.startsWith('blob:');
}

/**
 * Get image display URL with fallback handling
 */
export function getImageDisplayUrl(imageUrl: string, recipeTitle?: string): string {
  const imageInfo = analyzeImageUrl(imageUrl);
  
  // If it's a blob URL (temporary), show placeholder
  if (imageInfo.type === 'blob') {
    return getPlaceholderUrl(500, 500, recipeTitle || 'תמונה זמנית');
  }
  
  // If it's invalid, show placeholder
  if (!imageInfo.isValid) {
    return getPlaceholderUrl(500, 500, recipeTitle || 'תמונה לא זמינה');
  }
  
  // Return the original URL for valid images
  return imageUrl;
}

/**
 * Process recipe images to ensure they're all in a consistent format
 */
export function processRecipeImages(images: string[]): string[] {
  return images.map(imageUrl => getImageDisplayUrl(imageUrl));
}

/**
 * Validate if an image URL is still accessible
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    // Skip validation for data URLs and blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return true;
    }
    
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn('Image validation failed for:', url, error);
    return false;
  }
}

/**
 * Universal image processing function for all platforms
 * This ensures consistent image format regardless of platform (mobile/desktop)
 */
export async function processImageForStorage(imageUrl: string, recipeTitle?: string): Promise<string> {
  const imageInfo = analyzeImageUrl(imageUrl);
  
  // If it's already a valid data URL, return as is
  if (imageInfo.type === 'data') {
    return imageUrl;
  }
  
  // If it's a blob URL, convert to base64
  if (imageInfo.type === 'blob') {
    try {
      console.log('🔄 Converting blob URL to base64 for storage...');
      const base64Url = await blobToBase64(imageUrl);
      console.log('✅ Successfully converted blob to base64');
      return base64Url;
    } catch (error) {
      console.error('❌ Failed to convert blob to base64:', error);
      // Return placeholder if conversion fails
      return getPlaceholderUrl(500, 500, recipeTitle || 'תמונה לא זמינה');
    }
  }
  
  // If it's a server or external URL, return as is
  if (imageInfo.type === 'server' || imageInfo.type === 'external') {
    return imageUrl;
  }
  
  // For invalid URLs, return placeholder
  return getPlaceholderUrl(500, 500, recipeTitle || 'תמונה לא זמינה');
}

/**
 * Process multiple images for storage
 */
export async function processImagesForStorage(images: string[], recipeTitle?: string): Promise<string[]> {
  const processedImages: string[] = [];
  
  for (const imageUrl of images) {
    try {
      const processedUrl = await processImageForStorage(imageUrl, recipeTitle);
      processedImages.push(processedUrl);
    } catch (error) {
      console.error('❌ Failed to process image:', imageUrl, error);
      // Skip this image if processing fails
      continue;
    }
  }
  
  return processedImages;
}

/**
 * Detect platform (mobile/desktop) for better image handling
 */
export function detectPlatform(): 'mobile' | 'desktop' {
  // Check for touch support and screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;
  
  return (hasTouch && isSmallScreen) ? 'mobile' : 'desktop';
}

/**
 * Get optimal image format for platform
 */
export function getOptimalImageFormat(platform: 'mobile' | 'desktop'): 'base64' | 'url' {
  // For mobile, prefer base64 to avoid network issues
  // For desktop, prefer URLs for better performance
  return platform === 'mobile' ? 'base64' : 'url';
}
