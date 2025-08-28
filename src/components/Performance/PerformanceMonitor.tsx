import React, { useState, useEffect } from 'react';
import { Activity, Clock, Database, Zap, TrendingUp, BarChart3 } from 'lucide-react';
import { optimizedRecipeService } from '../../services/optimizedRecipeService';
import { enhancedCache } from '../../lib/enhancedCache';

interface PerformanceData {
  loadTime: number;
  cacheStats: any;
  apiHealth: boolean;
  memoryUsage?: number;
  requestCount: number;
}

const PerformanceMonitor: React.FC<{ 
  isVisible: boolean; 
  onClose: () => void;
}> = ({ isVisible, onClose }) => {
  const [perfData, setPerfData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load performance data
  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      const startTime = Date.now();
      
      // Test API health
      const apiHealth = await optimizedRecipeService.isAPIAvailable();
      
      // Get cache statistics
      const cacheStats = enhancedCache.getStats();
      
      // Get performance metrics
      const metrics = optimizedRecipeService.getPerformanceMetrics();
      
      // Get memory usage if available
      let memoryUsage;
      if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
        const memory = (window.performance as any).memory;
        memoryUsage = memory ? memory.usedJSHeapSize / 1024 / 1024 : undefined;
      }
      
      const loadTime = Date.now() - startTime;
      
      setPerfData({
        loadTime,
        cacheStats,
        apiHealth,
        memoryUsage,
        requestCount: metrics.length
      });
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh performance data
  useEffect(() => {
    if (!isVisible) return;
    
    loadPerformanceData();
    
    if (autoRefresh) {
      const interval = setInterval(loadPerformanceData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible, autoRefresh]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Activity className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">מוניטור ביצועים</h2>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {autoRefresh ? 'רענון אוטומטי' : 'רענון ידני'}
              </button>
              <button
                onClick={loadPerformanceData}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'טוען...' : 'רענן'}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading && !perfData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Activity className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600">טוען נתוני ביצועים...</p>
              </div>
            </div>
          ) : perfData ? (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* API Health */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">מצב API</p>
                      <p className="text-2xl font-bold text-green-900">
                        {perfData.apiHealth ? 'פעיל' : 'לא פעיל'}
                      </p>
                    </div>
                    <Database className={`h-8 w-8 ${perfData.apiHealth ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>

                {/* Load Time */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">זמן טעינה</p>
                      <p className="text-2xl font-bold text-blue-900">{perfData.loadTime}ms</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                {/* Cache Hit Rate */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-800">אחוז פגיעות מטמון</p>
                      <p className="text-2xl font-bold text-purple-900">{perfData.cacheStats.hitRate}%</p>
                    </div>
                    <Zap className="h-8 w-8 text-purple-600" />
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800">זיכרון</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {perfData.memoryUsage ? `${perfData.memoryUsage.toFixed(1)}MB` : 'N/A'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Detailed Statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cache Statistics */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="h-5 w-5 text-gray-600 ml-2 rtl:mr-2 rtl:ml-0" />
                    <h3 className="text-lg font-semibold text-gray-900">סטטיסטיקות מטמון</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">כמות ערכים:</span>
                      <span className="font-medium">{perfData.cacheStats.totalEntries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">פגיעות:</span>
                      <span className="font-medium text-green-600">{perfData.cacheStats.hitCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">החטאות:</span>
                      <span className="font-medium text-red-600">{perfData.cacheStats.missCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">גודל זיכרון:</span>
                      <span className="font-medium">{(perfData.cacheStats.memoryUsage / 1024).toFixed(1)}KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">גיל ערך הישן:</span>
                      <span className="font-medium">{Math.round(perfData.cacheStats.oldestEntry / 1000)}s</span>
                    </div>
                  </div>
                </div>

                {/* Request Statistics */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <Activity className="h-5 w-5 text-gray-600 ml-2 rtl:mr-2 rtl:ml-0" />
                    <h3 className="text-lg font-semibold text-gray-900">סטטיסטיקות בקשות</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">כמות בקשות:</span>
                      <span className="font-medium">{perfData.requestCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">זמן תגובה ממוצע:</span>
                      <span className="font-medium">{perfData.cacheStats.averageAccessCount}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">מצב חיבור:</span>
                      <span className={`font-medium ${perfData.apiHealth ? 'text-green-600' : 'text-red-600'}`}>
                        {perfData.apiHealth ? 'מחובר' : 'לא מחובר'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    enhancedCache.clear();
                    loadPerformanceData();
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                >
                  נקה מטמון
                </button>
                <button
                  onClick={() => {
                    optimizedRecipeService.clearCache();
                    loadPerformanceData();
                  }}
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium"
                >
                  נקה כל המטמונים
                </button>
                <button
                  onClick={() => {
                    console.log('Performance Data:', perfData);
                    console.log('Cache Stats:', enhancedCache.getStats());
                  }}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                >
                  הדפס לקונסול
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">שגיאה בטעינת נתוני ביצועים</p>
              <button
                onClick={loadPerformanceData}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                נסה שוב
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
