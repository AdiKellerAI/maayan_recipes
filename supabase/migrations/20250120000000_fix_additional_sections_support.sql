-- Fix get_recipe_details function to include additional_sections field
-- This ensures that the new additional_sections field is returned when fetching recipe details

-- Drop and recreate the function to include additional_sections
DROP FUNCTION IF EXISTS get_recipe_details(UUID);

CREATE OR REPLACE FUNCTION get_recipe_details(recipe_id UUID)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    ingredients JSONB,
    directions JSONB,
    additional_instructions JSONB,
    additional_sections JSONB,
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
        r.additional_sections,
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

-- Add comment for documentation
COMMENT ON FUNCTION get_recipe_details IS 'Get full recipe details including additional_sections for detail view';
