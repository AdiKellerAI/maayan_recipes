/**
 * Mobile-Optimized Image Service
 * 
 * This service solves the localStorage quota exceeded issue on mobile by:
 * 1. Using IndexedDB for large image data (base64)
 * 2. Using localStorage only for small metadata
 * 3. Implementing smart image compression and chunking
 * 4. Providing fallback mechanisms for different storage scenarios
 */

interface ImageMetadata {
  id: string;
  recipeId: string;
  filename: string;
  size: number;
  type: string;
  compressed: boolean;
  chunks: number;
  createdAt: number;
}

interface ImageChunk {
  id: string;
  imageId: string;
  chunkIndex: number;
  data: string;
  size: number;
}

interface StorageStatus {
  localStorage: {
    available: boolean;
    quota: number;
    used: number;
    remaining: number;
  };
  indexedDB: {
    available: boolean;
    version: number;
    databases: string[];
  };
  memory: {
    available: boolean;
    estimated: number;
  };
}

class MobileImageService {
  private dbName = 'MaayanRecipesImages';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private readonly CHUNK_SIZE = 500 * 1024; // 500KB chunks
  private readonly MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB max per image
  private readonly COMPRESSION_QUALITY = 0.7; // Mobile-optimized quality

  constructor() {
    this.initializeIndexedDB();
  }

