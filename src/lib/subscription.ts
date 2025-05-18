import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid';

/**
 * Get all available subscription plans
 * @param supabase Supabase client
 * @returns Array of available subscription plans
 */
export async function getAvailablePlans(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_usd', { ascending: true });
  
  if (error) {
    console.error('Error fetching subscription plans:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get a specific subscription plan by ID
 * @param supabase Supabase client
 * @param planId The plan ID to fetch
 * @returns The subscription plan or null if not found
 */
export async function getPlanById(supabase: SupabaseClient<Database>, planId: number) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('plan_id', planId)
    .single();
  
  if (error) {
    console.error('Error fetching subscription plan:', error);
    return null;
  }
  
  return data;
}

/**
 * Get a user's current subscription
 * @param supabase Authenticated Supabase client
 * @param userId The user's auth_id
 * @returns The user's current subscription or null if not found
 */
export async function getUserSubscription(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      subscription_plans(*)
    `)
    .eq('auth_id', userId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No active subscription found (not an error)
      return null;
    }
    console.error('Error fetching user subscription:', error);
    return null;
  }
  
  return data;
}

/**
 * Check if a user's subscription is active
 * @param supabase Authenticated Supabase client
 * @param userId The user's auth_id
 * @returns Boolean indicating if the user has an active subscription
 */
export async function hasActiveSubscription(supabase: SupabaseClient<Database>, userId: string) {
  const subscription = await getUserSubscription(supabase, userId);
  return !!subscription;
}

/**
 * Create a new subscription record in the database
 * @param supabase Authenticated Supabase client
 * @param userId The user's auth_id
 * @param planId The plan ID to subscribe to
 * @param stripeSubscriptionId The Stripe subscription ID
 * @param status The initial subscription status
 * @returns The created subscription or null if there was an error
 */
export async function createSubscription(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: number,
  stripeSubscriptionId: string,
  status: SubscriptionStatus,
  periodStart: string,
  periodEnd: string
) {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      auth_id: userId,
      plan_id: planId,
      stripe_subscription_id: stripeSubscriptionId,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating subscription:', error);
    return null;
  }
  
  // Update the user's plan_id field
  await supabase
    .from('users')
    .update({ plan_id: planId })
    .eq('auth_id', userId);
    
  return data;
}

/**
 * Update an existing subscription
 * @param supabase Authenticated Supabase client
 * @param stripeSubscriptionId The Stripe subscription ID
 * @param updates Object containing the fields to update
 * @returns The updated subscription or null if there was an error
 */
export async function updateSubscription(
  supabase: SupabaseClient<Database>,
  stripeSubscriptionId: string,
  updates: {
    status?: SubscriptionStatus;
    plan_id?: number;
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating subscription:', error);
    return null;
  }
  
  // If plan_id is updated, also update the user's plan_id
  if (updates.plan_id && data) {
    await supabase
      .from('users')
      .update({ plan_id: updates.plan_id })
      .eq('auth_id', data.auth_id);
  }
  
  return data;
}

/**
 * Cancel a subscription at the end of the billing period
 * @param supabase Authenticated Supabase client
 * @param subscriptionId The subscription ID to cancel
 * @returns Boolean indicating if the cancellation was successful
 */
export async function cancelSubscription(
  supabase: SupabaseClient<Database>,
  subscriptionId: number
) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscriptionId)
    .select()
    .single();
  
  if (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }
  
  return true;
}

/**
 * Record a payment in the payment_history table
 * @param supabase Authenticated Supabase client
 * @param userId The user's auth_id
 * @param subscriptionId The subscription ID associated with the payment
 * @param stripePaymentIntentId The Stripe payment intent ID
 * @param amountUsd The payment amount in USD
 * @param status The payment status
 * @param paymentMethod Payment method description (e.g., "Visa *1234")
 * @param receiptUrl URL to the receipt
 * @returns The created payment record or null if there was an error
 */
export async function recordPayment(
  supabase: SupabaseClient<Database>,
  userId: string,
  subscriptionId: number | null,
  stripePaymentIntentId: string | null,
  amountUsd: number,
  status: string,
  paymentMethod: string | null,
  receiptUrl: string | null
) {
  const { data, error } = await supabase
    .from('payment_history')
    .insert({
      auth_id: userId,
      subscription_id: subscriptionId,
      stripe_payment_intent_id: stripePaymentIntentId,
      amount_usd: amountUsd,
      status,
      payment_method: paymentMethod,
      receipt_url: receiptUrl
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error recording payment:', error);
    return null;
  }
  
  return data;
}

/**
 * Get a user's payment history
 * @param supabase Authenticated Supabase client
 * @param userId The user's auth_id
 * @returns Array of payment records
 */
export async function getPaymentHistory(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from('payment_history')
    .select('*')
    .eq('auth_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }
  
  return data || [];
} 