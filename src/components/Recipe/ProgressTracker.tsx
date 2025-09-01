import React from 'react';
import { Check } from 'lucide-react';
import { recipeProgressCache } from '../../lib/cache';
import type { RecipeSection } from '../../types/recipe';

interface ProgressTrackerProps {
  recipeId: string;
  directions: string[];
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
  additionalInstructions?: { [key: string]: string[] };
  additionalSections?: { [key: string]: RecipeSection };
  onAdditionalStepClick?: (sectionName: string, stepIndex: number) => void;
  additionalCurrentSteps?: { [key: string]: number };
  hideAdditionalSections?: boolean; // when true, do not render additional sections here
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  recipeId,
  directions,
  currentStep,
  onStepClick,
  additionalInstructions = {},
  additionalSections = {},
  onAdditionalStepClick,
  additionalCurrentSteps = {},
  hideAdditionalSections = false
}) => {
  // Initialize state from cache or props
  const [localCurrentStep, setLocalCurrentStep] = React.useState(() => {
    const cachedProgress = recipeProgressCache.loadProgress(recipeId);
    return cachedProgress?.currentStep ?? currentStep;
  });
  
  const [localAdditionalSteps, setLocalAdditionalSteps] = React.useState(() => {
    const cachedProgress = recipeProgressCache.loadProgress(recipeId);
    return cachedProgress?.additionalSteps ?? additionalCurrentSteps;
  });

  const handleStepClick = (stepIndex: number) => {
    const newStep = stepIndex === localCurrentStep ? stepIndex + 1 : stepIndex;
    setLocalCurrentStep(newStep);
    
    // Save progress to cache
    recipeProgressCache.saveProgress(recipeId, newStep, localAdditionalSteps);
    
    onStepClick(stepIndex);
  };

  const handleAdditionalStepClick = (sectionName: string, stepIndex: number) => {
    const currentSectionStep = localAdditionalSteps[sectionName] || 0;
    const newStep = stepIndex === currentSectionStep ? stepIndex + 1 : stepIndex;
    const newAdditionalSteps = {
      ...localAdditionalSteps,
      [sectionName]: newStep
    };
    
    setLocalAdditionalSteps(newAdditionalSteps);
    
    // Save progress to cache
    recipeProgressCache.saveProgress(recipeId, localCurrentStep, newAdditionalSteps);
    
    onAdditionalStepClick?.(sectionName, stepIndex);
  };

  return (
    <div className="space-y-6">
      {/* Main Directions */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">הוראות הכנה</h2>
        <ol className="space-y-2">
          {directions.map((direction, index) => {
            const isCompleted = index < localCurrentStep;
            const isCurrent = index === localCurrentStep;
            
            return (
              <li key={index} className="flex space-x-4 rtl:space-x-reverse group">
                <button
                  onClick={() => handleStepClick(index)}
                  className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold transition-all duration-300 hover:scale-110 touch-manipulation shadow-sm ${
                    isCompleted
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-200'
                      : isCurrent
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-orange-200 ring-2 ring-orange-200/50'
                      : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 hover:from-slate-200 hover:to-slate-300'
                  }`}
                  style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm">{index + 1}</span>
                  )}
                </button>
                <div
                  className={`flex-1 pt-2 cursor-pointer transition-all duration-200 ${
                    isCompleted
                      ? 'text-slate-500 line-through opacity-70'
                      : isCurrent
                      ? 'text-slate-900 font-medium bg-blue-50/50 px-6 py-4 rounded-xl border border-blue-200/30'
                      : 'text-slate-700 hover:text-slate-900 px-6 py-4 hover:bg-slate-50/50 rounded-xl transition-colors'
                  }`}
                  onClick={() => handleStepClick(index)}
                >
                  <div className={`leading-relaxed text-base ${
                    direction.length <= 50 
                      ? 'min-h-[40px] flex items-center' // Single line height for short text
                      : 'min-h-[60px]' // Multi-line height for long text
                  }`}>
                    {direction}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Additional Sections with Ingredients and Directions */}
      {!hideAdditionalSections && Object.keys(additionalSections).length > 0 && (
        <div className="mt-8">
          {/* Elegant Separator */}
          <div className="relative mb-8 mt-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gradient-to-r from-transparent via-slate-300/60 to-transparent"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-2 rounded-full shadow-sm border border-slate-200/50">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="w-2 h-2 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-wide">חלקים נוספים</h2>
                  <div className="w-2 h-2 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {Object.entries(additionalSections).map(([sectionName, section], index) => {
              const sectionCurrentStep = localAdditionalSteps[sectionName] || 0;
              
              // Define different pastel colors for each section
              const colors = [
                {
                  bg: 'from-rose-50/60 via-white to-pink-50/40',
                  border: 'border-rose-200/40',
                  ingredients: { bg: 'from-rose-50/50 to-pink-50/30', border: 'border-rose-200/30', accent: 'from-rose-400 to-pink-400' },
                  directions: { bg: 'from-pink-50/50 to-rose-50/30', border: 'border-pink-200/30', accent: 'from-pink-400 to-rose-400' }
                },
                {
                  bg: 'from-blue-50/60 via-white to-sky-50/40',
                  border: 'border-blue-200/40',
                  ingredients: { bg: 'from-blue-50/50 to-sky-50/30', border: 'border-blue-200/30', accent: 'from-blue-400 to-sky-400' },
                  directions: { bg: 'from-sky-50/50 to-blue-50/30', border: 'border-sky-200/30', accent: 'from-sky-400 to-blue-400' }
                },
                {
                  bg: 'from-emerald-50/60 via-white to-teal-50/40',
                  border: 'border-emerald-200/40',
                  ingredients: { bg: 'from-emerald-50/50 to-teal-50/30', border: 'border-emerald-200/30', accent: 'from-emerald-400 to-teal-400' },
                  directions: { bg: 'from-teal-50/50 to-emerald-50/30', border: 'border-teal-200/30', accent: 'from-teal-400 to-emerald-400' }
                },
                {
                  bg: 'from-violet-50/60 via-white to-purple-50/40',
                  border: 'border-violet-200/40',
                  ingredients: { bg: 'from-violet-50/50 to-purple-50/30', border: 'border-violet-200/30', accent: 'from-violet-400 to-purple-400' },
                  directions: { bg: 'from-purple-50/50 to-violet-50/30', border: 'border-purple-200/30', accent: 'from-purple-400 to-violet-400' }
                }
              ];
              
              const colorScheme = colors[index % colors.length];
              
              return (
                <div key={sectionName} className={`bg-gradient-to-br ${colorScheme.bg} px-2 py-6 md:px-4 rounded-2xl border ${colorScheme.border} shadow-lg backdrop-blur-sm`}>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{sectionName}</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                    {/* Section Ingredients */}
                    {section.ingredients.length > 0 && (
                      <div className={`bg-gradient-to-br ${colorScheme.ingredients.bg} px-2 py-4 md:px-3 rounded-xl border ${colorScheme.ingredients.border}`}>
                        <h4 className="text-lg font-bold text-slate-800 mb-4">מרכיבים ל{sectionName}</h4>
                        <ul className="space-y-2">
                          {section.ingredients.map((ingredient, index) => (
                            <li key={index} className="flex items-start space-x-3 rtl:space-x-reverse group">
                              <div className={`flex-shrink-0 w-5 h-5 bg-gradient-to-br ${colorScheme.ingredients.accent} rounded-full flex items-center justify-center mt-0.5 shadow-sm`}>
                                <span className="text-xs font-bold text-white">{index + 1}</span>
                              </div>
                              <span className="text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">{ingredient}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Section Directions */}
                    {section.directions.length > 0 && (
                      <div className={`bg-gradient-to-br ${colorScheme.directions.bg} px-2 py-4 md:px-3 rounded-xl border ${colorScheme.directions.border}`}>
                        <h4 className="text-lg font-bold text-slate-800 mb-4">הוראות הכנה ל{sectionName}</h4>
                        <ol className="space-y-2">
                          {section.directions.map((direction, index) => {
                            const isCompleted = index < sectionCurrentStep;
                            const isCurrent = index === sectionCurrentStep;
                            
                            return (
                              <li key={index} className="flex space-x-4 rtl:space-x-reverse group">
                                <button
                                  onClick={() => handleAdditionalStepClick(sectionName, index)}
                                  className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold transition-all duration-300 hover:scale-110 touch-manipulation shadow-sm ${
                                    isCompleted
                                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-200'
                                      : isCurrent
                                      ? `bg-gradient-to-br ${colorScheme.directions.accent} text-white shadow-lg ring-2 ring-orange-200/50`
                                      : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 hover:from-slate-200 hover:to-slate-300'
                                  }`}
                                  style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
                                >
                                  {isCompleted ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <span className="text-xs">{index + 1}</span>
                                  )}
                                </button>
                                <div
                                  className={`flex-1 pt-1 cursor-pointer transition-all duration-200 ${
                                    isCompleted
                                      ? 'text-slate-500 line-through opacity-70'
                                      : isCurrent
                                      ? `text-slate-900 font-medium bg-white/60 px-4 py-4 md:px-5 rounded-xl border ${colorScheme.directions.border}`
                                      : 'text-slate-700 hover:text-slate-900 px-4 py-4 md:px-5 hover:bg-white/40 rounded-xl transition-colors'
                                  }`}
                                  onClick={() => handleAdditionalStepClick(sectionName, index)}
                                >
                                  <div className={`leading-relaxed text-base ${
                                    direction.length <= 50 
                                      ? 'min-h-[36px] flex items-center' // Single line height for short text
                                      : 'min-h-[56px]' // Multi-line height for long text
                                  }`}>
                                    {direction}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional Instructions (Legacy) */}
      {!hideAdditionalSections && Object.keys(additionalInstructions).length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">הוראות נוספות</h2>
          <div className="space-y-6">
            {Object.entries(additionalInstructions).map(([sectionName, instructions]) => {
              const sectionCurrentStep = localAdditionalSteps[sectionName] || 0;
              
              return (
                <div key={sectionName} className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">{sectionName}</h3>
                  <ol className="space-y-3">
                    {instructions.map((instruction, index) => {
                      const isCompleted = index < sectionCurrentStep;
                      const isCurrent = index === sectionCurrentStep;
                      
                      return (
                        <li key={index} className="flex space-x-3 rtl:space-x-reverse">
                          <button
                            onClick={() => handleAdditionalStepClick(sectionName, index)}
                            className={`flex-shrink-0 rounded-full flex items-center justify-center font-medium transition-all duration-200 hover:scale-110 touch-manipulation ${
                              isCompleted
                                ? 'bg-green-500 text-white shadow-md'
                                : isCurrent
                                ? 'bg-orange-500 text-white shadow-md ring-2 ring-orange-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                            style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                          >
                            {isCompleted ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </button>
                          <div
                            className={`flex-1 pt-1 cursor-pointer transition-colors ${
                              isCompleted
                                ? 'text-gray-500 line-through'
                                : isCurrent
                                ? 'text-gray-900 font-medium'
                                : 'text-gray-700'
                            }`}
                            onClick={() => handleAdditionalStepClick(sectionName, index)}
                            style={{ touchAction: 'manipulation' }}
                          >
                            {instruction}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;