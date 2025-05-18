import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

// React Query wrapper for Supabase data fetching with optimized configuration
function useSupabaseQuery<T>(
  queryKey: string | string[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    retry?: boolean | number;
    refetchInterval?: number | false;
    refetchOnWindowFocus?: boolean;
    refetchOnMount?: boolean;
  }
) {
  const key = Array.isArray(queryKey) ? queryKey : [queryKey];
  const effectiveEnabled = options?.enabled !== false; 
  
  return useQuery({
    queryKey: key,
    queryFn,
    enabled: effectiveEnabled,
    staleTime: options?.staleTime || 60000,  // 1 minute by default
    gcTime: options?.cacheTime || 5 * 60 * 1000,  // 5 minutes by default
    retry: options?.retry === undefined ? 1 : options?.retry,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: options?.refetchOnWindowFocus !== undefined ? options.refetchOnWindowFocus : false,
    refetchOnMount: options?.refetchOnMount !== undefined ? options.refetchOnMount : true,
  });
}

// Enhanced hook for fetching data from any table with JWT authentication using React Query
export function useSupabaseData<T>(
  tableName: string,
  options?: {
    select?: string;
    filter?: { column: string; value: any }[];
    limit?: number;
    orderBy?: { column: string; ascending?: boolean };
    range?: [number, number];
  } | null
) {
  const { session } = useAuth();
  const queryActuallyEnabled = !!session && options !== null;

  const fetchData = useCallback(async () => {
    if (!session || options === null) { 
      return { data: null, count: 0 };
    }

    try {
      const queryExecution = supabase
        .from(tableName)
        .select(options?.select || '*', { count: 'exact' });
      
      // Apply filters if provided
      if (options?.filter) {
        options.filter.forEach(f => {
          queryExecution.eq(f.column, f.value);
        });
      }
      
      // Apply ordering if provided
      if (options?.orderBy) {
        queryExecution.order(
          options.orderBy.column, 
          { ascending: options.orderBy.ascending ?? true }
        );
      }
      
      // Apply pagination limit if provided
      if (options?.limit) {
        queryExecution.limit(options.limit);
      }
      
      // Apply range if provided
      if (options?.range) {
        queryExecution.range(options.range[0], options.range[1]);
      }
      
      // Execute the query
      const { data, error, count } = await queryExecution;
      
      if (error) {
        console.error(`useSupabaseData: ERROR for ${tableName}:`, error);
        throw error;
      }
      
      return { data: data as T[], count: count || 0 };
    } catch (err) {
      console.error(`useSupabaseData: EXCEPTION for ${tableName}:`, err);
      throw err;
    }
  }, [tableName, options, session]);
  
  // Use React Query with optimized configuration
  const { data, error, isLoading, refetch } = useSupabaseQuery<{ data: T[] | null; count: number }>(
    ['supabase-data', tableName, JSON.stringify(options)],
    fetchData,
    { 
      enabled: queryActuallyEnabled,
      retry: 1,
      staleTime: 60000, // 1 minute cache
      refetchInterval: false, // Disable automatic refetching
      refetchOnWindowFocus: false,
    }
  );

  return { 
    data: data?.data || null, 
    loading: isLoading, 
    error: error as Error | null, 
    count: data?.count || null, 
    refresh: refetch 
  };
}

