import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserStats } from "@/hooks/useSupabaseData";
import { CheckCircle2, AlertCircle, Clock, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const UserStatsCard = () => {
  const { user } = useAuth();
  const { stats, loading, error } = useUserStats(user?.auth_id || null);

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Your Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            <div className="h-4 bg-gray-800 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !user?.auth_id) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Your Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">
              {!user?.auth_id 
                ? "Unable to retrieve your user information." 
                : "There was a problem loading your statistics."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Your Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-800">
            <div className="text-green-400 flex items-center mb-2">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <div className="text-lg font-semibold">{stats.total}</div>
            </div>
            <div className="text-gray-400 text-sm">Total Scans</div>
          </div>
          
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-800">
            <div className="text-yellow-400 flex items-center mb-2">
              <Clock className="w-5 h-5 mr-2" />
              <div className="text-lg font-semibold">{stats.week}</div>
            </div>
            <div className="text-gray-400 text-sm">This Week</div>
          </div>
          
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-800">
            <div className="text-blue-400 flex items-center mb-2">
              <AlertCircle className="w-5 h-5 mr-2" />
              <div className="text-lg font-semibold">{stats.today}</div>
            </div>
            <div className="text-gray-400 text-sm">Today</div>
          </div>
          
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-800">
            <div className="text-purple-400 flex items-center mb-2">
              <Calendar className="w-5 h-5 mr-2" />
              <div className="text-lg font-semibold">{stats.month}</div>
            </div>
            <div className="text-gray-400 text-sm">This Month</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 