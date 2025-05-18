import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCw, Download, AlertTriangle, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface DualViewDisplayProps {
  // Now we only expect URLs for both images (already standardized to 540x540)
  originalImage: string;
  heatmapImage: string | null;
  isLoading?: boolean;
}

const DualViewDisplay: React.FC<DualViewDisplayProps> = ({
  originalImage,
  heatmapImage,
  isLoading = false,
}) => {
  const [viewMode, setViewMode] = useState<
    "side-by-side" | "overlay" | "original" | "heatmap"
  >("side-by-side");
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    // Download the standardized image (which is now always a PNG)
    const link = document.createElement("a");
    link.href = originalImage;
    link.download = "standardized-xray-540px.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to render image
  const renderImage = (imgSrc: string | null, alt: string, className: string, style: React.CSSProperties) => {
    if (imgSrc) {
      return (
        <motion.img
          src={imgSrc}
          alt={alt}
          className={className}
          style={style}
          // Animate opacity for smooth loading
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      );
    }
    // Render nothing if imgSrc is null
    return null;
  };

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-950 border border-blue-600/20 shadow-xl shadow-blue-900/5">
      {/* Control Panel */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <div className="bg-gray-900/80 backdrop-blur-sm p-1.5 rounded-lg border border-blue-600/30">
          <div className="flex space-x-1">
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 ${
                viewMode === "original"
                  ? "bg-blue-600/50 text-blue-100"
                  : "hover:bg-blue-600/20 text-gray-300"
              }`}
              onClick={() => setViewMode("original")}
              title="Original View"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 ${
                viewMode === "heatmap"
                  ? "bg-blue-600/50 text-blue-100"
                  : "hover:bg-blue-600/20 text-gray-300"
              }`}
              onClick={() => setViewMode("heatmap")}
              disabled={!heatmapImage}
              title="Heatmap View"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 ${
                viewMode === "overlay"
                  ? "bg-blue-600/50 text-blue-100"
                  : "hover:bg-blue-600/20 text-gray-300"
              }`}
              onClick={() => setViewMode("overlay")}
              disabled={!heatmapImage}
              title="Overlay View"
            >
              <div className="h-4 w-4 bg-gradient-to-r from-blue-500 to-red-500 rounded-sm" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 ${
                viewMode === "side-by-side"
                  ? "bg-blue-600/50"
                  : "hover:bg-blue-600/20"
              }`}
              onClick={() => setViewMode("side-by-side")}
              disabled={!heatmapImage}
              title="Side by Side View"
            >
              <div className="h-4 w-4 flex">
                <div className="w-1/2 bg-gray-400 rounded-l-sm" />
                <div className="w-1/2 bg-red-400 rounded-r-sm" />
              </div>
            </Button>
          </div>
        </div>

        {viewMode === "overlay" && heatmapImage && (
          <div className="bg-gray-900/80 backdrop-blur-sm p-2 rounded-lg border border-blue-600/30">
            <span className="text-xs text-gray-300 block mb-1">
              Overlay Opacity
            </span>
            <Slider
              value={[overlayOpacity * 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={(value) => setOverlayOpacity(value[0] / 100)}
              className="w-32"
            />
          </div>
        )}

        <div className="bg-gray-900/80 backdrop-blur-sm p-1.5 rounded-lg border border-blue-600/30">
          <div className="flex space-x-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-blue-600/20 text-gray-300"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-blue-600/20 text-gray-300"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-blue-600/20 text-gray-300"
              onClick={handleRotate}
              title="Rotate"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-blue-600/20 text-gray-300"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Image Display */}
      <div className="relative min-h-[400px] max-h-[400px] flex items-center justify-center bg-black">
        {viewMode === "side-by-side" && heatmapImage ? (
          <div className="w-full h-full flex flex-col md:flex-row">
            {/* Original Image Pane */}
            <div className="flex-1 relative flex items-center justify-center p-2 border-r border-blue-600/20 overflow-hidden">
              {/* Render Image */}
              {renderImage(
                originalImage,
                "Chest X-ray",
                "w-full h-full max-h-[380px] object-contain",
                {
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.3s ease",
                }
              )}
              <div className="absolute bottom-2 left-2 text-xs text-blue-400 bg-gray-900/80 px-2 py-1 rounded-md border border-blue-500/30">
                Original
              </div>
            </div>
            {/* Heatmap Image Pane */}
            <div className="flex-1 relative flex items-center justify-center p-2 overflow-hidden">
              {heatmapImage && (
                renderImage(
                  heatmapImage,
                  "Heatmap Analysis",
                  "w-full h-full max-h-[380px] object-contain",
                  {
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.3s ease",
                  }
                )
              )}
              {heatmapImage && (
              <div className="absolute bottom-2 left-2 text-xs text-red-400 bg-gray-900/80 px-2 py-1 rounded-md border border-red-500/30">
                AI Heatmap
              </div>
              )}
            </div>
          </div>
        ) : viewMode === "overlay" && heatmapImage ? (
          <div className="relative flex items-center justify-center p-2 h-full">
            {/* Original Image Layer (base layer) */}
            {renderImage(
              originalImage,
              "Chest X-ray",
              "w-full h-full max-h-[380px] object-contain",
              {
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.3s ease",
              }
            )}
            
            {/* Heatmap Overlay Layer with opacity control */}
            {heatmapImage && (
              <motion.img
                src={heatmapImage}
                alt="Heatmap Overlay"
                className="absolute top-0 left-0 w-full h-full object-contain p-2 mix-blend-screen"
                style={{
                  opacity: overlayOpacity,
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.3s ease, opacity 0.3s ease",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: overlayOpacity }}
              />
            )}
            
            {/* Label for overlay mode */}
            <div className="absolute bottom-2 left-2 text-xs bg-gray-900/80 px-2 py-1 rounded-md border border-indigo-500/30 text-indigo-300">
              Combined View (Opacity: {Math.round(overlayOpacity * 100)}%)
            </div>
          </div>
        ) : viewMode === "heatmap" && heatmapImage ? (
          <div className="relative flex items-center justify-center p-4">
            {/* Heatmap Only View */}
            {heatmapImage && (
              <motion.div className="w-full h-full flex items-center justify-center">
                <motion.img
                  src={heatmapImage}
                  alt="AI Analysis Heatmap"
                  className="max-h-[380px] object-contain"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.3s ease",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Label for heatmap mode */}
                <div className="absolute bottom-2 left-2 text-xs text-red-400 bg-gray-900/80 px-2 py-1 rounded-md border border-red-500/30">
                  AI Heatmap Only
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="relative flex items-center justify-center p-4">
            {/* Original Only View */}
            {renderImage(
              originalImage,
              "Chest X-ray",
              "max-h-[380px] object-contain",
              {
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.3s ease",
              }
            )}
            
            {/* Label for original mode */}
            <div className="absolute bottom-2 left-2 text-xs text-blue-400 bg-gray-900/80 px-2 py-1 rounded-md border border-blue-500/30">
              Original Image Only
            </div>
          </div>
        )}

        {/* Global loading state (from parent component) */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-4 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin-slow"></div>
              </div>
              <p className="mt-4 text-blue-300 font-medium">
                Processing X-ray...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DualViewDisplay;
