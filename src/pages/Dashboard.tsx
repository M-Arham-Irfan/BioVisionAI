import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, User } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Calendar,
  Mail,
  Phone,
  Save,
  Clock,
  Activity,
  CheckCircle2,
  X,
  AlertCircle,
  Eye,
  Download,
  RefreshCw,
  UserRound,
  CreditCard,
  Camera,
  LogOut,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import ScanHistory from "@/components/scan-analysis/ScanHistory";
import { UserStatsCard } from "@/components/scan-analysis/UserStatsCard";
import ProfileInformationCard from "@/components/dashboard/ProfileInformationCard";
import SubscriptionManagementCard from "@/components/dashboard/SubscriptionManagementCard";
import AccountActionsCard from "@/components/dashboard/AccountActionsCard";
import UserProfileSummaryCard from "@/components/dashboard/UserProfileSummaryCard";
import { useSupabaseRecord, useUserSubscription, useUserStats } from "@/hooks/useSupabaseData";
import { useDashboardTabs, DashboardTab } from "@/hooks/useDashboardTabs";
import { supabase, cacheControl } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getUserScans } from "@/lib/database";
import { deleteUserAccount } from "@/lib/supabase";

const Dashboard = () => {
  const { user, isAuthenticated, isLoading, session, retryAuthentication, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localLoading, setLocalLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryingAuth, setRetryingAuth] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { subscription, loading: subscriptionLoading } = useUserSubscription(user?.auth_id || null);
  const { stats, loading: statsLoading } = useUserStats(user?.auth_id || null);

  // Log authentication state for debugging - add memo to avoid frequent logging
  const authStateKey = `${isAuthenticated}-${Boolean(user)}-${isLoading}-${Boolean(session)}`;
  const prevAuthStateRef = useRef('');
  
  useEffect(() => {
    if (prevAuthStateRef.current !== authStateKey) {
      console.log("Dashboard - Auth Status:", {
        isAuthenticated,
        hasUser: !!user,
        isLoading,
        hasSession: !!session
      });
      prevAuthStateRef.current = authStateKey;
    }
  }, [authStateKey]);

  // Fetch the user's database record if they're authenticated
  const { 
    data: dbUser, 
    loading: dbUserLoading,
    refresh: refreshDbUser
  } = useSupabaseRecord<User>(
    'users',
    user?.auth_id || null,
    'auth_id'  // Explicitly specify auth_id as the column to query
  );
  
  const [isRefreshingUser, setIsRefreshingUser] = useState(false);

  // Implement aggressive caching for user profile data
  useEffect(() => {
    if (user?.auth_id) {
      // Set extremely aggressive caching for user profile data
      queryClient.setQueryDefaults(['supabase-record', 'users', user.auth_id], {
        staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours before considering stale
        gcTime: 7 * 24 * 60 * 60 * 1000, // Keep in cache for 7 days
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false
      });
      
      // If we have user data, persist it to localStorage for offline access
      if (dbUser) {
        localStorage.setItem('cached_user_profile', JSON.stringify(dbUser));
        localStorage.setItem('cached_user_profile_timestamp', Date.now().toString());
      }
    }
  }, [user?.auth_id, queryClient, dbUser]);

  // Only log when user data changes, not on every render
  const userDataKey = user ? JSON.stringify({
    id: user.auth_id,
    email: user.email,
    name: user.full_name,
    plan: user.plan_id
  }) : 'no-user';
  
  const prevUserDataRef = useRef('');
  
  useEffect(() => {
    if (prevUserDataRef.current !== userDataKey) {
      console.log("Dashboard - User Object from Auth:", user);
      prevUserDataRef.current = userDataKey;
    }
  }, [userDataKey, user]);
  
  // Only log subscription changes, not on every render
  const subscriptionKey = subscription ? JSON.stringify({
    id: subscription.subscription_id,
    plan: subscription.plan_id,
    status: subscription.status
  }) : 'no-subscription';
  
  const prevSubscriptionRef = useRef('');
  
  useEffect(() => {
    if (prevSubscriptionRef.current !== subscriptionKey) {
      console.log("Dashboard - Subscription Object from useUserSubscription:", subscription);
      prevSubscriptionRef.current = subscriptionKey;
    }
  }, [subscriptionKey, subscription]);

  // Use the new useDashboardTabs hook
  const { activeTab, setActiveTabAndUrl } = useDashboardTabs('overview');

  // Use a short timeout to prevent flashing loading states
  useEffect(() => {
    if (isLoading) {
      setLocalLoading(true);
      
      // Set a very short timeout to prevent UI flashing
      const timeout = setTimeout(() => {
        if (!user) {
          setLocalLoading(false);
        }
      }, 200);
      
      return () => clearTimeout(timeout);
    } else {
      // If not loading, clear the local loading state
      setLocalLoading(false);
    }
  }, [isLoading, user]);

  // Check for corrupted auth state
  useEffect(() => {
    console.log("Processing Dashboard user effect", { user, isLoading });
    
    if (isLoading) {
      // Set local loading when auth is still loading
      setLocalLoading(true);
    } else if (user) {
      // User is loaded properly
      console.log("User found:", user.email);
      setLocalLoading(false);
      setAuthError(null);
      
      // Cache user data for recovery in case of session issues
      if (user.auth_id) {
        localStorage.setItem('cachedUserData', JSON.stringify(user));
      }
    } else if (!isLoading) {
      // Not loading and no user means auth failed
      console.log("No user found and not loading");
      setLocalLoading(false);

      // Check if we have a session but no user (corrupted state)
      if (session && !user) {
        console.warn("Session exists but no user - corrupted state");
        
        // Try to recover from cached user data
        const cachedUser = localStorage.getItem('cachedUserData');
        try {
          if (cachedUser) {
            const userData = JSON.parse(cachedUser);
            if (userData.auth_id === session.user.id) {
              console.log("Recovered user data from cache");
              // Force-update user state with cached data
              queryClient.setQueryData(['supabase-record', 'users', session.user.id], userData);
              return;
            }
          }
        } catch (e) {
          console.error("Error processing cached user data:", e);
        }
        
        // If recovery failed, try to refresh data
        setAuthError("Authentication issue: Trying to recover your session...");
        retryAuthentication();
      }
    }
  }, [user, isLoading, session, queryClient, retryAuthentication]);

  // Handle redirection if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !localLoading) {
      console.log("Not authenticated, redirecting to login");
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate, localLoading]);

  // Function to handle manual authentication retry
  const handleRetryAuth = async () => {
    setRetryingAuth(true);
    setAuthError(null);
    try {
      // First clear the caches to force fresh data
      cacheControl.clear();
      queryClient.invalidateQueries();
      
      // Check for session directly with Supabase
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        console.log("Session found, retrying authentication");
        await retryAuthentication();
        toast({
          title: "Authentication refreshed",
          description: "Your session has been restored"
        });
        
        // Refresh all data
        refreshDbUser();
      } else {
        console.log("No session found during retry");
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive"
        });
        navigate("/login");
      }
    } catch (error) {
      console.error("Auth retry failed:", error);
      toast({
        title: "Authentication failed",
        description: "Please try logging in again",
        variant: "destructive"
      });
    } finally {
      setRetryingAuth(false);
    }
  };

  // Improve the initial loading state check to avoid unnecessary loading screens
  if ((isLoading || dbUserLoading || localLoading) && !authError) {
    return (
      <div className="container mx-auto p-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>
        <div className="bg-gray-900 border-gray-800 rounded-xl p-8 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-4 mb-4">
              <div className="h-8 w-8 rounded-full border-4 border-t-blue-500 border-b-gray-700 border-l-gray-700 border-r-gray-700 animate-spin"></div>
              <p className="text-gray-400">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Display auth error if exists
  if (authError) {
    return (
      <div className="container mx-auto p-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl text-red-400">Authentication Issue</CardTitle>
            <CardDescription className="text-gray-400">
              We're having trouble authenticating your session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">{authError}</p>
            <div className="flex gap-4">
              <Button 
                onClick={handleRetryAuth}
                disabled={retryingAuth}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {retryingAuth ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Authentication
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/login")}
                className="border-gray-700"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard for authentication (additional safety measure)
  if (!user) {
    return (
      <div className="container mx-auto p-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-xl text-yellow-400">Session Error</CardTitle>
            <CardDescription className="text-gray-400">
              Unable to load your user data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">Your session could not be loaded properly. Please try logging in again.</p>
            <Button 
              onClick={() => navigate("/login")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDeleteAccount = async () => {
    if (!user?.auth_id) {
      toast({
        title: "Error",
        description: "User session not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First delete the account while the session is still valid
      const { success, error } = await deleteUserAccount(user.auth_id);
      
      if (!success) {
        throw new Error(error || "Failed to delete account");
      }
      
      // Clear any query cache data
      queryClient.clear();
      
      // Now sign out - might fail with 403 but that's expected since account is deleted
      try {
        await signOut();
      } catch (err) {
        console.log("Expected error during sign out after deletion:", err);
      }
      
      // Navigate to the register page
      navigate("/register");
      
      // Show success toast
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted. We're sorry to see you go.",
      });
    } catch (error: any) {
      console.error("Account deletion failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      queryClient.clear();
      navigate("/login");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      console.error("Logout failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTabAndUrl(value as DashboardTab)} className="w-full">
        <TabsList className="mb-8 bg-gray-800 text-gray-400">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            onClick={() => setActiveTabAndUrl('overview')}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="scan-history"
            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            onClick={() => setActiveTabAndUrl('scan-history')}
          >
            Scan History
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            onClick={() => setActiveTabAndUrl('profile')}
          >
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Summary Card - Now first on mobile, third on desktop */}
            <div className="order-first lg:order-last lg:col-span-1">
              <UserProfileSummaryCard 
                authUser={user}
                subscriptionData={subscription}
                statsData={stats}
                subscriptionLoading={subscriptionLoading}
                statsLoading={statsLoading}
              />
            </div>

            {/* Main content - Second on mobile, first on desktop spanning 2 columns */}
            <div className="order-last lg:order-first lg:col-span-2 space-y-6">
              {/* User Stats Card */}
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                <UserStatsCard />
              </div>

              {/* Recent Scans Section */}
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                <ScanHistory />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scan-history" className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Scan History</CardTitle>
              <CardDescription>
                View all your past X-ray analyses
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScanHistory limit={10} showViewAll={false} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <ProfileInformationCard authUser={user} onProfileUpdate={refreshDbUser} />
          
          {/* Use the new SubscriptionManagementCard component */}
          <SubscriptionManagementCard 
            authUser={user} 
            subscriptionData={subscription} 
            subscriptionLoading={subscriptionLoading} 
          />
          
          {/* Use the new AccountActionsCard component */}
          <AccountActionsCard 
            onDeleteAccount={handleDeleteAccount} 
            onLogout={handleLogout} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
