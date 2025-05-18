import { supabase } from "../lib/supabase";
import { ScanAnalysisResult, Disease, Scan } from '@/types/database';
import { PatientInfo } from '@/types/patient';
import { storeScan, storePredictions, getScan, getPredictions, getPatientScans as dbGetPatientScans } from '@/lib/database';

// Type definitions that exactly match existing usage
type PatientInfoValues = {
  name?: string;
  age?: string;
  gender?: string;
  country?: string;
  city?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
};

type ScanCountStats = {
  total: number;
  today: number;
  week: number;
  month: number;
};

// URL for the CheXNet API
const CHEXNET_API_URL = "https://thehammadishaq-chexnetdeep.hf.space/analyze";

// Function to upload a scan file and return its URL
export const uploadScan = async (file: File): Promise<string> => {
  try {
    const fileName = `${Date.now()}_${file.name}`;
    const bucketName = 'scans';
    
    // Skip bucket creation step - assume bucket already exists
    // The bucket should be created by an admin outside of the app workflow
    
    // Try to upload the file
    try {
      console.log(`Attempting to upload file to '${bucketName}' bucket...`);
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
    
      if (error) {
        console.error("Error uploading scan to storage:", error);
        
        // If error is related to bucket not existing, fallback to local URL
        if (error.message?.includes('bucket') || error.statusCode === 404 || error.statusCode === 403) {
          console.log("Bucket may not exist or not accessible, using local file URL");
          return URL.createObjectURL(file);
        }
        
        // For other errors, also fallback to local URL
        console.log("Using fallback object URL for scan due to upload error");
        return URL.createObjectURL(file);
      } else {
        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);
        
        console.log("File uploaded successfully:", urlData.publicUrl);
        return urlData.publicUrl;
      }
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      // Fallback to object URL if upload fails for any reason
      console.log("Using fallback object URL for scan due to exception");
      return URL.createObjectURL(file);
    }
  } catch (error) {
    console.error("Error in uploadScan:", error);
    
    // Fallback to object URL for testing or if storage is unavailable
    return URL.createObjectURL(file);
  }
};

// Helper function to get the current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  // Get the user from the users table
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();
    
  return data;
};

