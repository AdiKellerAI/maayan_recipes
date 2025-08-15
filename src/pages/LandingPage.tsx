import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Heart, BookOpen, Layers, X } from 'lucide-react';
import { categories } from '../data/categories';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCategories, setShowCategories] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavigation = (type: string) => {
    switch (type) {
      case 'recipes':
        navigate('/?recipes=true');
        break;
      case 'favorites':
        navigate('/?favorites=true');
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
    navigate(`/?category=${categoryId}`);
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setShowSearch(false);
      navigate(`/?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Background Decorative Circles - Redistributed */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top left area */}
        <div className="absolute top-12 left-16 w-14 h-14 bg-orange-200 rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute top-24 left-8 w-8 h-8 bg-yellow-200 rounded-full opacity-35 animate-pulse delay-500"></div>
        
        {/* Top right area */}
        <div className="absolute top-20 right-20 w-16 h-16 bg-red-200 rounded-full opacity-50 animate-pulse delay-700"></div>
        <div className="absolute top-32 right-12 w-6 h-6 bg-pink-200 rounded-full opacity-45 animate-pulse delay-300"></div>
        
        {/* Middle left area */}
        <div className="absolute top-1/2 left-24 w-12 h-12 bg-blue-200 rounded-full opacity-60 animate-pulse delay-1000"></div>
        <div className="absolute top-2/3 left-16 w-10 h-10 bg-indigo-200 rounded-full opacity-40 animate-pulse delay-400"></div>
        
        {/* Middle right area */}
        <div className="absolute top-1/3 right-32 w-18 h-18 bg-green-200 rounded-full opacity-35 animate-pulse delay-800"></div>
        <div className="absolute top-3/4 right-20 w-8 h-8 bg-teal-200 rounded-full opacity-50 animate-pulse delay-600"></div>
        
        {/* Bottom left area */}
        <div className="absolute bottom-28 left-20 w-16 h-16 bg-purple-200 rounded-full opacity-45 animate-pulse delay-900"></div>
        <div className="absolute bottom-16 left-32 w-10 h-10 bg-amber-200 rounded-full opacity-30 animate-pulse delay-1200"></div>
        
        {/* Bottom right area */}
        <div className="absolute bottom-24 right-16 w-12 h-12 bg-cyan-200 rounded-full opacity-40 animate-pulse delay-1100"></div>
        <div className="absolute bottom-36 right-28 w-14 h-14 bg-rose-200 rounded-full opacity-35 animate-pulse delay-700"></div>
        
        {/* Center floating circles */}
        <div className="absolute top-40 left-1/3 w-6 h-6 bg-slate-200 rounded-full opacity-50 animate-pulse delay-400"></div>
        <div className="absolute top-60 right-1/3 w-8 h-8 bg-emerald-200 rounded-full opacity-40 animate-pulse delay-800"></div>
        <div className="absolute top-80 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-violet-200 rounded-full opacity-45 animate-pulse delay-600"></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/30"></div>
        
        {/* Logo Section */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4 pt-8">
          {/* Elegant Logo - without container */}
          <div className="mb-6 md:mb-8">
            <div className="relative">
              {/* MK Logo */}
              <div className="text-6xl md:text-8xl font-serif font-bold text-gray-900 tracking-tight">
                <span className="relative">
                  M
                  <div className="absolute -bottom-1 md:-bottom-2 left-0 right-0 h-0.5 md:h-1 bg-gradient-to-r from-orange-400 to-red-500 rounded-full opacity-60"></div>
                </span>
                <span className="relative ml-1 md:ml-2">
                  K
                  <div className="absolute -bottom-1 md:-bottom-2 left-0 right-0 h-0.5 md:h-1 bg-gradient-to-r from-red-500 to-orange-400 rounded-full opacity-60"></div>
                </span>
              </div>
              
              {/* Subtitle */}
              <div className="text-center mt-3 md:mt-4">
                <h1 className="text-xl md:text-2xl font-light text-gray-700 mb-1 md:mb-2">המטבח של מעיין</h1>
                <p className="text-sm md:text-base text-gray-500 font-medium">בישול ביתי, פשוט וטעים</p>
              </div>
            </div>
          </div>

          {/* Navigation Options */}
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Recipes */}
              <div
                onClick={() => handleNavigation('recipes')}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-white/30 p-4 md:p-6 hover:shadow-xl transition-all duration-300 hover:bg-white/90">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10 group-hover:from-blue-500/20 group-hover:to-purple-600/20 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 md:space-x-4 rtl:space-x-reverse mb-3 md:mb-4">
                      <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                        <BookOpen className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold text-gray-900 group-hover:text-gray-800 transition-colors">
                          מתכונים
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                          גלה מתכונים טעימים ופשוטים
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-blue-500/20 transition-all duration-300"></div>
                </div>
              </div>

              {/* Favorites */}
              <div
                onClick={() => handleNavigation('favorites')}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-white/30 p-4 md:p-6 hover:shadow-xl transition-all duration-300 hover:bg-white/90">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-600/10 group-hover:from-red-500/20 group-hover:to-pink-600/20 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 md:space-x-4 rtl:space-x-reverse mb-3 md:mb-4">
                      <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-lg">
                        <Heart className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold text-gray-900 group-hover:text-gray-800 transition-colors">
                          מועדפים
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                          המתכונים האהובים עליך
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-red-500/20 transition-all duration-300"></div>
                </div>
              </div>

              {/* Categories */}
              <div
                onClick={() => handleNavigation('categories')}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-white/30 p-4 md:p-6 hover:shadow-xl transition-all duration-300 hover:bg-white/90">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-teal-600/10 group-hover:from-green-500/20 group-hover:to-teal-600/20 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 md:space-x-4 rtl:space-x-reverse mb-3 md:mb-4">
                      <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-lg">
                        <Layers className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold text-gray-900 group-hover:text-gray-800 transition-colors">
                          קטגוריות
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                          חפש לפי סוג מאכל
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-green-500/20 transition-all duration-300"></div>
                </div>
              </div>

              {/* Search */}
              <div
                onClick={() => handleNavigation('search')}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-white/30 p-4 md:p-6 hover:shadow-xl transition-all duration-300 hover:bg-white/90">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-yellow-600/10 group-hover:from-orange-500/20 group-hover:to-yellow-600/20 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 md:space-x-4 rtl:space-x-reverse mb-3 md:mb-4">
                      <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-600 text-white shadow-lg">
                        <Search className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold text-gray-900 group-hover:text-gray-800 transition-colors">
                          חיפוש
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                          מצא מתכונים ספציפיים
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-orange-500/20 transition-all duration-300"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 text-lg font-medium">
              ברוכים הבאים למטבח הביתי שלכם
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
                    navigate('/?recipes=true');
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="הקלד שם מתכון, מרכיב או הוראות..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  autoFocus
                />
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Search className="h-5 w-5" />
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
