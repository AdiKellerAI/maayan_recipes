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
  ingredients: string[];
  directions: string[];
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
  ingredients: string[];
  directions: string[];
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
  ingredients?: string[];
  directions?: string[];
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