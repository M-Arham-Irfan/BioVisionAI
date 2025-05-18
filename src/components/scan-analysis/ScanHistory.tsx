import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserScans } from "@/hooks/useScanData";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileImage, Clock, ChevronRight, ImageIcon, ChevronLeft, ChevronRight as ChevronRightIcon, AlertCircle } from "lucide-react";
import { Scan, Disease } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { getPredictions } from "@/lib/database";

// Component to render a single scan history item
const ScanHistoryItem = ({ scan, predictions }: { scan: Scan, predictions?: Disease[] }) => {
  const navigate = useNavigate();
  
  const handleViewDetails = () => {
    // Make sure scan_id is a valid number
    if (!scan.scan_id) {
      console.error("ScanHistoryItem - Invalid scan_id:", scan);
      alert("Cannot view this scan: Invalid ID");
      return;
    }
    
    console.log(`ScanHistoryItem - Navigating to scan details for scan_id: ${scan.scan_id}`);
    navigate(`/scan-details/${scan.scan_id}`);
  };
  
  // Get top prediction if available
  const topPrediction = predictions && predictions.length > 0 ? predictions[0] : null;

  return (
    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
      <div className="flex items-center">
        <div className="h-10 w-10 rounded bg-gray-800 flex items-center justify-center mr-3">
          <FileImage className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-white">
            {scan.body_part || "Chest"} {scan.scan_type || "X-ray"}
          </h4>
          <div className="flex items-center space-x-3 mt-1">
            <span className="text-xs text-gray-400 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {(scan.performed_at || scan.created_at) && 
               !isNaN(new Date(scan.performed_at || scan.created_at).getTime())
                ? formatDistanceToNow(new Date(scan.performed_at || scan.created_at), { addSuffix: true })
                : "Date unavailable"}
            </span>
            {topPrediction && (
              <span className="text-xs text-gray-400 flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1 animate-pulse"></span>
                {`${Math.round(topPrediction.confidence * 100)}% ${topPrediction.disease_name}`}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="bg-blue-900/30 text-blue-100 hover:bg-blue-800/40 hover:text-white backdrop-blur-md transition-all duration-300"
          onClick={handleViewDetails}
        >
          View
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

// Main ScanHistory component
const ScanHistory = ({ limit = 5, showViewAll = true }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = limit;
  const [scanPredictions, setScanPredictions] = useState<{[key: number]: Disease[]}>({});

  // Use our new hook
  const { scans, loading, error } = useUserScans();
  
  // Fetch predictions for displayed scans
  useEffect(() => {
    if (!scans || scans.length === 0) return;
    
    const fetchPredictionsForScans = async () => {
      const predictions: {[key: number]: Disease[]} = {};
      
      // Only fetch for paginated scans to reduce API calls
      const startIndex = (currentPage - 1) * pageSize;
      const displayedScans = scans.slice(startIndex, startIndex + pageSize);
      
      await Promise.all(
        displayedScans.map(async (scan) => {
          try {
            const { predictions: predData } = await getPredictions(supabase, scan.scan_id);
            if (predData) {
              predictions[scan.scan_id] = predData;
            }
          } catch (err) {
            console.error(`Error fetching predictions for scan ${scan.scan_id}:`, err);
          }
        })
      );
      
      setScanPredictions(predictions);
    };
    
    fetchPredictionsForScans();
  }, [scans, currentPage, pageSize]);
  
  // Apply pagination locally
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedScans = scans ? scans.slice(startIndex, startIndex + pageSize) : [];
  const totalScans = scans ? scans.length : 0;

  const handleUploadClick = () => {
    navigate("/scan-analysis");
  };

  // Handle moving to next/previous page
  const nextPage = () => {
    if (totalScans && (currentPage * pageSize < totalScans)) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="p-4 border-b border-gray-800 flex items-center">
              <Skeleton className="h-10 w-10 rounded bg-gray-800 mr-3" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3 bg-gray-800" />
                <Skeleton className="h-3 w-2/3 bg-gray-800" />
              </div>
            </div>
          ))}
      </div>
    );
  }

  if (error) {
    console.error("Error in ScanHistory:", error);
    return (
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Unable to Load Scan History</h3>
          <p className="text-gray-400 mb-6">
            We're having trouble connecting to the server. Please try again later.
          </p>
          <div className="flex justify-center items-center mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mx-1 animate-pulse"></span>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mx-1 animate-pulse delay-100"></span>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mx-1 animate-pulse delay-200"></span>
          </div>
          <Button onClick={handleUploadClick} className="bg-blue-900/30 border border-blue-400/50 text-blue-100 hover:bg-blue-800/40 hover:text-white backdrop-blur-md transition-all duration-300">
            Upload X-ray
          </Button>
        </div>
      </Card>
    );
  }

  if (!scans || scans.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Scan History Found</h3>
          <p className="text-gray-400 mb-6">
            You haven't uploaded any X-rays yet. Get started by analyzing your first X-ray.
          </p>
          <div className="flex justify-center items-center mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mx-1 animate-pulse"></span>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mx-1 animate-pulse delay-100"></span>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mx-1 animate-pulse delay-200"></span>
          </div>
          <Button onClick={handleUploadClick} className="bg-blue-900/30 border border-blue-400/50 text-blue-100 hover:bg-blue-800/40 hover:text-white backdrop-blur-md transition-all duration-300">
            Upload X-ray
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="bg-gray-900 border-gray-800 rounded-lg p-4">
      <div className="divide-y divide-gray-800">
        {paginatedScans.map((scan) => (
          <ScanHistoryItem 
            key={scan.scan_id} 
            scan={scan} 
            predictions={scanPredictions[scan.scan_id]}
          />
        ))}
      </div>
      
      {/* Pagination controls */}
      {totalScans > 0 && totalScans > pageSize && (
        <div className="flex justify-between items-center mt-4 px-4">
          <div className="text-sm text-gray-400">
                Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalScans)} of {totalScans}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={prevPage} 
              disabled={currentPage === 1}
              className="bg-blue-900/30 text-blue-100 hover:bg-blue-800/40 hover:text-white backdrop-blur-md transition-all duration-300 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={nextPage} 
              disabled={currentPage * pageSize >= totalScans}
              className="bg-blue-900/30 text-blue-100 hover:bg-blue-800/40 hover:text-white backdrop-blur-md transition-all duration-300 disabled:opacity-50"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {showViewAll && scans.length > 0 && limit < totalScans && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            className="bg-indigo-900/30 text-indigo-100 hover:bg-indigo-800/40 hover:text-white backdrop-blur-md transition-all duration-300"
            onClick={() => navigate("/dashboard?tab=scan-history")}
          >
            View All Scans
          </Button>
        </div>
      )}
    </div>
  );
};

export default ScanHistory; 