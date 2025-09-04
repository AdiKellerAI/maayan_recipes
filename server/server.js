import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import image routes
import imageRoutes from './api/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
// Increase payload limit for image uploads (100MB limit for large compressed images)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(join(__dirname, '../dist')));

// Use image routes
app.use('/api', imageRoutes);

// PostgreSQL connection
const pool = new Pool({
  connectionString: 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Database connection status tracking
let isConnected = false;
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

// Test database connection with retry mechanism
const testDatabaseConnection = async () => {
  connectionAttempts++;
  try {
    console.log(`🔌 Attempting to connect to PostgreSQL (attempt ${connectionAttempts}/${maxConnectionAttempts})...`);
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    isConnected = true;
    connectionAttempts = 0; // Reset on successful connection
    console.log('✅ Connected to PostgreSQL database successfully');
    console.log('⏰ Database time:', result.rows[0].now);
    return true;
  } catch (error) {
    isConnected = false;
    console.error(`❌ PostgreSQL connection failed (attempt ${connectionAttempts}/${maxConnectionAttempts}):`, error.message);
    
    // Retry connection if not exceeded max attempts
    if (connectionAttempts < maxConnectionAttempts) {
      const retryDelay = Math.min(1000 * connectionAttempts, 5000); // Progressive delay
      console.log(`🔄 Retrying connection in ${retryDelay}ms...`);
      setTimeout(() => {
        testDatabaseConnection();
      }, retryDelay);
    } else {
      console.error('❌ Max connection attempts reached. Will retry on next API call.');
    }
    return false;
  }
};

// Initial connection test
testDatabaseConnection();

// Connection event handlers
pool.on('connect', (client) => {
  console.log('✅ New PostgreSQL client connected');
  isConnected = true;
  connectionAttempts = 0;
});

pool.on('error', (err, client) => {
  console.error('❌ PostgreSQL connection error:', err);
  isConnected = false;
  
  // Attempt to reconnect
  if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    console.log('🔄 Connection lost, attempting to reconnect...');
    setTimeout(() => {
      testDatabaseConnection();
    }, 2000);
  }
});

pool.on('remove', () => {
  console.log('🔌 PostgreSQL client disconnected');
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
  additional_sections: row.additional_sections ? 
    (typeof row.additional_sections === 'object' ? row.additional_sections : JSON.parse(row.additional_sections)) : {},
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
    
    // First check if we already know we're disconnected
    if (!isConnected && connectionAttempts >= maxConnectionAttempts) {
      console.log('🔄 Force retry connection after max attempts reached');
      connectionAttempts = 0; // Reset to allow retry
    }
    
    const client = await pool.connect();
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ PostgreSQL connection successful!');
    
    // Update connection status
    isConnected = true;
    connectionAttempts = 0;
    
    // Ensure table exists
    await ensureRecipesTable(client);
    
    // Test recipes table
    const recipeCountResult = await client.query('SELECT COUNT(*) as count FROM recipes');
    
    client.release();
    
    res.json({
      success: true,
      connected: true,
      message: 'Connected to PostgreSQL',
      timestamp: new Date().toISOString(),
      server_time: result.rows[0].current_time ? new Date(result.rows[0].current_time).toISOString() : new Date().toISOString(),
      pg_version: result.rows[0].pg_version ? result.rows[0].pg_version.split(' ')[0] : 'unknown',
      recipe_count: parseInt(recipeCountResult.rows[0].count),
      connection_attempts: connectionAttempts,
      connection_status: 'healthy'
    });
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    
    // Update connection status
    isConnected = false;
    
    // Trigger reconnection attempt if this was a manual test
    if (connectionAttempts < maxConnectionAttempts) {
      console.log('🔄 Triggering reconnection attempt...');
      setTimeout(() => {
        testDatabaseConnection();
      }, 1000);
    }
    
    res.status(500).json({
      success: false,
      connected: false,
      message: 'PostgreSQL connection failed',
      error: error.message || 'Unknown error',
      error_code: error.code,
      timestamp: new Date().toISOString(),
      retry_attempts: connectionAttempts,
      max_attempts: maxConnectionAttempts,
      connection_status: connectionAttempts >= maxConnectionAttempts ? 'failed' : 'retrying',
      next_retry: connectionAttempts < maxConnectionAttempts ? 'in progress' : 'manual'
    });
  }
});

