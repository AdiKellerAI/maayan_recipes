/**
 * Migration script to convert blob URLs to base64 data URLs
 * This ensures images persist after memory clear
 */

const { Pool } = require('pg');

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Convert blob URL to base64 data URL
 */
async function blobToBase64(blobUrl) {
  try {
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status}`);
    }
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting blob to base64:', error);
    throw error;
  }
}

/**
 * Analyze image URL and determine if it needs migration
 */
function analyzeImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return { type: 'invalid', needsMigration: false };
  }

  if (url.startsWith('blob:')) {
    return { type: 'blob', needsMigration: true };
  }

  if (url.startsWith('data:image/')) {
    return { type: 'base64', needsMigration: false };
  }

  if (url.includes('/api/images/') || url.includes('/api/recipes/')) {
    return { type: 'server', needsMigration: false };
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { type: 'external', needsMigration: false };
  }

  return { type: 'unknown', needsMigration: false };
}

/**
 * Clean up blob URLs (remove them since they're temporary)
 */
async function migrateBlobImages() {
  console.log('🔄 Starting blob URL cleanup...');

  try {
    // Fetch all recipes
    const client = await pool.connect();
    const result = await client.query('SELECT id, title, images FROM recipes');
    const recipes = result.rows;
    client.release();

    console.log(`📋 Found ${recipes.length} recipes to process`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const recipe of recipes) {
      if (!recipe.images || !Array.isArray(recipe.images) || recipe.images.length === 0) {
        continue;
      }

      // Filter out blob URLs (they're temporary and will break)
      const validImages = recipe.images.filter(imageUrl => {
        const analysis = analyzeImageUrl(imageUrl);
        return !analysis.needsMigration; // Remove blob URLs
      });

      // If we removed any blob URLs, update the recipe
      if (validImages.length !== recipe.images.length) {
        console.log(`🧹 Cleaning blob URLs for recipe: ${recipe.title} (removed ${recipe.images.length - validImages.length} blob URLs)`);
        
        const client = await pool.connect();
        try {
          await client.query(
            'UPDATE recipes SET images = $1 WHERE id = $2',
            [JSON.stringify(validImages), recipe.id]
          );
          console.log(`✅ Updated recipe: ${recipe.title}`);
          cleanedCount++;
        } catch (updateError) {
          console.error(`❌ Failed to update recipe ${recipe.title}:`, updateError);
          errorCount++;
        } finally {
          client.release();
        }
      }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`✅ Successfully cleaned: ${cleanedCount} recipes`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total recipes processed: ${recipes.length}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

/**
 * Clean up blob URLs that are no longer accessible
 */
async function cleanupBrokenBlobUrls() {
  console.log('🧹 Cleaning up broken blob URLs...');

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT id, title, images FROM recipes');
    const recipes = result.rows;
    client.release();

    let cleanedCount = 0;

    for (const recipe of recipes) {
      if (!recipe.images || !Array.isArray(recipe.images) || recipe.images.length === 0) {
        continue;
      }

      const validImages = recipe.images.filter(imageUrl => {
        const analysis = analyzeImageUrl(imageUrl);
        return !analysis.needsMigration; // Remove blob URLs
      });

      if (validImages.length !== recipe.images.length) {
        const client = await pool.connect();
        try {
          await client.query(
            'UPDATE recipes SET images = $1 WHERE id = $2',
            [JSON.stringify(validImages), recipe.id]
          );
          console.log(`✅ Cleaned recipe: ${recipe.title} (removed ${recipe.images.length - validImages.length} broken URLs)`);
          cleanedCount++;
        } catch (updateError) {
          console.error(`❌ Failed to clean recipe ${recipe.title}:`, updateError);
        } finally {
          client.release();
        }
      }
    }

    console.log(`🧹 Cleanup complete: ${cleanedCount} recipes cleaned`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'migrate':
      await migrateBlobImages();
      break;
    case 'cleanup':
      await cleanupBrokenBlobUrls();
      break;
    case 'full':
      await migrateBlobImages();
      await cleanupBrokenBlobUrls();
      break;
    default:
      console.log('Usage: node migrate-blob-images.js [migrate|cleanup|full]');
      console.log('  migrate: Convert blob URLs to base64');
      console.log('  cleanup: Remove broken blob URLs');
      console.log('  full: Run both migrate and cleanup');
      process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  migrateBlobImages,
  cleanupBrokenBlobUrls,
  analyzeImageUrl,
  blobToBase64,
  pool
};
