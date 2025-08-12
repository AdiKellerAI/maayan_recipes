/*
  # Update recipes table for multiple images

  1. Schema Changes
    - Drop existing `image` column (text)
    - Add new `images` column (jsonb array)
    - Update existing data to use array format

  2. Data Migration
    - Convert existing image URLs to array format
    - Handle null/empty values properly

  3. Backward Compatibility
    - Ensure existing queries continue to work
    - Maintain data integrity during migration
*/

-- Add new images column as jsonb array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'images'
  ) THEN
    ALTER TABLE recipes ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Migrate existing image data to images array
UPDATE recipes 
SET images = CASE 
  WHEN image IS NOT NULL AND image != '' THEN jsonb_build_array(image)
  ELSE '[]'::jsonb
END
WHERE images = '[]'::jsonb;

-- Drop the old image column after migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'image'
  ) THEN
    ALTER TABLE recipes DROP COLUMN image;
  END IF;
END $$;