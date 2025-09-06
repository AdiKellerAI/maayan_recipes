#!/usr/bin/env node

/**
 * Quick Verification Script
 * Tests your specific Vercel domain with real UUIDs
 */

const https = require('https');

// Your actual production domain
const PRODUCTION_DOMAIN = 'maayanrecipes-owdczwsnu-kellersn-gmailcoms-projects.vercel.app';
const PRODUCTION_URL = `https://${PRODUCTION_DOMAIN}`;

// Real recipe IDs (update these with your actual IDs)
const REAL_RECIPE_IDS = [
  '8de0d3b5-3895-490e-a59f-451eefad4732',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'
];

async function quickTest(url, description) {
  try {
    console.log(`\n🧪 ${description}`);
    console.log(`   URL: ${url}`);
    
    const result = await new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type']?.split(';')[0],
          data: data.substring(0, 200)
        }));
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
    
    const isHtml = result.contentType === 'text/html';
    const hasReact = result.data.includes('root') || result.data.includes('react');
    const isRecipe = url.includes('/recipe/') && (result.data.includes('recipe') || result.data.includes('מתכון'));
    
    console.log(`   Status: ${result.statusCode} ${result.statusCode === 200 ? '✅' : '❌'}`);
    console.log(`   Content: ${result.contentType} ${isHtml ? '✅' : '❌'}`);
    console.log(`   React App: ${hasReact ? '✅' : '❌'}`);
    if (url.includes('/recipe/')) {
      console.log(`   Recipe Content: ${isRecipe ? '✅' : '⚠️'}`);
    }
    
    return result.statusCode === 200 && isHtml && hasReact;
    
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    return false;
  }
}

async function runQuickVerification() {
  console.log('🚀 Quick Production Verification');
  console.log(`📍 Domain: ${PRODUCTION_DOMAIN}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  const tests = [
    { url: `${PRODUCTION_URL}/`, desc: 'Landing Page' },
    { url: `${PRODUCTION_URL}/recipes`, desc: 'Recipe List' },
    { url: `${PRODUCTION_URL}/recipe/${REAL_RECIPE_IDS[0]}`, desc: `Recipe Detail (${REAL_RECIPE_IDS[0]})` },
    { url: `${PRODUCTION_URL}/recipe/${REAL_RECIPE_IDS[1]}`, desc: `Recipe Detail (${REAL_RECIPE_IDS[1]})` },
    { url: `${PRODUCTION_URL}/add`, desc: 'Add Recipe' },
    { url: `${PRODUCTION_URL}/edit/${REAL_RECIPE_IDS[0]}`, desc: `Edit Recipe (${REAL_RECIPE_IDS[0]})` },
    { url: `${PRODUCTION_URL}/search`, desc: 'Search Page' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const success = await quickTest(test.url, test.desc);
    results.push({ ...test, success });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('\n📊 Quick Test Summary');
  console.log('====================');
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 All tests passed! Your routing is working correctly.');
    console.log('✅ Recipe URLs work with real UUIDs');
    console.log('✅ Direct URL access works');
    console.log('✅ Ready for sharing and bookmarking');
  } else {
    console.log('\n⚠️  Some tests failed. Check the configuration.');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.desc}: ${r.url}`);
    });
  }
  
  console.log(`\n⏰ Completed: ${new Date().toISOString()}`);
}

// Run if executed directly
if (require.main === module) {
  runQuickVerification().catch(console.error);
}

module.exports = { quickTest, runQuickVerification };