// Function to analyze a scan using the CheXNet API
export const analyzeScan = async (
  imageUrl: string,
  patientInfo: PatientInfo,
  patientId?: number
): Promise<ScanAnalysisResult> => {
  try {
    console.log("Starting scan analysis process...");
    
    // Convert the URL to a file for API submission
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Ensure the blob has a proper MIME type for processing
    // If the blob comes from a DICOM conversion, it already has image/jpeg mime type
    const blobType = blob.type || 'image/jpeg';
    const fileName = `scan_${Date.now()}.jpg`;
    const file = new File([blob], fileName, { type: blobType });

    // Create form data to send to the API
    const formData = new FormData();
    formData.append("file", file);

    console.log("Sending scan to AI analysis API...");

    // Send to the CheXNet API
    const apiResponse = await fetch(CHEXNET_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!apiResponse.ok) {
      throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const data = await apiResponse.json();
    console.log("AI analysis complete, processing results...");
    
    // Debug logs to check the structure of the API response
    console.log("API response data:", data);
    console.log("Heatmap image exists:", !!data.heatmap_image);
    console.log("Heatmap image type:", typeof data.heatmap_image);
    console.log("Heatmap image length (if string):", data.heatmap_image?.length);
    
    // Get top condition and probability
    const topPrediction = data.predictions[0] || ["Unknown", 0];
    const [topCondition, topProbability] = topPrediction;
    
    // Format the probability for display
    const probabilityPercent = Math.round(topProbability * 100);
    
    // Determine severity based on probability
    const severity = getSeverityFromProbability(topProbability);
    
    // Generate recommendation based on condition and probability
    const recommendation = generateRecommendation(topCondition, topProbability);
    
    // Current timestamp for the analysis
    const timestamp = new Date().toISOString();

    // Format prediction data for the new type
    const formattedPredictions = data.predictions.map(([disease, confidence]: [string, number]) => ({
      disease_name: disease, 
      confidence
    }));

    // Format the result according to our app's requirements
    const result: ScanAnalysisResult = {
      scan_id: undefined, // Will be set when stored in database
      condition: topCondition,
      severity: severity,
      probability: probabilityPercent,
      predictions: formattedPredictions,
      performed_at: timestamp,
      recommendation: recommendation,
      heatmap_url: data.heatmap_image ? `data:image/png;base64,${data.heatmap_image}` : null,
      patient_info: {
        first_name: patientInfo.first_name,
        last_name: patientInfo.last_name,
        date_of_birth: patientInfo.date_of_birth,
        gender: patientInfo.gender,
        country: patientInfo.country,
        city: patientInfo.city
      }
    };

    console.log("Storing scan results in database...");

    // Store the scan result in Supabase
    const scanId = await storeScanResult(result, imageUrl, patientId);
    
    if (scanId) {
      console.log(`Analysis complete and stored with scan ID: ${scanId}`);
      result.scan_id = scanId;
    } else {
      console.warn("Analysis complete but storage may have failed");
    }

    return result;
  } catch (error) {
    console.error("Scan analysis error:", error);
    // Return a more informative error that includes the specific error message
    if (error instanceof Error) {
      throw new Error(`Failed to analyze scan: ${error.message}`);
    } else {
      throw new Error("Failed to analyze scan: Unknown error");
    }
  }
};

// Helper function to store scan result in Supabase
const storeScanResult = async (result: ScanAnalysisResult, imageUrl: string, patientId?: number) => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    // Get current date/time
    const currentDateTime = new Date().toISOString();
    let fileName = `scan_${Date.now()}.jpg`;
    let storagePath = '';
    let fileSizeKB = 0;
    
    // Check if imageUrl is a base64 string or an actual URL
    if (imageUrl.startsWith('data:')) {
      // It's a base64 string that needs to be converted to a file and uploaded
      console.log("Converting base64 to file and uploading to storage");
      
      // Extract the base64 data
      const base64Data = imageUrl.split(',')[1];
      const mimeType = imageUrl.split(';')[0].split(':')[1];
      
      // Create a Blob from the base64 data
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });
      
      // Calculate file size
      fileSizeKB = Math.round(blob.size / 1024);
      
      // Upload to Supabase storage
      const uploadedUrl = await uploadScan(file);
      
      // Update storage path if upload was successful
      if (!uploadedUrl.startsWith('blob:')) {
        storagePath = uploadedUrl;
      } else {
        // Fallback: If upload failed, we still want to keep the base64 data
        console.warn("Upload to storage failed, using data URL as fallback");
        storagePath = 'fallback';
      }
    } else if (imageUrl.startsWith('blob:')) {
      // It's a blob URL from a local file that was just uploaded
      console.log("Local blob URL detected, retrieving and uploading file");
      
      try {
        // Get the blob from the URL
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        fileName = `scan_${Date.now()}.${getFileExtension(blob.type)}`;
        
        // Calculate file size
        fileSizeKB = Math.round(blob.size / 1024);
        
        // Create a File object from the blob
        const file = new File([blob], fileName, { type: blob.type });
        
        // Upload to Supabase storage
        const uploadedUrl = await uploadScan(file);
        
        // Update storage path if upload was successful
        if (!uploadedUrl.startsWith('blob:')) {
          storagePath = uploadedUrl;
        } else {
          console.warn("Upload to storage failed, using local object URL as fallback");
          storagePath = 'fallback';
        }
      } catch (fetchError) {
        console.error("Error fetching blob:", fetchError);
        storagePath = 'error_fetch_blob';
      }
    } else {
      // It's already a URL (could be from Supabase storage)
      console.log("Using existing URL:", imageUrl);
      storagePath = imageUrl;
      
      // Estimate file size for URL (we don't know exact size)
      fileSizeKB = estimateFileSizeKB(imageUrl);
    }
    
    // Upload heatmap image if it exists
    let heatmapStoragePath = null;
    
    if (result.heatmap_url && result.heatmap_url.startsWith('data:')) {
      console.log("Uploading heatmap image to storage");
      
      // Extract the base64 data
      const base64Data = result.heatmap_url.split(',')[1];
      const mimeType = result.heatmap_url.split(';')[0].split(':')[1];
      
      // Create a Blob from the base64 data
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: mimeType });
      const heatmapFileName = `heatmap_${Date.now()}.${getFileExtension(mimeType)}`;
      const file = new File([blob], heatmapFileName, { type: mimeType });
      
      // Upload to Supabase storage
      const uploadedUrl = await uploadScan(file);
      
      // Update storage path if upload was successful
      if (!uploadedUrl.startsWith('blob:')) {
        heatmapStoragePath = uploadedUrl;
        // Update the result with the new URL
        result.heatmap_url = uploadedUrl;
      }
    }
    
    // First, store the scan file information using the database.ts function
    const scanData = {
      auth_id: user.auth_id,
      patient_id: patientId || null, // Link to patient if ID is provided
      filename: fileName,
      storage_path: storagePath,
      file_size_kb: fileSizeKB,
      scan_type: 'X-ray',
      body_part: 'Chest',
      performed_at: currentDateTime,
      created_at: currentDateTime,
      heatmap_storage_path: heatmapStoragePath
    };
      
    const { scanId, error: scanError } = await storeScan(supabase, scanData);
      
    if (scanError || !scanId) {
      console.error("Error storing scan:", scanError);
      return null;
    }
    
    console.log(`Scan stored successfully with ID: ${scanId}`);
    
    // Store predictions using the database.ts function
    if (result.predictions && result.predictions.length > 0) {
      const { error: predError } = await storePredictions(
        supabase,
        scanId,
        result.predictions
      );
      
      if (predError) {
        console.error("Error storing predictions:", predError);
      } else {
        console.log(`Predictions stored successfully for scan ID: ${scanId}`);
      }
    }
    
    // Store report
    if (result.condition) {
      // Create report title based on condition
      const reportTitle = result.condition === 'No Finding' 
        ? 'Normal Chest X-ray Analysis' 
        : `Chest X-ray Analysis: ${result.condition}`;
        
      // Create report content
      const reportContent = `
Condition: ${result.condition}
Severity: ${result.severity}
Confidence: ${result.probability}%
Recommendation: ${result.recommendation}
      `.trim();
      
      const { data: reportResult, error: reportError } = await supabase
        .from('reports')
        .insert({
          scan_id: scanId,
          title: reportTitle,
          content: reportContent,
          created_by: user.auth_id,
          is_public: false,
          created_at: currentDateTime
        });
        
      if (reportError) {
        console.error("Error storing report:", reportError);
      } else {
        console.log(`Report stored successfully for scan ID: ${scanId}`);
      }
    }
    
    return scanId;
  } catch (error) {
    console.error("Error in storeScanResult:", error);
    return null;
  }
};

