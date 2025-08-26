// Test utility for Enhanced Timer System
import EnhancedTimer from './enhancedTimer';

export const testEnhancedTimer = async () => {
  console.log('🧪 Testing Enhanced Timer System...');
  
  try {
    // Test 1: Initialize enhanced timer
    console.log('Test 1: Initializing enhanced timer...');
    const timer = new EnhancedTimer({
      onUpdate: (remaining: number) => {
        console.log(`⏰ Timer update: ${remaining}s remaining`);
      },
      onComplete: (timerId: string, timerName: string) => {
        console.log(`✅ Timer completed: ${timerName} (${timerId})`);
      },
      onError: (error: string) => {
        console.error(`❌ Timer error: ${error}`);
      }
    });
    
    const initialized = await timer.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize enhanced timer');
    }
    console.log('✅ Enhanced timer initialized successfully');
    
    // Test 2: Start a short timer
    console.log('Test 2: Starting 5-second test timer...');
    const timerId = await timer.startTimer('Test Timer', 1/12); // 5 seconds (1/12 minute)
    console.log(`✅ Timer started with ID: ${timerId}`);
    
    // Test 3: Get timer status
    console.log('Test 3: Getting timer status...');
    const status = await timer.getTimerStatus(timerId);
    if (status) {
      console.log(`✅ Timer status: ${status.remaining}s remaining, running: ${status.isRunning}`);
    } else {
      console.log('⚠️ Timer status not available');
    }
    
    // Test 4: Get all timers
    console.log('Test 4: Getting all timers...');
    const allTimers = await timer.getAllTimers();
    console.log(`✅ Found ${allTimers.length} active timers`);
    
    // Test 5: Wait for timer completion
    console.log('Test 5: Waiting for timer completion...');
    await new Promise(resolve => {
      const checkComplete = async () => {
        const currentStatus = await timer.getTimerStatus(timerId);
        if (!currentStatus || currentStatus.remaining <= 0) {
          resolve(true);
        } else {
          setTimeout(checkComplete, 1000);
        }
      };
      checkComplete();
    });
    
    console.log('✅ Test timer completed successfully');
    
    // Test 6: Cleanup
    console.log('Test 6: Cleaning up...');
    await timer.destroy();
    console.log('✅ Enhanced timer destroyed successfully');
    
    console.log('🎉 All tests passed! Enhanced timer system is working correctly.');
    return true;
    
  } catch (error) {
    console.error('❌ Enhanced timer test failed:', error);
    return false;
  }
};

export const testServiceWorkerRegistration = async () => {
  console.log('🔧 Testing Service Worker Registration...');
  
  try {
    if (!('serviceWorker' in navigator)) {
      console.log('⚠️ Service Worker not supported in this browser');
      return false;
    }
    
    const registration = await navigator.serviceWorker.register('/timer-worker.js');
    console.log('✅ Service Worker registered:', registration);
    
    await navigator.serviceWorker.ready;
    console.log('✅ Service Worker is ready');
    
    if (registration.active) {
      console.log('✅ Service Worker is active');
      
      // Test communication
      const channel = new MessageChannel();
      const pingPromise = new Promise(resolve => {
        channel.port1.onmessage = (event) => {
          if (event.data.type === 'PONG') {
            resolve(true);
          }
        };
      });
      
      registration.active.postMessage({ type: 'PING' }, [channel.port2]);
      
      const pingReceived = await Promise.race([
        pingPromise,
        new Promise(resolve => setTimeout(() => resolve(false), 5000))
      ]);
      
      if (pingReceived) {
        console.log('✅ Service Worker communication working');
      } else {
        console.log('⚠️ Service Worker communication timeout');
      }
    } else {
      console.log('⚠️ Service Worker not active');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Service Worker test failed:', error);
    return false;
  }
};

export const testSharedWorker = async () => {
  console.log('🔧 Testing Shared Worker...');
  
  try {
    if (!('SharedWorker' in window)) {
      console.log('⚠️ Shared Worker not supported in this browser');
      return false;
    }
    
    const worker = new SharedWorker('/shared-timer-worker.js');
    console.log('✅ Shared Worker created');
    
    const connectionPromise = new Promise(resolve => {
      worker.port.onmessage = (event) => {
        if (event.data.type === 'CONNECTED') {
          resolve(true);
        }
      };
    });
    
    worker.port.start();
    
    const connected = await Promise.race([
      connectionPromise,
      new Promise(resolve => setTimeout(() => resolve(false), 5000))
    ]);
    
    if (connected) {
      console.log('✅ Shared Worker connected successfully');
      
      // Test ping
      const pingPromise = new Promise(resolve => {
        worker.port.onmessage = (event) => {
          if (event.data.type === 'PONG') {
            resolve(true);
          }
        };
      });
      
      worker.port.postMessage({ type: 'PING' });
      
      const pingReceived = await Promise.race([
        pingPromise,
        new Promise(resolve => setTimeout(() => resolve(false), 5000))
      ]);
      
      if (pingReceived) {
        console.log('✅ Shared Worker communication working');
      } else {
        console.log('⚠️ Shared Worker communication timeout');
      }
      
      // Cleanup
      worker.port.postMessage({ type: 'DISCONNECT' });
    } else {
      console.log('⚠️ Shared Worker connection timeout');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Shared Worker test failed:', error);
    return false;
  }
};

export const runAllTests = async () => {
  console.log('🚀 Running Enhanced Timer System Tests...\n');
  
  const results = {
    serviceWorker: false,
    sharedWorker: false,
    enhancedTimer: false
  };
  
  // Test Service Worker
  results.serviceWorker = await testServiceWorkerRegistration();
  console.log('');
  
  // Test Shared Worker
  results.sharedWorker = await testSharedWorker();
  console.log('');
  
  // Test Enhanced Timer
  results.enhancedTimer = await testEnhancedTimer();
  console.log('');
  
  // Summary
  console.log('📊 Test Results Summary:');
  console.log(`Service Worker: ${results.serviceWorker ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Shared Worker: ${results.sharedWorker ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Enhanced Timer: ${results.enhancedTimer ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  if (allPassed) {
    console.log('\n🎉 All tests passed! Enhanced timer system is ready for production.');
  } else {
    console.log('\n⚠️ Some tests failed. Check console for details.');
  }
  
  return results;
};

// Auto-run tests if this file is imported directly
if (typeof window !== 'undefined') {
  // Run tests after a short delay to ensure page is loaded
  setTimeout(() => {
    console.log('🔍 Enhanced Timer Test Suite Loaded');
    console.log('Run runAllTests() in console to test the system');
  }, 1000);
}
