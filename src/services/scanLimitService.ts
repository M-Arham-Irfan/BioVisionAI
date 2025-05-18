// Constants
const GUEST_MONTHLY_LIMIT = 5;
const STORAGE_KEY = "guest_scan_usage";

// Types
interface ScanUsage {
  count: number;
  month: number; // 0-11
  year: number;
}

/**
 * Gets the current scan usage for guest users from localStorage
 */
export const getGuestScanUsage = (): ScanUsage => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Get stored usage data
  const storedUsage = localStorage.getItem(STORAGE_KEY);
  let usage: ScanUsage;
  
  try {
    if (storedUsage) {
      usage = JSON.parse(storedUsage);
      
      // Reset counter if month changed
      if (usage.month !== currentMonth || usage.year !== currentYear) {
        usage = {
          count: 0,
          month: currentMonth,
          year: currentYear
        };
      }
    } else {
      // Initialize usage if not found
      usage = {
        count: 0,
        month: currentMonth,
        year: currentYear
      };
    }
  } catch (error) {
    // If there's an error parsing the stored usage, reset it
    console.error("Error parsing stored scan usage:", error);
    usage = {
      count: 0,
      month: currentMonth,
      year: currentYear
    };
  }
  
  return usage;
};

/**
 * Increments the scan count for guest users
 */
export const incrementGuestScanCount = (): ScanUsage => {
  const usage = getGuestScanUsage();
  
  // Increment count without checking limit (limit checks handled by useCanPerformScan)
  usage.count += 1;
  
  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  
  return usage;
};

/**
 * Returns the remaining guest scans
 */
export const getRemainingGuestScans = (): number => {
  const usage = getGuestScanUsage();
  return Math.max(0, GUEST_MONTHLY_LIMIT - usage.count);
};

/**
 * Records a scan usage
 * For authenticated users: Usage is implicitly recorded via scan insertion.
 * For guest users: Increments count in localStorage.
 */
export const recordScanUsage = async (userId?: string | null): Promise<void> => {
  if (!userId) {
    // Record scan for guest user in localStorage
    incrementGuestScanCount();
  }
  // For authenticated users, the scan insertion into the 'scans' table 
  // already takes care of recording usage.
};

// Optionally export guest helpers if needed elsewhere, otherwise they can remain private
// export { getGuestScanUsage, incrementGuestScanCount }; 