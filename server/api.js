const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./database');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to map database row to Recipe type
const mapRowToRecipe = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description || '',
  images: row.images || [],
  category: row.category,
  ingredients: row.ingredients,
  directions: row.directions,
  additional_instructions: row.additional_instructions || {},
  prep_time: row.prep_time || '',
  difficulty: row.difficulty,
  is_favorite: row.is_favorite,
  created_at: row.created_at,
  updated_at: row.updated_at
});

// Test connection endpoint
app.get('/api/test-connection', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({ 
      connected: isConnected,
      message: isConnected ? 'PostgreSQL connection successful' : 'PostgreSQL connection failed'
    });
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      message: 'Connection test failed',
      error: error.message 
    });
  }
});

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    console.log('📊 API: Fetching all recipes from PostgreSQL...');
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM recipes ORDER BY created_at DESC');
    client.release();
    
    const recipes = result.rows.map(mapRowToRecipe);
    console.log(`✅ API: Retrieved ${recipes.length} recipes`);
    
    res.json(recipes);
  } catch (error) {
    console.error('❌ API: Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes', message: error.message });
  }
});

// Get recipe by ID
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const recipe = mapRowToRecipe(result.rows[0]);
    res.json(recipe);
  } catch (error) {
    console.error('❌ API: Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe', message: error.message });
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
      prep_time = '',
      difficulty = '',
      is_favorite = false,
      images = []
    } = req.body;
    
    console.log('➕ API: Adding new recipe:', title);
    
    const client = await pool.connect();
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
    client.release();
    
    const recipe = mapRowToRecipe(result.rows[0]);
    console.log('✅ API: Recipe added with ID:', recipe.id);
    
    res.status(201).json(recipe);
  } catch (error) {
    console.error('❌ API: Error adding recipe:', error);
    res.status(500).json({ error: 'Failed to add recipe', message: error.message });
  }
});

// Update recipe
app.put('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('🔄 API: Updating recipe:', id);
    
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
    
    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE recipes 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;
    
    const client = await pool.connect();
    const result = await client.query(query, values);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const recipe = mapRowToRecipe(result.rows[0]);
    console.log('✅ API: Recipe updated:', id);
    
    res.json(recipe);
  } catch (error) {
    console.error('❌ API: Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe', message: error.message });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ API: Deleting recipe:', id);
    
    const client = await pool.connect();
    const result = await client.query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    console.log('✅ API: Recipe deleted:', id);
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('❌ API: Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe', message: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Recipe API server running on http://localhost:${PORT}`);
  console.log('🔌 Testing PostgreSQL connection on startup...');
  testConnection();
});