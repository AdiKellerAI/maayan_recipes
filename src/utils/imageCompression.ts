// Image compression utility
export const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      // Determine the scaling factor
      const scaleFactor = Math.min(maxWidth / width, maxWidth / height);
      
      // Only resize if image is larger than maxWidth
      if (scaleFactor < 1) {
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
        
        // Convert to compressed JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
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

// Compress multiple images
export const compressImages = async (files: FileList, maxWidth: number = 800, quality: number = 0.7): Promise<string[]> => {
  const compressionPromises = Array.from(files).map(file => compressImage(file, maxWidth, quality));
  return Promise.all(compressionPromises);
};