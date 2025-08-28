/**
 * Translation Service - Intelligent Hebrew-to-English translation system
 * 
 * Features:
 * - Multiple translation providers with fallbacks
 * - Hebrew cooking term dictionary
 * - Mixed language detection and handling
 * - Caching for performance
 */

interface TranslationResult {
  translatedText: string;
  confidence: number;
  source: 'api' | 'dictionary' | 'fallback';
}

interface TranslationCache {
  [key: string]: {
    result: string;
    timestamp: number;
    confidence: number;
  };
}

class TranslationService {
  private cache: TranslationCache = {};
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Hebrew cooking terms dictionary with English translations
  private readonly hebrewCookingDictionary: { [key: string]: string } = {
    // Recipe types - Enhanced with specific combinations
    'עוגת שוקולד': 'chocolate cake',
    'עוגת וניל': 'vanilla cake',
    'עוגת גבינה': 'cheesecake',
    'עוגת תפוחים': 'apple cake',
    'עוגת דבש': 'honey cake',
    'עוגה': 'cake',
    'עוגיות': 'cookies',
    'לחם': 'bread',
    'חלה': 'challah bread',
    'פיתה': 'pita bread',
    'מרק': 'soup',
    'סלט': 'salad',
    'רוטב': 'sauce',
    'קרם': 'cream',
    'מוס': 'mousse',
    'טירמיסו': 'tiramisu',
    'צ\'יזקייק': 'cheesecake',
    'בראוניז': 'brownies',
    'מאפינס': 'muffins',
    'קישים': 'quiche',
    'פיצה': 'pizza',
    'פסטה': 'pasta',
    'ריזוטו': 'risotto',
    'קוסקוס': 'couscous',
    'פלאפל': 'falafel',
    'חומוס': 'hummus',
    'טחינה': 'tahini',
    'שקשוקה': 'shakshuka',
    'סביח': 'sabich',
    'שווארמה': 'shawarma',
    'קבב': 'kebab',
    'שניצל': 'schnitzel',
    
    // Main ingredients
    'בשר': 'meat',
    'בקר': 'beef',
    'עוף': 'chicken',
    'הודו': 'turkey',
    'דג': 'fish',
    'סלמון': 'salmon',
    'טונה': 'tuna',
    'ביצים': 'eggs',
    'חלב': 'milk',
    'גבינה': 'cheese',
    'חמאה': 'butter',
    'שמן': 'oil',
    'שמן זית': 'olive oil',
    'קמח': 'flour',
    'סוכר': 'sugar',
    'דבש': 'honey',
    'שמרים': 'yeast',
    'אבקת אפייה': 'baking powder',
    'סודה לשתייה': 'baking soda',
    'וניל': 'vanilla',
    'שוקולד': 'chocolate',
    'קקאו': 'cocoa',
    'אגוזים': 'nuts',
    'שקדים': 'almonds',
    'אגוזי מלך': 'walnuts',
    'פיסטוק': 'pistachios',
    
    // Vegetables
    'עגבניות': 'tomatoes',
    'מלפפון': 'cucumber',
    'בצל': 'onion',
    'שום': 'garlic',
    'גזר': 'carrots',
    'תפוחי אדמה': 'potatoes',
    'בטטה': 'sweet potato',
    'חצילים': 'eggplant',
    'קישואים': 'zucchini',
    'פלפלים': 'peppers',
    'פטריות': 'mushrooms',
    'ברוקולי': 'broccoli',
    'כרובית': 'cauliflower',
    'תרד': 'spinach',
    'חסה': 'lettuce',
    'כרוב': 'cabbage',
    'סלרי': 'celery',
    
    // Fruits
    'תפוחים': 'apples',
    'בננות': 'bananas',
    'תותים': 'strawberries',
    'אוכמניות': 'blueberries',
    'לימון': 'lemon',
    'ליים': 'lime',
    'תפוז': 'orange',
    'גריפרוט': 'grapefruit',
    'אבטיח': 'watermelon',
    'מלון': 'melon',
    'אגס': 'pears',
    'אפרסק': 'peach',
    'שזיף': 'plum',
    'ענבים': 'grapes',
    'רימונים': 'pomegranate',
    'תמרים': 'dates',
    'צימוקים': 'raisins',
    
    // Herbs and spices
    'פטרוזיליה': 'parsley',
    'כוסברה': 'cilantro',
    'בזיליקום': 'basil',
    'אורגנו': 'oregano',
    'רוזמרין': 'rosemary',
    'זעתר': 'thyme',
    'שמיר': 'dill',
    'מנטה': 'mint',
    'פפריקה': 'paprika',
    'כמון': 'cumin',
    'כורכום': 'turmeric',
    'קינמון': 'cinnamon',
    'הל': 'cardamom',
    'ג\'ינג\'ר': 'ginger',
    'גרגיר מוסקט': 'nutmeg',
    'פלפל שחור': 'black pepper',
    'פלפל לבן': 'white pepper',
    'מלח': 'salt',
    'סוכר חום': 'brown sugar',
    
    // Cooking methods
    'אפייה': 'baking',
    'צלייה': 'roasting',
    'טיגון': 'frying',
    'בישול': 'cooking',
    'הקפצה': 'sautéing',
    'בישול על הגריל': 'grilling',
    'אידוי': 'steaming',
    'ברביקיו': 'barbecue',
    'מאכלים מבושלים': 'braised',
    'מבושל לאט': 'slow cooked',
    'מטוגן בשמן עמוק': 'deep fried',
    'צרוב': 'seared',
    'מקורמל': 'caramelized',
    
    // Measurements
    'כפית': 'teaspoon',
    'כף': 'tablespoon',
    'כוס': 'cup',
    'ליטר': 'liter',
    'מיליליטר': 'ml',
    'גרם': 'gram',
    'קילוגרם': 'kg',
    'חבילה': 'package',
    'פחית': 'can',
    'בקבוק': 'bottle',
    
    // Common cooking terms
    'מתכון': 'recipe',
    'מרכיבים': 'ingredients',
    'הכנה': 'preparation',
    'אופן הכנה': 'instructions',
    'זמן הכנה': 'prep time',
    'זמן בישול': 'cooking time',
    'זמן אפייה': 'baking time',
    'מנות': 'servings',
    'קלוריות': 'calories',
    'כשר': 'kosher',
    'חלבי': 'dairy',
    'בשרי': 'meat',
    'פרווה': 'pareve',
    'טבעוני': 'vegan',
    'צמחוני': 'vegetarian',
    'ללא גלוטן': 'gluten free',
    'בריא': 'healthy',
    'דיאטטי': 'diet',
    'קל': 'easy',
    'בינוני': 'medium',
    'קשה': 'hard',
    'מתקדם': 'advanced',
    'מתחיל': 'beginner'
  };

