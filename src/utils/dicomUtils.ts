import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dcmjs from 'dcmjs';

// Initialize WADO Image Loader
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dcmjs.dicomParser;

// Configure WADO Image Loader to use Web Workers
cornerstoneWADOImageLoader.webWorkerManager.initialize({
  maxWebWorkers: navigator.hardwareConcurrency || 2,
  startWebWorkersOnDemand: true,
});

/**
 * Convert a DICOM file to a displayable image
 * @param file DICOM file
 * @returns A promise that resolves to an image URL
 */
export async function convertDicomToImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a blob URL for the DICOM file
      const fileObjectUrl = URL.createObjectURL(file);
      
      // Create a canvas element to render the DICOM image
      const canvas = document.createElement('canvas');
      const element = document.createElement('div');
      element.style.width = '512px';
      element.style.height = '512px';
      
      // Enable cornerstone on the element
      cornerstone.enable(element);
      
      // Load the DICOM image
      cornerstone.loadImage('wadouri:' + fileObjectUrl).then(
        (image) => {
          // Display the image on the element
          cornerstone.displayImage(element, image);
          
          // Draw the image on the canvas
          const viewport = cornerstone.getDefaultViewportForImage(element, image);
          cornerstone.setViewport(element, viewport);
          
          // Get the canvas with the rendered image
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d');
          
          if (context) {
            // We can't directly draw the cornerstone element to the canvas
            // Instead, we need to get rendered content from cornerstone's canvas
            
            // Get the canvas from cornerstone's enabledElement
            const enabledElement = cornerstone.getEnabledElement(element);
            if (enabledElement && enabledElement.canvas) {
              // Draw cornerstone's canvas to our canvas
              context.drawImage(enabledElement.canvas, 0, 0, image.width, image.height);
              
              // Convert the canvas to a JPEG image
              const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
              
              // Clean up resources
              cornerstone.disable(element);
              URL.revokeObjectURL(fileObjectUrl);
              
              resolve(jpegUrl);
            } else {
              reject(new Error('Could not get cornerstone canvas'));
            }
          } else {
            reject(new Error('Could not get canvas context'));
          }
        },
        (error) => {
          console.error('Error loading DICOM image:', error);
          URL.revokeObjectURL(fileObjectUrl);
          reject(error);
        }
      );
    } catch (error) {
      console.error('Error in convertDicomToImage:', error);
      reject(error);
    }
  });
}

/**
 * Check if a file is a DICOM file
 * @param file File to check
 * @returns True if the file is a DICOM file
 */
export function isDicomFile(file: File): boolean {
  return (
    file.type === 'application/dicom' || 
    file.name.toLowerCase().endsWith('.dcm')
  );
} 