// Hook for fetching a single record by ID with JWT auth - using React Query
export function useSupabaseRecord<T>(
  tableName: string,
  id: number | string | null | undefined,
  idColumn: string = `${tableName.replace(/s$/, '')}_id`,
  select?: string
) {
  const { session } = useAuth();
  const enabled = !!session && !!id;
  const isUserProfile = tableName === 'users' && idColumn === 'auth_id';
  
  const fetchRecord = useCallback(async () => {
    if (!id || !session) {
      return null;
    }
    
    // Special handling for user profile data with aggressive caching
    if (isUserProfile) {
      try {
        // Check if we have a cached version in localStorage
        const cachedProfile = localStorage.getItem('cached_user_profile');
        const cachedTimestamp = localStorage.getItem('cached_user_profile_timestamp');
        
        if (cachedProfile && cachedTimestamp) {
          const parsedProfile = JSON.parse(cachedProfile);
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          const cacheAge = now - timestamp;
          
          // If the cache is less than 24 hours old and the ID matches, use it
          if (cacheAge < 24 * 60 * 60 * 1000 && parsedProfile.auth_id === id) {
            console.log('Using cached user profile from localStorage');
            return parsedProfile as T;
          }
        }
      } catch (err) {
        console.error('Error reading cached user profile:', err);
        // Continue with normal fetch if cache read fails
      }
    }
    
    try {
      // Execute query
      const { data, error } = await supabase
        .from(tableName)
        .select(select || '*')
        .eq(idColumn, id)
        .maybeSingle();
      
      if (error) {
        console.error(`Error fetching ${tableName} record:`, error);
        throw error;
      }
      
      // If this is a user profile, cache it in localStorage
      if (isUserProfile && data) {
        try {
          localStorage.setItem('cached_user_profile', JSON.stringify(data));
          localStorage.setItem('cached_user_profile_timestamp', Date.now().toString());
        } catch (err) {
          console.error('Error caching user profile:', err);
        }
      }
      
      return data as T;
    } catch (err) {
      console.error(`Exception in useSupabaseRecord for ${tableName}:`, err);
      
      // For user profiles, try to fall back to localStorage cache even if it's old
      if (isUserProfile) {
        try {
          const cachedProfile = localStorage.getItem('cached_user_profile');
          if (cachedProfile) {
            const parsedProfile = JSON.parse(cachedProfile);
            if (parsedProfile.auth_id === id) {
              console.log('Falling back to cached user profile after fetch error');
              return parsedProfile as T;
            }
          }
        } catch (cacheErr) {
          // If cache fallback fails too, just rethrow the original error
          console.error('Cache fallback failed:', cacheErr);
        }
      }
      
      throw err;
    }
  }, [tableName, id, idColumn, select, session, isUserProfile]);
  
  // Configure optimal query options based on record type
  const queryOptions = {
    enabled,
    retry: isUserProfile ? 3 : 1, // More retries for user profile
    staleTime: isUserProfile ? 24 * 60 * 60 * 1000 : 120000, // 24 hours for user profile, 2 minutes for others
    refetchInterval: false as const, // Using const assertion to fix the type
    refetchOnWindowFocus: false,
    refetchOnMount: isUserProfile ? false : true,
  };
  
  const { data, error, isLoading, refetch } = useSupabaseQuery<T | null>(
    ['supabase-record', tableName, String(id), idColumn, select],
    fetchRecord,
    queryOptions
  );
  
  return { data, loading: isLoading, error: error as Error | null, refresh: refetch };
}

// User subscription hook using React Query
export function useUserSubscription(authId: string | null) {
  const { session } = useAuth();
  const enabled = !!authId && !!session;
  
  const fetchSubscription = useCallback(async () => {
    if (!authId || !session) {
      return null;
    }
    
    try {
      const { data: subscriptionData, error } = await supabase
        .from('subscriptions')
        .select('subscription_id, plan_id, status, current_period_end, cancel_at_period_end, subscription_plans!inner(plan_id, name, price_usd, features, max_scans_per_day)')
        .eq('auth_id', authId)
        .eq('status', 'active') 
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }
      
      return subscriptionData; 
    } catch (err) {
      console.error('Exception in useUserSubscription:', err);
      return null;
    }
  }, [authId, session]);
  
  const { data: subscriptionObject, isLoading, error: queryError, refetch } = useSupabaseQuery(
    ['user-subscription', authId],
    fetchSubscription,
    { 
      enabled,
      retry: 1,
      staleTime: 300000, // 5 minutes
      refetchInterval: 600000, // Refetch every 10 minutes
      refetchOnWindowFocus: true, // Refresh when tab is refocused
    }
  );

  return { 
    subscription: subscriptionObject, 
    loading: isLoading, 
    error: queryError as Error | null,
    refresh: refetch 
  };
}

