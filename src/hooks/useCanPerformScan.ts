import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getGuestScanUsage, getRemainingGuestScans } from '@/services/scanLimitService';

// Guest user limits (could be moved to a constants file)
const GUEST_MONTHLY_LIMIT = 5;

// Create a cache to prevent duplicate API calls across components
const scanLimitCache = {
  cacheTime: 0,
  data: null,
  cacheExpiry: 60000, // 1 minute cache validity
  isLoading: false,
  pendingPromise: null
};

// --- Hook Implementation ---
export const useCanPerformScan = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth(); // Get auth loading state
  const [canScan, setCanScan] = useState(true);
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const [isLimited, setIsLimited] = useState(true);
  const [isLoading, setIsLoading] = useState(true); // Hook's own loading state
  const [maxScans, setMaxScans] = useState<number | null>(null); // Total scan limit
  const [performedScans, setPerformedScans] = useState<number>(0); // Performed scans count

  // Create a stable cache key based on user identity
  const cacheKey = useMemo(() => {
    return isAuthenticated && user ? `user-${user.auth_id}` : 'guest';
  }, [isAuthenticated, user]);

  // Function to check if cache is valid
  const isCacheValid = useCallback(() => {
    return (
      scanLimitCache.data !== null &&
      Date.now() - scanLimitCache.cacheTime < scanLimitCache.cacheExpiry
    );
  }, []);

  // Function to refresh the scan counts - useful after performing a scan
  const refreshScanCounts = useCallback(async () => {
    try {
      // Invalidate cache on refresh
      scanLimitCache.cacheTime = 0;
      scanLimitCache.data = null;
      
      if (isAuthLoading) return;
      
      setIsLoading(true);
      
      if (isAuthenticated && user) {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split("T")[0];
        
        // Call DB function to get today's count
        const { data, error } = await supabase
          .rpc('get_user_scan_count_by_date', { 
            user_auth_id: user.auth_id,
            scan_date: today
          });
          
        if (error) {
          console.error("Error refreshing scan count:", error);
          return;
        }
        
        const todayScanCount = data || 0;
        const maxScansPerDay = user.max_scans_per_day || 0;
        const remaining = Math.max(0, maxScansPerDay - todayScanCount);
        
        const resultData = {
          canScan: remaining > 0,
          remainingScans: remaining,
          maxScans: maxScansPerDay,
          performedScans: todayScanCount,
          isLimited: true
        };
        
        // Update cache
        scanLimitCache.data = resultData;
        scanLimitCache.cacheTime = Date.now();
        
        // Update state
        setCanScan(resultData.canScan);
        setRemainingScans(resultData.remainingScans);
        setMaxScans(resultData.maxScans);
        setPerformedScans(resultData.performedScans);
        setIsLimited(resultData.isLimited);
      } else {
        // Guest user logic
        const usage = getGuestScanUsage();
        const remaining = Math.max(0, GUEST_MONTHLY_LIMIT - usage.count);
        
        const resultData = {
          canScan: remaining > 0,
          remainingScans: remaining,
          maxScans: GUEST_MONTHLY_LIMIT,
          performedScans: usage.count,
          isLimited: true
        };
        
        // Update cache
        scanLimitCache.data = resultData;
        scanLimitCache.cacheTime = Date.now();
        
        // Update state
        setCanScan(resultData.canScan);
        setRemainingScans(resultData.remainingScans);
        setMaxScans(resultData.maxScans);
        setPerformedScans(resultData.performedScans);
        setIsLimited(resultData.isLimited);
      }
    } catch (err) {
      console.error("Error in refreshScanCounts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, isAuthLoading]);

  useEffect(() => {
    // Skip if auth is still loading
    if (isAuthLoading) {
      console.log("useCanPerformScan: Waiting for AuthContext to load...");
      return; // Exit effect if auth is still loading
    }
    
    // No need to update if we already have a valid cache
    if (isCacheValid()) {
      const cachedData = scanLimitCache.data;
      setCanScan(cachedData.canScan);
      setRemainingScans(cachedData.remainingScans);
      setMaxScans(cachedData.maxScans);
      setPerformedScans(cachedData.performedScans);
      setIsLimited(cachedData.isLimited);
      setIsLoading(false);
      return;
    }
    
    // If another instance is already loading data, wait for it
    if (scanLimitCache.isLoading && scanLimitCache.pendingPromise) {
      scanLimitCache.pendingPromise.then(() => {
        if (scanLimitCache.data) {
          const cachedData = scanLimitCache.data;
          setCanScan(cachedData.canScan);
          setRemainingScans(cachedData.remainingScans);
          setMaxScans(cachedData.maxScans);
          setPerformedScans(cachedData.performedScans);
          setIsLimited(cachedData.isLimited);
        }
        setIsLoading(false);
      });
      return;
    }
    
    console.log("useCanPerformScan: AuthContext loaded. Proceeding with check.");
    setIsLoading(true);

    const checkScanLimit = async () => {
      // Set loading state in shared cache
      scanLimitCache.isLoading = true;
      
      try {
        if (isAuthenticated && user) {
          console.log("useCanPerformScan: Authenticated user check.");
          // Use max_scans_per_day from AuthContext
          const maxScansPerDay = user.max_scans_per_day;

          if (maxScansPerDay === null || maxScansPerDay === undefined) {
             console.warn("User plan limit (max_scans_per_day) not found in AuthContext. Defaulting to allow scan.");
             
             const resultData = {
               canScan: true,
               remainingScans: null,
               maxScans: null,
               performedScans: 0,
               isLimited: false
             };
             
             // Update cache
             scanLimitCache.data = resultData;
             scanLimitCache.cacheTime = Date.now();
             
             // Update state
             setCanScan(resultData.canScan);
             setRemainingScans(resultData.remainingScans);
             setMaxScans(resultData.maxScans);
             setPerformedScans(resultData.performedScans);
             setIsLimited(resultData.isLimited);
             return; 
          }
          
          // Get today's date in YYYY-MM-DD format
          const today = new Date().toISOString().split("T")[0];
          
          // Call DB function to get today's count
          console.log("useCanPerformScan: Fetching today's scan count for user:", user.auth_id);
          const { data, error } = await supabase
            .rpc('get_user_scan_count_by_date', { 
              user_auth_id: user.auth_id,
              scan_date: today
            });
            
          if (error) {
            console.error("Error checking scan count:", error);
            
            const resultData = {
              canScan: true,
              remainingScans: null,
              maxScans: null,
              performedScans: 0,
              isLimited: true
            };
            
            // Update cache (even for errors, but with a shorter expiry)
            scanLimitCache.data = resultData;
            scanLimitCache.cacheTime = Date.now();
            scanLimitCache.cacheExpiry = 30000; // shorter expiry for error states
            
            // Update state
            setCanScan(resultData.canScan);
            setRemainingScans(resultData.remainingScans);
            setMaxScans(resultData.maxScans);
            setPerformedScans(resultData.performedScans);
            setIsLimited(resultData.isLimited);
            return;
          }
          
          const todayScanCount = data || 0;
          const remaining = Math.max(0, maxScansPerDay - todayScanCount);
          console.log(`useCanPerformScan: Today's count: ${todayScanCount}, Max: ${maxScansPerDay}, Remaining: ${remaining}`);
          
          const resultData = {
            canScan: remaining > 0,
            remainingScans: remaining,
            maxScans: maxScansPerDay,
            performedScans: todayScanCount,
            isLimited: true
          };
          
          // Update cache
          scanLimitCache.data = resultData;
          scanLimitCache.cacheTime = Date.now();
          scanLimitCache.cacheExpiry = 60000; // reset to normal expiry
          
          // Update state
          setCanScan(resultData.canScan);
          setRemainingScans(resultData.remainingScans);
          setMaxScans(resultData.maxScans);
          setPerformedScans(resultData.performedScans);
          setIsLimited(resultData.isLimited);

        } else {
          // Guest user logic
          console.log("useCanPerformScan: Guest user check.");
          const usage = getGuestScanUsage();
          const remaining = getRemainingGuestScans();
          
          const resultData = {
            canScan: remaining > 0,
            remainingScans: remaining,
            maxScans: GUEST_MONTHLY_LIMIT,
            performedScans: usage.count,
            isLimited: true
          };
          
          // Update cache
          scanLimitCache.data = resultData;
          scanLimitCache.cacheTime = Date.now();
          
          // Update state
          setCanScan(resultData.canScan);
          setRemainingScans(resultData.remainingScans);
          setMaxScans(resultData.maxScans);
          setPerformedScans(resultData.performedScans);
          setIsLimited(resultData.isLimited);
        }
      } catch (err) {
        console.error("Error in scan limit check:", err);
        
        const resultData = {
          canScan: true,
          remainingScans: null,
          maxScans: null,
          performedScans: 0,
          isLimited: true
        };
        
        // Update state
        setCanScan(resultData.canScan);
        setRemainingScans(resultData.remainingScans);
        setMaxScans(resultData.maxScans);
        setPerformedScans(resultData.performedScans);
        setIsLimited(resultData.isLimited);
      } finally {
        setIsLoading(false);
        scanLimitCache.isLoading = false;
        scanLimitCache.pendingPromise = null;
      }
    };
    
    // Store promise in cache to allow deduplication
    scanLimitCache.pendingPromise = checkScanLimit();
    checkScanLimit();
    
  }, [isAuthLoading, isAuthenticated, user, cacheKey, isCacheValid]);

  return {
    canScan,
    remainingScans,
    maxScans,
    performedScans,
    isLimited,
    loading: isLoading || isAuthLoading, // Combine loading states
    refreshScanCounts // Export the refresh function
  };
}; 