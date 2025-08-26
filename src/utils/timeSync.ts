// Server-Synchronized Timer System with Multiple Backup Systems
// This system prevents timer drift by syncing with external time APIs

// Multiple public time APIs as fallbacks
const TIME_APIS = [
  'https://worldtimeapi.org/api/timezone/UTC',
  'https://api.timezonedb.com/v2.1/get-timezone?key=demo&format=json&by=zone&zone=UTC',
  'https://timeapi.io/api/Time/current/zone?timeZone=UTC'
];

// Get server time from multiple APIs with fallbacks
export const getServerTime = async (): Promise<number> => {
  for (const api of TIME_APIS) {
    try {
      const response = await fetch(api, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      // Parse different API response formats
      let serverTime: number;
      if (data.datetime) {
        serverTime = new Date(data.datetime).getTime();
      } else if (data.formatted) {
        serverTime = new Date(data.formatted).getTime();
      } else if (data.dateTime) {
        serverTime = new Date(data.dateTime).getTime();
      } else if (data.timestamp) {
        serverTime = data.timestamp * 1000; // Convert seconds to milliseconds
      } else {
        continue; // Try next API
      }
      
      // Validate the time is reasonable (within 24 hours of local time)
      const localTime = Date.now();
      const timeDiff = Math.abs(serverTime - localTime);
      if (timeDiff > 24 * 60 * 60 * 1000) {
        continue; // Time difference too large, try next API
      }
      
      return serverTime;
    } catch (e) {
      console.warn(`Time sync failed for ${api}:`, e);
      continue; // Try next API
    }
  }
  
  // Fallback to local time if all APIs fail
  console.warn('All time APIs failed, using local time');
  return Date.now();
};

// Calculate offset between server and local time
export const calculateTimeOffset = async (): Promise<number> => {
  try {
    const localTime = Date.now();
    const serverTime = await getServerTime();
    return serverTime - localTime;
  } catch (e) {
    console.warn('Could not calculate time offset:', e);
    return 0; // No offset if sync fails
  }
};

// Get current time adjusted for server offset
export const getCurrentTime = (serverOffset: number): number => {
  return Date.now() + serverOffset;
};

// Timer storage keys
export const TIMER_STORAGE_KEYS = {
  END_TIME: 'syncTimerEndTime',
  TIMER_NAME: 'syncTimerName',
  SERVER_OFFSET: 'syncTimerServerOffset',
  DURATION: 'syncTimerDuration'
};

// Save timer state to localStorage
export const saveTimerState = (
  endTime: number,
  timerName: string,
  serverOffset: number,
  duration: number
): void => {
  try {
    localStorage.setItem(TIMER_STORAGE_KEYS.END_TIME, endTime.toString());
    localStorage.setItem(TIMER_STORAGE_KEYS.TIMER_NAME, timerName);
    localStorage.setItem(TIMER_STORAGE_KEYS.SERVER_OFFSET, serverOffset.toString());
    localStorage.setItem(TIMER_STORAGE_KEYS.DURATION, duration.toString());
  } catch (error) {
    console.warn('Failed to save timer state to localStorage:', error);
  }
};

// Load timer state from localStorage
export const loadTimerState = (): {
  endTime: number | null;
  timerName: string | null;
  serverOffset: number | null;
  duration: number | null;
} => {
  try {
    const endTime = localStorage.getItem(TIMER_STORAGE_KEYS.END_TIME);
    const timerName = localStorage.getItem(TIMER_STORAGE_KEYS.TIMER_NAME);
    const serverOffset = localStorage.getItem(TIMER_STORAGE_KEYS.SERVER_OFFSET);
    const duration = localStorage.getItem(TIMER_STORAGE_KEYS.DURATION);
    
    return {
      endTime: endTime ? parseInt(endTime) : null,
      timerName: timerName,
      serverOffset: serverOffset ? parseInt(serverOffset) : null,
      duration: duration ? parseInt(duration) : null
    };
  } catch (error) {
    console.warn('Failed to load timer state from localStorage:', error);
    return { endTime: null, timerName: null, serverOffset: null, duration: null };
  }
};

// Clear timer state from localStorage
export const clearTimerState = (): void => {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEYS.END_TIME);
    localStorage.removeItem(TIMER_STORAGE_KEYS.TIMER_NAME);
    localStorage.removeItem(TIMER_STORAGE_KEYS.SERVER_OFFSET);
    localStorage.removeItem(TIMER_STORAGE_KEYS.DURATION);
  } catch (error) {
    console.warn('Failed to clear timer state from localStorage:', error);
  }
};

