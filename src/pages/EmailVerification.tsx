import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase, backupFlowState, restoreAndVerifyFlowState } from '@/lib/supabase';

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCrossBrowserError, setIsCrossBrowserError] = useState(false);

  // Function to clear PKCE flow state after successful verification
  const clearAuthFlowState = () => {
    try {
      // Clear the main flow state
      localStorage.removeItem('biovision-auth-storage-v2');
      
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
      
      console.log('Cleared auth flow state for clean login after email verification');
    } catch (e) {
      console.error('Error clearing auth flow state:', e);
    }
  };

  // Add a safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (isProcessing) {
        console.log('Safety timeout reached, forcing processing state to complete');
        setIsProcessing(false);
        setError('Verification is taking longer than expected. The verification link may be invalid or expired.');
      }
    }, 15000);
    
    return () => clearTimeout(safetyTimeout);
  }, [isProcessing]);
  
  // Set up auth state change listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed in EmailVerification:', event, session ? 'Session exists' : 'No session');
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in during verification process');
        setIsSuccess(true);
        setIsProcessing(false);
        setError(null); // Clear any errors
        
        // Clear auth flow state for clean login
        clearAuthFlowState();
        
        toast({
          title: 'Email Verified',
          description: 'Your email has been successfully verified. You can now sign in.',
        });
        
        // Redirect after successful verification
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    });
    
    // Cleanup listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        setIsProcessing(true);
        
        // Extract code from URL
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        
        console.log('Email verification - code param:', code ? 'Present' : 'Missing');
        
        // Check for flow state in storage and create backup
        const flowState = localStorage.getItem('biovision-auth-storage-v2');
        console.log('Flow state check:', flowState ? 'Flow state exists' : 'No flow state');

        // Create backup for EMAIL VERIFICATION flow state using utility function
        if (flowState) {
          backupFlowState('email-verification');
        }
        
        // First check if we already have a session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          console.log('User already has a valid session, verification successful');
          setIsSuccess(true);
          setIsProcessing(false);
          
          // Clear auth flow state for clean login
          clearAuthFlowState();
          
          toast({
            title: 'Email Verified',
            description: 'Your email has been successfully verified. You can now sign in.',
          });
          
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }
        
        // Handle verification with code parameter
        if (code) {
          console.log('Found verification code, attempting to verify');
          
          try {
            // Try to verify with current flow state first
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error('Code exchange error:', exchangeError);
              
              // Check if this is likely a flow state issue
              if (exchangeError.message && 
                  (exchangeError.message.includes('code verifier') || 
                   exchangeError.message.includes('flow_state_not_found') ||
                   exchangeError.message.includes('flow_state_expired'))) {
                
                console.log('Detected potential flow state issue, attempting to restore from backups');
                
                // Try to restore and verify with any available backup
                const restored = await restoreAndVerifyFlowState('email-verification', code);
                
                if (restored) {
                  console.log('Successfully restored and verified email with backup');
                  setIsSuccess(true);
                  setIsProcessing(false);
                  
                  // Clear auth flow state for clean login
                  clearAuthFlowState();
                  
                  toast({
                    title: 'Email Verified',
                    description: 'Your email has been successfully verified. You can now sign in.',
                  });
                  
                  setTimeout(() => {
                    navigate('/login');
                  }, 3000);
                  return;
                }
                
                // If recovery failed, set cross-browser error after a delay
                setTimeout(() => {
                  if (isProcessing) {
                    console.log('No successful auth event after delay, showing cross-browser error');
                    setIsCrossBrowserError(true);
                    setError('Verification failed. It appears you may be using a different browser than the one you used to sign up. Please try opening the verification link in the same browser where you created your account.');
                    setIsProcessing(false);
                  }
                }, 5000);
                
                return;
              } else {
                // Only show immediate error for non-flow-state issues
                setError('Unable to complete verification. The verification link may be invalid or expired.');
                setIsProcessing(false);
                return;
              }
            }
            
            if (data?.session) {
              console.log('Email verification successful, session established directly');
              setIsSuccess(true);
              setIsProcessing(false);
              
              // Clear auth flow state for clean login
              clearAuthFlowState();
              
              toast({
                title: 'Email Verified',
                description: 'Your email has been successfully verified. You can now sign in.',
              });
              
              setTimeout(() => {
                navigate('/login');
              }, 3000);
              return;
            }
            
            // Check if verification was successful by getting the session again
            const { data: verifiedSession } = await supabase.auth.getSession();
            
            if (verifiedSession.session) {
              console.log('Email verification successful, session established');
              setIsSuccess(true);
              setIsProcessing(false);
              
              // Clear auth flow state for clean login
              clearAuthFlowState();
              
              toast({
                title: 'Email Verified',
                description: 'Your email has been successfully verified. You can now sign in.',
              });
              
              setTimeout(() => {
                navigate('/login');
              }, 3000);
            } else {
              console.warn('No session found after code exchange');
              
              // Rather than showing an error right away, wait for the auth listener
              // The timeout will handle showing an error if no auth event occurs
            }
          } catch (verifyErr) {
            console.error('Error during code verification:', verifyErr);
            setError('Unable to verify your email. Please try again or contact support.');
            setIsProcessing(false);
          }
        } else {
          // No code found in URL
          console.warn('No verification code found in URL');
          setError('Invalid verification link. Please check your email for the correct link or try logging in.');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Error during email verification:', err);
        setError('An unexpected error occurred. Please try again or contact support.');
        setIsProcessing(false);
      }
    };

    verifyEmail();
    
    // Cleanup function
    return () => {
      // Any cleanup needed
    };
  }, [navigate, toast]); // Removed isCrossBrowserError dependency to avoid loops

  const handleLoginDirectly = () => {
    // Clear auth state before navigating to login
    clearAuthFlowState();
    navigate('/login');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-900">
      <div className="w-full max-w-md">
        <Card className="border-gray-800 bg-gray-850">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-white">Email Verification</CardTitle>
            <CardDescription className="text-gray-400">
              {isProcessing ? "We're processing your email verification" : 
               isSuccess ? "Email verification successful" : 
               "Email verification failed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="mt-4 text-center text-gray-400">
                  Verifying your email...
                </p>
              </div>
            ) : isSuccess ? (
              <div className="space-y-4">
                <Alert className="mb-4 bg-green-900/20 border-green-800 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Email Verified</AlertTitle>
                  <AlertDescription>
                    Your email has been successfully verified. You'll be redirected to the login page in a moment.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="mb-4 bg-red-900/20 border-red-800 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Verification Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                
                {/* Special guidance for cross-browser issues */}
                {isCrossBrowserError && (
                  <Alert className="mb-4 bg-amber-900/20 border-amber-800 text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Different Browser Detected</AlertTitle>
                    <AlertDescription>
                      For security reasons, verification links must be opened in the same browser where you created your account.
                      <ul className="mt-2 ml-4 list-disc">
                        <li>Check if you're using the same browser where you signed up</li>
                        <li>Try signing in directly with your credentials</li>
                        <li>Clear your browser cache and try again</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex flex-col space-y-2">
                  <Button 
                    onClick={handleLoginDirectly}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Go to Login
                  </Button>
                  <div className="mt-4 text-center">
                  <Button 
                    variant="outline" 
                    className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
                    onClick={handleRetry}
                  >
                    Retry Validation
                  </Button>
                </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailVerification; 