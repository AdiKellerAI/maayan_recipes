import React from 'react';
import { useRecipeUrlHandler } from '../hooks/useRecipeUrlHandler';

interface RecipeUrlFallbackProps {
  children: React.ReactNode;
}

/**
 * Fallback component that handles invalid recipe URLs
 * Shows loading state or error message for invalid recipe access
 */
const RecipeUrlFallback: React.FC<RecipeUrlFallbackProps> = ({ children }) => {
  const { isValidRecipeUrl, isLoading, redirectToRecipes } = useRecipeUrlHandler();

  // Show loading state while validating URL
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600">
        <div className="text-center text-white" dir="rtl">
          <div className="text-2xl font-bold mb-4">המטבח של מעיין</div>
          <div className="text-lg opacity-90">טוען מתכון...</div>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error for invalid recipe URLs
  if (isValidRecipeUrl === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600">
        <div className="text-center text-white max-w-md mx-auto px-4" dir="rtl">
          <div className="text-2xl font-bold mb-4">המטבח של מעיין</div>
          <div className="text-lg mb-6">המתכון לא נמצא</div>
          <div className="text-base opacity-90 mb-8">
            ייתכן שהמתכון נמחק או שהקישור לא תקין
          </div>
          <button
            onClick={redirectToRecipes}
            className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
          >
            חזרה למתכונים
          </button>
        </div>
      </div>
    );
  }

  // Render children for valid recipe URLs
  return <>{children}</>;
};

export default RecipeUrlFallback;
