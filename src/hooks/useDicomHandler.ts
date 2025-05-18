import { useState, useEffect, useRef } from 'react';
import dicomLibs from '@/utils/dicomInit'; // Import the initialized libs
import { toast } from 'sonner';

// Function to check for DICOM magic number
const isDicomFile = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    if (file.size < 132) {
      resolve(false); // Not enough bytes for magic number
      return;
    }
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (e.target?.readyState === FileReader.DONE) {
        const buffer = e.target.result as ArrayBuffer;
        const uint8 = new Uint8Array(buffer, 128, 4); // Read bytes 128-131
        const magic = String.fromCharCode.apply(null, Array.from(uint8));
        resolve(magic === 'DICM');
      } else {
        resolve(false);
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 132)); // Read only the first 132 bytes
  });
};

// Function to read file as Data URL (for non-DICOM images)
const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

export interface DicomHandlerResult {
  isDicom: boolean | null; // null while checking
  previewUrl: string | null;
  isProcessing: boolean;
  dicomError: string | null;
}

export const useDicomHandler = (scanFile: File | null): DicomHandlerResult => {
  const [isDicom, setIsDicom] = useState<boolean | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dicomError, setDicomError] = useState<string | null>(null);
  const currentObjectURL = useRef<string | null>(null); // Ref to track object URL

  // 1. Verify DICOM library initialization
  useEffect(() => {
    console.log("Verifying DICOM libraries in useDicomHandler");
    if (!dicomLibs || !dicomLibs.cornerstone || !dicomLibs.cornerstoneWADOImageLoader || !dicomLibs.dicomParser) {
        const errorMsg = "Core DICOM libraries not properly initialized.";
        console.error(errorMsg);
        setDicomError(errorMsg);
        // Attempt to disable web workers as a fallback
        if (dicomLibs?.cornerstoneWADOImageLoader?.configure) {
            try {
                dicomLibs.cornerstoneWADOImageLoader.configure({ useWebWorkers: false });
                console.log("Disabled web workers for compatibility.");
            } catch (configError) {
                 console.error("Failed to configure WADO Image Loader:", configError);
            }
        }
    } else {
        console.log("DICOM libraries verified in useDicomHandler.");
        setDicomError(null); // Clear error if libs are okay
    }
  }, []); // Runs once on mount

  // 2. Process scanFile when it changes
  useEffect(() => {
    // Cleanup previous URL if it was an object URL
    if (currentObjectURL.current) {
      console.log("Revoking previous Object URL:", currentObjectURL.current);
      URL.revokeObjectURL(currentObjectURL.current);
      currentObjectURL.current = null;
    }
    
    // Reset state if file is null
    if (!scanFile) {
      setIsDicom(null);
      setPreviewUrl(null);
      setIsProcessing(false);
      return;
    }

    // Process the new file
    let isActive = true; // Flag to prevent setting state on unmounted component
    setIsProcessing(true);
    setIsDicom(null); // Indicate checking
    setPreviewUrl(null);

    const processFile = async () => {
      try {
        const isFileDicom = await isDicomFile(scanFile);
        if (!isActive) return;

        setIsDicom(isFileDicom);

        if (isFileDicom) {
          // Create object URL for DICOM viewer
          const objectUrl = URL.createObjectURL(scanFile);
          if (!isActive) {
              URL.revokeObjectURL(objectUrl); // Revoke if component unmounted during async op
              return;
          };
          currentObjectURL.current = objectUrl; // Track it for cleanup
          setPreviewUrl(objectUrl);
          console.log("Created Object URL for DICOM:", objectUrl);
        } else {
          // Assume image, read as Data URL
          const dataUrl = await readFileAsDataURL(scanFile);
           if (!isActive) return;
           setPreviewUrl(dataUrl);
        }
      } catch (error) {
        console.error("Error processing file:", error);
         if (!isActive) return;
         setDicomError("Failed to process the uploaded file.");
         setIsDicom(false); // Assume not DICOM on error
         setPreviewUrl(null);
      } finally {
         if (isActive) {
            setIsProcessing(false);
         }
      }
    };

    processFile();

    // Cleanup function
    return () => {
      isActive = false; // Mark as inactive on unmount/re-run
      // Revoke URL if the effect cleans up
      if (currentObjectURL.current) {
        console.log("Revoking Object URL on cleanup:", currentObjectURL.current);
        URL.revokeObjectURL(currentObjectURL.current);
        currentObjectURL.current = null;
      }
    };
  }, [scanFile]); // Re-run only when scanFile changes

  return { isDicom, previewUrl, isProcessing, dicomError };
}; 