import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckIcon } from "lucide-react";

export interface AnalysisStep {
  id: number;
  title: string;
  description: string;
}

interface AnalysisProgressBarProps {
  currentStep: number;
  isProcessing: boolean;
  steps: AnalysisStep[];
}

const AnalysisProgressBar = ({
  currentStep,
  isProcessing,
  steps,
}: AnalysisProgressBarProps) => {
  // Calculate completion percentage
  const completionPercentage = Math.min(100, Math.round((currentStep / (steps.length - 1)) * 100));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full mb-6"
    >
      <Card className="bg-gray-900/80 backdrop-blur-sm border border-blue-600/20 shadow-xl text-gray-100 overflow-hidden">
        {/* Glowing top border to indicate progress */}
        <div 
          className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 transition-all duration-500 ease-out"
          style={{ 
            width: `${completionPercentage}%`,
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
          }}
        />
        
        <CardContent className="p-6">
          {/* Percentage indicator */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-blue-300">Analysis Progress</h3>
            <div className="flex items-center">
              <div className="text-white font-bold">
                {completionPercentage}%
              </div>
              <div className="w-16 h-1.5 bg-gray-700 rounded-full ml-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Horizontal progress indicator */}
          <div className="relative mb-6">
            {/* Progress line background */}
            <div className="h-1 bg-gray-700 absolute w-full top-6"></div>
            
            {/* Completed progress line with gradient */}
            <div 
              className="h-1 absolute top-6 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 transition-all duration-500 ease-out"
              style={{ 
                width: `${completionPercentage}%`,
                boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)'
              }}
            />
            
            {/* Step indicators */}
            <div className="flex justify-between relative">
              {steps.map((step) => {
                const isActive = currentStep >= step.id;
                const isCurrentStep = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div key={step.id} className="flex flex-col items-center">
                    {/* Step dot with animations */}
                    <div 
                      className={`w-12 h-12 rounded-full z-10 flex items-center justify-center mb-3 transition-all duration-300
                        ${isActive 
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-700 border-2 border-blue-400' 
                          : 'bg-gray-800 border-2 border-gray-600'}`}
                      style={{ 
                        boxShadow: isActive ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
                        transform: isCurrentStep && isProcessing ? 'scale(1.05)' : 'scale(1)'
                      }}
                    >
                      {isCompleted ? (
                        <CheckIcon className="h-5 w-5 text-white" />
                      ) : isCurrentStep && isProcessing ? (
                        <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
                      ) : isActive ? (
                        <div className="w-4 h-4 rounded-full bg-white" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-gray-500" />
                      )}
                    </div>
                    
                    {/* Step title and description with better responsive design */}
                    <div
                      className={`text-center transition-colors duration-300 ${isActive ? 'text-blue-300' : 'text-gray-500'}`}
                    >
                      <h4 className="font-medium text-sm sm:text-base">{step.title}</h4>
                      <p className={`text-xs max-w-[120px] hidden sm:block ${isActive ? 'text-gray-300' : 'text-gray-600'}`}>
                        {step.description}
                      </p>
                      
                      {/* Mobile-only truncated description */}
                      <p className={`text-xs max-w-[80px] block sm:hidden ${isActive ? 'text-gray-300' : 'text-gray-600'}`}>
                        {step.description.length > 15 ? `${step.description.substring(0, 15)}...` : step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Processing animation */}
          {isProcessing && (
            <div className="mt-4 px-4">
              <div className="h-2 w-full rounded-full bg-gray-800/80 overflow-hidden">
                <div className="h-full animate-progress-bar bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full" />
              </div>
              
              <div className="flex justify-center mt-3">
                <p className="text-blue-300 text-xs sm:text-sm font-medium text-center">
                  {currentStep === 1 ? "Processing scan image..." : 
                   currentStep === 2 ? "AI analyzing your X-ray patterns..." : ""}
                </p>
              </div>
            </div>
          )}
          
          {/* Step details for current step */}
          {!isProcessing && currentStep > 0 && currentStep < steps.length && (
            <div className="mt-4 text-center">
              <p className="text-xs text-blue-200">
                {currentStep === 3 ? "Analysis complete! View your results below." : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AnalysisProgressBar; 