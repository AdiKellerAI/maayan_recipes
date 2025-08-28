// Enhanced cache manager with performance optimizations and smart invalidation
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  key: string;
  size?: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
  averageAccessCount: number;
  memoryUsage: number;
}

export interface CacheConfig {
  maxSize: number; // Maximum number of entries
  maxMemory: number; // Maximum memory usage in bytes (approximate)
  defaultTTL: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
}

class EnhancedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private hitCount = 0;
  private missCount = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  private config: CacheConfig = {
    maxSize: 1000,
    maxMemory: 50 * 1024 * 1024, // 50MB
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    cleanupInterval: 5 * 60 * 1000 // 5 minutes
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.startCleanup();
    this.setupMemoryMonitoring();
  }

  // Set cache entry with automatic size calculation
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl || this.config.defaultTTL;
    const size = this.estimateSize(data);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: entryTTL,
      accessCount: 0,
      lastAccessed: now,
      key,
      size
    };

    // Check if we need to make space
    this.ensureCapacity(size);
    
    this.cache.set(key, entry);
    console.log(`📦 CACHE SET: ${key} (${size} bytes, TTL: ${entryTTL}ms)`);
  }

  // Get cache entry with access tracking
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.missCount++;
      console.log(`❌ CACHE MISS: ${key}`);
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      console.log(`⏰ CACHE EXPIRED: ${key}`);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.hitCount++;
    
    console.log(`✅ CACHE HIT: ${key} (accessed ${entry.accessCount} times)`);
    return entry.data;
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Delete specific key
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ CACHE DELETE: ${key}`);
    }
    return deleted;
  }

  // Clear all cache
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    console.log(`🧹 CACHE CLEARED: ${size} entries removed`);
  }

  // Get cache statistics
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    const timestamps = entries.map(e => e.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : now;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : now;
    
    const averageAccessCount = entries.length > 0 
      ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length 
      : 0;

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      oldestEntry: now - oldestEntry,
      newestEntry: now - newestEntry,
      averageAccessCount: Math.round(averageAccessCount * 100) / 100,
      memoryUsage: totalSize
    };
  }

  // Get keys matching pattern
  getKeys(pattern?: RegExp): string[] {
    const keys = Array.from(this.cache.keys());
    return pattern ? keys.filter(key => pattern.test(key)) : keys;
  }

  // Invalidate keys matching pattern
  invalidatePattern(pattern: RegExp): number {
    const keysToDelete = this.getKeys(pattern);
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🔄 CACHE INVALIDATE: ${keysToDelete.length} keys matching pattern`);
    return keysToDelete.length;
  }

  // Estimate size of data (approximate)
  private estimateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch {
      // Fallback estimation
      if (typeof data === 'string') return data.length * 2;
      if (typeof data === 'number') return 8;
      if (typeof data === 'boolean') return 4;
      if (Array.isArray(data)) return data.length * 100; // Rough estimate
      if (typeof data === 'object') return Object.keys(data).length * 50; // Rough estimate
      return 100; // Default estimate
    }
  }

  // Ensure cache doesn't exceed capacity limits
  private ensureCapacity(newEntrySize: number): void {
    // Check memory limit
    const currentMemory = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + (entry.size || 0), 0);
    
    if (currentMemory + newEntrySize > this.config.maxMemory) {
      this.evictByMemoryPressure(newEntrySize);
    }

    // Check size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed(Math.floor(this.config.maxSize * 0.1)); // Evict 10%
    }
  }

  // Evict entries when memory pressure is high
  private evictByMemoryPressure(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by access frequency and recency (LFU + LRU hybrid)
    entries.sort(([, a], [, b]) => {
      const scoreA = a.accessCount / Math.max(1, (Date.now() - a.lastAccessed) / 1000);
      const scoreB = b.accessCount / Math.max(1, (Date.now() - b.lastAccessed) / 1000);
      return scoreA - scoreB;
    });

    let freedMemory = 0;
    let evictedCount = 0;

    for (const [key, entry] of entries) {
      if (freedMemory >= requiredSpace) break;
      
      this.cache.delete(key);
      freedMemory += entry.size || 0;
      evictedCount++;
    }

    console.log(`🧹 MEMORY EVICTION: ${evictedCount} entries, ${freedMemory} bytes freed`);
  }

  // Evict least recently used entries
  private evictLeastRecentlyUsed(count: number): void {
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
    
    console.log(`🧹 LRU EVICTION: ${Math.min(count, entries.length)} entries removed`);
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`🧹 CACHE CLEANUP: ${expiredCount} expired entries removed`);
    }
  }

  // Start automatic cleanup
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // Setup memory monitoring
  private setupMemoryMonitoring(): void {
    // Monitor memory usage and adjust cache size if needed
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      setInterval(() => {
        const memory = (window.performance as any).memory;
        if (memory) {
          const usedMB = memory.usedJSHeapSize / 1024 / 1024;
          const totalMB = memory.totalJSHeapSize / 1024 / 1024;
          const usage = (usedMB / totalMB) * 100;
          
          // If memory usage is high, be more aggressive with cache eviction
          if (usage > 80) {
            console.log(`🔥 HIGH MEMORY USAGE: ${usage.toFixed(1)}%, reducing cache size`);
            this.evictLeastRecentlyUsed(Math.floor(this.cache.size * 0.2)); // Evict 20%
          }
        }
      }, 30000); // Check every 30 seconds
    }
  }

  // Destroy cache manager
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Cache keys for different data types
export const ENHANCED_CACHE_KEYS = {
  RECIPE_SUMMARIES: (query: string) => `summaries_${query}`,
  RECIPE_DETAILS: (id: string) => `details_${id}`,
  CATEGORIES: 'categories',
  STATS: 'stats',
  USER_PREFERENCES: 'user_preferences',
  SEARCH_RESULTS: (query: string) => `search_${query}`,
  FAVORITES: 'favorites'
};

// Export singleton instance
export const enhancedCache = new EnhancedCacheManager({
  maxSize: 500,
  maxMemory: 25 * 1024 * 1024, // 25MB
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 2 * 60 * 1000 // 2 minutes
});

// Export for testing
export { EnhancedCacheManager };
