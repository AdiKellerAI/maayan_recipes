import React from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowUpDown } from 'lucide-react';
import { useRecipes } from '../contexts/RecipeContext';
import CategoryNav from '../components/Layout/CategoryNav';
import ViewModeToggle from '../components/Layout/ViewModeToggle';
import RecipeGrid from '../components/Recipe/RecipeGrid';
import { categories } from '../data/categories';

const HomePage: React.FC = () => {
  const { getFilteredRecipes, selectedCategory, showFavoritesOnly, showRecentOnly, searchQuery, refreshRecipes, sortBy, setSortBy } = useRecipes();
  const recipes = getFilteredRecipes();
  const selectedCategoryData = categories.find(c => c.id === selectedCategory);
  const [isSortOpen, setIsSortOpen] = React.useState(false);


  return (
    <div className="min-h-screen">
      <CategoryNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {searchQuery
                ? `תוצאות חיפוש עבור "${searchQuery}"`
                : showRecentOnly
                ? 'מתכונים חדשים'
                : showFavoritesOnly 
                ? 'המתכונים המועדפים שלי' 
                : selectedCategoryData 
                  ? selectedCategoryData.name 
                  : 'כל המתכונים'
              }
            </h1>
            <p className="text-gray-600 mt-2">
              {searchQuery
                ? `נמצאו ${recipes.length} מתכונים`
                : showRecentOnly
                ? 'המתכונים שהועלו לאחרונה'
                : showFavoritesOnly 
                ? 'המתכונים שאהבת הכי הרבה' 
                : `${recipes.length} מתכונים`
              }
            </p>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {/* Sort Button */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`p-2 rounded-lg transition-all duration-200 transform active:scale-95 border-2 ${
                  sortBy || isSortOpen
                    ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                } mr-3 rtl:ml-3 rtl:mr-0`}
                title="מיון מתכונים"
              >
                <ArrowUpDown className="h-5 w-5" />
              </button>
              
              {isSortOpen && (
                <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">מיון</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setSortBy(''); setIsSortOpen(false); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === '' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      ללא מיון
                    </button>
                    <button
                      onClick={() => { setSortBy('name-asc'); setIsSortOpen(false); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'name-asc' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      שם מתכון (א-ת)
                    </button>
                    <button
                      onClick={() => { setSortBy('name-desc'); setIsSortOpen(false); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'name-desc' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      שם מתכון (ת-א)
                    </button>
                    <button
                      onClick={() => { setSortBy('date-newest'); setIsSortOpen(false); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'date-newest' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      תאריך העלאה (חדש לישן)
                    </button>
                    <button
                      onClick={() => { setSortBy('date-oldest'); setIsSortOpen(false); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === 'date-oldest' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      תאריך העלאה (ישן לחדש)
                    </button>
                  </div>
                </div>
              )}
            </div>
            <ViewModeToggle />
          </div>
        </div>

        {/* Recipe Grid */}
        <RecipeGrid recipes={recipes} />
      </div>
    </div>
  );
};

export default HomePage;