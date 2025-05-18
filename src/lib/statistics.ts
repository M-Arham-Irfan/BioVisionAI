import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

/**
 * Gets the total number of scans uploaded by a user
 * @param supabase Authenticated Supabase client
 * @param userId The user's auth_id
 * @returns The total number of scans
 */
export async function getUserTotalScans(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc('get_scans_done_by_user', {
    user_auth_id: userId
  });
  
  if (error) {
    console.error('Error getting user scan count:', error);
    return 0;
  }
  
  return data || 0;
}

/**
 * Gets the number of scans a user has uploaded on a specific date
 * @param supabase Authenticated Supabase client
 * @param userId The user's auth_id
 * @param date The date to check (YYYY-MM-DD format)
 * @returns The number of scans on the specified date
 */
export async function getUserScansByDate(
  supabase: SupabaseClient<Database>, 
  userId: string, 
  date: string
) {
  const { data, error } = await supabase.rpc('get_user_scan_count_by_date', {
    user_auth_id: userId,
    scan_date: date
  });
  
  if (error) {
    console.error('Error getting user scan count by date:', error);
    return 0;
  }
  
  return data || 0;
}

/**
 * Gets the total scan counts for all users (admin only)
 * @param supabase Authenticated Supabase client with admin privileges
 * @returns Statistics about total users and scans
 */
export async function getAllUsersScanCounts(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.rpc('get_all_users_scan_counts');
  
  if (error) {
    console.error('Error getting all users scan counts:', error);
    return { total_users: 0, total_scans: 0 };
  }
  
  // The function returns an array but we only need the first item
  return data && data.length > 0 
    ? data[0] 
    : { total_users: 0, total_scans: 0 };
}

/**
 * Gets the publicly available scan statistics
 * @param supabase Supabase client (can be unauthenticated)
 * @returns Public statistics about total users and scans
 */
export async function getPublicStatistics(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('public_statistics')
    .select('*')
    .single();
  
  if (error) {
    console.error('Error getting public statistics:', error);
    return { total_users: 0, total_scans: 0 };
  }
  
  return data || { total_users: 0, total_scans: 0 };
}

/**
 * Gets a user's current subscription plan information
 * @param supabase Authenticated Supabase client
 * @param userId The user's auth_id
 * @returns The user's current subscription plan details
 */
export async function getUserSubscriptionPlan(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      plan_id,
      subscription_plans!inner(
        name,
        price_usd,
        billing_interval,
        max_scans_per_day,
        features
      )
    `)
    .eq('auth_id', userId)
    .single();
  
  if (error) {
    console.error('Error getting user subscription plan:', error);
    return null;
  }
  
  return data?.subscription_plans?.[0] || null;
}

/**
 * Checks if a user has exceeded their daily scan limit
 * @param supabase Authenticated Supabase client
 * @param userId The user's auth_id
 * @returns Boolean indicating if the user can upload more scans today
 */
export async function canUserUploadMoreScans(supabase: SupabaseClient<Database>, userId: string) {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Get the user's plan
  const plan = await getUserSubscriptionPlan(supabase, userId);
  if (!plan) return false;
  
  // Get today's scan count
  const todayScans = await getUserScansByDate(supabase, userId, today);
  
  // Check if the user is below their daily limit
  return todayScans < plan.max_scans_per_day;
}

/**
 * Gets statistics about a user's scan history
 * @param supabase Authenticated Supabase client
 * @param userId The user's auth_id
 * @returns Statistics about the user's scans
 */
export async function getUserScanStats(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from('scans')
    .select('scan_type, body_part, created_at')
    .eq('auth_id', userId);
  
  if (error) {
    console.error('Error getting user scan statistics:', error);
    return {
      total: 0,
      by_type: {},
      by_body_part: {},
      by_month: {}
    };
  }
  
  // Initialize stats object
  const stats = {
    total: data.length,
    by_type: {} as Record<string, number>,
    by_body_part: {} as Record<string, number>,
    by_month: {} as Record<string, number>
  };
  
  // Process the data
  data.forEach(scan => {
    // Count by type
    const scanType = scan.scan_type || 'unknown';
    stats.by_type[scanType] = (stats.by_type[scanType] || 0) + 1;
    
    // Count by body part
    const bodyPart = scan.body_part || 'unknown';
    stats.by_body_part[bodyPart] = (stats.by_body_part[bodyPart] || 0) + 1;
    
    // Count by month
    const month = scan.created_at.substring(0, 7); // YYYY-MM format
    stats.by_month[month] = (stats.by_month[month] || 0) + 1;
  });
  
  return stats;
} 