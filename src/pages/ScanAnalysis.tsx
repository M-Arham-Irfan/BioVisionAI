// Add this type declaration at the top of the file, before any imports
declare global {
  interface Navigator {
    getUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
    mozGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
    msGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void, 
      errorCallback: (error: Error) => void
    ) => void;
  }
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";

import dicomLibs from '@/utils/dicomInit';
console.log("DICOM libraries imported:", dicomLibs ? "yes" : "no");

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnalysisResults } from "@/components/scan-analysis/AnalysisResults";
import { QuickStats } from "@/components/scan-analysis/QuickStats";
import { RemainingScansInfo } from "@/components/scan-analysis/RemainingScansInfo";
import ScanInputArea from "@/components/scan-analysis/ScanInputArea";
import CameraModal from "@/components/scan-analysis/CameraModal";
import {
  RotateCcw,
  FileScan,
} from "lucide-react";
import { getScanCountStats } from "@/services/chestXrayService";
import { useCanPerformScan } from "@/hooks/useCanPerformScan";
import DicomViewer from "@/components/scan-analysis/DicomViewer";
import { useScanAnalysisHandler } from "@/hooks/useScanAnalysisHandler";
import PatientInfoModal from "@/components/scan-analysis/PatientInfoModal";
import SubscriptionModal from "@/components/scan-analysis/SubscriptionModal";
import { useBrowserCompatibility } from "@/hooks/useBrowserCompatibility";
import { useDicomHandler } from "@/hooks/useDicomHandler";
import CameraAccessHelpDialog from "@/components/scan-analysis/CameraAccessHelpDialog";
import DualViewDisplay from "@/components/scan-analysis/DualViewDisplay";
import AnalysisProgressBar, { AnalysisStep } from "@/components/scan-analysis/AnalysisProgressBar";
import {
  DialogHeader,
} from "@/components/ui/dialog";
import { blobUrlToDataUrl, fileToDataUrl } from "@/utils/imageConverters";
import { convertDicomToPng } from "@/components/scan-analysis/DicomViewer";

// Define the type for the patient info state
export interface PatientInfoState {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  country: string;
  city: string;
}

// Define analysis steps
const analysisSteps: AnalysisStep[] = [
  { id: 0, title: "Upload Scan", description: "Upload or capture a chest X-ray image" },
  { id: 1, title: "Image Processing", description: "Processing and standardizing the image" },
  { id: 2, title: "AI Analysis", description: "Analyzing the scan using our advanced AI model" },
  { id: 3, title: "Results", description: "View detailed analysis and recommendations" }
];

