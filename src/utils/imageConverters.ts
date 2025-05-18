import { convertDicomToPng } from "@/components/scan-analysis/DicomViewer";

/**
 * Converts a File object to a data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Unknown error'));
    reader.readAsDataURL(file);
  });
};

/**
 * Converts a Blob URL to a data URL
 */
export const blobUrlToDataUrl = async (blobUrl: string): Promise<string> => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return fileToDataUrl(new File([blob], 'image.png', { type: blob.type }));
  } catch (error) {
    console.error('Error converting blob URL to data URL:', error);
    throw error;
  }
};

/**
 * Converts any image (File, URL, or data URL) to a standardized 540x540 PNG
 * Preserves aspect ratio and centers the image on a black background
 * 
 * @param imageInput File, URL or data URL of the image
 * @param isDicom Whether the image is a DICOM file (requires special processing)
 * @returns Promise resolving to a data URL of the standardized 540x540 PNG
 */
export const standardizeImageTo540px = async (
  imageInput: File | string,
  isDicom: boolean = false
): Promise<string> => {
  try {
    // For DICOM files, use the existing converter
    if (isDicom) {
      return convertDicomToPng(imageInput);
    }

    // Step 1: Convert input to data URL if it's not already
    let imageDataUrl: string;
    if (typeof imageInput === 'string') {
      // If it starts with 'blob:', convert blob URL to data URL
      if (imageInput.startsWith('blob:')) {
        imageDataUrl = await blobUrlToDataUrl(imageInput);
      } else {
        // It's already a data URL or a regular URL
        // For regular URLs, we need to fetch them
        if (!imageInput.startsWith('data:')) {
          try {
            const response = await fetch(imageInput);
            const blob = await response.blob();
            imageDataUrl = await fileToDataUrl(new File([blob], 'image.png', { type: blob.type }));
          } catch (error) {
            console.error('Error fetching URL:', error);
            throw new Error('Failed to fetch image URL');
          }
        } else {
          imageDataUrl = imageInput;
        }
      }
    } else {
      // It's a File object
      imageDataUrl = await fileToDataUrl(imageInput);
    }

    // Step 2: Create an image element to load the data URL
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Step 3: Create canvas with target dimensions
        const canvas = document.createElement('canvas');
        canvas.width = 540;
        canvas.height = 540;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Fill with black background
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 540, 540);
        
        // Calculate dimensions to maintain aspect ratio
        const imgAspect = img.width / img.height;
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        
        if (imgAspect > 1) {
          // Wider than tall
          drawWidth = 540;
          drawHeight = 540 / imgAspect;
          offsetY = (540 - drawHeight) / 2;
        } else {
          // Taller than wide
          drawHeight = 540;
          drawWidth = 540 * imgAspect;
          offsetX = (540 - drawWidth) / 2;
        }
        
        // Draw the image centered
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        // Convert to PNG data URL
        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageDataUrl;
    });
  } catch (error) {
    console.error('Error standardizing image:', error);
    throw error;
  }
}; 