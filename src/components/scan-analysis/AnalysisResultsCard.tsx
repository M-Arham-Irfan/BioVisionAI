import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disease } from "@/types/database";

interface AnalysisResultsCardProps {
  predictions: Disease[] | null;
}

const AnalysisResultsCard: React.FC<AnalysisResultsCardProps> = ({ predictions }) => {
  if (!predictions || predictions.length === 0) {
    return null; // Don't render the card if there are no predictions
  }

  // Function to determine color based on confidence (0 to 1.0)
  const getConfidenceColor = (confidence: number): string => {
    if (confidence > 0.75) return 'text-red-400';
    if (confidence > 0.4) return 'text-yellow-300';
    return 'text-green-400';
  };

  const getConfidenceBarColor = (confidence: number): string => {
    if (confidence > 0.75) return 'bg-red-500';
    if (confidence > 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Analysis Results</CardTitle>
        <CardDescription className="text-gray-400">
          AI-detected conditions and their confidence levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {predictions.map((prediction, index) => {
            const predConfidencePercent = Math.round(prediction.confidence * 100);
            
            return (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{prediction.disease_name}</span>
                  <span className={`font-mono text-sm ${getConfidenceColor(prediction.confidence)}`}>
                    {predConfidencePercent}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getConfidenceBarColor(prediction.confidence)}`}
                    style={{ width: `${predConfidencePercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisResultsCard; 