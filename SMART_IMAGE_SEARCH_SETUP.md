# Smart Image Search - Setup Guide

## Overview

The Smart Image Search system has been completely redesigned with intelligent Hebrew-to-English translation, recipe categorization, and relevance scoring. This guide will help you configure the new system for optimal performance.

## 🆕 What's New

### Intelligent Backend Features
- **Hebrew Translation**: Automatic Hebrew-to-English translation for recipe names and ingredients
- **Recipe Analysis**: Cuisine detection, category classification, and ingredient prioritization  
- **Smart Queries**: Context-aware search query generation with multiple variations
- **Relevance Scoring**: AI-powered filtering to ensure images match the actual recipe
- **Quality Control**: Duplicate detection, dietary compatibility, and caching system

### 5-Phase Search Process
1. **Translation**: Convert Hebrew content to English using multiple translation services
2. **Analysis**: Analyze recipe to determine cuisine type, category, main ingredients
3. **Query Generation**: Create 3-5 optimized search queries based on analysis
4. **API Search**: Execute searches with intelligent API selection and rate limiting
5. **Relevance Filtering**: Score and filter results, return only high-quality matches

## 🔧 API Configuration

### Recommended Setup (Best Results)

Add these environment variables to your `.env` file:

```bash
# PRIORITY 1: Recipe-Specific APIs (Highest Quality)
VITE_SPOONACULAR_API_KEY=your_spoonacular_api_key_here
VITE_EDAMAM_API_KEY=your_app_id:your_app_key

# PRIORITY 2: General Image APIs (Good Fallbacks)  
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
VITE_PIXABAY_API_KEY=your_pixabay_api_key_here
```

### API Key Sources

#### 🥇 Recipe-Specific APIs (Recommended)

**Spoonacular API**
- URL: https://spoonacular.com/food-api
- Free Tier: 150 requests/day
- Best for: Recipe-specific images with metadata
- Format: `VITE_SPOONACULAR_API_KEY=abc123def456`

**Edamam Recipe API**
- URL: https://developer.edamam.com/
- Free Tier: 5,000 requests/month
- Best for: Recipe images with dietary information
- Format: `VITE_EDAMAM_API_KEY=app_id:app_key`

#### 🥈 General Image APIs (Fallbacks)

**Unsplash API**
- URL: https://unsplash.com/developers
- Free Tier: 50 requests/hour
- Best for: High-quality food photography
- Format: `VITE_UNSPLASH_ACCESS_KEY=your_access_key`

**Pixabay API**
- URL: https://pixabay.com/api/docs/
- Free Tier: 20,000 requests/month
- Best for: Large variety of food images
- Format: `VITE_PIXABAY_API_KEY=your_api_key`
- Note: Has built-in demo key, but get your own for higher limits

### Minimum Setup (Works Without API Keys)

The system will work with these free services even without API keys:
- LibreTranslate (Hebrew translation)
- MyMemory (translation fallback)
- TheMealDB (recipe images)
- Pixabay (with demo key)
- Lorem Picsum (intelligent fallbacks)

## 🎯 Translation System

### Automatic Hebrew Support
The system automatically detects Hebrew text and translates it using:

1. **Primary**: LibreTranslate (free, open-source)
2. **Fallback**: MyMemory API (free tier)
3. **Dictionary**: 200+ Hebrew cooking terms for accuracy
4. **Patterns**: Cooking method detection and enhancement

### Hebrew Cooking Dictionary
Includes translations for:
- Recipe types (עוגה → cake, מרק → soup)
- Ingredients (עוף → chicken, עגבניות → tomatoes)
- Cooking methods (אפייה → baking, צלייה → roasting)
- Measurements (כוס → cup, כפית → teaspoon)
- Dietary terms (טבעוני → vegan, כשר → kosher)

## 🧠 Intelligent Features

### Recipe Categorization
Automatically detects:
- **Cuisine Type**: Italian, Asian, Mediterranean, Middle Eastern, etc.
- **Recipe Category**: Dessert, main course, soup, salad, bread, etc.
- **Cooking Methods**: Baked, fried, grilled, steamed, etc.
- **Dietary Info**: Vegetarian, vegan, gluten-free, kosher

