import React, { useEffect, useRef, useState } from 'react';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

// Initialize the libraries
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.configure({
  useWebWorkers: false,
});

// Function to convert DICOM to PNG
export const convertDicomToPng = (fileOrUrl: File | string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create temporary DOM elements
    const tempDiv = document.createElement('div');
    tempDiv.style.display = 'none';
    tempDiv.style.width = '540px'; // Set to requested 540px
    tempDiv.style.height = '540px'; // Set to requested 540px
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px'; // Position off-screen but still rendered
    document.body.appendChild(tempDiv);
    
    // Enable cornerstone on the element
    cornerstone.enable(tempDiv);
    
    // Create image ID
    let imageId: string;
    let objUrl: string | null = null;
    
    if (typeof fileOrUrl === 'string') {
      // It's a URL
      imageId = `wadouri:${fileOrUrl}`;
    } else {
      // It's a File, create object URL
      objUrl = URL.createObjectURL(fileOrUrl);
      imageId = `wadouri:${objUrl}`;
    }
    
    // Load the image
    cornerstone.loadImage(imageId).then(image => {
      // Wait for the next frame to ensure the image is available
      requestAnimationFrame(() => {
        try {
          // Display the image to the hidden element
          cornerstone.displayImage(tempDiv, image);
          
          // Wait for cornerstone to complete rendering
          setTimeout(() => {
            try {
              // Get rendered canvas from cornerstone element
              const renderedCanvas = tempDiv.querySelector('canvas');
              
              if (!renderedCanvas || renderedCanvas.width === 0 || renderedCanvas.height === 0) {
                console.log("Invalid cornerstone canvas - trying direct image data approach");
                
                // Alternative approach: create a canvas and use pixel data directly
                const canvas = document.createElement('canvas');
                canvas.width = 540; // Set to requested 540px
                canvas.height = 540; // Set to requested 540px
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                  reject(new Error('Could not get canvas context'));
                  return;
                }
                
                // Create an ImageData object from the pixel data
                const imageData = ctx.createImageData(540, 540);
                const pixelData = image.getPixelData();
                
                // Original image dimensions
                const origWidth = image.width || 512;
                const origHeight = image.height || 512;
                
                // Scaling factors
                const scaleX = 540 / origWidth;
                const scaleY = 540 / origHeight;
                
                // Fill with black background
                for (let i = 0; i < imageData.data.length; i += 4) {
                  imageData.data[i] = 0;      // R
                  imageData.data[i + 1] = 0;  // G
                  imageData.data[i + 2] = 0;  // B
                  imageData.data[i + 3] = 255;// Alpha
                }
                
                // Map pixel data with basic scaling
                for (let y = 0; y < 540; y++) {
                  for (let x = 0; x < 540; x++) {
                    // Find corresponding pixel in source
                    const srcX = Math.floor(x / scaleX);
                    const srcY = Math.floor(y / scaleY);
                    
                    // Skip if outside source bounds
                    if (srcX >= origWidth || srcY >= origHeight) continue;
                    
                    // Get source pixel value
                    const srcIndex = srcY * origWidth + srcX;
                    if (srcIndex < pixelData.length) {
                      const value = pixelData[srcIndex];
                      
                      // Set destination pixel (RGBA)
                      const destIndex = (y * 540 + x) * 4;
                      imageData.data[destIndex] = value;     // R
                      imageData.data[destIndex + 1] = value; // G
                      imageData.data[destIndex + 2] = value; // B
                      imageData.data[destIndex + 3] = 255;   // Alpha
                    }
                  }
                }
                
                // Put the image data on the canvas
                ctx.putImageData(imageData, 0, 0);
                
                // Convert to PNG data URL
                const pngDataUrl = canvas.toDataURL('image/png');
                resolve(pngDataUrl);
              } else {
                // Create a new canvas to draw the image on with specific dimensions
                const canvas = document.createElement('canvas');
                canvas.width = 540; // Set to requested 540px
                canvas.height = 540; // Set to requested 540px
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                  reject(new Error('Could not get canvas context'));
                  return;
                }
                
                // Fill with black background first
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, 540, 540);
                
                // Calculate scaling to maintain aspect ratio
                const renderedAspect = renderedCanvas.width / renderedCanvas.height;
                let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
                
                if (renderedAspect > 1) {
                  // Wider than tall
                  drawWidth = 540;
                  drawHeight = 540 / renderedAspect;
                  offsetY = (540 - drawHeight) / 2;
                } else {
                  // Taller than wide
                  drawHeight = 540;
                  drawWidth = 540 * renderedAspect;
                  offsetX = (540 - drawWidth) / 2;
                }
                
                // Draw the rendered canvas onto our new canvas, centered and scaled
                ctx.drawImage(renderedCanvas, offsetX, offsetY, drawWidth, drawHeight);
                
                // Convert to PNG data URL
                const pngDataUrl = canvas.toDataURL('image/png');
                resolve(pngDataUrl);
              }
            } catch (error) {
              console.error('Error during canvas operations:', error);
              reject(error);
            } finally {
              // Clean up
              try {
                cornerstone.disable(tempDiv);
                document.body.removeChild(tempDiv);
                if (objUrl) URL.revokeObjectURL(objUrl);
              } catch (e) {
                console.warn('Error during cleanup:', e);
              }
            }
          }, 500); // Give cornerstone time to fully render
        } catch (error) {
          console.error('Error displaying DICOM:', error);
          document.body.removeChild(tempDiv);
          if (objUrl) URL.revokeObjectURL(objUrl);
          reject(error);
        }
      });
    }).catch(error => {
      console.error('Error loading DICOM image for conversion:', error);
      document.body.removeChild(tempDiv);
      if (objUrl) URL.revokeObjectURL(objUrl);
      reject(error);
    });
  });
};

