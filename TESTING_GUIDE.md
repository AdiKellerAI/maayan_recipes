# Testing Guide for Vercel Routing

## Quick Start

### 1. Test Your Deployment
```bash
# Set your domain and run tests
VERCEL_URL=your-domain.vercel.app npm run test:routing

# Or run directly
node test-routing.js
```

### 2. Test with Custom Domain
```bash
# Test with your actual domain
VERCEL_URL=maayanrecipes-owdczwsnu-kellersn-gmailcoms-projects.vercel.app node test-routing.js
```

## What the Test Checks

### ✅ Route Accessibility
- All client-side routes return 200 status
- Recipe URLs work when accessed directly
- API endpoints respond correctly

### ✅ Content Type Validation
- HTML routes serve `text/html`
- API routes serve `application/json`
- PWA files serve correct content types

### ✅ React App Detection
- HTML pages contain React app elements
- Client-side routing is properly configured

### ✅ Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block

### ✅ PWA Headers
- HTML pages have no-cache headers
- Service Worker has proper headers
- Manifest.json has correct content type

## Test Routes

The script tests these routes:
- `/` - Landing page
- `/recipes` - Recipe list
- `/recipe/test-recipe-id-123` - Recipe detail
- `/add` - Add recipe page
- `/edit/test-recipe-id-456` - Edit recipe page
- `/search` - Search results
- `/api/health` - API health check
- `/manifest.json` - PWA manifest
- `/sw.js` - Service worker

## Expected Output

### ✅ Success Example
```
🚀 Starting Vercel Routing Tests
📍 Testing domain: https://your-domain.vercel.app
⏰ Started at: 2024-01-20T10:30:00.000Z

🧪 Testing: /
   URL: https://your-domain.vercel.app/
   Status: 200 ✅ (expected 200)
   Content-Type: text/html ✅ (expected text/html)
   React App: ✅
   Security Headers: 3/3 ✅
   PWA Headers: ✅

📊 Test Summary
================
✅ Successful: 9/9
❌ Failed: 0/9
🔒 Security Headers: 9/9
⚛️  React App Detection: 6/9

🎉 All tests passed! Your routing is working correctly.
✨ Your recipe URLs will work when shared and accessed directly.
```

### ❌ Failure Example
```
⚠️  Some tests failed. Check the configuration.

Failed routes:
  - /recipe/test-recipe-id-123: Unexpected status/content-type
```

## Troubleshooting

### Common Issues

1. **404 Errors**
   - Check that `vercel.json` is deployed
   - Verify the catch-all route is last
   - Ensure `index.html` exists in dist folder

2. **Wrong Content Type**
   - Check route order in `vercel.json`
   - Verify static asset patterns

3. **Missing Security Headers**
   - Check headers configuration in `vercel.json`
   - Verify global headers are applied

4. **React App Not Detected**
   - Check that HTML contains `id="root"`
   - Verify React app is properly built

### Debug Steps

1. **Check Vercel Logs**
   ```bash
   vercel logs
   ```

2. **Test Individual Routes**
   ```bash
   curl -I https://your-domain.vercel.app/recipe/test-id
   ```

3. **Verify Build Output**
   ```bash
   npm run build
   ls -la dist/
   ```

## CI/CD Integration

The test script returns proper exit codes:
- `0` - All tests passed
- `1` - Some tests failed

Use in GitHub Actions:
```yaml
- name: Test Routing
  run: npm run test:routing
  env:
    VERCEL_URL: ${{ secrets.VERCEL_URL }}
```

## Customization

### Add More Routes
Edit `TEST_ROUTES` array in `test-routing.js`:
```javascript
const TEST_ROUTES = [
  '/',
  '/recipes',
  '/recipe/your-actual-recipe-id', // Add real IDs
  // ... more routes
];
```

### Change Expected Status Codes
Edit `EXPECTED_STATUS` object:
```javascript
const EXPECTED_STATUS = {
  '/': 200,
  '/recipes': 200,
  // ... customize as needed
};
```

### Add More Checks
Extend the `testRoute` function to check additional headers or content.

## Best Practices

1. **Run tests after every deployment**
2. **Test with real recipe IDs** when possible
3. **Monitor test results** in CI/CD
4. **Update tests** when adding new routes
5. **Test on multiple environments** (preview, production)

---

This testing guide ensures your Vercel routing works perfectly across all platforms! 🚀
