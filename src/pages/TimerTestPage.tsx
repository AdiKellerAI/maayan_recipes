import React, { useState } from 'react';
import CookingTimer from '../components/Timer/CookingTimer';
import { runAllTests, testServiceWorkerRegistration, testSharedWorker, testEnhancedTimer } from '../utils/testEnhancedTimer';

const TimerTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const handleTimerComplete = () => {
    addTestResult('✅ Timer completed successfully!');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Enhanced Timer System Test
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Test the browser-independent timer accuracy system
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Testing Instructions:</h2>
            <ol className="text-left text-blue-800 space-y-1">
              <li>1. Start a 10-minute timer</li>
              <li>2. Open a heavy application (game, video editor, etc.)</li>
              <li>3. Let the browser lose focus for 8+ minutes</li>
              <li>4. Return to browser</li>
              <li>5. Timer should show exactly 2 minutes remaining</li>
              <li>6. Timer should complete at exactly 10 minutes</li>
            </ol>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timer Component */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Timer Component</h2>
            <CookingTimer
              duration={10}
              onComplete={handleTimerComplete}
              timerName="Test Timer"
            />
          </div>

          {/* Test Results */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
              <div className="flex space-x-2">
                <button
                  onClick={clearResults}
                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    addTestResult('🧪 Running system tests...');
                    runAllTests().then(results => {
                      const allPassed = Object.values(results).every(result => result);
                      addTestResult(allPassed ? '✅ All tests passed!' : '❌ Some tests failed');
                    });
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Test System
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4 h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-center mt-20">
                  No test results yet. Start a timer to see results.
                </p>
              ) : (
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Expected Behavior:</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Timer continues running when browser loses focus</li>
                <li>• Accurate timing regardless of system load</li>
                <li>• System notifications when timer completes</li>
                <li>• Wake lock prevents system sleep</li>
                <li>• Multiple verification systems ensure accuracy</li>
              </ul>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Individual Tests:</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    addTestResult('🔧 Testing Service Worker...');
                    testServiceWorkerRegistration().then(result => {
                      addTestResult(result ? '✅ Service Worker OK' : '❌ Service Worker Failed');
                    });
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                  Test Service Worker
                </button>
                <button
                  onClick={() => {
                    addTestResult('🔧 Testing Shared Worker...');
                    testSharedWorker().then(result => {
                      addTestResult(result ? '✅ Shared Worker OK' : '❌ Shared Worker Failed');
                    });
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                  Test Shared Worker
                </button>
                <button
                  onClick={() => {
                    addTestResult('🔧 Testing Enhanced Timer...');
                    testEnhancedTimer().then(result => {
                      addTestResult(result ? '✅ Enhanced Timer OK' : '❌ Enhanced Timer Failed');
                    });
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                  Test Enhanced Timer
                </button>
                <button
                  onClick={() => {
                    addTestResult('🧪 Running all tests...');
                    runAllTests().then(results => {
                      const allPassed = Object.values(results).every(result => result);
                      addTestResult(allPassed ? '✅ All tests passed!' : '❌ Some tests failed');
                    });
                  }}
                  className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                >
                  Run All Tests
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Technical Implementation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Method 1: Service Worker</h3>
              <p className="text-sm text-gray-600">
                Runs independently of main thread, prevents browser throttling when not in focus.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Method 2: Shared Worker</h3>
              <p className="text-sm text-gray-600">
                Cross-tab accuracy and fallback when service worker unavailable.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Method 3: Wake Lock</h3>
              <p className="text-sm text-gray-600">
                Prevents system sleep during timer execution.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Method 4: Verification</h3>
              <p className="text-sm text-gray-600">
                Multiple verification points catch early completion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerTestPage;
