// Image compression utility with size limits for database storage
export const compressImage = (file: File, maxWidth: number = 600, quality: number = 0.5): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check file size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('קובץ התמונה גדול מדי. אנא בחר תמונה קטנה יותר (עד 5MB)'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      // Determine the scaling factor - be more aggressive with compression
      const scaleFactor = Math.min(maxWidth / width, maxWidth / height);
      
      // Always resize to keep images reasonable for database storage
      if (scaleFactor < 1 || width > maxWidth || height > maxWidth) {
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
        
        // Convert to compressed JPEG with lower quality for database storage
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Check if the compressed image is still too large (aim for under 100KB per image)
        const maxSize = 100 * 1024; // 100KB in bytes (base64 is ~33% larger than binary)
        if (compressedDataUrl.length > maxSize && quality > 0.2) {
          // Try with even lower quality
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.3);
          
          if (compressedDataUrl.length > maxSize) {
            compressedDataUrl = canvas.toDataURL('image/jpeg', 0.2);
          }
        }
        
        console.log(`📸 Image compressed: ${file.name} -> ${Math.round(compressedDataUrl.length / 1024)}KB`);
        resolve(compressedDataUrl);
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Load the image
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

// Compress multiple images with database-friendly settings
export const compressImages = async (files: FileList, maxWidth: number = 600, quality: number = 0.5): Promise<string[]> => {
  const compressionPromises = Array.from(files).map(file => compressImage(file, maxWidth, quality));
  return Promise.all(compressionPromises);
};