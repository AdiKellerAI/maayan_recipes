const { Pool } = require('pg');

const pool = new Pool({
  host: '34.132.167.99',
  port: 5432,
  database: 'recipes',
  user: 'postgres',
  password: 'MaayanRecipes2025',
  ssl: { rejectUnauthorized: false }
});

async function fixDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking current table structure...');
    
    // Check current columns
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'recipes' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if additional_sections column exists
    const hasAdditionalSections = columns.rows.some(col => col.column_name === 'additional_sections');
    
    if (!hasAdditionalSections) {
      console.log('🔧 Adding additional_sections column...');
      await client.query(`
        ALTER TABLE recipes 
        ADD COLUMN additional_sections JSONB DEFAULT '{}'::jsonb
      `);
      console.log('✅ additional_sections column added successfully');
    } else {
      console.log('✅ additional_sections column already exists');
    }
    
    // Also update the get_recipe_details function
    console.log('🔧 Updating get_recipe_details function...');
    await client.query(`
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
    `);
    console.log('✅ get_recipe_details function updated successfully');
    
    // Verify the column was added
    const updatedColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'recipes' AND column_name = 'additional_sections'
    `);
    
    if (updatedColumns.rows.length > 0) {
      console.log('🎉 Verification successful: additional_sections column exists');
    } else {
      console.log('❌ Verification failed: additional_sections column still missing');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

fixDatabase();
