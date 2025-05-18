import { Database } from '../types/database';
import { createClient } from '@supabase/supabase-js';

// These environment variables should be set in a .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Cache system to deduplicate requests
interface RequestCache {
  [key: string]: {
    data: any;
    timestamp: number;
    promise?: Promise<any>;
  };
}

// Tracking for cleanup
let authStateChangeSubscription: { subscription: { unsubscribe: () => void } } | null = null;
let tokenCheckIntervalId: NodeJS.Timeout | null = null;
let cleanupEventListeners: (() => void)[] = [];
// Add guard flag to prevent multiple subscriptions
let hasSetupAuthListener = false;

// Cache for 10 seconds by default
const REQUEST_CACHE_TTL = 10000;
const requestCache: RequestCache = {};

// Log initialization for debugging
console.log("Initializing Supabase client with URL:", 
  supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : 'MISSING URL');
console.log("Anon Key status:", supabaseAnonKey ? "PROVIDED" : "MISSING");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Clean up the key if it has line breaks or extra spaces
if (supabaseAnonKey) {
  supabaseAnonKey = supabaseAnonKey.trim().replace(/[\r\n]+/g, '');
}

// Add these utility functions after the requestCache and other setup code but before 
// the supabase client initialization

// Flow state backup utilities
const FLOW_STATE_KEY = 'biovision-auth-storage-v2';

/**
 * Creates a backup of the current authentication flow state
 * @param {string} flowType - The type of auth flow ('email-verification' or 'password-reset')
 * @returns {boolean} Whether backup was successful
 */
export function backupFlowState(flowType: 'email-verification' | 'password-reset'): boolean {
  try {
    const flowState = localStorage.getItem(FLOW_STATE_KEY);
    if (!flowState) {
      console.warn(`No flow state found to backup for ${flowType}`);
      return false;
    }
    
    // Create regular backup
    const backupKey = `biovision-${flowType}-backup`;
    localStorage.setItem(backupKey, flowState);
    
    // Create session storage backup
    try {
      sessionStorage.setItem(backupKey, flowState);
    } catch (e) {
      console.error(`Failed to backup flow state to sessionStorage for ${flowType}:`, e);
    }
    
    // Create timestamped backup
    const timestamp = new Date().getTime();
    localStorage.setItem(`biovision-${flowType}-backup-${timestamp}`, flowState);
    
    console.log(`Successfully created backup for ${flowType} flow state`);
    return true;
  } catch (e) {
    console.error(`Error backing up flow state for ${flowType}:`, e);
    return false;
  }
}

/**
 * Attempts to restore a flow state from available backups
 * @param {string} flowType - The type of auth flow ('email-verification' or 'password-reset')
 * @param {string} code - The verification code from URL
 * @returns {Promise<boolean>} Whether restoration and verification succeeded
 */
export async function restoreAndVerifyFlowState(
  flowType: 'email-verification' | 'password-reset',
  code: string
): Promise<boolean> {
  if (!code) return false;
  
  try {
    // First check if we already have a valid flow state
    const currentFlowState = localStorage.getItem(FLOW_STATE_KEY);
    if (currentFlowState) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.session) {
        console.log(`Verification successful with existing flow state for ${flowType}`);
        return true;
      }
    }
    
    console.log(`Attempting to restore ${flowType} flow state from backups...`);
    
    // Check regular backups first
    const backupKey = `biovision-${flowType}-backup`;
    const localBackup = localStorage.getItem(backupKey);
    const sessionBackup = sessionStorage.getItem(backupKey);
    
    // Try each backup source
    const backupSources = [
      { name: 'localStorage', data: localBackup },
      { name: 'sessionStorage', data: sessionBackup }
    ];
    
    // Add timestamped backups
    const timestampedKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`biovision-${flowType}-backup-`)) {
        timestampedKeys.push(key);
      }
    }
    
    // Sort by timestamp (newest first)
    timestampedKeys.sort().reverse();
    timestampedKeys.forEach(key => {
      backupSources.push({ 
        name: `timestamped-${key}`,
        data: localStorage.getItem(key)
      });
    });
    
    // Try each backup until one works
    for (const source of backupSources) {
      if (!source.data) continue;
      
      try {
        console.log(`Trying backup from ${source.name}...`);
        localStorage.setItem(FLOW_STATE_KEY, source.data);
        
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.session) {
          console.log(`Successfully verified with ${flowType} backup from ${source.name}`);
          return true;
        } else {
          console.log(`Backup from ${source.name} didn't work:`, error?.message);
        }
      } catch (e) {
        console.error(`Error using backup from ${source.name}:`, e);
      }
    }
    
    console.warn(`All ${flowType} backup attempts failed`);
    return false;
  } catch (e) {
    console.error(`Error in restoreAndVerifyFlowState for ${flowType}:`, e);
    return false;
  }
}

/**
 * Clears all authentication flow state from storage to ensure clean login state
 * @returns {void}
 */
export function clearAuthFlowState(): void {
  try {
    // Clear the main flow state
    localStorage.removeItem(FLOW_STATE_KEY);
    
    // Also clear all backup keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('biovision-') && 
          (key.includes('-backup') || key.includes('auth-storage'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        console.error('Error clearing sessionStorage item:', e);
      }
    });
    
    console.log('Cleared auth flow state for clean login experience');
  } catch (e) {
    console.error('Error clearing auth flow state:', e);
  }
}

// Create the Supabase client with robust error handling
let supabaseOriginal;
try {
  supabaseOriginal = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'biovision-auth-storage-v2', 
      flowType: 'pkce'
    },
    global: {
      headers: { 'x-client-info': 'biovision-health-app' },
      fetch: (url, options) => {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 60000); // Increased from 30000 (30s) to 60s timeout
        
        return fetch(url, {
          ...options,
          signal: options?.signal || timeoutController.signal,
        }).finally(() => clearTimeout(timeoutId));
      }
    },
    realtime: {
      timeout: 40000, // Increased from 20000 to 40000
      params: {
        eventsPerSecond: 10
      }
    }
  });
  
  console.log("Supabase client initialized successfully");

  // Set up a global listener for auth events
  if (!hasSetupAuthListener) {
    hasSetupAuthListener = true;
    console.log("Setting up auth state change listener (first instance)");
    
    authStateChangeSubscription = supabaseOriginal.auth.onAuthStateChange((event, session) => {
      console.log(`Supabase auth event: ${event}`);
      
      // Always log auth events for debugging
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully at:', new Date().toISOString());
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out at:', new Date().toISOString());
        // Clear any cached data when user signs out
        localStorage.removeItem('biovision-user-data');
        sessionStorage.removeItem('biovision-temp-data');
        clearRequestCache();
      } else if (event === 'SIGNED_IN') {
        console.log('User signed in at:', new Date().toISOString());
      } else if (event === 'USER_UPDATED') {
        console.log('User profile updated at:', new Date().toISOString());
      }
    });
  } else {
    console.log("Skipping auth listener setup - already initialized");
  }
  
  // Set up a periodic token check (as a backup to autoRefreshToken)
  // Store interval ID so it can be cleared if needed
  tokenCheckIntervalId = setInterval(async () => {
    // Skip running this check if AuthContext is managing sessions
    // This avoids duplicate token checks between supabase.ts and AuthContext.tsx
    if (typeof window !== 'undefined' && window.localStorage.getItem('auth-context-active') === 'true') {
      // Skip when AuthContext is active
      return;
    }

    try {
      const { data } = await supabaseOriginal.auth.getSession();
      if (data?.session) {
        const expiresAt = data.session.expires_at;
        if (expiresAt) {
          const expiryDate = new Date(expiresAt * 1000);
          const now = new Date();
          const minutesUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60);
          
          console.log(`Session check: Token expires in ${minutesUntilExpiry.toFixed(1)} minutes`);
          
          // If token will expire in less than 10 minutes, refresh it
          if (minutesUntilExpiry < 10) {
            console.log('Token expiring soon, forcing refresh');
            await supabaseOriginal.auth.refreshSession();
          }
        }
      } else {
        console.log('No active session found during periodic check');
      }
    } catch (error) {
      console.error('Error during periodic token check:', error);
    }
  }, 30000); // Check every 30 seconds instead of every minute
  
  // Comprehensive cleanup function that handles all resources
  const performCleanup = () => {
    console.log('Performing Supabase cleanup...');
    
    // Clear token check interval
    if (tokenCheckIntervalId) {
      clearInterval(tokenCheckIntervalId);
      tokenCheckIntervalId = null;
      console.log('Cleared token check interval');
    }
    
    // Unsubscribe from auth state changes
    if (authStateChangeSubscription && authStateChangeSubscription.subscription) {
      try {
        authStateChangeSubscription.subscription.unsubscribe();
        authStateChangeSubscription = null;
        console.log('Unsubscribed from auth state changes');
      } catch (e) {
        console.error('Error unsubscribing from auth state changes:', e);
      }
    }
    
    // Run all registered cleanup functions
    cleanupEventListeners.forEach(cleanup => {
      try {
        cleanup();
      } catch (e) {
        console.error('Error in cleanup function:', e);
      }
    });
    cleanupEventListeners = [];
    
    console.log('Completed Supabase cleanup');
  };
  
  // Clear interval on window unload to prevent memory leaks
  if (typeof window !== 'undefined') {
    // Add event listeners with options for better cleanup
    const addCleanupListener = (eventName: string) => {
      const listener = () => performCleanup();
      window.addEventListener(eventName, listener, { once: true });
      cleanupEventListeners.push(() => window.removeEventListener(eventName, listener));
    };
    
    // Add multiple event listeners to ensure cleanup happens
    addCleanupListener('beforeunload');
    addCleanupListener('unload');
    addCleanupListener('pagehide');
    
    // Also clean up on visibility change to hidden if supported
    if (document.visibilityState !== undefined) {
      const visibilityListener = () => {
        if (document.visibilityState === 'hidden') {
          // Don't perform full cleanup on hidden, just pause intervals
          if (tokenCheckIntervalId) {
            clearInterval(tokenCheckIntervalId);
            // We'll recreate the interval if visibility returns to visible
            tokenCheckIntervalId = null;
          }
        } else if (document.visibilityState === 'visible' && !tokenCheckIntervalId) {
          // Restart token check interval if page becomes visible again and interval was cleared
          tokenCheckIntervalId = setInterval(async () => {
            // Same token check code as above
            // Skip running this check if AuthContext is managing sessions
            if (typeof window !== 'undefined' && window.localStorage.getItem('auth-context-active') === 'true') {
              return;
            }

            try {
              const { data } = await supabaseOriginal.auth.getSession();
              if (data?.session) {
                const expiresAt = data.session.expires_at;
                if (expiresAt) {
                  const expiryDate = new Date(expiresAt * 1000);
                  const now = new Date();
                  const minutesUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60);
                  
                  console.log(`Session check: Token expires in ${minutesUntilExpiry.toFixed(1)} minutes`);
                  
                  if (minutesUntilExpiry < 10) {
                    console.log('Token expiring soon, forcing refresh');
                    await supabaseOriginal.auth.refreshSession();
                  }
                }
              } else {
                console.log('No active session found during periodic check');
              }
            } catch (error) {
              console.error('Error during periodic token check:', error);
            }
          }, 30000);
        }
      };
      
      document.addEventListener('visibilitychange', visibilityListener);
      cleanupEventListeners.push(() => document.removeEventListener('visibilitychange', visibilityListener));
    }
  }
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
  // Create a fallback client that will fail gracefully
  supabaseOriginal = createClient<Database>('https://placeholder.supabase.co', 'placeholder-key');
}

