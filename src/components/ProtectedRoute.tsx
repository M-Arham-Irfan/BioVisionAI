import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user, session } = useAuth();
  const location = useLocation();

  // Allow rendering protected content if we have a user or session
  // even if isAuthenticated flag hasn't been fully processed.
  // This can help if AuthContext is slow but a session exists from previous visit.
  const hasPartialAuth = !!user || !!session;

  // Show loading indicator while AuthContext is verifying authentication.
  if (isLoading && !hasPartialAuth) { // Show loader if isLoading and no prior user/session hint
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-gray-500 text-sm">Verifying your account...</p>
      </div>
    );
  }

  // If AuthContext is no longer loading and user is not authenticated, then redirect.
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If still loading but we have a partial auth (e.g. user/session object exists),
  // or if successfully authenticated, render the children.
  // This allows the app to proceed if a session object is quickly available, 
  // even if full isAuthenticated flow with db checks in AuthContext is a bit slower.
  // Child components should handle their own data loading states if they depend on dbUser from AuthContext.
  if ((isLoading && hasPartialAuth) || isAuthenticated) {
    return children ? <>{children}</> : <Outlet />;
  }
  
  // Fallback section removed. The conditions above should cover all valid states.
  // If execution reaches here, it implies an unexpected state. Redirecting to login 
  // seems like the safest default action in such an edge case.
  console.warn("ProtectedRoute reached unexpected state, redirecting to login.");
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
};

export default ProtectedRoute; 