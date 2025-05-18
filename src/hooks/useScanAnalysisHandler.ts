import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { uploadScan, analyzeScan, getScanCountStats } from '@/services/chestXrayService';
import { recordScanUsage } from '@/services/scanLimitService';
import { ScanAnalysisResult } from '@/types/database';
import { PatientInfo as DbPatientInfo } from '@/types/patient'; // Corrected import path
import { PatientInfoState } from '@/pages/ScanAnalysis'; // Assuming PatientInfoState is exported from ScanAnalysis
import { standardizeImageTo540px } from '@/utils/imageConverters'; // Import the standardization function
import { useCanPerformScan } from './useCanPerformScan'; // Import the hook

// Helper to convert Data URL to Blob
const dataURLtoBlob = (dataurl: string): Blob | null => {
  try {
    const arr = dataurl.split(',');
    if (!arr[0]) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
  } catch (e) {
    console.error("Error converting data URL to Blob", e);
    return null;
  }
}

interface UseScanAnalysisHandlerProps {
  scanFile: File | null;
  patientInfo: PatientInfoState | null;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfoState | null>>; // Might not be needed here if only used for modal trigger
  setShowPatientInfoModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSubscriptionModal: React.Dispatch<React.SetStateAction<boolean>>;
  setScanStats: React.Dispatch<React.SetStateAction<{ total: number; today: number; week: number; month: number; }>>; // For updating stats UI
}

