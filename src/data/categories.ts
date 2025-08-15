import { RecipeCategory } from '../types/recipe';

export const categories: RecipeCategory[] = [
  { id: 'salads', name: 'סלטים', icon: '🥗', description: '' },
  { id: 'soups', name: 'מרקים', icon: '🍲', description: '' },
  { id: 'meat', name: 'בשר', icon: '🥩', description: '' },
  { id: 'pastries', name: 'מאפים', icon: '🥐', description: '' },
  { id: 'cakes', name: 'עוגות', icon: '🎂', description: '' },
  { id: 'cookies', name: 'עוגיות', icon: '🍪', description: '' },
  { id: 'desserts', name: 'קינוחים', icon: '🍨', description: '' },
  { id: 'breakfast', name: 'ארוחות בוקר', icon: '🥚', description: '' },
  { id: 'sides', name: 'תוספות', icon: '🥘', description: '' },
  { id: 'sauces', name: 'רטבים', icon: '🥣', description: '' },
  { id: 'healthy', name: 'בריא', icon: '🥑', description: '' }
];

export const getCategoryColor = (categoryId: string) => {
  const colors = {
    salads: 'bg-accent-100 text-accent-700',
    soups: 'bg-secondary-100 text-secondary-700',
    meat: 'bg-red-100 text-red-700',
    pastries: 'bg-secondary-100 text-secondary-700',
    cakes: 'bg-primary-100 text-primary-700',
    cookies: 'bg-secondary-100 text-secondary-700',
    desserts: 'bg-primary-100 text-primary-700',
    breakfast: 'bg-accent-100 text-accent-700',
    sides: 'bg-neutral-100 text-neutral-700',
    sauces: 'bg-orange-100 text-orange-700',
    healthy: 'bg-green-100 text-green-700'
  };
  return colors[categoryId as keyof typeof colors] || 'bg-neutral-100 text-neutral-700';
};