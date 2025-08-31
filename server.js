console.log('Starting server...');

import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';

console.log('Loading dependencies...');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

console.log('Middleware configured...');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

console.log('PostgreSQL pool created...');

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

// Helper function to map database row to Recipe type
const mapRowToRecipe = (row) => ({
  id: row.id.toString(),
  title: row.title,
  description: row.description || '',
  images: (() => {
    try {
      if (Array.isArray(row.images)) return row.images;
      if (typeof row.images === 'string' && row.images) {
        return JSON.parse(row.images);
      }
      return [];
    } catch (error) {
      console.warn('Error parsing images:', error);
      return [];
    }
  })(),
  category: row.category,
  ingredients: (() => {
    try {
      if (Array.isArray(row.ingredients)) return row.ingredients;
      return JSON.parse(row.ingredients || '[]');
    } catch (error) {
      console.warn('Error parsing ingredients:', error);
      return [];
    }
  })(),
  directions: (() => {
    try {
      if (Array.isArray(row.directions)) return row.directions;
      return JSON.parse(row.directions || '[]');
    } catch (error) {
      console.warn('Error parsing directions:', error);
      return [];
    }
  })(),
  additional_instructions: (() => {
    try {
      if (!row.additional_instructions) return {};
      if (typeof row.additional_instructions === 'object') return row.additional_instructions;
      return JSON.parse(row.additional_instructions);
    } catch (error) {
      console.warn('Error parsing additional_instructions:', error);
      return {};
    }
  })(),
  additional_sections: (() => {
    try {
      if (!row.additional_sections) return {};
      if (typeof row.additional_sections === 'object') return row.additional_sections;
      return JSON.parse(row.additional_sections);
    } catch (error) {
      console.warn('Error parsing additional_sections:', error);
      return {};
    }
  })(),
  prep_time: row.prep_time || '',
  difficulty: row.difficulty || '',
  is_favorite: Boolean(row.is_favorite),
  current_step: row.current_step || 0,
  created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
});

// Safe JSON response helper
const sendJsonResponse = (res, data, statusCode = 200) => {
  try {
    // Ensure data is serializable
    const jsonString = JSON.stringify(data);
    res.status(statusCode).setHeader('Content-Type', 'application/json').send(jsonString);
  } catch (error) {
    console.error('Error serializing response:', error);
    res.status(500).setHeader('Content-Type', 'application/json').send(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to serialize response'
    }));
  }
};

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
        additional_sections JSONB DEFAULT '{}',
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
    
    // Ensure additional_sections column exists (for existing tables)
    try {
      await client.query(`
        ALTER TABLE recipes 
        ADD COLUMN IF NOT EXISTS additional_sections JSONB DEFAULT '{}';
      `);
      console.log('✅ additional_sections column ensured');
    } catch (error) {
      console.log('⚠️ additional_sections column already exists or error:', error.message);
    }
    
    console.log('✅ Recipes table ensured');
  } catch (error) {
    console.error('❌ Error ensuring recipes table:', error.message);
    throw error;
  }
};

// Test connection endpoint
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
    
    const responseData = {
      success: true,
      connected: true,
      message: 'Connected to PostgreSQL',
      timestamp: new Date().toISOString(),
      server_time: result.rows[0].current_time ? new Date(result.rows[0].current_time).toISOString() : new Date().toISOString(),
      pg_version: result.rows[0].pg_version ? result.rows[0].pg_version.split(' ')[0] : 'unknown',
      recipe_count: parseInt(recipeCountResult.rows[0].count),
      connection_attempts: connectionAttempts,
      connection_status: 'healthy'
    };
    
    sendJsonResponse(res, responseData);
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
    
    const errorData = {
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
    };
    
    sendJsonResponse(res, errorData, 500);
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
      const responseData = {
        success: true,
        connected: true,
        message: 'Reconnection successful',
        timestamp: new Date().toISOString(),
        connection_attempts: connectionAttempts
      };
      sendJsonResponse(res, responseData);
    } else {
      const errorData = {
        success: false,
        connected: false,
        message: 'Reconnection failed',
        timestamp: new Date().toISOString(),
        connection_attempts: connectionAttempts,
        max_attempts: maxConnectionAttempts
      };
      sendJsonResponse(res, errorData, 500);
    }
  } catch (error) {
    console.error('❌ Manual reconnection failed:', error.message);
    const errorData = {
      success: false,
      connected: false,
      message: 'Reconnection error',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
    sendJsonResponse(res, errorData, 500);
  }
});

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    console.log('📊 Fetching all recipes from PostgreSQL...');
    const client = await pool.connect();
    
    // Ensure table exists
    await ensureRecipesTable(client);
    
    const result = await client.query('SELECT * FROM recipes ORDER BY created_at DESC');
    const recipes = result.rows.map(mapRowToRecipe);
    console.log(`✅ Retrieved ${recipes.length} recipes`);
    
    client.release();
    sendJsonResponse(res, recipes);
  } catch (error) {
    console.error('❌ Error fetching recipes:', error);
    sendJsonResponse(res, { 
      error: 'Failed to fetch recipes', 
      message: error.message || 'Unknown error' 
    }, 500);
  }
});