export const useScanAnalysisHandler = ({
  scanFile,
  patientInfo,
  setPatientInfo,
  setShowPatientInfoModal,
  setShowSubscriptionModal,
  setScanStats,
}: UseScanAnalysisHandlerProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { canScan, loading: checkingScanLimit, refreshScanCounts } = useCanPerformScan();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ScanAnalysisResult | null>(null);
  const [savingToDatabase, setSavingToDatabase] = useState(false); // Added state for DB operations
  const [standardizedImage, setStandardizedImage] = useState<string | null>(null); // Add state for standardized image
  const [patientInfoRequested, setPatientInfoRequested] = useState(false);
  
  // Track previous authentication state to detect logout
  const prevAuthRef = useRef<boolean | null>(null);
  
  // Reset analysis state when user logs out
  useEffect(() => {
    // If previously authenticated but now not authenticated (logged out)
    if (prevAuthRef.current === true && isAuthenticated === false) {
      console.log("User logged out, resetting scan analysis state");
      setIsAnalyzing(false);
      setAnalysisResult(null);
      setStandardizedImage(null);
      setPatientInfoRequested(false);
    }
    
    // Update the ref with current auth state
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);
  
  // Listen for custom logout event to immediately reset state
  useEffect(() => {
    const resetAnalysisState = () => {
      console.log("Reset analysis state from logout event in hook");
      setIsAnalyzing(false);
      setAnalysisResult(null);
      setStandardizedImage(null);
      setPatientInfoRequested(false);
      setSavingToDatabase(false);
    };
    
    // Add event listener
    window.addEventListener('userLogout', resetAnalysisState);
    
    // Clean up
    return () => {
      window.removeEventListener('userLogout', resetAnalysisState);
    };
  }, []);

  // Reset patientInfoRequested when patientInfo is provided
  useEffect(() => {
    if (patientInfo) {
      setPatientInfoRequested(false);
    }
  }, [patientInfo]);

  const handleAnalyze = useCallback(async () => {
    console.log("Analyze called. Auth state:", { isAuthenticated, authLoading, user: !!user, patientInfo: !!patientInfo });
    
    if (!scanFile) {
      toast.error("No scan image selected.");
      return;
    }
    
    // Wait for auth to finish loading before proceeding
    if (authLoading) {
      toast.info("Preparing your account information...");
      return;
    }
    
    // Check if scan limit check is still loading
    if (checkingScanLimit) {
      toast.info("Checking scan limits, please wait...");
      return;
    }

    // Check scan limits first (using value from the hook)
    if (!canScan) {
      if (isAuthenticated) {
        toast.error("Daily Scan Limit Reached", {
          description: "You've reached your daily scan limit. Your limit will reset tomorrow, or you can upgrade your plan for more scans.",
        });
        setShowSubscriptionModal(true);
      } else {
        toast.error("Free Scan Limit Reached", {
          description: "You've reached the limit of free scans. Sign in or create an account for more scans.",
        });
        navigate("/login");
      }
      return;
    }

    // Improved check for patient info with authenticated users
    if (isAuthenticated && !patientInfo) {
      console.log("User is authenticated but no patient info. Showing modal.");
      // Prevent repeatedly showing the modal if the user dismisses it
      if (!patientInfoRequested) {
        setPatientInfoRequested(true);
        setShowPatientInfoModal(true);
      } else {
        toast.info("Patient information is required to proceed with analysis.");
      }
      return; // Don't proceed without patient info
    }

    setIsAnalyzing(true);
    setAnalysisResult(null); // Reset previous result before starting
    let patientId: number | null = null;
    let uploadedUrl: string | null = null;

    try {
      // 1. Get/Create Patient ID if authenticated
      if (isAuthenticated && user?.auth_id && patientInfo) {
        setSavingToDatabase(true);
        try {
          // Check if patient exists
          const { data: existingPatients, error: patientQueryError } = await supabase
            .from('patients')
            .select('patient_id')
            .eq('first_name', patientInfo.first_name)
            .eq('last_name', patientInfo.last_name)
            .eq('auth_id', user.auth_id)
            .limit(1);

          if (patientQueryError) throw patientQueryError;

          if (existingPatients && existingPatients.length > 0) {
            patientId = existingPatients[0].patient_id;
          } else {
            // Create new patient
            const { data: newPatient, error: createPatientError } = await supabase
              .from('patients')
              .insert({
                auth_id: user.auth_id,
                first_name: patientInfo.first_name,
                last_name: patientInfo.last_name,
                date_of_birth: patientInfo.date_of_birth,
                gender: patientInfo.gender,
                country: patientInfo.country,
                city: patientInfo.city,
                created_at: new Date().toISOString(),
              })
              .select('patient_id')
              .single();

            if (createPatientError) throw createPatientError;
            if (newPatient) {
              patientId = newPatient.patient_id;
              toast.success("Patient record created.");
            }
          }
        } catch (dbError: any) {
          console.error("Database error creating/fetching patient:", dbError);
          toast.error("Database Error", { description: "Could not save or retrieve patient information." });
          setIsAnalyzing(false); // Stop analysis on DB error
          return;
        } finally {
          setSavingToDatabase(false);
        }
      }

      // 2. Standardize the image to 540x540 PNG
      const isDicomFile = scanFile.type === 'application/dicom' || scanFile.name.toLowerCase().endsWith('.dcm');
      
      toast.info("Processing image...", { description: "Standardizing image to 540x540 format." });
      
      try {
        const standardized540px = await standardizeImageTo540px(scanFile, isDicomFile);
        setStandardizedImage(standardized540px); // Save standardized image to state for potential reuse
        
        // Convert data URL to file for upload
        const standardizedBlob = dataURLtoBlob(standardized540px);
        if (!standardizedBlob) throw new Error("Failed to convert standardized image to Blob");
        
        // Create File from Blob with proper filename
        const standardizedFile = new File(
          [standardizedBlob], 
          isDicomFile ? scanFile.name.replace(/\.dcm$/i, '_standardized.png') : scanFile.name.replace(/\.[^/.]+$/, '_standardized.png'),
          { type: 'image/png' }
        );
        
        // 3. Upload the standardized image
        uploadedUrl = await uploadScan(standardizedFile);
        if (!uploadedUrl) throw new Error("Failed to upload standardized scan.");
      } catch (standardizationError: any) {
        console.error("Image standardization failed:", standardizationError);
        toast.error("Image Processing Failed", { description: "Could not standardize image for analysis. Please try again or use a different file.", duration: 10000 });
        setIsAnalyzing(false);
        return;
      }

      // 4. Analyze Scan (Backend expects URL to uploaded resource - now always standardized PNG)
      const analysisPatientInfoForAPI: DbPatientInfo = patientInfo ?? { // Use DbPatientInfo type for API
        first_name: "Guest",
        last_name: "User",
        date_of_birth: "N/A",
        gender: "N/A",
        country: "N/A",
        city: "N/A",
        // Removed extra fields not present in DbPatientInfo type
      };

      const result = await analyzeScan(uploadedUrl, analysisPatientInfoForAPI, patientId);
      
      // The API will return a heatmap URL, but we should standardize this as well if it's not already
      if (result.heatmap_url && !result.heatmap_url.startsWith('data:image/png')) {
        try {
          // Standardize the heatmap to 540x540 too
          const standardizedHeatmap = await standardizeImageTo540px(result.heatmap_url, false);
          result.heatmap_url = standardizedHeatmap;
        } catch (heatmapError) {
          console.error("Failed to standardize heatmap:", heatmapError);
          // Continue with the original heatmap URL if standardization fails
        }
      }
      
      setAnalysisResult(result);

      // 5. Record Scan Usage
      await recordScanUsage(isAuthenticated ? user?.auth_id ?? null : null);

      // 6. Update UI Stats if authenticated
      if (isAuthenticated) {
        const updatedStats = await getScanCountStats();
        setScanStats(updatedStats); // Update stats via prop function
      }

      // Always refresh scan counts to update the UI - for both authenticated and guest users
      refreshScanCounts();

    } catch (error: any) {
      console.error("Analysis Process Error:", error);
      toast.error("Analysis Failed", {
        description: error.message || "An unexpected error occurred during analysis.",
      });
      setAnalysisResult(null); // Ensure result is cleared on error
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    scanFile,
    canScan,
    checkingScanLimit,
    isAuthenticated,
    authLoading,
    patientInfo,
    patientInfoRequested,
    user,
    navigate,
    setShowPatientInfoModal,
    setShowSubscriptionModal,
    setScanStats,
    refreshScanCounts,
  ]);

  return {
    isAnalyzing,
    analysisResult,
    handleAnalyze,
    savingToDatabase,
    setAnalysisResult,
    standardizedImage, // Expose the standardized image for direct use in the UI
  };
};

// We need to export PatientInfoState from ScanAnalysis.tsx
// Add this export to src/pages/ScanAnalysis.tsx:
// export interface PatientInfoState { ... } 