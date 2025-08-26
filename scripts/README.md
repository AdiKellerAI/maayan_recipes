# Recipe Image Update Scripts

This directory contains utility scripts for managing recipe images in the Maayan Recipes database.

## Scripts Available

### 1. `add_recipe_images.js`

Automatically adds high-quality food images to recipes that don't have images yet.

**Features:**
- ✅ Searches for recipes without images in PostgreSQL database
- ✅ Uses curated, high-quality images from Pexels (free to use)
- ✅ Matches specific images to recipe titles when possible
- ✅ Falls back to category-appropriate images
- ✅ Updates database with compressed 800px width images
- ✅ Maintains image quality standards consistent with the site

## Setup

1. Navigate to the scripts directory:
```bash
cd scripts
```

2. Install dependencies:
```bash
npm install
```

3. Ensure your database connection is configured (uses same connection as main app)

## Usage

### Add Images to Recipes

Run the image update script:

```bash
npm run add-images
```

Or directly:

```bash
node add_recipe_images.js
```

The script will:
1. Connect to your PostgreSQL database
2. Find all recipes without images
3. Add appropriate high-quality food images
4. Update the database with the new images
5. Report progress and results

### Manual Database Connection

If you need to use a different database URL:

```bash
DATABASE_URL="your_connection_string" npm run add-images
```

## Image Sources

All images are sourced from [Pexels](https://www.pexels.com/), a free stock photography website that provides high-quality images with appropriate licenses for commercial use.

**Image Specifications:**
- **Format**: JPEG
- **Width**: 800px (maintains aspect ratio)
- **Quality**: High (optimized for web)
- **Compression**: Applied for fast loading
- **License**: Free for commercial use (Pexels License)

## Image Categories

The script includes curated images for:

- 🥗 **Salads**: Fresh vegetable salads, grain salads, mixed greens
- 🍲 **Soups**: Hearty broths, vegetable soups, chicken soups  
- 🥩 **Meat**: Steaks, grilled meats, meat dishes
- 🥬 **Healthy**: Vegetarian dishes, plant-based meals
- 🍳 **Breakfast**: Eggs, morning dishes, shakshuka
- 🥐 **Pastries**: Breads, baked goods, rolls
- 🎂 **Cakes**: Layer cakes, chocolate cakes, dessert cakes
- 🍪 **Cookies**: Baked cookies, sweet treats
- 🍰 **Desserts**: Tiramisu, elegant desserts, sweet endings
- 🥄 **Sauces**: Hummus, tahini, condiments

## Safety Features

- ✅ **Database backup recommended** before running
- ✅ **Read-only operations** for validation
- ✅ **Transactional updates** ensure data consistency  
- ✅ **Error handling** with detailed logging
- ✅ **Connection pooling** for database efficiency
- ✅ **Graceful cleanup** of database connections

## Troubleshooting

### Database Connection Issues
```bash
# Check if database is accessible
psql "postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes"
```

### Permission Issues
```bash
# Make script executable
chmod +x add_recipe_images.js
```

### View Results
After running the script, you can verify the results:

```sql
-- Check recipes with images
SELECT title, jsonb_array_length(images) as image_count 
FROM recipes 
WHERE images IS NOT NULL AND jsonb_array_length(images) > 0;

-- View specific recipe images
SELECT title, images FROM recipes WHERE title LIKE '%שוקולד%';
```

## Notes

- Images are automatically compressed to 800px width for optimal loading
- The script preserves existing images (only adds to recipes without images)
- All images maintain high visual quality while being web-optimized
- The script can be run multiple times safely (idempotent)

## Support

If you encounter any issues:

1. Check database connectivity
2. Verify PostgreSQL credentials
3. Ensure `pg` package is installed
4. Check console output for detailed error messages
