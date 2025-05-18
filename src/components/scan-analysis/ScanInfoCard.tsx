import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Scan, Disease } from "@/types/database";
import { PatientInfo } from "@/types/patient";

interface ScanInfoCardProps {
  scan: Scan | null;
  patientInfo: PatientInfo | null;
  predictions: Disease[] | null;
}

// Helper function for confidence badge color (similar to ScanDetails one)
const getConfidenceBadgeStyle = (confidenceValue?: number | null): string => {
  if (confidenceValue === null || confidenceValue === undefined) return "text-gray-300 bg-gray-700";
  if (confidenceValue > 0.75) return "text-red-400 bg-red-900/50"; 
  if (confidenceValue > 0.4) return "text-yellow-400 bg-yellow-900/50"; 
  return "text-green-400 bg-green-900/50"; 
};

const ScanInfoCard: React.FC<ScanInfoCardProps> = ({ scan, patientInfo, predictions }) => {
  if (!scan) {
    return <Skeleton className="h-[400px] w-full" />; // Or some other loading/empty state
  }

  const topPrediction = predictions && predictions.length > 0 ? predictions[0] : null;
  const confidence = topPrediction ? Math.round(topPrediction.confidence * 100) : null;
  
  const diagnosis = topPrediction 
    ? topPrediction.disease_name 
    : (scan.body_part && scan.scan_type ? `${scan.body_part} ${scan.scan_type} Scan` : "Scan Overview");

  const scanDate = scan.performed_at || scan.created_at
    ? format(new Date(scan.performed_at || scan.created_at), "MMMM d, yyyy 'at' h:mm a")
    : "Unknown date";

  const patientName = patientInfo ? `${patientInfo.first_name} ${patientInfo.last_name}`.trim() || "N/A" : "N/A";
  const scanTypeDisplay = scan.scan_type || "N/A";

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl text-white mb-1">{diagnosis}</CardTitle>
            <CardDescription className="flex items-center text-gray-400">
              <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
              {scanDate}
            </CardDescription>
          </div>
          {confidence !== null && (
            <Badge className={`${getConfidenceBadgeStyle(topPrediction?.confidence)} px-2.5 py-1 text-xs font-medium whitespace-nowrap`}>
              {confidence}% Confidence
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {patientInfo && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Patient Information</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white text-right">{patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date of Birth:</span>
                <span className="text-white text-right">
                  {patientInfo.date_of_birth ? format(new Date(patientInfo.date_of_birth), "MMMM d, yyyy") : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gender:</span>
                <span className="text-white text-right">{patientInfo.gender || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Location:</span>
                <span className="text-white text-right">
                  {patientInfo.city && patientInfo.country ? `${patientInfo.city}, ${patientInfo.country}` : (patientInfo.country || "N/A")}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Scan Details</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Scan ID:</span>
              <span className="text-white text-right">{scan.scan_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Scan Type:</span>
              <span className="text-white text-right">{scanTypeDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Body Part:</span>
              <span className="text-white text-right">{scan.body_part || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">File Size:</span>
              <span className="text-white text-right">{scan.file_size_kb ? `${scan.file_size_kb} KB` : "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Filename:</span>
              <span className="text-white text-right truncate hover:whitespace-normal cursor-help" title={scan.filename}>{scan.filename || "N/A"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScanInfoCard; 