const ScanAnalysis = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast: toastNotification } = useToast();

  const [scanFile, setScanFile] = useState<File | null>(null);
  const [reportableScanImageUrl, setReportableScanImageUrl] = useState<string | undefined>(undefined);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPatientInfoModal, setShowPatientInfoModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientInfoState | null>(
    null
  );
  const [analysisTriggeredByModal, setAnalysisTriggeredByModal] = useState(false);
  const [scanStats, setScanStats] = useState<{
    total: number;
    today: number;
    week: number;
    month: number;
  }>({ total: 0, today: 0, week: 0, month: 0 });

  const { canScan, remainingScans, isLimited } = useCanPerformScan();

  // Call the browser compatibility hook
  const { support: browserSupport, messages: compatibilityMessages } = useBrowserCompatibility();
  
  // Call the DICOM handler hook
  const { isDicom, previewUrl, isProcessing: isDicomProcessing, dicomError } = useDicomHandler(scanFile);

  // Use the custom hook for analysis logic
  const {
    isAnalyzing,
    analysisResult,
    handleAnalyze,
    setAnalysisResult,
    standardizedImage,
  } = useScanAnalysisHandler({
    scanFile,
    patientInfo,
    setPatientInfo,
    setShowPatientInfoModal,
    setShowSubscriptionModal,
    setScanStats,
  });

  // Add new state for tracking analysis progress steps
  const [analysisStep, setAnalysisStep] = useState<number>(0);

  // Reset all scan analysis state when the user logs out
  useEffect(() => {
    // Check if the user was previously authenticated and is now logged out
    if (!isAuthLoading && !isAuthenticated) {
      // Reset all scan-related state
      setScanFile(null);
      setReportableScanImageUrl(undefined);
      setShowCameraModal(false);
      setShowPatientInfoModal(false);
      setPatientInfo(null);
      setAnalysisTriggeredByModal(false);
      setAnalysisResult(null);
      setAnalysisStep(0);
      setScanStats({ total: 0, today: 0, week: 0, month: 0 });
      
      // Show a notification that content has been reset
      toast.info("Session ended", { 
        description: "Your scan analysis data has been cleared for privacy." 
      });
    }
  }, [isAuthenticated, isAuthLoading, setAnalysisResult]);
  
  // Listen for custom logout event to immediately reset state
  useEffect(() => {
    const resetScanAnalysisState = () => {
      console.log("Resetting scan analysis state from logout event");
      setScanFile(null);
      setReportableScanImageUrl(undefined);
      setShowCameraModal(false);
      setShowPatientInfoModal(false);
      setPatientInfo(null);
      setAnalysisTriggeredByModal(false);
      setAnalysisResult(null);
      setAnalysisStep(0);
    };
    
    // Add event listener
    window.addEventListener('userLogout', resetScanAnalysisState);
    
    // Clean up
    return () => {
      window.removeEventListener('userLogout', resetScanAnalysisState);
    };
  }, [setAnalysisResult]);

  // Enhanced handleAnalyze to update step progress
  const handleAnalyzeWithProgress = useCallback(() => {
    setAnalysisStep(1); // Start with image processing
    
    // Simulate processing delay and move to step 2
    setTimeout(() => {
      setAnalysisStep(2);
      handleAnalyze();
    }, 1500);
  }, [handleAnalyze]);

  // Update analysis result step when analysis is complete
  useEffect(() => {
    if (analysisResult) {
      setAnalysisStep(3);
    } else if (!scanFile) {
      setAnalysisStep(0);
    }
  }, [analysisResult, scanFile]);

  // Check if user has reached scan limit
  useEffect(() => {
    console.log(`[ScanAnalysis] Auth/CanScan Effect: isAuthenticated=${isAuthenticated}, canScan=${canScan}`);
    if (!isAuthenticated && !canScan) {
      toast.error("Scan Limit Reached", {
        description: "You've reached the limit of free scans. Sign in or create an account for more scans."
      });
      console.log("[ScanAnalysis] Auth/CanScan Effect: Navigating to /login");
      navigate("/login");
    }
  }, [isAuthenticated, canScan, navigate]);

  // Fetch user's scan statistics
  useEffect(() => {
    console.log(`[ScanAnalysis] Fetch Stats Effect: isAuthenticated=${isAuthenticated}`);
    const fetchScanStats = async () => {
      try {
        console.log("[ScanAnalysis] Fetch Stats Effect: Calling getScanCountStats()");
        const stats = await getScanCountStats();
        setScanStats(stats);
      } catch (error) {
        console.error("Failed to fetch scan statistics:", error);
      }
    };

    if (isAuthenticated) {
      fetchScanStats();
    } else {
      console.log("[ScanAnalysis] Fetch Stats Effect: Not authenticated, skipping fetchScanStats.");
    }
  }, [isAuthenticated]);

  // New useEffect to display compatibility messages from the hook
  useEffect(() => {
    compatibilityMessages.forEach(msg => {
      switch (msg.type) {
        case 'info':
          toast.info(msg.text, { description: msg.description, duration: 8000 });
          break;
        case 'warning':
          toast.warning(msg.text, { description: msg.description, duration: 8000 });
          break;
        case 'error':
          toast.error(msg.text, { description: msg.description, duration: 10000 });
          break;
      }
    });
  }, [compatibilityMessages]); // Run when messages change (should be only once)

  // New useEffect to show DICOM errors from the hook
  useEffect(() => {
    if (dicomError) {
      toast.error("DICOM Processing Error", { description: dicomError });
    }
  }, [dicomError]);

  // ADD new handler for file selection from ScanInputArea - SIMPLIFIED
  const handleFileSelectedFromInputArea = useCallback((file: File) => {
    console.log("File selected via input area:", file.name);
    setScanFile(file);
    setAnalysisResult(null); // Reset analysis if new file is selected
  }, [setAnalysisResult]);
  
  // Update handlePhotoCapturedFromModal - SIMPLIFIED
  const handlePhotoCapturedFromModal = (file: File, _dataUrl: string) => { // _dataUrl not needed here now
    console.log("Photo captured from modal:", file.name);
    setScanFile(file);
    setAnalysisResult(null); // Reset analysis
                setShowCameraModal(false);
    toast.success("Photo captured successfully!");
  };

  // Update resetScan - SIMPLIFIED
  const resetScan = useCallback(() => {
    setScanFile(null);
    setAnalysisResult(null);
    setShowCameraModal(false); // Close camera modal on reset
  }, [setAnalysisResult, setShowCameraModal]);

  // Update onPatientInfoSubmit to set a flag instead of calling handleAnalyze directly
  const onPatientInfoSubmit = useCallback((data: PatientInfoState) => {
    console.log("Patient info submitted:", data);
    setPatientInfo(data);
    setAnalysisTriggeredByModal(true); // Set flag to trigger analysis via useEffect
  }, [setPatientInfo]); // Removed handleAnalyze from deps, added setPatientInfo implicitly

  // Add a handler for modal close without submission
  const handlePatientInfoModalChange = useCallback((open: boolean) => {
    setShowPatientInfoModal(open);
    // If modal is closed without submission, clear any pending analysis
    if (!open && !patientInfo) {
      toast.info("Patient information is required for analysis");
    }
  }, [patientInfo]);

  // New useEffect to call handleAnalyze after patientInfo state is updated from modal
  useEffect(() => {
    if (analysisTriggeredByModal && patientInfo) {
      handleAnalyze();
      setAnalysisTriggeredByModal(false); // Reset the flag
    }
  }, [analysisTriggeredByModal, patientInfo, handleAnalyze]);

  // Effect to update reportableScanImageUrl
  useEffect(() => {
    const generateReportableImage = async () => {
      if (isDicom && scanFile) { // If it's DICOM and we have the file
        try {
          console.log('[ScanAnalysis] Converting DICOM file to PNG data URL for report...');
          const dataUrl = await convertDicomToPng(scanFile); // Use the imported function
          setReportableScanImageUrl(dataUrl);
          console.log('[ScanAnalysis] Successfully converted DICOM to PNG data URL for report.');
        } catch (error) {
          console.error("Error converting DICOM to PNG for report:", error);
          setReportableScanImageUrl(undefined); // Clear on error
          toast.error("Image Processing Error", { description: "Could not prepare DICOM image for reporting." });
        }
      } else if (scanFile && !isDicom && scanFile.type.startsWith('image/')) { // Non-DICOM images
        try {
          const dataUrl = await fileToDataUrl(scanFile);
          setReportableScanImageUrl(dataUrl);
          console.log('[ScanAnalysis] Converted image File to data URL for report.');
        } catch (error) {
          console.error("Error converting File to data URL:", error);
          setReportableScanImageUrl(undefined);
          toast.error("Image Processing Error", { description: "Could not prepare scan image for reporting (file to data)." });
        }
      } else if (previewUrl && !isDicom && !scanFile && !previewUrl.startsWith('blob:')) { // From camera, already a data URL
        setReportableScanImageUrl(previewUrl);
        console.log('[ScanAnalysis] Using existing non-blob previewUrl for report (e.g., from camera).');
      } else {
        // If scanFile is not an image or other conditions not met, clear it.
        if (scanFile && !isDicom && !scanFile.type.startsWith('image/')){
            console.warn("[ScanAnalysis] scanFile is present but not a reportable image type:", scanFile.type);
        } else if (isDicom && !scanFile) {
            console.warn("[ScanAnalysis] DICOM identified, but scanFile is missing for conversion to include in report.");
        }
        setReportableScanImageUrl(undefined);
      }
    };

    if (analysisResult) { 
        generateReportableImage();
    } else {
        setReportableScanImageUrl(undefined); 
    }

  }, [analysisResult, scanFile, isDicom, previewUrl, toast]); // Added toast to dependencies

  // Keep CameraAccessHelpDialog related state and component definition
  const [showCameraHelpDialog, setShowCameraHelpDialog] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl text-gray-100">
      {/* Decorative Elements */}
      <div className="fixed top-20 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse-slow delay-1000"></div>

      {/* Conditionally render content based on auth loading state */}
      {isAuthLoading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-lg">Loading your analysis tools...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-3xl font-bold tracking-tight"
                  >
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
                      AI-Powered Chest X-ray Analysis
                    </span>
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-gray-400 mt-1"
                  >
                    Our advanced AI analyzes your chest X-ray with 94.8% accuracy in
                    seconds
                  </motion.p>
                </div>
              </div>
            </motion.div>

            {/* Stats Bar */}
            <QuickStats />

            {/* Remaining Scans Info */}
            <RemainingScansInfo />

            {/* Main Content Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-6"
            >
              {!scanFile && (
                <ScanInputArea
                  onFileSelect={handleFileSelectedFromInputArea}
                  onOpenCameraModal={() => {
                    setShowCameraModal(true);
                  }}
                  isAnalysisInProgress={isAnalyzing || isDicomProcessing}
                />
              )}

              {scanFile && !analysisResult && previewUrl && (
                <Card className="overflow-hidden relative bg-gray-900/80 backdrop-blur-sm border border-blue-600/20 shadow-xl text-gray-100">
                  <CardHeader><CardTitle>Scan Preview</CardTitle></CardHeader>
                  <CardContent className="p-0 min-h-[400px] relative">
                    {isDicomProcessing ? (
                       <div className="absolute inset-0 flex items-center justify-center bg-gray-950/70 backdrop-blur-sm">
                          <p className="text-white text-lg">Processing file...</p>
                       </div>
                    ) : isDicom ? (
                            <DicomViewer file={scanFile} />
                          ) : (
                            <img
                        src={previewUrl}
                        alt="Scan preview"
                        className="object-contain w-full h-full max-h-[500px]"
                      />
                    )}
                    {isAnalyzing && !isDicomProcessing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-950/70 backdrop-blur-sm">
                              <div className="text-center">
                                <div className="relative w-20 h-20 mx-auto">
                                  <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                  <div className="absolute inset-2 border-4 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin-slow"></div>
                                </div>
                             <p className="text-white mt-4 text-lg font-medium">Analyzing X-ray...</p>
                              </div>
                            </div>
                          )}
                  </CardContent>
                  
                  {/* Action buttons moved below the preview */}
                  <div className="p-4 flex justify-end gap-3 border-t border-blue-600/20">
                    {!isAnalyzing && !analysisResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Button
                          onClick={handleAnalyzeWithProgress}
                          className="bg-indigo-900/90 hover:bg-indigo-800 text-indigo-100 hover:text-white border border-indigo-500/50 shadow-lg shadow-indigo-900/30 backdrop-blur-md transition-all duration-300"
                        >
                          <FileScan className="mr-2 h-4 w-4" />
                          Analyze Scan
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </Card>
              )}

              {/* Progress Bar - Now below scan preview */}
              {scanFile && (
                <AnalysisProgressBar 
                  currentStep={analysisStep}
                  isProcessing={isAnalyzing || isDicomProcessing}
                  steps={analysisSteps}
                />
              )}

              {/* Display dual view with original and heatmap */}
              {scanFile && analysisResult && analysisResult.heatmap_url && standardizedImage && (
                <DualViewDisplay
                  originalImage={standardizedImage} 
                  heatmapImage={analysisResult.heatmap_url}
                  isLoading={isAnalyzing}
                />
              )}
              
              {/* Analysis Results - Now below progress bar */}
              {scanFile && analysisResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <AnalysisResults
                    result={analysisResult}
                    scanImage={reportableScanImageUrl}
                  />
                </motion.div>
              )}
              
              {/* Reset Button - Now positioned at the bottom and visible throughout the process */}
              {scanFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-8 flex justify-center"
                >
                  <Button
                    variant="outline"
                    onClick={resetScan}
                    size="lg"
                    className="bg-blue-900/30 border-blue-400/50 text-blue-100 hover:bg-blue-800/40 hover:text-white backdrop-blur-md transition-all duration-300"
                  >
                    <RotateCcw className="mr-2 h-5 w-5" />
                    Reset Analysis
                  </Button>
                </motion.div>
              )}
              
              {!scanFile && dicomError && (
                <div className="p-4 my-4 text-center text-red-400 bg-red-900/30 rounded-md border border-red-500/50">
                  <p className="font-semibold">DICOM System Error:</p>
                  <p>{dicomError}</p>
                  <p className="text-xs mt-2">Some imaging features might not be available. Please try refreshing.</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Add the new PatientInfoModal component */}
          <PatientInfoModal 
            isOpen={showPatientInfoModal}
            onOpenChange={handlePatientInfoModalChange}
            onSubmit={onPatientInfoSubmit}
          />

          {/* Add the new SubscriptionModal component */}
          <SubscriptionModal 
            isOpen={showSubscriptionModal}
            onOpenChange={setShowSubscriptionModal}
            isAuthenticated={isAuthenticated}
            onNavigate={navigate}
          />

          {/* == Update CameraModal component props == */}
          {showCameraModal && (
            <CameraModal
              isOpen={showCameraModal}
              onClose={() => setShowCameraModal(false)}
              onPhotoCaptured={handlePhotoCapturedFromModal}
              browserSupportsCamera={browserSupport.hasGetUserMedia}
            />
          )}

          {/* Render the imported help dialog component instance */}
          <CameraAccessHelpDialog open={showCameraHelpDialog} onOpenChange={setShowCameraHelpDialog} />
        </> 
      )} 
    </div> 
  );
};

export default ScanAnalysis;
