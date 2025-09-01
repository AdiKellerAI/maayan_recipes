#!/usr/bin/env node

/**
 * Image Migration Script
 * 
 * This script migrates existing base64 images stored in the recipes table
 * to the new file-based image management system.
 * 
 * Usage:
 *   node scripts/migrate-images.js [--dry-run] [--batch-size=100] [--skip-existing]
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

// Configuration
const config = {
  host: '34.132.167.99',
  port: 5432,
  database: 'recipes',
  user: 'postgres',
  password: 'MaayanRecipes2025',
  ssl: { rejectUnauthorized: false }
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 100,
  skipExisting: args.includes('--skip-existing')
};

class ImageMigrator {
  constructor() {
    this.pool = new Pool(config);
    this.uploadDir = 'uploads';
    this.processedCount = 0;
    this.errorCount = 0;
    this.skippedCount = 0;
  }

  async init() {
    try {
      console.log('🔌 Connecting to database...');
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connection established');
      
      // Create uploads directory if it doesn't exist
      await this.ensureUploadsDirectory();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      return false;
    }
  }

  async ensureUploadsDirectory() {
    const uploadsPath = path.join(this.uploadDir, 'recipes');
    try {
      await fs.mkdir(uploadsPath, { recursive: true });
      console.log('✅ Uploads directory ready');
    } catch (error) {
      console.error('❌ Failed to create uploads directory:', error.message);
      throw error;
    }
  }

  async migrateImages() {
    console.log('\n🚀 Starting image migration...');
    console.log(`📋 Options: ${options.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}, Batch size: ${options.batchSize}, Skip existing: ${options.skipExisting}`);
    
    const client = await this.pool.connect();
    
    try {
      // Get recipes with base64 images
      const recipesResult = await client.query(`
        SELECT id, title, images 
        FROM recipes 
        WHERE images IS NOT NULL 
          AND jsonb_array_length(images) > 0
          AND deleted_at IS NULL
        ORDER BY created_at ASC
      `);
      
      const recipes = recipesResult.rows;
      console.log(`📊 Found ${recipes.length} recipes with base64 images`);
      
      if (recipes.length === 0) {
        console.log('✅ No recipes with base64 images found. Migration complete!');
        return;
      }
      
      // Process recipes in batches
      for (let i = 0; i < recipes.length; i += options.batchSize) {
        const batch = recipes.slice(i, i + options.batchSize);
        console.log(`\n📦 Processing batch ${Math.floor(i / options.batchSize) + 1}/${Math.ceil(recipes.length / options.batchSize)} (${batch.length} recipes)`);
        
        await this.processBatch(batch, client);
        
        // Progress update
        const progress = ((i + batch.length) / recipes.length * 100).toFixed(1);
        console.log(`📈 Progress: ${progress}% (${i + batch.length}/${recipes.length})`);
      }
      
      console.log('\n✅ Migration completed!');
      console.log(`📊 Summary:`);
      console.log(`   - Processed: ${this.processedCount} images`);
      console.log(`   - Skipped: ${this.skippedCount} images`);
      console.log(`   - Errors: ${this.errorCount} images`);
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async processBatch(recipes, client) {
    for (const recipe of recipes) {
      try {
        await this.processRecipe(recipe, client);
      } catch (error) {
        console.error(`❌ Error processing recipe ${recipe.id}:`, error.message);
        this.errorCount++;
      }
    }
  }

  async processRecipe(recipe, client) {
    console.log(`\n🍳 Processing recipe: ${recipe.title} (${recipe.id})`);
    
    const images = recipe.images;
    if (!Array.isArray(images) || images.length === 0) {
      console.log('   ⏭️  No images to process');
      return;
    }
    
    console.log(`   📸 Found ${images.length} base64 images`);
    
    // Check if images already migrated
    if (options.skipExisting) {
      const existingImages = await client.query(
        'SELECT COUNT(*) as count FROM recipe_images WHERE recipe_id = $1',
        [recipe.id]
      );
      
      if (parseInt(existingImages.rows[0].count) > 0) {
        console.log(`   ⏭️  Skipping - ${existingImages.rows[0].count} images already exist`);
        this.skippedCount += images.length;
        return;
      }
    }
    
    // Create recipe directory
    const recipePath = path.join(this.uploadDir, 'recipes', recipe.id);
    await this.createRecipeDirectories(recipePath);
    
    // Process each image
    for (let i = 0; i < images.length; i++) {
      const base64Data = images[i];
      
      if (!base64Data || typeof base64Data !== 'string') {
        console.log(`   ⚠️  Skipping invalid image at index ${i}`);
        continue;
      }
      
      try {
        await this.processBase64Image(recipe, base64Data, i, client);
        this.processedCount++;
      } catch (error) {
        console.error(`   ❌ Error processing image ${i}:`, error.message);
        this.errorCount++;
      }
    }
  }

  async createRecipeDirectories(recipePath) {
    const directories = [
      recipePath,
      path.join(recipePath, 'thumbnail'),
      path.join(recipePath, 'medium'),
      path.join(recipePath, 'large'),
      path.join(recipePath, 'original')
    ];
    
    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  async processBase64Image(recipe, base64Data, index, client) {
    try {
      // Remove data URL prefix if present
      const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64String, 'base64');
      
      // Generate filename
      const filename = this.generateFilename(recipe.id, index);
      const baseName = path.basename(filename, path.extname(filename));
      
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      // Process different sizes
      const processedImages = {};
      
      const sizes = {
        thumbnail: { width: 150, height: 150, quality: 80 },
        medium: { width: 500, height: 500, quality: 85 },
        large: { width: 1200, height: 1200, quality: 90 }
      };
      
      for (const [size, config] of Object.entries(sizes)) {
        const processedBuffer = await sharp(imageBuffer)
          .resize(config.width, config.height, {
            fit: 'inside',
            withoutEnlargement: true,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .webp({ quality: config.quality })
          .toBuffer();
        
        const sizeFilename = `${baseName}_${size}.webp`;
        const filePath = path.join(this.uploadDir, 'recipes', recipe.id, size, sizeFilename);
        
        if (!options.dryRun) {
          await fs.writeFile(filePath, processedBuffer);
        }
        
        processedImages[size] = {
          filename: sizeFilename,
          filePath,
          url: `/api/images/${recipe.id}/${size}/${sizeFilename}`,
          size: processedBuffer.length,
          width: config.width,
          height: config.height
        };
      }
      
      // Save original
      const originalFilename = `${baseName}_original.jpg`;
      const originalPath = path.join(this.uploadDir, 'recipes', recipe.id, 'original', originalFilename);
      
      if (!options.dryRun) {
        await fs.writeFile(originalPath, imageBuffer);
      }
      
      // Save to database
      if (!options.dryRun) {
        const imageData = {
          recipe_id: recipe.id,
          filename: processedImages.medium.filename,
          file_path: processedImages.medium.filePath,
          url: processedImages.medium.url,
          image_type: 'gallery',
          file_size: processedImages.medium.size,
          mime_type: 'image/webp',
          alt_text: `Migrated image ${index + 1} for ${recipe.title}`,
          width: processedImages.medium.width,
          height: processedImages.medium.height
        };
        
        await client.query(
          `INSERT INTO recipe_images (
            recipe_id, filename, file_path, url, image_type, 
            file_size, mime_type, alt_text, width, height
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            imageData.recipe_id,
            imageData.filename,
            imageData.file_path,
            imageData.url,
            imageData.image_type,
            imageData.file_size,
            imageData.mime_type,
            imageData.alt_text,
            imageData.width,
            imageData.height
          ]
        );
      }
      
      console.log(`   ✅ Processed image ${index + 1}: ${processedImages.medium.filename} (${(processedImages.medium.size / 1024).toFixed(1)}KB)`);
      
    } catch (error) {
      console.error(`   ❌ Failed to process base64 image ${index}:`, error.message);
      throw error;
    }
  }

  generateFilename(recipeId, index) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('hex');
    return `migrated_${recipeId}_${index}_${timestamp}_${randomString}.jpg`;
  }

  async cleanup() {
    await this.pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Main execution
async function main() {
  const migrator = new ImageMigrator();
  
  try {
    const initialized = await migrator.init();
    if (!initialized) {
      process.exit(1);
    }
    
    await migrator.migrateImages();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrator.cleanup();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️  Migration interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Migration terminated');
  process.exit(0);
});

// Run migration
if (require.main === module) {
  main();
}

module.exports = ImageMigrator;
