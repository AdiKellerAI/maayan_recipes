-- Performance optimization migration
-- Add additional indexes for better query performance

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_recipes_category_created_at ON recipes(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_favorite_created_at ON recipes(is_favorite, created_at DESC) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_recipes_category_favorite ON recipes(category, is_favorite) WHERE is_favorite = true;

-- Create partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_recipes_recent ON recipes(created_at DESC) WHERE created_at > (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- Create GIN index for full-text search on title and ingredients
CREATE INDEX IF NOT EXISTS idx_recipes_search_title ON recipes USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_recipes_search_ingredients ON recipes USING gin(to_tsvector('english', ingredients::text));

-- Create index for difficulty filtering
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty) WHERE difficulty IS NOT NULL;

-- Add statistics for better query planning
ANALYZE recipes;

-- Create a function to get recipe count by category (for dashboard)
CREATE OR REPLACE FUNCTION get_recipe_count_by_category()
RETURNS TABLE(category_name VARCHAR, recipe_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.category,
    COUNT(*) as recipe_count
  FROM recipes r
  GROUP BY r.category
  ORDER BY recipe_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function for optimized category preview (5 recipes per category)
CREATE OR REPLACE FUNCTION get_category_preview()
RETURNS TABLE(
  id UUID,
  title VARCHAR,
  category VARCHAR,
  difficulty VARCHAR,
  is_favorite BOOLEAN,
  images JSONB,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_recipes AS (
    SELECT 
      r.id,
      r.title,
      r.category,
      r.difficulty,
      r.is_favorite,
      r.images,
      r.created_at,
      ROW_NUMBER() OVER (PARTITION BY r.category ORDER BY r.created_at DESC) as rn
    FROM recipes r
  )
  SELECT 
    rr.id,
    rr.title,
    rr.category,
    rr.difficulty,
    rr.is_favorite,
    rr.images,
    rr.created_at
  FROM ranked_recipes rr
  WHERE rr.rn <= 5
  ORDER BY rr.category, rr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function for paginated recipe fetching
CREATE OR REPLACE FUNCTION get_recipes_paginated(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_category VARCHAR DEFAULT NULL,
  p_favorites_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  title VARCHAR,
  description TEXT,
  category VARCHAR,
  ingredients JSONB,
  directions JSONB,
  additional_instructions JSONB,
  prep_time VARCHAR,
  difficulty VARCHAR,
  is_favorite BOOLEAN,
  current_step INTEGER,
  images JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.category,
    r.ingredients,
    r.directions,
    r.additional_instructions,
    r.prep_time,
    r.difficulty,
    r.is_favorite,
    r.current_step,
    r.images,
    r.created_at,
    r.updated_at,
    COUNT(*) OVER() as total_count
  FROM recipes r
  WHERE 
    (p_category IS NULL OR r.category = p_category) AND
    (p_favorites_only = FALSE OR r.is_favorite = TRUE)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create indexes on the new functions for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_category_count ON recipes(category);

-- Update table statistics
ANALYZE recipes;