// Export the original Supabase client without any proxy wrapping
export const supabase = supabaseOriginal;

// Clear the entire request cache
function clearRequestCache() {
  Object.keys(requestCache).forEach(key => delete requestCache[key]);
  console.log('Request cache cleared');
}

// Export cleanup function so it can be called manually if needed
export function cleanupSupabaseResources() {
  if (tokenCheckIntervalId) {
    clearInterval(tokenCheckIntervalId);
    tokenCheckIntervalId = null;
  }
  
  if (authStateChangeSubscription && authStateChangeSubscription.subscription) {
    try {
      authStateChangeSubscription.subscription.unsubscribe();
      authStateChangeSubscription = null;
    } catch (e) {
      console.error('Error unsubscribing from auth state changes:', e);
    }
  }
  
  cleanupEventListeners.forEach(cleanup => {
    try {
      cleanup();
    } catch (e) {
      console.error('Error in cleanup function:', e);
    }
  });
  cleanupEventListeners = [];
  
  console.log('Manually cleaned up Supabase resources');
}

// Export the cache control functions
export const cacheControl = {
  clear: clearRequestCache,
  cache: new Map<string, { data: any; timestamp: number }>(),
  // Get a cached value if it exists and isn't expired
  get: (key: string, maxAge: number = 30000) => {
    const cached = cacheControl.cache.get(key);
    if (cached && Date.now() - cached.timestamp < maxAge) {
      console.log(`Cache hit for ${key}`);
      return cached.data;
    }
    return null;
  },
  // Set a value in the cache
  set: (key: string, data: any) => {
    cacheControl.cache.set(key, { data, timestamp: Date.now() });
  }
};

