import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.8.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Allow multiple origins including production
const allowedOrigins = [
  'http://localhost:8080', 
  'http://localhost:8081',
  'https://biovision-health-ai.vercel.app',
  'https://biovision-health.com'
];

// Define test API key - IMPORTANT: In production, this should be set as an environment variable
// To set the secret in Supabase: supabase secrets set STRIPE_TEST_SECRET_KEY=sk_test_your_key
const STRIPE_TEST_SECRET_KEY = Deno.env.get('STRIPE_TEST_SECRET_KEY') || 'sk_test_51RLp4sRCD7pqf33q9xLASytUPKnSY0jsf0zdWrwXxm6Nu2UCOmZ9HGsLFFUdNjHRuZIJqsg1s3OfUgxKED3vBfk7007ywkKgNk';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  // Get origin from request
  const origin = req.headers.get('origin');
  
  // Set CORS headers based on origin
  const responseHeaders = { ...corsHeaders };
  if (origin) {
    // Check if origin is in allowed list or use * for development
    if (allowedOrigins.includes(origin)) {
      responseHeaders['Access-Control-Allow-Origin'] = origin;
    } else {
      // For any other origin, use the default * (or restrict if needed)
      responseHeaders['Access-Control-Allow-Origin'] = '*';
    }
  }
  
  try {
    // Log request headers for debugging
    console.log('Request headers:', JSON.stringify(Object.fromEntries(req.headers)));
    
    const body = await req.json()
    const { customerId, returnUrl, mode } = body
    
    // Log request data for debugging
    console.log('Request body:', JSON.stringify(body))
    
    // Validate required parameters
    if (!customerId) {
      console.error('Missing required parameter: customerId')
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: customerId' }),
        {
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (!returnUrl) {
      console.error('Missing required parameter: returnUrl')
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: returnUrl' }),
        {
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }
    
    // Create a Supabase client
    let supabase;
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase credentials not found in environment variables');
      } else {
        supabase = createClient(supabaseUrl, supabaseKey);
      }
    } catch (error) {
      console.error('Error creating Supabase client:', error);
      // Continue without Supabase client - not critical for customer portal
    }
    
    // Initialize Stripe (use the test key if in test mode)
    let stripeKey;
    
    try {
      if (mode === 'test') {
        // First try to get from environment variable
        stripeKey = Deno.env.get('STRIPE_TEST_SECRET_KEY');
        
        // If not found in environment, use hardcoded test key
        if (!stripeKey) {
          console.warn('STRIPE_TEST_SECRET_KEY not found in environment, using hardcoded test key');
          stripeKey = STRIPE_TEST_SECRET_KEY;
        }
        
        console.log('Using test mode with test secret key');
      } else {
        stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        console.log('Using production mode with live secret key');
      }
    } catch (error) {
      console.error('Error retrieving Stripe key from environment:', error);
      // Fallback to hardcoded test key
      stripeKey = STRIPE_TEST_SECRET_KEY;
    }
    
    if (!stripeKey) {
      console.error('Missing Stripe secret key, falling back to test key');
      stripeKey = STRIPE_TEST_SECRET_KEY;
    }
    
    // Initialize Stripe with API key
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-08-16',
    });
    
    // Create customer portal session
    try {
      console.log('Creating customer portal session for customer:', customerId)
      
      // Validate customer ID format
      if (!customerId || !customerId.startsWith('cus_')) {
        console.error('Invalid customer ID format:', customerId);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid customer ID format', 
            message: 'Customer ID must start with "cus_"',
            providedId: customerId
          }),
          {
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      // Create portal session with Stripe
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        });
        
        console.log('Customer portal session created successfully with URL:', session.url)
        
        // Return the URL
        return new Response(
          JSON.stringify({ url: session.url }),
          {
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (stripeError) {
        console.error('Stripe API error:', stripeError)
        
        // Check for specific Stripe error types and provide better error messages
        let errorMessage = 'Stripe API error';
        let errorDetails = {};
        
        if (stripeError.type === 'StripeInvalidRequestError') {
          if (stripeError.message.includes('No such customer')) {
            errorMessage = 'Customer not found in Stripe';
            errorDetails = { code: 'customer_not_found' };
          } else if (stripeError.message.includes('Invalid customer')) {
            errorMessage = 'Invalid customer ID format';
            errorDetails = { code: 'invalid_customer' };
          }
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Stripe API error',
            message: stripeError.message || errorMessage,
            type: stripeError.type,
            details: { ...errorDetails, ...stripeError }
          }),
          {
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    } catch (error) {
      console.error('Error processing request:', error)
      
      return new Response(
        JSON.stringify({ 
          error: 'Error processing request',
          message: error.message 
        }),
        {
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Error processing request',
        message: error.message 
      }),
      {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 