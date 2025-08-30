-- Add additional_sections column to recipes table
-- This column will store sections with both ingredients and directions
-- Format: { "section_name": { "ingredients": ["ingredient1", "ingredient2"], "directions": ["step1", "step2"] } }

ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS additional_sections JSONB DEFAULT '{}';

-- Add index for better performance on additional_sections queries
CREATE INDEX IF NOT EXISTS idx_recipes_additional_sections ON recipes USING gin(additional_sections);

-- Add comment to document the new column
COMMENT ON COLUMN recipes.additional_sections IS 'JSON object containing additional recipe sections with ingredients and directions. Format: {"section_name": {"ingredients": ["..."], "directions": ["..."]}}';

