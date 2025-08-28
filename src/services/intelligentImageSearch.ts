/**
 * Intelligent Image Search Service - Recipe-aware image search with context understanding
 * 
 * Features:
 * - Recipe categorization and cuisine detection
 * - Smart query generation with multiple variations
 * - Relevance scoring and intelligent filtering
 * - Context-aware image selection
 */

import { translationService } from './translationService';

interface Recipe {
  title: string;
  ingredients: string[];
  category?: string;
  difficulty?: string;
  prep_time?: string;
}

interface SearchQuery {
  primary: string;
  secondary: string;
  tertiary: string;
  keywords: string[];
  cuisineType?: string;
  recipeCategory: string;
  mainIngredients: string[];
}

interface RecipeAnalysis {
  cuisineType: string;
  recipeCategory: string;
  mainIngredients: string[];
  cookingMethods: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  dietaryRestrictions: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isDessert: boolean;
  isBreakfast: boolean;
  isDinner: boolean;
}

interface ImageRelevanceScore {
  score: number;
  reasons: string[];
  penalties: string[];
}

class IntelligentImageSearchService {
  // REMOVED: All hardcoded cuisine and category patterns
  // These were causing category contamination and preventing dynamic detection

  // REMOVED: All hardcoded cooking methods and ingredient priorities
  // These were contaminating search queries with irrelevant terms

  // Blacklisted terms that indicate irrelevant images
  private readonly imageBlacklist = [
    'person', 'people', 'human', 'face', 'portrait', 'selfie',
    'text', 'document', 'paper', 'book', 'sign', 'logo',
    'car', 'vehicle', 'building', 'architecture', 'landscape',
    'animal', 'pet', 'dog', 'cat', 'bird', 'nature',
    'technology', 'computer', 'phone', 'screen', 'device',
    'abstract', 'pattern', 'texture', 'background', 'wallpaper'
  ];

  // Food-related positive keywords for relevance scoring
  private readonly foodKeywords = [
    'food', 'meal', 'dish', 'recipe', 'cooking', 'kitchen', 'chef',
    'delicious', 'tasty', 'fresh', 'homemade', 'gourmet', 'cuisine',
    'plate', 'bowl', 'serving', 'portion', 'ingredient', 'spice',
    'baked', 'cooked', 'prepared', 'garnish', 'presentation'
  ];

  /**
   * Analyze recipe to extract context and categorization - COMPLETELY DYNAMIC
   */
  async analyzeRecipe(recipe: Recipe): Promise<RecipeAnalysis> {
    console.log('🔍 Analyzing recipe dynamically:', recipe.title);

    // Translate Hebrew content
    const translatedTitle = await translationService.translate(recipe.title);
    const translatedIngredients = await Promise.all(
      recipe.ingredients.map(ingredient => translationService.translate(ingredient))
    );

    const titleText = translatedTitle.translatedText.toLowerCase();
    const ingredientTexts = translatedIngredients.map(t => t.translatedText.toLowerCase());
    
    console.log('📝 Translated title:', titleText);
    console.log('📝 Translated ingredients:', ingredientTexts);

    // DYNAMIC category detection based ONLY on translated content
    const recipeCategory = this.dynamicCategoryDetection(titleText);
    console.log('📂 Dynamically detected category:', recipeCategory);

    // DYNAMIC main ingredient extraction - no hardcoded priorities
    const mainIngredients = this.dynamicMainIngredients(ingredientTexts);
    console.log('🥕 Dynamically extracted main ingredients:', mainIngredients);

    // DYNAMIC cooking method detection from title/ingredients
    const cookingMethods = this.dynamicCookingMethods(titleText, ingredientTexts);
    console.log('👨‍🍳 Dynamically detected cooking methods:', cookingMethods);

    // Simple complexity based only on ingredient count
    const complexity = ingredientTexts.length <= 5 ? 'simple' : 
                      ingredientTexts.length <= 10 ? 'moderate' : 'complex';
    console.log('⚡ Complexity:', complexity);

    // DYNAMIC dietary detection
    const dietaryInfo = this.dynamicDietaryDetection(titleText, ingredientTexts);
    console.log('🥗 Dynamic dietary info:', dietaryInfo);

    // DYNAMIC meal timing based on category
    const isDessert = this.isDessertCategory(recipeCategory);
    const isBreakfast = this.isBreakfastCategory(recipeCategory);
    const isDinner = !isDessert && !isBreakfast;

    return {
      cuisineType: 'unknown', // Remove cuisine guessing - not needed for image search
      recipeCategory,
      mainIngredients,
      cookingMethods,
      complexity,
      dietaryRestrictions: dietaryInfo.restrictions,
      isVegetarian: dietaryInfo.isVegetarian,
      isVegan: dietaryInfo.isVegan,
      isDessert,
      isBreakfast,
      isDinner
    };
  }

