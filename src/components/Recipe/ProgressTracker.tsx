import React from 'react';
import { Check, Circle } from 'lucide-react';

interface ProgressTrackerProps {
  directions: string[];
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
  additionalInstructions?: { [key: string]: string[] };
  onAdditionalStepClick?: (sectionName: string, stepIndex: number) => void;
  additionalCurrentSteps?: { [key: string]: number };
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  directions,
  currentStep,
  onStepClick,
  additionalInstructions = {},
  onAdditionalStepClick,
  additionalCurrentSteps = {}
}) => {
  // Local state for tracking progress since we're not using DB
  const [localCurrentStep, setLocalCurrentStep] = React.useState(currentStep);
  const [localAdditionalSteps, setLocalAdditionalSteps] = React.useState(additionalCurrentSteps);

  const handleStepClick = (stepIndex: number) => {
    const newStep = stepIndex === localCurrentStep ? stepIndex + 1 : stepIndex;
    setLocalCurrentStep(newStep);
    onStepClick(stepIndex);
  };

  const handleAdditionalStepClick = (sectionName: string, stepIndex: number) => {
    const currentSectionStep = localAdditionalSteps[sectionName] || 0;
    const newStep = stepIndex === currentSectionStep ? stepIndex + 1 : stepIndex;
    setLocalAdditionalSteps(prev => ({
      ...prev,
      [sectionName]: newStep
    }));
    onAdditionalStepClick?.(sectionName, stepIndex);
  };

  return (
    <div className="space-y-8">
      {/* Main Directions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">הוראות הכנה</h2>
        <ol className="space-y-4">
          {directions.map((direction, index) => {
            const isCompleted = index < localCurrentStep;
            const isCurrent = index === localCurrentStep;
            
            return (
              <li key={index} className="flex space-x-3 rtl:space-x-reverse">
                <button
                  onClick={() => handleStepClick(index)}
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-medium transition-all duration-200 hover:scale-110 ${
                    isCompleted
                      ? 'bg-green-500 text-white shadow-md'
                      : isCurrent
                      ? 'bg-orange-500 text-white shadow-md ring-2 ring-orange-200'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
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
                  onClick={() => handleStepClick(index)}
                >
                  {direction}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Additional Instructions */}
      {Object.keys(additionalInstructions).length > 0 && (
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
                            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-medium text-sm transition-all duration-200 hover:scale-110 touch-manipulation ${
                              isCompleted
                                ? 'bg-green-500 text-white shadow-md'
                                : isCurrent
                                ? 'bg-orange-500 text-white shadow-md ring-2 ring-orange-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                            style={{ minWidth: '28px', minHeight: '28px' }}
                          >
                            {isCompleted ? (
                              <Check className="h-3 w-3" />
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