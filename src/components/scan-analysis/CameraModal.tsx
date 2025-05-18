import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Camera, FlipHorizontal, Upload, Scan } from 'lucide-react';
import { toast } from "sonner";
import { fileToDataUrl } from "@/utils/imageConverters";
import { convertDicomToPng } from "@/components/scan-analysis/DicomViewer";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (file: File, dataUrl: string) => void;
  browserSupportsCamera: boolean;
}

const CameraModal: React.FC<CameraModalProps> = ({ 
  isOpen, onClose, onPhotoCaptured, browserSupportsCamera 
}) => {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [permissionState, setPermissionState] = useState<'prompt'|'granted'|'denied'|'unknown'>('unknown');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [orientation, setOrientation] = useState('portrait');
  const [deviceType, setDeviceType] = useState<'mobile'|'laptop'|'desktop'|'unknown'>('unknown');
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Detect device type on mount
  useEffect(() => {
    const detectDeviceType = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      
      // Check if mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      setIsMobileDevice(isMobile);
      
      if (isMobile) {
        setDeviceType('mobile');
      } else if (userAgent.indexOf('Win') !== -1) {
        // Windows typically indicates desktop
        setDeviceType('desktop');
      } else if (userAgent.indexOf('Mac') !== -1) {
        // Mac could be desktop or laptop, we'll call it laptop for simplicity
        setDeviceType('laptop');
      } else {
        setDeviceType('unknown');
      }
      
      console.log(`[CameraModal] Detected device type: ${isMobile ? 'mobile' : 'desktop/laptop'}`);
    };
    
    detectDeviceType();
  }, []);

  // Handle orientation changes for mobile devices
  useEffect(() => {
    const handleOrientationChange = () => {
      if (window.matchMedia("(orientation: portrait)").matches) {
        setOrientation('portrait');
      } else {
        setOrientation('landscape');
      }
    };
    
    // Initial check
    handleOrientationChange();
    
    if (isMobileDevice) {
      window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
      window.addEventListener('resize', handleOrientationChange, { passive: true });
    }
    
    return () => {
      if (isMobileDevice) {
        window.removeEventListener('orientationchange', handleOrientationChange);
        window.removeEventListener('resize', handleOrientationChange);
      }
    };
  }, [isMobileDevice]);

  // Check camera permissions
  useEffect(() => {
    const checkPermission = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setPermissionState(result.state as 'prompt'|'granted'|'denied');
          
          // Show file upload option when camera is denied or on desktop/laptop
          if (result.state === 'denied' || deviceType === 'desktop' || deviceType === 'laptop') {
            setShowFileUpload(true);
          }
          
          // Listen for changes to permission
          result.addEventListener('change', () => {
            setPermissionState(result.state as 'prompt'|'granted'|'denied');
            if (result.state === 'denied') {
              setShowFileUpload(true);
            }
          });
        } catch (error) {
          console.log("Permission API not supported", error);
          setPermissionState('unknown');
          setShowFileUpload(true);
        }
      } else {
        // If permissions API isn't available, show file upload as fallback
        setShowFileUpload(true);
      }
    };
    
    if (browserSupportsCamera && isOpen) {
      checkPermission();
    } else {
      // If browser doesn't support camera, show file upload
      setShowFileUpload(true);
    }
  }, [browserSupportsCamera, isOpen, deviceType]);

  // Function to explicitly request camera permissions
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setPermissionState('granted');
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(true);
    } catch (error) {
      console.error("[CameraModal] Camera permission denied:", error);
      setPermissionState('denied');
      setShowFileUpload(true);
      setCameraError("Camera permission denied");
    }
  };

  const capturePhoto = useCallback(() => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setCameraError('Failed to capture photo');
      return;
    }
    
    // Convert to file
    const byteString = atob(imageSrc.split(',')[1]);
    const mimeString = imageSrc.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], `capture-${new Date().getTime()}.jpg`, { type: mimeString });
    
    onPhotoCaptured(file, imageSrc);
    onClose();
  }, [onPhotoCaptured, onClose]);

  const toggleCamera = useCallback(() => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  }, []);

  const handleError = (error: string|Error) => {
    console.error("[CameraModal] Webcam error:", error);
    setCameraError(typeof error === 'string' ? error : error.message);
    setShowFileUpload(true);
  };

  const handleUserMedia = () => {
    setIsCameraActive(true);
    setCameraError(null);
  };

  // Check if file is valid (supports DICOM now)
  const isFileValid = (file: File): boolean => {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/dicom'];
    return validImageTypes.includes(file.type) || file.name.toLowerCase().endsWith('.dcm');
  };

  // Handle file upload
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check that it's a valid file type
    if (!isFileValid(file)) {
      toast.error('Please select a valid image (JPEG, PNG) or DICOM file (.dcm)');
      return;
    }

    try {
      setIsProcessing(true);

      // Check if it's a DICOM file by extension or MIME type
      const isDicom = file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom';
      
      let dataUrl: string;
      
      if (isDicom) {
        // For DICOM, we need to convert to PNG first
        try {
          dataUrl = await convertDicomToPng(file);
          
          // Create a new file from the converted PNG data
          const pngBlob = await (await fetch(dataUrl)).blob();
          const pngFile = new File(
            [pngBlob], 
            `${file.name.replace('.dcm', '')}-converted.png`, 
            { type: 'image/png' }
          );
          
          // Use the converted PNG file
          onPhotoCaptured(pngFile, dataUrl);
          onClose();
        } catch (error) {
          console.error("Error converting DICOM:", error);
          toast.error("Could not convert DICOM file. Please try another image.");
        }
      } else {
        // For regular images, use FileReader
        dataUrl = await fileToDataUrl(file);
        onPhotoCaptured(file, dataUrl);
        onClose();
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error processing the file. Please try another image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Check if running in Edge which has specific camera issues
  const isEdgeBrowser = () => {
    return navigator.userAgent.indexOf('Edg') > -1;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-gray-900 border-gray-700 text-gray-200 p-0 overflow-hidden" closeOnOutsideClick={false}>
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle>{showFileUpload ? "Upload X-ray Image" : "Capture X-ray Image"}</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          {/* Camera Permission Request UI */}
          {(!isCameraActive && permissionState !== 'denied' && browserSupportsCamera) && (
            <div className="flex flex-col items-center justify-center p-6 text-center gap-4">
              <Camera size={48} className="text-blue-400" />
              <p className="text-gray-200">Camera access is required to take a photo</p>
              <Button variant="outline" onClick={requestCameraPermission} className="bg-indigo-900/30 border-indigo-400/50 text-indigo-100 hover:bg-indigo-800/40 hover:text-white backdrop-blur-md transition-all duration-300">
                Allow Camera Access
              </Button>
              
              {showFileUpload && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">Or upload an image</p>
                  <Button variant="default" onClick={triggerFileUpload} className="bg-blue-800/40 border border-blue-300/50 text-blue-100 hover:bg-blue-700/50 hover:text-white backdrop-blur-md transition-all duration-300">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Camera Permission Denied UI */}
          {permissionState === 'denied' && (
            <div className="flex flex-col items-center justify-center p-6 text-center gap-4">
              <AlertCircle size={48} className="text-red-500" />
              <p className="text-gray-200">Camera access was denied</p>
              <p className="text-sm text-gray-400">
                You can upload an image instead or change camera permissions in your browser settings.
              </p>
              <Button variant="default" onClick={triggerFileUpload} className="bg-blue-800/40 border border-blue-300/50 text-blue-100 hover:bg-blue-700/50 hover:text-white backdrop-blur-md transition-all duration-300">
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </Button>
            </div>
          )}
          
          {/* Browser Not Supported UI */}
          {!browserSupportsCamera && (
            <div className="flex flex-col items-center justify-center p-6 text-center gap-4">
              <AlertCircle size={48} className="text-amber-500" />
              <p className="text-gray-200">Your browser does not support camera access</p>
              <Button variant="default" onClick={triggerFileUpload} className="bg-blue-800/40 border border-blue-300/50 text-blue-100 hover:bg-blue-700/50 hover:text-white backdrop-blur-md transition-all duration-300">
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </Button>
            </div>
          )}
          
          {/* File Processing Indicator */}
          {isProcessing && (
            <div className="absolute inset-0 z-20 bg-gray-900/90 flex flex-col items-center justify-center p-6 text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600/30 border-t-indigo-600 mb-4"></div>
              <p className="text-gray-200">Processing image...</p>
              <p className="text-sm text-gray-400 mt-2">
                DICOM files may take a moment to convert
              </p>
            </div>
          )}
          
          {/* Camera Error UI */}
          {cameraError && isCameraActive && (
            <div className="absolute inset-0 z-10 bg-gray-900/95 flex flex-col items-center justify-center p-6 text-center gap-4">
              <AlertCircle size={48} className="text-red-500" />
              <p className="text-gray-200">{cameraError}</p>
              <Button variant="destructive" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {/* Active Camera UI */}
          {isCameraActive && permissionState === 'granted' && (
            <div className={`flex flex-col items-center ${orientation === 'landscape' ? 'landscape-mode' : ''}`}>
              <div className="relative w-full bg-black rounded-md overflow-hidden">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: facingMode,
                    aspectRatio: 4/3,
                  }}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleError}
                  style={{ width: '100%', height: 'auto' }}
                  mirrored={facingMode === 'user'}
                />
                
                {isMobileDevice && (
                  <Button 
                    variant="secondary" 
                    size="icon"
                    className="absolute bottom-4 right-4 rounded-full bg-gray-800/80 hover:bg-gray-700"
                    onClick={toggleCamera}
                  >
                    <FlipHorizontal className="h-5 w-5 text-gray-100" />
                  </Button>
                )}
              </div>
              
              <div className="flex justify-center mt-4 gap-2">
                <Button 
                  onClick={capturePhoto} 
                  className="flex gap-2 items-center bg-indigo-900/30 border border-indigo-400/50 text-indigo-100 hover:bg-indigo-800/40 hover:text-white backdrop-blur-md transition-all duration-300"
                >
                  <Camera className="h-5 w-5" />
                  Capture Photo
                </Button>
                
                {showFileUpload && (
                  <Button variant="default" onClick={triggerFileUpload} className="bg-blue-800/40 border border-blue-300/50 text-blue-100 hover:bg-blue-700/50 hover:text-white backdrop-blur-md transition-all duration-300">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Instead
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/jpg,application/dicom,.dcm"
          style={{ display: 'none' }}
        />
        
        <DialogFooter className="sm:justify-start border-t border-gray-800 pt-4 mt-4">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose} 
            className="bg-gray-800 hover:bg-gray-700 text-gray-200"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CameraModal; 