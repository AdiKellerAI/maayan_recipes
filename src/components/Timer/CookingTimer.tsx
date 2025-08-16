import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, Square, Plus, Minus, X, Volume2, RotateCcw, Minimize2, Maximize2 } from 'lucide-react';

interface CookingTimerProps {
  isVisible: boolean;
  onClose: () => void;
}

const CookingTimer: React.FC<CookingTimerProps> = ({ isVisible, onClose }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(10);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Absolute timestamp-based timing refs
  const startTimeRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const remainingAtPauseRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
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

    // Initialize on any user interaction
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

  // Listen for global timer open events
  useEffect(() => {
    const handleShowTimer = () => {
      // This will be handled by the parent component
    };

    window.addEventListener('showTimer', handleShowTimer);
    return () => window.removeEventListener('showTimer', handleShowTimer);
  }, []);

  // Browser tab visibility change handler for accurate timing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isRunning && endTimeRef.current) {
        // Tab became visible - immediately recalculate from system time
        updateTimerDisplay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning]);

  // Enhanced audio system for mobile and silent mode
  const playBeepSound = () => {
    try {
      // Method 1: Web Audio API (works even on silent mode on many devices)
      let audioContext = audioContextRef.current;
      
      // Create audio context if not exists
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
      }
      
      // Ensure audio context is running (required for mobile)
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
          
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Increased volume
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.8);
        }, i * 800);
      }
      
      // Method 2: HTML Audio Element as fallback
      try {
        // Create a data URL for a beep sound
        const beepDataUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAjiS2e7MeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAg==';
        const audio = new Audio(beepDataUrl);
        audio.volume = 1.0; // Maximum volume
        audio.play().catch(e => console.warn('HTML Audio fallback failed:', e));
      } catch (audioError) {
        console.warn('HTML Audio fallback failed:', audioError);
      }
      
    } catch (error) {
      console.warn('Could not play beep sound:', error);
      
      // Method 3: Vibration as final fallback (mobile only)
      if ('vibrate' in navigator) {
        // Vibrate pattern: vibrate for 200ms, pause 100ms, repeat 3 times
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
  };

  // Core timer update function using absolute timestamps
  const updateTimerDisplay = useCallback(() => {
    if (!endTimeRef.current) return;

    const now = Date.now();
    const remainingMs = Math.max(0, endTimeRef.current - now);
    const remainingSeconds = Math.floor(remainingMs / 1000);

    if (remainingMs <= 0) {
      // Timer completed - handle immediately
      handleTimerCompletion();
    } else {
      // Update display with calculated time
      setTimeLeft(remainingSeconds);
    }
  }, []);

  // Handle timer completion
  const handleTimerCompletion = useCallback(() => {
    setIsRunning(false);
    setShowFloatingTimer(false);
    setShowAlert(true);
    setTimeLeft(0);
    playBeepSound();
    
    // Clear all timing refs
    startTimeRef.current = null;
    endTimeRef.current = null;
    pausedAtRef.current = null;
    remainingAtPauseRef.current = null;
    
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // High-frequency timer updates (100ms) for smooth countdown
  useEffect(() => {
    if (isRunning && endTimeRef.current) {
      // Update timer every 100ms for smooth UI and accurate completion detection
      intervalRef.current = setInterval(updateTimerDisplay, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, updateTimerDisplay]);

  const startTimer = () => {
    if (timeLeft === 0) {
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      if (totalSeconds === 0) return;
      setTimeLeft(totalSeconds);
    }
    
    // Set absolute timestamps for accurate timing
    const now = Date.now();
    const remainingMs = timeLeft * 1000;
    
    startTimeRef.current = now;
    endTimeRef.current = now + remainingMs;
    pausedAtRef.current = null;
    remainingAtPauseRef.current = null;
    
    // Debug logging for timing accuracy
    console.log(`Timer started: ${timeLeft}s, Target end: ${new Date(endTimeRef.current).toISOString()}`);
    
    setIsRunning(true);
    setShowAlert(false);
    setShowFloatingTimer(true);
    onClose(); // Close the main timer window
  };

  const pauseTimer = () => {
    if (!isRunning || !endTimeRef.current) return;
    
    // Store pause information for accurate resume
    const now = Date.now();
    pausedAtRef.current = now;
    remainingAtPauseRef.current = endTimeRef.current - now;
    
    setIsRunning(false);
  };

  const resumeTimer = () => {
    if (!pausedAtRef.current || !remainingAtPauseRef.current) return;
    
    // Recalculate end time based on remaining time at pause
    const now = Date.now();
    endTimeRef.current = now + remainingAtPauseRef.current;
    startTimeRef.current = now;
    
    // Clear pause refs
    pausedAtRef.current = null;
    remainingAtPauseRef.current = null;
    
    setIsRunning(true);
  };

  const stopTimer = () => {
    setIsRunning(false);
    setTimeLeft(0);
    setShowAlert(false);
    setShowFloatingTimer(false);
    setIsMinimized(false);
    
    // Clear all timing refs
    startTimeRef.current = null;
    endTimeRef.current = null;
    pausedAtRef.current = null;
    remainingAtPauseRef.current = null;
  };

  const resetTimer = () => {
    setIsRunning(false);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    setTimeLeft(totalSeconds);
    setShowAlert(false);
    
    // Clear all timing refs
    startTimeRef.current = null;
    endTimeRef.current = null;
    pausedAtRef.current = null;
    remainingAtPauseRef.current = null;
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const adjustHours = (delta: number) => {
    setHours(prev => Math.max(0, Math.min(24, prev + delta)));
  };

  const adjustMinutes = (delta: number) => {
    setMinutes(prev => {
      const newMinutes = prev + delta;
      if (newMinutes >= 60) {
        setHours(h => Math.min(24, h + 1));
        return 0;
      } else if (newMinutes < 0) {
        if (hours > 0) {
          setHours(h => Math.max(0, h - 1));
          return 59;
        }
        return 0;
      }
      return newMinutes;
    });
  };

  const adjustSeconds = (delta: number) => {
    setSeconds(prev => {
      const newSeconds = prev + delta;
      if (newSeconds >= 60) {
        setMinutes(m => {
          if (m >= 59) {
            setHours(h => Math.min(24, h + 1));
            return 0;
          }
          return m + 1;
        });
        return 0;
      } else if (newSeconds < 0) {
        if (minutes > 0) {
          setMinutes(m => m - 1);
          return 59;
        } else if (hours > 0) {
          setHours(h => h - 1);
          setMinutes(59);
          return 59;
        }
        return 0;
      }
      return newSeconds;
    });
  };

  const dismissAlert = () => {
    setShowAlert(false);
    setTimeLeft(0);
    setShowFloatingTimer(false);
    setIsMinimized(false);
  };

  const restartTimer = () => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    setTimeLeft(totalSeconds);
    
    // Set the target end time based on current time + total time
    const now = Date.now();
    const totalMs = totalSeconds * 1000;
    endTimeRef.current = now + totalMs;
    startTimeRef.current = now;
    pausedAtRef.current = null;
    remainingAtPauseRef.current = null;
    
    setIsRunning(true);
    setShowAlert(false);
    setShowFloatingTimer(true);
    setIsMinimized(false);
  };

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
              {/* Pulsing indicator when running */}
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
            <span className="text-sm font-semibold text-gray-900">טיימר בישול</span>
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
          <div className="text-3xl font-mono font-bold text-gray-900 mb-4 tracking-wider">
            {formatTime(timeLeft)}
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
                className="p-3 bg-yellow-500/90 text-white rounded-full hover:bg-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
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

  if (!isVisible && !showFloatingTimer && !showAlert) return null;

  return (
    <>
      {/* Main Timer Setup Window */}
      {isVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="text-2xl">⏰</span>
                <h3 className="text-xl font-semibold text-gray-900">הגדרת טיימר</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Time Display */}
            <div className="text-center mb-6">
              <div className="text-4xl font-mono font-bold text-gray-900 mb-4">
                {hours > 0 ? `${hours.toString().padStart(2, '0')}:` : ''}
                {minutes.toString().padStart(2, '0')}:
                {seconds.toString().padStart(2, '0')}
              </div>
              
              {/* Time Setters */}
              <div className="flex items-center justify-center space-x-8 rtl:space-x-reverse mb-6">
                {/* Seconds */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => adjustSeconds(15)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600 mx-2 py-2">שניות</span>
                  <button
                    onClick={() => adjustSeconds(-15)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => adjustMinutes(1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600 mx-2 py-2">דקות</span>
                  <button
                    onClick={() => adjustMinutes(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Hours */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => adjustHours(1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600 mx-2 py-2">שעות</span>
                  <button
                    onClick={() => adjustHours(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quick Time Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {[
                  { label: '1 דק', h: 0, m: 1, s: 0 },
                  { label: '5 דק', h: 0, m: 5, s: 0 },
                  { label: '10 דק', h: 0, m: 10, s: 0 },
                  { label: '15 דק', h: 0, m: 15, s: 0 },
                  { label: '30 דק', h: 0, m: 30, s: 0 },
                  { label: '45 דק', h: 0, m: 45, s: 0 },
                  { label: '1 שעה', h: 1, m: 0, s: 0 },
                  { label: '2 שעות', h: 2, m: 0, s: 0 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setHours(preset.h);
                      setMinutes(preset.m);
                      setSeconds(preset.s);
                    }}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse">
              <button
                onClick={startTimer}
                disabled={hours === 0 && minutes === 0 && seconds === 0}
                className="flex items-center space-x-2 rtl:space-x-reverse bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="h-4 w-4" />
                <span>התחל</span>
              </button>
              
              <button
                onClick={onClose}
                className="flex items-center space-x-2 rtl:space-x-reverse bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <span>ביטול</span>
              </button>
            </div>
          </div>
        </div>
      )}

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