  /**
   * Generate smart search queries based on recipe analysis - WITH VALIDATION
   */
  generateSearchQueries(recipe: Recipe, analysis: RecipeAnalysis): SearchQuery[] {
    console.log('🔍 Starting DYNAMIC query generation for:', recipe.title);
    console.log('📊 Analysis:', analysis);
    
    const baseQueries: SearchQuery[] = [];

    // Primary query: Recipe name + food keywords
    const primaryQuery = this.buildPrimaryQuery(recipe.title, analysis);
    if (this.validateQuery(primaryQuery, analysis)) {
      baseQueries.push(primaryQuery);
    } else {
      console.warn('❌ Primary query failed validation:', primaryQuery.primary);
    }

    // Secondary query: Main ingredients + cooking method
    const secondaryQuery = this.buildSecondaryQuery(analysis);
    if (this.validateQuery(secondaryQuery, analysis)) {
      baseQueries.push(secondaryQuery);
    } else {
      console.warn('❌ Secondary query failed validation:', secondaryQuery.primary);
    }

    // Tertiary query: Category-based
    const tertiaryQuery = this.buildTertiaryQuery(analysis);
    if (this.validateQuery(tertiaryQuery, analysis)) {
      baseQueries.push(tertiaryQuery);
    } else {
      console.warn('❌ Tertiary query failed validation:', tertiaryQuery.primary);
    }

    // Dietary-specific query if applicable
    if (analysis.isVegetarian || analysis.isVegan) {
      const dietaryQuery = this.buildDietaryQuery(analysis);
      if (this.validateQuery(dietaryQuery, analysis)) {
        baseQueries.push(dietaryQuery);
      } else {
        console.warn('❌ Dietary query failed validation:', dietaryQuery.primary);
      }
    }

    console.log('✅ Final validated search queries:', baseQueries.map(q => q.primary));
    return baseQueries;
  }

  /**
   * Validate query logic to prevent nonsensical combinations
   */
  private validateQuery(query: SearchQuery, analysis: RecipeAnalysis): boolean {
    const queryText = query.primary.toLowerCase();
    
    // Check for contradictory combinations
    if (analysis.isDessert && (queryText.includes('salad') || queryText.includes('soup'))) {
      console.warn('🚫 Invalid: Dessert query contains non-dessert terms');
      return false;
    }
    
    if (analysis.recipeCategory === 'salad' && (queryText.includes('cake') || queryText.includes('dessert'))) {
      console.warn('🚫 Invalid: Salad query contains dessert terms');
      return false;
    }
    
    if (analysis.recipeCategory === 'soup' && (queryText.includes('cake') || queryText.includes('salad'))) {
      console.warn('🚫 Invalid: Soup query contains non-soup terms');
      return false;
    }
    
    // Ensure query has meaningful content
    if (queryText.trim().length < 3) {
      console.warn('🚫 Invalid: Query too short');
      return false;
    }
    
    // Ensure query contains food-related terms
    if (!queryText.includes('food') && !queryText.includes(analysis.recipeCategory)) {
      console.warn('🚫 Invalid: Query lacks food context');
      return false;
    }
    
    console.log('✅ Query validation passed:', queryText);
    return true;
  }

