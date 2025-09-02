/**
 * Mobile Image Upload Test Utility
 * 
 * This utility provides functions to test the enhanced mobile image upload system
 * and verify that it works correctly across different scenarios.
 */

import { enhancedMobileImageService } from '../services/enhancedMobileImageService';
import { compressImageForMobile, validateImageFile } from './mobileImageCompression';

interface TestResult {
  testName: string;
  success: boolean;
  details: string;
  duration: number;
  compressionRatio?: number;
  error?: string;
}

/**
 * Create a test image file for testing
 */
function createTestImageFile(sizeKB: number = 1000, name: string = 'test-image.jpg'): File {
  // Create a canvas and generate test image data
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size based on desired file size (approximate)
  const dimension = Math.sqrt(sizeKB * 100); // Rough calculation
  canvas.width = dimension;
  canvas.height = dimension;
  
  if (ctx) {
    // Create a colorful test pattern
    const gradient = ctx.createLinearGradient(0, 0, dimension, dimension);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.5, '#4ecdc4');
    gradient.addColorStop(1, '#45b7d1');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, dimension, dimension);
    
    // Add some text
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Test Image ${sizeKB}KB`, 10, 30);
    ctx.fillText(new Date().toISOString(), 10, 60);
  }
  
  // Convert canvas to blob and create File
  return new Promise<File>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      }
    }, 'image/jpeg', 0.9);
  }) as any; // Type assertion for synchronous test creation
}

/**
 * Test image validation
 */
export async function testImageValidation(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Create test files
    const validFile = createTestImageFile(500, 'valid-image.jpg');
    const tooLargeFile = createTestImageFile(25000, 'too-large.jpg'); // 25MB
    
    // Test valid file
    const validResult = validateImageFile(validFile);
    if (!validResult.isValid) {
      throw new Error(`Valid file failed validation: ${validResult.errors.join(', ')}`);
    }
    
    // Test invalid file
    const invalidResult = validateImageFile(tooLargeFile);
    if (invalidResult.isValid) {
      throw new Error('Too large file passed validation when it should have failed');
    }
    
    return {
      testName: 'Image Validation',
      success: true,
      details: `Valid file passed, invalid file rejected correctly`,
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      testName: 'Image Validation',
      success: false,
      details: 'Validation test failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test image compression
 */
export async function testImageCompression(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const testFile = createTestImageFile(5000, 'large-test.jpg'); // 5MB test file
    
    const result = await compressImageForMobile(testFile, {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
      maxSizeKB: 500
    });
    
    if (!result.success) {
      throw new Error(`Compression failed: ${result.error}`);
    }
    
    const compressionRatio = result.compressionRatio;
    const finalSizeKB = result.compressedSize / 1024;
    
    if (finalSizeKB > 500) {
      throw new Error(`Compressed image still too large: ${finalSizeKB.toFixed(1)}KB`);
    }
    
    return {
      testName: 'Image Compression',
      success: true,
      details: `Compressed from ${(result.originalSize / 1024).toFixed(1)}KB to ${finalSizeKB.toFixed(1)}KB`,
      duration: Date.now() - startTime,
      compressionRatio
    };
    
  } catch (error) {
    return {
      testName: 'Image Compression',
      success: false,
      details: 'Compression test failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test mobile upload service
 */
export async function testMobileUploadService(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const testFiles = [
      createTestImageFile(2000, 'test1.jpg'),
      createTestImageFile(3000, 'test2.jpg'),
      createTestImageFile(1500, 'test3.jpg')
    ];
    
    let progressUpdates = 0;
    let statusUpdates = 0;
    
    const result = await enhancedMobileImageService.uploadImages(testFiles, {
      imageType: 'gallery',
      onProgress: (completed, total, currentFile) => {
        progressUpdates++;
        console.log(`Test Progress: ${completed}/${total} - ${currentFile}`);
      },
      onStatusUpdate: (status) => {
        statusUpdates++;
        console.log(`Test Status: ${status}`);
      }
    });
    
    if (!result.success) {
      throw new Error(`Upload service failed: ${result.errors.map(e => e.error).join(', ')}`);
    }
    
    if (result.images.length !== testFiles.length) {
      throw new Error(`Expected ${testFiles.length} images, got ${result.images.length}`);
    }
    
    return {
      testName: 'Mobile Upload Service',
      success: true,
      details: `Processed ${result.images.length} images with ${progressUpdates} progress updates`,
      duration: Date.now() - startTime,
      compressionRatio: result.compressionStats.averageCompressionRatio
    };
    
  } catch (error) {
    return {
      testName: 'Mobile Upload Service',
      success: false,
      details: 'Upload service test failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test device capability detection
 */
export async function testDeviceCapabilities(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const capabilities = await enhancedMobileImageService.checkDeviceCapabilities();
    
    if (!capabilities.canProcessImages) {
      throw new Error('Device cannot process images');
    }
    
    if (capabilities.recommendedBatchSize <= 0) {
      throw new Error('Invalid batch size recommendation');
    }
    
    if (capabilities.maxImageSize <= 0) {
      throw new Error('Invalid max image size');
    }
    
    return {
      testName: 'Device Capabilities',
      success: true,
      details: `Batch size: ${capabilities.recommendedBatchSize}, Max size: ${(capabilities.maxImageSize / 1024 / 1024).toFixed(1)}MB`,
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      testName: 'Device Capabilities',
      success: false,
      details: 'Device capabilities test failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run all tests
 */
export async function runAllMobileImageTests(): Promise<TestResult[]> {
  console.log('🧪 Starting mobile image upload tests...');
  
  const tests = [
    testImageValidation,
    testImageCompression,
    testDeviceCapabilities,
    testMobileUploadService
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    console.log(`🔄 Running ${test.name}...`);
    try {
      const result = await test();
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.testName}: ${result.details} (${result.duration}ms)`);
        if (result.compressionRatio) {
          console.log(`📊 Compression ratio: ${result.compressionRatio.toFixed(1)}x`);
        }
      } else {
        console.log(`❌ ${result.testName}: ${result.details} (${result.duration}ms)`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.error(`💥 Test ${test.name} crashed:`, error);
      results.push({
        testName: test.name,
        success: false,
        details: 'Test crashed',
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n📋 Test Summary: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All mobile image upload tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Check the results above.');
  }
  
  return results;
}

/**
 * Quick test function for console usage
 */
export function quickTest(): Promise<TestResult[]> {
  return runAllMobileImageTests();
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).testMobileImageUpload = {
    runAllTests: runAllMobileImageTests,
    quickTest,
    testValidation: testImageValidation,
    testCompression: testImageCompression,
    testUploadService: testMobileUploadService,
    testCapabilities: testDeviceCapabilities
  };
}
