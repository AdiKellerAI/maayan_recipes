#!/usr/bin/env node

/**
 * Test script to verify that image updates are working correctly
 * Run this script to test the image update functionality
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

// Sample base64 image (small test image)
const TEST_IMAGE_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';

async function testImageUpdate() {
  try {
    console.log('🧪 Testing image update functionality...');
    
    // Step 1: Check if server is running
    console.log('📡 Checking server connection...');
    const healthResponse = await fetch(`${API_BASE}/test-connection`);
    if (!healthResponse.ok) {
      throw new Error('Server is not running');
    }
    console.log('✅ Server is running');
    
    // Step 2: Get all recipes to find one to test with
    console.log('📋 Fetching recipes...');
    const recipesResponse = await fetch(`${API_BASE}/recipes?detailed=true`);
    const recipesData = await recipesResponse.json();
    const recipes = recipesData.recipes || recipesData;
    
    if (!recipes || recipes.length === 0) {
      throw new Error('No recipes found to test with');
    }
    
    const testRecipe = recipes[0];
    console.log(`🎯 Testing with recipe: "${testRecipe.title}" (ID: ${testRecipe.id})`);
    console.log(`📸 Current images: ${testRecipe.images ? testRecipe.images.length : 0}`);
    
    // Step 3: Update the recipe with a new image
    console.log('🔄 Adding test image to recipe...');
    const currentImages = testRecipe.images || [];
    const updatedImages = [...currentImages, TEST_IMAGE_BASE64];
    
    const updateResponse = await fetch(`${API_BASE}/recipes/${testRecipe.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: updatedImages
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
    }
    
    const updatedRecipe = await updateResponse.json();
    console.log(`✅ Recipe updated successfully`);
    console.log(`📸 Images after update: ${updatedRecipe.images ? updatedRecipe.images.length : 0}`);
    
    // Step 4: Verify the update
    console.log('🔍 Verifying the update...');
    const verifyResponse = await fetch(`${API_BASE}/recipes/${testRecipe.id}`);
    const verifiedRecipe = await verifyResponse.json();
    
    console.log(`📸 Images in verification: ${verifiedRecipe.images ? verifiedRecipe.images.length : 0}`);
    
    if (verifiedRecipe.images && verifiedRecipe.images.length === updatedImages.length) {
      console.log('🎉 SUCCESS: Image update is working correctly!');
      
      // Step 5: Restore original state
      console.log('🔄 Restoring original state...');
      await fetch(`${API_BASE}/recipes/${testRecipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: currentImages
        })
      });
      console.log('✅ Original state restored');
      
    } else {
      console.error('❌ FAILURE: Image update is not working correctly!');
      console.error(`Expected ${updatedImages.length} images, but got ${verifiedRecipe.images ? verifiedRecipe.images.length : 0}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testImageUpdate();
