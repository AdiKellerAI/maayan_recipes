import React, { useState, useEffect } from 'react';
import { mobileImageService } from '../services/mobileImageService';
import { mobileRecipeService } from '../services/mobileRecipeService';

interface StorageStats {
  totalRecipes: number;
  totalImages: number;
  localStorageUsed: number;
  localStorageRemaining: number;
  strategy: string;
}

const MobileStorageStatus: React.FC = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    try {
      setIsLoading(true);
      const stats = await mobileRecipeService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupOldData = async () => {
    try {
      setIsLoading(true);
      
      // Clean up old images (older than 7 days)
      const imagesCleaned = await mobileImageService.cleanupOldImages(7 * 24 * 60 * 60 * 1000);
      
      // Clean up old recipes (older than 30 days)
      const recipesCleaned = await mobileRecipeService.cleanupOldData();
      
      // Reload stats
      await loadStorageStats();
      
      alert(`ניקוי הושלם בהצלחה!\nתמונות שנמחקו: ${imagesCleaned}\nמתכונים שנמחקו: ${recipesCleaned}`);
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      alert('שגיאה בניקוי הנתונים הישנים');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את כל הנתונים המקומיים? פעולה זו אינה הפיכה!')) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Clear all localStorage
      localStorage.clear();
      
      // Clear IndexedDB
      if (window.indexedDB) {
        const deleteRequest = indexedDB.deleteDatabase('MaayanRecipesImages');
        deleteRequest.onsuccess = () => {
          console.log('IndexedDB cleared successfully');
        };
      }
      
      // Reload stats
      await loadStorageStats();
      
      alert('כל הנתונים המקומיים נמחקו בהצלחה!');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      alert('שגיאה במחיקת כל הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  if (!storageStats) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-blue-800 font-medium">טוען סטטוס אחסון...</span>
          </div>
        </div>
      </div>
    );
  }

  const localStorageUsagePercent = Math.round((storageStats.localStorageUsed / (5 * 1024 * 1024)) * 100);
  const isStorageLow = localStorageUsagePercent > 80;

  return (
    <div className={`border rounded-lg p-4 mb-4 ${isStorageLow ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-medium ${isStorageLow ? 'text-red-800' : 'text-green-800'}`}>
          📱 סטטוס אחסון מובייל
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          {showDetails ? 'הסתר פרטים' : 'הצג פרטים'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">מתכונים:</span>
          <span className="font-medium">{storageStats.totalRecipes}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">תמונות:</span>
          <span className="font-medium">{storageStats.totalImages}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">אסטרטגיה:</span>
          <span className="font-medium text-xs bg-gray-100 px-2 py-1 rounded">
            {storageStats.strategy === 'images_indexeddb_metadata_localstorage' ? 'IndexedDB + localStorage' :
             storageStats.strategy === 'fallback_localstorage' ? 'localStorage בלבד' :
             storageStats.strategy === 'fallback_placeholder' ? 'מקום מוגבל' : 'לא ידוע'}
          </span>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">אחסון localStorage:</span>
              <span className="font-medium">
                {Math.round(storageStats.localStorageUsed / 1024)}KB / 5MB
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${isStorageLow ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${localStorageUsagePercent}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{localStorageUsagePercent}% בשימוש</span>
              <span>{Math.round(storageStats.localStorageRemaining / 1024)}KB פנוי</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex space-x-2 space-x-reverse">
        <button
          onClick={cleanupOldData}
          disabled={isLoading}
          className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'מנקה...' : 'נקה נתונים ישנים'}
        </button>
        
        <button
          onClick={clearAllData}
          disabled={isLoading}
          className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isLoading ? 'מוחק...' : 'מחק הכל'}
        </button>
        
        <button
          onClick={loadStorageStats}
          disabled={isLoading}
          className="px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 disabled:opacity-50"
        >
          {isLoading ? 'מעדכן...' : 'רענן'}
        </button>
      </div>

      {isStorageLow && (
        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
          ⚠️ האחסון המקומי כמעט מלא. מומלץ לנקות נתונים ישנים או למחוק מתכונים לא נחוצים.
        </div>
      )}
    </div>
  );
};

export default MobileStorageStatus;
