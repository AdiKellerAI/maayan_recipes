#!/usr/bin/env node

/**
 * Image Management System Test Script
 * 
 * This script tests the image management system to ensure all components
 * are working correctly.
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

// Configuration
const config = {
  host: '34.132.167.99',
  port: 5432,
  database: 'recipes',
  user: 'postgres',
  password: 'MaayanRecipes2025',
  ssl: { rejectUnauthorized: false }
};

class ImageSystemTester {
  constructor() {
    this.pool = new Pool(config);
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 Starting Image Management System Tests...\n');

    try {
      // Test database connection
      await this.testDatabaseConnection();
      
      // Test table existence
      await this.testTableExistence();
      
      // Test functions
      await this.testDatabaseFunctions();
      
      // Test file system
      await this.testFileSystem();
      
      // Test API endpoints
      await this.testAPIEndpoints();
      
      // Print results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.pool.end();
    }
  }

  async testDatabaseConnection() {
    console.log('🔌 Testing database connection...');
    
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      this.addResult('Database Connection', true, `Connected successfully at ${result.rows[0].current_time}`);
    } catch (error) {
      this.addResult('Database Connection', false, error.message);
    }
  }

  async testTableExistence() {
    console.log('📋 Testing table existence...');
    
    try {
      const client = await this.pool.connect();
      
      // Check recipes table
      const recipesTable = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'recipes'
      `);
      
      // Check recipe_images table
      const imagesTable = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'recipe_images'
      `);
      
      client.release();
      
      const recipesExists = recipesTable.rows.length > 0;
      const imagesExists = imagesTable.rows.length > 0;
      
      this.addResult('Recipes Table', recipesExists, recipesExists ? 'Table exists' : 'Table not found');
      this.addResult('Recipe Images Table', imagesExists, imagesExists ? 'Table exists' : 'Table not found');
      
    } catch (error) {
      this.addResult('Table Existence', false, error.message);
    }
  }

  async testDatabaseFunctions() {
    console.log('⚙️ Testing database functions...');
    
    try {
      const client = await this.pool.connect();
      
      // Test get_recipe_images function
      try {
        await client.query('SELECT get_recipe_images($1)', ['00000000-0000-0000-0000-000000000000']);
        this.addResult('get_recipe_images Function', true, 'Function exists and works');
      } catch (error) {
        this.addResult('get_recipe_images Function', false, error.message);
      }
      
      // Test soft_delete_recipe_image function
      try {
        await client.query('SELECT soft_delete_recipe_image($1)', ['00000000-0000-0000-0000-000000000000']);
        this.addResult('soft_delete_recipe_image Function', true, 'Function exists and works');
      } catch (error) {
        this.addResult('soft_delete_recipe_image Function', false, error.message);
      }
      
      // Test get_recipe_image_stats function
      try {
        await client.query('SELECT get_recipe_image_stats($1)', ['00000000-0000-0000-0000-000000000000']);
        this.addResult('get_recipe_image_stats Function', true, 'Function exists and works');
      } catch (error) {
        this.addResult('get_recipe_image_stats Function', false, error.message);
      }
      
      client.release();
      
    } catch (error) {
      this.addResult('Database Functions', false, error.message);
    }
  }

  async testFileSystem() {
    console.log('📁 Testing file system...');
    
    try {
      // Check uploads directory
      const uploadsPath = path.join('uploads', 'recipes');
      
      try {
        await fs.access(uploadsPath);
        this.addResult('Uploads Directory', true, 'Directory exists');
      } catch (error) {
        // Try to create directory
        try {
          await fs.mkdir(uploadsPath, { recursive: true });
          this.addResult('Uploads Directory', true, 'Directory created successfully');
        } catch (createError) {
          this.addResult('Uploads Directory', false, `Cannot create directory: ${createError.message}`);
        }
      }
      
      // Check write permissions
      try {
        const testFile = path.join(uploadsPath, 'test.txt');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        this.addResult('Write Permissions', true, 'Can write to uploads directory');
      } catch (error) {
        this.addResult('Write Permissions', false, `Cannot write to directory: ${error.message}`);
      }
      
    } catch (error) {
      this.addResult('File System', false, error.message);
    }
  }

  async testAPIEndpoints() {
    console.log('🌐 Testing API endpoints...');
    
    try {
      const baseUrl = 'http://localhost:3001/api';
      
      // Test health endpoint
      try {
        const response = await fetch(`${baseUrl}/health`);
        if (response.ok) {
          this.addResult('API Health Endpoint', true, 'API server is running');
        } else {
          this.addResult('API Health Endpoint', false, `Server responded with ${response.status}`);
        }
      } catch (error) {
        this.addResult('API Health Endpoint', false, `Cannot connect to API: ${error.message}`);
      }
      
      // Test image stats endpoint
      try {
        const response = await fetch(`${baseUrl}/images/stats`);
        if (response.ok) {
          const stats = await response.json();
          this.addResult('Image Stats Endpoint', true, `Found ${stats.database.total_images} images in database`);
        } else {
          this.addResult('Image Stats Endpoint', false, `Server responded with ${response.status}`);
        }
      } catch (error) {
        this.addResult('Image Stats Endpoint', false, `Cannot fetch stats: ${error.message}`);
      }
      
    } catch (error) {
      this.addResult('API Endpoints', false, error.message);
    }
  }

  addResult(testName, passed, message) {
    this.testResults.push({
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(60));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message}`);
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log(`Overall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! The image management system is ready to use.');
    } else {
      console.log('⚠️ Some tests failed. Please check the issues above.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new ImageSystemTester();
  tester.runTests().catch(console.error);
}

module.exports = ImageSystemTester;
