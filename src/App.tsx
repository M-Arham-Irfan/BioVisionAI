import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import DICOM initialization
import dicomLibs, { initDicom } from './utils/dicomInit';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { TooltipProvider } from './components/ui/tooltip';

// Layouts
import Layout from './components/Layout';

// Pages
import Index from './pages/Index';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerification from './pages/EmailVerification';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import NotFound from './pages/NotFound';
import ScanAnalysis from './pages/ScanAnalysis';
import ScanDetails from './pages/ScanDetails';
import ProtectedRoute from './components/ProtectedRoute';

// Notifications
import { Toaster } from './components/ui/sonner';

// Create an optimized QueryClient with improved caching and request handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Increase stale time to reduce unnecessary refetches
      staleTime: 60000, // 1 minute
      
      // Keep data cached for 5 minutes even when inactive
      gcTime: 5 * 60 * 1000, // 5 minutes 
      
      // Smart retry strategy
      retry: (failureCount, error: any) => {
        // Don't retry if we got a 401/403 (unauthorized) or 404 (not found)
        if (error?.response?.status === 401 || 
            error?.response?.status === 403 || 
            error?.response?.status === 404) {
          return false;
        }
        // Only retry once for other errors
        return failureCount < 1;
      },
      
      // Exponential backoff for retries
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Disable automatic refetching on window focus for better performance
      refetchOnWindowFocus: false,
      
      // This prevents redundant network requests from components
      // mounting at the same time asking for the same data
      networkMode: 'always',
    },
    mutations: {
      // Don't retry mutations automatically
      retry: false,
    },
  },
});

// Initialize DICOM libraries when the app loads
if (typeof window !== 'undefined') {
  // Initialize DICOM on app startup
  initDicom();
}

const App = () => {
  // Re-run DICOM initialization on component mount
  useEffect(() => {
    initDicom();
    console.log('DICOM initialization status:', dicomLibs.isInitialized() ? 'Success' : 'Failed');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Index />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="auth/confirm" element={<EmailVerification />} />
                <Route path="pricing" element={<Pricing />} />
                <Route path="scan-analysis" element={<ScanAnalysis />} />
                
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="scan-details/:id" element={<ScanDetails />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
