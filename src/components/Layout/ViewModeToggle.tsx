import React from 'react';
import { Grid3X3, Grid2X2, List } from 'lucide-react';
import { useRecipes } from '../../contexts/RecipeContext';
import { ViewMode } from '../../types/recipe';

const ViewModeToggle: React.FC = () => {
  const { viewMode, setViewMode } = useRecipes();

  const modes: Array<{ mode: ViewMode; icon: React.ReactNode; label: string }> = [
    { mode: 'large', icon: <Grid2X2 className="h-4 w-4" />, label: 'תצוגה גדולה' },
    { mode: 'medium', icon: <Grid3X3 className="h-4 w-4" />, label: 'תצוגה בינונית' },
    { mode: 'list', icon: <List className="h-4 w-4" />, label: 'תצוגת רשימה' }
  ];

  return (
    <div className="flex items-center space-x-1 rtl:space-x-reverse bg-gray-100 rounded-lg p-1 order-first">
      {modes.map(({ mode, icon, label }) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          title={label}
          className={`p-2 rounded-md transition-colors ${
            viewMode === mode 
              ? 'bg-white text-primary-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:scale-95 transform'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

export default ViewModeToggle;