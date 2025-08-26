// Shared Worker for Cross-Tab Timer Accuracy
// This worker runs across multiple tabs and provides backup timing

const timers = new Map();
const connections = new Set();

// Broadcast message to all connected ports
const broadcastMessage = (message) => {
  connections.forEach(port => {
    try {
      port.postMessage(message);
    } catch (error) {
      console.error('Failed to send message to port:', error);
      connections.delete(port);
    }
  });
};

// Start a timer
const startTimer = (timerId, data, port) => {
  const endTime = Date.now() + (data.duration * 60 * 1000);
  
  // Store timer data
  timers.set(timerId, {
    endTime,
    name: data.name,
    duration: data.duration,
    startTime: Date.now(),
    port: port,
    interval: null
  });
  
  console.log(`Shared timer started: ${data.name} for ${data.duration} minutes`);
  
  // Start checking every 100ms for high precision
  const interval = setInterval(() => {
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
      port.postMessage({
        type: 'TIMER_UPDATE',
        id: timerId,
        remaining: remainingSeconds,
        name: timer.name
      });
    }
    
    // Check if timer completed
    if (remaining <= 0) {
      console.log(`Shared timer completed: ${timer.name}`);
      
      // Clear interval
      clearInterval(interval);
      timers.delete(timerId);
      
      // Notify the specific port
      port.postMessage({
        type: 'TIMER_COMPLETE',
        id: timerId,
        name: timer.name
      });
      
      // Broadcast to all other connections
      const completionMessage = {
        type: 'TIMER_COMPLETE_OTHER',
        id: timerId,
        name: timer.name
      };
      
      connections.forEach(connectedPort => {
        if (connectedPort !== port) {
          try {
            connectedPort.postMessage(completionMessage);
          } catch (error) {
            console.error('Failed to broadcast completion:', error);
          }
        }
      });
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
      clearInterval(interval);
    }
    timers.delete(timerId);
    console.log(`Shared timer stopped: ${timer.name}`);
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

// Handle new connections
self.addEventListener('connect', (event) => {
  const port = event.ports[0];
  connections.add(port);
  
  console.log(`New shared worker connection, total: ${connections.size}`);
  
  // Send current timer status to new connection
  const allTimers = getAllTimers();
  if (allTimers.length > 0) {
    port.postMessage({
      type: 'EXISTING_TIMERS',
      timers: allTimers
    });
  }
  
  // Handle messages from this port
  port.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch(type) {
      case 'START_TIMER':
        startTimer(data.id, data, port);
        break;
        
      case 'STOP_TIMER':
        stopTimer(data.id);
        break;
        
      case 'GET_TIMER_STATUS':
        const status = getTimerStatus(data.id);
        port.postMessage({ type: 'TIMER_STATUS', status });
        break;
        
      case 'GET_ALL_TIMERS':
        const timers = getAllTimers();
        port.postMessage({ type: 'ALL_TIMERS', timers });
        break;
        
      case 'CLEAR_ALL_TIMERS':
        for (const [id] of timers) {
          stopTimer(id);
        }
        break;
        
      case 'PING':
        port.postMessage({ type: 'PONG', timestamp: Date.now() });
        break;
        
      case 'DISCONNECT':
        connections.delete(port);
        console.log(`Shared worker connection closed, total: ${connections.size}`);
        break;
    }
  });
  
  // Handle port disconnection
  port.addEventListener('error', () => {
    connections.delete(port);
    console.log(`Shared worker connection error, total: ${connections.size}`);
  });
  
  // Start the port
  port.start();
  
  // Send welcome message
  port.postMessage({
    type: 'CONNECTED',
    message: 'Connected to shared timer worker',
    timestamp: Date.now()
  });
});

// Keep shared worker alive
setInterval(() => {
  if (timers.size > 0 || connections.size > 0) {
    console.log(`Shared worker keeping alive with ${timers.size} timers and ${connections.size} connections`);
  }
}, 30000); // Every 30 seconds

console.log('Shared timer worker loaded and ready');
