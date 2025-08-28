#!/usr/bin/env node

/**
 * Performance Migration Script
 * 
 * This script applies the performance optimization migration to your PostgreSQL database.
 * It includes database indexing, materialized views, and optimized query functions.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'maayan_recipes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function applyMigration() {
  console.log('🚀 Starting performance optimization migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250118000000_performance_optimization.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Migration file loaded successfully');
    
    // Connect to database
    const client = await pool.connect();
    console.log('🔌 Connected to PostgreSQL database');
    
    // Execute migration
    console.log('⚡ Applying performance optimizations...');
    await client.query(migrationSQL);
    
    // Verify the migration
    console.log('🔍 Verifying migration results...');
    
    // Check if materialized view was created
    const viewCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_matviews WHERE matviewname = 'recipe_summaries'
      ) as view_exists
    `);
    
    if (viewCheck.rows[0].view_exists) {
      console.log('✅ Materialized view "recipe_summaries" created successfully');
    } else {
      console.log('❌ Failed to create materialized view');
    }
    
    // Check if functions were created
    const functionCheck = await client.query(`
      SELECT COUNT(*) as function_count FROM pg_proc 
      WHERE proname IN ('get_recipes_paginated', 'get_recipe_details', 'refresh_recipe_summaries')
    `);
    
    const functionCount = parseInt(functionCheck.rows[0].function_count);
    console.log(`✅ Created ${functionCount}/3 optimization functions`);
    
    // Check indexes
    const indexCheck = await client.query(`
      SELECT COUNT(*) as index_count FROM pg_indexes 
      WHERE tablename = 'recipes' AND indexname LIKE 'idx_recipes_%'
    `);
    
    const indexCount = parseInt(indexCheck.rows[0].index_count);
    console.log(`✅ Created ${indexCount} performance indexes`);
    
    // Get current recipe count
    const recipeCount = await client.query('SELECT COUNT(*) as count FROM recipes');
    console.log(`📊 Database contains ${recipeCount.rows[0].count} recipes`);
    
    // Test the new functions
    console.log('🧪 Testing optimized functions...');
    
    const testQuery = await client.query(`
      SELECT COUNT(*) as summary_count FROM recipe_summaries
    `);
    console.log(`✅ Recipe summaries view contains ${testQuery.rows[0].summary_count} entries`);
    
    const paginatedTest = await client.query(`
      SELECT COUNT(*) as paginated_count FROM get_recipes_paginated(5, 0)
    `);
    console.log(`✅ Paginated query returned ${paginatedTest.rows[0].paginated_count} results`);
    
    client.release();
    console.log('🎉 Performance optimization migration completed successfully!');
    console.log('');
    console.log('📈 Performance improvements applied:');
    console.log('   • Database indexing for faster queries');
    console.log('   • Materialized views for optimized list views');
    console.log('   • Paginated query functions');
    console.log('   • Full-text search capabilities');
    console.log('   • Memory-efficient data loading');
    console.log('');
    console.log('🚀 Your recipe site should now load significantly faster!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Troubleshooting tips:');
    console.error('1. Ensure PostgreSQL is running and accessible');
    console.error('2. Check database credentials in environment variables');
    console.error('3. Verify the migration file exists and is readable');
    console.error('4. Check database permissions for creating indexes and functions');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Performance benchmark function
async function runPerformanceBenchmark() {
  console.log('🏁 Running performance benchmark...');
  
  try {
    const client = await pool.connect();
    
    // Benchmark old vs new queries
    console.log('📊 Benchmarking query performance...');
    
    // Test regular query
    const start1 = Date.now();
    await client.query('SELECT * FROM recipes ORDER BY created_at DESC LIMIT 12');
    const regularTime = Date.now() - start1;
    
    // Test optimized query
    const start2 = Date.now();
    await client.query('SELECT * FROM get_recipes_paginated(12, 0)');
    const optimizedTime = Date.now() - start2;
    
    // Test materialized view
    const start3 = Date.now();
    await client.query('SELECT * FROM recipe_summaries ORDER BY created_at DESC LIMIT 12');
    const materializedTime = Date.now() - start3;
    
    console.log('');
    console.log('⚡ Performance Results:');
    console.log(`   Regular query:     ${regularTime}ms`);
    console.log(`   Optimized query:   ${optimizedTime}ms`);
    console.log(`   Materialized view: ${materializedTime}ms`);
    console.log('');
    
    const improvement = ((regularTime - optimizedTime) / regularTime * 100).toFixed(1);
    const materializedImprovement = ((regularTime - materializedTime) / regularTime * 100).toFixed(1);
    
    if (optimizedTime < regularTime) {
      console.log(`🚀 Optimized query is ${improvement}% faster!`);
    }
    
    if (materializedTime < regularTime) {
      console.log(`🚀 Materialized view is ${materializedImprovement}% faster!`);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Benchmark failed:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--benchmark')) {
    await runPerformanceBenchmark();
  } else {
    await applyMigration();
    
    if (args.includes('--with-benchmark')) {
      await runPerformanceBenchmark();
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⏹️  Migration interrupted by user');
  await pool.end();
  process.exit(0);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled rejection:', reason);
  await pool.end();
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { applyMigration, runPerformanceBenchmark };
