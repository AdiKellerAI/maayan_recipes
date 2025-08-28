// Image compression utility with HD quality for database storage
export const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check file size limit (10MB for mobile - larger limit to accommodate mobile photos)
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('קובץ התמונה גדול מדי. אנא בחר תמונה קטנה יותר (עד 10MB)'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const processImage = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      // For mobile photos, be more aggressive with resizing to ensure compatibility
      const isMobilePhoto = width > 2000 || height > 2000 || file.size > 2 * 1024 * 1024;
      const targetMaxWidth = isMobilePhoto ? Math.min(maxWidth, 1024) : maxWidth;
      
      // Determine the scaling factor - be more aggressive with compression for mobile
      const scaleFactor = Math.min(targetMaxWidth / width, targetMaxWidth / height);
      
      // Always resize to keep images reasonable for database storage
      if (scaleFactor < 1 || width > targetMaxWidth || height > targetMaxWidth) {
        width = Math.floor(width * scaleFactor);
        height = Math.floor(height * scaleFactor);
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress the image
      if (ctx) {
        // Use better image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed JPEG with HD quality for database storage
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Check if the compressed image is still too large (aim for under 500KB per image for HD quality)
        const maxSize = 500 * 1024; // 500KB in bytes (base64 is ~33% larger than binary)
        if (compressedDataUrl.length > maxSize && quality > 0.4) {
          // Try with slightly lower quality but still HD
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          
          if (compressedDataUrl.length > maxSize) {
            compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
          }
        }
        
        console.log(`📸 Image compressed: ${file.name} -> ${Math.round(compressedDataUrl.length / 1024)}KB`);
        resolve(compressedDataUrl);
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    
    // Add timeout for mobile devices that might be slow
    const timeoutId = setTimeout(() => {
      reject(new Error('Image processing timed out. Please try a smaller image.'));
    }, 30000); // 30 second timeout
    
    // Set up event handlers with timeout
    const handleImageLoad = () => {
      clearTimeout(timeoutId);
      processImage();
    };
    
    img.onload = handleImageLoad;
    
    img.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error('Image load error:', error);
      reject(new Error('Failed to load image. Please try a different format (JPG, PNG).'));
    };
    
    // Load the image with better mobile support
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        // Add crossOrigin for better mobile compatibility
        img.crossOrigin = 'anonymous';
        
        // Handle different result types for mobile compatibility
        const result = event.target.result;
        if (typeof result === 'string') {
          img.src = result;
        } else {
          // Convert ArrayBuffer to data URL for mobile compatibility
          const blob = new Blob([result], { type: file.type });
          const url = URL.createObjectURL(blob);
          
          // Override the onload to clean up the URL
          img.onload = () => {
            URL.revokeObjectURL(url);
            handleImageLoad();
          };
          
          img.src = url;
        }
      } else {
        reject(new Error('Failed to load image data'));
      }
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('Failed to read file. Please try a different image.'));
    };
    
    reader.readAsDataURL(file);
  });
};

// Compress multiple images with HD quality settings
export const compressImages = async (files: FileList, maxWidth: number = 1200, quality: number = 0.8): Promise<string[]> => {
  const compressionPromises = Array.from(files).map(file => compressImage(file, maxWidth, quality));
  return Promise.all(compressionPromises);
};