  /**
   * Score image relevance based on metadata and context - FIXED for accuracy
   */
  scoreImageRelevance(imageMetadata: any, analysis: RecipeAnalysis, _query: SearchQuery): ImageRelevanceScore {
    let score = 0;
    const reasons: string[] = [];
    const penalties: string[] = [];

    const title = (imageMetadata.alt_description || imageMetadata.title || imageMetadata.tags || '').toLowerCase();
    const description = (imageMetadata.description || '').toLowerCase();
    const tags = Array.isArray(imageMetadata.tags) ? imageMetadata.tags.join(' ').toLowerCase() : 
                 (imageMetadata.tags || '').toLowerCase();
    
    const allText = `${title} ${description} ${tags}`;

    // CRITICAL FIX: Start with base score only if it's actually food-related
    let hasFoodContent = false;
    for (const keyword of this.foodKeywords) {
      if (allText.includes(keyword)) {
        hasFoodContent = true;
        break;
      }
    }
    
    // If no food content detected, heavily penalize
    if (!hasFoodContent) {
      score = 0;
      penalties.push('No food-related content detected');
      return { score, reasons, penalties };
    } else {
      score = 20; // Base score for food content
      reasons.push('Food-related content detected');
    }

    // STRICT CATEGORY MATCHING - This is the most important factor
    const categoryKeywords = this.getCategoryKeywords(analysis.recipeCategory);
    let categoryMatch = false;
    for (const keyword of categoryKeywords) {
      if (allText.includes(keyword.toLowerCase())) {
        score += 40; // Increased for stricter 90% threshold
        reasons.push(`Strong category match: ${keyword}`);
        categoryMatch = true;
        break;
      }
    }
    
    // For desserts, check if image matches dessert category
    if (analysis.isDessert) {
      // Check if image contains dessert-related terms from the recipe category
      if (allText.includes(analysis.recipeCategory) || 
          allText.includes('dessert') || 
          allText.includes('sweet') ||
          allText.includes('cake')) {
        score += 30; // Increased bonus for dessert match
        reasons.push(`Dessert category match`);
      } else {
        score -= 50; // Even heavier penalty for non-dessert images
        penalties.push('Not a dessert image for dessert recipe');
      }
    }

    // Main ingredient matches - but only if category matches
    if (categoryMatch) {
      for (const ingredient of analysis.mainIngredients.slice(0, 2)) { // Only top 2 ingredients
        if (allText.includes(ingredient.toLowerCase())) {
          score += 20; // Increased ingredient bonus
          reasons.push(`Main ingredient match: ${ingredient}`);
        }
      }
    }

    // Perfect match bonus - if image has both category and main ingredient
    if (categoryMatch && analysis.mainIngredients.length > 0) {
      const hasMainIngredient = analysis.mainIngredients.slice(0, 2).some(ingredient => 
        allText.includes(ingredient.toLowerCase())
      );
      if (hasMainIngredient) {
        score += 10; // Perfect match bonus
        reasons.push(`Perfect match: category + main ingredient`);
      }
    }

    // STRICT NEGATIVE SCORING - This is crucial
    // Blacklisted terms (immediate disqualification for most)
    for (const blacklisted of this.imageBlacklist) {
      if (allText.includes(blacklisted)) {
        score = Math.max(0, score - 50); // Heavy penalty
        penalties.push(`Contains inappropriate content: ${blacklisted}`);
      }
    }

    // Category conflicts - check for logical inconsistencies
    if (analysis.isDessert && (allText.includes('salad') || allText.includes('soup'))) {
      score = Math.max(0, score - 30);
      penalties.push('Non-dessert content conflicts with dessert recipe');
    }

    if (analysis.recipeCategory === 'salad' && (allText.includes('cake') || allText.includes('dessert'))) {
      score = Math.max(0, score - 25);
      penalties.push('Dessert content conflicts with salad recipe');
    }

    if (analysis.recipeCategory === 'soup' && (allText.includes('cake') || allText.includes('salad'))) {
      score = Math.max(0, score - 25);
      penalties.push('Non-soup content conflicts with soup recipe');
    }

    // Dietary conflicts
    if (analysis.isVegetarian && (allText.includes('meat') || allText.includes('beef') || allText.includes('pork'))) {
      score = Math.max(0, score - 30);
      penalties.push('Meat content conflicts with vegetarian recipe');
    }

    // Final score normalization and quality check
    score = Math.max(0, Math.min(100, score));
    
    // If score is still high but we have significant penalties, reduce it
    if (penalties.length > 2 && score > 50) {
      score = Math.max(30, score - 20);
      penalties.push('Multiple conflicts detected');
    }

    return {
      score,
      reasons,
      penalties
    };
  }

