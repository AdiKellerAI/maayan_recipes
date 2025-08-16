import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { categories } from '../../data/categories';
import { useRecipes } from '../../contexts/RecipeContext';
import { getCategoryColor } from '../../data/categories';
import { useLocation } from 'react-router-dom';

const CategoryNav: React.FC = () => {
  const { selectedCategory, setSelectedCategory } = useRecipes();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure category selection is synchronized with URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam && categoryParam !== selectedCategory) {
      setSelectedCategory(categoryParam);
    }
  }, [location.search, selectedCategory, setSelectedCategory]);

  // Auto-scroll to selected category only once when component mounts with a category in URL
  useEffect(() => {
    if (containerRef.current) {
      // Get category from URL
      const urlParams = new URLSearchParams(location.search);
      const categoryParam = urlParams.get('category');
      
      if (categoryParam) {
        // Simple timeout to ensure DOM is ready
        const timer = setTimeout(() => {
          const selectedButton = containerRef.current?.querySelector(`[data-category="${categoryParam}"]`) as HTMLElement;
          
          if (selectedButton && containerRef.current) {
            // Calculate scroll position to center the selected category
            const container = containerRef.current;
            const buttonLeft = selectedButton.offsetLeft;
            const buttonWidth = selectedButton.offsetWidth;
            const containerWidth = container.offsetWidth;
            
            // Scroll to center the selected category
            const scrollLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
            
            // Immediate scroll
            container.scrollLeft = Math.max(0, scrollLeft);
          }
        }, 50);
        
        return () => clearTimeout(timer);
      }
    }
  }, []); // Only run once when component mounts

  return (
    <div className="bg-white border-b border-gray-200 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={containerRef} className="flex space-x-2 rtl:space-x-reverse overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('')}
            data-category=""
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === '' 
                ? 'bg-primary-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            הכל
          </button>
          {categories.map((category) => {
            return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              data-category={category.id}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-1 rtl:space-x-reverse ${
                selectedCategory === category.id 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              <span>{category.name}</span>
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryNav;