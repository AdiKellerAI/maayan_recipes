import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Custom hook to handle direct recipe URL access and validation
 * This ensures recipe URLs work when accessed directly (shared links)
 */
export const useRecipeUrlHandler = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isValidRecipeUrl, setIsValidRecipeUrl] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // UUID v4 pattern for recipe IDs
  const recipeIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  useEffect(() => {
    const handleDirectRecipeAccess = async () => {
      // Check if we have a stored direct recipe access from index.html
      const directRecipePath = sessionStorage.getItem('directRecipeAccess');
      if (directRecipePath) {
        console.log('🔍 Handling direct recipe access:', directRecipePath);
        sessionStorage.removeItem('directRecipeAccess');
        // URL is already correct, React Router will handle it
        return;
      }

      // Validate current recipe ID if we're on a recipe page
      if (id && window.location.pathname.startsWith('/recipe/')) {
        setIsLoading(true);
        
        // Check if the ID matches UUID pattern
        if (!recipeIdPattern.test(id)) {
          console.log('❌ Invalid recipe ID format:', id);
          setIsValidRecipeUrl(false);
          setIsLoading(false);
          return;
        }

        // The ID format is valid, let the RecipeDetailPage handle loading
        setIsValidRecipeUrl(true);
        setIsLoading(false);
      }
    };

    handleDirectRecipeAccess();
  }, [id, recipeIdPattern]);

  const redirectToRecipes = () => {
    navigate('/recipes');
  };

  return {
    isValidRecipeUrl,
    isLoading,
    redirectToRecipes,
    recipeId: id
  };
};
