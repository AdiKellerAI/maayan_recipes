import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Plus, Minus, X, Volume2, RotateCcw, Minimize2, Clock } from 'lucide-react';

interface TimerData {
  id: string;
  hours: number;
  minutes: number;
  seconds: number;
  timeLeft: number;
  isRunning: boolean;
  isMinimized: boolean;
  label?: string;
}

interface MultiTimerProps {
  isVisible: boolean;
  onClose: () => void;
}

const MultiTimer: React.FC<MultiTimerProps> = ({ isVisible, onClose }) => {
  const [timers, setTimers] = useState<TimerData[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTimerId, setAlertTimerId] = useState<string | null>(null);
  const [nextTimerId, setNextTimerId] = useState(1);
  const [globalHours, setGlobalHours] = useState(0);
  const [globalMinutes, setGlobalMinutes] = useState(5);
  const [globalSeconds, setGlobalSeconds] = useState(0);
  const [highlightedTimerId, setHighlightedTimerId] = useState<string | null>(null);
  const [timerName, setTimerName] = useState('');
  const intervalRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio context and alarm sound
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

    // Create alarm audio element
    if (!alarmAudioRef.current) {
      alarmAudioRef.current = new Audio();
      // Create a simple alarm sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        // Store the audio context for later use
        audioContextRef.current = audioContext;
      } catch (e) {
        console.warn('Could not create alarm sound:', e);
      }
    }

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

  // Enhanced alarm sound that works even in silent mode
  const playAlarmSound = () => {
    try {
      // Method 1: Web Audio API (works even on silent mode)
      let audioContext = audioContextRef.current;
      
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
      }
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Create a more prominent alarm sound pattern
      const playBeep = (frequency: number, duration: number, delay: number) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = 'sawtooth'; // More aggressive sound
          
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.8, audioContext.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);
        }, delay);
      };
      
      // Play alarm pattern: 5 beeps with increasing frequency
      for (let i = 0; i < 5; i++) {
        playBeep(600 + (i * 100), 0.6, i * 400);
      }
      
      // Second set of beeps after pause
      setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          playBeep(800 + (i * 100), 0.6, i * 400);
        }
      }, 3000);
      
      // Third set of beeps
      setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          playBeep(1000 + (i * 100), 0.6, i * 400);
        }
      }, 6000);
      
      // Method 2: Vibration as additional alert (more aggressive pattern)
      if ('vibrate' in navigator) {
        // Long vibration pattern to ensure it's felt
        navigator.vibrate([500, 200, 500, 200, 500, 500, 500, 200, 500, 200, 500, 500, 500, 200, 500, 200, 500]);
      }
      
      // Method 3: Try to play HTML5 audio as fallback
      try {
        if (alarmAudioRef.current) {
          alarmAudioRef.current.volume = 1.0;
          alarmAudioRef.current.play().catch(() => {
            // Ignore errors, Web Audio API is the primary method
          });
        }
      } catch (e) {
        // Ignore HTML5 audio errors
      }
      
    } catch (error) {
      console.warn('Could not play alarm sound:', error);
    }
  };

  // Timer management functions
  const addTimer = () => {
    if (timers.length >= 5) return;
    
    const finalTimerName = timerName.trim() || `טיימר ${nextTimerId}`;
    
    const newTimer: TimerData = {
      id: `timer-${nextTimerId}`,
      hours: globalHours,
      minutes: globalMinutes,
      seconds: globalSeconds,
      timeLeft: globalHours * 3600 + globalMinutes * 60 + globalSeconds,
      isRunning: false,
      isMinimized: true, // Start minimized by default
      label: finalTimerName
    };
    
    setTimers(prev => [...prev, newTimer]);
    setNextTimerId(prev => prev + 1);
    setTimerName(''); // Reset timer name input
  };

  const removeTimer = (id: string) => {
    // Stop and clear interval
    if (intervalRefs.current[id]) {
      clearInterval(intervalRefs.current[id]);
      delete intervalRefs.current[id];
    }
    
    setTimers(prev => prev.filter(timer => timer.id !== id));
  };

  const startTimer = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id) {
        if (timer.timeLeft === 0) {
          const totalSeconds = globalHours * 3600 + globalMinutes * 60 + globalSeconds;
          if (totalSeconds === 0) return timer;
          return { 
            ...timer, 
            timeLeft: totalSeconds, 
            isRunning: true,
            isMinimized: true // Start minimized by default
          };
        }
        return { ...timer, isRunning: true, isMinimized: true };
      }
      return timer;
    }));
  };

  const pauseTimer = (id: string) => {
    setTimers(prev => prev.map(timer => 
      timer.id === id ? { ...timer, isRunning: false, isMinimized: true } : timer
    ));
  };

  const stopTimer = (id: string) => {
    if (intervalRefs.current[id]) {
      clearInterval(intervalRefs.current[id]);
      delete intervalRefs.current[id];
    }
    
    setTimers(prev => prev.map(timer => 
      timer.id === id ? { 
        ...timer, 
        isRunning: false, 
        timeLeft: timer.hours * 3600 + timer.minutes * 60 + timer.seconds,
        isMinimized: false // Remove from bottom when stopped
      } : timer
    ));
  };

  const resetTimer = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id) {
        const totalSeconds = timer.hours * 3600 + timer.minutes * 60 + timer.seconds;
        return { ...timer, timeLeft: totalSeconds, isRunning: false };
      }
      return timer;
    }));
  };

  const toggleMinimize = (id: string) => {
    setTimers(prev => prev.map(timer => 
      timer.id === id ? { ...timer, isMinimized: !timer.isMinimized } : timer
    ));
  };

  const updateTimerSettings = (id: string, field: 'hours' | 'minutes' | 'seconds', value: number) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id) {
        const newTimer = { ...timer, [field]: value };
        // Update timeLeft if timer is not running
        if (!timer.isRunning) {
          newTimer.timeLeft = newTimer.hours * 3600 + newTimer.minutes * 60 + newTimer.seconds;
        }
        return newTimer;
      }
      return timer;
    }));
  };

  const updateGlobalTime = (field: 'hours' | 'minutes' | 'seconds', value: number) => {
    if (field === 'hours') {
      setGlobalHours(Math.max(0, Math.min(24, value)));
    } else if (field === 'minutes') {
      setGlobalMinutes(Math.max(0, Math.min(59, value)));
    } else if (field === 'seconds') {
      setGlobalSeconds(Math.max(0, Math.min(59, value)));
    }
  };

  const decreaseGlobalTime = (field: 'hours' | 'minutes' | 'seconds') => {
    if (field === 'hours') {
      if (globalHours > 0) {
        setGlobalHours(globalHours - 1);
      }
    } else if (field === 'minutes') {
      if (globalMinutes > 0) {
        setGlobalMinutes(globalMinutes - 1);
      } else if (globalHours > 0) {
        // If minutes is 0 and hours > 0, decrease hours and set minutes to 59
        setGlobalHours(globalHours - 1);
        setGlobalMinutes(59);
      }
    } else if (field === 'seconds') {
      if (globalSeconds > 0) {
        setGlobalSeconds(globalSeconds - 15);
      } else if (globalMinutes > 0) {
        // If seconds is 0 and minutes > 0, decrease minutes and set seconds to 45
        setGlobalMinutes(globalMinutes - 1);
        setGlobalSeconds(45);
      } else if (globalHours > 0) {
        // If both seconds and minutes are 0 and hours > 0, decrease hours and set to 59:45
        setGlobalHours(globalHours - 1);
        setGlobalMinutes(59);
        setGlobalSeconds(45);
      }
    }
  };

  // Timer intervals management
  useEffect(() => {
    timers.forEach(timer => {
      if (timer.isRunning && timer.timeLeft > 0) {
        if (intervalRefs.current[timer.id]) {
          clearInterval(intervalRefs.current[timer.id]);
        }
        
        intervalRefs.current[timer.id] = setInterval(() => {
          setTimers(prev => prev.map(t => {
            if (t.id === timer.id) {
              if (t.timeLeft <= 1) {
                // Timer finished
                clearInterval(intervalRefs.current[t.id]);
                delete intervalRefs.current[t.id];
                setShowAlert(true);
                setAlertTimerId(t.id);
                playAlarmSound();
                return { ...t, timeLeft: 0, isRunning: false };
              }
              return { ...t, timeLeft: t.timeLeft - 1 };
            }
            return t;
          }));
        }, 1000);
      } else {
        if (intervalRefs.current[timer.id]) {
          clearInterval(intervalRefs.current[timer.id]);
          delete intervalRefs.current[timer.id];
        }
      }
    });

    return () => {
      Object.values(intervalRefs.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, [timers]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const dismissAlert = () => {
    setShowAlert(false);
    if (alertTimerId) {
      setTimers(prev => prev.map(timer => 
        timer.id === alertTimerId ? { 
          ...timer, 
          timeLeft: timer.hours * 3600 + timer.minutes * 60 + timer.seconds,
          isMinimized: false // Remove from bottom when dismissed
        } : timer
      ));
    }
    setAlertTimerId(null);
  };

  const restartTimer = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id) {
        const totalSeconds = timer.hours * 3600 + timer.minutes * 60 + timer.seconds;
        return { 
          ...timer, 
          timeLeft: totalSeconds, 
          isRunning: true,
          isMinimized: true // Restart minimized
        };
      }
      return timer;
    }));
  };

  // Quick time presets
  const quickTimePresets = [
    { label: '1 דק', h: 0, m: 1, s: 0 },
    { label: '5 דק', h: 0, m: 5, s: 0 },
    { label: '10 דק', h: 0, m: 10, s: 0 },
    { label: '15 דק', h: 0, m: 15, s: 0 },
    { label: '30 דק', h: 0, m: 30, s: 0 },
    { label: '45 דק', h: 0, m: 45, s: 0 },
    { label: '1 שעה', h: 1, m: 0, s: 0 },
    { label: '2 שעות', h: 2, m: 0, s: 0 }
  ];

  const handleClose = () => {
    // When closing, minimize all running timers so they stay visible at bottom
    setTimers(prev => prev.map(timer => 
      timer.isRunning || timer.timeLeft > 0 ? { ...timer, isMinimized: true } : timer
    ));
    setHighlightedTimerId(null);
    onClose();
  };

  if (!isVisible) return (
    <>
      {/* Floating Timers Row - Always Visible - Left Side */}
      <div className="fixed bottom-4 left-4 z-40 flex items-center space-x-2 rtl:space-x-reverse">
        {timers.filter(t => t.isRunning || t.timeLeft > 0 || t.isMinimized).map((timer) => (
          <div key={timer.id} className="flex-shrink-0">
            <div 
              className={`bg-gradient-to-br from-orange-500/60 to-red-500/60 rounded-full shadow-2xl border border-orange-300/50 backdrop-blur-md cursor-pointer hover:scale-105 transition-all duration-200 p-3 ${
                timer.isRunning ? 'from-orange-500/40 to-red-500/40' : ''
              }`}
              onClick={() => {
                setHighlightedTimerId(timer.id);
                // Open timer management window
                const timerEvent = new CustomEvent('showTimer');
                window.dispatchEvent(timerEvent);
              }}
            >
              <div className="flex flex-col items-center">
                <span className="text-lg mb-1">⏰</span>
                <div className="text-xs font-mono font-bold text-white tracking-tight leading-none">
                  {formatTime(timer.timeLeft)}
                </div>
                {timer.label && (
                  <div className="text-xs text-white/90 text-center max-w-16 truncate">
                    {timer.label}
                  </div>
                )}
                {timer.isRunning && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Modal */}
      {showAlert && alertTimerId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center animate-pulse">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">הטיימר הסתיים!</h2>
            <p className="text-gray-600 mb-6">הזמן שהגדרת הסתיים</p>
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse mb-6">
              <Volume2 className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-gray-500">מושמע צליל התראה</span>
            </div>
            <div className="flex space-x-3 rtl:space-x-reverse">
              <button
                onClick={dismissAlert}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                סגור
              </button>
              <button
                onClick={() => {
                  restartTimer(alertTimerId);
                  dismissAlert();
                }}
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

  return (
    <>
      {/* Main Timer Setup Window */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="text-2xl">⏰</span>
                <h3 className="text-xl font-semibold text-gray-900">ניהול טיימרים</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="p-4">
              {/* Global Time Selection */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2 text-center">בחירת זמן טיימר</h4>
                
                {/* Time Display */}
                <div className="text-center mb-2">
                  <div className="text-3xl font-mono font-bold text-gray-900 mb-2">
                    {globalHours > 0 ? `${globalHours.toString().padStart(2, '0')}:` : ''}
                    {globalMinutes.toString().padStart(2, '0')}:
                    {globalSeconds.toString().padStart(2, '0')}
                  </div>
                  
                  {/* Time Setters */}
                  <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse mb-2">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => updateGlobalTime('seconds', Math.min(59, globalSeconds + 15))}
                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-gray-600 mx-1 py-0.5">שניות</span>
                      <button
                        onClick={() => decreaseGlobalTime('seconds')}
                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => updateGlobalTime('minutes', Math.min(59, globalMinutes + 1))}
                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-gray-600 mx-1 py-0.5">דקות</span>
                      <button
                        onClick={() => decreaseGlobalTime('minutes')}
                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => updateGlobalTime('hours', Math.min(24, globalHours + 1))}
                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-gray-600 mx-1 py-0.5">שעות</span>
                      <button
                        onClick={() => decreaseGlobalTime('hours')}
                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Timer Name Input */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="תן שם לטיימר (אופציונלי)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center"
                    value={timerName}
                    onChange={(e) => setTimerName(e.target.value)}
                  />
                </div>
                
                {/* Add Timer Button */}
                <div className="text-center">
                  <button
                    onClick={addTimer}
                    disabled={timers.length >= 5}
                    className="flex items-center space-x-2 rtl:space-x-reverse bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mx-auto"
                  >
                    <Plus className="h-5 w-5" />
                    <span>הוסף טיימר</span>
                  </button>
                </div>
              </div>

              {/* Active Timers List */}
              {timers.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-gray-600 mb-2">אין טיימרים פעילים</h4>
                  <p className="text-gray-500">בחר זמן ולחץ על "הוסף טיימר" כדי להתחיל</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">טיימרים פעילים</h4>
                  {timers.map((timer) => (
                    <div 
                      key={timer.id} 
                      className={`bg-white rounded-lg p-3 border border-gray-200 transition-all duration-200 ${
                        highlightedTimerId === timer.id ? 'ring-2 ring-orange-500 shadow-lg' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-base">⏰</span>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 text-sm">{timer.label}</h5>
                            {timer.timeLeft > 0 && (
                              <div className="text-base font-mono font-bold text-orange-600">
                                {formatTime(timer.timeLeft)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          {!timer.isRunning ? (
                            <button
                              onClick={() => startTimer(timer.id)}
                              disabled={globalHours === 0 && globalMinutes === 0 && globalSeconds === 0}
                              className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
                              title="הפעל טיימר"
                            >
                              <Play className="h-3 w-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => pauseTimer(timer.id)}
                              className="p-1.5 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-all duration-200"
                              title="השהה טיימר"
                            >
                              <Pause className="h-3 w-3" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => stopTimer(timer.id)}
                            className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200"
                            title="עצור טיימר"
                          >
                            <Square className="h-3 w-3" />
                            </button>
                          
                          <button
                            onClick={() => resetTimer(timer.id)}
                            className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200"
                            title="אפס טיימר"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                          
                          <button
                            onClick={() => removeTimer(timer.id)}
                            className="p-1.5 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-all duration-200"
                            title="מחק טיימר"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      {timer.timeLeft > 0 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-orange-500 h-1.5 rounded-full transition-all duration-1000"
                              style={{ 
                                width: `${(() => {
                                  const totalTime = globalHours * 3600 + globalMinutes * 60 + globalSeconds;
                                  if (totalTime === 0) return 0;
                                  const elapsed = totalTime - timer.timeLeft;
                                  return Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
                                })()}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MultiTimer;
