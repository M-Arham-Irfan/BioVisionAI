import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

// Make sure the needed dependencies are available
let dicomInitialized = false;

// Initialize in a safer way
export function initDicom() {
  if (dicomInitialized) return;
  
  try {
    // Explicitly set the public path to prevent the error
    if (typeof window !== 'undefined' && window.location) {
      const basePath = window.location.origin + window.location.pathname;
      
      // Set external dependencies first
      cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
      cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
      
      // Set the imageLoaderPath explicitly
      if (cornerstoneWADOImageLoader.external) {
        cornerstoneWADOImageLoader.external.cornerstonePath = basePath;
      }
      
      // Configure web workers safely
      if (cornerstoneWADOImageLoader.webWorkerManager) {
        console.log("Initializing WADO web worker manager");
        cornerstoneWADOImageLoader.webWorkerManager.initialize({
          maxWebWorkers: 0, // Completely disable web workers
          startWebWorkersOnDemand: false,
          webWorkerPath: basePath,
          taskConfiguration: {
            decodeTask: {
              loadCodecsOnStartup: false,
              initializeCodecsOnStartup: false
            },
          }
        });
      }
    }

    // Configure the WADO Image Loader with broader compatibility settings
    if (cornerstoneWADOImageLoader.configure) {
      console.log("Configuring WADO image loader");
      cornerstoneWADOImageLoader.configure({
        useWebWorkers: false, // Completely disable web workers
        decodeConfig: {
          usePDFJS: false,
          useHTTPHeader: false
        },
        beforeSend: function(xhr) {
          // Disable cache to prevent CORS issues
          xhr.setRequestHeader('Cache-Control', 'no-cache');
          // Allow cross-origin requests
          xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
        }
      });
    }

    // Force the wadouri scheme to register without web workers
    try {
      // Manually register the wadouri scheme with proper checks
      if (cornerstoneWADOImageLoader.wadouri && 
          typeof cornerstoneWADOImageLoader.wadouri.register === 'function') {
        console.log("Registering wadouri scheme");
        cornerstoneWADOImageLoader.wadouri.register();
      } else {
        console.warn("WADO URI module not available or missing register function");
      }
    } catch (e) {
      console.error('Error registering wadouri scheme:', e);
    }

    dicomInitialized = true;
    console.log("DICOM libraries initialized successfully");
  } catch (error) {
    console.error('Failed to initialize DICOM libraries:', error);
  }
}

// Auto-initialize when imported
initDicom();

// Export the libraries
const dicomLibs = {
  cornerstone,
  cornerstoneWADOImageLoader,
  dicomParser,
  isInitialized: () => dicomInitialized
};

export default dicomLibs; 