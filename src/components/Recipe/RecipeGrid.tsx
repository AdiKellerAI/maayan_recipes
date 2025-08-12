import React from 'react';
import { Recipe } from '../../types/recipe';
import { useRecipes } from '../../contexts/RecipeContext';
import RecipeCard from './RecipeCard';
import { Loader2 } from 'lucide-react';

interface RecipeGridProps {
  recipes: Recipe[];
}

const RecipeGrid: React.FC<RecipeGridProps> = ({ recipes }) => {
  const { viewMode, loading, error } = useRecipes();

  const getGridClasses = () => {
    switch (viewMode) {
      case 'large':
        return 'grid grid-cols-1 gap-6';
      case 'medium':
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4';
      case 'list':
        return 'space-y-3';
      default:
        return 'grid grid-cols-1 gap-6';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">טוען מתכונים...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">שגיאה בטעינת המתכונים</h3>
        <p className="text-gray-600">{error}</p>
        <p className="text-sm text-gray-500 mt-2">
          ודא שמסד הנתונים מוגדר כראוי
        </p>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">🍽️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו מתכונים</h3>
        <p className="text-gray-600">נסה לחפש משהו אחר או הוסף מתכון חדש</p>
      </div>
    );
  }

  return (
    <div className={`${getGridClasses()} animate-fadeIn`}>
      {recipes.map((recipe) => (
        <div key={recipe.id} className="animate-slideUp" style={{ animationDelay: `${Math.min(recipes.indexOf(recipe) * 50, 500)}ms` }}>
          <RecipeCard recipe={recipe} viewMode={viewMode} />
        </div>
      ))}
    </div>
  );
};

export default RecipeGrid;