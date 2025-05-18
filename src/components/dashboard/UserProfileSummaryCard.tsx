import React, { useCallback } from 'react';
import { User } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Activity } from 'lucide-react';
import { format, isValid } from 'date-fns';

// Types from Dashboard (can be refined or imported from a central types file)
interface SubscriptionPlanDetails {
  name?: string;
  max_scans_per_day?: number | string;
  features?: string[];
}
interface SubscriptionEntry {
  status?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}
interface UserSubscriptionData {
  subscription_plans?: SubscriptionPlanDetails | null;
  subscriptions?: SubscriptionEntry[];
}
interface UserStatsData {
  today: number;
  week: number;
  month: number;
}

interface UserProfileSummaryCardProps {
  authUser: User | null;
  subscriptionData: UserSubscriptionData | null | undefined;
  statsData: UserStatsData | null;
  subscriptionLoading: boolean;
  statsLoading: boolean;
}

const UserProfileSummaryCard: React.FC<UserProfileSummaryCardProps> = ({
  authUser,
  subscriptionData,
  statsData,
  subscriptionLoading,
  statsLoading,
}) => {

  const getInitials = useCallback((name: string | undefined | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }, []);

  const formatDate = useCallback((dateString: string | undefined | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isValid(date) ? format(date, "MMMM d, yyyy") : "N/A";
  }, []);

  if (!authUser) {
    // Or a more specific loading/fallback for this card if authUser is critical and not yet available
    return null; 
  }

  // Determine if the current plan is effectively the Free plan for usage limit display
  const effectivePlanName = subscriptionData?.subscription_plans?.name || authUser.subscriptionPlan;
  const isFreePlanForUsageDisplay = 
    !subscriptionData || 
    effectivePlanName === 'Free' || 
    !subscriptionData?.subscription_plans?.max_scans_per_day;
  
  const dailyScanLimit = isFreePlanForUsageDisplay 
    ? 5 
    : (typeof subscriptionData?.subscription_plans?.max_scans_per_day === 'number' 
        ? subscriptionData.subscription_plans.max_scans_per_day 
        : 5); // Fallback to 5 if max_scans_per_day is 'unlimited' or not a number

  const currentStats = statsData || { today: 0, week: 0, month: 0 };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="flex flex-col items-center border-b border-gray-800 pb-6">
        <Avatar className="h-24 w-24 mb-4">
          {/* Assuming profile picture URL might come from authUser or a different source in the future */}
          {/* For now, using initials as per original logic which didn't show a picture here */}
          <AvatarFallback className="bg-blue-600 text-white text-lg">
            {getInitials(authUser?.full_name)}
          </AvatarFallback>
        </Avatar>

        <CardTitle className="text-xl text-white">
          {authUser?.full_name || "User"}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {authUser.email}
        </CardDescription>

        <div className="mt-2">
          <Badge className="bg-blue-700 hover:bg-blue-800 text-white">
            {effectivePlanName || "Free"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-1">
              Account Summary
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Member Since
                </span>
                <span className="text-white text-sm">
                  {formatDate(authUser?.created_at)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Last Updated 
                  {/* Original logic used created_at for Last Updated. If there's an updated_at field, use that. */}
                </span>
                <span className="text-white text-sm">
                  {formatDate(authUser?.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800">
            <h4 className="text-sm font-medium text-gray-400 mb-3">
              Usage Summary
            </h4>
            <div className="space-y-4">
              {subscriptionLoading || statsLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-3 bg-gray-800 rounded w-full"></div>
                  <div className="h-1 bg-gray-800 rounded w-full"></div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400 text-xs flex items-center">
                        <Activity className="h-3 w-3 mr-1 text-blue-400" />
                        Daily Scans
                      </span>
                      <span className="text-white text-xs">
                        {currentStats.today}/{dailyScanLimit}
                      </span>
                    </div>
                    <Progress
                      value={dailyScanLimit > 0 ? Math.min((currentStats.today / dailyScanLimit) * 100, 100) : 0}
                      className="h-1 bg-gray-800"
                    />
                  </div>

                  {subscriptionData?.subscriptions && subscriptionData.subscriptions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-800">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Plan Renewal</span>
                        <span className="text-xs text-white">
                          {subscriptionData.subscriptions[0].current_period_end
                            ? formatDate(subscriptionData.subscriptions[0].current_period_end)
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileSummaryCard; 