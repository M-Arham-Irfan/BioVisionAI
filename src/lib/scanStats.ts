import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

/**
 * Gets the total number of scans in the system (admin only)
 * @param supabase Authenticated Supabase client with admin privileges
 * @returns Total number of scans
 */
export async function getTotalScansCount(supabase: SupabaseClient<Database>) {
  const { count, error } = await supabase
    .from('scans')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error getting total scans count:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * Gets the total number of public scans
 * @param supabase Supabase client
 * @returns Total number of public scans
 */
export async function getPublicScansCount(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.rpc('get_public_total_scans');
  
  if (error) {
    console.error('Error getting public scans count:', error);
    return 0;
  }
  
  return data || 0;
}

/**
 * Gets scan counts grouped by type (admin only)
 * @param supabase Authenticated Supabase client with admin privileges
 * @returns Object with scan types as keys and counts as values
 */
export async function getScanCountsByType(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('scans')
    .select('scan_type')
    .not('scan_type', 'is', null);
  
  if (error) {
    console.error('Error getting scan types count:', error);
    return {};
  }
  
  // Count occurrences of each scan type
  const typeCounts: Record<string, number> = {};
  data.forEach(scan => {
    const scanType = scan.scan_type as string;
    typeCounts[scanType] = (typeCounts[scanType] || 0) + 1;
  });
  
  return typeCounts;
}

/**
 * Gets scan counts grouped by body part (admin only)
 * @param supabase Authenticated Supabase client with admin privileges
 * @returns Object with body parts as keys and counts as values
 */
export async function getScanCountsByBodyPart(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('scans')
    .select('body_part')
    .not('body_part', 'is', null);
  
  if (error) {
    console.error('Error getting body part counts:', error);
    return {};
  }
  
  // Count occurrences of each body part
  const partCounts: Record<string, number> = {};
  data.forEach(scan => {
    const bodyPart = scan.body_part as string;
    partCounts[bodyPart] = (partCounts[bodyPart] || 0) + 1;
  });
  
  return partCounts;
}

/**
 * Gets scan counts grouped by month (admin only)
 * @param supabase Authenticated Supabase client with admin privileges
 * @returns Object with months (YYYY-MM format) as keys and counts as values
 */
export async function getScanCountsByMonth(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('scans')
    .select('created_at');
  
  if (error) {
    console.error('Error getting monthly scan counts:', error);
    return {};
  }
  
  // Count scans by month
  const monthlyCounts: Record<string, number> = {};
  data.forEach(scan => {
    const month = scan.created_at.substring(0, 7); // YYYY-MM format
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
  });
  
  return monthlyCounts;
}

/**
 * Gets the top users by scan count (admin only)
 * @param supabase Authenticated Supabase client with admin privileges
 * @param limit Number of top users to return
 * @returns Array of users with their scan counts
 */
export async function getTopUsersByScanCount(
  supabase: SupabaseClient<Database>, 
  limit: number = 10
) {
  const { data, error } = await supabase.rpc('get_all_users_scan_counts');
  
  if (error) {
    console.error('Error getting top users by scan count:', error);
    return [];
  }
  
  // Sort by scan count and limit the results
  return data
    .sort((a, b) => b.total_scans - a.total_scans)
    .slice(0, limit);
}

/**
 * Gets a summary of predictions by disease type
 * @param supabase Authenticated Supabase client with admin privileges
 * @returns Object with disease types as keys and counts as values
 */
export async function getPredictionCountsByDisease(supabase: SupabaseClient<Database>) {
  // Custom query to extract disease names from the predictions JSON
  const { data, error } = await supabase
    .from('scan_predictions')
    .select('predictions');
  
  if (error) {
    console.error('Error getting prediction disease counts:', error);
    return {};
  }
  
  // Process the predictions to count by disease
  const diseaseCounts: Record<string, number> = {};
  data.forEach(prediction => {
    const predictions = prediction.predictions as Array<{ disease_name: string }>;
    if (Array.isArray(predictions)) {
      predictions.forEach(pred => {
        if (pred.disease_name) {
          diseaseCounts[pred.disease_name] = 
            (diseaseCounts[pred.disease_name] || 0) + 1;
        }
      });
    }
  });
  
  return diseaseCounts;
}

/**
 * Gets average prediction confidence by disease
 * @param supabase Authenticated Supabase client with admin privileges
 * @returns Object with disease types as keys and average confidence as values
 */
export async function getAverageConfidenceByDisease(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('scan_predictions')
    .select('predictions');
  
  if (error) {
    console.error('Error getting average confidence by disease:', error);
    return {};
  }
  
  // Process the predictions to calculate average confidence
  const confidenceSums: Record<string, number> = {};
  const confidenceCounts: Record<string, number> = {};
  
  data.forEach(prediction => {
    const predictions = prediction.predictions as Array<{ 
      disease_name: string;
      confidence: number;
    }>;
    
    if (Array.isArray(predictions)) {
      predictions.forEach(pred => {
        if (pred.disease_name && typeof pred.confidence === 'number') {
          if (!confidenceSums[pred.disease_name]) {
            confidenceSums[pred.disease_name] = 0;
            confidenceCounts[pred.disease_name] = 0;
          }
          confidenceSums[pred.disease_name] += pred.confidence;
          confidenceCounts[pred.disease_name]++;
        }
      });
    }
  });
  
  // Calculate averages
  const averages: Record<string, number> = {};
  Object.keys(confidenceSums).forEach(disease => {
    averages[disease] = confidenceSums[disease] / confidenceCounts[disease];
  });
  
  return averages;
} 