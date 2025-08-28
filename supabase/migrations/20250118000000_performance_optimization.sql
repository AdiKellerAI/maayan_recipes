-- Performance optimization migration
-- This migration adds indexes and optimizations for better query performance

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_recipes_category_created_at ON recipes(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_favorite_created_at ON recipes(is_favorite, created_at DESC) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_recipes_created_at_desc ON recipes(created_at DESC);

-- Add GIN index for full-text search on title and ingredients
CREATE INDEX IF NOT EXISTS idx_recipes_search_title ON recipes USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_recipes_search_ingredients ON recipes USING gin(to_tsvector('english', ingredients::text));

-- Add index for difficulty filtering
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty) WHERE difficulty IS NOT NULL AND difficulty != '';

-- Add partial index for recipes with images
CREATE INDEX IF NOT EXISTS idx_recipes_with_images ON recipes(created_at DESC) WHERE jsonb_array_length(images) > 0;

-- Add partial index for recipes without images
CREATE INDEX IF NOT EXISTS idx_recipes_without_images ON recipes(created_at DESC) WHERE jsonb_array_length(images) = 0 OR images IS NULL;

-- Create a materialized view for recipe summaries (for list views)
CREATE MATERIALIZED VIEW IF NOT EXISTS recipe_summaries AS
SELECT 
    id,
    title,
    category,
    difficulty,
    prep_time,
    is_favorite,
    created_at,
    updated_at,
    CASE 
        WHEN jsonb_array_length(images) > 0 THEN images->0
        ELSE NULL 
    END as first_image,
    jsonb_array_length(COALESCE(images, '[]'::jsonb)) as image_count,
    jsonb_array_length(ingredients) as ingredient_count,
    jsonb_array_length(directions) as step_count
FROM recipes
ORDER BY created_at DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_summaries_id ON recipe_summaries(id);
CREATE INDEX IF NOT EXISTS idx_recipe_summaries_category ON recipe_summaries(category);
CREATE INDEX IF NOT EXISTS idx_recipe_summaries_favorite ON recipe_summaries(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_recipe_summaries_created_at ON recipe_summaries(created_at DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_recipe_summaries()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY recipe_summaries;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh materialized view on recipe changes
DROP TRIGGER IF EXISTS trigger_refresh_recipe_summaries ON recipes;
CREATE TRIGGER trigger_refresh_recipe_summaries
    AFTER INSERT OR UPDATE OR DELETE ON recipes
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_recipe_summaries();

-- Add function for paginated recipe queries
CREATE OR REPLACE FUNCTION get_recipes_paginated(
    p_limit INTEGER DEFAULT 12,
    p_offset INTEGER DEFAULT 0,
    p_category VARCHAR DEFAULT NULL,
    p_favorites_only BOOLEAN DEFAULT FALSE,
    p_search_query TEXT DEFAULT NULL,
    p_difficulty VARCHAR DEFAULT NULL,
    p_has_images BOOLEAN DEFAULT NULL,
    p_sort_by VARCHAR DEFAULT 'created_at_desc'
)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    category VARCHAR,
    difficulty VARCHAR,
    prep_time VARCHAR,
    is_favorite BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    first_image JSONB,
    image_count BIGINT,
    ingredient_count BIGINT,
    step_count BIGINT,
    total_count BIGINT
) AS $$
DECLARE
    base_query TEXT;
    where_conditions TEXT[] := ARRAY[]::TEXT[];
    order_clause TEXT;
    total_recipes BIGINT;
BEGIN
    -- Build WHERE conditions
    IF p_category IS NOT NULL THEN
        where_conditions := array_append(where_conditions, format('category = %L', p_category));
    END IF;
    
    IF p_favorites_only THEN
        where_conditions := array_append(where_conditions, 'is_favorite = true');
    END IF;
    
    IF p_search_query IS NOT NULL AND p_search_query != '' THEN
        where_conditions := array_append(where_conditions, 
            format('(title ILIKE %L OR to_tsvector(''english'', title) @@ plainto_tsquery(''english'', %L))', 
                   '%' || p_search_query || '%', p_search_query));
    END IF;
    
    IF p_difficulty IS NOT NULL AND p_difficulty != '' THEN
        where_conditions := array_append(where_conditions, format('difficulty = %L', p_difficulty));
    END IF;
    
    IF p_has_images IS NOT NULL THEN
        IF p_has_images THEN
            where_conditions := array_append(where_conditions, 'image_count > 0');
        ELSE
            where_conditions := array_append(where_conditions, '(image_count = 0 OR image_count IS NULL)');
        END IF;
    END IF;
    
    -- Build ORDER BY clause
    CASE p_sort_by
        WHEN 'name_asc' THEN order_clause := 'ORDER BY title ASC';
        WHEN 'name_desc' THEN order_clause := 'ORDER BY title DESC';
        WHEN 'created_at_asc' THEN order_clause := 'ORDER BY created_at ASC';
        ELSE order_clause := 'ORDER BY created_at DESC';
    END CASE;
    
    -- Get total count for pagination
    base_query := 'SELECT COUNT(*) FROM recipe_summaries';
    IF array_length(where_conditions, 1) > 0 THEN
        base_query := base_query || ' WHERE ' || array_to_string(where_conditions, ' AND ');
    END IF;
    
    EXECUTE base_query INTO total_recipes;
    
    -- Build main query
    base_query := 'SELECT *, ' || total_recipes || '::bigint as total_count FROM recipe_summaries';
    IF array_length(where_conditions, 1) > 0 THEN
        base_query := base_query || ' WHERE ' || array_to_string(where_conditions, ' AND ');
    END IF;
    base_query := base_query || ' ' || order_clause || format(' LIMIT %s OFFSET %s', p_limit, p_offset);
    
    RETURN QUERY EXECUTE base_query;
END;
$$ LANGUAGE plpgsql;

-- Function to get full recipe details (for detail view)
CREATE OR REPLACE FUNCTION get_recipe_details(recipe_id UUID)
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
    updated_at TIMESTAMP
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
        r.updated_at
    FROM recipes r
    WHERE r.id = recipe_id;
END;
$$ LANGUAGE plpgsql;

-- Create statistics for query planner optimization
ANALYZE recipes;

-- Refresh the materialized view initially
REFRESH MATERIALIZED VIEW recipe_summaries;

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW recipe_summaries IS 'Optimized view for recipe list displays with minimal data';
COMMENT ON FUNCTION get_recipes_paginated IS 'Paginated recipe query with filtering and sorting support';
COMMENT ON FUNCTION get_recipe_details IS 'Get full recipe details for detail view';
