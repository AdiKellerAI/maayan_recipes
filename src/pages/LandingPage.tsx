import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Heart, BookOpen, Layers, X } from 'lucide-react';
import { categories } from '../data/categories';
import { useRecipes } from '../contexts/RecipeContext';

// Circle configuration for uniform random distribution
interface CircleConfig {
  id: string;
  x: number;
  y: number;
  size: string;
  color: string;
  opacity: number;
  animation: string;
  delay: string;
  fadeInDelay: number;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshRecipes } = useRecipes();
  const [showCategories, setShowCategories] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasPreloaded, setHasPreloaded] = useState(false);
  const [visibleCircles, setVisibleCircles] = useState<Set<string>>(new Set());

  // Circle properties arrays to maintain existing visual variety
  const circleColors = [
    'bg-orange-200', 'bg-yellow-200', 'bg-amber-200', 'bg-orange-100', 'bg-red-200', 
    'bg-pink-200', 'bg-rose-200', 'bg-red-100', 'bg-blue-200', 'bg-indigo-200', 
    'bg-sky-200', 'bg-blue-100', 'bg-green-200', 'bg-teal-200', 'bg-emerald-200', 
    'bg-green-100', 'bg-purple-200', 'bg-violet-200', 'bg-purple-100', 'bg-cyan-200', 
    'bg-teal-100', 'bg-cyan-100', 'bg-slate-200', 'bg-pink-100', 'bg-yellow-100', 
    'bg-lime-200', 'bg-emerald-100', 'bg-sky-100', 'bg-indigo-100', 'bg-violet-100', 
    'bg-fuchsia-200', 'bg-lime-100', 'bg-amber-100'
  ];

  const circleSizes = [
    'w-4 h-4', 'w-5 h-5', 'w-6 h-6', 'w-7 h-7', 'w-8 h-8', 'w-9 h-9', 
    'w-10 h-10', 'w-11 h-11', 'w-12 h-12', 'w-13 h-13', 'w-14 h-14', 
    'w-15 h-15', 'w-16 h-16', 'w-18 h-18'
  ];

  const circleAnimations = [
    'animate-float-slow', 'animate-float-medium', 'animate-float-fast',
    'animate-float-slow-delayed', 'animate-float-medium-delayed', 'animate-float-fast-delayed',
    'animate-float-random1', 'animate-float-random2', 'animate-float-random3',
    'animate-float-random4', 'animate-float-random5', 'animate-float-random6',
    'animate-float-ultra-fast1', 'animate-float-ultra-fast2', 'animate-float-ultra-fast3'
  ];

  const circleOpacities = [0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70];

  const circleDelays = [
    'delay-200', 'delay-300', 'delay-400', 'delay-500', 'delay-600', 'delay-700',
    'delay-800', 'delay-900', 'delay-1000', 'delay-1100', 'delay-1200', 'delay-1350', 'delay-1450'
  ];

  // Fade-in animation delays (random timing up to 0.5 seconds in milliseconds - 4x faster)
  const fadeInDelays = [
    0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275,
    300, 325, 350, 375, 400, 425, 450, 475, 500
  ];

  // Generate uniformly distributed circles using useMemo to prevent regeneration on re-renders
  const backgroundCircles = useMemo(() => {
    const circles: CircleConfig[] = [];
    
    // Default viewport dimensions for SSR compatibility
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    // Responsive circle count - fewer circles on mobile, more spread out
    const isMobile = viewportWidth < 768;
    const totalCircles = isMobile ? 45 : 85; // Reduced from 85 to 45 on mobile
    
    // Use a seeded random approach for consistent results
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Generate circles with improved uniform distribution using grid-based approach with jitter
    const margin = isMobile ? 30 : 50; // Smaller margin on mobile for more spread
    const availableWidth = viewportWidth - 2 * margin;
    const availableHeight = viewportHeight - 2 * margin;
    
    // Calculate grid dimensions for better distribution
    const gridCols = Math.ceil(Math.sqrt(totalCircles * (availableWidth / availableHeight)));
    const gridRows = Math.ceil(totalCircles / gridCols);
    const cellWidth = availableWidth / gridCols;
    const cellHeight = availableHeight / gridRows;
    
    for (let i = 0; i < totalCircles; i++) {
      // Calculate grid position
      const gridCol = i % gridCols;
      const gridRow = Math.floor(i / gridCols);
      
      // Calculate base position in grid cell
      const baseCellX = gridCol * cellWidth;
      const baseCellY = gridRow * cellHeight;
      
      // Add jitter within cell for natural randomness (using seeded random)
      const jitterSeedX = i * 7 + 1;
      const jitterSeedY = i * 11 + 3;
      // Increase jitter on mobile to spread circles more
      const jitterMultiplier = isMobile ? 0.9 : 0.8; 
      const jitterAmountX = cellWidth * jitterMultiplier;
      const jitterAmountY = cellHeight * jitterMultiplier;
      
      const jitterX = (seededRandom(jitterSeedX) - 0.5) * jitterAmountX;
      const jitterY = (seededRandom(jitterSeedY) - 0.5) * jitterAmountY;
      
      // Final position with margin and jitter
      const x = margin + baseCellX + cellWidth/2 + jitterX;
      const y = margin + baseCellY + cellHeight/2 + jitterY;
      
      // Ensure circles stay within bounds
      const clampedX = Math.max(margin, Math.min(viewportWidth - margin, x));
      const clampedY = Math.max(margin, Math.min(viewportHeight - margin, y));
      
      // Randomly select properties using the seeded approach
      const colorSeed = i * 13 + 5;
      const sizeSeed = i * 17 + 7;
      const animationSeed = i * 19 + 9;
      const opacitySeed = i * 23 + 11;
      const delaySeed = i * 29 + 13;
      const fadeInSeed = i * 31 + 17;
      
      circles.push({
        id: `circle-${i}`,
        x: clampedX,
        y: clampedY,
        size: circleSizes[Math.floor(seededRandom(sizeSeed) * circleSizes.length)],
        color: circleColors[Math.floor(seededRandom(colorSeed) * circleColors.length)],
        opacity: circleOpacities[Math.floor(seededRandom(opacitySeed) * circleOpacities.length)],
        animation: circleAnimations[Math.floor(seededRandom(animationSeed) * circleAnimations.length)],
        delay: circleDelays[Math.floor(seededRandom(delaySeed) * circleDelays.length)],
        fadeInDelay: fadeInDelays[Math.floor(seededRandom(fadeInSeed) * fadeInDelays.length)]
      });
    }
    
    // Log distribution statistics for verification (development only)
    if (process.env.NODE_ENV === 'development') {
      const xValues = circles.map(c => c.x);
      const yValues = circles.map(c => c.y);
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);
      const yMin = Math.min(...yValues);
      const yMax = Math.max(...yValues);
      
      console.log('Uniform Circle Distribution Stats:', {
        totalCircles: circles.length,
        grid: { cols: gridCols, rows: gridRows, cellSize: `${cellWidth.toFixed(1)}x${cellHeight.toFixed(1)}` },
        xRange: { min: Math.round(xMin), max: Math.round(xMax), span: Math.round(xMax - xMin) },
        yRange: { min: Math.round(yMin), max: Math.round(yMax), span: Math.round(yMax - yMin) },
        viewport: { width: viewportWidth, height: viewportHeight },
        coverage: { 
          xCoverage: Math.round((xMax - xMin) / viewportWidth * 100) + '%',
          yCoverage: Math.round((yMax - yMin) / viewportHeight * 100) + '%'
        }
      });
    }
    
    return circles;
  }, []); // Empty dependency array ensures circles are generated only once

  const handleNavigation = (type: string) => {
    switch (type) {
      case 'recipes':
        // Preload all recipes before navigation
        const preloadAllRecipes = async () => {
          try {
            await refreshRecipes();
          } catch (error) {
            console.log('Preloading all recipes...');
          }
        };
        preloadAllRecipes();
        navigate('/recipes');
        break;
      case 'favorites':
        // Preload favorite recipes before navigation
        const preloadFavorites = async () => {
          try {
            await refreshRecipes();
          } catch (error) {
            console.log('Preloading favorites...');
          }
        };
        preloadFavorites();
        navigate('/recipes?favorites=true');
        break;
      case 'categories':
        setShowCategories(true);
        break;
      case 'search':
        setShowSearch(true);
        break;
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setShowCategories(false);
    // Preload recipes for the selected category before navigation
    const preloadCategoryRecipes = async () => {
      try {
        await refreshRecipes();
      } catch (error) {
        console.log('Preloading category recipes...');
      }
    };
    preloadCategoryRecipes();
    navigate(`/recipes?category=${categoryId}`);
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setShowSearch(false);
      navigate(`/recipes?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  // Scroll to top whenever LandingPage is shown - only once on mount
  useEffect(() => {
    // Force scroll to top immediately and prevent any scroll restoration
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    
    scrollToTop();
    
    // Also prevent browser scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Cleanup function to restore scroll behavior when leaving
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // Handle fade-in animation for circles
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    backgroundCircles.forEach((circle) => {
      const timeout = setTimeout(() => {
        setVisibleCircles(prev => new Set([...prev, circle.id]));
      }, circle.fadeInDelay);
      timeouts.push(timeout);
    });
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [backgroundCircles]);

  // Preload recipes from all categories for faster navigation
  useEffect(() => {
    if (!hasPreloaded) {
      // Start preloading recipes in the background
      const preloadRecipes = async () => {
        try {
          // This will trigger the loading of recipes from all categories
          await refreshRecipes();
          setHasPreloaded(true);
        } catch (error) {
          console.log('Preloading recipes...');
        }
      };
      
      // Start preloading after a short delay to not block the UI
      const timer = setTimeout(preloadRecipes, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [hasPreloaded, refreshRecipes]);

  // Disable scrolling on landing page
  useEffect(() => {
    // Disable scrolling when component mounts
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Background Decorative Circles - Uniformly Distributed */}
      <div className="absolute inset-0 pointer-events-none">
        {backgroundCircles.map((circle) => (
          <div
            key={circle.id}
            className={`absolute rounded-full shadow-lg animate-pulse ${circle.size} ${circle.color} ${circle.animation} ${circle.delay} circle-fade-in ${visibleCircles.has(circle.id) ? 'visible' : ''}`}
            style={{
              left: `${circle.x}px`,
              top: `${circle.y}px`,
              '--circle-opacity': circle.opacity,
            } as React.CSSProperties & { '--circle-opacity': number }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <div className="relative z-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/30"></div>
        
        {/* Logo Section */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[20vh] px-4 pt-1">
          {/* Elegant Logo - without container */}
          <div className="mb-1">
            <div className="relative">
              {/* Logo Image */}
              <div className="flex justify-center">
                <img 
                  src="/Maayan_HD.svg" 
                  alt="Maayan Kitchen Logo" 
                  className="h-52 md:h-64 w-auto object-contain"
                  style={{
                    transform: 'none',
                    filter: 'none',
                    WebkitTransform: 'none',
                    WebkitFilter: 'none',
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Options */}
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Recipes */}
              <div
                onClick={() => handleNavigation('recipes')}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-white/30 p-3 md:p-6 hover:shadow-xl transition-all duration-300 hover:bg-white/90 max-w-sm md:max-w-none mx-auto md:mx-0">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 group-hover:from-blue-500/20 group-hover:to-purple-600/20 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 md:space-x-4 rtl:space-x-reverse mb-2 md:mb-4">
                      <div className="p-1.5 md:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                        <BookOpen className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-xl font-semibold text-gray-900 group-hover:text-gray-800 transition-colors">
                          מתכונים
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                          גלה מתכונים טעימים ופשוטים
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl"></div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-blue-500/20 transition-all duration-300"></div>
                </div>
              </div>

              {/* Favorites */}
              <div
                onClick={() => handleNavigation('favorites')}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-white/30 p-3 md:p-6 hover:shadow-xl transition-all duration-300 hover:bg-white/90 max-w-sm md:max-w-none mx-auto md:mx-0">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/10 to-pink-600/10 group-hover:from-red-500/20 group-hover:to-pink-600/20 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 md:space-x-4 rtl:space-x-reverse mb-2 md:mb-4">
                      <div className="p-1.5 md:p-3 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-lg">
                        <Heart className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-xl font-semibold text-gray-900 group-hover:text-gray-800 transition-colors">
                          מועדפים
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                          המתכונים האהובים עליך
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl"></div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-red-500/20 transition-all duration-300"></div>
                </div>
              </div>

              {/* Categories */}
              <div
                onClick={() => handleNavigation('categories')}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-white/30 p-3 md:p-6 hover:shadow-xl transition-all duration-300 hover:bg-white/90 max-w-sm md:max-w-none mx-auto md:mx-0">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/10 to-teal-600/10 group-hover:from-green-500/20 group-hover:to-teal-600/20 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 md:space-x-4 rtl:space-x-reverse mb-2 md:mb-4">
                      <div className="p-1.5 md:p-3 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-lg">
                        <Layers className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-xl font-semibold text-gray-900 group-hover:text-gray-800 transition-colors">
                          קטגוריות
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                          חפש לפי סוג מאכל
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl"></div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-green-500/20 transition-all duration-300"></div>
                </div>
              </div>

              {/* Search */}
              <div
                onClick={() => handleNavigation('search')}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-white/30 p-3 md:p-6 hover:shadow-xl transition-all duration-300 hover:bg-white/90 max-w-sm md:max-w-none mx-auto md:mx-0">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/10 to-yellow-600/10 group-hover:from-orange-500/20 group-hover:to-yellow-600/20 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 md:space-x-4 rtl:space-x-reverse mb-2 md:mb-4">
                      <div className="p-1.5 md:p-3 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-600 text-white shadow-lg">
                        <Search className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-xl font-semibold text-gray-900 group-hover:text-gray-800 transition-colors">
                          חיפוש
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                          מצא מתכונים ספציפיים
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl"></div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-orange-500/20 transition-all duration-300"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 text-lg font-medium">
              ברוכים הבאים למטבח הביתי שלי
            </p>
            <p className="text-gray-500 text-sm mt-2">
              בחרו באחת האפשרויות למעלה כדי להתחיל
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Section */}
      <div className="relative h-32 bg-gradient-to-t from-orange-50/50 to-transparent">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent"></div>
      </div>

      {/* Categories Modal - Updated Design */}
      {showCategories && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">בחר קטגוריה</h2>
                <button
                  onClick={() => setShowCategories(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* All Categories Button */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    setShowCategories(false);
                    // Preload all recipes before navigation
                    const preloadAllRecipes = async () => {
                      try {
                        await refreshRecipes();
                      } catch (error) {
                        console.log('Preloading all recipes...');
                      }
                    };
                    preloadAllRecipes();
                    navigate('/recipes');
                  }}
                  className="px-6 py-3 rounded-full text-sm font-medium transition-colors bg-primary-500 text-white hover:bg-primary-600"
                >
                  כל המתכונים
                </button>
              </div>
              
              {/* Categories - Arranged by text length */}
              <div className="flex flex-wrap gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className="group cursor-pointer"
                  >
                    <button className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-3 rounded-full text-sm font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 group-hover:bg-primary-500 group-hover:text-white whitespace-nowrap">
                      <span className="text-lg">{category.icon}</span>
                      <span>{category.name}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">חיפוש מתכונים</h2>
                <button
                  onClick={() => setShowSearch(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="הקלד שם מתכון, מרכיב או הוראות..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  autoFocus
                />
              </div>
              <div className="text-center">
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white px-8 py-3 rounded-xl hover:from-orange-600 hover:to-yellow-700 transition-all duration-300 font-medium text-lg shadow-lg"
                >
                  חפש מתכונים
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-gray-600 text-sm">
                  לחץ Enter או על כפתור החיפוש כדי להתחיל
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