  /**
   * Get dynamic category keywords based on the actual category name
   */
  private getCategoryKeywords(category: string): string[] {
    // Return the category itself plus generic food terms - NO hardcoded lists
    return [category, 'food', 'dish'];
  }

  // COMPLETELY DYNAMIC DETECTION METHODS - NO HARDCODED CONTENT

  /**
   * Dynamic category detection based ONLY on translated recipe title
   */
  private dynamicCategoryDetection(titleText: string): string {
    console.log('🎯 Dynamic category detection for:', titleText);
    
    // Direct word matching - no hardcoded arrays
    if (titleText.includes('cake') || titleText.includes('cookie') || 
        titleText.includes('pie') || titleText.includes('dessert') ||
        titleText.includes('sweet') || titleText.includes('chocolate') ||
        titleText.includes('ice cream') || titleText.includes('tart')) {
      return 'dessert';
    }
    
    if (titleText.includes('salad')) {
      return 'salad';
    }
    
    if (titleText.includes('soup') || titleText.includes('stew') ||
        titleText.includes('broth') || titleText.includes('chowder')) {
      return 'soup';
    }
    
    if (titleText.includes('bread') || titleText.includes('loaf') ||
        titleText.includes('bagel') || titleText.includes('roll')) {
      return 'bread';
    }
    
    if (titleText.includes('pasta') || titleText.includes('noodle') ||
        titleText.includes('spaghetti') || titleText.includes('linguine')) {
      return 'pasta';
    }
    
    // Default to main dish if no specific category detected
    return 'main';
  }

  /**
   * Dynamic main ingredient extraction - takes first 2-3 meaningful ingredients
   */
  private dynamicMainIngredients(ingredientTexts: string[]): string[] {
    console.log('🥕 Dynamic ingredient extraction from:', ingredientTexts);
    
    // Filter out common seasonings and take first meaningful ingredients
    const seasonings = ['salt', 'pepper', 'oil', 'water', 'sugar', 'flour', 'butter'];
    const meaningfulIngredients = ingredientTexts.filter(ingredient => {
      const lower = ingredient.toLowerCase().trim();
      return lower.length > 2 && !seasonings.some(seasoning => lower === seasoning);
    });
    
    // Take first 2-3 meaningful ingredients as main ingredients
    return meaningfulIngredients.slice(0, 3);
  }

  /**
   * Dynamic cooking method detection from title and ingredients
   */
  private dynamicCookingMethods(titleText: string, ingredientTexts: string[]): string[] {
    const methods: string[] = [];
    const allText = `${titleText} ${ingredientTexts.join(' ')}`;
    
    if (allText.includes('baked') || allText.includes('baking') || allText.includes('oven')) {
      methods.push('baked');
    }
    if (allText.includes('fried') || allText.includes('frying')) {
      methods.push('fried');
    }
    if (allText.includes('grilled') || allText.includes('grill')) {
      methods.push('grilled');
    }
    if (allText.includes('steamed') || allText.includes('steam')) {
      methods.push('steamed');
    }
    
    return methods;
  }

  /**
   * Dynamic dietary restriction detection
   */
  private dynamicDietaryDetection(titleText: string, ingredientTexts: string[]): {
    restrictions: string[];
    isVegetarian: boolean;
    isVegan: boolean;
  } {
    const allText = `${titleText} ${ingredientTexts.join(' ')}`;
    const restrictions: string[] = [];
    
    const isVegan = allText.includes('vegan');
    const isVegetarian = isVegan || allText.includes('vegetarian') || allText.includes('veggie');
    
    if (isVegan) restrictions.push('vegan');
    if (isVegetarian && !isVegan) restrictions.push('vegetarian');
    
    return { restrictions, isVegetarian, isVegan };
  }

