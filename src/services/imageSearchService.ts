// Smart Image Search Service for Recipe Images
// Uses multiple APIs to find recipe-related images

export interface ImageSearchResult {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
  width?: number;
  height?: number;
}

class ImageSearchService {
  private readonly UNSPLASH_ACCESS_KEY = 'your-unsplash-key'; // You'll need to add this to env
  private readonly PIXABAY_API_KEY = 'your-pixabay-key'; // You'll need to add this to env

  /**
   * Search for recipe-related images based on recipe name and ingredients
   */
  async searchRecipeImages(recipeName: string, ingredients: string[] = []): Promise<ImageSearchResult[]> {
    try {
      console.log('🔍 Searching images for recipe:', recipeName);
      
      // Create search terms from recipe name and key ingredients
      const searchTerms = this.generateSearchTerms(recipeName, ingredients);
      console.log('🔍 Search terms:', searchTerms);
      
      // Try multiple search strategies in parallel
      const searchPromises = [
        this.searchUnsplash(searchTerms[0], 2),
        this.searchPixabay(searchTerms[0], 2),
        // Fallback searches with different terms
        ...(searchTerms.length > 1 ? [
          this.searchUnsplash(searchTerms[1], 1),
          this.searchPixabay(searchTerms[1], 1)
        ] : [])
      ];

      const results = await Promise.allSettled(searchPromises);
      
      // Combine and deduplicate results
      const allImages: ImageSearchResult[] = [];
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          allImages.push(...result.value);
        }
      });

      // Remove duplicates and limit to 4 images
      const uniqueImages = this.deduplicateImages(allImages);
      const finalImages = uniqueImages.slice(0, 4);
      
      console.log('✅ Found', finalImages.length, 'unique images');
      return finalImages;
      
    } catch (error) {
      console.error('❌ Image search failed:', error);
      // Return mock images as fallback
      return this.getMockImages(recipeName);
    }
  }

  /**
   * Generate search terms from recipe name and ingredients
   */
  private generateSearchTerms(recipeName: string, ingredients: string[]): string[] {
    const terms: string[] = [];
    
    // Clean and translate Hebrew recipe name to English for better search results
    const englishRecipeName = this.translateHebrewToEnglish(recipeName);
    
    // Primary term: translated recipe name
    if (englishRecipeName) {
      terms.push(`${englishRecipeName} recipe food`);
      terms.push(`${englishRecipeName} dish`);
    }
    
    // Secondary terms based on ingredients
    const keyIngredients = this.extractKeyIngredients(ingredients);
    if (keyIngredients.length > 0) {
      const translatedIngredient = this.translateHebrewToEnglish(keyIngredients[0]);
      if (translatedIngredient) {
        terms.push(`${translatedIngredient} recipe`);
      }
    }
    
    // Category-based terms
    const category = this.inferCategory(recipeName, ingredients);
    if (category) {
      terms.push(`${category} recipe food`);
    }
    
    // Fallback: use original Hebrew name
    terms.push(`${recipeName} מתכון`);
    
    return terms;
  }

  /**
   * Translate Hebrew recipe terms to English for better image search
   */
  private translateHebrewToEnglish(hebrewText: string): string {
    const translations: { [key: string]: string } = {
      // Main dishes
      'עוגת שוקולד': 'chocolate cake',
      'עוגת גבינה': 'cheesecake',
      'עוגת גזר': 'carrot cake',
      'עוגת תפוחים': 'apple cake',
      'עוגת לימון': 'lemon cake',
      'עוגת וניל': 'vanilla cake',
      'עוגת דבש': 'honey cake',
      'עוגת פרג': 'poppy seed cake',
      'טירמיסו': 'tiramisu',
      'מוס שוקולד': 'chocolate mousse',
      'קרם ברולה': 'creme brulee',
      'פאי תפוחים': 'apple pie',
      'עוגיות שוקולד': 'chocolate cookies',
      'עוגיות חמאה': 'butter cookies',
      'מאפינס': 'muffins',
      'קאפקייקס': 'cupcakes',
      'דונאטס': 'donuts',
      
      // Savory dishes
      'פסטה': 'pasta',
      'לזניה': 'lasagna',
      'פיצה': 'pizza',
      'ריזוטו': 'risotto',
      'סלט קיסר': 'caesar salad',
      'סלט יווני': 'greek salad',
      'סלט ירוק': 'green salad',
      'מרק עוף': 'chicken soup',
      'מרק ירקות': 'vegetable soup',
      'מרק עדשים': 'lentil soup',
      'מרק בצל': 'onion soup',
      'שניצל': 'schnitzel',
      'המבורגר': 'hamburger',
      'פלאפל': 'falafel',
      'חומוס': 'hummus',
      'שווארמה': 'shawarma',
      'קבב': 'kebab',
      'מלאווח': 'malawach',
      'ג\'חנון': 'jachnun',
      'שקשוקה': 'shakshuka',
      'סביח': 'sabich',
      
      // Ingredients
      'עוף': 'chicken',
      'בקר': 'beef',
      'כבש': 'lamb',
      'דג': 'fish',
      'סלמון': 'salmon',
      'טונה': 'tuna',
      'שוקולד': 'chocolate',
      'וניל': 'vanilla',
      'תות': 'strawberry',
      'אוכמניות': 'blueberry',
      'תפוח': 'apple',
      'בננה': 'banana',
      'לימון': 'lemon',
      'תפוז': 'orange',
      'אגס': 'pear',
      'אפרסק': 'peach',
      'אבוקדו': 'avocado',
      'עגבניות': 'tomato',
      'מלפפון': 'cucumber',
      'בצל': 'onion',
      'שום': 'garlic',
      'גזר': 'carrot',
      'תפוח אדמה': 'potato',
      'בטטה': 'sweet potato',
      'ברוקולי': 'broccoli',
      'כרובית': 'cauliflower',
      'תרד': 'spinach',
      'חסה': 'lettuce',
      'גבינה': 'cheese',
      'חלב': 'milk',
      'ביצה': 'egg',
      'חמאה': 'butter',
      'שמן זית': 'olive oil',
      'דבש': 'honey',
      'סוכר': 'sugar',
      'קמח': 'flour',
      'אורז': 'rice',
      'פסטה': 'pasta',
      'לחם': 'bread',
      'פיתה': 'pita'
    };

    // Try to find exact matches first
    const lowerText = hebrewText.toLowerCase();
    for (const [hebrew, english] of Object.entries(translations)) {
      if (lowerText.includes(hebrew.toLowerCase())) {
        return english;
      }
    }

    // Try to find partial matches for complex recipe names
    let bestMatch = '';
    let maxMatches = 0;
    
    for (const [hebrew, english] of Object.entries(translations)) {
      const hebrewWords = hebrew.toLowerCase().split(' ');
      const textWords = lowerText.split(' ');
      
      const matches = hebrewWords.filter(word => 
        textWords.some(textWord => textWord.includes(word) || word.includes(textWord))
      ).length;
      
      if (matches > maxMatches && matches > 0) {
        maxMatches = matches;
        bestMatch = english;
      }
    }

    return bestMatch;
  }

  /**
   * Extract key ingredients that are good for image search
   */
  private extractKeyIngredients(ingredients: string[]): string[] {
    const keyWords = [
      'עוף', 'בקר', 'כבש', 'דג', 'סלמון', 'טונה', 'שוקולד', 'עוגה', 'לחם', 
      'פסטה', 'אורז', 'תפוחים', 'בננה', 'תות', 'אוכמניות', 'לימון', 'תפוז',
      'גבינה', 'חלב', 'ביצה', 'חמאה', 'עגבניות', 'מלפפון', 'בצל', 'שום',
      'גזר', 'תפוח אדמה', 'בטטה', 'ברוקולי', 'כרובית', 'תרד', 'חסה'
    ];
    return ingredients
      .filter(ingredient => keyWords.some(keyword => ingredient.includes(keyword)))
      .slice(0, 2);
  }

  /**
   * Infer recipe category for better search terms
   */
  private inferCategory(recipeName: string, ingredients: string[]): string | null {
    const name = recipeName.toLowerCase();
    const ingredientText = ingredients.join(' ').toLowerCase();
    
    if (name.includes('עוגה') || name.includes('קינוח') || ingredientText.includes('סוכר')) return 'cake';
    if (name.includes('סלט')) return 'salad';
    if (name.includes('מרק')) return 'soup';
    if (name.includes('פסטה') || ingredientText.includes('פסטה')) return 'pasta';
    if (name.includes('פיצה')) return 'pizza';
    if (ingredientText.includes('עוף')) return 'chicken';
    if (ingredientText.includes('בשר')) return 'meat';
    
    return null;
  }

  /**
   * Search Unsplash for food images
   */
  private async searchUnsplash(query: string, count: number): Promise<ImageSearchResult[]> {
    try {
      // For now, return mock data. In production, you'd implement the actual API call:
      /*
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${this.UNSPLASH_ACCESS_KEY}`
          }
        }
      );
      const data = await response.json();
      return data.results.map(img => ({
        url: img.urls.regular,
        thumbnail: img.urls.small,
        title: img.alt_description || query,
        source: 'Unsplash',
        width: img.width,
        height: img.height
      }));
      */
      
      return this.getMockUnsplashImages(query, count);
    } catch (error) {
      console.warn('Unsplash search failed:', error);
      return [];
    }
  }

  /**
   * Search Pixabay for food images
   */
  private async searchPixabay(query: string, count: number): Promise<ImageSearchResult[]> {
    try {
      // For now, return mock data. In production, you'd implement the actual API call:
      /*
      const response = await fetch(
        `https://pixabay.com/api/?key=${this.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&category=food&per_page=${count}&safesearch=true`
      );
      const data = await response.json();
      return data.hits.map(img => ({
        url: img.webformatURL,
        thumbnail: img.previewURL,
        title: img.tags,
        source: 'Pixabay',
        width: img.webformatWidth,
        height: img.webformatHeight
      }));
      */
      
      return this.getMockPixabayImages(query, count);
    } catch (error) {
      console.warn('Pixabay search failed:', error);
      return [];
    }
  }

  /**
   * Remove duplicate images based on URL similarity
   */
  private deduplicateImages(images: ImageSearchResult[]): ImageSearchResult[] {
    const seen = new Set<string>();
    return images.filter(img => {
      const key = img.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Mock images for development/fallback with recipe-specific images
   */
  private getMockImages(recipeName: string): ImageSearchResult[] {
    console.log('🔍 Getting mock images for recipe:', recipeName);
    
    const englishName = this.translateHebrewToEnglish(recipeName);
    const category = this.inferCategory(recipeName, []);
    
    console.log('🔍 Translated name:', englishName, 'Category:', category);
    
    // Recipe-specific image mappings with more variety
    const recipeImages: { [key: string]: string[] } = {
      'chocolate cake': [
        'photo-1578985545062-69928b1d9587', // chocolate cake
        'photo-1606890737304-57a1ca8a5b62', // chocolate cake slice
        'photo-1571115764595-644a1f56a55c', // chocolate dessert
        'photo-1563805042-7684c019e1cb'  // chocolate cake close-up
      ],
      'cheesecake': [
        'photo-1533134242443-d4fd215305ad', // cheesecake
        'photo-1627308595229-7830a5c91f9f', // cheesecake slice
        'photo-1571877227200-a0d98ea607e9', // berry cheesecake
        'photo-1586985289906-406988974504'  // classic cheesecake
      ],
      'pizza': [
        'photo-1565299624946-b28f40a0ca4b', // pizza
        'photo-1513104890138-7c749659a591', // pizza slice
        'photo-1571407970349-bc81e7e96d47', // margherita pizza
        'photo-1604382354936-07c5d9983bd3'  // pizza close-up
      ],
      'pasta': [
        'photo-1551183053-bf91a1d81141', // pasta
        'photo-1621996346565-e3dbc353d2e5', // spaghetti
        'photo-1563379091339-03246963d321', // pasta with sauce
        'photo-1608897013039-887f21d8c804'  // pasta dish
      ],
      'salad': [
        'photo-1540189549336-e6e99c3679fe', // fresh salad
        'photo-1607532941433-304659e8198a', // green salad
        'photo-1546793665-c74683f339c1', // colorful salad
        'photo-1512621776951-a57141f2eefd'  // healthy salad
      ],
      'soup': [
        'photo-1547592166-23ac45744acd', // soup bowl
        'photo-1578662996442-48f60103fc96', // vegetable soup
        'photo-1579952363873-27d3bfad9c0d', // chicken soup
        'photo-1606728035253-49e8a23146de'  // creamy soup
      ],
      'chicken': [
        'photo-1567620905732-2d1ec7ab7445', // chicken dish
        'photo-1598515214211-89d3c73ae83b', // grilled chicken
        'photo-1555939594-58d7cb561ad1', // chicken recipe
        'photo-1574672280600-4accfa5b6f98'  // roasted chicken
      ],
      'bread': [
        'photo-1509440159596-0249088772ff', // fresh bread
        'photo-1549931319-a545dcf3bc73', // artisan bread
        'photo-1586444248902-2f64eddc13df', // homemade bread
        'photo-1558618666-fcd25c85cd64'  // bread loaves
      ],
      'cookies': [
        'photo-1558961363-fa8fdf82db35', // chocolate chip cookies
        'photo-1499636136210-6f4ee915583e', // cookies on plate
        'photo-1571506165871-ee72a35836d0', // homemade cookies
        'photo-1576618148400-f54bed99fcfd'  // cookie jar
      ],
      'cake': [
        'photo-1464349095431-e9a21285b5f3', // layered cake
        'photo-1578985545062-69928b1d9587', // chocolate cake
        'photo-1621303837174-89787a7d4729', // birthday cake
        'photo-1486427944299-d1955d23e34d'  // elegant cake
      ]
    };

    // Generate a unique seed based on recipe name for consistent but varied results
    const seed = this.generateSeed(recipeName);
    
    // Default food images with more variety
    const defaultImages = [
      'photo-1565299624946-b28f40a0ca4b', // general food
      'photo-1540189549336-e6e99c3679fe', // healthy food
      'photo-1567620905732-2d1ec7ab7445', // cooked meal
      'photo-1555939594-58d7cb561ad1', // delicious food
      'photo-1490645935967-10de6ba17061', // food spread
      'photo-1546833999-b9f581a1996d', // restaurant food
      'photo-1504674900247-0877df9cc836', // cooking
      'photo-1414235077428-338989a2e8c0'  // kitchen scene
    ];

    // Select appropriate images based on recipe type
    let imageIds = defaultImages;
    let matchFound = false;
    
    // Try exact match first
    if (englishName && recipeImages[englishName.toLowerCase()]) {
      imageIds = recipeImages[englishName.toLowerCase()];
      matchFound = true;
      console.log('🎯 Exact match found for:', englishName.toLowerCase());
    } else if (category && recipeImages[category]) {
      imageIds = recipeImages[category];
      matchFound = true;
      console.log('🎯 Category match found for:', category);
    } else {
      // Try to match partial names
      for (const [key, images] of Object.entries(recipeImages)) {
        if (englishName && englishName.toLowerCase().includes(key)) {
          imageIds = images;
          matchFound = true;
          console.log('🎯 Partial match found for:', key);
          break;
        }
      }
    }
    
    if (!matchFound) {
      console.log('🎯 No match found, using default images with seed:', seed);
      // Use seed to select different default images for different recipes
      const startIndex = seed % (defaultImages.length - 4);
      imageIds = defaultImages.slice(startIndex, startIndex + 4);
    }

    // Generate mock images with relevant URLs
    const mockImages = imageIds.map((imageId, index) => ({
      url: `https://images.unsplash.com/${imageId}?w=800&h=600&fit=crop&auto=format&q=80`,
      thumbnail: `https://images.unsplash.com/${imageId}?w=300&h=200&fit=crop&auto=format&q=80`,
      title: `${recipeName} - ${['מתכון טעים', 'מנה מעולה', 'בישול ביתי', 'מתכון מיוחד'][index]}`,
      source: 'Unsplash'
    }));

    console.log('✅ Generated', mockImages.length, 'images for', recipeName);
    return mockImages;
  }

  /**
   * Generate a consistent seed number from recipe name for varied but consistent results
   */
  private generateSeed(recipeName: string): number {
    let hash = 0;
    for (let i = 0; i < recipeName.length; i++) {
      const char = recipeName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getMockUnsplashImages(query: string, count: number): ImageSearchResult[] {
    // Use the same intelligent image selection as getMockImages
    const mockImages = this.getMockImages(query);
    return mockImages.slice(0, count).map(img => ({
      ...img,
      source: 'Unsplash',
      title: `${query} - Unsplash`
    }));
  }

  private getMockPixabayImages(query: string, count: number): ImageSearchResult[] {
    // Use the same intelligent image selection as getMockImages
    const mockImages = this.getMockImages(query);
    return mockImages.slice(count, count * 2).map(img => ({
      ...img,
      source: 'Pixabay',
      title: `${query} - Pixabay`
    }));
  }
}

export const imageSearchService = new ImageSearchService();
