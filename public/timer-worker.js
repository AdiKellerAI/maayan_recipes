// Service Worker for Background Timer Accuracy
// This worker runs independently of the main thread and prevents browser throttling

const TIMER_STORE = 'cooking-timers';
let timers = new Map();
let wakeLock = null;

// Request wake lock to prevent system sleep
const requestWakeLock = async () => {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake lock active');
    } catch (err) {
      console.error('Wake lock failed:', err);
    }
  }
};

// Release wake lock
const releaseWakeLock = async () => {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('Wake lock released');
    } catch (err) {
      console.error('Wake lock release failed:', err);
    }
  }
};

// Send notification to all clients
const notifyClients = async (message) => {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage(message);
    });
  } catch (error) {
    console.error('Failed to notify clients:', error);
  }
};

// Send system notification
const sendSystemNotification = (title, options = {}) => {
  if ('Notification' in self && self.Notification.permission === 'granted') {
    try {
      new self.Notification(title, {
        icon: '/logo_new.svg',
        badge: '/logo_new.svg',
        tag: 'cooking-timer',
        requireInteraction: true,
        ...options
      });
    } catch (error) {
      console.error('Failed to send system notification:', error);
    }
  }
};

// Start a timer
const startTimer = (timerId, data) => {
  const endTime = Date.now() + (data.duration * 60 * 1000);
  
  // Store timer data
  timers.set(timerId, {
    endTime,
    name: data.name,
    duration: data.duration,
    startTime: Date.now(),
    interval: null
  });
  
  console.log(`Timer started: ${data.name} for ${data.duration} minutes, ends at ${new Date(endTime).toLocaleTimeString()}`);
  
  // Request wake lock
  requestWakeLock();
  
  // Start checking every 100ms for high precision
  const interval = setInterval(async () => {
    const now = Date.now();
    const timer = timers.get(timerId);
    
    if (!timer) {
      clearInterval(interval);
      return;
    }
    
    const remaining = Math.max(0, timer.endTime - now);
    const remainingSeconds = Math.ceil(remaining / 1000);
    
    // Send progress update every second
    if (Math.floor(now / 1000) !== Math.floor((now - 100) / 1000)) {
      notifyClients({
        type: 'TIMER_UPDATE',
        id: timerId,
        remaining: remainingSeconds,
        name: timer.name
      });
    }
    
    // Check if timer completed
    if (remaining <= 0) {
      console.log(`Timer completed: ${timer.name}`);
      
      // Clear interval
      clearInterval(interval);
      timers.delete(timerId);
      
      // Release wake lock
      releaseWakeLock();
      
      // Notify all clients
      notifyClients({
        type: 'TIMER_COMPLETE',
        id: timerId,
        name: timer.name
      });
      
      // Send system notification
      sendSystemNotification(`Timer "${timer.name}" completed!`, {
        body: `Your ${timer.duration}-minute timer has finished.`,
        actions: [
          { action: 'restart', title: 'Restart Timer' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
      
      // Play notification sound (if possible)
      try {
        const audioContext = new (self.AudioContext || self.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.8);
      } catch (error) {
        console.log('Audio notification not available');
      }
    }
  }, 100);
  
  // Store the interval reference
  timers.get(timerId).interval = interval;
};

// Stop a timer
const stopTimer = (timerId) => {
  const timer = timers.get(timerId);
  if (timer) {
    if (timer.interval) {
      clearInterval(timer.interval);
    }
    timers.delete(timerId);
    console.log(`Timer stopped: ${timer.name}`);
  }
  
  // Release wake lock if no timers are running
  if (timers.size === 0) {
    releaseWakeLock();
  }
};

// Get timer status
const getTimerStatus = (timerId) => {
  const timer = timers.get(timerId);
  if (!timer) return null;
  
  const now = Date.now();
  const remaining = Math.max(0, timer.endTime - now);
  
  return {
    id: timerId,
    name: timer.name,
    duration: timer.duration,
    remaining: Math.ceil(remaining / 1000),
    endTime: timer.endTime,
    isRunning: remaining > 0
  };
};

// Get all active timers
const getAllTimers = () => {
  const activeTimers = [];
  for (const [id, timer] of timers) {
    const now = Date.now();
    const remaining = Math.max(0, timer.endTime - now);
    
    activeTimers.push({
      id,
      name: timer.name,
      duration: timer.duration,
      remaining: Math.ceil(remaining / 1000),
      endTime: timer.endTime,
      isRunning: remaining > 0
    });
  }
  return activeTimers;
};

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch(type) {
    case 'START_TIMER':
      startTimer(data.id, data);
      break;
      
    case 'STOP_TIMER':
      stopTimer(data.id);
      break;
      
    case 'GET_TIMER_STATUS':
      const status = getTimerStatus(data.id);
      event.ports[0].postMessage({ type: 'TIMER_STATUS', status });
      break;
      
    case 'GET_ALL_TIMERS':
      const allTimers = getAllTimers();
      event.ports[0].postMessage({ type: 'ALL_TIMERS', timers: allTimers });
      break;
      
    case 'CLEAR_ALL_TIMERS':
      for (const [id] of timers) {
        stopTimer(id);
      }
      break;
      
    case 'PING':
      event.ports[0].postMessage({ type: 'PONG', timestamp: Date.now() });
      break;
  }
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Timer service worker installing...');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Timer service worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    if (data.type === 'TIMER_COMPLETE') {
      sendSystemNotification(`Timer "${data.name}" completed!`);
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'restart') {
    // Focus on the app and restart timer
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
          clients[0].focus();
          clients[0].postMessage({
            type: 'RESTART_TIMER',
            name: event.notification.title.replace('Timer "', '').replace('" completed!', '')
          });
        }
      })
    );
  } else {
    // Focus on the app
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
          clients[0].focus();
        }
      })
    );
  }
});

// Keep service worker alive
self.addEventListener('fetch', (event) => {
  // This prevents the service worker from being terminated
  if (event.request.url.includes('timer-keepalive')) {
    event.respondWith(new Response('OK'));
  }
});

// Periodic keep-alive to prevent termination
setInterval(() => {
  if (timers.size > 0) {
    console.log(`Service worker keeping alive with ${timers.size} active timers`);
  }
}, 30000); // Every 30 seconds

console.log('Timer service worker loaded and ready');