// Check if timer should be running based on saved state
export const shouldTimerBeRunning = (
  endTime: number,
  serverOffset: number
): boolean => {
  const currentTime = getCurrentTime(serverOffset);
  return currentTime < endTime;
};

// Calculate remaining time
export const calculateRemainingTime = (
  endTime: number,
  serverOffset: number
): number => {
  const currentTime = getCurrentTime(serverOffset);
  return Math.max(0, endTime - currentTime);
};

// Web Worker code for background timer accuracy
export const createTimerWorker = (): Worker => {
  const workerCode = `
    let endTime = null;
    let syncOffset = 0;
    let updateInterval = null;
    let lastUpdateTime = 0;
    let isActive = true;
    let startTime = null;
    let isBackground = false;
    
    self.onmessage = function(e) {
      if (e.data.type === 'start') {
        endTime = e.data.endTime;
        syncOffset = e.data.syncOffset;
        startTime = Date.now();
        lastUpdateTime = startTime;
        isActive = true;
        isBackground = false;
        
        // Clear any existing interval
        if (updateInterval) {
          clearInterval(updateInterval);
        }
        
        // Start update loop with high precision for background accuracy
        updateInterval = setInterval(() => {
          if (!isActive || isBackground) return; // Don't process if stopped or in background
          
          const now = Date.now();
          const currentTime = now + syncOffset;
          const remaining = Math.max(0, endTime - currentTime);
          
          // Send update every second for accuracy
          if (now - lastUpdateTime >= 1000) {
            self.postMessage({
              type: 'update',
              remaining: Math.floor(remaining / 1000),
              timestamp: now
            });
            lastUpdateTime = now;
          }
          
          if (remaining <= 0 && isActive && !isBackground) {
            clearInterval(updateInterval);
            updateInterval = null;
            // Only send complete if still active and not in background
            if (isActive && !isBackground) {
              self.postMessage({ type: 'complete' });
            }
          }
        }, 100); // Update every 100ms for precision
      }
      
      if (e.data.type === 'sync') {
        syncOffset = e.data.syncOffset;
        // Recalculate remaining time with new offset
        if (endTime && startTime && !isBackground) {
          const now = Date.now();
          const currentTime = now + syncOffset;
          const remaining = Math.max(0, endTime - currentTime);
          
          self.postMessage({
            type: 'update',
            remaining: Math.floor(remaining / 1000),
            timestamp: now
          });
        }
      }
      
      if (e.data.type === 'background') {
        isBackground = true;
        // Stop all processing when going to background
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
      }
      
      if (e.data.type === 'foreground') {
        isBackground = false;
        // Restart processing when coming to foreground
        if (isActive && endTime) {
          updateInterval = setInterval(() => {
            if (!isActive || isBackground) return;
            
            const now = Date.now();
            const currentTime = now + syncOffset;
            const remaining = Math.max(0, endTime - currentTime);
            
            if (now - lastUpdateTime >= 1000) {
              self.postMessage({
                type: 'update',
                remaining: Math.floor(remaining / 1000),
                timestamp: now
              });
              lastUpdateTime = now;
            }
            
            if (remaining <= 0 && isActive && !isBackground) {
              clearInterval(updateInterval);
              updateInterval = null;
              if (isActive && !isBackground) {
                self.postMessage({ type: 'complete' });
              }
            }
          }, 100);
        }
      }
      
      if (e.data.type === 'stop') {
        console.log('Worker: STOPPING completely - no more processing');
        isActive = false;
        isBackground = false;
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
        endTime = null;
        startTime = null;
        lastUpdateTime = 0;
      }
    };
  `;
  
  return new Worker(URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' })));
};
