import React, { useState, useEffect } from 'react';
import { isStandalone } from '../../utils/pwa';
import { TimerData } from './MultiTimer';

interface GlobalTimerStatusBarProps {
  timers: TimerData[];
}

const GlobalTimerStatusBar: React.FC<GlobalTimerStatusBarProps> = ({ timers }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Check if app is running in standalone mode (installed PWA)
  useEffect(() => {
    const checkStandalone = () => {
      const standalone = isStandalone();
      const hasActiveTimers = timers.some(timer => timer.isRunning && timer.timeLeft > 0);
      setIsVisible(standalone && hasActiveTimers);
    };

    checkStandalone();
    
    // Listen for changes in standalone mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkStandalone();
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [timers]);

  // Don't render if not visible
  if (!isVisible) return null;

  const activeTimers = timers.filter(timer => timer.isRunning && timer.timeLeft > 0);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <span className="text-lg">⏰</span>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {activeTimers.map((timer, index) => (
              <div key={timer.id} className="flex items-center space-x-1 rtl:space-x-reverse">
                <div className="flex flex-col items-center">
                  <div className="text-xs font-mono font-bold leading-none">
                    {formatTime(timer.timeLeft)}
                  </div>
                  {timer.label && (
                    <div className="text-xs opacity-90 text-center max-w-16 truncate">
                      {timer.label}
                    </div>
                  )}
                </div>
                {index < activeTimers.length - 1 && (
                  <div className="w-px h-6 bg-white/30"></div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="text-xs opacity-90">
            {activeTimers.length} טיימר{activeTimers.length > 1 ? 'ים' : ''} פעיל{activeTimers.length > 1 ? 'ים' : ''}
          </span>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default GlobalTimerStatusBar;
