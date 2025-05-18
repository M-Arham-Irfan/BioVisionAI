import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ArrowLeft, FileImage, Download, Trash2, Share2, Clock, Activity, CheckCircle, Eye, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ScanImageViewerCard from "@/components/scan-analysis/ScanImageViewerCard";
import { useScanById } from "@/hooks/useScanData";
import { DiagnosticReport } from "@/components/scan-analysis/DiagnosticReport";
import { ScanAnalysisResult, Disease } from "@/types/database";
import { PatientInfo } from "@/types/patient";
import { toast } from "sonner";
import ScanInfoCard from "@/components/scan-analysis/ScanInfoCard";
import { AnalysisResults } from "@/components/scan-analysis/AnalysisResults";
import RefactoredDualView from "@/components/scan-analysis/RefactoredDualView";

const ScanDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [patientInfo, setPatientInfo] = useState<{
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    country: string;
    city: string;
  } | null>(null);
  
  // Use the useScanById hook to fetch scan data
  const { scan, predictions, loading, error } = useScanById(id ? parseInt(id) : null);

  // Log key state on each render for debugging
  console.log("ScanDetails - Render state:", { 
    scanId: id, 
    hasUser: !!user, 
    userId: user?.auth_id,
    loading, 
    hasError: !!error,
    hasData: !!scan,
    hasPredictions: !!predictions
  });

  // Fetch patient information if scan has patient_id
  useEffect(() => {
    const fetchPatientInfo = async () => {
      if (scan?.patient_id) {
        try {
          const { data, error: dbError } = await supabase
            .from('patients')
            .select('first_name, last_name, date_of_birth, gender, country, city')
            .eq('patient_id', scan.patient_id)
            .single();
          
          if (dbError) {
            console.error("Error fetching patient data:", dbError);
            return;
          }
          
          if (data) {
            setPatientInfo(data);
          }
        } catch (err) {
          console.error("Error in fetchPatientInfo (catch block):", err);
        }
      }
    };
    
    if (scan) {
      fetchPatientInfo();
    }
  }, [scan]);

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      if (!id) {
        throw new Error("Scan ID is missing");
      }

      const scanIdInt = parseInt(id);

      // Delete the scan using auth_id directly
      const { error: deleteError } = await supabase
        .from("scans")
        .delete()
        .eq("scan_id", scanIdInt)
        .eq("auth_id", user.auth_id);

      if (deleteError) throw deleteError;
      
      // Navigate back to dashboard after successful deletion
      navigate("/dashboard?tab=scan-history");
    } catch (err) {
      console.error("Error deleting scan:", err);
      alert("Failed to delete scan: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={() => navigate("/dashboard?tab=scan-history")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Scan History
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <Skeleton className="h-[300px] rounded-t-lg" />
              <CardContent className="pt-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-3 space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="container max-w-4xl mx-auto p-4 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={() => navigate("/dashboard?tab=scan-history")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Scan History
          </Button>
        </div>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Scan</CardTitle>
            <CardDescription>
              There was a problem loading the scan details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              {error?.message || "The requested scan could not be found or you don't have permission to view it."}
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => navigate("/dashboard?tab=scan-history")}
            >
              Return to Scan History
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // topPrediction is still needed for AnalysisResultsCard and RecommendationsCard, and for formatScanForReport
  const topPrediction = predictions && predictions.length > 0 ? predictions[0] : null;

  const getImageUrl = () => {
    if (!scan?.storage_path) return null;
    return scan.storage_path.startsWith('http') ? scan.storage_path : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${scan.storage_path}`;
  };

  const getHeatmapUrl = () => {
    if (!scan?.heatmap_storage_path) return null;
    return scan.heatmap_storage_path.startsWith('http') ? scan.heatmap_storage_path : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${scan.heatmap_storage_path}`;
  };

  const formatScanForReport = (): ScanAnalysisResult => {
    const reportPatientInfo: PatientInfo = {
      first_name: patientInfo?.first_name || "N/A",
      last_name: patientInfo?.last_name || "N/A",
      date_of_birth: patientInfo?.date_of_birth || "N/A",
      gender: patientInfo?.gender || "N/A",
      country: patientInfo?.country || "N/A",
      city: patientInfo?.city || "N/A",
    };

    let derivedSeverity = "Low";
    // Ensure topPrediction is used here if it's from the outer scope
    if (topPrediction && topPrediction.confidence > 0.75) {
      derivedSeverity = "High";
    } else if (topPrediction && topPrediction.confidence > 0.4) {
      derivedSeverity = "Medium";
    }

    if (!scan || !predictions || predictions.length === 0) {
      return {
        condition: "N/A",
        severity: derivedSeverity, // severity is now derived or default
        probability: 0,
        predictions: [],
        performed_at: scan?.performed_at || new Date().toISOString(),
        recommendation: "Unable to generate full report due to missing analysis data. Please consult with a healthcare professional.",
        heatmap_url: getHeatmapUrl() || "",
        patient_info: reportPatientInfo,
        scan_id: scan?.scan_id,
        heatmap_storage_path: scan?.heatmap_storage_path,
      };
    }

    const localTopPrediction = predictions[0]; // Renamed to avoid conflict if any
    
    // Generate more detailed recommendations based on condition and severity
    let detailedRecommendation = "These AI-generated insights should be reviewed by a healthcare professional. ";
    
    if (localTopPrediction.disease_name === "No Finding") {
      detailedRecommendation += "No abnormalities were detected in this scan. ";
      detailedRecommendation += "Continue with regular health check-ups as recommended by your healthcare provider.";
    } else {
      detailedRecommendation += `The scan indicates potential ${localTopPrediction.disease_name} with ${derivedSeverity.toLowerCase()} severity. `;
      
      if (derivedSeverity === "High") {
        detailedRecommendation += "It is strongly recommended that you consult with a specialist as soon as possible. ";
      } else if (derivedSeverity === "Medium") {
        detailedRecommendation += "Consider scheduling a follow-up appointment with your healthcare provider within the next few weeks. ";
      } else {
        detailedRecommendation += "Consider discussing these findings during your next routine check-up. ";
      }
      
      detailedRecommendation += "Monitor for any changes in symptoms and follow your doctor's advice.";
    }

    return {
      scan_id: scan.scan_id,
      condition: localTopPrediction?.disease_name || "N/A",
      severity: derivedSeverity,
      probability: localTopPrediction?.confidence ? Math.round(localTopPrediction.confidence * 100) : 0,
      predictions: predictions,
      performed_at: scan.performed_at,
      recommendation: detailedRecommendation,
      heatmap_url: getHeatmapUrl() || "",
      heatmap_storage_path: scan.heatmap_storage_path,
      patient_info: reportPatientInfo
    };
  };
  
  const handleGenerateReport = () => {
    if (!scan) {
      toast.error("Scan data not available for report generation");
      return;
    }
    
    setShowReport(true);
  };

  return (
    <div className="container max-w-5xl mx-auto p-4 py-8 bg-gray-950 text-gray-100">
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-gray-300 hover:text-white hover:bg-gray-800"
          onClick={() => navigate("/dashboard?tab=scan-history")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Scan History
        </Button>
        <div className="flex items-center space-x-2">
          {/* Remove Generate Report button */}
          {/* Share and Download buttons might be implemented in the future */}
          {/* <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"><Share2 className="mr-2 h-4 w-4" /> Share</Button> */}
          {/* <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"><Download className="mr-2 h-4 w-4" /> Download</Button> */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20 hover:text-red-300 hover:border-red-500/50"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-800 text-gray-100">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  This action cannot be undone. This will permanently delete the scan
                  and all associated analysis data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 border-none">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete} 
                  disabled={deleteLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scan Image Viewer */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900 border-gray-800 h-full">
            <CardHeader>
              <CardTitle className="text-xl text-white">
                {scan?.scan_type ? `${scan.scan_type} Scan Images` : "Scan Images"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RefactoredDualView
                originalImage={getImageUrl()}
                heatmapImage={getHeatmapUrl()}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Patient Info & Scan Metadata - Modified for full height */}
        <div className="lg:col-span-1">
          <div className="h-full">
            {/* Modified ScanInfoCard with full height styling */}
            <Card className="bg-gray-900 border-gray-800 h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl text-white mb-1">
                      {topPrediction?.disease_name || (scan?.body_part && scan?.scan_type ? `${scan.body_part} ${scan.scan_type} Scan` : "Scan Overview")}
                    </CardTitle>
                    <CardDescription className="flex items-center text-gray-400">
                      <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                      {scan.performed_at ? format(new Date(scan.performed_at), "MMMM d, yyyy 'at' h:mm a") : "Unknown date"}
                    </CardDescription>
                  </div>
                  {topPrediction && (
                    <Badge 
                      className={`${topPrediction.confidence > 0.75 ? "text-red-400 bg-red-900/50" : 
                        topPrediction.confidence > 0.4 ? "text-yellow-400 bg-yellow-900/50" : 
                        "text-green-400 bg-green-900/50"} px-2.5 py-1 text-xs font-medium whitespace-nowrap`}
                    >
                      {Math.round(topPrediction.confidence * 100)}% Confidence
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
                        <span className="text-white text-right">{`${patientInfo.first_name} ${patientInfo.last_name}`.trim() || "N/A"}</span>
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
                      <span className="text-white text-right">{scan.scan_type || "N/A"}</span>
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
          </div>
        </div>
        
        {/* Analysis Results below dual view - full width */}
        {predictions && predictions.length > 0 && (
          <div className="lg:col-span-3">
            <AnalysisResults 
              result={formatScanForReport()} 
              scanImage={getImageUrl()}
            />
          </div>
        )}
      </div>
      
      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="bg-white max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          {scan && <DiagnosticReport result={formatScanForReport()} scanImage={getImageUrl()} onGenerateComplete={() => setShowReport(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScanDetails; 