// Force reconnection endpoint
app.post('/api/reconnect', async (req, res) => {
  try {
    console.log('🔄 Manual reconnection requested...');
    
    // Reset connection state
    isConnected = false;
    connectionAttempts = 0;
    
    // Force a new connection test
    const success = await testDatabaseConnection();
    
    if (success) {
      res.json({
        success: true,
        connected: true,
        message: 'Reconnection successful',
        timestamp: new Date().toISOString(),
        connection_attempts: connectionAttempts
      });
    } else {
      res.status(500).json({
        success: false,
        connected: false,
        message: 'Reconnection failed',
        timestamp: new Date().toISOString(),
        connection_attempts: connectionAttempts,
        max_attempts: maxConnectionAttempts
      });
    }
  } catch (error) {
    console.error('❌ Manual reconnection failed:', error.message);
    res.status(500).json({
      success: false,
      connected: false,
      message: 'Reconnection error',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
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
      additional_sections = {},
      prep_time = '',
      difficulty = '',
      is_favorite = false,
      current_step = 0,
      images = []
    } = req.body;
    
    console.log('➕ Adding new recipe:', title);
    
    // Validate required fields
    if (!title || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields: title and category are required' 
      });
    }
    
    // Validate that recipe has at least one content section
    const hasMainIngredients = ingredients && ingredients.length > 0;
    const hasMainDirections = directions && directions.length > 0;
    const hasAdditionalSections = additional_sections && Object.keys(additional_sections).length > 0;
    
    if (!hasMainIngredients && !hasMainDirections && !hasAdditionalSections) {
      return res.status(400).json({ 
        error: 'Recipe must have at least one of: main ingredients, main directions, or additional sections' 
      });
    }
    
    const client = await pool.connect();
    
    // Ensure table exists
    await ensureRecipesTable(client);
    
    const queryResult = await client.query(
      `INSERT INTO recipes (
        title, description, category, ingredients, directions, 
        additional_instructions, additional_sections, prep_time, difficulty, is_favorite, current_step, images
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        title,
        description,
        category,
        JSON.stringify(ingredients || []), // Handle undefined ingredients
        JSON.stringify(directions || []), // Handle undefined directions
        JSON.stringify(additional_instructions),
        JSON.stringify(additional_sections),
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
    console.log('🔄 Update data:', JSON.stringify(updates, null, 2));
    
    const client = await pool.connect();
    
    // First check if recipe exists
    const checkResult = await client.query('SELECT id, title FROM recipes WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      console.log('❌ Recipe not found for update:', id);
      client.release();
      return res.status(404).json({ error: 'Recipe not found' });
    }
    console.log('✅ Recipe exists, proceeding with update:', checkResult.rows[0].title);
    
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
    if (updates.additional_sections !== undefined) {
      updateFields.push(`additional_sections = $${paramCount++}`);
      values.push(JSON.stringify(updates.additional_sections));
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
    console.log('✅ Recipe updated successfully:', id);
    console.log('✅ Updated recipe title:', recipe.title);
    console.log('✅ Updated recipe images count:', recipe.images?.length || 0);
    
    // Verify the recipe was actually saved by querying it again
    const verifyResult = await client.query('SELECT id, title FROM recipes WHERE id = $1', [id]);
    if (verifyResult.rows.length > 0) {
      console.log('✅ VERIFICATION: Recipe confirmed in database:', verifyResult.rows[0].title);
    } else {
      console.log('❌ VERIFICATION: Recipe NOT found in database after update!');
    }
    
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
