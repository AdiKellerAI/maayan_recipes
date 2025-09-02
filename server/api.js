const express = require('express');
const cors = require('cors');
const { getPool, testConnection, reinitializePool } = require('./database');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Import image routes
const imageRoutes = require('./api/images');
app.use('/api', imageRoutes);

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
  additional_sections: row.additional_sections || {},
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

// Helper function to execute database operations with retry
const executeWithRetry = async (operation, retries = 2) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`🔄 Database operation attempt ${attempt}/${retries} failed:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // If connection error, try reinitializing pool
      if (error.message.includes('timeout') || error.message.includes('connect')) {
        console.log('🔄 Reinitializing pool due to connection error...');
        reinitializePool();
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Get paginated recipes (optimized for performance)
app.get('/api/recipes', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      favorites,
      search,
      difficulty,
      hasImages,
      sortBy = 'created_at_desc',
      detailed = false // For backward compatibility
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('📊 API: Fetching paginated recipes...', {
      page: parseInt(page),
      limit: parseInt(limit),
      offset,
      category,
      favorites: favorites === 'true',
      search,
      difficulty,
      hasImages: hasImages ? hasImages === 'true' : null,
      sortBy,
      detailed: detailed === 'true'
    });

    await executeWithRetry(async () => {
      const client = await getPool().connect();
      
      try {
        if (detailed === 'true') {
          // Legacy mode: return full recipes for backward compatibility
          const result = await client.query('SELECT * FROM recipes ORDER BY created_at DESC LIMIT $1 OFFSET $2', [parseInt(limit), offset]);
          const countResult = await client.query('SELECT COUNT(*) FROM recipes');
          
          const recipes = result.rows.map(mapRowToRecipe);
          const totalCount = parseInt(countResult.rows[0].count);
          
          console.log(`✅ API: Retrieved ${recipes.length} detailed recipes (${totalCount} total)`);
          
          res.json({
            recipes,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: totalCount,
              totalPages: Math.ceil(totalCount / parseInt(limit)),
              hasNext: offset + recipes.length < totalCount,
              hasPrev: parseInt(page) > 1
            }
          });
        } else {
          // Simplified mode: just get all recipes for now
          const result = await client.query('SELECT * FROM recipes ORDER BY created_at DESC LIMIT $1 OFFSET $2', [parseInt(limit), offset]);
          const countResult = await client.query('SELECT COUNT(*) FROM recipes');
          
          const recipes = result.rows.map(mapRowToRecipe);
          const totalCount = parseInt(countResult.rows[0].count);
          
          console.log(`✅ API: Retrieved ${recipes.length} recipes (${totalCount} total)`);
          
          res.json({
            recipes,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: totalCount,
              totalPages: Math.ceil(totalCount / parseInt(limit)),
              hasNext: offset + recipes.length < totalCount,
              hasPrev: parseInt(page) > 1
            }
          });
        }
      } finally {
        client.release();
      }
    });
  } catch (error) {
    console.error('❌ API: Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes', message: error.message });
  }
});

// Get recipe by ID (optimized)
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { detailed = true } = req.query;
    
    console.log(`📊 API: Fetching recipe ${id} (detailed: ${detailed})`);
    
    const client = await getPool().connect();
    
    if (detailed === 'false') {
      // Return summary data only
      const result = await client.query(
        'SELECT * FROM recipe_summaries WHERE id = $1',
        [id]
      );
      client.release();
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const recipeSummary = {
        id: result.rows[0].id,
        title: result.rows[0].title,
        category: result.rows[0].category,
        difficulty: result.rows[0].difficulty,
        prep_time: result.rows[0].prep_time,
        is_favorite: result.rows[0].is_favorite,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
        first_image: result.rows[0].first_image,
        image_count: parseInt(result.rows[0].image_count),
        ingredient_count: parseInt(result.rows[0].ingredient_count),
        step_count: parseInt(result.rows[0].step_count)
      };
      
      console.log(`✅ API: Retrieved recipe summary for ${id}`);
      res.json(recipeSummary);
    } else {
      // Return full recipe details using optimized function
      const result = await client.query(
        'SELECT * FROM get_recipe_details($1)',
        [id]
      );
      client.release();
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const recipe = mapRowToRecipe(result.rows[0]);
      console.log(`✅ API: Retrieved full recipe details for ${id}`);
      res.json(recipe);
    }
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
      additional_sections = {},
      prep_time = '',
      difficulty = '',
      is_favorite = false,
      images = []
    } = req.body;
    
    console.log('➕ API: Adding new recipe:', title);
    
    const client = await getPool().connect();
    const result = await client.query(
      `INSERT INTO recipes (
        title, description, category, ingredients, directions, 
        additional_instructions, additional_sections, prep_time, difficulty, is_favorite, images
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
    if (updates.images !== undefined) {
      updateFields.push(`images = $${paramCount++}`);
      const imageData = JSON.stringify(updates.images);
      console.log('🖼️ API: Updating images, count:', updates.images.length, 'data size:', Math.round(imageData.length / 1024) + 'KB');
      
      // Log details about each image
      if (Array.isArray(updates.images)) {
        updates.images.forEach((img, index) => {
          console.log(`🖼️ API: Image ${index + 1}: ${Math.round(img.length / 1024)}KB, type: ${img.startsWith('data:image/') ? 'base64' : 'url'}`);
        });
      }
      
      values.push(imageData);
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
    
    const client = await getPool().connect();
    
    try {
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        client.release();
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const recipe = mapRowToRecipe(result.rows[0]);
      console.log('✅ API: Recipe updated:', id);
      console.log('✅ API: Updated recipe images count:', recipe.images ? recipe.images.length : 0);
      
      // Verify that images were saved correctly
      if (updates.images && Array.isArray(updates.images) && updates.images.length > 0) {
        const savedImageCount = recipe.images ? recipe.images.length : 0;
        if (savedImageCount !== updates.images.length) {
          console.error('❌ API: Image count mismatch!', { expected: updates.images.length, saved: savedImageCount });
        } else {
          console.log('✅ API: All images saved successfully');
        }
      }
      
      client.release();
      res.json(recipe);
      
    } catch (queryError) {
      client.release();
      console.error('❌ API: Database query error:', queryError);
      throw queryError;
    }
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
    
    const client = await getPool().connect();
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

// Get recipe categories with counts
app.get('/api/categories', async (req, res) => {
  try {
    console.log('📊 API: Fetching category counts...');
    const client = await getPool().connect();
    const result = await client.query(`
      SELECT 
        category,
        COUNT(*) as recipe_count
      FROM recipe_summaries 
      GROUP BY category 
      ORDER BY category
    `);
    client.release();
    
    const categories = result.rows.map(row => ({
      id: row.category,
      name: row.category,
      count: parseInt(row.recipe_count)
    }));
    
    console.log(`✅ API: Retrieved ${categories.length} categories`);
    res.json(categories);
  } catch (error) {
    console.error('❌ API: Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories', message: error.message });
  }
});

// Get performance stats
app.get('/api/stats', async (req, res) => {
  try {
    const client = await getPool().connect();
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_recipes,
        COUNT(*) FILTER (WHERE is_favorite = true) as favorite_recipes,
        COUNT(DISTINCT category) as total_categories,
        COUNT(*) FILTER (WHERE jsonb_array_length(images) > 0) as recipes_with_images,
        AVG(jsonb_array_length(ingredients))::numeric(10,2) as avg_ingredients,
        AVG(jsonb_array_length(directions))::numeric(10,2) as avg_steps
      FROM recipes
    `);
    client.release();
    
    const stats = {
      totalRecipes: parseInt(result.rows[0].total_recipes),
      favoriteRecipes: parseInt(result.rows[0].favorite_recipes),
      totalCategories: parseInt(result.rows[0].total_categories),
      recipesWithImages: parseInt(result.rows[0].recipes_with_images),
      avgIngredients: parseFloat(result.rows[0].avg_ingredients || 0),
      avgSteps: parseFloat(result.rows[0].avg_steps || 0)
    };
    
    console.log('✅ API: Retrieved performance stats');
    res.json(stats);
  } catch (error) {
    console.error('❌ API: Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
  }
});

// Health check endpoint with performance metrics
app.get('/api/health', async (req, res) => {
  try {
    const startTime = Date.now();
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    const dbResponseTime = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        responseTime: dbResponseTime
      },
      performance: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Recipe API server running on http://localhost:${PORT}`);
  console.log('🔌 Testing PostgreSQL connection on startup...');
  console.log('📊 Performance optimizations enabled:');
  console.log('  - Paginated queries with materialized views');
  console.log('  - Selective field loading');
  console.log('  - Database indexing for common queries');
  console.log('  - Health monitoring endpoints');
  testConnection();
});