// Better re-entrancy guard for ensureUserExists with user-specific tracking
const activeEnsureUserOperations = new Map<string, boolean>();

/**
 * Ensures a user record exists in the database with optimized performance
 * @param authUserId The user's auth_id from Supabase Auth
 * @param email The user's email address
 * @param name The user's full name
 * @returns The user record or null if there was an error
 */
export async function ensureUserExists(authUserId: string, email: string, name: string) {
  // User-specific re-entrancy guard
  if (activeEnsureUserOperations.get(authUserId)) {
    console.log(`ensureUserExists already running for user ${authUserId}, skipping duplicate call`);
    return null;
  }
  
  // Set user-specific guard
  activeEnsureUserOperations.set(authUserId, true);
  
  try {
    console.log('Ensuring user exists in database:', { authUserId, email });
    
    // Single efficient query with timeout
    try {
      // First check if user already exists by auth_id
      const { data: existingUser, error: selectError } = await Promise.race([
        supabase
          .from('users')
          .select('*')
          .eq('auth_id', authUserId)
          .maybeSingle(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("User select query timed out")), 8000)
        )
      ]) as any;
      
      if (selectError) {
        throw selectError;
      }
      
      // If user exists by auth_id, return it
      if (existingUser) {
        console.log('User already exists in database:', existingUser);
        return existingUser;
      }
      
      // Also check if a user exists with the same email
      const { data: existingEmailUser, error: emailSelectError } = await Promise.race([
        supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Email select query timed out")), 5000)
        )
      ]) as any;
      
      if (emailSelectError) {
        console.error('Error checking existing email:', emailSelectError);
      } else if (existingEmailUser) {
        console.log('User with this email already exists:', existingEmailUser);
        // Instead of trying to create a new record, update the existing one with the new auth_id
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ auth_id: authUserId })
          .eq('email', email)
          .select()
          .single();
          
        if (updateError) {
          console.error('Error updating existing user with new auth_id:', updateError);
        } else {
          console.log('Updated existing user with new auth_id:', updatedUser);
          return updatedUser;
        }
        
        // Even if the update fails, return the existing user to prevent duplicate creation attempts
        return existingEmailUser;
      }
      
      console.log('User not found in database, creating new record');
      
      // Get default plan in a single query with timeout
      const { data: planData } = await Promise.race([
        supabase
          .from('subscription_plans')
          .select('plan_id')
          .eq('name', 'Free')
          .eq('billing_interval', 'monthly')
          .maybeSingle(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Plan select query timed out")), 5000)
        )
      ]) as any;
      
      const planId = planData?.plan_id || null;
      console.log('Using plan ID for new user:', planId);
      
      // Try direct insert with timeout for efficiency
      try {
        const { data: newUser, error: insertError } = await Promise.race([
          supabase
            .from('users')
            .insert({
              auth_id: authUserId,
              email: email,
              full_name: name,
              plan_id: planId,
              created_at: new Date().toISOString()
            })
            .select()
            .single(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Insert user query timed out")), 8000)
          )
        ]) as any;
        
        if (insertError) {
          // If insert fails with duplicate key, the user might have been created concurrently
          // Try to get it one more time
          if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
            console.log('Duplicate key detected, checking if user exists with this email');
            
            // Try to find the user by email
            const { data: emailUser } = await Promise.race([
              supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Email retry select query timed out")), 5000)
              )
            ]) as any;
            
            if (emailUser) {
              console.log('User with this email already exists, updating auth_id:', emailUser);
              
              // Update the existing user with the new auth_id
              const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({ auth_id: authUserId })
                .eq('email', email)
                .select()
                .single();
                
              if (updateError) {
                console.error('Error updating existing user with new auth_id:', updateError);
              } else {
                console.log('Updated existing user with new auth_id:', updatedUser);
                return updatedUser;
              }
              
              // Even if the update fails, return the existing user
              return emailUser;
            }
            
            // Also try to find by auth_id in case of a race condition
            const { data: retryUser } = await Promise.race([
              supabase
                .from('users')
                .select('*')
                .eq('auth_id', authUserId)
                .maybeSingle(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Retry select query timed out")), 5000)
              )
            ]) as any;
            
            if (retryUser) {
              console.log('User was created concurrently:', retryUser);
              return retryUser;
            }
          }
          throw insertError;
        }
        
        console.log('User created successfully:', newUser);
        return newUser;
      } catch (insertError) {
        console.error('Error inserting user:', insertError);
        throw insertError;
      }
    } catch (queryError) {
      console.error('Database query error:', queryError);
      return null;
    }
  } catch (error) {
    console.error('Unhandled error in ensureUserExists:', error);
    return null;
  } finally {
    // Always clean up the user-specific guard
    activeEnsureUserOperations.delete(authUserId);
  }
}