interface DicomViewerProps {
  file?: File;
  url?: string;
}

export const DicomViewer: React.FC<DicomViewerProps> = ({ file, url }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const imageIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!elementRef.current || (!file && !url)) return;

    // Initialize cornerstone element
    const element = elementRef.current;
    cornerstone.enable(element);

    // Create a Cornerstone image ID
    let imageId: string;
    
    if (file) {
      // For File objects, create a blob URL
      const fileUrl = URL.createObjectURL(file);
      imageId = `wadouri:${fileUrl}`;
    } else if (url) {
      // For URL strings, use the URL directly
      imageId = `wadouri:${url}`;
    } else {
      console.error("DicomViewer: No file or URL provided");
      setError("No DICOM source provided");
      return;
    }
    
    imageIdRef.current = imageId;

    // Load and display the image
    cornerstone.loadImage(imageId).then(
      (image) => {
        cornerstone.displayImage(element, image);
        setError(null);
      },
      (error) => {
        console.error('Error loading DICOM image:', error);
        setError("Error loading DICOM image");
      }
    );

    return () => {
      // Clean up
      if (imageIdRef.current && file) { 
        // Only revoke object URL if we created one from a File
        try {
          const objUrlPart = imageIdRef.current.replace('wadouri:', '');
          URL.revokeObjectURL(objUrlPart);
        } catch (e) {
          console.warn('Could not revoke URL', e);
        }
      }
      if (element) {
        try {
          cornerstone.disable(element);
        } catch (e) {
          console.warn('Error during cornerstone cleanup', e);
        }
      }
    };
  }, [file, url]);

  return (
    <div ref={containerRef} className="dicom-viewer-container" style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <div 
        ref={elementRef} 
        className="cornerstone-element" 
        style={{ width: '100%', height: '100%', minHeight: '400px', background: '#000' }}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
          <div className="text-center p-4">
            <p className="text-red-400 font-medium">{error}</p>
            <p className="text-sm mt-2">Unable to load the DICOM image</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DicomViewer; 