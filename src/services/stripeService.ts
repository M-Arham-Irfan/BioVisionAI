import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/lib/supabase';

// Use Stripe test mode with test API keys
// The publishable key should start with pk_test_
// Create a properly configured stripePromise that handles loading errors
const getStripePromise = () => {
  const stripeApiKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_sample';
  
  // Ensure we're loading Stripe correctly
  const stripePromise = loadStripe(stripeApiKey)
    .catch(err => {
      console.error('Failed to initialize Stripe:', err);
      return null;
    });
    
  return stripePromise;
};

// Lazy-load Stripe only when needed
const stripePromise = getStripePromise();

export interface SubscriptionPlan {
  plan_id: number;
  name: string;
  stripe_price_id: string;
  stripe_product_id: string;
  price_usd: number;
  billing_interval: string;
  max_scans_per_day: number;
  features: any;
}

export const stripeService = {
  // Get all subscription plans from the database
  getSubscriptionPlans: async (): Promise<SubscriptionPlan[]> => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_usd', { ascending: true });
      
      if (error) throw error;
      return data as SubscriptionPlan[];
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      // Fallback to empty array if database fetch fails
      return [];
    }
  },

  // Create a checkout session for subscription using Stripe test mode
  createCheckoutSession: async (priceId: string, customerId?: string) => {
    try {
      // First try to use the Supabase Edge Function
      try {
        console.log(`Creating checkout session for priceId: ${priceId}${customerId ? ', customerId: ' + customerId : ''}`);
        
        // Current origin URL for success and cancel redirects
        const origin = window.location.origin;
        console.log(`Using origin: ${origin}`);
        
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: {
            priceId,  // Make sure parameter names match the server-side expectations
            customerId,
            successUrl: `${origin}/profile?tab=billing&checkout=success`,
            cancelUrl: `${origin}/pricing?checkout=cancel`,
            mode: 'test' // Indicate test mode to the function
          },
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw new Error(`Edge function error: ${error.message || 'Unknown error'}`);
        }
        
        if (!data || !data.sessionId) {
          console.error('Invalid response from checkout session function:', data);
          throw new Error('Invalid response from checkout session function');
        }
        
        // Redirect to Stripe checkout
        console.log('Redirecting to Stripe checkout page for session:', data.sessionId);
        
        // Load Stripe and redirect
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe failed to load');
        
        const { error: redirectError } = await stripe.redirectToCheckout({
          sessionId: data.sessionId
        });
        
        if (redirectError) {
          throw new Error(`Redirect error: ${redirectError.message}`);
        }
        
        return data;
      } catch (corsError) {
        console.warn('Edge function error, falling back to direct checkout:', corsError);
        
        // As a fallback, we'll use the Stripe frontend SDK to create a checkout session
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe failed to load');
        
        const origin = window.location.origin;

        // Since we can't create a session on the client side due to security,
        // we'll use the redirectToCheckout with price ID directly (Stripe supports this)
        const checkoutOptions = {
          lineItems: [{ price: priceId, quantity: 1 }],
          mode: 'subscription' as const,
          successUrl: `${origin}/profile?tab=billing&checkout=success`,
          cancelUrl: `${origin}/pricing?checkout=cancel`,
        };
        
        // Add customer if available
        if (customerId) {
          Object.assign(checkoutOptions, { customer: customerId });
        }

        // Redirect to Stripe Checkout
        const { error } = await stripe.redirectToCheckout(checkoutOptions);
        
        if (error) throw new Error(`Stripe checkout error: ${error.message}`);
        
        // This won't be reached since redirectToCheckout will navigate away from the page
        return { sessionId: 'redirect-in-progress' };
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  },

  // Create a customer portal session for managing subscription
  createCustomerPortalSession: async (customerId: string) => {
    try {
      console.log(`Creating customer portal session for customerId: ${customerId}`);
      
      const origin = window.location.origin;
      
      const { data, error } = await supabase.functions.invoke('create-customer-portal-session', {
        body: {
          customerId,  // Make sure parameter names match the server-side expectations
          returnUrl: `${origin}/profile?tab=billing`,
          mode: 'test' // Indicate test mode to the function
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw error;
    }
  },

  // Handle subscription checkout with Stripe test mode
  handleSubscriptionCheckout: async (priceId: string) => {
    try {
      // Basic validation
      if (!priceId) {
        throw new Error('Price ID is required');
      }
      
      // Validate price ID format for Stripe
      // Stripe price IDs typically start with 'price_'
      if (!priceId.startsWith('price_')) {
        console.warn(`Warning: Price ID format may be incorrect: "${priceId}". Proceeding anyway.`);
      }
      
      console.log(`Handling subscription checkout for priceId: ${priceId}`);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be logged in to subscribe');
      }

      // Get user's Stripe customer ID if it exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('auth_id', user.id)
        .single();

      if (userError) throw userError;

      console.log(`User data:`, userData);
      
      // Try to create checkout session - this will handle both
      // the Supabase Edge Function and the direct Stripe fallback
      const result = await stripeService.createCheckoutSession(
        priceId,
        userData?.stripe_customer_id
      );
      
      console.log('Checkout session created:', result);
      
      // The createCheckoutSession method will redirect the user to Stripe checkout
      // or throw an error if something goes wrong

    } catch (error) {
      console.error('Error handling subscription checkout:', error);
      throw error;
    }
  },

  // Get current user's subscription
  getCurrentSubscription: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be logged in to get subscription');
      }

      // Get user's subscription from the database
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plan_id(*)
        `)
        .eq('auth_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return null; // Return null instead of throwing to prevent UI errors
    }
  },

  // Open customer portal for managing subscription
  openCustomerPortal: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be logged in to manage subscription');
      }

      // Get user's Stripe customer ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('auth_id', user.id)
        .single();

      if (userError) throw userError;

      if (!userData?.stripe_customer_id) {
        // Instead of throwing an error, return a specific object indicating the user needs to create a subscription first
        return { 
          error: true, 
          code: 'no_customer_id', 
          message: 'No Stripe customer ID found. Please subscribe to a plan first.' 
        };
      }

      // Create customer portal session
      const { url } = await stripeService.createCustomerPortalSession(
        userData.stripe_customer_id
      );

      // Redirect to customer portal
      window.location.href = url;
      return { success: true };
    } catch (error) {
      console.error('Error opening customer portal:', error);
      throw error;
    }
  }
};

export default stripeService; 