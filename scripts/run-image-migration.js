#!/usr/bin/env node

/**
 * Run image migration script
 * This script converts blob URLs to base64 data URLs to prevent broken images after memory clear
 */

const { migrateBlobImages, cleanupBrokenBlobUrls } = require('./migrate-blob-images');

async function main() {
  console.log('🚀 Starting image migration process...\n');
  
  try {
    // Step 1: Migrate blob URLs to base64
    console.log('📋 Step 1: Migrating blob URLs to base64...');
    await migrateBlobImages();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Step 2: Clean up broken blob URLs
    console.log('🧹 Step 2: Cleaning up broken blob URLs...');
    await cleanupBrokenBlobUrls();
    
    console.log('\n✅ Image migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- Blob URLs have been removed');
    console.log('- Broken blob URLs have been cleaned up');
    console.log('- Images will now persist after memory clear');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    const { pool } = require('./migrate-blob-images');
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  main();
}
