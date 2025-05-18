import { SupabaseClient } from '@supabase/supabase-js';
import { 
  Database, 
  DbClient, 
  Disease, 
  ScanPrediction, 
  Json, 
  isValidPredictions,
  Scan
} from '../types/database';

// Re-export types for backward compatibility
export type { Database, Disease, ScanPrediction, Json, Scan };

/**
 * Get user profile data for a specific user
 * @param supabase The Supabase client
 * @param userId User auth ID
 * @returns User profile data
 */
export async function getUserProfile(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', userId)
    .single();
    
  return { data, error };
}

/**
 * Store prediction results for a specific scan
 * @param supabase The Supabase client
 * @param scanId The scan ID
 * @param predictions Array of disease predictions
 * @returns The result of the RPC call
 */
export async function storePredictions(
  supabase: SupabaseClient<Database>, 
  scanId: number, 
  predictions: Disease[]
) {
  try {
    return await supabase.rpc('store_scan_predictions', {
      p_scan_id: scanId,
      p_predictions: predictions
    });
  } catch (error) {
    console.error("Error storing scan predictions:", error);
    throw error;
  }
}

/**
 * Get predictions for a specific scan
 * @param supabase The Supabase client
 * @param scanId The scan ID
 * @returns Array of disease predictions or null if not found
 */
export async function getPredictions(supabase: SupabaseClient<Database>, scanId: number) {
  try {
    const { data, error } = await supabase.rpc('get_scan_predictions', {
      p_scan_id: scanId
    });
    
    if (error) throw error;
    
    return { 
      predictions: isValidPredictions(data) ? data : null, 
      error: null
    };
  } catch (error) {
    console.error("Error getting scan predictions:", error);
    return { 
      predictions: null, 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Get the top prediction for a specific scan
 * @param supabase The Supabase client
 * @param scanId The scan ID
 * @returns The top prediction or null if not found
 */
export async function getTopPrediction(supabase: SupabaseClient<Database>, scanId: number) {
  try {
    const { data, error } = await supabase.rpc('get_top_prediction', {
      p_scan_id: scanId
    });
    
    if (error) throw error;
    
    return { 
      prediction: data && data.length > 0 ? data[0] : null,
      error: null
    };
  } catch (error) {
    console.error("Error getting top prediction:", error);
    return { 
      prediction: null, 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Store a new scan in the database
 * @param supabase The Supabase client
 * @param scan The scan data to store
 * @returns The scan ID or null if failed
 */
export async function storeScan(
  supabase: SupabaseClient<Database>,
  scan: Database['public']['Tables']['scans']['Insert']
) {
  try {
    const { data, error } = await supabase
      .from('scans')
      .insert(scan)
      .select('scan_id')
      .single();
    
    if (error) throw error;
    
    return { scanId: data?.scan_id, error: null };
  } catch (error) {
    console.error("Error storing scan:", error);
    return { 
      scanId: null, 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Get a scan by ID
 * @param supabase The Supabase client
 * @param scanId The scan ID
 * @returns The scan data or null if not found
 */
export async function getScan(
  supabase: SupabaseClient<Database>,
  scanId: number
) {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('scan_id', scanId)
      .single();
    
    if (error) throw error;
    
    return { scan: data, error: null };
  } catch (error) {
    console.error("Error getting scan:", error);
    return { 
      scan: null, 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Get a list of scans for a specific patient
 * @param supabase The Supabase client
 * @param patientId The patient ID
 * @returns Array of scans or empty array if none found
 */
export async function getPatientScans(
  supabase: SupabaseClient<Database>,
  patientId: number
) {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('patient_id', patientId)
      .order('performed_at', { ascending: false });
    
    if (error) throw error;
    
    return { scans: data || [], error: null };
  } catch (error) {
    console.error("Error getting patient scans:", error);
    return { 
      scans: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Get a list of scans for the current authenticated user
 * @param supabase The Supabase client
 * @param userId User auth ID
 * @returns Array of scans or empty array if none found
 */
export async function getUserScans(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('auth_id', userId)
      .order('performed_at', { ascending: false });
    
    if (error) throw error;
    
    return { scans: data || [], error: null };
  } catch (error) {
    console.error("Error getting user scans:", error);
    return { 
      scans: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
} 