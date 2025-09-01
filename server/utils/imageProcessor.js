const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class ImageProcessor {
  constructor(options = {}) {
    this.uploadDir = options.uploadDir || 'uploads';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.allowedMimeTypes = options.allowedMimeTypes || [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ];
    this.imageSizes = options.imageSizes || {
      thumbnail: { width: 150, height: 150, quality: 80 },
      medium: { width: 500, height: 500, quality: 85 },
      large: { width: 1200, height: 1200, quality: 90 }
    };
  }

  /**
   * Validate uploaded file
   */
  validateFile(file) {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(this.maxFileSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName, recipeId) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, extension);
    
    // Sanitize filename
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    return `${sanitizedName}_${timestamp}_${randomString}${extension}`;
  }

  /**
   * Create directory structure for recipe images
   */
  async createRecipeDirectories(recipeId) {
    const recipePath = path.join(this.uploadDir, 'recipes', recipeId);
    const directories = [
      recipePath,
      path.join(recipePath, 'thumbnail'),
      path.join(recipePath, 'medium'),
      path.join(recipePath, 'large'),
      path.join(recipePath, 'original')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw new Error(`Failed to create directory ${dir}: ${error.message}`);
        }
      }
    }

    return recipePath;
  }

  /**
   * Process and resize image
   */
  async processImage(inputBuffer, size, options = {}) {
    const { width, height, quality } = this.imageSizes[size];
    
    let sharpInstance = sharp(inputBuffer);

    // Handle HEIC/HEIF conversion
    if (options.originalMimeType && options.originalMimeType.includes('heic')) {
      sharpInstance = sharpInstance.withMetadata();
    }

    // Resize with aspect ratio preservation
    sharpInstance = sharpInstance.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    });

    // Convert to WebP for better compression
    if (options.convertToWebP !== false) {
      sharpInstance = sharpInstance.webp({ quality });
    } else {
      sharpInstance = sharpInstance.jpeg({ quality });
    }

    return sharpInstance.toBuffer();
  }

  /**
   * Get image dimensions
   */
  async getImageDimensions(buffer) {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height
    };
  }

  /**
   * Upload and process image for a recipe
   */
  async uploadRecipeImage(file, recipeId, imageType = 'gallery') {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Create directories
      const recipePath = await this.createRecipeDirectories(recipeId);
      
      // Generate filename
      const originalFilename = this.generateFilename(file.originalname, recipeId);
      const baseName = path.basename(originalFilename, path.extname(originalFilename));
      
      // Get original image dimensions
      const originalDimensions = await this.getImageDimensions(file.buffer);
      
      // Process images for different sizes
      const processedImages = {};
      const imageMetadata = {};

      for (const [size, config] of Object.entries(this.imageSizes)) {
        const processedBuffer = await this.processImage(
          file.buffer, 
          size, 
          { 
            originalMimeType: file.mimetype,
            convertToWebP: size !== 'original'
          }
        );

        const filename = `${baseName}_${size}.webp`;
        const filePath = path.join(recipePath, size, filename);
        
        // Save file
        await fs.writeFile(filePath, processedBuffer);
        
        processedImages[size] = {
          filename,
          filePath,
          url: `/api/images/${recipeId}/${size}/${filename}`,
          size: processedBuffer.length,
          mimeType: 'image/webp',
          width: config.width,
          height: config.height
        };

        imageMetadata[size] = {
          file_size: processedBuffer.length,
          width: config.width,
          height: config.height
        };
      }

      // Save original file
      const originalFilenameWithExt = `${baseName}_original${path.extname(file.originalname)}`;
      const originalPath = path.join(recipePath, 'original', originalFilenameWithExt);
      await fs.writeFile(originalPath, file.buffer);

      processedImages.original = {
        filename: originalFilenameWithExt,
        filePath: originalPath,
        url: `/api/images/${recipeId}/original/${originalFilenameWithExt}`,
        size: file.buffer.length,
        mimeType: file.mimetype,
        width: originalDimensions.width,
        height: originalDimensions.height
      };

      return {
        success: true,
        images: processedImages,
        metadata: {
          originalName: file.originalname,
          originalSize: file.size,
          originalMimeType: file.mimetype,
          originalDimensions,
          processedSizes: imageMetadata
        }
      };

    } catch (error) {
      console.error('Error processing image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete image files
   */
  async deleteImageFiles(recipeId, filename) {
    try {
      const baseName = path.basename(filename, path.extname(filename));
      const recipePath = path.join(this.uploadDir, 'recipes', recipeId);
      
      const filesToDelete = [];
      
      // Add all size variants
      for (const size of Object.keys(this.imageSizes)) {
        const filePath = path.join(recipePath, size, `${baseName}_${size}.webp`);
        filesToDelete.push(filePath);
      }
      
      // Add original file
      const originalPath = path.join(recipePath, 'original', filename);
      filesToDelete.push(originalPath);

      // Delete files
      for (const filePath of filesToDelete) {
        try {
          await fs.unlink(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error(`Error deleting file ${filePath}:`, error);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting image files:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles(recipeIds) {
    try {
      const uploadPath = path.join(this.uploadDir, 'recipes');
      const directories = await fs.readdir(uploadPath);
      
      let deletedCount = 0;
      
      for (const dir of directories) {
        const recipeId = dir;
        
        // Skip if recipe still exists
        if (recipeIds.includes(recipeId)) {
          continue;
        }
        
        const recipePath = path.join(uploadPath, recipeId);
        
        try {
          // Recursively delete directory
          await this.deleteDirectoryRecursive(recipePath);
          deletedCount++;
          console.log(`Deleted orphaned recipe directory: ${recipePath}`);
        } catch (error) {
          console.error(`Error deleting orphaned directory ${recipePath}:`, error);
        }
      }
      
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Recursively delete directory
   */
  async deleteDirectoryRecursive(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await this.deleteDirectoryRecursive(filePath);
        } else {
          await fs.unlink(filePath);
        }
      }
      
      await fs.rmdir(dirPath);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const uploadPath = path.join(this.uploadDir, 'recipes');
      
      if (!await fs.access(uploadPath).then(() => true).catch(() => false)) {
        return { totalSize: 0, fileCount: 0, recipeCount: 0 };
      }
      
      const stats = await this.calculateDirectoryStats(uploadPath);
      
      return {
        totalSize: stats.size,
        fileCount: stats.count,
        recipeCount: stats.directories,
        humanReadableSize: this.formatBytes(stats.size)
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Calculate directory statistics
   */
  async calculateDirectoryStats(dirPath) {
    let totalSize = 0;
    let fileCount = 0;
    let directoryCount = 0;
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          directoryCount++;
          const subStats = await this.calculateDirectoryStats(itemPath);
          totalSize += subStats.size;
          fileCount += subStats.count;
        } else {
          totalSize += stat.size;
          fileCount++;
        }
      }
    } catch (error) {
      console.error(`Error calculating stats for ${dirPath}:`, error);
    }
    
    return { size: totalSize, count: fileCount, directories: directoryCount };
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = ImageProcessor;