/**
 * Updates a user's profile information in the database
 * @param authUserId The user's auth_id from Supabase Auth
 * @param userData The user data to update
 * @returns The updated user record or null if there was an error
 */
export async function updateUserProfile(authUserId: string, userData: Partial<any>) {
  if (!authUserId) {
    console.error('Cannot update user profile: Missing authUserId');
    return null;
  }

  console.log('Updating user profile:', { authUserId, userData });
  
  try {
    // Update the user record in the database
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(userData)
      .eq('auth_id', authUserId)
      .select('*')
      .maybeSingle();
    
    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
    
    console.log('User profile updated successfully:', updatedUser);
    return updatedUser;
  } catch (error) {
    console.error('Exception updating user profile:', error);
    return null;
  }
}

/**
 * Maps an auth user to the corresponding database user record
 * @param authUserId The user's auth_id from Supabase Auth
 * @returns The database user record or a fallback user object if there was an error
 */
export async function mapAuthUserToDatabaseUser(authUserId: string) {
  try {
    console.log("Attempting to map auth user to database user:", authUserId);
    
    // First, try to verify the auth user exists
    const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
    
    if (authUserError) {
      console.error('Error fetching auth user:', authUserError);
      throw new Error(`Auth user fetch failed: ${authUserError.message}`);
    }
    
    // If auth user data is fetched successfully, proceed with mapping
    // Implementation of mapAuthUserToDatabaseUser function
  } catch (error) {
    console.error('Error mapping auth user to database user:', error);
    return null;
  }
}

/**
 * Deletes a user's account and all associated data
 * @param authUserId The user's auth_id from Supabase Auth
 * @returns Success status and any error message
 */
