import React, { useState, useEffect } from 'react';
import { mobileRecipeService } from '../services/mobileRecipeService';
import { mobileImageService } from '../services/mobileImageService';
import { Trash2, Database, HardDrive, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface StorageStats {
  totalRecipes: number;
  totalImages: number;
  localStorageUsed: number;
  localStorageRemaining: number;
  strategy: string;
}

interface ImageStats {
  totalImages: number;
  indexedDBImages: number;
  localStorageImages: number;
  placeholderImages: number;
}

const MobileStorageStatus: React.FC = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [imageStats, setImageStats] = useState<ImageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadStorageStats();
    const interval = setInterval(loadStorageStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStorageStats = async () => {
    try {
      setIsLoading(true);
      
      // Get recipe storage stats
      const recipeStats = await mobileRecipeService.getStorageStats();
      setStorageStats(recipeStats);
      
      // Get image storage stats
      const imageStats = await getImageStorageStats();
      setImageStats(imageStats);
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getImageStorageStats = async (): Promise<ImageStats> => {
    try {
      const recipes = await mobileRecipeService.getAllRecipes();
      let indexedDBImages = 0;
      let localStorageImages = 0;
      let placeholderImages = 0;

      for (const recipe of recipes) {
        for (const image of recipe.images) {
          if (image === 'placeholder') {
            placeholderImages++;
          } else if (image.startsWith('mobile_')) {
            indexedDBImages++;
          } else {
            localStorageImages++;
          }
        }
      }

      return {
        totalImages: indexedDBImages + localStorageImages + placeholderImages,
        indexedDBImages,
        localStorageImages,
        placeholderImages
      };
    } catch (error) {
      console.error('Failed to get image stats:', error);
      return {
        totalImages: 0,
        indexedDBImages: 0,
        localStorageImages: 0,
        placeholderImages: 0
      };
    }
  };

  const cleanupOldData = async () => {
    try {
      setIsCleaning(true);
      
      // Clean up old recipes
      const deletedRecipes = await mobileRecipeService['cleanupOldData']();
      
      // Clean up old images
      const deletedImages = await mobileImageService.cleanupOldImages();
      
      // Reload stats
      await loadStorageStats();
      
      alert(`ניקוי הושלם בהצלחה!\nנמחקו ${deletedRecipes} מתכונים ו-${deletedImages} תמונות ישנות.`);
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      alert('שגיאה בניקוי הנתונים הישנים. אנא נסה שוב.');
    } finally {
      setIsCleaning(false);
    }
  };

  const getStorageUsagePercentage = () => {
    if (!storageStats) return 0;
    return Math.round((storageStats.localStorageUsed / (storageStats.localStorageUsed + storageStats.localStorageRemaining)) * 100);
  };

  const getStorageStatusColor = () => {
    const percentage = getStorageUsagePercentage();
    if (percentage > 80) return 'text-red-500';
    if (percentage > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStorageStatusIcon = () => {
    const percentage = getStorageUsagePercentage();
    if (percentage > 80) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (percentage > 60) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStrategyDescription = (strategy: string): string => {
    switch (strategy) {
      case 'images_indexeddb_metadata_localstorage':
        return 'תמונות ב-IndexedDB, מטא-דאטה ב-localStorage';
      case 'fallback_localstorage':
        return 'כל הנתונים ב-localStorage';
      case 'fallback_placeholder':
        return 'מטא-דאטה בלבד עם תמונות placeholder';
      default:
        return 'לא ידוע';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-gray-600">טוען סטטוס אחסון...</span>
        </div>
      </div>
    );
  }

  if (!storageStats || !imageStats) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center text-red-500">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>לא ניתן לטעון סטטוס האחסון</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <HardDrive className="w-5 h-5 mr-2 text-orange-500" />
          סטטוס אחסון במובייל
        </h3>
        <button
          onClick={loadStorageStats}
          className="text-orange-500 hover:text-orange-600 text-sm"
        >
          רענן
        </button>
      </div>

      {/* Storage Usage Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">שימוש באחסון</span>
          <span className={`text-sm font-medium ${getStorageStatusColor()}`}>
            {getStorageUsagePercentage()}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              getStorageUsagePercentage() > 80 ? 'bg-red-500' :
              getStorageUsagePercentage() > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${getStorageUsagePercentage()}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">
            {formatBytes(storageStats.localStorageUsed)} בשימוש
          </span>
          <span className="text-xs text-gray-500">
            {formatBytes(storageStats.localStorageRemaining)} פנוי
          </span>
        </div>
      </div>

      {/* Storage Strategy */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center mb-2">
          <Database className="w-4 h-4 mr-2 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">אסטרטגיית אחסון</span>
        </div>
        <p className="text-sm text-gray-600">
          {getStrategyDescription(storageStats.strategy)}
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{storageStats.totalRecipes}</div>
          <div className="text-xs text-orange-600">מתכונים</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{imageStats.totalImages}</div>
          <div className="text-xs text-blue-600">תמונות</div>
        </div>
      </div>

      {/* Image Storage Breakdown */}
      {imageStats.totalImages > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">פירוט אחסון תמונות</h4>
          <div className="space-y-2">
            {imageStats.indexedDBImages > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">ב-IndexedDB</span>
                <span className="font-medium text-blue-600">{imageStats.indexedDBImages}</span>
              </div>
            )}
            {imageStats.localStorageImages > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">ב-localStorage</span>
                <span className="font-medium text-orange-600">{imageStats.localStorageImages}</span>
              </div>
            )}
            {imageStats.placeholderImages > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Placeholder</span>
                <span className="font-medium text-gray-500">{imageStats.placeholderImages}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col space-y-3">
        <button
          onClick={cleanupOldData}
          disabled={isCleaning}
          className="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCleaning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              מנקה...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              נקה נתונים ישנים
            </>
          )}
        </button>
        
        <button
          onClick={loadStorageStats}
          className="flex items-center justify-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          <Info className="w-4 h-4 mr-2" />
          עדכן סטטוס
        </button>
      </div>

      {/* Last Update */}
      <div className="mt-4 text-center">
        <span className="text-xs text-gray-500">
          עודכן לאחרונה: {lastUpdate.toLocaleTimeString('he-IL')}
        </span>
      </div>
    </div>
  );
};

export default MobileStorageStatus;
