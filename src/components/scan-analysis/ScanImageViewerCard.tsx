import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RefactoredDualView from "@/components/scan-analysis/RefactoredDualView";

interface ScanImageViewerCardProps {
  originalImageUrl: string | null | undefined;
  heatmapImageUrl: string | null | undefined;
  scanType?: string; // Optional: if we want to display the scan type in the header
}

const ScanImageViewerCard: React.FC<ScanImageViewerCardProps> = ({
  originalImageUrl,
  heatmapImageUrl,
  scanType,
}) => {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl text-white">
          {scanType ? `${scanType} Scan Images` : "Scan Images"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RefactoredDualView
          originalImage={originalImageUrl}
          heatmapImage={heatmapImageUrl}
        />
      </CardContent>
    </Card>
  );
};

export default ScanImageViewerCard; 