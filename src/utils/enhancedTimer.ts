// Enhanced Timer System with Browser-Independent Accuracy
// Implements Service Worker + Shared Worker + Wake Lock + Multiple Verification

export interface TimerData {
  id: string;
  name: string;
  duration: number; // in minutes
  endTime: number;
  startTime: number;
}

export interface TimerStatus {
  id: string;
  name: string;
  duration: number;
  remaining: number; // in seconds
  endTime: number;
  isRunning: boolean;
}

export interface TimerCallbacks {
  onUpdate?: (remaining: number) => void;
  onComplete?: (timerId: string, timerName: string) => void;
  onError?: (error: string) => void;
}

class EnhancedTimer {
  private serviceWorker: ServiceWorker | null = null;
  private sharedWorker: SharedWorker | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private activeTimers = new Map<string, TimerData>();
  private callbacks: TimerCallbacks = {};
  private isInitialized = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private verificationInterval: NodeJS.Timeout | null = null;

  constructor(callbacks: TimerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  // Initialize the enhanced timer system
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Method 1: Register Service Worker
      await this.registerServiceWorker();
      
      // Method 2: Initialize Shared Worker (fallback)
      await this.initializeSharedWorker();
      
      // Method 3: Request notification permissions
      await this.requestNotificationPermission();
      
      // Method 4: Start verification system
      this.startVerificationSystem();
      
      // Start keep-alive system
      this.startKeepAlive();
      
      this.isInitialized = true;
      console.log('Enhanced timer system initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize enhanced timer system:', error);
      return false;
    }
  }

  // Method 1: Service Worker Registration
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/timer-worker.js');
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Get the active service worker
      if (registration.active) {
        this.serviceWorker = registration.active;
        console.log('Service Worker registered and active');
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                this.serviceWorker = newWorker;
                console.log('Service Worker updated and activated');
              }
            });
          }
        });
      } else {
        throw new Error('Service Worker not active');
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Method 2: Shared Worker Initialization
  private async initializeSharedWorker(): Promise<void> {
    if (!('SharedWorker' in window)) {
      console.warn('Shared Worker not supported, using fallback');
      return;
    }

    try {
      this.sharedWorker = new SharedWorker('/shared-timer-worker.js');
      
      this.sharedWorker.port.addEventListener('message', this.handleSharedWorkerMessage.bind(this));
      this.sharedWorker.port.start();
      
      console.log('Shared Worker initialized');
    } catch (error) {
      console.error('Shared Worker initialization failed:', error);
    }
  }

  // Method 3: Notification Permission Request
  private async requestNotificationPermission(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted');
        } else {
          console.warn('Notification permission denied');
        }
      } catch (error) {
        console.error('Failed to request notification permission:', error);
      }
    }
  }

  // Method 4: Multiple Verification System
  private startVerificationSystem(): void {
    // Verify timer completion every 5 seconds
    this.verificationInterval = setInterval(() => {
      this.verifyAllTimers();
    }, 5000);
  }

  // Start a timer using the most reliable method available
  async startTimer(name: string, duration: number): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const timerId = `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const endTime = startTime + (duration * 60 * 1000);

    const timerData: TimerData = {
      id: timerId,
      name,
      duration,
      endTime,
      startTime
    };

    this.activeTimers.set(timerId, timerData);

    try {
      // Method 1: Service Worker (Primary)
      if (this.serviceWorker) {
        this.serviceWorker.postMessage({
          type: 'START_TIMER',
          data: {
            id: timerId,
            name,
            duration
          }
        });
        console.log(`Timer started via Service Worker: ${name}`);
      }
      // Method 2: Shared Worker (Fallback)
      else if (this.sharedWorker) {
        this.sharedWorker.port.postMessage({
          type: 'START_TIMER',
          data: {
            id: timerId,
            name,
            duration
          }
        });
        console.log(`Timer started via Shared Worker: ${name}`);
      }

      // Method 3: Request Wake Lock
      await this.requestWakeLock();

      // Method 4: Store in localStorage for verification
      this.storeTimerInLocalStorage(timerData);

      console.log(`Timer "${name}" started for ${duration} minutes`);
      return timerId;
    } catch (error) {
      console.error('Failed to start timer:', error);
      this.activeTimers.delete(timerId);
      throw error;
    }
  }

  // Stop a timer
  async stopTimer(timerId: string): Promise<void> {
    const timer = this.activeTimers.get(timerId);
    if (!timer) return;

    try {
      // Stop in Service Worker
      if (this.serviceWorker) {
        this.serviceWorker.postMessage({
          type: 'STOP_TIMER',
          data: { id: timerId }
        });
      }

      // Stop in Shared Worker
      if (this.sharedWorker) {
        this.sharedWorker.port.postMessage({
          type: 'STOP_TIMER',
          data: { id: timerId }
        });
      }

      // Remove from active timers
      this.activeTimers.delete(timerId);

      // Remove from localStorage
      this.removeTimerFromLocalStorage(timerId);

      // Release wake lock if no timers are running
      if (this.activeTimers.size === 0) {
        await this.releaseWakeLock();
      }

      console.log(`Timer "${timer.name}" stopped`);
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  }

  // Get timer status
  async getTimerStatus(timerId: string): Promise<TimerStatus | null> {
    try {
      // Try Service Worker first
      if (this.serviceWorker) {
        const status = await this.getServiceWorkerTimerStatus(timerId);
        if (status) return status;
      }

      // Fallback to Shared Worker
      if (this.sharedWorker) {
        const status = await this.getSharedWorkerTimerStatus(timerId);
        if (status) return status;
      }

      // Fallback to local calculation
      return this.getLocalTimerStatus(timerId);
    } catch (error) {
      console.error('Failed to get timer status:', error);
      return null;
    }
  }

  // Get all active timers
  async getAllTimers(): Promise<TimerStatus[]> {
    try {
      // Try Service Worker first
      if (this.serviceWorker) {
        const timers = await this.getServiceWorkerAllTimers();
        if (timers.length > 0) return timers;
      }

      // Fallback to Shared Worker
      if (this.sharedWorker) {
        const timers = await this.getSharedWorkerAllTimers();
        if (timers.length > 0) return timers;
      }

      // Fallback to local timers
      return Array.from(this.activeTimers.values()).map(timer => ({
        id: timer.id,
        name: timer.name,
        duration: timer.duration,
        remaining: Math.max(0, Math.ceil((timer.endTime - Date.now()) / 1000)),
        endTime: timer.endTime,
        isRunning: timer.endTime > Date.now()
      }));
    } catch (error) {
      console.error('Failed to get all timers:', error);
      return [];
    }
  }

  // Wake Lock Management
  private async requestWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported');
      return;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake lock active');
    } catch (error) {
      console.error('Wake lock failed:', error);
    }
  }

  private async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Wake lock released');
      } catch (error) {
        console.error('Wake lock release failed:', error);
      }
    }
  }

  // Local Storage Management
  private storeTimerInLocalStorage(timerData: TimerData): void {
    try {
      const key = `enhanced_timer_${timerData.id}`;
      localStorage.setItem(key, JSON.stringify(timerData));
    } catch (error) {
      console.error('Failed to store timer in localStorage:', error);
    }
  }

  private removeTimerFromLocalStorage(timerId: string): void {
    try {
      const key = `enhanced_timer_${timerId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove timer from localStorage:', error);
    }
  }

  // Verification System
  private verifyAllTimers(): void {
    for (const [timerId, timer] of this.activeTimers) {
      const now = Date.now();
      if (now >= timer.endTime) {
        console.log(`Timer verification: "${timer.name}" completed`);
        this.handleTimerCompletion(timerId, timer.name);
      }
    }
  }

  private handleTimerCompletion(timerId: string, timerName: string): void {
    // Remove from active timers
    this.activeTimers.delete(timerId);
    
    // Remove from localStorage
    this.removeTimerFromLocalStorage(timerId);
    
    // Call completion callback
    if (this.callbacks.onComplete) {
      this.callbacks.onComplete(timerId, timerName);
    }
    
    // Release wake lock if no timers are running
    if (this.activeTimers.size === 0) {
      this.releaseWakeLock();
    }
  }

  // Service Worker Communication
  private async getServiceWorkerTimerStatus(timerId: string): Promise<TimerStatus | null> {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'TIMER_STATUS') {
          resolve(event.data.status);
        } else {
          resolve(null);
        }
      };

      if (this.serviceWorker) {
        this.serviceWorker.postMessage({
          type: 'GET_TIMER_STATUS',
          data: { id: timerId }
        }, [channel.port2]);
      } else {
        resolve(null);
      }
    });
  }

  private async getServiceWorkerAllTimers(): Promise<TimerStatus[]> {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'ALL_TIMERS') {
          resolve(event.data.timers);
        } else {
          resolve([]);
        }
      };

      if (this.serviceWorker) {
        this.serviceWorker.postMessage({
          type: 'GET_ALL_TIMERS',
          data: {}
        }, [channel.port2]);
      } else {
        resolve([]);
      }
    });
  }

  // Shared Worker Communication
  private async getSharedWorkerTimerStatus(timerId: string): Promise<TimerStatus | null> {
    return new Promise((resolve) => {
      if (!this.sharedWorker) {
        resolve(null);
        return;
      }

      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'TIMER_STATUS') {
          resolve(event.data.status);
        } else {
          resolve(null);
        }
      };

      this.sharedWorker.port.postMessage({
        type: 'GET_TIMER_STATUS',
        data: { id: timerId }
      }, [channel.port2]);
    });
  }

  private async getSharedWorkerAllTimers(): Promise<TimerStatus[]> {
    return new Promise((resolve) => {
      if (!this.sharedWorker) {
        resolve([]);
        return;
      }

      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'ALL_TIMERS') {
          resolve(event.data.timers);
        } else {
          resolve([]);
        }
      };

      this.sharedWorker.port.postMessage({
        type: 'GET_ALL_TIMERS',
        data: {}
      }, [channel.port2]);
    });
  }

  // Local Timer Status (fallback)
  private getLocalTimerStatus(timerId: string): TimerStatus | null {
    const timer = this.activeTimers.get(timerId);
    if (!timer) return null;

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((timer.endTime - now) / 1000));

    return {
      id: timer.id,
      name: timer.name,
      duration: timer.duration,
      remaining,
      endTime: timer.endTime,
      isRunning: remaining > 0
    };
  }

  // Message Handlers
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, id, remaining, name } = event.data;

    switch (type) {
      case 'TIMER_UPDATE':
        if (this.callbacks.onUpdate) {
          this.callbacks.onUpdate(remaining);
        }
        break;
        
      case 'TIMER_COMPLETE':
        this.handleTimerCompletion(id, name);
        break;
        
      case 'RESTART_TIMER':
        // Handle restart request from notification
        console.log(`Restart requested for timer: ${name}`);
        break;
    }
  }

  private handleSharedWorkerMessage(event: MessageEvent): void {
    const { type, id, remaining, name } = event.data;

    switch (type) {
      case 'TIMER_UPDATE':
        if (this.callbacks.onUpdate) {
          this.callbacks.onUpdate(remaining);
        }
        break;
        
      case 'TIMER_COMPLETE':
        this.handleTimerCompletion(id, name);
        break;
        
      case 'EXISTING_TIMERS':
        // Handle existing timers from shared worker
        console.log('Received existing timers from shared worker');
        break;
    }
  }

  // Keep Alive System
  private startKeepAlive(): void {
    // Send keep-alive ping every 25 seconds to prevent service worker termination
    this.keepAliveInterval = setInterval(() => {
      if (this.activeTimers.size > 0) {
        this.sendKeepAlivePing();
      }
    }, 25000);
  }

  private sendKeepAlivePing(): void {
    try {
      // Ping service worker
      if (this.serviceWorker) {
        this.serviceWorker.postMessage({ type: 'PING' });
      }

      // Ping shared worker
      if (this.sharedWorker) {
        this.sharedWorker.port.postMessage({ type: 'PING' });
      }

      // Fetch keep-alive endpoint
      fetch('/timer-keepalive').catch(() => {
        // Ignore fetch errors for keep-alive
      });
    } catch (error) {
      console.error('Keep-alive ping failed:', error);
    }
  }

  // Cleanup
  async destroy(): Promise<void> {
    try {
      // Stop all timers
      for (const [timerId] of this.activeTimers) {
        await this.stopTimer(timerId);
      }

      // Clear intervals
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
      }
      if (this.verificationInterval) {
        clearInterval(this.verificationInterval);
      }

      // Release wake lock
      await this.releaseWakeLock();

      // Terminate shared worker
      if (this.sharedWorker) {
        this.sharedWorker.port.postMessage({ type: 'DISCONNECT' });
        this.sharedWorker = null;
      }

      this.isInitialized = false;
      console.log('Enhanced timer system destroyed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

export default EnhancedTimer;
