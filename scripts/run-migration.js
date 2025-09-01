#!/usr/bin/env node

/**
 * Run Image Management System Migration
 * 
 * This script runs the database migration for the image management system.
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  host: '34.132.167.99',
  port: 5432,
  database: 'recipes',
  user: 'postgres',
  password: 'MaayanRecipes2025',
  ssl: { rejectUnauthorized: false }
};

async function runMigration() {
  const pool = new Pool(config);
  
  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    
    console.log('📋 Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250121000000_image_management_system.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('🚀 Running migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Test the migration
    console.log('🧪 Testing migration...');
    
    // Check if recipe_images table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'recipe_images'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ recipe_images table created successfully');
    } else {
      console.log('❌ recipe_images table not found');
    }
    
    // Test functions
    try {
      await client.query('SELECT get_recipe_images($1)', ['00000000-0000-0000-0000-000000000000']);
      console.log('✅ get_recipe_images function created successfully');
    } catch (error) {
      console.log('❌ get_recipe_images function failed:', error.message);
    }
    
    try {
      await client.query('SELECT soft_delete_recipe_image($1)', ['00000000-0000-0000-0000-000000000000']);
      console.log('✅ soft_delete_recipe_image function created successfully');
    } catch (error) {
      console.log('❌ soft_delete_recipe_image function failed:', error.message);
    }
    
    try {
      await client.query('SELECT get_recipe_image_stats($1)', ['00000000-0000-0000-0000-000000000000']);
      console.log('✅ get_recipe_image_stats function created successfully');
    } catch (error) {
      console.log('❌ get_recipe_image_stats function failed:', error.message);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = runMigration;
