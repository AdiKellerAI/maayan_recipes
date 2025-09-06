#!/usr/bin/env node

/**
 * Test script to verify Vercel routing configuration
 * Run this after deployment to test all routes
 */

const https = require('https');
const http = require('http');

// Configuration
const DOMAIN = process.env.VERCEL_URL || 'maayanrecipes-owdczwsnu-kellersn-gmailcoms-projects.vercel.app';
const PROTOCOL = DOMAIN.includes('vercel.app') ? 'https' : 'http';
const BASE_URL = `${PROTOCOL}://${DOMAIN}`;

// Real UUIDs for testing (replace with actual recipe IDs from your database)
const REAL_RECIPE_IDS = [
  '8de0d3b5-3895-490e-a59f-451eefad4732',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'
];

// Test routes with real UUIDs
const TEST_ROUTES = [
  '/',
  '/recipes',
  `/recipe/${REAL_RECIPE_IDS[0]}`,
  `/recipe/${REAL_RECIPE_IDS[1]}`,
  '/add',
  `/edit/${REAL_RECIPE_IDS[0]}`,
  '/search',
  '/api/health',
  '/manifest.json',
  '/sw.js'
];

// Expected status codes
const EXPECTED_STATUS = {
  '/': 200,
  '/recipes': 200,
  [`/recipe/${REAL_RECIPE_IDS[0]}`]: 200,
  [`/recipe/${REAL_RECIPE_IDS[1]}`]: 200,
  '/add': 200,
  [`/edit/${REAL_RECIPE_IDS[0]}`]: 200,
  '/search': 200,
  '/api/health': 200,
  '/manifest.json': 200,
  '/sw.js': 200
};

// Expected content types
const EXPECTED_CONTENT_TYPES = {
  '/': 'text/html',
  '/recipes': 'text/html',
  [`/recipe/${REAL_RECIPE_IDS[0]}`]: 'text/html',
  [`/recipe/${REAL_RECIPE_IDS[1]}`]: 'text/html',
  '/add': 'text/html',
  [`/edit/${REAL_RECIPE_IDS[0]}`]: 'text/html',
  '/search': 'text/html',
  '/api/health': 'application/json',
  '/manifest.json': 'application/manifest+json',
  '/sw.js': 'application/javascript'
};

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 200) // First 200 chars for preview
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testRoute(route) {
  const url = `${BASE_URL}${route}`;
  const expectedStatus = EXPECTED_STATUS[route];
  const expectedContentType = EXPECTED_CONTENT_TYPES[route];
  
  try {
    console.log(`\n🧪 Testing: ${route}`);
    console.log(`   URL: ${url}`);
    
    const result = await makeRequest(url);
    const actualContentType = result.headers['content-type']?.split(';')[0];
    
    // Check status code
    const statusOk = result.statusCode === expectedStatus;
    console.log(`   Status: ${result.statusCode} ${statusOk ? '✅' : '❌'} (expected ${expectedStatus})`);
    
    // Check content type
    const contentTypeOk = actualContentType === expectedContentType;
    console.log(`   Content-Type: ${actualContentType} ${contentTypeOk ? '✅' : '❌'} (expected ${expectedContentType})`);
    
    // Check if HTML contains React app
    if (route !== '/api/health' && route !== '/manifest.json' && route !== '/sw.js') {
      const hasReactApp = result.data.includes('root') || result.data.includes('react');
      console.log(`   React App: ${hasReactApp ? '✅' : '❌'}`);
    }
    
    // Check for security headers
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection'
    ];
    
    const securityScore = securityHeaders.filter(header => 
      result.headers[header]
    ).length;
    
    console.log(`   Security Headers: ${securityScore}/${securityHeaders.length} ${securityScore === securityHeaders.length ? '✅' : '⚠️'}`);
    
    return {
      route,
      success: statusOk && contentTypeOk,
      statusCode: result.statusCode,
      contentType: actualContentType,
      hasSecurityHeaders: securityScore === securityHeaders.length
    };
    
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    return {
      route,
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 Starting Vercel Routing Tests');
  console.log(`📍 Testing domain: ${BASE_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  const results = [];
  
  for (const route of TEST_ROUTES) {
    const result = await testRoute(route);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 All tests passed! Your routing is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the configuration.');
    
    const failed = results.filter(r => !r.success);
    console.log('\nFailed routes:');
    failed.forEach(r => {
      console.log(`  - ${r.route}: ${r.error || 'Unexpected status/content-type'}`);
    });
  }
  
  console.log(`\n⏰ Completed at: ${new Date().toISOString()}`);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testRoute, runTests };
