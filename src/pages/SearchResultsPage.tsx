import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import ViewModeToggle from '../components/Layout/ViewModeToggle';
import RecipeGrid from '../components/Recipe/RecipeGrid';

const SearchResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { setSearchQuery, getFilteredRecipes } = useRecipes();

  useEffect(() => {
    setSearchQuery(query);
    return () => setSearchQuery('');
  }, [query, setSearchQuery]);

  const recipes = getFilteredRecipes();

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              תוצאות חיפוש עבור "{query}"
            </h1>
            <p className="text-gray-600 mt-2">
              נמצאו {recipes.length} מתכונים
            </p>
          </div>
          <ViewModeToggle />
        </div>

        {/* Results */}
        <RecipeGrid recipes={recipes} />
      </div>
    </div>
  );
};

export default SearchResultsPage;