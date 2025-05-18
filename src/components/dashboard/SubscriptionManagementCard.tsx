import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/contexts/AuthContext'; // Assuming User type is exported
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, CreditCard } from 'lucide-react';

// Define a more specific type for the subscription prop based on its usage in Dashboard.tsx
interface SubscriptionPlanDetails {
  name?: string;
  max_scans_per_day?: number | string; // Can be number or string like 'unlimited'
  features?: string[];
}

interface Subscription {
  status?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

interface UserSubscription {
  subscription_plans?: SubscriptionPlanDetails | null;
  subscriptions?: Subscription[]; // Array of subscriptions
  // Add other fields if present in the actual subscription object
}

interface SubscriptionManagementCardProps {
  authUser: User | null;
  subscriptionData: UserSubscription | null | undefined; 
  subscriptionLoading: boolean;
}

const SubscriptionManagementCard: React.FC<SubscriptionManagementCardProps> = ({
  authUser,
  subscriptionData,
  subscriptionLoading,
}) => {
  const navigate = useNavigate();

  // Default plan details for Free tier or when data is missing
  const defaultPlanName = authUser?.subscriptionPlan || 'Free Plan';
  const currentPlanName = subscriptionData?.subscription_plans?.name || defaultPlanName;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="text-white">Subscription Plan</CardTitle>
        <CardDescription>Manage your subscription and billing details</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {subscriptionLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            <div className="h-4 bg-gray-800 rounded w-2/3"></div>
          </div>
        ) : subscriptionData && subscriptionData.subscription_plans ? (
          <div className="space-y-4">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h3 className="font-medium text-white mb-2">Current Plan</h3>
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-xl font-semibold text-white">
                  {currentPlanName}
                </p>
                <Badge className="bg-blue-600">Active</Badge>
              </div>

              <div className="mt-4 border-t border-gray-700 pt-4">
                <h4 className="font-medium text-gray-300 mb-2">Features</h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-gray-300">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                    <span>
                      Up to {subscriptionData.subscription_plans.max_scans_per_day || 'unlimited'} scans per day
                    </span>
                  </li>
                  {subscriptionData.subscription_plans.features &&
                    Array.isArray(subscriptionData.subscription_plans.features) &&
                    subscriptionData.subscription_plans.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                        <span>{feature}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {subscriptionData.subscriptions && subscriptionData.subscriptions.length > 0 && (
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <h4 className="font-medium text-gray-300 mb-2">Subscription Status</h4>
                  <div className="flex items-center">
                    <Badge
                      className={`${
                        subscriptionData.subscriptions[0].status === 'active'
                          ? 'bg-green-600'
                          : 'bg-yellow-600'
                      }`}
                    >
                      {subscriptionData.subscriptions[0].status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {subscriptionData.subscriptions[0].current_period_end && (
                    <p className="text-sm text-gray-400 mt-2">
                      {subscriptionData.subscriptions[0].cancel_at_period_end
                        ? 'Your subscription will end'
                        : 'Will renew'} on{' '}
                      {new Date(subscriptionData.subscriptions[0].current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => navigate('/pricing')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Fallback for Free Plan or if subscription data is not fully loaded but not in explicit loading state
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <h3 className="font-medium text-white mb-2">Current Plan</h3>
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-xl font-semibold text-white">{currentPlanName}</p>
              <Badge className="bg-blue-600">Active</Badge>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Manage your subscription to access advanced features.
            </p>

            <div className="mt-4 border-t border-gray-700 pt-4">
              <h4 className="font-medium text-gray-300 mb-2">Features</h4>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                  <span>Access to all basic features</span>
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                  <span>Up to 5 scans per day (standard free tier)</span>
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                  <span>Basic analytics dashboard</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => navigate('/pricing')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionManagementCard; 