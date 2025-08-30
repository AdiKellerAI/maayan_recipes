const { Pool } = require('pg');

// PostgreSQL connection configuration using your exact DBeaver settings
const pool = new Pool({
  host: '34.132.167.99',
  port: 5432,
  database: 'recipes',
  user: 'postgres',
  password: 'MaayanRecipes2025',
  // Connection settings
  ssl: { rejectUnauthorized: false }, // Enable SSL with self-signed certificates
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

// Test PostgreSQL connection
async function testConnection() {
  let client;
  try {
    console.log('🔌 Testing PostgreSQL connection...');
    console.log('📍 Host: 34.132.167.99:5432');
    console.log('🗄️ Database: recipes');
    console.log('👤 User: postgres');
    
    client = await pool.connect();
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ PostgreSQL connection successful!');
    console.log('⏰ Server time:', result.rows[0].current_time);
    console.log('🐘 PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
    
    // Test recipes table
    try {
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'recipes'
      `);
      
      if (tableCheck.rows.length > 0) {
        console.log('📋 Recipes table found');
        const countResult = await client.query('SELECT COUNT(*) as count FROM recipes');
        console.log(`📊 Recipes in database: ${countResult.rows[0].count}`);
      } else {
        console.log('⚠️ Recipes table not found - will create it');
        await createRecipesTable(client);
      }
    } catch (tableError) {
      console.log('⚠️ Error checking recipes table:', tableError.message);
      console.log('🔧 Attempting to create recipes table...');
      await createRecipesTable(client);
    }
    
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    console.error('🔍 Error code:', error.code);
    console.error('🔍 Error details:', error.detail || 'No additional details');
    
    // Try with SSL if initial connection failed
    if (!pool.options.ssl) {
      console.log('🔄 Retrying with SSL enabled...');
      pool.options.ssl = { rejectUnauthorized: false };
      try {
        client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        console.log('✅ PostgreSQL connection successful with SSL!');
        return true;
      } catch (sslError) {
        console.error('❌ PostgreSQL connection failed even with SSL:', sslError.message);
      }
    }
    
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Create recipes table if it doesn't exist
async function createRecipesTable(client) {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        ingredients JSONB,
        directions JSONB,
        additional_instructions JSONB DEFAULT '{}',
        prep_time VARCHAR(50),
        difficulty VARCHAR(50),
        is_favorite BOOLEAN DEFAULT false,
        images JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Recipes table created successfully');
  } catch (error) {
    console.error('❌ Error creating recipes table:', error.message);
    throw error;
  }
}

module.exports = { pool, testConnection };