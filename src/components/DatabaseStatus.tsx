import React, { useState, useEffect } from 'react';
import { Database, Wifi, WifiOff, AlertCircle, CheckCircle, RefreshCw, X } from 'lucide-react';

interface DatabaseStatusProps {
  isVisible?: boolean;
  onStatusChange?: (status: 'checking' | 'connected' | 'disconnected' | 'error') => void;
  onClose?: () => void;
}

const DatabaseStatus: React.FC<DatabaseStatusProps> = ({ isVisible = false, onStatusChange, onClose }) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [details, setDetails] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const checkConnection = async () => {
    setStatus('checking');
    try {
      console.log('🔍 DATABASE STATUS: Testing connection...');
      
      const response = await fetch('/api/test-connection', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000)
      });
      
      if (!response.ok) {
        console.warn('❌ DATABASE STATUS: API response not OK:', response.status);
        setStatus('error');
        onStatusChange?.('error');
        setDetails({ error: `HTTP ${response.status}: ${response.statusText}` });
        return;
      }
      
      const result = await response.json();
      console.log('✅ DATABASE STATUS: API response:', result);
      setDetails(result);
      
      if (result.connected === true || result.success === true) {
        setStatus('connected');
        onStatusChange?.('connected');
      } else {
        setStatus('disconnected');
        onStatusChange?.('disconnected');
      }
    } catch (error) {
      console.error('❌ DATABASE STATUS: Connection test failed:', error);
      setStatus('error');
      onStatusChange?.('error');
      setDetails({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'Error'
      });
    }
  };

  const forceReconnect = async () => {
    setStatus('checking');
    try {
      console.log('🔄 DATABASE STATUS: Force reconnection...');
      
      const response = await fetch('/api/reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        console.warn('❌ DATABASE STATUS: Reconnect API response not OK:', response.status);
        setStatus('error');
        onStatusChange?.('error');
        setDetails({ error: `HTTP ${response.status}: ${response.statusText}` });
        return;
      }
      
      const result = await response.json();
      console.log('✅ DATABASE STATUS: Reconnect response:', result);
      setDetails(result);
      
      if (result.connected === true || result.success === true) {
        setStatus('connected');
        onStatusChange?.('connected');
      } else {
        setStatus('disconnected');
        onStatusChange?.('disconnected');
      }
    } catch (error) {
      console.error('❌ DATABASE STATUS: Force reconnection failed:', error);
      setStatus('error');
      onStatusChange?.('error');
      setDetails({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'Error'
      });
    }
  };

  const clearAllStorageAndRefresh = () => {
    console.log('🧹 מנקה את כל הקאש והאחסון המקומי...');
    
    // נקה localStorage
    const keysToRemove = [
      'cache_all_recipes',
      'fallback_recipes', 
      'hebrew-recipes',
      'recipes-cache',
      'recipes-cache-timestamp',
      'recipe-favorites',
      'recipe-view-mode'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🗑️ הוסר:', key);
    });
    
    // נקה כל המפתחות שמתחילים ב-cache_
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_') || key.startsWith('recipe_progress_')) {
        localStorage.removeItem(key);
        console.log('🗑️ הוסר:', key);
      }
    });
    
    // נקה sessionStorage
    sessionStorage.clear();
    
    console.log('✅ קאש נוקה בהצלחה!');
    
    // רענן את הדף
    window.location.reload();
  };

  useEffect(() => {
    if (isVisible) {
      checkConnection();
    }
  }, [isVisible]);

  // Also check connection on component mount if visible
  useEffect(() => {
    if (isVisible) {
      checkConnection();
    }
  }, []);

  if (!isVisible) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'בודק חיבור...';
      case 'connected':
        return 'מחובר למאגר המידע';
      case 'disconnected':
        return 'לא מחובר למאגר המידע';
      case 'error':
        return 'שגיאה בחיבור';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'border-blue-200 bg-blue-50';
      case 'connected':
        return 'border-green-200 bg-green-50';
      case 'disconnected':
        return 'border-orange-200 bg-orange-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 max-w-md border-2 rounded-2xl p-6 shadow-2xl backdrop-blur-sm ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-4">
        <div 
          className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer flex-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Database className="h-5 w-5 text-gray-600" />
          {getStatusIcon()}
          <span className="text-base font-semibold text-gray-800">
            {getStatusText()}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              checkConnection();
            }}
            className="p-2 hover:bg-white/60 rounded-lg transition-all duration-200 hover:scale-105"
            title="בדוק שוב"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
          {(status === 'error' || status === 'disconnected') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                forceReconnect();
              }}
              className="p-2 hover:bg-white/60 rounded-lg transition-all duration-200 hover:scale-105"
              title="התחבר מחדש"
            >
              <Wifi className="h-4 w-4 text-blue-600" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            className="p-2 hover:bg-white/60 rounded-lg transition-all duration-200 hover:scale-105"
            title="סגור"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
      
      {isExpanded && details && (
        <div className="mt-4 pt-4 border-t border-gray-200/60">
          <div className="text-sm text-gray-700 space-y-2">
            {status === 'connected' && (
              <>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>שרת API: פעיל</span>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>PostgreSQL: מחובר</span>
                </div>
                {details.server_time && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-lg">🕒</span>
                    <span>זמן שרת: {new Date(details.server_time).toLocaleTimeString('he-IL')}</span>
                  </div>
                )}
                {details.pg_version && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-lg">🗄️</span>
                    <span>גרסת DB: {details.pg_version}</span>
                  </div>
                )}
                {details.recipe_count !== undefined && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-lg">📊</span>
                    <span>מתכונים: {details.recipe_count}</span>
                  </div>
                )}
                {details.connection_status && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-lg">🔗</span>
                    <span>סטטוס: {details.connection_status}</span>
                  </div>
                )}
              </>
            )}
            
            {status === 'disconnected' && (
              <>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span>שרת API: פעיל</span>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span>PostgreSQL: לא מחובר</span>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="text-lg">📦</span>
                  <span>משתמש ב-localStorage</span>
                </div>
              </>
            )}
            
            {status === 'error' && (
              <>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span>שגיאה: {details.error}</span>
                </div>
                {details.type && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-lg">ℹ️</span>
                    <span>סוג: {details.type}</span>
                  </div>
                )}
                {details.error_code && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-lg">🔢</span>
                    <span>קוד שגיאה: {details.error_code}</span>
                  </div>
                )}
                {details.retry_attempts !== undefined && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-lg">🔄</span>
                    <span>ניסיונות: {details.retry_attempts}/{details.max_attempts || 5}</span>
                  </div>
                )}
                {details.connection_status && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-lg">🔗</span>
                    <span>סטטוס: {details.connection_status}</span>
                  </div>
                )}
                {details.error && details.error.includes('fetch') && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-lg">🚫</span>
                    <span>השרת לא פועל - יש להפעיל את השרת</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="text-lg">📦</span>
                  <span>משתמש ב-localStorage</span>
                </div>
              </>
            )}
            
            <div className="mt-4 pt-3 border-t border-gray-200/60">
              <div className="flex flex-col space-y-3">
                {(status === 'error' || status === 'disconnected') && (
                  <button
                    onClick={forceReconnect}
                    className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm font-medium w-full text-center transition-all duration-200 hover:scale-105 shadow-md"
                    title="ניסיון התחברות מחודש למאגר המידע"
                  >
                    🔄 התחבר מחדש
                  </button>
                )}
                <button
                  onClick={clearAllStorageAndRefresh}
                  className="px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm font-medium w-full text-center transition-all duration-200 hover:scale-105 shadow-md"
                  title="ניקוי קאש ורענון הדף - יטען נתונים טריים מהשרת"
                >
                  🧹 נקה קאש ורענן
                </button>
                <div className="text-xs text-gray-500 text-center leading-relaxed">
                  {(status === 'error' || status === 'disconnected') ? 
                    'לחץ על 🔄 להתחבר מחדש • לחץ על 🧹 לרענן הדף' :
                    'לחץ כדי לרענן • לחץ על 🔄 כדי לבדוק שוב'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseStatus;
