import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Lock, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase, backupFlowState, restoreAndVerifyFlowState, clearAuthFlowState } from "@/lib/supabase";

// Define page states for clarity
type PageState = 'validating' | 'form' | 'success' | 'error';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>('validating');
  const [isCrossBrowserError, setIsCrossBrowserError] = useState(false);


  // Add safety timeout to prevent infinite validating state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (pageState === 'validating') {
      timeoutId = setTimeout(() => {
        console.warn('Safety timeout reached for reset password validation');
        setPageError("Verification is taking longer than expected. The reset link may be invalid or expired.");
        setPageState('error');
      }, 8000); // Increased from 8000ms
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pageState]);

  // Add a dedicated auth state listener for the reset password flow
  useEffect(() => {
    // Set up auth state change listener specifically for reset password flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed in ResetPassword component:', event, session ? 'Session exists' : 'No session');
      
      if (event === 'SIGNED_IN' && session && pageState === 'validating') {
        console.log('User signed in during password reset validation, updating state to form');
        
        // Clear any errors
        setPageError(null);
        
        // Update UI state
        setPageState('form');
        
        // Show toast notification
        toast({
          title: "Password Reset Link Valid",
          description: "Please enter your new password below",
        });
      }
    });
    
    // Cleanup listener on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [pageState, toast]);

  // Validate reset token and set initial page state
  useEffect(() => {
    let mounted = true;
    
    const validatePasswordResetSession = async () => {
      try {
        // Parse code from URL (similar to email verification)
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        
        console.log('Reset password validation - code:', code);
        
        // Check if we have flow state in storage
        const flowState = localStorage.getItem('biovision-auth-storage-v2');
        
        // Log available backup state
        console.log('Flow state check:', flowState ? 'Primary exists' : 'No primary');
        
        // First, try to restore from any available backup if we have a code but no flow state
        if (code && !flowState) {
          console.log('No flow state found, attempting to restore from password reset backups');
        } else if (code && flowState) {
          // If we have both code and flow state, backup the flow state
          backupFlowState('password-reset');
        }
        
        // Process the code parameter from Supabase reset password redirect
        if (code) {
          console.log('Found password reset code, attempting to verify');
          
          try {
            console.log('Calling exchangeCodeForSession...');
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            console.log('Exchange result:', data ? 'Data received' : 'No data', exchangeError ? 'Error occurred' : 'No error');
            
            if (exchangeError) {
              console.error('Code exchange error:', exchangeError);
              
              // Try to restore and verify from backups if facing flow state issues
              if (exchangeError.message && 
                  (exchangeError.message.includes('code verifier') || 
                   exchangeError.message.includes('flow_state_not_found') ||
                   exchangeError.message.includes('flow_state_expired'))) {
                
                console.log('Detected potential flow state issue, attempting to restore from backups');
                
                // Try to restore and verify with any available backup
                const restored = await restoreAndVerifyFlowState('password-reset', code);
                
                if (restored) {
                  console.log('Successfully restored and verified password reset with backup');
                  setPageState('form');
                  toast({
                    title: "Password Reset Link Valid",
                    description: "Please enter your new password below",
                  });
                  setPageError(null);
                  return;
                }
                
                // Wait to see if auth state listener handles it
                console.log('Restoration failed, relying on auth state listener to detect successful sign-in');
                return;
              } else {
                // Only for non-flow-state errors, show an immediate error
                setPageError('Unable to complete verification. The password reset link may be invalid or expired.');
                setPageState('error');
              }
              return;
            }
            
            if (data?.session) {
              console.log('Email verification successful, session established directly');
              setPageState('form');
              toast({
                title: "Password Reset Link Valid",
                description: "Please enter your new password below",
              });
              setPageError(null);
              return;
            }
            
            // Check if verification was successful by getting the session again
            const { data: verifiedSession } = await supabase.auth.getSession();
            
            if (verifiedSession.session) {
              console.log('Password reset verification successful, session established');
              if (mounted) {
                toast({
                  title: "Password Reset Link Valid",
                  description: "Please enter your new password below",
                });
                
                setPageState('form');
              }
            } else {
              console.log('No session found after exchangeCodeForSession');
              
              // Wait for auth event in case session is established asynchronously
              // The timeout will handle showing error if no auth event occurs
            }
          } catch (error) {
            console.error('Error verifying reset code:', error);
            if (mounted) {
              setPageError('An error occurred processing your password reset link. Please try again or contact support.');
              setPageState('error');
            }
          }
        } else {
          // No code found in URL
          console.warn('No reset code found in URL');
          if (mounted) {
            setPageError('Invalid password reset link. Please check your email or request a new reset link.');
            setPageState('error');
          }
        }
      } catch (error) {
        console.error('Error in validatePasswordResetSession:', error);
        if (mounted) {
          setPageError('An unexpected error occurred. Please try again or contact support.');
          setPageState('error');
        }
      }
    };

    validatePasswordResetSession();
    
    return () => {
      mounted = false;
    };
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPageError(null);
    
    // Basic password validation
    if (password !== confirmPassword) {
      setPageError("Passwords do not match");
      return;
    }
    
    if (password.length < 8) {
      setPageError("Password must be at least 8 characters");
      return;
    }
    
    // Password strength validation (at least one uppercase, one lowercase, one number)
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      setPageError("Password must include at least one uppercase letter, one lowercase letter, and one number");
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      // Clear auth flow state for clean login
      clearAuthFlowState();
      
      setPageState('success');
      toast({
        title: "Password Reset Successful",
        description: "Your password has been changed successfully",
      });
      
      // Redirect after 2 seconds
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setPageError(err.message || "Failed to reset password");
      setPageState('error');
      toast({
        title: "Password Reset Failed",
        description: err.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const renderContent = () => {
    switch (pageState) {
      case 'validating':
        return (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-300">Validating your reset link...</span>
          </div>
        );
      case 'error':
        return (
          <>
            <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{pageError}</AlertDescription>
            </Alert>
            
            {/* Special guidance for cross-browser issues */}
            {isCrossBrowserError && (
              <Alert className="mb-4 bg-amber-900/20 border-amber-800 text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Different Browser Detected</AlertTitle>
                <AlertDescription>
                  For security reasons, password reset links must be opened in the same browser where you made the request.
                  <ul className="mt-2 ml-4 list-disc">
                    <li>Try again using the same browser you used to request the password reset</li>
                    <li>Clear your browser cache and try again</li>
                    <li>Or request a new reset link from the login page</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
                onClick={handleRetry}
              >
                Retry Validation
              </Button>
            </div>
          </>
        );
      case 'success':
        return (
          <Alert className="mb-4 bg-green-900/20 border-green-800 text-green-400">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Your password has been reset successfully. You will be redirected to the login page shortly.
            </AlertDescription>
          </Alert>
        );
      case 'form':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            {pageError && (
              <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{pageError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">New Password</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500"><Lock className="h-4 w-4" /></span>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white" required />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Password must be at least 8 characters with uppercase, lowercase, and numbers.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500"><Lock className="h-4 w-4" /></span>
                <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white" required />
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting Password...</>) : "Reset Password"}
            </Button>
          </form>
        );
      default: return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-white">Reset Password</CardTitle>
            <CardDescription className="text-gray-400">
              {pageState === 'form' ? 'Enter your new password below' : 
               pageState === 'success' ? 'Password successfully changed.' : 
               pageState === 'error' ? 'There was an issue with your request.' : 'Validating link...'} 
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
          <CardFooter className="flex justify-center">
            {pageState !== 'validating' && pageState !== 'success' && (
            <div className="text-gray-400 text-sm">
                Return to <Button variant="link" className="p-0 text-blue-500 hover:text-blue-400" onClick={() => {
                  // Clear auth flow state before going to login
                  clearAuthFlowState();
                  navigate("/login");
                }}>Login</Button>
            </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword; 