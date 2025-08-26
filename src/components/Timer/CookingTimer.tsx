import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, Square, Plus, Minus, X, Volume2, RotateCcw, Minimize2, Maximize2 } from 'lucide-react';
import EnhancedTimer, { TimerStatus } from '../../utils/enhancedTimer';

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
  
  // Enhanced timer system
  const enhancedTimerRef = useRef<EnhancedTimer | null>(null);
  const [currentTimerId, setCurrentTimerId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  // Initialize enhanced timer system
  const initializeEnhancedTimer = useCallback(async () => {
    if (!enhancedTimerRef.current) {
      enhancedTimerRef.current = new EnhancedTimer({
        onUpdate: (remaining: number) => {
          setTimeLeft(remaining);
        },
        onComplete: (timerId: string, timerName: string) => {
          setIsRunning(false);
          setIsPaused(false);
          setShowAlert(true);
          setShowFloatingTimer(false);
          setTimeLeft(0);
          setCurrentTimerId(null);
          playBeepSound();
          onComplete();
        },
        onError: (error: string) => {
          console.error('Enhanced timer error:', error);
        }
      });
      
      await enhancedTimerRef.current.initialize();
    }
  }, [onComplete]);

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
        const beepDataUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAg==';
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

  // Start timer with enhanced system
  const startTimer = useCallback(async () => {
    if (isRunning) return;
    
    try {
      // Initialize enhanced timer if needed
      await initializeEnhancedTimer();
      
      // Start timer using enhanced system
      const timerId = await enhancedTimerRef.current!.startTimer(timerName, duration);
      setCurrentTimerId(timerId);
      
      setIsRunning(true);
      setIsPaused(false);
      setShowAlert(false);
      setShowFloatingTimer(true);
      
      console.log(`Enhanced timer started: ${timerName} for ${duration} minutes`);
    } catch (error) {
      console.error('Failed to start enhanced timer:', error);
      // Fallback to basic timer
      setIsRunning(true);
      setIsPaused(false);
      setShowAlert(false);
      setShowFloatingTimer(true);
      
      // Simple countdown as fallback
      const endTime = Date.now() + (duration * 60 * 1000);
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
          setIsRunning(false);
          setShowAlert(true);
          setShowFloatingTimer(false);
          playBeepSound();
          onComplete();
        }
      }, 1000);
    }
  }, [isRunning, duration, timerName, initializeEnhancedTimer, onComplete]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (!isRunning) return;
    
    setIsRunning(false);
    setIsPaused(true);
    
    // Note: Enhanced timer continues running in background for accuracy
    // Pause is just for UI state
  }, [isRunning]);

  // Resume timer
  const resumeTimer = useCallback(async () => {
    if (!isPaused) return;
    
    setIsRunning(true);
    setIsPaused(false);
    
    // Enhanced timer continues running in background, just resume UI state
    console.log('Timer resumed');
  }, [isPaused]);

  // Stop timer completely
  const stopTimer = useCallback(async () => {
    try {
      // Stop enhanced timer if running
      if (currentTimerId && enhancedTimerRef.current) {
        await enhancedTimerRef.current.stopTimer(currentTimerId);
      }
    } catch (error) {
      console.error('Failed to stop enhanced timer:', error);
    }
    
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(duration * 60);
    setShowAlert(false);
    setShowFloatingTimer(false);
    setIsMinimized(false);
    setCurrentTimerId(null);
    
    console.log('Timer stopped');
  }, [duration, currentTimerId]);

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

  // Check for existing timer on mount
  useEffect(() => {
    const checkExistingTimer = async () => {
      try {
        // Initialize enhanced timer system
        await initializeEnhancedTimer();
        
        // Check for existing timers
        if (enhancedTimerRef.current) {
          const allTimers = await enhancedTimerRef.current.getAllTimers();
          if (allTimers.length > 0) {
            // Resume the first active timer
            const activeTimer = allTimers.find(timer => timer.isRunning);
            if (activeTimer) {
              setCurrentTimerId(activeTimer.id);
              setTimeLeft(activeTimer.remaining);
              setIsRunning(true);
              setShowFloatingTimer(true);
              console.log(`Resumed existing timer: ${activeTimer.name}`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check existing timers:', error);
      }
    };
    
    checkExistingTimer();
  }, [initializeEnhancedTimer]);

  // Page Visibility API handler - Enhanced timer handles background automatically
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning) {
        console.log('Going to background - Enhanced timer continues running');
        // Enhanced timer continues running in background for accuracy
      } else if (!document.hidden && isRunning) {
        console.log('Coming back to foreground - Enhanced timer syncs automatically');
        // Enhanced timer automatically syncs when returning to foreground
        // No manual intervention needed
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (enhancedTimerRef.current) {
        enhancedTimerRef.current.destroy();
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

  // Floating Timer Component
  const FloatingTimer = () => {
    if (!showFloatingTimer || timeLeft === 0) return null;

    // Minimized view
    if (isMinimized) {
      return (
        <div className="fixed bottom-4 right-4 rtl:left-4 rtl:right-auto z-50 bg-gradient-to-br from-orange-500/95 to-red-500/95 rounded-full shadow-2xl border border-orange-300/50 backdrop-blur-md cursor-pointer hover:scale-105 transition-all duration-200"
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
      <div className="fixed bottom-4 right-4 rtl:left-4 rtl:right-auto z-50 bg-gradient-to-br from-white/90 to-gray-50/90 rounded-2xl shadow-2xl border border-gray-100/50 p-4 min-w-[240px] backdrop-blur-md">
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
      {/* Main Timer Setup Window */}
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
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
          {currentTimerId && (
            <p>מזהה: {currentTimerId.slice(-8)}</p>
          )}
          <p>מערכת: משופרת</p>
        </div>
      </div>

      {/* Floating Timer */}
      <FloatingTimer />

      {/* Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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