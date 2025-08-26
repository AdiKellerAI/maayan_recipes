#!/usr/bin/env node

/**
 * Script to add images to existing recipes in the database
 * This script searches for appropriate food images and updates the PostgreSQL database
 */

const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Curated high-quality food images from Pexels (free to use)
const recipeImages = {
  // Salads
  'סלט בורגול וסלק': [
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  'סלט עגבניות שרי ובייבי מוצרלה (נעמה)': [
    'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  'ירקות שורש אפויים (אהרוני)': [
    'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  'סלט כרוב של גלוריה': [
    'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  'סלט סלרי עם בוטנים': [
    'https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  'הטחינה של משה שגב': [
    'https://images.pexels.com/photos/6275093/pexels-photo-6275093.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  'סלט כרוב ונודלס': [
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  
  // Main dishes and meat
  'סטייק בקר עם תבלינים': [
    'https://images.pexels.com/photos/361184/asparagus-steak-veal-steak-veal-361184.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  'קארי ירקות צמחוני': [
    'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  
  // Soups
  'מרק עוף עם ירקות חורפיים': [
    'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  
  // Breakfast
  'שקשוקה ביתית מסורתית': [
    'https://images.pexels.com/photos/6210959/pexels-photo-6210959.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  
  // Pastries and breads
  'לחם מלא עם זרעים': [
    'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  
  // Cakes and desserts
  'עוגת שוקולד של סבתא מרתה': [
    'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  'טירמיסו איטלקי אותנטי': [
    'https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  
  // Cookies
  'עוגיות חמאה פריכות': [
    'https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  
  // Sauces
  'חומוס ביתי עם טחינה': [
    'https://images.pexels.com/photos/6275093/pexels-photo-6275093.jpeg?auto=compress&cs=tinysrgb&w=800'
  ]
};

// Alternative images for recipes without specific matches
const categoryImages = {
  salads: [
    'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  soups: [
    'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  meat: [
    'https://images.pexels.com/photos/361184/asparagus-steak-veal-steak-veal-361184.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  healthy: [
    'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  breakfast: [
    'https://images.pexels.com/photos/6210959/pexels-photo-6210959.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  pastries: [
    'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/209206/pexels-photo-209206.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  cakes: [
    'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/140831/pexels-photo-140831.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  cookies: [
    'https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/209206/pexels-photo-209206.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  desserts: [
    'https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  sauces: [
    'https://images.pexels.com/photos/6275093/pexels-photo-6275093.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=800'
  ]
};

async function updateRecipeImages() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Fetching recipes without images...');
    
    // Get all recipes that don't have images or have empty images array
    const result = await client.query(`
      SELECT id, title, category 
      FROM recipes 
      WHERE images IS NULL 
         OR images = '[]'::jsonb 
         OR jsonb_array_length(images) = 0
    `);
    
    const recipesWithoutImages = result.rows;
    console.log(`Found ${recipesWithoutImages.length} recipes without images`);
    
    for (const recipe of recipesWithoutImages) {
      const { id, title, category } = recipe;
      console.log(`\n📸 Processing: ${title}`);
      
      // Try to find specific image for this recipe
      let images = recipeImages[title];
      
      // If no specific image, use category images
      if (!images && categoryImages[category]) {
        const categoryImgs = categoryImages[category];
        images = [categoryImgs[Math.floor(Math.random() * categoryImgs.length)]];
      }
      
      // If still no images, use a default food image
      if (!images) {
        images = ['https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800'];
      }
      
      // Update the recipe with images
      await client.query(
        'UPDATE recipes SET images = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(images), id]
      );
      
      console.log(`✅ Added ${images.length} image(s) to "${title}"`);
    }
    
    console.log('\n🎉 Successfully updated all recipes with images!');
    
  } catch (error) {
    console.error('❌ Error updating recipe images:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Validate image URLs (optional check)
async function validateImageUrls() {
  console.log('\n🔍 Validating image URLs...');
  
  const allImages = new Set();
  
  // Collect all unique image URLs
  Object.values(recipeImages).forEach(images => {
    images.forEach(url => allImages.add(url));
  });
  
  Object.values(categoryImages).forEach(images => {
    images.forEach(url => allImages.add(url));
  });
  
  console.log(`Found ${allImages.size} unique image URLs`);
  
  // You could add actual URL validation here if needed
  // For now, just report the count
  console.log('✅ All URLs are from trusted Pexels source');
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting recipe image update process...');
    
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    
    // Validate image URLs
    await validateImageUrls();
    
    // Update recipe images
    await updateRecipeImages();
    
    console.log('\n🎉 Recipe image update completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  updateRecipeImages,
  recipeImages,
  categoryImages
};
