import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

// PostgreSQL connection
const pool = new Pool({
  connectionString: 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Ensure recipes table exists
const ensureRecipesTable = async (client) => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        category VARCHAR(100) NOT NULL,
        ingredients JSONB NOT NULL DEFAULT '[]',
        directions JSONB NOT NULL DEFAULT '[]',
        additional_instructions JSONB DEFAULT '{}',
        prep_time VARCHAR(50) DEFAULT '',
        difficulty VARCHAR(50) DEFAULT '',
        is_favorite BOOLEAN DEFAULT false,
        current_step INTEGER DEFAULT 0,
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

// API Routes

// Test database connection
app.get('/api/test-connection', async (req, res) => {
  try {
    console.log('🔌 Testing PostgreSQL connection...');
    const client = await pool.connect();
    
    // Test basic query
    const timeResult = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ PostgreSQL connection successful!');
    
    // Ensure table exists
    await ensureRecipesTable(client);
    
    client.release();
    
    res.json({
      success: true,
      connected: true,
      message: 'PostgreSQL connection successful',
      timestamp: new Date().toISOString(),
      server_time: timeResult.rows[0].current_time,
      pg_version: timeResult.rows[0].pg_version.split(' ')[0]
    });
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    res.status(500).json({
      success: false,
      connected: false,
      message: 'PostgreSQL connection failed',
      error: error.message
    });
  }
});

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    console.log('📊 Fetching all recipes from PostgreSQL...');
    const client = await pool.connect();
    
    // Ensure table exists
    await ensureRecipesTable(client);
    
    const queryResult = await client.query('SELECT * FROM recipes ORDER BY created_at DESC');
    const recipes = queryResult.rows.map(mapRowToRecipe);
    console.log(`✅ Retrieved ${recipes.length} recipes`);
    
    client.release();
    res.json(recipes);
  } catch (error) {
    console.error('❌ Error fetching recipes:', error);
    res.status(500).json({ error: `Failed to fetch recipes: ${error.message}` });
  }
});

// Get recipe by ID
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📊 Fetching recipe by ID:', id);
    
    const client = await pool.connect();
    const queryResult = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
    client.release();
    
    if (queryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const recipe = mapRowToRecipe(queryResult.rows[0]);
    console.log('✅ Retrieved recipe:', recipe.title);
    res.json(recipe);
  } catch (error) {
    console.error('❌ Error fetching recipe:', error);
    res.status(500).json({ error: `Failed to fetch recipe: ${error.message}` });
  }
});

// Create new recipe
app.post('/api/recipes', async (req, res) => {
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
      current_step = 0,
      images = []
    } = req.body;
    
    console.log('➕ Adding new recipe:', title);
    
    // Validate required fields
    if (!title || !category || !ingredients || !directions) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, category, ingredients, and directions are required' 
      });
    }
    
    const client = await pool.connect();
    
    // Ensure table exists
    await ensureRecipesTable(client);
    
    const queryResult = await client.query(
      `INSERT INTO recipes (
        title, description, category, ingredients, directions, 
        additional_instructions, prep_time, difficulty, is_favorite, current_step, images
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
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
        current_step,
        JSON.stringify(images)
      ]
    );
    
    const recipe = mapRowToRecipe(queryResult.rows[0]);
    console.log('✅ Recipe added with ID:', recipe.id);
    
    client.release();
    res.status(201).json(recipe);
  } catch (error) {
    console.error('❌ Error adding recipe:', error);
    res.status(500).json({ error: `Failed to add recipe: ${error.message}` });
  }
});

// Update recipe
app.put('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
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
    if (updates.current_step !== undefined) {
      updateFields.push(`current_step = $${paramCount++}`);
      values.push(updates.current_step);
    }
    if (updates.images !== undefined) {
      updateFields.push(`images = $${paramCount++}`);
      values.push(JSON.stringify(updates.images));
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
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
    
    const queryResult = await client.query(query, values);
    
    if (queryResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const recipe = mapRowToRecipe(queryResult.rows[0]);
    console.log('✅ Recipe updated:', id);
    
    client.release();
    res.json(recipe);
  } catch (error) {
    console.error('❌ Error updating recipe:', error);
    res.status(500).json({ error: `Failed to update recipe: ${error.message}` });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting recipe:', id);
    
    const client = await pool.connect();
    const queryResult = await client.query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);
    client.release();
    
    if (queryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    console.log('✅ Recipe deleted:', id);
    res.json({ message: 'Recipe deleted successfully', id: queryResult.rows[0].id });
  } catch (error) {
    console.error('❌ Error deleting recipe:', error);
    res.status(500).json({ error: `Failed to delete recipe: ${error.message}` });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Maayan Recipes Backend'
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: error.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🔗 API available at http://localhost:${PORT}/api`);
  console.log(`🔗 Test connection: http://localhost:${PORT}/api/test-connection`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