  /**
   * Category type checking methods
   */
  private isDessertCategory(category: string): boolean {
    return category === 'dessert';
  }

  private isBreakfastCategory(category: string): boolean {
    return category === 'breakfast';
  }

  /**
   * COMPLETELY DYNAMIC query building - NO hardcoded terms
   */
  private buildPrimaryQuery(title: string, analysis: RecipeAnalysis): SearchQuery {
    console.log('🔍 Building primary query for:', title, 'Category:', analysis.recipeCategory);
    
    // Build query using ONLY the translated title and detected category
    const primaryQuery = `${title} ${analysis.recipeCategory} food`;
    
    console.log('✅ Primary query built:', primaryQuery);
    
    return {
      primary: primaryQuery,
      secondary: `${analysis.mainIngredients.slice(0, 2).join(' ')} ${analysis.recipeCategory}`,
      tertiary: `${analysis.recipeCategory} food dish`,
      keywords: ['food', analysis.recipeCategory],
      cuisineType: analysis.cuisineType,
      recipeCategory: analysis.recipeCategory,
      mainIngredients: analysis.mainIngredients
    };
  }

  private buildSecondaryQuery(analysis: RecipeAnalysis): SearchQuery {
    console.log('🔍 Building secondary query for ingredients:', analysis.mainIngredients);
    
    // Use only the actual main ingredients - no cooking method assumptions
    const primaryQuery = analysis.mainIngredients.length > 0 ? 
      `${analysis.mainIngredients.slice(0, 2).join(' ')} ${analysis.recipeCategory}` :
      `${analysis.recipeCategory} food`;
    
    console.log('✅ Secondary query built:', primaryQuery);
    
    return {
      primary: primaryQuery,
      secondary: `${analysis.recipeCategory} dish`,
      tertiary: `homemade ${analysis.recipeCategory}`,
      keywords: ['food', analysis.recipeCategory],
      cuisineType: analysis.cuisineType,
      recipeCategory: analysis.recipeCategory,
      mainIngredients: analysis.mainIngredients
    };
  }

  private buildTertiaryQuery(analysis: RecipeAnalysis): SearchQuery {
    console.log('🔍 Building tertiary query for category:', analysis.recipeCategory);
    
    // Simple category-based query - no cuisine assumptions
    const primaryQuery = `${analysis.recipeCategory} food recipe`;
    
    console.log('✅ Tertiary query built:', primaryQuery);
    
    return {
      primary: primaryQuery,
      secondary: `${analysis.recipeCategory} dish`,
      tertiary: `${analysis.recipeCategory} meal`,
      keywords: ['food', 'recipe', analysis.recipeCategory],
      cuisineType: analysis.cuisineType,
      recipeCategory: analysis.recipeCategory,
      mainIngredients: analysis.mainIngredients
    };
  }

  private buildDietaryQuery(analysis: RecipeAnalysis): SearchQuery {
    console.log('🔍 Building dietary query for vegetarian/vegan recipe');
    
    const dietaryType = analysis.isVegan ? 'vegan' : 'vegetarian';
    const primaryQuery = `${dietaryType} ${analysis.recipeCategory} food`;
    
    console.log('✅ Dietary query built:', primaryQuery);
    
    return {
      primary: primaryQuery,
      secondary: `healthy ${analysis.recipeCategory}`,
      tertiary: `plant based ${analysis.recipeCategory}`,
      keywords: [dietaryType, 'healthy', analysis.recipeCategory],
      cuisineType: analysis.cuisineType,
      recipeCategory: analysis.recipeCategory,
      mainIngredients: analysis.mainIngredients
    };
  }
}

// Singleton instance
export const intelligentImageSearch = new IntelligentImageSearchService();
export default intelligentImageSearch;
