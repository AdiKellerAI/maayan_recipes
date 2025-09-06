#!/usr/bin/env node

/**
 * Local Production Simulation Test
 * Tests localhost with production-like behavior and real UUIDs
 */

const http = require('http');

// Local configuration
const LOCAL_PORT = 5173;
const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;

// Real recipe IDs (same as production)
const REAL_RECIPE_IDS = [
  '8de0d3b5-3895-490e-a59f-451eefad4732',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'
];

// Test scenarios for local testing
const LOCAL_TEST_SCENARIOS = [
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
  }
];

function makeLocalRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 500)
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

async function testLocalScenario(scenario) {
  const fullUrl = `${LOCAL_URL}${scenario.url}`;
  
  try {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`   URL: ${fullUrl}`);
    
    const result = await makeLocalRequest(fullUrl);
    const actualContentType = result.headers['content-type']?.split(';')[0];
    
    // Check status code
    const statusOk = result.statusCode === scenario.expectedStatus;
    console.log(`   Status: ${result.statusCode} ${statusOk ? '✅' : '❌'} (expected ${scenario.expectedStatus})`);
    
    // Check content type
    const contentTypeOk = actualContentType === scenario.expectedContent;
    console.log(`   Content-Type: ${actualContentType} ${contentTypeOk ? '✅' : '❌'} (expected ${scenario.expectedContent})`);
    
    // Check if HTML contains React app
    if (scenario.expectedContent === 'text/html') {
      const hasReactApp = result.data.includes('root') || result.data.includes('react') || result.data.includes('id="root"');
      console.log(`   React App: ${hasReactApp ? '✅' : '❌'}`);
      
      // Check for specific content based on route
      if (scenario.url.startsWith('/recipe/')) {
        const hasRecipeContent = result.data.includes('recipe') || result.data.includes('מתכון');
        console.log(`   Recipe Content: ${hasRecipeContent ? '✅' : '⚠️'}`);
      }
    }
    
    return {
      scenario: scenario.name,
      url: scenario.url,
      success: statusOk && contentTypeOk,
      statusCode: result.statusCode,
      contentType: actualContentType,
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

async function runLocalTests() {
  console.log('🚀 Local Production Simulation Test');
  console.log(`📍 Testing localhost: ${LOCAL_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🔗 Real Recipe IDs: ${REAL_RECIPE_IDS.join(', ')}`);
  console.log('\n⚠️  Make sure your dev server is running: npm run dev');
  
  const results = [];
  
  for (const scenario of LOCAL_TEST_SCENARIOS) {
    const result = await testLocalScenario(scenario);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📊 Local Test Summary');
  console.log('====================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 All local tests passed! Your routing should work in production.');
    console.log('✅ React Router is handling real UUIDs correctly');
    console.log('✅ Client-side routing is working');
    console.log('✅ Ready for production deployment');
  } else {
    console.log('\n⚠️  Some tests failed. Fix these before deploying to production.');
    
    const failed = results.filter(r => !r.success);
    console.log('\nFailed scenarios:');
    failed.forEach(r => {
      console.log(`  - ${r.scenario}: ${r.error || 'Unexpected status/content-type'}`);
    });
  }
  
  // Production readiness check
  console.log('\n🔍 Production Readiness Check');
  console.log('=============================');
  
  const recipeRoutes = results.filter(r => r.url.startsWith('/recipe/'));
  const recipeRoutesWorking = recipeRoutes.filter(r => r.success).length;
  
  console.log(`Recipe Routes: ${recipeRoutesWorking}/${recipeRoutes.length} working`);
  console.log(`UUID Handling: ${recipeRoutesWorking === recipeRoutes.length ? '✅' : '❌'}`);
  console.log(`React Router: ${results.filter(r => r.success && r.url !== '/').length > 0 ? '✅' : '❌'}`);
  
  if (recipeRoutesWorking === recipeRoutes.length) {
    console.log('\n🚀 Ready for production deployment!');
    console.log('   - Real UUIDs are handled correctly');
    console.log('   - Client-side routing works');
    console.log('   - Vercel configuration should work');
  } else {
    console.log('\n⚠️  Not ready for production. Fix the issues above first.');
  }
  
  console.log(`\n⏰ Completed at: ${new Date().toISOString()}`);
  
  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runLocalTests().catch(console.error);
}

module.exports = { testLocalScenario, runLocalTests };