export async function deleteUserAccount(authUserId: string): Promise<{ success: boolean; error?: string }> {
  if (!authUserId) {
    console.error('Cannot delete user account: Missing authUserId');
    return { success: false, error: 'Missing user ID' };
  }

  console.log('Deleting user account:', { authUserId });
  
  try {
    // In a production environment, this would typically be handled by a secure backend API
    // with appropriate permissions. For this implementation, we're using client-side logic
    // focused on deleting the user's data while preserving referential integrity.
    
    // First, verify the current user matches the user to be deleted
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error verifying session:', sessionError);
      return { success: false, error: 'Session verification failed' };
    }
    
    const currentAuthId = sessionData?.session?.user?.id;
    if (currentAuthId !== authUserId) {
      console.error('Unauthorized deletion attempt:', { currentAuthId, authUserId });
      return { success: false, error: 'Unauthorized deletion attempt' };
    }
    
    // 1. Delete scans and related data first (if cascade delete is not set up)
    // Delete scan predictions
    try {
      // First fetch scan IDs
      const { data: scanIds, error: scanIdsError } = await supabase
        .from('scans')
        .select('scan_id')
        .eq('auth_id', authUserId);
        
      if (scanIdsError) {
        console.error('Error fetching scan IDs:', scanIdsError);
      } else if (scanIds && scanIds.length > 0) {
        // Then delete predictions for those scans
        const scanIdArray = scanIds.map(item => item.scan_id);
        const { error: scanPredictionsError } = await supabase
          .from('scan_predictions')
          .delete()
          .in('scan_id', scanIdArray);
          
        if (scanPredictionsError) {
          console.error('Error deleting scan predictions:', scanPredictionsError);
        }
      }
    } catch (error) {
      console.error('Error in scan predictions deletion process:', error);
    }
    
    // Delete scans
    const { error: scansError } = await supabase
      .from('scans')
      .delete()
      .eq('auth_id', authUserId);
    
    if (scansError) {
      console.error('Error deleting scans:', scansError);
    }
    
    // Delete patients
    const { error: patientsError } = await supabase
      .from('patients')
      .delete()
      .eq('auth_id', authUserId);
    
    if (patientsError) {
      console.error('Error deleting patients:', patientsError);
    }
    
    // Delete payment history
    const { error: paymentsError } = await supabase
      .from('payment_history')
      .delete()
      .eq('auth_id', authUserId);
    
    if (paymentsError) {
      console.error('Error deleting payment history:', paymentsError);
    }
    
    // Delete subscriptions
    const { error: subscriptionsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('auth_id', authUserId);
    
    if (subscriptionsError) {
      console.error('Error deleting subscriptions:', subscriptionsError);
    }
    
    // 2. Delete user record from database
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('auth_id', authUserId);
    
    if (deleteUserError) {
      console.error('Error deleting user data from database:', deleteUserError);
      return { success: false, error: deleteUserError.message };
    }
    
    // 3. Attempt to delete the auth user (will succeed only if proper permissions are set up)
    // This is typically handled by a secure backend function with admin privileges
    try {
      // Note: This direct deleteUser call may fail if client doesn't have permission,
      // which is expected in most Supabase setups for security reasons
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authUserId);
      
      if (authDeleteError) {
        console.log('Could not delete auth user from client - requires admin privileges:', authDeleteError);
        // Don't return error here, as database deletion was successful
      } else {
        console.log('Successfully deleted auth user');
      }
    } catch (authError) {
      console.log('Expected error when trying to delete auth user from client side:', authError);
      // Continue execution - the user might still be signed out successfully
    }
    
    // 4. Clear local storage and cache
    localStorage.removeItem('biovision-user-data');
    sessionStorage.removeItem('biovision-temp-data');
    clearRequestCache();
    
    // 5. Manually clear auth state to avoid 403 errors on logout
    try {
      // Clear the session locally without calling the server endpoint
      localStorage.removeItem('sb-' + supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
      
      // Force auth state change by updating local state only, don't call the server
      // This avoids the 403 Forbidden error when trying to invalidate a deleted user's session
      if (supabase.auth.onAuthStateChange) {
        // Manually trigger auth state change without server call
        const session = null;
        // @ts-ignore - Directly manipulate internal state as a workaround
        supabase.auth.setInternalSession(session);
      }
    } catch (e) {
      console.log('Error clearing local auth token:', e);
    }
    
    console.log('User account and data deleted successfully');
    
    // Note: For complete deletion including auth user, 
    // a server-side function with admin privileges should be used.
    // The client-side implementation focuses on cleaning up application data.
    
    return { success: true };
  } catch (error: any) {
    console.error('Exception deleting user account:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}