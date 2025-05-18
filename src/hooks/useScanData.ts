import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  getScan, 
  getPredictions, 
  getPatientScans, 
  getUserScans,
  storePredictions
} from '@/lib/database';
import { Disease, Scan, ScanPrediction } from '@/types/database';

// Hook for fetching a single scan by ID
export function useScanById(scanId: number | null) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [predictions, setPredictions] = useState<Disease[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    if (!scanId || !session) {
      setLoading(false);
      return;
    }

    async function fetchScan() {
      try {
        setLoading(true);
        
        // Fetch the scan
        const { scan: scanData, error: scanError } = await getScan(supabase, scanId);
        
        if (scanError) throw scanError;
        
        if (scanData) {
          setScan(scanData);
          
          // Fetch predictions
          const { predictions: predictionsData } = await getPredictions(supabase, scanId);
          setPredictions(predictionsData);
        } else {
          setError(new Error('Scan not found'));
        }
      } catch (err) {
        console.error('Error fetching scan:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching scan'));
      } finally {
        setLoading(false);
      }
    }

    fetchScan();
  }, [scanId, session]);

  return { scan, predictions, loading, error };
}


// Hook for fetching all scans for the current user
export function useUserScans() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    async function fetchScans() {
      try {
        setLoading(true);
        
        // Fetch the scans
        const { scans: scansData, error: scansError } = await getUserScans(supabase, session.user.id);
        
        if (scansError) throw scansError;
        
        setScans(scansData || []);
      } catch (err) {
        console.error('Error fetching user scans:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching user scans'));
      } finally {
        setLoading(false);
      }
    }

    fetchScans();
  }, [session]);

  return { scans, loading, error };
}