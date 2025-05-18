import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ScanInputAreaProps {
  onFileSelect: (file: File, isDicom: boolean, imageDataUrl: string | null) => void;
  onOpenCameraModal: () => void;
  isAnalysisInProgress: boolean;
}

const ScanInputArea: React.FC<ScanInputAreaProps> = ({
  onFileSelect,
  onOpenCameraModal,
  isAnalysisInProgress,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isFileValid = (file: File): boolean => {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/dicom'];
    return validImageTypes.includes(file.type) || file.name.toLowerCase().endsWith('.dcm');
  };

  const fileToDataUrl = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processFile = async (file: File) => {
    if (!isFileValid(file)) {
      toast.error("Invalid file type. Please upload an image (JPEG, PNG, JPG) or DICOM (.dcm) file.");
      return;
    }
    const isDcm = file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom';
    
    if (isDcm) {
        onFileSelect(file, true, null);
    } else {
        fileToDataUrl(file, (dataUrl) => {
            onFileSelect(file, false, dataUrl);
        });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isAnalysisInProgress) return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAnalysisInProgress) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <Card className="overflow-hidden relative bg-gray-900/80 backdrop-blur-sm border border-blue-600/20 shadow-xl text-gray-100">
      <CardHeader className="bg-transparent relative z-10 border-none">
        <div className="flex items-center justify-between">
          <CardTitle className="font-bold text-gray-100">
            Chest X-ray Scan
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCameraModal}
              disabled={isAnalysisInProgress}
              className="bg-indigo-900/30 border-indigo-400/50 text-indigo-100 hover:bg-indigo-800/40 hover:text-white backdrop-blur-md transition-all duration-300"
            >
              <Camera className="mr-2 h-4 w-4" />
              Use Camera
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`flex flex-col items-center justify-center bg-gray-800/50 p-12 rounded-md min-h-[400px] border-t border-blue-600/10 ${isDragging ? 'border-blue-500 border-2' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-center space-y-4">
            <div className="h-20 w-20 bg-gray-900/90 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
              <div className="h-16 w-16 bg-gray-800/80 rounded-full flex items-center justify-center relative">
                <Upload className="h-8 w-8 text-blue-400" />
                <div className="absolute inset-0 border-2 border-blue-400/50 rounded-full animate-ping opacity-30"></div>
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-200">
                Drag & Drop your X-ray here
              </p>
              <p className="text-sm text-gray-400 mt-1">
                or click to browse your files (JPEG, PNG or DICOM/DCM)
              </p>
              <p className="text-xs text-blue-300 mt-2">
                Upload clear chest X-ray images for best results
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 bg-blue-800/40 border border-blue-300/50 text-blue-100 hover:bg-blue-700/50 hover:text-white backdrop-blur-md transition-all duration-300"
            >
              <Upload className="mr-2 h-4 w-4" />
              Browse Files
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/jpg,application/dicom,.dcm"
              className="hidden"
              disabled={isAnalysisInProgress}
            />
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default ScanInputArea; 