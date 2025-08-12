import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Helper function to map database row to Recipe type
const mapRowToRecipe = (row) => ({
  id: row.id.toString(),
  title: row.title,
  description: row.description || '',
  images: Array.isArray(row.images) ? row.images : (row.images ? JSON.parse(row.images) : []),
  category: row.category,
  ingredients: Array.isArray(row.ingredients) ? row.ingredients : JSON.parse(row.ingredients || '[]'),
  directions: Array.isArray(row.directions) ? row.directions : JSON.parse(row.directions || '[]'),
  additional_instructions: row.additional_instructions ? 
    (typeof row.additional_instructions === 'object' ? row.additional_instructions : JSON.parse(row.additional_instructions)) : {},
  prep_time: row.prep_time || '',
  difficulty: row.difficulty || '',
  is_favorite: Boolean(row.is_favorite),
  created_at: row.created_at,
  updated_at: row.updated_at
});

// Ensure recipes table exists
const ensureRecipesTable = async (client) => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        category VARCHAR(100) NOT NULL,
        ingredients JSONB NOT NULL DEFAULT '[]',
        directions JSONB NOT NULL DEFAULT '[]',
        additional_instructions JSONB DEFAULT '{}',
        prep_time VARCHAR(50) DEFAULT '',
        difficulty VARCHAR(50) DEFAULT '',
        is_favorite BOOLEAN DEFAULT false,
        images JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create trigger for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
      CREATE TRIGGER update_recipes_updated_at
        BEFORE UPDATE ON recipes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Recipes table ensured');
  } catch (error) {
    console.error('❌ Error ensuring recipes table:', error.message);
    throw error;
  }
};

// API Handlers
export const handlers = {
  // Test connection
  async testConnection() {
    try {
      console.log('🔌 Testing PostgreSQL connection...');
      const client = await pool.connect();
      
      // Test basic query
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      console.log('✅ PostgreSQL connection successful!');
      
      // Ensure table exists
      await ensureRecipesTable(client);
      
      client.release();
      
      return {
        success: true,
        connected: true,
        message: 'PostgreSQL connection successful',
        timestamp: new Date().toISOString(),
        server_time: result.rows[0].current_time,
        pg_version: result.rows[0].pg_version.split(' ')[0]
      };
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      return {
        success: false,
        connected: false,
        message: 'PostgreSQL connection failed',
        error: error.message
      };
    }
  },

  // Get all recipes
  async getAllRecipes() {
    try {
      console.log('📊 Fetching all recipes from PostgreSQL...');
      const client = await pool.connect();
      
      // Ensure table exists
      await ensureRecipesTable(client);
      
      const result = await client.query('SELECT * FROM recipes ORDER BY created_at DESC');
      const recipes = result.rows.map(mapRowToRecipe);
      console.log(`✅ Retrieved ${recipes.length} recipes`);
      
      client.release();
      return recipes;
    } catch (error) {
      console.error('❌ Error fetching recipes:', error);
      throw new Error(`Failed to fetch recipes: ${error.message}`);
    }
  },

  // Get recipe by ID
  async getRecipeById(id) {
    try {
      console.log('📊 Fetching recipe by ID:', id);
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
      client.release();
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const recipe = mapRowToRecipe(result.rows[0]);
      console.log('✅ Retrieved recipe:', recipe.title);
      return recipe;
    } catch (error) {
      console.error('❌ Error fetching recipe:', error);
      throw new Error(`Failed to fetch recipe: ${error.message}`);
    }
  },

  // Add new recipe
  async addRecipe(recipeData) {
    try {
      const {
        title,
        description = '',
        category,
        ingredients,
        directions,
        additional_instructions = {},
        prep_time = '',
        difficulty = '',
        is_favorite = false,
        images = []
      } = recipeData;
      
      console.log('➕ Adding new recipe:', title);
      
      // Validate required fields
      if (!title || !category || !ingredients || !directions) {
        throw new Error('Missing required fields: title, category, ingredients, and directions are required');
      }
      
      const client = await pool.connect();
      
      // Ensure table exists
      await ensureRecipesTable(client);
      
      const result = await client.query(
        `INSERT INTO recipes (
          title, description, category, ingredients, directions, 
          additional_instructions, prep_time, difficulty, is_favorite, images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`,
        [
          title,
          description,
          category,
          JSON.stringify(ingredients),
          JSON.stringify(directions),
          JSON.stringify(additional_instructions),
          prep_time,
          difficulty,
          is_favorite,
          JSON.stringify(images)
        ]
      );
      
      const recipe = mapRowToRecipe(result.rows[0]);
      console.log('✅ Recipe added with ID:', recipe.id);
      
      client.release();
      return recipe;
    } catch (error) {
      console.error('❌ Error adding recipe:', error);
      throw new Error(`Failed to add recipe: ${error.message}`);
    }
  },

  // Update recipe
  async updateRecipe(id, updates) {
    try {
      console.log('🔄 Updating recipe:', id);
      
      const client = await pool.connect();
      
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramCount++}`);
        values.push(updates.title);
      }
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.category !== undefined) {
        updateFields.push(`category = $${paramCount++}`);
        values.push(updates.category);
      }
      if (updates.ingredients !== undefined) {
        updateFields.push(`ingredients = $${paramCount++}`);
        values.push(JSON.stringify(updates.ingredients));
      }
      if (updates.directions !== undefined) {
        updateFields.push(`directions = $${paramCount++}`);
        values.push(JSON.stringify(updates.directions));
      }
      if (updates.additional_instructions !== undefined) {
        updateFields.push(`additional_instructions = $${paramCount++}`);
        values.push(JSON.stringify(updates.additional_instructions));
      }
      if (updates.prep_time !== undefined) {
        updateFields.push(`prep_time = $${paramCount++}`);
        values.push(updates.prep_time);
      }
      if (updates.difficulty !== undefined) {
        updateFields.push(`difficulty = $${paramCount++}`);
        values.push(updates.difficulty);
      }
      if (updates.is_favorite !== undefined) {
        updateFields.push(`is_favorite = $${paramCount++}`);
        values.push(updates.is_favorite);
      }
      if (updates.images !== undefined) {
        updateFields.push(`images = $${paramCount++}`);
        values.push(JSON.stringify(updates.images));
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      // Always update updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      
      const query = `
        UPDATE recipes 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCount} 
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        client.release();
        return null;
      }
      
      const recipe = mapRowToRecipe(result.rows[0]);
      console.log('✅ Recipe updated:', id);
      
      client.release();
      return recipe;
    } catch (error) {
      console.error('❌ Error updating recipe:', error);
      throw new Error(`Failed to update recipe: ${error.message}`);
    }
  },

  // Delete recipe
  async deleteRecipe(id) {
    try {
      console.log('🗑️ Deleting recipe:', id);
      const client = await pool.connect();
      const result = await client.query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);
      client.release();
      
      if (result.rows.length === 0) {
        return null;
      }
      
      console.log('✅ Recipe deleted:', id);
      return { message: 'Recipe deleted successfully', id: result.rows[0].id };
    } catch (error) {
      console.error('❌ Error deleting recipe:', error);
      throw new Error(`Failed to delete recipe: ${error.message}`);
    }
  }
};