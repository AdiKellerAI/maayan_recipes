import {
	Clock,
	Minus,
	Pause,
	Play,
	Plus,
	RotateCcw,
	Square,
	Volume2,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface TimerData {
	id: string;
	hours: number;
	minutes: number;
	seconds: number;
	timeLeft: number;
	isRunning: boolean;
	isMinimized: boolean;
	label?: string;
	endTime?: number;
}

interface MultiTimerProps {
	isVisible: boolean;
	onClose: () => void;
	initialTimerName?: string;
	onTimersChange?: (timers: TimerData[]) => void;
}

const MultiTimer: React.FC<MultiTimerProps> = ({ isVisible, onClose, initialTimerName, onTimersChange }) => {
	const savedData = localStorage.getItem("multiTimers");
	let initialTimers: TimerData[] = [];

	// Handle Android back button and ESC key to close timer management window
	useEffect(() => {
		if (!isVisible) return;

		const handleBackButton = (event: PopStateEvent) => {
			event.preventDefault();
			onClose();
			// Push current state back to prevent actual navigation
			window.history.pushState(null, '', window.location.href);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		// Push a state when timer opens to capture back button
		window.history.pushState(null, '', window.location.href);
		
		window.addEventListener('popstate', handleBackButton);
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('popstate', handleBackButton);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isVisible, onClose]);

	if (savedData) {
		try {
			const parsed = JSON.parse(savedData);
			const savedTimers = parsed.timers || [];
			const now = Date.now();
			initialTimers = savedTimers.map((t: TimerData) => {
				if (t.isRunning) {
					const endTime = t.endTime ?? now + t.timeLeft * 1000;
					const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
					if (remaining <= 0) {
						return {
							...t,
							timeLeft: 0,
							isRunning: false,
							endTime: undefined,
						};
					}
					return { ...t, timeLeft: remaining, endTime };
				}
				return t;
			});
		} catch (error) {
			console.error("Failed to load timers:", error);
		}
	}

	const [timers, setTimers] = useState<TimerData[]>(initialTimers);
	const [showAlert, setShowAlert] = useState(false);
	const [alertTimerId, setAlertTimerId] = useState<string | null>(null);
	const [globalHours, setGlobalHours] = useState(0);
	const [globalMinutes, setGlobalMinutes] = useState(10);
	const [globalSeconds, setGlobalSeconds] = useState(0);
	const [highlightedTimerId, setHighlightedTimerId] = useState<string | null>(
		null,
	);
	const [timerName, setTimerName] = useState("");
	const intervalRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});
	const audioContextRef = useRef<AudioContext | null>(null);
	const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

	// Initialize audio context and alarm sound
	useEffect(() => {
		const initAudioContext = () => {
			if (!audioContextRef.current) {
				try {
					audioContextRef.current = new (
						window.AudioContext || (window as any).webkitAudioContext
					)();
				} catch (e) {
					console.warn("Could not create audio context:", e);
				}
			}
		};

		// Create alarm audio element with the new sound file
		if (!alarmAudioRef.current) {
			alarmAudioRef.current = new Audio("/bedside-clock-alarm.mp3");
			alarmAudioRef.current.preload = "auto";
			alarmAudioRef.current.volume = 1.0;

			// Initialize Web Audio API as fallback
			try {
				const audioContext = new (
					window.AudioContext || (window as any).webkitAudioContext
				)();
				audioContextRef.current = audioContext;
			} catch (e) {
				console.warn("Could not create audio context:", e);
			}
		}

		const handleUserInteraction = () => {
			initAudioContext();
			if (
				audioContextRef.current &&
				audioContextRef.current.state === "suspended"
			) {
				audioContextRef.current.resume();
			}
		};

		document.addEventListener("touchstart", handleUserInteraction);
		document.addEventListener("click", handleUserInteraction);

		return () => {
			document.removeEventListener("touchstart", handleUserInteraction);
			document.removeEventListener("click", handleUserInteraction);
		};
	}, []);

	// Enhanced alarm sound that works even in silent mode
	const playAlarmSound = () => {
		try {
			// Method 1: Play the new alarm sound file (primary method)
			if (alarmAudioRef.current) {
				// Reset audio to beginning and play
				alarmAudioRef.current.currentTime = 0;
				alarmAudioRef.current.volume = 1.0;

				// Play the alarm sound
				alarmAudioRef.current.play().catch((error) => {
					console.log("HTML5 Audio failed, trying Web Audio API...", error);
					// Fallback to Web Audio API if HTML5 fails
					playWebAudioAlarm();
				});
			}

			// Method 2: Vibration as additional alert
			if ("vibrate" in navigator) {
				// Long vibration pattern to ensure it's felt
				navigator.vibrate([
					500, 200, 500, 200, 500, 500, 500, 200, 500, 200, 500, 500, 500, 200,
					500, 200, 500,
				]);
			}
		} catch (error) {
			console.warn("Could not play alarm sound:", error);
			// Fallback to Web Audio API
			playWebAudioAlarm();
		}
	};

	// Stop the alarm sound
	const stopAlarmSound = () => {
		try {
			// Stop HTML5 audio
			if (alarmAudioRef.current) {
				alarmAudioRef.current.pause();
				alarmAudioRef.current.currentTime = 0;
			}

			// Stop Web Audio API if it's playing
			if (
				audioContextRef.current &&
				audioContextRef.current.state === "running"
			) {
				audioContextRef.current.suspend();
			}

			// Stop vibration
			if ("vibrate" in navigator) {
				navigator.vibrate(0);
			}
		} catch (error) {
			console.warn("Could not stop alarm sound:", error);
		}
	};

	// Fallback Web Audio API method for silent mode
	const playWebAudioAlarm = () => {
		try {
			let audioContext = audioContextRef.current;

			if (!audioContext) {
				audioContext = new (
					window.AudioContext || (window as any).webkitAudioContext
				)();
				audioContextRef.current = audioContext;
			}

			if (audioContext.state === "suspended") {
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
					oscillator.type = "sawtooth"; // More aggressive sound

					gainNode.gain.setValueAtTime(0, audioContext.currentTime);
					gainNode.gain.linearRampToValueAtTime(
						0.8,
						audioContext.currentTime + 0.1,
					);
					gainNode.gain.exponentialRampToValueAtTime(
						0.01,
						audioContext.currentTime + duration,
					);

					oscillator.start(audioContext.currentTime);
					oscillator.stop(audioContext.currentTime + duration);
				}, delay);
			};

			// Play alarm pattern: 5 beeps with increasing frequency
			for (let i = 0; i < 5; i++) {
				playBeep(600 + i * 100, 0.6, i * 400);
			}

			// Second set of beeps after pause
			setTimeout(() => {
				for (let i = 0; i < 5; i++) {
					playBeep(800 + i * 100, 0.6, i * 400);
				}
			}, 3000);

			// Third set of beeps
			setTimeout(() => {
				for (let i = 0; i < 5; i++) {
					playBeep(1000 + i * 100, 0.6, i * 400);
				}
			}, 6000);
		} catch (error) {
			console.warn("Web Audio API also failed:", error);
		}
	};

	// Helper function to get next available timer number
	const getNextTimerNumber = () => {
		const existingNumbers = timers
			.map(timer => {
				const match = timer.label?.match(/^טיימר (\d+)$/);
				return match ? parseInt(match[1]) : null;
			})
			.filter(num => num !== null)
			.sort((a, b) => a! - b!);

		// Find the first missing number starting from 1
		for (let i = 1; i <= existingNumbers.length + 1; i++) {
			if (!existingNumbers.includes(i)) {
				return i;
			}
		}
		return 1;
	};

	// Timer management functions
	const addTimer = () => {
		if (timers.length >= 5) return;

		const timerNumber = getNextTimerNumber();
		const finalTimerName = timerName.trim() || `טיימר ${timerNumber}`;

		const newTimer: TimerData = {
			id: `timer-${Date.now()}-${timerNumber}`, // Use timestamp + number for unique ID
			hours: globalHours,
			minutes: globalMinutes,
			seconds: globalSeconds,
			timeLeft: globalHours * 3600 + globalMinutes * 60 + globalSeconds,
			isRunning: true, // Start running automatically
			isMinimized: true, // Start minimized by default
			label: finalTimerName,
			endTime:
				Date.now() +
				(globalHours * 3600 + globalMinutes * 60 + globalSeconds) * 1000,
		};

		setTimers((prev) => [...prev, newTimer]);
		setTimerName(""); // Reset timer name input
	};

	const removeTimer = (id: string) => {
		// Stop and clear interval
		if (intervalRefs.current[id]) {
			clearInterval(intervalRefs.current[id]);
			delete intervalRefs.current[id];
		}

		setTimers((prev) => prev.filter((timer) => timer.id !== id));
	};

	const startTimer = (id: string) => {
		setTimers((prev) =>
			prev.map((timer) => {
				if (timer.id === id) {
					if (timer.timeLeft === 0) {
						const totalSeconds =
							globalHours * 3600 + globalMinutes * 60 + globalSeconds;
						if (totalSeconds === 0) return timer;
						return {
							...timer,
							timeLeft: totalSeconds,
							isRunning: true,
							isMinimized: true, // Start minimized by default
							endTime: Date.now() + totalSeconds * 1000,
						};
					}
					return {
						...timer,
						isRunning: true,
						isMinimized: true,
						endTime: Date.now() + timer.timeLeft * 1000,
					};
				}
				return timer;
			}),
		);
	};

	const pauseTimer = (id: string) => {
		setTimers((prev) =>
			prev.map((timer) =>
				timer.id === id
					? { ...timer, isRunning: false, isMinimized: true }
					: timer,
			),
		);
	};

	const stopTimer = (id: string) => {
		if (intervalRefs.current[id]) {
			clearInterval(intervalRefs.current[id]);
			delete intervalRefs.current[id];
		}

		setTimers((prev) =>
			prev.map((timer) =>
				timer.id === id
					? {
							...timer,
							isRunning: false,
							timeLeft: 0, // Set time to 0 so it won't show in floating timers
							isMinimized: false, // Remove from bottom when stopped
							endTime: undefined,
						}
					: timer,
			),
		);
	};

	const resetTimer = (id: string) => {
		setTimers((prev) =>
			prev.map((timer) => {
				if (timer.id === id) {
					const totalSeconds =
						timer.hours * 3600 + timer.minutes * 60 + timer.seconds;
					return {
						...timer,
						timeLeft: totalSeconds,
						isRunning: false,
						endTime: undefined,
					};
				}
				return timer;
			}),
		);
	};

	const toggleMinimize = (id: string) => {
		setTimers((prev) =>
			prev.map((timer) =>
				timer.id === id ? { ...timer, isMinimized: !timer.isMinimized } : timer,
			),
		);
	};

	const updateTimerSettings = (
		id: string,
		field: "hours" | "minutes" | "seconds",
		value: number,
	) => {
		setTimers((prev) =>
			prev.map((timer) => {
				if (timer.id === id) {
					const newTimer = { ...timer, [field]: value };
					// Update timeLeft if timer is not running
					if (!timer.isRunning) {
						newTimer.timeLeft =
							newTimer.hours * 3600 + newTimer.minutes * 60 + newTimer.seconds;
					}
					return newTimer;
				}
				return timer;
			}),
		);
	};

	const updateGlobalTime = (
		field: "hours" | "minutes" | "seconds",
		value: number,
	) => {
		if (field === "hours") {
			setGlobalHours(Math.max(0, Math.min(24, value)));
		} else if (field === "minutes") {
			setGlobalMinutes(Math.max(0, Math.min(59, value)));
		} else if (field === "seconds") {
			setGlobalSeconds(Math.max(0, Math.min(59, value)));
		}
	};

	const decreaseGlobalTime = (field: "hours" | "minutes" | "seconds") => {
		if (field === "hours") {
			if (globalHours > 0) {
				setGlobalHours(globalHours - 1);
			}
		} else if (field === "minutes") {
			if (globalMinutes > 0) {
				setGlobalMinutes(globalMinutes - 1);
			} else if (globalHours > 0) {
				// If minutes is 0 and hours > 0, decrease hours and set minutes to 59
				setGlobalHours(globalHours - 1);
				setGlobalMinutes(59);
			}
		} else if (field === "seconds") {
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

	// Reset global time to default values and set initial timer name when timer is opened
	useEffect(() => {
		if (isVisible) {
			setGlobalHours(0);
			setGlobalMinutes(10);
			setGlobalSeconds(0);
			// Set initial timer name if provided
			if (initialTimerName) {
				setTimerName(initialTimerName);
			}
		}
	}, [isVisible, initialTimerName]);

	// Timer intervals management
	useEffect(() => {
		timers.forEach((timer) => {
			if (timer.isRunning && timer.timeLeft > 0) {
				if (intervalRefs.current[timer.id]) {
					clearInterval(intervalRefs.current[timer.id]);
				}

				intervalRefs.current[timer.id] = setInterval(() => {
					setTimers((prev) =>
						prev.map((t) => {
							if (t.id === timer.id && t.isRunning && t.endTime) {
								const remaining = Math.max(
									0,
									Math.ceil((t.endTime - Date.now()) / 1000),
								);
								if (remaining <= 0) {
									// Timer finished
									clearInterval(intervalRefs.current[t.id]);
									delete intervalRefs.current[t.id];
									setShowAlert(true);
									setAlertTimerId(t.id);
									playAlarmSound();
									return {
										...t,
										timeLeft: 0,
										isRunning: false,
										endTime: undefined,
									};
								}
								return { ...t, timeLeft: remaining };
							}
							return t;
						}),
					);
				}, 1000);
			} else {
				if (intervalRefs.current[timer.id]) {
					clearInterval(intervalRefs.current[timer.id]);
					delete intervalRefs.current[timer.id];
				}
			}
		});

		return () => {
			Object.values(intervalRefs.current).forEach((interval) => {
				if (interval) clearInterval(interval);
			});
		};
	}, [timers]);

	// Saving timers to localStorage
	useEffect(() => {
		localStorage.setItem(
			"multiTimers",
			JSON.stringify({ timers }),
		);
	}, [timers]);

	// Notify parent component of timer changes
	useEffect(() => {
		if (onTimersChange) {
			onTimersChange(timers);
		}
	}, [timers, onTimersChange]);

	const formatTime = (totalSeconds: number) => {
		const hrs = Math.floor(totalSeconds / 3600);
		const mins = Math.floor((totalSeconds % 3600) / 60);
		const secs = totalSeconds % 60;

		if (hrs > 0) {
			return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
		}
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	const dismissAlert = () => {
		setShowAlert(false);
		if (alertTimerId) {
			setTimers((prev) =>
				prev.map((timer) =>
					timer.id === alertTimerId
						? {
								...timer,
								timeLeft: 0, // Set time to 0 so it won't show in floating timers
								isRunning: false,
								isMinimized: false, // Remove from bottom when dismissed
							}
						: timer,
				),
			);
		}
		setAlertTimerId(null);
		// Stop the alarm sound
		stopAlarmSound();
	};

	const restartTimer = (id: string) => {
		// Stop the alarm sound first
		stopAlarmSound();

		setTimers((prev) =>
			prev.map((timer) => {
				if (timer.id === id) {
					const totalSeconds =
						timer.hours * 3600 + timer.minutes * 60 + timer.seconds;
					return {
						...timer,
						timeLeft: totalSeconds,
						isRunning: true,
						isMinimized: true, // Keep visible at bottom with new time
						endTime: Date.now() + totalSeconds * 1000,
					};
				}
				return timer;
			}),
		);
	};

	const snoozeTimer = (id: string) => {
		// Stop the alarm sound first
		stopAlarmSound();

		setTimers((prev) =>
			prev.map((timer) => {
				if (timer.id === id) {
					// Add 1 minute (60 seconds) to the timer
					const snoozeTime = 60;
					return {
						...timer,
						timeLeft: snoozeTime,
						isRunning: true,
						isMinimized: true, // Keep visible at bottom
						endTime: Date.now() + snoozeTime * 1000,
					};
				}
				return timer;
			}),
		);
	};

	// Quick time presets
	const quickTimePresets = [
		{ label: "1 דק", h: 0, m: 1, s: 0 },
		{ label: "5 דק", h: 0, m: 5, s: 0 },
		{ label: "10 דק", h: 0, m: 10, s: 0 },
		{ label: "15 דק", h: 0, m: 15, s: 0 },
		{ label: "30 דק", h: 0, m: 30, s: 0 },
		{ label: "45 דק", h: 0, m: 45, s: 0 },
		{ label: "1 שעה", h: 1, m: 0, s: 0 },
		{ label: "2 שעות", h: 2, m: 0, s: 0 },
	];

	const handleClose = () => {
		// When closing, minimize only running timers or timers with time left
		setTimers((prev) =>
			prev.map((timer) =>
				timer.isRunning || timer.timeLeft > 0
					? { ...timer, isMinimized: true }
					: { ...timer, isMinimized: false },
			),
		);
		setHighlightedTimerId(null);
		onClose();
	};

	if (!isVisible)
		return (
			<>
				{/* Floating Timers Row - Always Visible - Left Side */}
				<div className="fixed bottom-4 left-4 z-40 flex items-center space-x-2 rtl:space-x-reverse">
					{timers
						.filter((t) => t.isRunning || t.timeLeft > 0)
						.map((timer, index) => {
							// Define pastel colors for each timer
							const pastelColors = [
								'border-orange-300/70',    // Orange
								'border-blue-300/70',      // Blue
								'border-green-300/70',     // Green
								'border-purple-300/70',    // Purple
								'border-pink-300/70',      // Pink
							];
							const borderColor = pastelColors[index % pastelColors.length];
							
							return (
							<div key={timer.id} className="flex-shrink-0 relative">
								<button
									type="button"
									className={`bg-white/20 backdrop-blur-md rounded-xl shadow-2xl border-2 ${borderColor} cursor-pointer hover:scale-105 transition-all duration-200 p-3 relative overflow-hidden`}
									onClick={() => {
										setHighlightedTimerId(timer.id);
										// Open timer management window
										const timerEvent = new CustomEvent("showTimer");
										window.dispatchEvent(timerEvent);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											setHighlightedTimerId(timer.id);
											const timerEvent = new CustomEvent("showTimer");
											window.dispatchEvent(timerEvent);
										}
									}}
								>
									{/* Transparent corner for status indicator */}
									<div className="absolute top-0 right-0 w-4 h-4 bg-transparent"></div>
									
									<div className="flex flex-col items-center">
										<span className="text-lg mb-1 text-black">⏰</span>
										<div className="text-sm font-mono font-bold text-black tracking-tight leading-none">
											{formatTime(timer.timeLeft)}
										</div>
										{timer.label && (
											<div className="text-xs text-black/80 text-center max-w-16 truncate">
												{timer.label}
											</div>
										)}
									</div>
									
									{/* Status indicator positioned in transparent corner */}
									{timer.isRunning && (
										<div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
									)}
								</button>
							</div>
							);
						})}
				</div>

				{/* Alert Modal */}
				{showAlert && alertTimerId && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
						<div className="bg-white rounded-lg p-6 max-w-md w-full text-center animate-pulse">
							<div className="text-6xl mb-4">⏰</div>
							<h2 className="text-2xl font-bold text-gray-900 mb-2">
								הטיימר הסתיים!
							</h2>
							<p className="text-gray-600 mb-6">הזמן שהגדרת הסתיים</p>
							<p className="text-sm text-gray-500 mb-4">
								בחר מה לעשות עם הטיימר
							</p>
							<div className="flex items-center justify-center space-x-2 rtl:space-x-reverse mb-6">
								<Volume2 className="h-5 w-5 text-orange-500" />
								<span className="text-sm text-gray-500">מושמע צליל התראה</span>
							</div>
							<div className="flex space-x-3 rtl:space-x-reverse">
								<button
									onClick={dismissAlert}
									className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
									type="button"
								>
									סגור
								</button>
								<button
									onClick={() => {
										snoozeTimer(alertTimerId);
										setShowAlert(false);
										setAlertTimerId(null);
									}}
									className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center space-x-2 rtl:space-x-reverse"
									type="button"
								>
									<span>⏰</span>
									<span>נודניק</span>
								</button>
								<button
									onClick={() => {
										restartTimer(alertTimerId);
										dismissAlert();
									}}
									className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center space-x-2 rtl:space-x-reverse"
									type="button"
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
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
				<div className="bg-white rounded-xl shadow-2xl w-80 max-w-[90vw] max-h-[85vh] overflow-hidden border border-gray-100">
					{/* Sticky Header */}
					<div className="sticky top-0 bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100 p-3 z-10">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2 rtl:space-x-reverse">
								<span className="text-xl">⏰</span>
								<h3 className="text-lg font-semibold text-gray-800">
									ניהול טיימרים
								</h3>
							</div>
							<button
								onClick={handleClose}
								className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
								type="button"
							>
								<X className="h-4 w-4 text-gray-600" />
							</button>
						</div>
					</div>

					{/* Scrollable Content */}
					<div className="overflow-y-auto max-h-[calc(85vh-80px)]">
						<div className="p-3">
							{/* Global Time Selection */}
							<div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-100 mb-3">
								<h4 className="text-base font-semibold text-gray-800 mb-2 text-center">
									בחירת זמן טיימר
								</h4>

								{/* Time Display */}
								<div className="text-center mb-2">
									<div className="text-2xl font-mono font-bold text-gray-800 mb-2">
										{globalHours > 0
											? `${globalHours.toString().padStart(2, "0")}:`
											: ""}
										{globalMinutes.toString().padStart(2, "0")}:
										{globalSeconds.toString().padStart(2, "0")}
									</div>

									{/* Time Setters */}
									<div className="flex items-center justify-center space-x-4 rtl:space-x-reverse mb-2">
										<div className="flex flex-col items-center">
											<button
												onClick={() =>
													updateGlobalTime(
														"seconds",
														Math.min(59, globalSeconds + 15),
													)
												}
												className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
												type="button"
											>
												<Plus className="h-4 w-4" />
											</button>
											<span className="text-sm text-gray-600 mx-1 py-0.5">
												שניות
											</span>
											<button
												onClick={() => decreaseGlobalTime("seconds")}
												className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
												type="button"
											>
												<Minus className="h-4 w-4" />
											</button>
										</div>

										<div className="flex flex-col items-center">
											<button
												onClick={() =>
													updateGlobalTime(
														"minutes",
														Math.min(59, globalMinutes + 1),
													)
												}
												className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
												type="button"
											>
												<Plus className="h-4 w-4" />
											</button>
											<span className="text-sm text-gray-600 mx-1 py-0.5">
												דקות
											</span>
											<button
												onClick={() => decreaseGlobalTime("minutes")}
												className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
												type="button"
											>
												<Minus className="h-4 w-4" />
											</button>
										</div>

										<div className="flex flex-col items-center">
											<button
												onClick={() =>
													updateGlobalTime(
														"hours",
														Math.min(24, globalHours + 1),
													)
												}
												className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
												type="button"
											>
												<Plus className="h-4 w-4" />
											</button>
											<span className="text-sm text-gray-600 mx-1 py-0.5">
												שעות
											</span>
											<button
												onClick={() => decreaseGlobalTime("hours")}
												className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
												type="button"
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
										className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-center bg-white/70 text-sm"
										value={timerName}
										onChange={(e) => setTimerName(e.target.value)}
									/>
								</div>

								{/* Add Timer Button */}
								<div className="text-center">
									<button
										onClick={addTimer}
										disabled={timers.length >= 5}
										className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 mx-auto text-sm shadow-md"
										type="button"
									>
										<Plus className="h-4 w-4" />
										<span>הוסף טיימר</span>
									</button>
								</div>
							</div>

							{/* Active Timers List */}
							{timers.length === 0 ? (
								<div className="text-center py-6">
									<Clock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
									<h4 className="text-base font-medium text-gray-600 mb-1">
										אין טיימרים פעילים
									</h4>
									<p className="text-sm text-gray-500">
										בחר זמן ולחץ על "הוסף טיימר" כדי להתחיל
									</p>
								</div>
							) : (
								<div className="space-y-2">
									<h4 className="text-base font-semibold text-gray-800 mb-2">
										טיימרים פעילים
									</h4>
									{timers.map((timer) => (
										<div
											key={timer.id}
											className={`bg-gradient-to-r from-white to-gray-50 rounded-lg p-2.5 border border-gray-200 transition-all duration-200 shadow-sm ${
												highlightedTimerId === timer.id
													? "ring-2 ring-orange-400 shadow-md"
													: ""
											}`}
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center space-x-2 rtl:space-x-reverse">
													<div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
														<span className="text-xs">⏰</span>
													</div>
													<div>
														<h5 className="font-medium text-gray-800 text-xs">
															{timer.label}
														</h5>
														{timer.timeLeft > 0 && (
															<div className="text-sm font-mono font-bold text-orange-600">
																{formatTime(timer.timeLeft)}
															</div>
														)}
													</div>
												</div>

												<div className="flex items-center space-x-1 rtl:space-x-reverse">
													{!timer.isRunning ? (
														<button
															onClick={() => startTimer(timer.id)}
															disabled={
																globalHours === 0 &&
																globalMinutes === 0 &&
																globalSeconds === 0
															}
															className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
															title="הפעל טיימר"
															type="button"
														>
															<Play className="h-4 w-4" />
														</button>
													) : (
														<button
															onClick={() => pauseTimer(timer.id)}
															className="p-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-all duration-200 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
															title="השהה טיימר"
															type="button"
														>
															<Pause className="h-4 w-4" />
														</button>
													)}

													<button
														onClick={() => stopTimer(timer.id)}
														className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-all duration-200 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
														title="עצור טיימר"
														type="button"
													>
														<Square className="h-4 w-4" />
													</button>

													<button
														onClick={() => resetTimer(timer.id)}
														className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all duration-200 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
														title="אפס טיימר"
														type="button"
													>
														<RotateCcw className="h-4 w-4" />
													</button>

													<button
														onClick={() => removeTimer(timer.id)}
														className="p-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all duration-200 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
														title="מחק טיימר"
														type="button"
													>
														<X className="h-4 w-4" />
													</button>
												</div>
											</div>

											{/* Progress Bar */}
											{timer.timeLeft > 0 && (
												<div className="mt-2">
													<div className="w-full bg-gray-200 rounded-full h-1">
														<div
															className="bg-gradient-to-r from-orange-400 to-red-400 h-1 rounded-full transition-all duration-1000"
															style={{
																width: `${(() => {
																	const totalTime = timer.hours * 3600 + timer.minutes * 60 + timer.seconds;
																	if (totalTime === 0) return 0;
																	const elapsed = totalTime - timer.timeLeft;
																	return Math.min(
																		100,
																		Math.max(0, (elapsed / totalTime) * 100),
																	);
																})()}%`,
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
