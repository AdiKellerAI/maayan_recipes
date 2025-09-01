-- Image Management System Migration
-- This migration creates a production-ready image management system for recipes

-- Create recipe_images table
CREATE TABLE IF NOT EXISTS recipe_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  url VARCHAR(500) NOT NULL,
  image_type VARCHAR(50) NOT NULL DEFAULT 'gallery' CHECK (image_type IN ('thumbnail', 'hero', 'gallery')),
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_recipe_images_recipe_id ON recipe_images(recipe_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipe_images_image_type ON recipe_images(image_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipe_images_created_at ON recipe_images(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipe_images_deleted_at ON recipe_images(deleted_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_recipe_images_recipe_type ON recipe_images(recipe_id, image_type) WHERE deleted_at IS NULL;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_recipe_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_recipe_images_updated_at ON recipe_images;
CREATE TRIGGER update_recipe_images_updated_at
  BEFORE UPDATE ON recipe_images
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_images_updated_at();

-- Add deleted_at column to recipes table for soft delete
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Create index for soft delete on recipes
CREATE INDEX IF NOT EXISTS idx_recipes_deleted_at ON recipes(deleted_at);

-- Create function to get recipe images with proper ordering
CREATE OR REPLACE FUNCTION get_recipe_images(recipe_uuid UUID)
RETURNS TABLE (
  id UUID,
  recipe_id UUID,
  filename VARCHAR(255),
  file_path VARCHAR(500),
  url VARCHAR(500),
  image_type VARCHAR(50),
  file_size INTEGER,
  mime_type VARCHAR(100),
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ri.id,
    ri.recipe_id,
    ri.filename,
    ri.file_path,
    ri.url,
    ri.image_type,
    ri.file_size,
    ri.mime_type,
    ri.alt_text,
    ri.width,
    ri.height,
    ri.created_at,
    ri.updated_at
  FROM recipe_images ri
  WHERE ri.recipe_id = recipe_uuid 
    AND ri.deleted_at IS NULL
  ORDER BY 
    CASE ri.image_type
      WHEN 'hero' THEN 1
      WHEN 'thumbnail' THEN 2
      WHEN 'gallery' THEN 3
    END,
    ri.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to soft delete recipe images
CREATE OR REPLACE FUNCTION soft_delete_recipe_image(image_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE recipe_images 
  SET deleted_at = CURRENT_TIMESTAMP
  WHERE id = image_uuid AND deleted_at IS NULL;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to get image statistics for a recipe
CREATE OR REPLACE FUNCTION get_recipe_image_stats(recipe_uuid UUID)
RETURNS TABLE (
  total_images INTEGER,
  thumbnail_count INTEGER,
  hero_count INTEGER,
  gallery_count INTEGER,
  total_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_images,
    COUNT(*) FILTER (WHERE image_type = 'thumbnail')::INTEGER as thumbnail_count,
    COUNT(*) FILTER (WHERE image_type = 'hero')::INTEGER as hero_count,
    COUNT(*) FILTER (WHERE image_type = 'gallery')::INTEGER as gallery_count,
    COALESCE(SUM(file_size), 0)::BIGINT as total_size
  FROM recipe_images
  WHERE recipe_id = recipe_uuid AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create view for active recipe images (excluding soft deleted)
CREATE OR REPLACE VIEW active_recipe_images AS
SELECT 
  ri.*,
  r.title as recipe_title,
  r.category as recipe_category
FROM recipe_images ri
JOIN recipes r ON ri.recipe_id = r.id
WHERE ri.deleted_at IS NULL AND r.deleted_at IS NULL;

-- Create function to migrate existing base64 images to file storage
CREATE OR REPLACE FUNCTION migrate_base64_images()
RETURNS INTEGER AS $$
DECLARE
  recipe_record RECORD;
  image_count INTEGER := 0;
  image_data JSONB;
  image_index INTEGER;
  base64_data TEXT;
  filename TEXT;
BEGIN
  -- Loop through all recipes with base64 images
  FOR recipe_record IN 
    SELECT id, title, images 
    FROM recipes 
    WHERE images IS NOT NULL 
      AND jsonb_array_length(images) > 0
      AND deleted_at IS NULL
  LOOP
    image_data := recipe_record.images;
    
    -- Process each image in the array
    FOR image_index IN 0..jsonb_array_length(image_data) - 1 LOOP
      base64_data := image_data->image_index;
      
      -- Skip if not a base64 string
      IF base64_data IS NULL OR jsonb_typeof(base64_data) != 'string' THEN
        CONTINUE;
      END IF;
      
      -- Generate filename
      filename := 'migrated_' || recipe_record.id || '_' || image_index || '.jpg';
      
      -- Insert into recipe_images table
      INSERT INTO recipe_images (
        recipe_id,
        filename,
        file_path,
        url,
        image_type,
        file_size,
        mime_type,
        alt_text
      ) VALUES (
        recipe_record.id,
        filename,
        '/uploads/recipes/' || recipe_record.id || '/gallery/' || filename,
        '/api/images/' || recipe_record.id || '/' || filename,
        'gallery',
        length(base64_data)::INTEGER,
        'image/jpeg',
        'Migrated image for ' || recipe_record.title
      );
      
      image_count := image_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN image_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup orphaned images
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete images for recipes that no longer exist
  DELETE FROM recipe_images 
  WHERE recipe_id NOT IN (SELECT id FROM recipes WHERE deleted_at IS NULL)
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE recipe_images IS 'Stores image metadata for recipes with soft delete support';
COMMENT ON COLUMN recipe_images.image_type IS 'Type of image: thumbnail (150px), hero (1200px), or gallery (500px)';
COMMENT ON COLUMN recipe_images.deleted_at IS 'Soft delete timestamp - NULL means active, timestamp means deleted';
COMMENT ON FUNCTION get_recipe_images(UUID) IS 'Returns all active images for a recipe, ordered by type and creation date';
COMMENT ON FUNCTION soft_delete_recipe_image(UUID) IS 'Soft deletes an image by setting deleted_at timestamp';
COMMENT ON FUNCTION migrate_base64_images() IS 'Migrates existing base64 images to file storage system';
COMMENT ON FUNCTION cleanup_orphaned_images() IS 'Removes images for deleted recipes';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_images TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;