  // Common Hebrew cooking method patterns
  private readonly cookingMethodPatterns = [
    { hebrew: /אפו[יי]ה?/g, english: 'baked' },
    { hebrew: /צלו[יי]ה?/g, english: 'roasted' },
    { hebrew: /מטוגנ/g, english: 'fried' },
    { hebrew: /מבושל/g, english: 'cooked' },
    { hebrew: /על האש/g, english: 'grilled' },
    { hebrew: /בתנור/g, english: 'oven baked' },
    { hebrew: /על הגריל/g, english: 'grilled' },
    { hebrew: /מקורמל/g, english: 'caramelized' }
  ];

  /**
   * Main translation function with intelligent fallbacks
   */
  async translate(text: string): Promise<TranslationResult> {
    if (!text || !text.trim()) {
      return { translatedText: '', confidence: 0, source: 'fallback' };
    }

    const cleanText = text.trim();
    
    // Check cache first
    const cached = this.getCachedTranslation(cleanText);
    if (cached) {
      return { translatedText: cached.result, confidence: cached.confidence, source: 'dictionary' };
    }

    // Try dictionary translation first (fastest and most accurate for cooking terms)
    const dictionaryResult = this.translateWithDictionary(cleanText);
    if (dictionaryResult.confidence > 0.7) {
      this.cacheTranslation(cleanText, dictionaryResult.translatedText, dictionaryResult.confidence);
      return dictionaryResult;
    }

    // Try API translation with fallback to dictionary enhancement
    try {
      const apiResult = await this.translateWithAPI(cleanText);
      const enhancedResult = this.enhanceTranslationWithDictionary(apiResult.translatedText);
      
      const finalResult = {
        translatedText: enhancedResult,
        confidence: Math.min(apiResult.confidence + 0.1, 1.0),
        source: 'api' as const
      };
      
      this.cacheTranslation(cleanText, finalResult.translatedText, finalResult.confidence);
      return finalResult;
    } catch (error) {
      console.warn('API translation failed, using dictionary fallback:', error);
      
      // Enhanced dictionary fallback
      const fallbackResult = this.translateWithDictionary(cleanText);
      this.cacheTranslation(cleanText, fallbackResult.translatedText, fallbackResult.confidence);
      return fallbackResult;
    }
  }

