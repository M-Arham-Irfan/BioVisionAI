import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disease } from "@/types/database";
import { CheckCircle, Activity, Layers } from "lucide-react"; // Import necessary icons

interface RecommendationsCardProps {
  predictions: Disease[] | null;
}

const RecommendationsCard: React.FC<RecommendationsCardProps> = ({ predictions }) => {
  const topPredictionDiseaseName = predictions && predictions.length > 0 ? predictions[0].disease_name : null;

  return (
    <Card className="bg-green-950/30 border-green-900/20">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-green-300 flex items-center text-lg">
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-gray-300">
          These AI-generated insights should be reviewed by a healthcare professional. 
          Please consult with your doctor for a comprehensive evaluation and clinical advice based on this scan.
        </p>
        
        <div className="space-y-2.5 pt-1">
          {topPredictionDiseaseName && (
            <div className="flex items-start">
              <Activity className="h-4 w-4 mr-2.5 mt-0.5 text-blue-400 flex-shrink-0" />
              <p className="text-gray-300">
                Monitor for symptoms related to {topPredictionDiseaseName.toLowerCase()}.
              </p>
            </div>
          )}
          
          {topPredictionDiseaseName && (
             <div className="flex items-start">
              <Layers className="h-4 w-4 mr-2.5 mt-0.5 text-purple-400 flex-shrink-0" />
              <p className="text-gray-300">
                Consider follow-up scans if symptoms persist or worsen, as advised by your doctor.
              </p>
            </div>
          )}
          
          <div className="flex items-start">
            <CheckCircle className="h-4 w-4 mr-2.5 mt-0.5 text-green-400 flex-shrink-0" />
            <p className="text-gray-300">
              Schedule a follow-up appointment to discuss the results with your physician.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecommendationsCard; 