// Helper function to get file extension from MIME type
const getFileExtension = (mimeType: string): string => {
  const extensions: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'application/pdf': 'pdf'
  };
  
  return extensions[mimeType] || 'jpg'; // Default to jpg if unknown
};

// Helper function to estimate file size in KB from a base64 string or URL
const estimateFileSizeKB = (imageUrl: string): number => {
  if (imageUrl.startsWith('data:')) {
    // For base64 data URLs, we can estimate the size
    const base64Data = imageUrl.split(',')[1];
    if (base64Data) {
      // Base64 size to bytes (roughly 3/4 of the base64 length)
      return Math.round((base64Data.length * 0.75) / 1024);
    }
  }
  
  // Default size estimate for URLs (typical chest X-ray)
  return 500;
};

// Helper function to determine scan status from the result
const determineStatusFromResult = (result: ScanAnalysisResult): 'pending' | 'normal' | 'abnormal' | 'inconclusive' => {
  if (result.condition === 'No Finding' || result.probability < 0.3) {
    return 'normal';
  } else if (result.probability >= 0.7) {
    return 'abnormal';
  } else if (result.probability >= 0.3 && result.probability < 0.7) {
    return 'inconclusive';
  }
  return 'pending';
};

// Helper function to update user daily stats
const updateUserDailyStats = async (userId: number, date: string): Promise<void> => {
  try {
    // Check if a record exists for this user and date
    const { data: existingData } = await supabase
      .from('user_daily_stats')
      .select('stat_id, scans_count')
      .eq('user_id', userId)
      .eq('stat_date', date)
      .single();
    
    if (existingData) {
      // Update existing record
      await supabase
        .from('user_daily_stats')
        .update({ scans_count: existingData.scans_count + 1 })
        .eq('stat_id', existingData.stat_id);
    } else {
      // Insert new record
      await supabase
        .from('user_daily_stats')
        .insert({
          user_id: userId,
          stat_date: date,
          scans_count: 1
        });
    }
  } catch (error) {
    console.error("Error updating user daily stats:", error);
  }
};

