export interface Recipe {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  ingredients: string[];
  directions: string[];
  additional_instructions?: { [key: string]: string[] };
  prep_time?: string;
  difficulty?: 'קל' | 'בינוני' | 'קשה';
  is_favorite: boolean;
  current_step?: number;
  created_at: Date;
  updated_at: Date;
}

export interface RecipeInsert {
  title: string;
  description?: string;
  images?: string[];
  category: string;
  ingredients: string[];
  directions: string[];
  additional_instructions?: { [key: string]: string[] };
  prep_time?: string;
  difficulty?: 'קל' | 'בינוני' | 'קשה';
  is_favorite?: boolean;
  current_step?: number;
}

export interface RecipeUpdate {
  title?: string;
  description?: string;
  images?: string[];
  category?: string;
  ingredients?: string[];
  directions?: string[];
  additional_instructions?: { [key: string]: string[] };
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