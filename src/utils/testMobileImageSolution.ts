/**
 * Test Utility for Mobile Image Storage Solution
 * 
 * This utility helps test and verify that the new mobile image storage solution
 * works correctly and handles various edge cases.
 */

import { mobileImageService } from '../services/mobileImageService';
import { mobileRecipeService } from '../services/mobileRecipeService';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

class MobileImageSolutionTester {
  private testResults: TestSuite[] = [];

  /**
   * Run all tests for the mobile image storage solution
   */
  async runAllTests(): Promise<TestSuite[]> {
    console.log('🧪 Starting Mobile Image Storage Solution Tests...');
    
    this.testResults = [];
    
    // Test 1: Storage Status Check
    await this.runStorageStatusTests();
    
    // Test 2: Image Service Tests
    await this.runImageServiceTests();
    
    // Test 3: Recipe Service Tests
    await this.runRecipeServiceTests();
    
    // Test 4: Integration Tests
    await this.runIntegrationTests();
    
    // Test 5: Error Handling Tests
    await this.runErrorHandlingTests();
    
    this.printTestSummary();
    return this.testResults;
  }

  /**
   * Test storage status functionality
   */
  private async runStorageStatusTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Storage Status Tests',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    };

    try {
      // Test 1: Check storage status
      const status = await mobileImageService.checkStorageStatus();
      suite.tests.push({
        testName: 'Storage Status Check',
        passed: !!status,
        details: status
      });

      // Test 2: Check localStorage availability
      suite.tests.push({
        testName: 'localStorage Availability',
        passed: status.localStorage.available,
        details: {
          available: status.localStorage.available,
          used: status.localStorage.used,
          remaining: status.localStorage.remaining
        }
      });

      // Test 3: Check IndexedDB availability
      suite.tests.push({
        testName: 'IndexedDB Availability',
        passed: status.indexedDB.available,
        details: {
          available: status.indexedDB.available,
          ready: status.indexedDB.ready
        }
      });

      // Test 4: Check hybrid strategy
      suite.tests.push({
        testName: 'Hybrid Strategy',
        passed: status.hybrid.available,
        details: {
          available: status.hybrid.available,
          strategy: status.hybrid.strategy
        }
      });

    } catch (error) {
      suite.tests.push({
        testName: 'Storage Status Tests',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    this.calculateSuiteStats(suite);
    this.testResults.push(suite);
  }

  /**
   * Test image service functionality
   */
  private async runImageServiceTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Image Service Tests',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    };

    try {
      // Test 1: Create test image file
      const testImage = this.createTestImageFile();
      suite.tests.push({
        testName: 'Test Image Creation',
        passed: !!testImage && testImage.size > 0,
        details: {
          fileName: testImage.name,
          fileSize: testImage.size,
          fileType: testImage.type
        }
      });

      // Test 2: Save test image
      const imageId = await mobileImageService.saveImage(testImage, 'test-recipe-id');
      suite.tests.push({
        testName: 'Image Save',
        passed: !!imageId && imageId !== 'placeholder',
        details: {
          imageId,
          expected: 'non-empty string, not placeholder'
        }
      });

      // Test 3: Retrieve saved image
      if (imageId && imageId !== 'placeholder') {
        const retrievedImage = await mobileImageService.getImage(imageId);
        suite.tests.push({
          testName: 'Image Retrieval',
          passed: !!retrievedImage,
          details: {
            retrieved: !!retrievedImage,
            imageLength: retrievedImage?.length || 0
          }
        });

        // Test 4: Delete test image
        const deleteResult = await mobileImageService.deleteImage(imageId);
        suite.tests.push({
          testName: 'Image Deletion',
          passed: deleteResult,
          details: {
            deleted: deleteResult
          }
        });
      }

    } catch (error) {
      suite.tests.push({
        testName: 'Image Service Tests',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    this.calculateSuiteStats(suite);
    this.testResults.push(suite);
  }

  /**
   * Test recipe service functionality
   */
  private async runRecipeServiceTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Recipe Service Tests',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    };

    try {
      // Test 1: Create test recipe
      const testRecipe = this.createTestRecipe();
      suite.tests.push({
        testName: 'Test Recipe Creation',
        passed: !!testRecipe && !!testRecipe.title,
        details: {
          title: testRecipe.title,
          ingredients: testRecipe.ingredients.length,
          images: testRecipe.images.length
        }
      });

      // Test 2: Save test recipe
      const savedRecipe = await mobileRecipeService.saveRecipe(testRecipe);
      suite.tests.push({
        testName: 'Recipe Save',
        passed: !!savedRecipe && !!savedRecipe.id,
        details: {
          recipeId: savedRecipe.id,
          title: savedRecipe.title
        }
      });

      // Test 3: Retrieve saved recipe
      if (savedRecipe) {
        const retrievedRecipe = await mobileRecipeService.getRecipe(savedRecipe.id);
        suite.tests.push({
          testName: 'Recipe Retrieval',
          passed: !!retrievedRecipe && retrievedRecipe.id === savedRecipe.id,
          details: {
            retrieved: !!retrievedRecipe,
            idMatch: retrievedRecipe?.id === savedRecipe.id
          }
        });

        // Test 4: Update recipe
        const updatedRecipe = await mobileRecipeService.updateRecipe(savedRecipe.id, {
          title: 'Updated Test Recipe'
        });
        suite.tests.push({
          testName: 'Recipe Update',
          passed: !!updatedRecipe && updatedRecipe.title === 'Updated Test Recipe',
          details: {
            updated: !!updatedRecipe,
            titleMatch: updatedRecipe?.title === 'Updated Test Recipe'
          }
        });

        // Test 5: Delete test recipe
        const deleteResult = await mobileRecipeService.deleteRecipe(savedRecipe.id);
        suite.tests.push({
          testName: 'Recipe Deletion',
          passed: deleteResult,
          details: {
            deleted: deleteResult
          }
        });
      }

    } catch (error) {
      suite.tests.push({
        testName: 'Recipe Service Tests',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    this.calculateSuiteStats(suite);
    this.testResults.push(suite);
  }

  /**
   * Test integration between services
   */
  private async runIntegrationTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Integration Tests',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    };

    try {
      // Test 1: Recipe with images integration
      const testRecipe = this.createTestRecipeWithImages();
      const savedRecipe = await mobileRecipeService.saveRecipe(testRecipe);
      
      suite.tests.push({
        testName: 'Recipe with Images Save',
        passed: !!savedRecipe && savedRecipe.images.length > 0,
        details: {
          recipeId: savedRecipe.id,
          imageCount: savedRecipe.images.length
        }
      });

      // Test 2: Verify images are accessible
      if (savedRecipe && savedRecipe.images.length > 0) {
        let accessibleImages = 0;
        for (const imageId of savedRecipe.images) {
          if (imageId !== 'placeholder') {
            const image = await mobileImageService.getImage(imageId);
            if (image) accessibleImages++;
          }
        }

        suite.tests.push({
          testName: 'Images Accessibility',
          passed: accessibleImages === savedRecipe.images.length,
          details: {
            totalImages: savedRecipe.images.length,
            accessibleImages,
            placeholderImages: savedRecipe.images.filter(id => id === 'placeholder').length
          }
        });
      }

      // Test 3: Storage stats integration
      const storageStats = await mobileRecipeService.getStorageStats();
      suite.tests.push({
        testName: 'Storage Stats Integration',
        passed: !!storageStats && storageStats.totalRecipes > 0,
        details: {
          totalRecipes: storageStats.totalRecipes,
          totalImages: storageStats.totalImages,
          strategy: storageStats.strategy
        }
      });

      // Cleanup
      if (savedRecipe) {
        await mobileRecipeService.deleteRecipe(savedRecipe.id);
      }

    } catch (error) {
      suite.tests.push({
        testName: 'Integration Tests',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    this.calculateSuiteStats(suite);
    this.testResults.push(suite);
  }

  /**
   * Test error handling and edge cases
   */
  private async runErrorHandlingTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Error Handling Tests',
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    };

    try {
      // Test 1: Invalid image file
      const invalidFile = new File(['invalid'], 'invalid.txt', { type: 'text/plain' });
      try {
        await mobileImageService.saveImage(invalidFile, 'test-recipe');
        suite.tests.push({
          testName: 'Invalid Image File Handling',
          passed: false,
          error: 'Should have thrown error for invalid file type'
        });
      } catch (error) {
        suite.tests.push({
          testName: 'Invalid Image File Handling',
          passed: true,
          details: {
            errorCaught: true,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }

      // Test 2: Non-existent recipe retrieval
      const nonExistentRecipe = await mobileRecipeService.getRecipe('non-existent-id');
      suite.tests.push({
        testName: 'Non-existent Recipe Handling',
        passed: nonExistentRecipe === null,
        details: {
          result: nonExistentRecipe,
          expected: null
        }
      });

      // Test 3: Large image handling
      const largeImage = this.createLargeTestImage();
      try {
        const imageId = await mobileImageService.saveImage(largeImage, 'test-recipe');
        suite.tests.push({
          testName: 'Large Image Handling',
          passed: !!imageId,
          details: {
            imageId,
            originalSize: largeImage.size,
            compressed: imageId !== 'placeholder'
          }
        });

        // Cleanup
        if (imageId && imageId !== 'placeholder') {
          await mobileImageService.deleteImage(imageId);
        }
      } catch (error) {
        suite.tests.push({
          testName: 'Large Image Handling',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    } catch (error) {
      suite.tests.push({
        testName: 'Error Handling Tests',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    this.calculateSuiteStats(suite);
    this.testResults.push(suite);
  }

  /**
   * Create a test image file
   */
  private createTestImageFile(): File {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.fillText('Test', 20, 50);
    }

    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'test-image.jpg', { type: 'image/jpeg' });
          resolve(file);
        } else {
          // Fallback to empty file
          resolve(new File([''], 'test-image.jpg', { type: 'image/jpeg' }));
        }
      }, 'image/jpeg', 0.8);
    });
  }

  /**
   * Create a large test image
   */
  private createLargeTestImage(): File {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#4ecdc4';
      ctx.fillRect(0, 0, 2000, 2000);
      ctx.fillStyle = '#ffffff';
      ctx.font = '100px Arial';
      ctx.fillText('Large Test', 100, 1000);
    }

    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'large-test-image.jpg', { type: 'image/jpeg' });
          resolve(file);
        } else {
          // Fallback to empty file
          resolve(new File([''], 'large-test-image.jpg', { type: 'image/jpeg' }));
        }
      }, 'image/jpeg', 0.9);
    });
  }

  /**
   * Create a test recipe
   */
  private createTestRecipe() {
    return {
      title: 'Test Recipe',
      category: 'עוגות',
      ingredients: ['קמח', 'סוכר', 'ביצים'],
      directions: ['מערבבים את החומרים', 'אופים 30 דקות'],
      images: [],
      additional_instructions: {},
      additional_sections: {},
      prep_time: '30 דקות',
      difficulty: 'קל' as const,
      is_favorite: false
    };
  }

  /**
   * Create a test recipe with images
   */
  private createTestRecipeWithImages() {
    return {
      title: 'Test Recipe with Images',
      category: 'עוגות',
      ingredients: ['קמח', 'סוכר', 'ביצים'],
      directions: ['מערבבים את החומרים', 'אופים 30 דקות'],
      images: [
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      ],
      additional_instructions: {},
      additional_sections: {},
      prep_time: '30 דקות',
      difficulty: 'קל' as const,
      is_favorite: false
    };
  }

  /**
   * Calculate test suite statistics
   */
  private calculateSuiteStats(suite: TestSuite): void {
    suite.totalTests = suite.tests.length;
    suite.passedTests = suite.tests.filter(test => test.passed).length;
    suite.failedTests = suite.tests.filter(test => !test.passed).length;
  }

  /**
   * Print test summary
   */
  private printTestSummary(): void {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const suite of this.testResults) {
      console.log(`\n${suite.name}:`);
      console.log(`  Tests: ${suite.passedTests}/${suite.totalTests} passed`);
      
      if (suite.failedTests > 0) {
        console.log(`  ❌ Failed tests:`);
        for (const test of suite.tests.filter(t => !t.passed)) {
          console.log(`    - ${test.testName}: ${test.error || 'Unknown error'}`);
        }
      }

      totalTests += suite.totalTests;
      totalPassed += suite.passedTests;
      totalFailed += suite.failedTests;
    }

    console.log(`\n🎯 Overall Results:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${totalPassed} ✅`);
    console.log(`  Failed: ${totalFailed} ❌`);
    console.log(`  Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed! The mobile image storage solution is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the errors above.');
    }
  }
}

// Export test utility
export const mobileImageSolutionTester = new MobileImageSolutionTester();

// Convenience function to run tests
export const runMobileImageTests = () => mobileImageSolutionTester.runAllTests();

export default mobileImageSolutionTester;
