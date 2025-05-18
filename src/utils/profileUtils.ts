/**
 * Utilities for handling profile data in localStorage
 */

export const PROFILE_PICTURE_STORAGE_KEY = "userProfilePicture";

/**
 * Saves a profile picture to localStorage
 * @param imageData Base64 or Data URL of the image
 */
export const saveProfilePictureToStorage = (imageData: string): void => {
  localStorage.setItem(PROFILE_PICTURE_STORAGE_KEY, imageData);
};

/**
 * Retrieves a profile picture from localStorage
 * @returns The stored profile picture URL or null if not found
 */
export const getProfilePictureFromStorage = (): string | null => {
  return localStorage.getItem(PROFILE_PICTURE_STORAGE_KEY);
};

/**
 * Converts a File object to a Data URL
 * @param file The file to convert
 * @returns Promise that resolves with the Data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("Failed to convert file to Data URL"));
      }
    };
    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Removes the profile picture from localStorage
 */
export const removeProfilePictureFromStorage = (): void => {
  localStorage.removeItem(PROFILE_PICTURE_STORAGE_KEY);
}; 