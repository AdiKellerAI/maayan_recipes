const { Pool } = require('pg');

// PostgreSQL connection configuration with fallback options
const createPool = (useSSL = true) => {
  const poolConfig = {
    host: '34.132.167.99',
    port: 5432,
    database: 'recipes',
    user: 'postgres',
    password: 'MaayanRecipes2025',
    // Connection settings - increased timeouts for better reliability
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    query_timeout: 20000,
    statement_timeout: 20000,
    max: 2, // Further reduced pool size
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    // Additional connection options for stability
    application_name: 'maayan_recipes_app',
    connect_timeout: 15,
    command_timeout: 20
  };
  
  console.log('🔧 Creating new PostgreSQL pool with config:', {
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
    user: poolConfig.user,
    ssl: poolConfig.ssl ? 'enabled' : 'disabled',
    max: poolConfig.max
  });
  
  return new Pool(poolConfig);
};

// Initialize pool
let pool = null;
const initializePool = () => {
  if (pool) {
    console.log('🔄 Ending existing pool...');
    pool.end();
  }
  pool = createPool(true);
  return pool;
};

// Create initial pool
pool = initializePool();

// Test PostgreSQL connection with retry logic
async function testConnection(retries = 3) {
  let client;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔌 Testing PostgreSQL connection (attempt ${attempt}/${retries})...`);
      console.log('📍 Host: 34.132.167.99:5432');
      console.log('🗄️ Database: recipes');
      console.log('👤 User: postgres');
      
      // Add timeout wrapper
      client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 15000)
        )
      ]);
    
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
    console.error(`❌ PostgreSQL connection failed (attempt ${attempt}/${retries}):`, error.message);
    console.error('🔍 Error code:', error.code);
    console.error('🔍 Error details:', error.detail || 'No additional details');
    
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.warn('Warning: Failed to release client:', releaseError.message);
      }
      client = null;
    }
    
    // If this was the last attempt with SSL, try without SSL
    if (attempt === retries) {
      console.log('🔄 Trying connection without SSL...');
      try {
        // Reinitialize pool without SSL
        if (pool) pool.end();
        pool = createPool(false);
        
        client = await Promise.race([
          pool.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 15000)
          )
        ]);
        
        const result = await client.query('SELECT NOW() as current_time');
        console.log('✅ PostgreSQL connection successful without SSL!');
        return true;
      } catch (noSslError) {
        console.error('❌ Connection failed even without SSL:', noSslError.message);
        return false;
      } finally {
        if (client) {
          try {
            client.release();
          } catch (releaseError) {
            console.warn('Warning: Failed to release no-SSL client:', releaseError.message);
          }
        }
      }
    }
    
    // Wait before retrying (exponential backoff)
    const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
    console.log(`⏳ Waiting ${waitTime}ms before retry...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.warn('Warning: Failed to release client in finally block:', releaseError.message);
      }
    }
  }
  }
  
  return false;
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
        additional_sections JSONB DEFAULT '{}',
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

// Function to get current pool (ensures we always get the latest pool)
const getPool = () => pool;

// Function to reinitialize pool if needed
const reinitializePool = (useSSL = true) => {
  console.log('🔄 Reinitializing PostgreSQL pool...');
  if (pool) {
    pool.end();
  }
  pool = createPool(useSSL);
  return pool;
};

module.exports = { 
  get pool() { return pool; }, // Always return current pool
  getPool,
  testConnection,
  reinitializePool
};

// Test connection if this file is run directly
if (require.main === module) {
  testConnection().then(success => {
    console.log('Test result:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
}