  /**
   * Translate using Hebrew cooking dictionary - Enhanced for better accuracy
   */
  private translateWithDictionary(text: string): TranslationResult {
    const normalizedText = text.toLowerCase().trim();
    
    // First check for exact phrase matches (most accurate)
    for (const [hebrew, english] of Object.entries(this.hebrewCookingDictionary)) {
      if (normalizedText === hebrew || normalizedText.includes(hebrew)) {
        return {
          translatedText: english,
          confidence: 1.0,
          source: 'dictionary'
        };
      }
    }
    
    // If no exact match, try word-by-word translation
    const words = normalizedText.split(/\s+/);
    const translatedWords: string[] = [];
    let totalConfidence = 0;
    let translatedCount = 0;

    for (const word of words) {
      // Direct dictionary lookup
      if (this.hebrewCookingDictionary[word]) {
        translatedWords.push(this.hebrewCookingDictionary[word]);
        totalConfidence += 1;
        translatedCount++;
        continue;
      }

      // Partial matching for cooking terms
      let found = false;
      for (const [hebrew, english] of Object.entries(this.hebrewCookingDictionary)) {
        if (word.includes(hebrew) || hebrew.includes(word)) {
          translatedWords.push(english);
          totalConfidence += 0.8;
          translatedCount++;
          found = true;
          break;
        }
      }

      if (!found) {
        // Check for cooking method patterns
        let methodFound = false;
        for (const pattern of this.cookingMethodPatterns) {
          if (pattern.hebrew.test(word)) {
            translatedWords.push(pattern.english);
            totalConfidence += 0.7;
            translatedCount++;
            methodFound = true;
            break;
          }
        }

        if (!methodFound) {
          // Keep original word if no translation found
          translatedWords.push(word);
          totalConfidence += 0.3;
        }
      }
    }

    const confidence = translatedCount > 0 ? totalConfidence / words.length : 0;
    
    return {
      translatedText: translatedWords.join(' '),
      confidence: Math.min(confidence, 1.0),
      source: 'dictionary'
    };
  }

  /**
   * Translate using external API (LibreTranslate or similar free service)
   */
  private async translateWithAPI(text: string): Promise<TranslationResult> {
    // Try LibreTranslate first (free and open source)
    const libretranslateUrl = 'https://libretranslate.de/translate';
    
    try {
      const response = await fetch(libretranslateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'he',
          target: 'en',
          format: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          translatedText: data.translatedText || text,
          confidence: 0.8,
          source: 'api'
        };
      }
    } catch (error) {
      console.warn('LibreTranslate failed:', error);
    }

    // Fallback to MyMemory (free tier)
    try {
      const mymemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=he|en`;
      const response = await fetch(mymemoryUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.responseData && data.responseData.translatedText) {
          return {
            translatedText: data.responseData.translatedText,
            confidence: Math.min(parseFloat(data.responseData.match) || 0.7, 1.0),
            source: 'api'
          };
        }
      }
    } catch (error) {
      console.warn('MyMemory translation failed:', error);
    }

    throw new Error('All API translation methods failed');
  }

  /**
   * Enhance API translation with dictionary knowledge
   */
  private enhanceTranslationWithDictionary(apiTranslation: string): string {
    let enhanced = apiTranslation;

    // Replace common mistranslations with dictionary terms
    for (const [hebrew, english] of Object.entries(this.hebrewCookingDictionary)) {
      // Look for Hebrew terms that might have been left untranslated
      const hebrewRegex = new RegExp(hebrew, 'gi');
      enhanced = enhanced.replace(hebrewRegex, english);
    }

    // Apply cooking method patterns
    for (const pattern of this.cookingMethodPatterns) {
      enhanced = enhanced.replace(pattern.hebrew, pattern.english);
    }

    return enhanced;
  }

  /**
   * Cache management
   */
  private getCachedTranslation(text: string): { result: string; confidence: number } | null {
    const cached = this.cache[text];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { result: cached.result, confidence: cached.confidence };
    }
    return null;
  }

  private cacheTranslation(text: string, translation: string, confidence: number): void {
    this.cache[text] = {
      result: translation,
      timestamp: Date.now(),
      confidence
    };
  }

  /**
   * Detect if text contains Hebrew characters
   */
  isHebrew(text: string): boolean {
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  }

  /**
   * Clean and normalize text for translation
   */
  normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[״״]/g, '"')
      .replace(/['']/g, "'");
  }

  /**
   * Batch translate multiple items
   */
  async translateBatch(items: string[]): Promise<{ [key: string]: string }> {
    const results: { [key: string]: string } = {};
    
    // Process in parallel for better performance
    const promises = items.map(async (item) => {
      if (!item || !this.isHebrew(item)) {
        results[item] = item;
        return;
      }
      
      const normalized = this.normalizeText(item);
      const translated = await this.translate(normalized);
      results[item] = translated.translatedText;
    });

    await Promise.all(promises);
    return results;
  }
}

// Singleton instance
export const translationService = new TranslationService();
export default translationService;