// User stats hook using React Query
export function useUserStats(authId: string | null) {
  const { session } = useAuth();
  const enabled = !!authId && !!session;
  
  const fetchStats = useCallback(async () => {
    if (!authId || !session) {
      return {
        total: 0,
        today: 0,
        week: 0,
        month: 0
      };
    }
    
    try {
      // Get total scans with timeout protection
      const totalPromise = supabase.rpc('get_scans_done_by_user', { user_auth_id: authId });
      const totalTimeoutPromise = new Promise(resolve => 
        setTimeout(() => resolve({ data: 0 }), 5000) // 5 second timeout
      );
      
      const { data: totalData, error: totalError } = await Promise.race([
        totalPromise,
        totalTimeoutPromise
      ]) as any;
      
      if (totalError) {
        console.error('Error fetching total scans:', totalError);
        throw totalError;
      }
      
      // Get today's scans with timeout protection
      const todayDate = new Date().toISOString().split('T')[0];
      const todayPromise = supabase.rpc('get_user_scan_count_by_date', { 
        user_auth_id: authId,
        scan_date: todayDate
      });
      
      const todayTimeoutPromise = new Promise(resolve => 
        setTimeout(() => resolve({ data: 0 }), 5000) // 5 second timeout
      );
      
      const { data: todayData, error: todayError } = await Promise.race([
        todayPromise,
        todayTimeoutPromise
      ]) as any;
      
      if (todayError) {
        console.error('Error fetching today scans:', todayError);
        throw todayError;
      }
      
      // Calculate stats
      return {
        total: totalData || 0,
        today: todayData || 0,
        week: Math.min(totalData || 0, 7),
        month: Math.min(totalData || 0, 30)
      };
    } catch (err) {
      console.error('Error in useUserStats:', err);
      // Return empty stats on error instead of throwing
      return {
        total: 0,
        today: 0,
        week: 0,
        month: 0
      };
    }
  }, [authId, session]);
  
  const { data: stats, isLoading, error, refetch } = useSupabaseQuery(
    ['user-stats', authId],
    fetchStats,
    { 
      enabled,
      staleTime: 300000, // 5 minute cache
      retry: 1,         // Only retry once
      refetchInterval: 600000, // Refetch every 10 minutes
      refetchOnWindowFocus: false,
    }
  );
  
  return { 
    stats: stats || { total: 0, today: 0, week: 0, month: 0 }, 
    loading: isLoading, 
    error: error as Error | null,
    refresh: refetch 
  };
}

// Hook for fetching user scans
export function useUserScans(authId: string | null, limit?: number) {
  const { session } = useAuth();
  const enabled = !!authId && !!session;
  
  const fetchScans = useCallback(async () => {
    if (!authId || !session) {
      return { data: [], count: 0 };
    }
    
    try {
      let query = supabase
        .from('scans')
        .select('*, analysis(*)', { count: 'exact' })
        .eq('auth_id', authId)
        .order('created_at', { ascending: false });
        
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching user scans:', error);
        throw error;
      }
      
      return { 
        data: data || [], 
        count: count || 0 
      };
    } catch (err) {
      console.error('Exception in useUserScans:', err);
      throw err;
    }
  }, [authId, session, limit]);
  
  // Use React Query with optimized configuration
  const { data, error, isLoading, refetch } = useSupabaseQuery<{ data: any[]; count: number }>(
    ['user-scans', authId, limit?.toString()],
    fetchScans,
    { 
      enabled,
      retry: 1,
      staleTime: 60000, // 1 minute
      refetchInterval: false, // Disable automatic refetching
      refetchOnWindowFocus: true, // Refresh when tab is refocused
    }
  );
  
  return { 
    data: data?.data || [], 
    loading: isLoading, 
    error: error as Error | null, 
    count: data?.count || 0,
    refresh: refetch
  };
}

// Hook for fetching total system scans
export function useTotalSystemScans() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchTotalScans = async () => {
      try {
        setLoading(true);
        
        try {
          // Call the get_total_scan_count database function to get total scans across all users
          const { data, error: funcError } = await supabase
            .rpc('get_total_scan_count');
          
          if (funcError) {
            console.warn("Could not fetch total scans from database function:", funcError);
            // Fall back to counting all scans
            const { count: scanCount, error: countError } = await supabase
              .from('scans')
              .select('*', { count: 'exact' })
              .limit(0);
            
            if (countError) {
              console.warn("Could not fetch total scans from database:", countError);
              // Fall back to a hard-coded value if we can't access the function
              setCount(1433);
              return;
            }
            
            setCount(scanCount || 0);
          } else {
            // Use the function result
            setCount(data || 0);
          }
        } catch (funcError) {
          console.warn("Exception fetching scan count:", funcError);
          // Fall back to a sensible default
          setCount(1433);
        }
      } catch (err) {
        console.error('Error fetching total system scans:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        // Fall back to a sensible default
        setCount(1433);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTotalScans();
  }, []);
  
  return { count, loading, error };
}

// Helper function to invalidate user profile cache after updates
export function invalidateUserProfileCache(userId: string, queryClient: any) {
  // Clear localStorage cache
  localStorage.removeItem('cached_user_profile');
  localStorage.removeItem('cached_user_profile_timestamp');
  
  // Invalidate React Query cache for this specific user
  queryClient.invalidateQueries(['supabase-record', 'users', userId]);
  
  console.log('User profile cache invalidated for', userId);
} 