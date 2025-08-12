import pg from 'pg';

// Debug: Log environment and connection details
console.log('🔍 DATABASE DEBUG: Environment check');
console.log('🔍 DATABASE DEBUG: typeof window:', typeof window);
console.log('🔍 DATABASE DEBUG: process.env.DATABASE_URL:', process.env.DATABASE_URL);

// PostgreSQL connection configuration - EXACT connection string
const connectionString = 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes';
console.log('🔍 DATABASE DEBUG: Using connection string:', connectionString);

// Create PostgreSQL pool
export const pool = new pg.Pool({
  connectionString,
  ssl: false, // Try without SSL first
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test connection function with detailed debugging
export const testConnection = async (): Promise<boolean> => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    console.log('🌐 DATABASE DEBUG: Running in browser - PostgreSQL not available');
    return false;
  }
  
  try {
    console.log('🔌 DATABASE DEBUG: Attempting PostgreSQL connection...');
    console.log('🔌 DATABASE DEBUG: Connection details:');
    console.log('  - Host: 34.132.167.99');
    console.log('  - Port: 5432');
    console.log('  - Database: recipes');
    console.log('  - User: postgres');
    console.log('  - SSL: disabled');
    
    const client = await pool.connect();
    console.log('✅ DATABASE DEBUG: Pool connection successful');
    
    // Test basic query
    console.log('🔍 DATABASE DEBUG: Testing basic query...');
    const timeResult = await client.query('SELECT NOW() as current_time');
    console.log('✅ DATABASE DEBUG: Time query successful:', timeResult.rows[0]);
    
    // Test recipes table
    console.log('🔍 DATABASE DEBUG: Testing recipes table...');
    const recipeResult = await client.query('SELECT COUNT(*) as recipe_count FROM recipes');
    console.log('✅ DATABASE DEBUG: Recipe count query successful:', recipeResult.rows[0]);
    
    client.release();
    console.log('✅ DATABASE DEBUG: Connection released');
    
    console.log('🎉 DATABASE DEBUG: PostgreSQL connection fully working!');
    return true;
  } catch (error) {
    console.error('❌ DATABASE DEBUG: PostgreSQL connection failed:');
    console.error('❌ DATABASE DEBUG: Error type:', error.constructor.name);
    console.error('❌ DATABASE DEBUG: Error message:', error.message);
    console.error('❌ DATABASE DEBUG: Error code:', error.code);
    console.error('❌ DATABASE DEBUG: Full error:', error);
    
    // Try with SSL enabled as fallback
    if (!error.message.includes('SSL')) {
      console.log('🔄 DATABASE DEBUG: Retrying with SSL enabled...');
      try {
        const sslPool = new pg.Pool({
          connectionString,
          ssl: { rejectUnauthorized: false },
          max: 5,
          connectionTimeoutMillis: 5000,
        });
        
        const sslClient = await sslPool.connect();
        await sslClient.query('SELECT 1');
        sslClient.release();
        await sslPool.end();
        
        console.log('✅ DATABASE DEBUG: SSL connection successful!');
        // Update main pool to use SSL
        pool.options.ssl = { rejectUnauthorized: false };
        return true;
      } catch (sslError) {
        console.error('❌ DATABASE DEBUG: SSL connection also failed:', sslError.message);
      }
    }
    
    return false;
  }
};

// Database types
export interface Recipe {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  ingredients: string[];
  directions: string[];
  additional_instructions?: { [key: string]: string[] };
  prep_time?: string;
  difficulty?: 'קל' | 'בינוני' | 'קשה';
  is_favorite: boolean;
  current_step?: number;
  created_at: Date;
  updated_at: Date;
}

export interface RecipeInsert {
  title: string;
  description: string;
  images?: string[];
  category: string;
  ingredients: string[];
  directions: string[];
  additional_instructions?: { [key: string]: string[] };
  prep_time?: string;
  difficulty?: string;
  is_favorite?: boolean;
  current_step?: number;
}

export interface RecipeUpdate {
  title?: string;
  description?: string;
  images?: string[];
  category?: string;
  ingredients?: string[];
  directions?: string[];
  additional_instructions?: { [key: string]: string[] };
  prep_time?: string;
  difficulty?: string;
  is_favorite?: boolean;
  current_step?: number;
}