### Relevance Scoring (Enhanced for 80%+ Threshold)
Images are scored based on:
- **Recipe match** (+40 points): Direct category/name matches
- **Ingredient match** (+25 points): Main ingredients visible
- **Cuisine match** (+20 points): Matches detected cuisine style
- **Cooking method** (+15 points): Matches preparation method
- **Food keywords** (+5-25 points): General food-related terms

### Quality Control
- **Blacklist filtering**: Removes non-food images (people, buildings, etc.)
- **Dietary compatibility**: Vegetarian recipes won't show meat images
- **Duplicate detection**: Prevents similar images
- **Minimum score**: Only images scoring 80+ are included (high quality threshold)
- **Source diversity**: Mixes images from different APIs

## 🔧 Advanced Configuration

### Optional Environment Variables

```bash
# Relevance filtering (0-100, default: 80 for high quality)
VITE_MIN_RELEVANCE_SCORE=80

# Cache duration in milliseconds (default: 1 hour)
VITE_SEARCH_CACHE_DURATION=3600000

# Images per API call (default: 12, more = better filtering)
VITE_MAX_IMAGES_PER_API=12
```

### Translation Services (Optional)
For high-volume production use:

```bash
# Google Translate (most accurate, paid)
VITE_GOOGLE_TRANSLATE_API_KEY=your_google_key

# Azure Translator (good accuracy, free tier available)
VITE_AZURE_TRANSLATOR_KEY=your_azure_key
```

## 🚀 Testing the System

### Test with Hebrew Recipe
1. Create a recipe with Hebrew name: "עוגת שוקולד"
2. Add Hebrew ingredients: ["שוקולד מריר", "ביצים", "קמח", "סוכר"]
3. Open Smart Image Search
4. Check console logs for translation and analysis results
5. Verify images are relevant to chocolate cake

### Expected Console Output
```
🚀 Starting intelligent image search...
🔄 Phase 1: Translation
✅ Translation complete:
   Recipe name: chocolate cake
   Ingredients: dark chocolate, eggs, flour, sugar
🔄 Phase 2: Recipe Analysis
✅ Recipe analysis complete: {cuisineType: "international", recipeCategory: "dessert", ...}
🔄 Phase 3: Query Generation
✅ Generated 4 search query variations
🔄 Phase 4: API Search & Filtering
✅ Search complete, found 4 relevant images
📊 Average relevance score: 78.5
```

## 🐛 Troubleshooting

### Common Issues

**No images found**
- Check API keys are correctly formatted
- Verify internet connection
- Check browser console for API errors
- Try with simpler recipe names

**Images not relevant**
- Lower `VITE_MIN_RELEVANCE_SCORE` (try 60-70 if 80 is too strict)
- Check if Hebrew translation is working properly
- Verify recipe category is detected correctly

**API rate limits**
- Get your own API keys instead of using demo keys
- Implement request throttling in production
- Consider caching results longer

**Translation not working**
- Check if LibreTranslate is accessible
- Verify Hebrew text encoding is correct
- Check console for translation service errors

### Debug Mode
Enable detailed logging by opening browser console and looking for:
- 🔍 Translation results
- 📊 Recipe analysis data  
- 🎯 Search query variations
- ⚡ API response details
- 📈 Relevance scores

## 📈 Performance Tips

1. **Get Recipe-Specific API Keys**: Spoonacular and Edamam provide much more relevant images
2. **Cache Results**: The system caches for 1 hour by default
3. **Optimize Queries**: More specific recipe names get better results
4. **Monitor Rate Limits**: Implement proper API key rotation for production
5. **Use CDN**: Consider caching popular images on your own CDN

## 🔄 Migration from Old System

The new system is fully backward compatible. No changes needed to:
- React component props
- UI/UX interface
- Loading states
- Error handling

Simply update your `.env` file with new API keys to get enhanced results!

## 📞 Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Verify all API keys are correctly formatted
3. Test with simple English recipe names first
4. Check API service status pages
5. Review rate limiting and usage quotas

The system gracefully degrades - even without any API keys, it will provide fallback images based on recipe analysis.