// Helper function to update user total counts
const updateUserTotalCounts = async (userId: number): Promise<void> => {
  try {
    // Check if a record exists for this user
    const { data: existingData } = await supabase
      .from('user_totals')
      .select('user_id, total_scans')
      .eq('user_id', userId)
      .single();
    
    if (existingData) {
      // Update existing record
      await supabase
        .from('user_totals')
        .update({ 
          total_scans: existingData.total_scans + 1,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      // Insert new record
      await supabase
        .from('user_totals')
        .insert({
          user_id: userId,
          total_scans: 1,
          last_updated: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error("Error updating user total counts:", error);
  }
};

// Function to determine severity based on probability
const getSeverityFromProbability = (probability: number): string => {
  if (probability >= 0.85) return "High";
  if (probability >= 0.5) return "Medium";
  return "Low";
};

// Function to generate medical recommendation based on condition and probability
const generateRecommendation = (condition: string, probability: number): string => {
  if (condition === "No Finding" || probability < 0.5) {
    return "No significant findings detected. Maintain regular health check-ups as recommended by your healthcare provider.";
  }
  
  if (probability >= 0.85) {
    return `High probability of ${condition} detected. Immediate consultation with a specialist is strongly recommended for further evaluation and treatment planning.`;
  }
  
  return `Potential indicators of ${condition} detected. Follow-up with a healthcare professional is recommended for further evaluation.`;
};

// Function to get scan count statistics
export const getScanCountStats = async (): Promise<ScanCountStats> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { total: 0, today: 0, week: 0, month: 0 };
    }
    
    // Get total count by querying scans table directly
    const { count: totalCount, error: countError } = await supabase
      .from('scans')
      .select('*', { count: 'exact' })
      .eq('auth_id', user.auth_id)
      .limit(0);
    
    if (countError) {
      console.error("Error fetching total scans:", countError);
    }
    
    const total = totalCount || 0;
    
    // Prepare date ranges for different periods
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get today's count using the database function (single call)
    const { data: todayData, error: todayError } = await supabase.rpc(
      'get_user_scan_count_by_date',
      { 
        user_auth_id: user.auth_id,
        scan_date: todayStr
      }
    );
    
    if (todayError) {
      console.error("Error fetching today's scan count:", todayError);
    }
    
    const todayCount = todayData || 0;
    
    // For week and month counts, query directly with date filters
    // Calculate week start (7 days ago)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    
    // Get scans in the last 7 days (one query instead of 7)
    const { count: weekCount, error: weekError } = await supabase
      .from('scans')
      .select('*', { count: 'exact' })
      .eq('auth_id', user.auth_id)
      .gte('performed_at', weekStart.toISOString())
      .limit(0);
    
    if (weekError) {
      console.error("Error fetching week scan count:", weekError);
    }
    
    // Calculate month start (30 days ago)
    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);
    monthStart.setHours(0, 0, 0, 0);
    
    // Get scans in the last 30 days (one query instead of 30)
    const { count: monthCount, error: monthError } = await supabase
      .from('scans')
      .select('*', { count: 'exact' })
      .eq('auth_id', user.auth_id)
      .gte('performed_at', monthStart.toISOString())
      .limit(0);
    
    if (monthError) {
      console.error("Error fetching month scan count:", monthError);
    }
    
    return {
      total,
      today: todayCount,
      week: weekCount || 0,
      month: monthCount || 0
    };
  } catch (error) {
    console.error("Failed to fetch scan stats:", error);
    return {
      total: 0,
      today: 0,
      week: 0,
      month: 0
    };
  }
};


// Function to get all scans for a specific patient
export const getPatientScans = async (patientId: number): Promise<any[]> => {
  try {
    // Use the database.ts function to get patient scans
    const { scans, error } = await dbGetPatientScans(supabase, patientId);
    
    if (error) {
      console.error("Error fetching patient scans:", error);
      return [];
    }
    
    if (!scans || scans.length === 0) {
      return [];
    }
    
    // Process the scans
    const processedScans = await Promise.all(
      scans.map(async (scan) => {
        // Get predictions for each scan
        const { predictions: predictionData } = await getPredictions(supabase, scan.scan_id);
        
        // Format predictions
        let predictions = [];
        if (predictionData && Array.isArray(predictionData)) {
          predictions = predictionData
            .sort((a, b) => b.confidence - a.confidence)
            .map(pred => ({
              disease: pred.disease_name,
              confidence: Math.round(pred.confidence * 100)
            }));
        }
        
        // Format the scan data
        return {
          id: scan.scan_id,
          date: new Date(scan.performed_at).toLocaleDateString(),
          imageUrl: scan.storage_path,
          heatmapUrl: scan.heatmap_storage_path,
          scanType: scan.scan_type || 'Chest X-ray',
          bodyPart: scan.body_part || 'Chest',
          status: determineStatusFromPredictions(predictions),
          fileSizeKb: scan.file_size_kb,
          patientId: scan.patient_id,
          predictions: predictions,
          topDiagnosis: predictions.length > 0 ? predictions[0].disease : 'No Finding',
          confidence: predictions.length > 0 ? predictions[0].confidence : null
        };
      })
    );
    
    return processedScans;
  } catch (error) {
    console.error("Error in getPatientScans:", error);
    return [];
  }
};

// Helper function to determine status from predictions
const determineStatusFromPredictions = (predictions: any[]): 'normal' | 'abnormal' | 'inconclusive' => {
  if (!predictions || predictions.length === 0) {
    return 'normal';
  }
  
  // Get the top prediction
  const topPrediction = predictions[0];
  
  if (topPrediction.disease === 'No Finding' || topPrediction.confidence < 30) {
    return 'normal';
  } else if (topPrediction.confidence >= 70) {
    return 'abnormal';
  } else {
    return 'inconclusive';
  }
};


// Helper function to update scan status based on doctor's diagnosis
const updateScanStatus = async (scanId: number, doctorDiagnosis: string): Promise<void> => {
  try {
    // Determine status based on diagnosis
    let status: 'pending' | 'normal' | 'abnormal' | 'inconclusive' = 'pending';
    
    if (doctorDiagnosis.toLowerCase().includes('normal') || 
        doctorDiagnosis.toLowerCase().includes('no finding')) {
      status = 'normal';
    } else if (doctorDiagnosis.toLowerCase().includes('inconclusive') ||
              doctorDiagnosis.toLowerCase().includes('uncertain')) {
      status = 'inconclusive';
    } else {
      status = 'abnormal';
    }
    
    // Update the scan status
    const { error } = await supabase
      .from('scans')
      .update({ 
        status: status,
        findings: doctorDiagnosis
      })
      .eq('scan_id', scanId);
      
    if (error) {
      console.error("Error updating scan status:", error);
    }
  } catch (error) {
    console.error("Error in updateScanStatus:", error);
  }
};

// Helper function to determine severity from scan data
const determineSeverityFromScan = (scan: any): string => {
  if (!scan.confidence) return 'Unknown';
  
  const confidence = scan.confidence;
  if (confidence >= 0.85) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
};