  /**
   * Initialize IndexedDB for image storage
   */
  private async initializeIndexedDB(): Promise<void> {
    try {
      if (!window.indexedDB) {
        console.warn('⚠️ IndexedDB not supported, falling back to localStorage');
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('❌ IndexedDB initialization failed:', request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'id' });
          imageStore.createIndex('recipeId', 'recipeId', { unique: false });
          imageStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
          chunkStore.createIndex('imageId', 'imageId', { unique: false });
          chunkStore.createIndex('chunkIndex', 'chunkIndex', { unique: false });
        }
        
        console.log('✅ IndexedDB schema upgraded');
      };
    } catch (error) {
      console.error('❌ IndexedDB initialization error:', error);
    }
  }

  /**
   * Check storage availability and status
   */
  async checkStorageStatus(): Promise<StorageStatus> {
    const status: StorageStatus = {
      localStorage: { available: false, quota: 0, used: 0, remaining: 0 },
      indexedDB: { available: false, version: 0, databases: [] },
      memory: { available: false, estimated: 0 }
    };

    // Check localStorage
    try {
      const testKey = '__storage_test__';
      const testValue = 'x'.repeat(1024); // 1KB test
      
      localStorage.setItem(testKey, testValue);
      localStorage.removeItem(testKey);
      
      status.localStorage.available = true;
      
      // Estimate localStorage usage
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          used += localStorage.getItem(key)?.length || 0;
        }
      }
      
      status.localStorage.used = used;
      status.localStorage.quota = 5 * 1024 * 1024; // 5MB typical limit
      status.localStorage.remaining = Math.max(0, status.localStorage.quota - used);
    } catch (error) {
      status.localStorage.available = false;
    }

    // Check IndexedDB
    status.indexedDB.available = !!window.indexedDB;
    if (status.indexedDB.available) {
      try {
        const databases = await indexedDB.databases();
        status.indexedDB.databases = databases.map(db => db.name);
        status.indexedDB.version = this.dbVersion;
      } catch (error) {
        console.warn('Could not get IndexedDB databases list:', error);
      }
    }

    // Check memory availability
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      status.memory.available = true;
      status.memory.estimated = memory.jsHeapSizeLimit || 0;
    }

    return status;
  }

  /**
   * Smart image compression for mobile
   */
  private async compressImageForMobile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        
        // Mobile-optimized dimensions
        const maxDimension = 1024;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);

          // Progressive quality reduction for mobile
          let quality = this.COMPRESSION_QUALITY;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Ensure image is under size limit
          while (dataUrl.length > this.MAX_IMAGE_SIZE && quality > 0.3) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          console.log(`📱 Mobile image compressed: ${file.name} -> ${Math.round(dataUrl.length / 1024)}KB (quality: ${quality.toFixed(1)})`);
          resolve(dataUrl);
        } else {
          reject(new Error('Could not get canvas context'));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Split large image data into chunks
   */
  private splitIntoChunks(data: string, imageId: string): ImageChunk[] {
    const chunks: ImageChunk[] = [];
    const totalChunks = Math.ceil(data.length / this.CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, data.length);
      const chunkData = data.substring(start, end);

      chunks.push({
        id: `${imageId}_chunk_${i}`,
        imageId,
        chunkIndex: i,
        data: chunkData,
        size: chunkData.length
      });
    }

    return chunks;
  }

  /**
   * Store image in IndexedDB with chunking
   */
  private async storeImageInIndexedDB(imageId: string, data: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['images', 'chunks'], 'readwrite');
      const imageStore = transaction.objectStore('images');
      const chunkStore = transaction.objectStore('chunks');

      // Store image metadata
      const metadata: ImageMetadata = {
        id: imageId,
        recipeId: imageId.split('_')[0], // Extract recipe ID from image ID
        filename: `${imageId}.jpg`,
        size: data.length,
        type: 'image/jpeg',
        compressed: true,
        chunks: Math.ceil(data.length / this.CHUNK_SIZE),
        createdAt: Date.now()
      };

      const imageRequest = imageStore.put(metadata);
      imageRequest.onsuccess = () => {
        // Store image chunks
        const chunks = this.splitIntoChunks(data, imageId);
        let storedChunks = 0;

        chunks.forEach(chunk => {
          const chunkRequest = chunkStore.put(chunk);
          chunkRequest.onsuccess = () => {
            storedChunks++;
            if (storedChunks === chunks.length) {
              resolve();
            }
          };
          chunkRequest.onerror = () => reject(chunkRequest.error);
        });
      };

      imageRequest.onerror = () => reject(imageRequest.error);
    });
  }

  /**
   * Retrieve image from IndexedDB
   */
  private async retrieveImageFromIndexedDB(imageId: string): Promise<string | null> {
    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['images', 'chunks'], 'readonly');
      const imageStore = transaction.objectStore('images');
      const chunkStore = transaction.objectStore('chunks');

      // Get image metadata
      const imageRequest = imageStore.get(imageId);
      imageRequest.onsuccess = () => {
        const metadata = imageRequest.result as ImageMetadata;
        if (!metadata) {
          resolve(null);
          return;
        }

        // Get all chunks
        const chunksRequest = chunkStore.index('imageId').getAll(imageId);
        chunksRequest.onsuccess = () => {
          const chunks = chunksRequest.result as ImageChunk[];
          if (chunks.length === 0) {
            resolve(null);
            return;
          }

          // Sort chunks by index and reconstruct image
          chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
          const imageData = chunks.map(chunk => chunk.data).join('');
          resolve(imageData);
        };

        chunksRequest.onerror = () => reject(chunksRequest.error);
      };

      imageRequest.onerror = () => reject(imageRequest.error);
    });
  }

  /**
   * Save image with smart storage strategy
   */
  async saveImage(file: File, recipeId: string): Promise<string> {
    try {
      console.log('📱 Mobile: Starting image save process...');
      
      // Check storage status
      const storageStatus = await this.checkStorageStatus();
      console.log('📱 Storage status:', storageStatus);

      // Compress image for mobile
      const compressedData = await this.compressImageForMobile(file);
      const imageId = `${recipeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Try IndexedDB first
      if (storageStatus.indexedDB.available && this.db) {
        try {
          console.log('📱 Using IndexedDB for image storage...');
          await this.storeImageInIndexedDB(imageId, compressedData);
          
          // Store only metadata in localStorage
          const metadata: ImageMetadata = {
            id: imageId,
            recipeId,
            filename: file.name,
            size: compressedData.length,
            type: file.type,
            compressed: true,
            chunks: Math.ceil(compressedData.length / this.CHUNK_SIZE),
            createdAt: Date.now()
          };

          // Store minimal metadata in localStorage
          const localStorageKey = `image_meta_${imageId}`;
          localStorage.setItem(localStorageKey, JSON.stringify({
            id: imageId,
            recipeId,
            filename: file.name,
            size: compressedData.length,
            type: file.type,
            compressed: true,
            chunks: metadata.chunks,
            createdAt: metadata.createdAt,
            storage: 'indexeddb'
          }));

          console.log('✅ Image saved to IndexedDB with metadata in localStorage');
          return imageId;
        } catch (error) {
          console.warn('⚠️ IndexedDB storage failed, falling back to localStorage:', error);
        }
      }

      // Fallback to localStorage (with size check)
      if (storageStatus.localStorage.available && compressedData.length < storageStatus.localStorage.remaining) {
        console.log('📱 Using localStorage fallback...');
        const localStorageKey = `image_data_${imageId}`;
        localStorage.setItem(localStorageKey, compressedData);
        
        // Store metadata
        const metadataKey = `image_meta_${imageId}`;
        localStorage.setItem(metadataKey, JSON.stringify({
          id: imageId,
          recipeId,
          filename: file.name,
          size: compressedData.length,
          type: file.type,
          compressed: true,
          chunks: 1,
          createdAt: Date.now(),
          storage: 'localstorage'
        }));

        console.log('✅ Image saved to localStorage');
        return imageId;
      }

      // Last resort: return placeholder
      console.warn('⚠️ All storage methods failed, using placeholder');
      return 'placeholder';
    } catch (error) {
      console.error('❌ Image save failed:', error);
      throw new Error('Failed to save image');
    }
  }

  /**
   * Retrieve image by ID
   */
  async getImage(imageId: string): Promise<string | null> {
    try {
      // Check metadata first
      const metadataKey = `image_meta_${imageId}`;
      const metadataStr = localStorage.getItem(metadataKey);
      
      if (!metadataStr) {
        return null;
      }

      const metadata = JSON.parse(metadataStr);
      
      // Try IndexedDB first
      if (metadata.storage === 'indexeddb' && this.db) {
        const imageData = await this.retrieveImageFromIndexedDB(imageId);
        if (imageData) {
          return imageData;
        }
      }

      // Try localStorage
      if (metadata.storage === 'localstorage') {
        const dataKey = `image_data_${imageId}`;
        const imageData = localStorage.getItem(dataKey);
        if (imageData) {
          return imageData;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Image retrieval failed:', error);
      return null;
    }
  }

  /**
   * Delete image and clean up storage
   */
  async deleteImage(imageId: string): Promise<boolean> {
    try {
      // Get metadata
      const metadataKey = `image_meta_${imageId}`;
      const metadataStr = localStorage.getItem(metadataKey);
      
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        
        // Clean up IndexedDB
        if (metadata.storage === 'indexeddb' && this.db) {
          const transaction = this.db.transaction(['images', 'chunks'], 'readwrite');
          const imageStore = transaction.objectStore('images');
          const chunkStore = transaction.objectStore('chunks');
          
          imageStore.delete(imageId);
          const chunksRequest = chunkStore.index('imageId').getAllKeys(imageId);
          chunksRequest.onsuccess = () => {
            chunksRequest.result.forEach(key => chunkStore.delete(key));
          };
        }

        // Clean up localStorage
        localStorage.removeItem(metadataKey);
        if (metadata.storage === 'localstorage') {
          localStorage.removeItem(`image_data_${imageId}`);
        }

        console.log('✅ Image deleted successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Image deletion failed:', error);
      return false;
    }
  }

  /**
   * Get all images for a recipe
   */
  async getRecipeImages(recipeId: string): Promise<string[]> {
    try {
      const images: string[] = [];
      const keys = Object.keys(localStorage);
      
      for (const key of keys) {
        if (key.startsWith('image_meta_')) {
          try {
            const metadata = JSON.parse(localStorage.getItem(key) || '{}');
            if (metadata.recipeId === recipeId) {
              const imageData = await this.getImage(metadata.id);
              if (imageData) {
                images.push(imageData);
              }
            }
          } catch (error) {
            console.warn('⚠️ Failed to parse image metadata:', key, error);
          }
        }
      }

      return images;
    } catch (error) {
      console.error('❌ Failed to get recipe images:', error);
      return [];
    }
  }

  /**
   * Clean up old images to free storage
   */
  async cleanupOldImages(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      let deletedCount = 0;

      for (const key of keys) {
        if (key.startsWith('image_meta_')) {
          try {
            const metadata = JSON.parse(localStorage.getItem(key) || '{}');
            if (now - metadata.createdAt > maxAge) {
              await this.deleteImage(metadata.id);
              deletedCount++;
            }
          } catch (error) {
            console.warn('⚠️ Failed to parse image metadata during cleanup:', key, error);
          }
        }
      }

      console.log(`🧹 Cleaned up ${deletedCount} old images`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Image cleanup failed:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const mobileImageService = new MobileImageService();
export default mobileImageService;
