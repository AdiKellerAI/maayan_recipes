import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, Square, Plus, Minus, X, Volume2, RotateCcw, Minimize2, Maximize2 } from 'lucide-react';

interface CookingTimerProps {
  duration: number; // Duration in minutes
  onComplete: () => void;
  timerName?: string;
}

const CookingTimer: React.FC<CookingTimerProps> = ({ 
  duration, 
  onComplete, 
  timerName = "טיימר בישול" 
}) => {
  // Validate duration prop
  if (typeof duration !== 'number' || duration <= 0) {
    throw new Error('Duration must be a positive number');
  }

  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Performance API-based timing refs
  const startTimeRef = useRef<number | null>(null);
  const durationRef = useRef(duration * 60 * 1000); // Duration in milliseconds
  const animationIdRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const remainingAtPauseRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Local storage key
  const STORAGE_KEY = `cooking_timer_${timerName}`;

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(hasTouch && isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize audio context on user interaction (required for mobile)
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
          console.warn('Could not create audio context:', e);
        }
      }
    };

    const handleUserInteraction = () => {
      initAudioContext();
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('click', handleUserInteraction);
    
    return () => {
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, []);

  // Core timer update function using performance.now() and requestAnimationFrame
  const updateTimer = useCallback(() => {
    if (!startTimeRef.current || !isRunning) return;

    const elapsed = performance.now() - startTimeRef.current;
    const remaining = Math.max(0, durationRef.current - elapsed);
    
    if (remaining > 0) {
      setTimeLeft(Math.ceil(remaining / 1000));
      animationIdRef.current = requestAnimationFrame(updateTimer);
    } else {
      // Timer completed
      setTimeLeft(0);
      setIsRunning(false);
      setIsPaused(false);
      setShowAlert(true);
      setShowFloatingTimer(false);
      
      // Clear animation frame
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      
      // Play completion sound
      playBeepSound();
      
      // Call completion callback
      onComplete();
    }
  }, [isRunning, onComplete, STORAGE_KEY]);

  // Load timer state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        
        if (parsed.isRunning && parsed.startTime && parsed.duration) {
          // Check if timer should have completed while page was closed
          const elapsed = performance.now() - parsed.startTime;
          const remainingMs = Math.max(0, parsed.duration - elapsed);
          const remainingSeconds = Math.floor(remainingMs / 1000);
          
          if (remainingSeconds > 0) {
            // Timer was running, restore state
            setTimeLeft(remainingSeconds);
            setIsRunning(true);
            setShowFloatingTimer(true);
            startTimeRef.current = parsed.startTime;
            durationRef.current = parsed.duration;
            
            // Start the timer animation frame immediately
            animationIdRef.current = requestAnimationFrame(updateTimer);
          } else {
            // Timer completed while page was closed
            localStorage.removeItem(STORAGE_KEY);
            onComplete();
          }
        }
      }
    } catch (error) {
      console.warn('Failed to restore timer state from localStorage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [STORAGE_KEY, onComplete, updateTimer]);

  // Save timer state to localStorage
  const saveTimerState = useCallback(() => {
    try {
      if (isRunning && startTimeRef.current) {
        const state = {
          isRunning: true,
          startTime: startTimeRef.current,
          duration: durationRef.current,
          timerName: timerName,
          timestamp: performance.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save timer state to localStorage:', error);
    }
  }, [isRunning, timerName, STORAGE_KEY]);

  // Enhanced audio system for mobile and silent mode
  const playBeepSound = () => {
    try {
      // Method 1: Web Audio API (works even on silent mode on many devices)
      let audioContext = audioContextRef.current;
      
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
      }
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Play 3 beeps with Web Audio API
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800; // 800Hz beep
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.8);
        }, i * 800);
      }
      
      // Method 2: HTML Audio Element as fallback
      try {
        const beepDataUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAg==';
        const audio = new Audio(beepDataUrl);
        audio.volume = 1.0;
        audio.play().catch(e => console.warn('HTML Audio fallback failed:', e));
      } catch (audioError) {
        console.warn('HTML Audio fallback failed:', audioError);
      }
      
    } catch (error) {
      console.warn('Could not play beep sound:', error);
      
      // Method 3: Vibration as final fallback (mobile only)
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
  };

  // Start timer with performance.now()
  const startTimer = useCallback(() => {
    if (isRunning) return;
    
    const now = performance.now();
    const durationMs = duration * 60 * 1000;
    
    startTimeRef.current = now;
    durationRef.current = durationMs;
    pausedAtRef.current = null;
    remainingAtPauseRef.current = null;
    
    setIsRunning(true);
    setIsPaused(false);
    setShowAlert(false);
    setShowFloatingTimer(true);
    
    // Save state to localStorage
    saveTimerState();
    
    // Start timer animation frame
    animationIdRef.current = requestAnimationFrame(updateTimer);
  }, [isRunning, duration, saveTimerState, updateTimer]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (!isRunning || !startTimeRef.current) return;
    
    // Cancel animation frame
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    
    // Store pause information
    const now = performance.now();
    pausedAtRef.current = now;
    const elapsed = now - startTimeRef.current;
    remainingAtPauseRef.current = Math.max(0, durationRef.current - elapsed);
    
    setIsRunning(false);
    setIsPaused(true);
    
    // Update localStorage
    saveTimerState();
  }, [isRunning, saveTimerState]);

  // Resume timer
  const resumeTimer = useCallback(() => {
    if (!isPaused || !pausedAtRef.current || !remainingAtPauseRef.current) return;
    
    // Recalculate start time based on remaining time at pause
    const now = performance.now();
    startTimeRef.current = now;
    durationRef.current = remainingAtPauseRef.current;
    
    // Clear pause refs
    pausedAtRef.current = null;
    remainingAtPauseRef.current = null;
    
    setIsRunning(true);
    setIsPaused(false);
    
    // Save state to localStorage
    saveTimerState();
    
    // Resume timer animation frame
    animationIdRef.current = requestAnimationFrame(updateTimer);
  }, [isPaused, saveTimerState, updateTimer]);

  // Stop timer completely
  const stopTimer = useCallback(() => {
    // Cancel animation frame
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(duration * 60);
    setShowAlert(false);
    setShowFloatingTimer(false);
    setIsMinimized(false);
    
    // Clear refs
    startTimeRef.current = null;
    durationRef.current = duration * 60 * 1000;
    pausedAtRef.current = null;
    remainingAtPauseRef.current = null;
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
  }, [duration, STORAGE_KEY]);

  // Reset timer
  const resetTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(duration * 60);
  }, [stopTimer, duration]);

  // Restart timer
  const restartTimer = useCallback(() => {
    stopTimer();
    startTimer();
  }, [stopTimer, startTimer]);

  // Page Visibility API handler for tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isRunning && startTimeRef.current) {
        // Tab became visible - immediately recalculate from performance.now()
        const now = performance.now();
        const elapsed = now - startTimeRef.current;
        const remainingMs = Math.max(0, durationRef.current - elapsed);
        const remainingSeconds = Math.floor(remainingMs / 1000);
        
        if (remainingSeconds <= 0) {
          // Timer should have completed while in background
          setTimeLeft(0);
          setIsRunning(false);
          setIsPaused(false);
          setShowAlert(true);
          setShowFloatingTimer(false);
          
          // Cancel animation frame
          if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
          }
          
          // Clear localStorage
          localStorage.removeItem(STORAGE_KEY);
          
          // Play completion sound
          playBeepSound();
          
          // Call completion callback
          onComplete();
        } else {
          // Update display and continue
          setTimeLeft(remainingSeconds);
          
          // Restart animation frame if it was cancelled
          if (!animationIdRef.current) {
            animationIdRef.current = requestAnimationFrame(updateTimer);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, onComplete, STORAGE_KEY, updateTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  // Format time display
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  // Dismiss alert
  const dismissAlert = () => {
    setShowAlert(false);
    setTimeLeft(0);
    setShowFloatingTimer(false);
    setIsMinimized(false);
  };

  // Toggle minimize
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Mobile Status Bar Component
  const MobileStatusBar = () => {
    if (!isMobile || !isRunning || timeLeft === 0) return null;

    return (
      <div className="fixed top-0 left-0 right-0 z-[99999] bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-lg">⏰</span>
            <div className="flex flex-col">
              <span className="text-xs font-medium opacity-90">{timerName}</span>
              <span className="text-sm font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={pauseTimer}
              className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="השהה"
            >
              <Pause className="h-4 w-4" />
            </button>
            <button
              onClick={stopTimer}
              className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="עצור"
            >
              <Square className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowFloatingTimer(false)}
              className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="סגור"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Floating Timer Component
  const FloatingTimer = () => {
    if (!showFloatingTimer || timeLeft === 0) return null;

    // Minimized view
    if (isMinimized) {
      return (
        <div className="fixed bottom-4 right-4 rtl:left-4 rtl:right-auto z-[99999] bg-gradient-to-br from-orange-500/95 to-red-500/95 rounded-full shadow-2xl border border-orange-300/50 backdrop-blur-md cursor-pointer hover:scale-105 transition-all duration-200"
             onClick={toggleMinimize}>
          <div className="p-3 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <span className="text-lg mb-1">⏰</span>
              <div className="text-xs font-mono font-bold text-white tracking-tight leading-none">
                {formatTime(timeLeft)}
              </div>
              {isRunning && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Full view
    return (
      <div className="fixed bottom-4 right-4 rtl:left-4 rtl:right-auto z-[99999] bg-gradient-to-br from-white/90 to-gray-50/90 rounded-2xl shadow-2xl border border-gray-100/50 p-4 min-w-[240px] backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="w-8 h-8 bg-orange-100/80 rounded-full flex items-center justify-center">
              <span className="text-lg">⏰</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{timerName}</span>
          </div>
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
            <button
              onClick={toggleMinimize}
              className="p-1.5 hover:bg-gray-100/80 rounded-full transition-colors"
              title="מזער טיימר"
            >
              <Minimize2 className="h-4 w-4 text-gray-500" />
            </button>
            <button
              onClick={() => setShowFloatingTimer(false)}
              className="p-1.5 hover:bg-gray-100/80 rounded-full transition-colors"
              title="סגור טיימר"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="text-center">
          {/* Progress Circle */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#f97316"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-100 ease-out"
              />
            </svg>
            {/* Time display in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-lg font-mono font-bold text-gray-900">
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
            {!isRunning ? (
              <button
                onClick={resumeTimer}
                className="p-3 bg-green-500/90 text-white rounded-full hover:bg-green-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <Play className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="p-3 bg-yellow-500/90 text-white rounded-full hover:bg-yellow-600 transition-colors"
              >
                <Pause className="h-5 w-5" />
              </button>
            )}
            
            <button
              onClick={stopTimer}
              className="p-3 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <Square className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Status Bar */}
      <MobileStatusBar />
      
      {/* Main Timer Setup Window */}
      <div className={`bg-white rounded-lg shadow-lg max-w-md w-full p-6 ${isMobile && isRunning && timeLeft > 0 ? 'mt-16' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-2xl">⏰</span>
            <h3 className="text-xl font-semibold text-gray-900">{timerName}</h3>
          </div>
        </div>

        {/* Time Display */}
        <div className="text-center mb-6">
          <div className="text-4xl font-mono font-bold text-gray-900 mb-4">
            {formatTime(timeLeft)}
          </div>
          
          {/* Progress Circle */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#f97316"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-100 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-mono font-bold text-gray-900">
                {Math.round(progressPercentage)}%
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse mb-4">
          {!isRunning ? (
            <button
              onClick={startTimer}
              disabled={timeLeft === 0}
              className="flex items-center space-x-2 rtl:space-x-reverse bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>התחל</span>
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="flex items-center space-x-2 rtl:space-x-reverse bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Pause className="h-4 w-4" />
              <span>השהה</span>
            </button>
          )}
          
          {isPaused && (
            <button
              onClick={resumeTimer}
              className="flex items-center space-x-2 rtl:space-x-reverse bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>המשך</span>
            </button>
          )}
          
          <button
            onClick={stopTimer}
            className="flex items-center space-x-2 rtl:space-x-reverse bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors"
          >
            <Square className="h-4 w-4" />
            <span>עצור</span>
          </button>
          
          <button
            onClick={resetTimer}
            className="flex items-center space-x-2 rtl:space-x-reverse bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>אפס</span>
          </button>
        </div>

        {/* Timer Info */}
        <div className="text-center text-sm text-gray-600">
          <p>משך: {duration} דקות</p>
          <p>סטטוס: {isRunning ? 'רץ' : isPaused ? 'מושהה' : 'עצור'}</p>
          {startTimeRef.current && (
            <p>התחיל: {new Date(startTimeRef.current).toLocaleTimeString()}</p>
          )}
        </div>
      </div>

      {/* Floating Timer */}
      <FloatingTimer />

      {/* Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center animate-pulse">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">הטיימר הסתיים!</h2>
            <p className="text-gray-600 mb-6">הזמן שהגדרת הסתיים</p>
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse mb-6">
              <Volume2 className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-gray-500">מושמע צפצוף התראה</span>
            </div>
            <div className="flex space-x-3 rtl:space-x-reverse">
              <button
                onClick={dismissAlert}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                סגור
              </button>
              <button
                onClick={restartTimer}
                className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center space-x-2 rtl:space-x-reverse"
              >
                <RotateCcw className="h-4 w-4" />
                <span>הפעל שוב</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookingTimer;