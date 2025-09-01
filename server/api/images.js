const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../database');
const ImageProcessor = require('../utils/imageProcessor');

const router = express.Router();

// Initialize image processor
const imageProcessor = new ImageProcessor({
  uploadDir: 'uploads',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    if (!imageProcessor.allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
    cb(null, true);
  }
});

/**
 * POST /api/recipes/:id/images
 * Upload new images for a recipe
 */
router.post('/recipes/:id/images', upload.array('images', 10), async (req, res) => {
  const { id: recipeId } = req.params;
  const { imageType = 'gallery', altText } = req.body;
  
  try {
    console.log(`📸 API: Uploading images for recipe ${recipeId}`);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No images provided',
        message: 'Please select at least one image to upload'
      });
    }

    // Verify recipe exists
    const client = await pool.connect();
    const recipeCheck = await client.query(
      'SELECT id, title FROM recipes WHERE id = $1 AND deleted_at IS NULL',
      [recipeId]
    );
    
    if (recipeCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ 
        error: 'Recipe not found',
        message: 'The specified recipe does not exist'
      });
    }

    const uploadedImages = [];
    const errors = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        console.log(`🔄 Processing image: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        // Process image
        const result = await imageProcessor.uploadRecipeImage(file, recipeId, imageType);
        
        if (!result.success) {
          errors.push({
            filename: file.originalname,
            error: result.error
          });
          continue;
        }

        // Save image metadata to database
        const imageData = {
          recipe_id: recipeId,
          filename: result.images.medium.filename,
          file_path: result.images.medium.filePath,
          url: result.images.medium.url,
          image_type: imageType,
          file_size: result.images.medium.size,
          mime_type: result.images.medium.mimeType,
          alt_text: altText || `Image for ${recipeCheck.rows[0].title}`,
          width: result.images.medium.width,
          height: result.images.medium.height
        };

        const insertResult = await client.query(
          `INSERT INTO recipe_images (
            recipe_id, filename, file_path, url, image_type, 
            file_size, mime_type, alt_text, width, height
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
          RETURNING *`,
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

        const savedImage = insertResult.rows[0];
        uploadedImages.push({
          id: savedImage.id,
          filename: savedImage.filename,
          url: savedImage.url,
          image_type: savedImage.image_type,
          file_size: savedImage.file_size,
          alt_text: savedImage.alt_text,
          width: savedImage.width,
          height: savedImage.height,
          created_at: savedImage.created_at
        });

        console.log(`✅ Image uploaded successfully: ${savedImage.filename}`);

      } catch (error) {
        console.error(`❌ Error processing image ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    client.release();

    // Return response
    const response = {
      success: uploadedImages.length > 0,
      uploaded_count: uploadedImages.length,
      total_files: req.files.length,
      images: uploadedImages
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.partial_success = uploadedImages.length > 0;
    }

    if (uploadedImages.length > 0) {
      console.log(`✅ API: Successfully uploaded ${uploadedImages.length}/${req.files.length} images for recipe ${recipeId}`);
      res.status(201).json(response);
    } else {
      console.log(`❌ API: Failed to upload any images for recipe ${recipeId}`);
      res.status(400).json(response);
    }

  } catch (error) {
    console.error('❌ API: Error uploading images:', error);
    res.status(500).json({ 
      error: 'Failed to upload images',
      message: error.message 
    });
  }
});

/**
 * GET /api/recipes/:id/images
 * Get all images for a recipe
 */
router.get('/recipes/:id/images', async (req, res) => {
  const { id: recipeId } = req.params;
  const { size = 'medium', include_deleted = false } = req.query;
  
  try {
    console.log(`📸 API: Fetching images for recipe ${recipeId} (size: ${size})`);
    
    const client = await pool.connect();
    
    let query = `
      SELECT * FROM get_recipe_images($1)
    `;
    
    if (include_deleted === 'true') {
      query = `
        SELECT * FROM recipe_images 
        WHERE recipe_id = $1 
        ORDER BY 
          CASE image_type
            WHEN 'hero' THEN 1
            WHEN 'thumbnail' THEN 2
            WHEN 'gallery' THEN 3
          END,
          created_at ASC
      `;
    }
    
    const result = await client.query(query, [recipeId]);
    client.release();
    
    const images = result.rows.map(row => ({
      id: row.id,
      recipe_id: row.recipe_id,
      filename: row.filename,
      file_path: row.file_path,
      url: row.url,
      image_type: row.image_type,
      file_size: row.file_size,
      mime_type: row.mime_type,
      alt_text: row.alt_text,
      width: row.width,
      height: row.height,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    console.log(`✅ API: Retrieved ${images.length} images for recipe ${recipeId}`);
    res.json({
      recipe_id: recipeId,
      total_images: images.length,
      images
    });
    
  } catch (error) {
    console.error('❌ API: Error fetching recipe images:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recipe images',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/recipes/:id/images/:imageId
 * Delete a specific image
 */
router.delete('/recipes/:id/images/:imageId', async (req, res) => {
  const { id: recipeId, imageId } = req.params;
  
  try {
    console.log(`🗑️ API: Deleting image ${imageId} from recipe ${recipeId}`);
    
    const client = await pool.connect();
    
    // Get image details before deletion
    const imageResult = await client.query(
      'SELECT * FROM recipe_images WHERE id = $1 AND recipe_id = $2 AND deleted_at IS NULL',
      [imageId, recipeId]
    );
    
    if (imageResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ 
        error: 'Image not found',
        message: 'The specified image does not exist or has already been deleted'
      });
    }
    
    const image = imageResult.rows[0];
    
    // Soft delete from database
    const deleteResult = await client.query(
      'SELECT soft_delete_recipe_image($1) as deleted',
      [imageId]
    );
    
    if (!deleteResult.rows[0].deleted) {
      client.release();
      return res.status(400).json({ 
        error: 'Failed to delete image',
        message: 'The image could not be deleted from the database'
      });
    }
    
    // Delete physical files
    const fileDeleteResult = await imageProcessor.deleteImageFiles(recipeId, image.filename);
    
    client.release();
    
    if (fileDeleteResult.success) {
      console.log(`✅ API: Successfully deleted image ${imageId} from recipe ${recipeId}`);
      res.json({ 
        success: true,
        message: 'Image deleted successfully',
        image_id: imageId
      });
    } else {
      console.warn(`⚠️ API: Image ${imageId} deleted from database but file cleanup failed:`, fileDeleteResult.error);
      res.json({ 
        success: true,
        message: 'Image deleted from database, but file cleanup encountered issues',
        image_id: imageId,
        warning: 'File cleanup failed'
      });
    }
    
  } catch (error) {
    console.error('❌ API: Error deleting image:', error);
    res.status(500).json({ 
      error: 'Failed to delete image',
      message: error.message 
    });
  }
});

/**
 * PUT /api/recipes/:id/images/:imageId
 * Update image metadata
 */
router.put('/recipes/:id/images/:imageId', async (req, res) => {
  const { id: recipeId, imageId } = req.params;
  const { alt_text, image_type } = req.body;
  
  try {
    console.log(`🔄 API: Updating image ${imageId} metadata for recipe ${recipeId}`);
    
    const client = await pool.connect();
    
    // Check if image exists
    const imageCheck = await client.query(
      'SELECT * FROM recipe_images WHERE id = $1 AND recipe_id = $2 AND deleted_at IS NULL',
      [imageId, recipeId]
    );
    
    if (imageCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ 
        error: 'Image not found',
        message: 'The specified image does not exist or has been deleted'
      });
    }
    
    // Build update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (alt_text !== undefined) {
      updateFields.push(`alt_text = $${paramCount++}`);
      values.push(alt_text);
    }
    
    if (image_type !== undefined) {
      if (!['thumbnail', 'hero', 'gallery'].includes(image_type)) {
        client.release();
        return res.status(400).json({ 
          error: 'Invalid image type',
          message: 'Image type must be one of: thumbnail, hero, gallery'
        });
      }
      updateFields.push(`image_type = $${paramCount++}`);
      values.push(image_type);
    }
    
    if (updateFields.length === 0) {
      client.release();
      return res.status(400).json({ 
        error: 'No updates provided',
        message: 'Please provide alt_text or image_type to update'
      });
    }
    
    // Add image ID to values
    values.push(imageId);
    
    const updateQuery = `
      UPDATE recipe_images 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND recipe_id = $${paramCount + 1}
      RETURNING *
    `;
    
    values.push(recipeId);
    
    const result = await client.query(updateQuery, values);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Image not found',
        message: 'The specified image could not be updated'
      });
    }
    
    const updatedImage = result.rows[0];
    
    console.log(`✅ API: Successfully updated image ${imageId} metadata`);
    res.json({
      success: true,
      message: 'Image metadata updated successfully',
      image: {
        id: updatedImage.id,
        filename: updatedImage.filename,
        url: updatedImage.url,
        image_type: updatedImage.image_type,
        alt_text: updatedImage.alt_text,
        updated_at: updatedImage.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ API: Error updating image metadata:', error);
    res.status(500).json({ 
      error: 'Failed to update image metadata',
      message: error.message 
    });
  }
});

/**
 * GET /api/images/:recipeId/:size/:filename
 * Serve image files
 */
router.get('/images/:recipeId/:size/:filename', async (req, res) => {
  const { recipeId, size, filename } = req.params;
  
  try {
    // Validate size parameter
    const validSizes = ['thumbnail', 'medium', 'large', 'original'];
    if (!validSizes.includes(size)) {
      return res.status(400).json({ 
        error: 'Invalid size parameter',
        message: 'Size must be one of: thumbnail, medium, large, original'
      });
    }
    
    // Construct file path
    const filePath = path.join('uploads', 'recipes', recipeId, size, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ 
        error: 'Image not found',
        message: 'The requested image file does not exist'
      });
    }
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.gif') contentType = 'image/gif';
    
    res.set({
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'ETag': `"${stats.mtime.getTime()}"`
    });
    
    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ API: Error serving image:', error);
    res.status(500).json({ 
      error: 'Failed to serve image',
      message: error.message 
    });
  }
});

/**
 * GET /api/images/stats
 * Get image storage statistics
 */
router.get('/images/stats', async (req, res) => {
  try {
    console.log('📊 API: Fetching image storage statistics');
    
    const client = await pool.connect();
    
    // Get database stats
    const dbStats = await client.query(`
      SELECT 
        COUNT(*) as total_images,
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_images,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_images,
        COUNT(DISTINCT recipe_id) as recipes_with_images,
        SUM(file_size) FILTER (WHERE deleted_at IS NULL) as total_size,
        AVG(file_size) FILTER (WHERE deleted_at IS NULL) as avg_file_size
      FROM recipe_images
    `);
    
    client.release();
    
    // Get file system stats
    const fsStats = await imageProcessor.getStorageStats();
    
    const stats = {
      database: {
        total_images: parseInt(dbStats.rows[0].total_images),
        active_images: parseInt(dbStats.rows[0].active_images),
        deleted_images: parseInt(dbStats.rows[0].deleted_images),
        recipes_with_images: parseInt(dbStats.rows[0].recipes_with_images),
        total_size_bytes: parseInt(dbStats.rows[0].total_size || 0),
        avg_file_size_bytes: parseInt(dbStats.rows[0].avg_file_size || 0)
      },
      filesystem: fsStats,
      summary: {
        total_size_human: imageProcessor.formatBytes(parseInt(dbStats.rows[0].total_size || 0)),
        avg_file_size_human: imageProcessor.formatBytes(parseInt(dbStats.rows[0].avg_file_size || 0))
      }
    };
    
    console.log('✅ API: Retrieved image storage statistics');
    res.json(stats);
    
  } catch (error) {
    console.error('❌ API: Error fetching image stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch image statistics',
      message: error.message 
    });
  }
});

/**
 * POST /api/images/migrate
 * Migrate existing base64 images to file storage
 */
router.post('/images/migrate', async (req, res) => {
  try {
    console.log('🔄 API: Starting base64 image migration');
    
    const client = await pool.connect();
    
    // Run migration function
    const result = await client.query('SELECT migrate_base64_images() as migrated_count');
    const migratedCount = parseInt(result.rows[0].migrated_count);
    
    client.release();
    
    console.log(`✅ API: Migration completed. ${migratedCount} images migrated`);
    res.json({
      success: true,
      message: 'Base64 image migration completed',
      migrated_count: migratedCount
    });
    
  } catch (error) {
    console.error('❌ API: Error during image migration:', error);
    res.status(500).json({ 
      error: 'Failed to migrate images',
      message: error.message 
    });
  }
});

/**
 * POST /api/images/cleanup
 * Clean up orphaned image files
 */
router.post('/images/cleanup', async (req, res) => {
  try {
    console.log('🧹 API: Starting orphaned file cleanup');
    
    const client = await pool.connect();
    
    // Get all active recipe IDs
    const recipeIds = await client.query(
      'SELECT id FROM recipes WHERE deleted_at IS NULL'
    );
    
    const activeRecipeIds = recipeIds.rows.map(row => row.id);
    client.release();
    
    // Clean up orphaned files
    const cleanupResult = await imageProcessor.cleanupOrphanedFiles(activeRecipeIds);
    
    if (cleanupResult.success) {
      console.log(`✅ API: Cleanup completed. ${cleanupResult.deletedCount} directories removed`);
      res.json({
        success: true,
        message: 'Orphaned file cleanup completed',
        deleted_directories: cleanupResult.deletedCount
      });
    } else {
      console.error('❌ API: Cleanup failed:', cleanupResult.error);
      res.status(500).json({
        error: 'Cleanup failed',
        message: cleanupResult.error
      });
    }
    
  } catch (error) {
    console.error('❌ API: Error during cleanup:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup orphaned files',
      message: error.message 
    });
  }
});

module.exports = router;