// Get recipe by ID
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📊 Fetching recipe by ID:', id);
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
    client.release();
    
    if (result.rows.length === 0) {
      return sendJsonResponse(res, { error: 'Recipe not found' }, 404);
    }
    
    const recipe = mapRowToRecipe(result.rows[0]);
    console.log('✅ Retrieved recipe:', recipe.title);
    sendJsonResponse(res, recipe);
  } catch (error) {
    console.error('❌ Error fetching recipe:', error);
    sendJsonResponse(res, { 
      error: 'Failed to fetch recipe', 
      message: error.message || 'Unknown error' 
    }, 500);
  }
});

// Add new recipe
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
    if (!title || !category || !ingredients || !directions) {
      return sendJsonResponse(res, {
        error: 'Missing required fields: title, category, ingredients, and directions are required'
      }, 400);
    }
    
    const client = await pool.connect();
    
    // Ensure table exists
    await ensureRecipesTable(client);
    
    const result = await client.query(
      `INSERT INTO recipes (
        title, description, category, ingredients, directions, 
        additional_instructions, additional_sections, prep_time, difficulty, is_favorite, current_step, images
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        title,
        description,
        category,
        JSON.stringify(ingredients),
        JSON.stringify(directions),
        JSON.stringify(additional_instructions),
        JSON.stringify(additional_sections),
        prep_time,
        difficulty,
        is_favorite,
        current_step,
        JSON.stringify(images)
      ]
    );
    
    const recipe = mapRowToRecipe(result.rows[0]);
    console.log('✅ Recipe added with ID:', recipe.id);
    
    client.release();
    sendJsonResponse(res, recipe, 201);
  } catch (error) {
    console.error('❌ Error adding recipe:', error);
    sendJsonResponse(res, { 
      error: 'Failed to add recipe', 
      message: error.message || 'Unknown error' 
    }, 500);
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
      return sendJsonResponse(res, { error: 'No fields to update' }, 400);
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
      return sendJsonResponse(res, { error: 'Recipe not found' }, 404);
    }
    
    const recipe = mapRowToRecipe(result.rows[0]);
    console.log('✅ Recipe updated:', id);
    
    client.release();
    sendJsonResponse(res, recipe);
  } catch (error) {
    console.error('❌ Error updating recipe:', error);
    sendJsonResponse(res, { 
      error: 'Failed to update recipe', 
      message: error.message || 'Unknown error' 
    }, 500);
  }
});

// Delete recipe
app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting recipe:', id);
    
    const client = await pool.connect();
    const result = await client.query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);
    client.release();
    
    if (result.rows.length === 0) {
      return sendJsonResponse(res, { error: 'Recipe not found' }, 404);
    }
    
    console.log('✅ Recipe deleted:', id);
    sendJsonResponse(res, { 
      message: 'Recipe deleted successfully', 
      id: result.rows[0].id.toString() 
    });
  } catch (error) {
    console.error('❌ Error deleting recipe:', error);
    sendJsonResponse(res, { 
      error: 'Failed to delete recipe', 
      message: error.message || 'Unknown error' 
    }, 500);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  sendJsonResponse(res, { 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

const PORT = 3001;

// Add a simple route for the root path
app.get('/', (req, res) => {
  sendJsonResponse(res, { 
    message: 'Recipe API Server is running',
    endpoints: [
      'GET /api/test-connection',
      'GET /api/recipes',
      'POST /api/recipes',
      'PUT /api/recipes/:id',
      'DELETE /api/recipes/:id'
    ]
  });
});

console.log('Setting up server to listen on port', PORT);

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log('🔌 Testing PostgreSQL connection on startup...');
  
  // Test connection on startup
  pool.connect()
    .then(client => {
      console.log('✅ PostgreSQL connected successfully on startup');
      client.release();
    })
    .catch(err => {
      console.error('❌ PostgreSQL connection failed on startup:', err.message);
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  await pool.end();
  process.exit(0);
});