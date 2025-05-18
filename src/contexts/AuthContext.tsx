import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, mapAuthUserToDatabaseUser, ensureUserExists, updateUserProfile, cleanupSupabaseResources, backupFlowState, clearAuthFlowState } from '@/lib/supabase';
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';

// This interface should match the database schema exactly
export interface User {
  auth_id: string; // auth_id from the database (UUID)
  full_name: string | null; // maps to full_name in database
  email: string; 
  plan_id?: number;
  stripe_customer_id?: string;
  created_at: string; // maps to created_at in database
  max_scans_per_day?: number | null; // Added to store the limit from the plan
  // Derived fields (not in DB but needed for UI)
  subscriptionPlan?: string; // derived from plan_id
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  authError: string | null;
  retryAuthentication: () => Promise<void>;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updateProfile: async () => {},
  authError: null,
  retryAuthentication: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("AuthProvider component rendering/re-rendering"); // LOG WHEN AuthProvider RENDERS
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingSessionChangeRef = useRef(false);
  const processingVisibilityChangeRef = useRef(false);
  const lastVisibilityChangeTimeRef = useRef(0);
  
  // For tracking and cleanup
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);
  const authStateSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  
  // Helper to register cleanup functions
  const registerCleanup = useCallback((cleanupFn: () => void) => {
    cleanupFunctionsRef.current.push(cleanupFn);
  }, []);
  
  // Helper to perform all cleanups
  const performAllCleanups = useCallback(() => {
    console.log("AuthContext: Performing all cleanups");
    
    // Clear intervals
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    // Unsubscribe from auth state changes
    if (authStateSubscriptionRef.current) {
      try {
        authStateSubscriptionRef.current.unsubscribe();
        authStateSubscriptionRef.current = null;
      } catch (e) {
        console.error("Error unsubscribing from auth state changes:", e);
      }
    }
    
    // Run all registered cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (e) {
        console.error("Error in cleanup function:", e);
      }
    });
    
    // Clear the cleanup array
    cleanupFunctionsRef.current = [];
    
    console.log("AuthContext: All cleanups completed");
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("AuthContext: Component unmounting, cleaning up...");
      performAllCleanups();
      // Also clean up Supabase resources
      cleanupSupabaseResources();
    };
  }, [performAllCleanups]);
  
  // Set up a safety timeout to prevent infinite loading states
  useEffect(() => {
    console.log("AuthContext: useEffect for global loading timeout fired (isLoading: " + isLoading + ")");
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    // If loading is true, set a timeout to exit loading state after 30 seconds
    if (isLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn("Loading timeout reached, forcing loading state to false");
        setIsLoading(false);
        setAuthError(null);
        
        // Display a toast to inform the user
        toast({
          title: "Authentication timeout",
          description: "We couldn't complete the authentication process. Try refreshing the page.",
          variant: "destructive"
        });
      }, 30000); // 30 seconds timeout
    }
    
    // Clean up on unmount or when isLoading changes
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [isLoading]);
  
  // Initialize auth state
  useEffect(() => {
    console.log("AuthContext: useEffect for initAuth fired"); 
    
    // Event time tracking to filter redundant events
    const lastAuthEvents = {
      SIGNED_IN: 0,
      SIGNED_OUT: 0,
      TOKEN_REFRESHED: 0,
      USER_UPDATED: 0
    };
    
    // Setup auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Add deduplication logic to prevent rapid repeated events
        const now = Date.now();
        const lastEventTime = lastAuthEvents[event as keyof typeof lastAuthEvents] || 0;
        const timeSinceLastEvent = now - lastEventTime;
        
        // Update the last event time
        if (event in lastAuthEvents) {
          lastAuthEvents[event as keyof typeof lastAuthEvents] = now;
        }
        
        // More aggressive filtering: Ignore duplicate SIGNED_IN events with same token
        if (event === 'SIGNED_IN' && session) {
          // Store the current access token if we haven't seen it before
          const currentToken = session.access_token;
          const lastToken = localStorage.getItem('last-auth-token');
          
          if (lastToken === currentToken && timeSinceLastEvent < 60000) {
            console.log(`Ignoring duplicate ${event} event with same token (${timeSinceLastEvent}ms after previous)`);
            return;
          }
          
          // Store this token for future comparison
          localStorage.setItem('last-auth-token', currentToken);
        }
        
        // Ignore duplicate events that happen too frequently (within 5 seconds)
        if (event === 'SIGNED_IN' && timeSinceLastEvent < 5000) {
          console.log(`Ignoring duplicate ${event} event (${timeSinceLastEvent}ms after previous)`);
          
          // Still update the session state to avoid stale sessions
          if (session) {
            setSession(prevSession => {
              // Only update if the tokens actually differ to minimize renders
              if (prevSession?.access_token !== session.access_token) {
                return session;
              }
              return prevSession;
            });
          }
          return;
        }
        
        console.log("Auth state change event:", event, session);
        
        if (event === 'SIGNED_IN' && session) {
          console.log("User signed in, calling handleSessionChange");
          await handleSessionChange(session);
        } else if (event === 'SIGNED_OUT') {
          console.log("User signed out, clearing session and user");
          setUser(null);
          setSession(null);
          // ensure isLoading is false if we sign out
          setIsLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log("Token refreshed, updating session state only");
          // Only update the session object, don't trigger full database operations
          setSession(session);
          
          // If user is not set yet, then we need to perform a full session change
          // This handles the case where token is refreshed before user is loaded
          if (!user) {
            console.log("Token refreshed but no user data found, performing full handleSessionChange");
            await handleSessionChange(session);
          }
        } else if (event === 'USER_UPDATED' && session) {
          console.log("User updated event, potentially re-evaluate user state or call handleSessionChange if db user needs refresh");
          // Only update if there are important user metadata changes
          const currentMetadata = user?.full_name;
          const newMetadata = session.user?.user_metadata?.full_name;
          
          if (currentMetadata !== newMetadata) {
            console.log("User metadata changed, updating user state");
            await handleSessionChange(session);
          } else {
            console.log("No significant user metadata changes, just updating session");
            setSession(session);
          }
        } else if (session && (event === 'INITIAL_SESSION')) { // INITIAL_SESSION is often when handleSessionChange is needed
          console.log("Initial session event or other event with session, calling handleSessionChange");
          await handleSessionChange(session);
        } else {
          console.log("Unhandled auth event or event without session:", event);
          // if no session and not signed out, might be an error or initial state where isLoading should be false.
          if (!session && event !== 'SIGNED_OUT') {
            setIsLoading(false);
          }
        }
      }
    );
    
    // Store the subscription for cleanup
    authStateSubscriptionRef.current = subscription;
    
    const initAuth = async () => {
      console.log("AuthContext: initAuth started"); // ENSURED IS ABSOLUTE FIRST LINE IN INITAUTH
      console.time("AuthContext_initAuth_overall"); // Start overall timer for initAuth
      setIsLoading(true);
      
      try {
        // Get current session
        console.time("AuthContext_initAuth_getSession");
        const { data, error } = await supabase.auth.getSession();
        console.timeEnd("AuthContext_initAuth_getSession");
        
        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }
        
        console.log("Initial session check:", data.session ? "Session found" : "No session");
        
        if (data.session) {
          // Handle the retrieved session
          await handleSessionChange(data.session);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsLoading(false);
      }
    };
    
    initAuth();
    
    return () => {
      console.log("AuthContext: Cleaning up auth state change subscription");
      if (authStateSubscriptionRef.current) {
        try {
          authStateSubscriptionRef.current.unsubscribe();
          authStateSubscriptionRef.current = null;
        } catch (e) {
          console.error("Error unsubscribing from auth state changes during cleanup:", e);
        }
      }
    };
  }, []);

  // Handle session changes and map to our User model
  const handleSessionChange = async (session: Session | null) => {
    // Create a unique timer ID for this call to prevent timer collision
    const timerId = `AuthContext_handleSessionChange_${Date.now()}`;
    
    // Don't use console.time/timeEnd since they're causing errors
    const startTime = performance.now();
    
    // Re-entrancy guard with user ID tracking
    if (isHandlingSessionChangeRef.current) {
      console.log("handleSessionChange already in progress, exiting early");
      
      // Still update the session state to avoid stale sessions
      if (session) {
        setSession(prevSession => {
          // Only update if the tokens actually differ to minimize renders
          if (prevSession?.access_token !== session.access_token) {
            return session;
          }
          return prevSession;
        });
      }
      
      console.log(`handleSessionChange skipped in ${(performance.now() - startTime).toFixed(2)}ms`);
      return;
    }
    
    // Set re-entrancy guard
    isHandlingSessionChangeRef.current = true;
    
    try {
      // Always update the session state immediately
      setSession(prevSession => {
        // Only update if the tokens actually differ to minimize renders
        if (!prevSession || prevSession.access_token !== session?.access_token) {
          return session;
        }
        return prevSession;
      });
      
      if (!session) {
        setUser(null);
        // If there's no session, we are definitely not in an initial loading state for a user.
        setIsLoading(false); 
        console.log(`handleSessionChange completed in ${(performance.now() - startTime).toFixed(2)}ms`);
        isHandlingSessionChangeRef.current = false;
        return;
      }
      
      try {
        setAuthError(null); // Clear any previous auth errors
        
        // Get Supabase user
        const supabaseUser = session.user;
        
        // If we already have a user with the same ID, just update the session
        // and keep the existing user data to prevent loading flickers
        if (user && user.auth_id === supabaseUser.id) {
          setIsLoading(false);
          console.log(`handleSessionChange completed in ${(performance.now() - startTime).toFixed(2)}ms`);
          isHandlingSessionChangeRef.current = false;
          return;
        }
        
        // Set a safety timeout to force isLoading to false if anything gets stuck
        const safetyTimeout = setTimeout(() => {
          setIsLoading(false);
          // Reset re-entrancy guard when timeout occurs
          isHandlingSessionChangeRef.current = false;
          console.warn("Safety timeout reached in handleSessionChange - forcing isLoading to false");
          
          // Show toast to user if we hit the safety timeout
          toast({
            title: "Authentication taking longer than expected",
            description: "We're still setting up your account. Some features may be limited until this completes.",
            variant: "default"
          });
        }, 20000); // Increased from 10000 to 20000 ms
        
        // First check if we have cached user data we can use immediately
        const cachedUser = JSON.parse(localStorage.getItem('cachedUserData') || 'null');
        if (cachedUser && cachedUser.auth_id === supabaseUser.id) {
          // If we have cached data, set user immediately and continue with database operations in background
          const tempUser: User = {
            auth_id: supabaseUser.id,
            full_name: cachedUser.full_name || supabaseUser.user_metadata?.full_name || 'User',
            email: supabaseUser.email || cachedUser.email || 'guest@example.com',
            plan_id: cachedUser.plan_id,
            stripe_customer_id: cachedUser.stripe_customer_id,
            created_at: cachedUser.created_at || supabaseUser.created_at || new Date().toISOString(),
            subscriptionPlan: cachedUser.subscriptionPlan || 'Free',
            max_scans_per_day: cachedUser.max_scans_per_day
          };
          
          // Set user immediately to prevent UI freeze
          setUser(tempUser);
          setIsLoading(false);
          
          // Continue in background without blocking the UI
          (async () => {
            try {
              // Ensure user exists in background (no need to await)
              ensureUserExists(
                supabaseUser.id,
                supabaseUser.email || '',
                supabaseUser.user_metadata?.full_name || (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'User')
              ).catch(err => {
                console.error('Background ensureUserExists error:', err);
                // No UI impact since we're already showing cached data
              });
            } catch (e) {
              console.error('Error in background user setup:', e);
            }
          })();
          
          // Clear safety timeout
          clearTimeout(safetyTimeout);
          console.log(`handleSessionChange completed in ${(performance.now() - startTime).toFixed(2)}ms`);
          isHandlingSessionChangeRef.current = false;
          return;
        }
        
        // Simplified approach - get the user directly without trying to ensure it exists first
        // This reduces latency by making fewer database calls
        try {
          // First query to get the user
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*, subscription_plan:subscription_plans(max_scans_per_day, name)')
            .eq('auth_id', supabaseUser.id)
            .maybeSingle();
          
          if (userError) {
            throw userError;
          }
          
          if (userData) {
            // User exists, create the user object
            const mappedUser: User = {
              auth_id: userData.auth_id,
              full_name: userData.full_name,
              email: userData.email,
              plan_id: userData.plan_id,
              stripe_customer_id: userData.stripe_customer_id,
              created_at: userData.created_at,
              max_scans_per_day: userData.subscription_plan?.max_scans_per_day ?? null,
              subscriptionPlan: userData.subscription_plan?.name ?? 'Free'
            };
            
            // Set user and save to cache
            setUser(mappedUser);
            localStorage.setItem('cachedUserData', JSON.stringify(mappedUser));
            setIsLoading(false);
            clearTimeout(safetyTimeout);
            console.log(`handleSessionChange completed in ${(performance.now() - startTime).toFixed(2)}ms`);
            isHandlingSessionChangeRef.current = false;
            return;
          }
          
          // User doesn't exist, create it
          const userCreateResult = await ensureUserExists(
            supabaseUser.id,
            supabaseUser.email || '',
            supabaseUser.user_metadata?.full_name || (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'User')
          );
          
          if (userCreateResult) {
            // User was created, use that data
            const createdUser: User = {
              auth_id: userCreateResult.auth_id,
              full_name: userCreateResult.full_name,
              email: userCreateResult.email,
              plan_id: userCreateResult.plan_id,
              stripe_customer_id: userCreateResult.stripe_customer_id,
              created_at: userCreateResult.created_at,
              subscriptionPlan: 'Free',
              max_scans_per_day: null
            };
            
            setUser(createdUser);
            localStorage.setItem('cachedUserData', JSON.stringify(createdUser));
          } else {
            // Fallback user if creation failed
            const fallbackUser: User = {
              auth_id: supabaseUser.id,
              full_name: supabaseUser.user_metadata?.full_name || (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'User'),
              email: supabaseUser.email || 'guest@example.com',
              created_at: supabaseUser.created_at || new Date().toISOString(),
              subscriptionPlan: 'Free'
            };
            
            setUser(fallbackUser);
            localStorage.setItem('cachedUserData', JSON.stringify(fallbackUser));
          }
        } catch (error) {
          console.error('Error handling user data:', error);
          
          // Create an emergency user to prevent app failure
          const emergencyUser: User = {
            auth_id: supabaseUser.id,
            full_name: supabaseUser.user_metadata?.full_name || (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'User'),
            email: supabaseUser.email || 'emergency@example.com',
            created_at: supabaseUser.created_at || new Date().toISOString(),
            subscriptionPlan: 'Free'
          };
          
          setUser(emergencyUser);
          localStorage.setItem('cachedUserData', JSON.stringify(emergencyUser));
        }
        
        // Ensure isLoading is false and clear the safety timeout
        setIsLoading(false);
        clearTimeout(safetyTimeout);
      } catch (error) {
        console.error('Error handling session change:', error);
        
        // Create a minimal emergency user to prevent complete app failure
        if (session?.user) {
          const emergencyUser: User = {
            auth_id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Emergency User',
            email: session.user.email || 'emergency@example.com',
            created_at: session.user.created_at || new Date().toISOString(),
            subscriptionPlan: 'Free'
          };
          
          setUser(emergencyUser);
        }
        
        // Always ensure isLoading is false even when errors happen
        setIsLoading(false);
      } finally {
        // Triple-check that isLoading is false in finally block
        setIsLoading(false);
        console.log(`handleSessionChange completed in ${(performance.now() - startTime).toFixed(2)}ms`);
        // Reset re-entrancy guard in finally block
        isHandlingSessionChangeRef.current = false;
      }
    } catch (error) {
      console.error('Unexpected top-level error in handleSessionChange:', error);
      setIsLoading(false);
      console.log(`handleSessionChange failed in ${(performance.now() - startTime).toFixed(2)}ms`);
      // Reset re-entrancy guard if top-level error occurs
      isHandlingSessionChangeRef.current = false;
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    console.time("AuthContext_signIn_overall"); // Start overall timer for signIn
    try {
      setIsLoading(true);
      
      // Clear any stale auth flow state
      clearAuthFlowState();
      
      console.time("AuthContext_signIn_signInWithPassword");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.timeEnd("AuthContext_signIn_signInWithPassword");
      
      if (error) {
        throw error;
      }
      
      // Explicitly set the session and handle session change to ensure user is populated
      if (data.session) {
        // Just log success
        const supabaseUser = data.session.user;
        console.log("User signed in successfully:", supabaseUser.email);
        
        // Await handleSessionChange to ensure context state is updated
        await handleSessionChange(data.session);
      }
    } catch (error) {
      console.error('Error signing in:', error);
      setIsLoading(false);
      throw error;
    }
    console.timeEnd("AuthContext_signIn_overall"); // End overall timer for signIn
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string) => {
    console.time("AuthContext_signUp_overall"); // Start overall timer for signUp
    try {
      setIsLoading(true);
      console.time("AuthContext_signUp_supabaseSignUp");
      
      // First check if a user with this email already exists in auth
      const { data: { users: existingUsers }, error: existingUserError } = await supabase.auth.admin.listUsers();
      
      if (existingUserError) {
        console.error("Error checking for existing user:", existingUserError);
      } else if (existingUsers && existingUsers.some(user => user.email === email)) {
        throw new Error("Email already registered. Please try logging in instead.");
      }
      
      console.log("Signing up user with redirect URL:", `${window.location.origin}/auth/confirm`);
      
      // Proceed with signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      console.timeEnd("AuthContext_signUp_supabaseSignUp");
      
      if (error) {
        console.error("Supabase auth signup error:", error);
        
        // For specific error message about user already exists
        if (error.message?.includes("already registered")) {
          throw new Error("Email already registered. Please try logging in instead.");
        }
        throw error;
      }
      
      console.log("Sign up response:", data);
      
      // Create a backup of the flow state for email verification
      const flowState = localStorage.getItem('biovision-auth-storage-v2');
      if (flowState) {
        // Create backup specifically for email verification flow
        backupFlowState('email-verification');
        console.log('Created backup of email verification flow state');
      }
      
      // If signup was successful and we have a user, create a database record
      if (data.user) {
        console.log("User signed up successfully:", data.user.email);
        
        // Wait a moment to ensure the auth record is fully created
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          // Create a user record in the database
          const dbUser = await ensureUserExists(
            data.user.id,
            email,
            name
          );
          
          if (dbUser) {
            console.log("Created database record for new user:", dbUser);
          } else {
            console.warn("Failed to create database record. This might be handled by the database trigger.");
            
            // Show toast with info for the user
            toast({
              title: "Account created",
              description: "Your account was created, but some profile setup may be incomplete. You can still log in.",
              variant: "default"
            });
          }
        } catch (dbError: any) {
          console.error("Error creating user database record:", dbError);
          
          // Check if this is a duplicate key error for email
          if (dbError.code === '23505' && dbError.details?.includes('email')) {
            console.warn('User with this email already exists in database:', dbError.details);
            toast({
              title: "Email already registered",
              description: "An account with this email already exists. Please try logging in.",
              variant: "default"
            });
            
            throw new Error("Email already registered. Please try logging in instead.");
          }
          
          // Check if this is a severe error the user should know about
          if (dbError.status === 500 || dbError.code === 'ERR_BAD_RESPONSE') {
            console.error('Database server error during signup:', dbError);
            toast({
              title: "Database error",
              description: "There was a problem setting up your profile. Please try logging in later or contact support.",
              variant: "destructive"
            });
            
            throw new Error(`unexpected_failure: Database error during user creation. Please try again later. (Code: ${dbError.status || dbError.code || 'unknown'})`);
          }
          
          // Don't block signup if database record creation fails due to non-critical issues
          // The database trigger should handle it, or they can try logging in later
          toast({
            title: "Account created",
            description: "Your account was created, but profile setup encountered an issue. You can still log in.",
            variant: "default"
          });
        }
      } else {
        console.warn("Auth signup completed but no user data returned");
        
        toast({
          title: "Registration status unclear",
          description: "Your registration may have been completed. Please try logging in.",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error('Error signing up:', error);
      
      // If we haven't already specially handled this error type
      if (!error.message?.includes('unexpected_failure')) {
        // Convert generic errors to more user-friendly messages
        if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
          error.message = 'Network error. Please check your internet connection and try again.';
        } else if (error.status === 429) {
          error.message = 'Too many attempts. Please try again later.';
        }
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
    console.timeEnd("AuthContext_signUp_overall"); // End overall timer for signUp
  };

  // Sign out
  const signOut = async () => {
    console.time("AuthContext_signOut_overall");
    try {
      setIsLoading(true);
      console.time("AuthContext_signOut_supabaseSignOut");
      
      // Clear auth flow state before signing out
      clearAuthFlowState();
      
      // Dispatch a custom event to notify components that user is logging out
      window.dispatchEvent(new CustomEvent('userLogout'));
      
      const { error } = await supabase.auth.signOut();
      console.timeEnd("AuthContext_signOut_supabaseSignOut");
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
    console.timeEnd("AuthContext_signOut_overall");
  };

  // Reset password
  const resetPassword = async (email: string) => {
    console.time("AuthContext_resetPassword_overall");
    try {
      setIsLoading(true);
      console.time("AuthContext_resetPassword_supabaseReset");
      
      // Make sure we use the same origin that the app is running on
      const origin = window.location.origin;
      console.log(`Setting password reset redirect to: ${origin}/reset-password`);
      
      // Log localStorage state before reset
      console.log('Local storage state before reset:', 
        localStorage.getItem('biovision-auth-storage-v2') ? 'PKCE data exists' : 'No PKCE data');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      console.timeEnd("AuthContext_resetPassword_supabaseReset");
      
      // Log localStorage state after reset
      console.log('Local storage state after reset:', 
        localStorage.getItem('biovision-auth-storage-v2') ? 'PKCE data exists' : 'No PKCE data');
      
      // Use the utility function to create a backup for password reset flow
      if (localStorage.getItem('biovision-auth-storage-v2')) {
        // Create backup for password reset flow using the utility function
        const backupSuccess = backupFlowState('password-reset');
        console.log('Password reset flow state backup created:', backupSuccess ? 'Success' : 'Failed');
      } else {
        console.warn('No PKCE flow state found to backup after password reset request');
      }
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
    console.timeEnd("AuthContext_resetPassword_overall");
  };

  // Use the updateUserProfile function from lib/supabase.ts
  const updateProfile = async (data: Partial<User>): Promise<void> => {
    console.time("AuthContext_updateProfile_overall");
    if (!user || !session) {
      throw new Error('You must be logged in to update your profile');
    }
    
    try {
      setIsLoading(true);
      
      // Update auth metadata if full_name is provided
      if (data.full_name !== undefined) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { full_name: data.full_name }
        });
        
        if (authError) {
          console.error('Error updating auth metadata:', authError);
          throw new Error('Failed to update profile metadata');
        }
      }
      
      // Update database user record
      const updatedUser = await updateUserProfile(user.auth_id, {
        full_name: data.full_name,
        email: data.email,
      });
      
      if (!updatedUser) {
        throw new Error('Failed to update user profile in the database');
      }
      
      // Update local user state
      setUser(prevUser => ({
        ...prevUser!,
        ...data
      }));
      
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Show error toast
      toast({
        title: "Profile update failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
    console.timeEnd("AuthContext_updateProfile_overall");
  };

  // Improve the visibility change handler cleanup
  useEffect(() => {
    // Store active state in localStorage to coordinate with supabase.ts
    localStorage.setItem('auth-context-active', 'true');
    
    // Register visibility change handler
    const handleVisibilityChange = () => {
      // Skip if we're already processing a visibility change
      if (processingVisibilityChangeRef.current) {
        console.log("Skipping visibility change handler - already processing another change");
        return;
      }
      
      // Rate limiting - prevent handling visibility changes more frequently than every 3 seconds
      const now = Date.now();
      if (now - lastVisibilityChangeTimeRef.current < 3000) {
        console.log("Skipping visibility change handler - too soon after previous change");
        return;
      }
      lastVisibilityChangeTimeRef.current = now;
      
      if (document.visibilityState === "visible") {
        console.log("Page became visible, checking session");
        processingVisibilityChangeRef.current = true;
        
        // Skip check if we're already in the middle of authentication
        if (isLoading || isHandlingSessionChangeRef.current) {
          console.log("Skipping visibility check because auth is already in progress");
          processingVisibilityChangeRef.current = false;
          
          // Reset isLoading if it's been stuck for more than 5 seconds after visibility change
          const timeoutId = setTimeout(() => {
            if (isLoading) {
              console.warn("Detected stuck loading state after visibility change, resetting");
              setIsLoading(false);
            }
          }, 5000);
          
          // Register the timeout for cleanup
          registerCleanup(() => clearTimeout(timeoutId));
          return;
        }
        
        // Refresh the session when page becomes visible
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session && session) {
            // Try to refresh the session if it's missing
            supabase.auth.refreshSession()
              .catch(err => {
                console.error("Error refreshing session on visibility change:", err);
              });
          }
          processingVisibilityChangeRef.current = false;
        }).catch(() => {
          processingVisibilityChangeRef.current = false;
        });
      }
    };
    
    console.log("AuthContext: Setting up visibility change listener");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Clean up event listener on unmount
    return () => {
      console.log("AuthContext: Removing visibility change listener");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      localStorage.removeItem('auth-context-active');
    };
  }, [session, user, isLoading, registerCleanup]); // Added additional dependencies

  const setupSessionRefresh = useCallback(() => {
    // Clear any existing refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    console.log("AuthContext: Setting up session refresh interval");
    
    // Set up a new refresh interval
    refreshIntervalRef.current = setInterval(async () => {
      // This is where session refresh logic would go
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    // Set up a visibilitychange handler specifically for session refresh
    const handleVisibilityChangeForRefresh = () => {
      if (document.visibilityState === "visible") {
        console.log("AuthContext: Page became visible, checking token expiration");
        // Check token expiration and refresh if needed
      }
    };
    
    // Add listener
    document.addEventListener("visibilitychange", handleVisibilityChangeForRefresh);
    
    // Return a cleanup function to remove the event listener
    return () => {
      console.log("AuthContext: Cleaning up session refresh interval and visibility listener");
      document.removeEventListener("visibilitychange", handleVisibilityChangeForRefresh);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);

  // Set up session refresh when a session is available
  useEffect(() => {
    if (session) {
      console.log("Session detected, setting up refresh mechanism");
      console.time("AuthContext_setupSessionRefresh_duration"); // Time how long setup takes if needed
      const cleanup = setupSessionRefresh();
      console.timeEnd("AuthContext_setupSessionRefresh_duration");
      
      // Register the cleanup with our cleanup system
      registerCleanup(cleanup);
      
      return cleanup;
    } else {
      console.log("No session available, refresh mechanism not set up");
    }
  }, [session, setupSessionRefresh, registerCleanup]);
  
  // Add a function to manually retry authentication
  const retryAuthentication = async () => {
    console.time("AuthContext_retryAuthentication_overall");
    try {
      setIsLoading(true);
      setAuthError(null);
      console.time("AuthContext_retryAuthentication_getSession");
      // Get current session - REMOVED Promise.race with manual timeout
      const { data, error: sessionError } = await supabase.auth.getSession();
      console.timeEnd("AuthContext_retryAuthentication_getSession");
      
      if (sessionError) {
        // If getSession itself fails, throw that error
        throw sessionError;
      }
      
      if (data.session) {
        // Check if user exists in database and create if not
        try {
          const supabaseUser = data.session.user;
          console.log("Verifying user database record during retry:", supabaseUser.email);
          
          // Create an optimized promise for ensuring the user exists with timeout
          const ensurePromise = ensureUserExists(
            supabaseUser.id,
            supabaseUser.email || '',
            supabaseUser.user_metadata?.full_name || (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'User')
          );
          
          // Add a timeout to avoid blocking indefinitely
          await Promise.race([
            ensurePromise,
            new Promise((_, reject) => 
              setTimeout(() => {
                console.warn("User database verification timed out during retry");
                // We don't reject here to allow the process to continue
              }, 3000)
            )
          ]);
        } catch (dbError) {
          console.error("Error ensuring user database record during retry:", dbError);
          // Continue even if this fails - the session is still valid
        }
        
        // Handle the retrieved session
        await handleSessionChange(data.session);
      } else {
        // No session found, redirect to login
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Error retrying authentication:', error);
      setAuthError("Authentication failed. Please sign in again.");
    } finally {
      setIsLoading(false);
    }
    console.timeEnd("AuthContext_retryAuthentication_overall");
  };

  // Values for the context provider
  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    authError,
    retryAuthentication,
  };

  // Create an AuthErrorBanner component that will be rendered in the provider
  const AuthErrorBanner = () => {
    if (!authError) return null;
    
    return (
      <div className="bg-red-500 text-white p-2 flex justify-between items-center">
        <div className="flex items-center">
          <span className="mr-2">⚠️</span>
          <span>{authError}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={retryAuthentication}
            className="bg-white text-red-500 px-2 py-1 text-sm rounded"
          >
            Retry
          </button>
          <button 
            onClick={() => setAuthError(null)} 
            className="bg-red-400 text-white px-2 py-1 text-sm rounded"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  return (
    <AuthContext.Provider value={value}>
      <AuthErrorBanner />
      {children}
    </AuthContext.Provider>
  );
};
