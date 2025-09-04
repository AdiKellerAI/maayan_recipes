// Interface for additional recipe sections (like sauce, dough, filling, etc.)
export interface RecipeSection {
  title?: string;
  ingredients: string[];
  directions: string[];
}

export interface Recipe {
  id: string;
  title: string;
  images: string[];
  category: string;
  ingredients?: string[]; // Made optional - can be empty array or undefined
  directions?: string[]; // Made optional - can be empty array or undefined
  additional_instructions?: { [key: string]: string[] }; // Legacy - keeping for backward compatibility
  additional_sections?: { [key: string]: RecipeSection }; // New sections with both ingredients and directions
  prep_time?: string;
  difficulty?: 'קל' | 'בינוני' | 'קשה';
  is_favorite: boolean;
  current_step?: number;
  created_at: Date;
  updated_at: Date;
}

export interface RecipeInsert {
  title: string;
  images?: string[];
  category: string;
  ingredients?: string[]; // Made optional - can be empty array or undefined
  directions?: string[]; // Made optional - can be empty array or undefined
  additional_instructions?: { [key: string]: string[] }; // Legacy - keeping for backward compatibility
  additional_sections?: { [key: string]: RecipeSection }; // New sections with both ingredients and directions
  prep_time?: string;
  difficulty?: 'קל' | 'בינוני' | 'קשה';
  is_favorite?: boolean;
  current_step?: number;
}

export interface RecipeUpdate {
  title?: string;
  images?: string[];
  category?: string;
  ingredients?: string[]; // Already optional in update interface
  directions?: string[]; // Already optional in update interface
  additional_instructions?: { [key: string]: string[] }; // Legacy - keeping for backward compatibility
  additional_sections?: { [key: string]: RecipeSection }; // New sections with both ingredients and directions
  prep_time?: string;
  difficulty?: 'קל' | 'בינוני' | 'קשה';
  is_favorite?: boolean;
  current_step?: number;
}

export interface RecipeCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export type ViewMode = 'large' | 'medium' | 'list';

// Validation helper function
export const validateRecipeContent = (recipe: Partial<Recipe>): { isValid: boolean; error?: string } => {
  const hasMainIngredients = recipe.ingredients && recipe.ingredients.length > 0;
  const hasMainDirections = recipe.directions && recipe.directions.length > 0;
  
  // Check if additional sections exist and have content
  let hasAdditionalSections = false;
  if (recipe.additional_sections && Object.keys(recipe.additional_sections).length > 0) {
    hasAdditionalSections = Object.values(recipe.additional_sections).some(section => 
      (section.ingredients && section.ingredients.length > 0) || 
      (section.directions && section.directions.length > 0)
    );
  }
  
  if (!hasMainIngredients && !hasMainDirections && !hasAdditionalSections) {
    return {
      isValid: false,
      error: 'Recipe must have at least one of: main ingredients, main directions, or additional sections'
    };
  }
  
  return { isValid: true };
};