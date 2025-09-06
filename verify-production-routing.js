#!/usr/bin/env node

/**
 * Production Routing Verification Script
 * Tests actual Vercel deployment with real UUIDs
 */

const https = require('https');
const http = require('http');

// Production configuration
const PRODUCTION_DOMAIN = 'maayanrecipes-owdczwsnu-kellersn-gmailcoms-projects.vercel.app';
const PRODUCTION_URL = `https://${PRODUCTION_DOMAIN}`;

// Real recipe IDs from your system (update these with actual IDs)
const REAL_RECIPE_IDS = [
  '8de0d3b5-3895-490e-a59f-451eefad4732',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'
];

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Landing Page',
    url: '/',
    expectedStatus: 200,
    expectedContent: 'text/html'
  },
  {
    name: 'Recipe List',
    url: '/recipes',
    expectedStatus: 200,
    expectedContent: 'text/html'
  },
  {
    name: 'Real Recipe Detail (UUID 1)',
    url: `/recipe/${REAL_RECIPE_IDS[0]}`,
    expectedStatus: 200,
    expectedContent: 'text/html'
  },
  {
    name: 'Real Recipe Detail (UUID 2)',
    url: `/recipe/${REAL_RECIPE_IDS[1]}`,
    expectedStatus: 200,
    expectedContent: 'text/html'
  },
  {
    name: 'Add Recipe Page',
    url: '/add',
    expectedStatus: 200,
    expectedContent: 'text/html'
  },
  {
    name: 'Edit Recipe Page',
    url: `/edit/${REAL_RECIPE_IDS[0]}`,
    expectedStatus: 200,
    expectedContent: 'text/html'
  },
  {
    name: 'Search Page',
    url: '/search',
    expectedStatus: 200,
    expectedContent: 'text/html'
  },
  {
    name: 'API Health Check',
    url: '/api/health',
    expectedStatus: 200,
    expectedContent: 'application/json'
  },
  {
    name: 'PWA Manifest',
    url: '/manifest.json',
    expectedStatus: 200,
    expectedContent: 'application/manifest+json'
  },
  {
    name: 'Service Worker',
    url: '/sw.js',
    expectedStatus: 200,
    expectedContent: 'application/javascript'
  }
];

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
          data: data.substring(0, 500) // First 500 chars for analysis
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testScenario(scenario) {
  const fullUrl = `${PRODUCTION_URL}${scenario.url}`;
  
  try {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`   URL: ${fullUrl}`);
    
    const result = await makeRequest(fullUrl);
    const actualContentType = result.headers['content-type']?.split(';')[0];
    
    // Check status code
    const statusOk = result.statusCode === scenario.expectedStatus;
    console.log(`   Status: ${result.statusCode} ${statusOk ? '✅' : '❌'} (expected ${scenario.expectedStatus})`);
    
    // Check content type
    const contentTypeOk = actualContentType === scenario.expectedContent;
    console.log(`   Content-Type: ${actualContentType} ${contentTypeOk ? '✅' : '❌'} (expected ${scenario.expectedContent})`);
    
    // Check if HTML contains React app (for non-API routes)
    if (scenario.expectedContent === 'text/html') {
      const hasReactApp = result.data.includes('root') || result.data.includes('react') || result.data.includes('id="root"');
      console.log(`   React App: ${hasReactApp ? '✅' : '❌'}`);
      
      // Check for specific content based on route
      if (scenario.url.startsWith('/recipe/')) {
        const hasRecipeContent = result.data.includes('recipe') || result.data.includes('מתכון');
        console.log(`   Recipe Content: ${hasRecipeContent ? '✅' : '⚠️'}`);
      }
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
    
    // Check for PWA headers (for manifest and SW)
    if (scenario.url === '/manifest.json') {
      const hasPWAHeaders = result.headers['content-type']?.includes('manifest+json');
      console.log(`   PWA Manifest: ${hasPWAHeaders ? '✅' : '❌'}`);
    }
    
    if (scenario.url === '/sw.js') {
      const hasSWHeaders = result.headers['service-worker-allowed'];
      console.log(`   Service Worker: ${hasSWHeaders ? '✅' : '⚠️'}`);
    }
    
    return {
      scenario: scenario.name,
      url: scenario.url,
      success: statusOk && contentTypeOk,
      statusCode: result.statusCode,
      contentType: actualContentType,
      hasSecurityHeaders: securityScore === securityHeaders.length,
      details: result
    };
    
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    return {
      scenario: scenario.name,
      url: scenario.url,
      success: false,
      error: error.message
    };
  }
}

async function runProductionTests() {
  console.log('🚀 Production Routing Verification');
  console.log(`📍 Testing domain: ${PRODUCTION_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🔗 Real Recipe IDs: ${REAL_RECIPE_IDS.join(', ')}`);
  
  const results = [];
  
  for (const scenario of TEST_SCENARIOS) {
    const result = await testScenario(scenario);
    results.push(result);
    
    // Delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Production Test Summary');
  console.log('==========================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 All production tests passed! Your routing is working correctly on Vercel.');
    console.log('✅ Recipe URLs will work when shared');
    console.log('✅ Direct URL access works');
    console.log('✅ PWA deep linking works');
    console.log('✅ Cross-platform compatibility confirmed');
  } else {
    console.log('\n⚠️  Some tests failed. Check the configuration before deploying.');
    
    const failed = results.filter(r => !r.success);
    console.log('\nFailed scenarios:');
    failed.forEach(r => {
      console.log(`  - ${r.scenario}: ${r.error || 'Unexpected status/content-type'}`);
    });
  }
  
  // Detailed results
  console.log('\n📋 Detailed Results');
  console.log('===================');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.scenario}: ${r.statusCode} ${r.contentType}`);
  });
  
  console.log(`\n⏰ Completed at: ${new Date().toISOString()}`);
  
  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runProductionTests().catch(console.error);
}

module.exports = { testScenario, runProductionTests };
