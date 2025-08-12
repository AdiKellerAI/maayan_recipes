import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Pool } from 'pg';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    configure(app) {
      // PostgreSQL connection
      const pool = new Pool({
        connectionString: 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes',
        ssl: false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
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

      app.use('/api', async (req, res, next) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const path = url.pathname.replace('/api', '');
          
          // Parse request body for POST/PUT requests
          let body = null;
          if (req.method === 'POST' || req.method === 'PUT') {
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            await new Promise(resolve => req.on('end', resolve));
            const rawBody = Buffer.concat(chunks).toString();
            if (rawBody) {
              body = JSON.parse(rawBody);
            }
          }

          let result;
          
          // Route handling
          if (path === '/test-connection' && req.method === 'GET') {
            try {
              console.log('🔌 Testing PostgreSQL connection...');
              const client = await pool.connect();
              
              // Test basic query
              const timeResult = await client.query('SELECT NOW() as current_time, version() as pg_version');
              console.log('✅ PostgreSQL connection successful!');
              
              // Ensure table exists
              await ensureRecipesTable(client);
              
              client.release();
              
              result = {
                success: true,
                connected: true,
                message: 'PostgreSQL connection successful',
                timestamp: new Date().toISOString(),
                server_time: timeResult.rows[0].current_time,
                pg_version: timeResult.rows[0].pg_version.split(' ')[0]
              };
            } catch (error) {
              console.error('❌ PostgreSQL connection failed:', error.message);
              result = {
                success: false,
                connected: false,
                message: 'PostgreSQL connection failed',
                error: error.message
              };
            }
          } else if (path === '/recipes' && req.method === 'GET') {
            try {
              console.log('📊 Fetching all recipes from PostgreSQL...');
              const client = await pool.connect();
              
              // Ensure table exists
              await ensureRecipesTable(client);
              
              const queryResult = await client.query('SELECT * FROM recipes ORDER BY created_at DESC');
              const recipes = queryResult.rows.map(mapRowToRecipe);
              console.log(`✅ Retrieved ${recipes.length} recipes`);
              
              client.release();
              result = recipes;
            } catch (error) {
              console.error('❌ Error fetching recipes:', error);
              throw new Error(`Failed to fetch recipes: ${error.message}`);
            }
          } else if (path === '/recipes' && req.method === 'POST') {
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
              } = body;
              
              console.log('➕ Adding new recipe:', title);
              
              // Validate required fields
              if (!title || !category || !ingredients || !directions) {
                throw new Error('Missing required fields: title, category, ingredients, and directions are required');
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
              result = recipe;
            } catch (error) {
              console.error('❌ Error adding recipe:', error);
              throw new Error(`Failed to add recipe: ${error.message}`);
            }
          } else if (path.startsWith('/recipes/') && req.method === 'GET') {
            const id = path.split('/')[2];
            try {
              console.log('📊 Fetching recipe by ID:', id);
              const client = await pool.connect();
              const queryResult = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
              client.release();
              
              if (queryResult.rows.length === 0) {
                res.statusCode = 404;
                result = { error: 'Recipe not found' };
              } else {
                const recipe = mapRowToRecipe(queryResult.rows[0]);
                console.log('✅ Retrieved recipe:', recipe.title);
                result = recipe;
              }
            } catch (error) {
              console.error('❌ Error fetching recipe:', error);
              throw new Error(`Failed to fetch recipe: ${error.message}`);
            }
          } else if (path.startsWith('/recipes/') && req.method === 'PUT') {
            const id = path.split('/')[2];
            try {
              console.log('🔄 Updating recipe:', id);
              
              const client = await pool.connect();
              
              // Build dynamic update query
              const updateFields = [];
              const values = [];
              let paramCount = 1;
              
              if (body.title !== undefined) {
                updateFields.push(`title = $${paramCount++}`);
                values.push(body.title);
              }
              if (body.description !== undefined) {
                updateFields.push(`description = $${paramCount++}`);
                values.push(body.description);
              }
              if (body.category !== undefined) {
                updateFields.push(`category = $${paramCount++}`);
                values.push(body.category);
              }
              if (body.ingredients !== undefined) {
                updateFields.push(`ingredients = $${paramCount++}`);
                values.push(JSON.stringify(body.ingredients));
              }
              if (body.directions !== undefined) {
                updateFields.push(`directions = $${paramCount++}`);
                values.push(JSON.stringify(body.directions));
              }
              if (body.additional_instructions !== undefined) {
                updateFields.push(`additional_instructions = $${paramCount++}`);
                values.push(JSON.stringify(body.additional_instructions));
              }
              if (body.prep_time !== undefined) {
                updateFields.push(`prep_time = $${paramCount++}`);
                values.push(body.prep_time);
              }
              if (body.difficulty !== undefined) {
                updateFields.push(`difficulty = $${paramCount++}`);
                values.push(body.difficulty);
              }
              if (body.is_favorite !== undefined) {
                updateFields.push(`is_favorite = $${paramCount++}`);
                values.push(body.is_favorite);
              }
              if (body.current_step !== undefined) {
                updateFields.push(`current_step = $${paramCount++}`);
                values.push(body.current_step);
              }
              if (body.images !== undefined) {
                updateFields.push(`images = $${paramCount++}`);
                values.push(JSON.stringify(body.images));
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
              
              const queryResult = await client.query(query, values);
              
              if (queryResult.rows.length === 0) {
                client.release();
                res.statusCode = 404;
                result = { error: 'Recipe not found' };
              } else {
                const recipe = mapRowToRecipe(queryResult.rows[0]);
                console.log('✅ Recipe updated:', id);
                
                client.release();
                result = recipe;
              }
            } catch (error) {
              console.error('❌ Error updating recipe:', error);
              throw new Error(`Failed to update recipe: ${error.message}`);
            }
          } else if (path.startsWith('/recipes/') && req.method === 'DELETE') {
            const id = path.split('/')[2];
            try {
              console.log('🗑️ Deleting recipe:', id);
              const client = await pool.connect();
              const queryResult = await client.query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);
              client.release();
              
              if (queryResult.rows.length === 0) {
                res.statusCode = 404;
                result = { error: 'Recipe not found' };
              } else {
                console.log('✅ Recipe deleted:', id);
                result = { message: 'Recipe deleted successfully', id: queryResult.rows[0].id };
              }
            } catch (error) {
              console.error('❌ Error deleting recipe:', error);
              throw new Error(`Failed to delete recipe: ${error.message}`);
            }
          } else {
            res.statusCode = 404;
            result = { error: 'API endpoint not found' };
          }

          // Send response
          if (!res.headersSent) {
            res.end(JSON.stringify(result));
          }
        } catch (error) {
          console.error('API Error:', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ 
              error: 'Internal server error', 
              message: error.message 
            }));
          }
        }
      });
    }
  },
  resolve: {
    alias: {
      'pg': '/src/lib/pg-browser-mock.ts'
    }
  },
  define: {
    'process.env': {
      DATABASE_URL: JSON.stringify(process.env.DATABASE_URL || 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes')
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});