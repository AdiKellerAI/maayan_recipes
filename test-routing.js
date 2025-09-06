#!/usr/bin/env node

/**
 * Test script to verify Vercel routing configuration
 * Run this after deployment to test all routes
 */

const https = require('https');
const http = require('http');

// Configuration
const DOMAIN = process.env.VERCEL_URL || 'your-domain.vercel.app';
const PROTOCOL = DOMAIN.includes('vercel.app') ? 'https' : 'http';
const BASE_URL = `${PROTOCOL}://${DOMAIN}`;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test routes
const TEST_ROUTES = [
  '/',
  '/recipes',
  '/recipe/test-recipe-id-123',
  '/add',
  '/edit/test-recipe-id-456',
  '/search',
  '/api/health',
  '/manifest.json',
  '/sw.js'
];

// Expected status codes
const EXPECTED_STATUS = {
  '/': 200,
  '/recipes': 200,
  '/recipe/test-recipe-id-123': 200,
  '/add': 200,
  '/edit/test-recipe-id-456': 200,
  '/search': 200,
  '/api/health': 200,
  '/manifest.json': 200,
  '/sw.js': 200
};

// Expected content types
const EXPECTED_CONTENT_TYPES = {
  '/': 'text/html',
  '/recipes': 'text/html',
  '/recipe/test-recipe-id-123': 'text/html',
  '/add': 'text/html',
  '/edit/test-recipe-id-456': 'text/html',
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
    console.log(`\n${colors.blue}🧪 Testing:${colors.reset} ${colors.bold}${route}${colors.reset}`);
    console.log(`   ${colors.blue}URL:${colors.reset} ${url}`);
    
    const result = await makeRequest(url);
    const actualContentType = result.headers['content-type']?.split(';')[0];
    
    // Check status code
    const statusOk = result.statusCode === expectedStatus;
    const statusIcon = statusOk ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    console.log(`   ${colors.blue}Status:${colors.reset} ${result.statusCode} ${statusIcon} (expected ${expectedStatus})`);
    
    // Check content type
    const contentTypeOk = actualContentType === expectedContentType;
    const contentTypeIcon = contentTypeOk ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    console.log(`   ${colors.blue}Content-Type:${colors.reset} ${actualContentType} ${contentTypeIcon} (expected ${expectedContentType})`);
    
    // Check if HTML contains React app
    if (route !== '/api/health' && route !== '/manifest.json' && route !== '/sw.js') {
      const hasReactApp = result.data.includes('root') || result.data.includes('react') || result.data.includes('id="root"');
      const reactIcon = hasReactApp ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
      console.log(`   ${colors.blue}React App:${colors.reset} ${reactIcon}`);
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
    
    const securityIcon = securityScore === securityHeaders.length ? `${colors.green}✅${colors.reset}` : `${colors.yellow}⚠️${colors.reset}`;
    console.log(`   ${colors.blue}Security Headers:${colors.reset} ${securityScore}/${securityHeaders.length} ${securityIcon}`);
    
    // Check for PWA-specific headers (for HTML routes)
    if (route !== '/api/health' && route !== '/manifest.json' && route !== '/sw.js') {
      const hasPWAHeaders = result.headers['cache-control']?.includes('no-cache');
      const pwaIcon = hasPWAHeaders ? `${colors.green}✅${colors.reset}` : `${colors.yellow}⚠️${colors.reset}`;
      console.log(`   ${colors.blue}PWA Headers:${colors.reset} ${pwaIcon}`);
    }
    
    return {
      route,
      success: statusOk && contentTypeOk,
      statusCode: result.statusCode,
      contentType: actualContentType,
      hasSecurityHeaders: securityScore === securityHeaders.length,
      hasReactApp: route === '/api/health' || route === '/manifest.json' || route === '/sw.js' ? true : result.data.includes('root') || result.data.includes('react')
    };
    
  } catch (error) {
    console.log(`   ${colors.red}Error:${colors.reset} ${error.message} ${colors.red}❌${colors.reset}`);
    return {
      route,
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.blue}🚀 Starting Vercel Routing Tests${colors.reset}`);
  console.log(`${colors.blue}📍 Testing domain:${colors.reset} ${colors.bold}${BASE_URL}${colors.reset}`);
  console.log(`${colors.blue}⏰ Started at:${colors.reset} ${new Date().toISOString()}`);
  
  const results = [];
  
  for (const route of TEST_ROUTES) {
    const result = await testRoute(route);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log(`\n${colors.bold}${colors.blue}📊 Test Summary${colors.reset}`);
  console.log(`${colors.blue}================${colors.reset}`);
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const failed = total - successful;
  
  const successColor = successful === total ? colors.green : colors.yellow;
  const failColor = failed > 0 ? colors.red : colors.green;
  
  console.log(`${successColor}✅ Successful:${colors.reset} ${successful}/${total}`);
  console.log(`${failColor}❌ Failed:${colors.reset} ${failed}/${total}`);
  
  // Additional metrics
  const securityHeadersOk = results.filter(r => r.hasSecurityHeaders).length;
  const reactAppOk = results.filter(r => r.hasReactApp).length;
  
  console.log(`${colors.blue}🔒 Security Headers:${colors.reset} ${securityHeadersOk}/${total}`);
  console.log(`${colors.blue}⚛️  React App Detection:${colors.reset} ${reactAppOk}/${total}`);
  
  if (successful === total) {
    console.log(`\n${colors.green}${colors.bold}🎉 All tests passed! Your routing is working correctly.${colors.reset}`);
    console.log(`${colors.green}✨ Your recipe URLs will work when shared and accessed directly.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Some tests failed. Check the configuration.${colors.reset}`);
    
    const failedRoutes = results.filter(r => !r.success);
    console.log(`\n${colors.red}Failed routes:${colors.reset}`);
    failedRoutes.forEach(r => {
      console.log(`  ${colors.red}-${colors.reset} ${r.route}: ${r.error || 'Unexpected status/content-type'}`);
    });
  }
  
  console.log(`\n${colors.blue}⏰ Completed at:${colors.reset} ${new Date().toISOString()}`);
  
  // Return exit code for CI/CD
  process.exit(successful === total ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testRoute, runTests };
