import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.8.0'

// Check for test mode header
const isTestMode = (headers: Headers) => headers.get('stripe-is-test-mode') === 'true';

// Initialize Stripe with the appropriate key
const getStripe = (headers: Headers) => {
  const stripeKey = isTestMode(headers) && Deno.env.get('STRIPE_TEST_SECRET_KEY')
    ? Deno.env.get('STRIPE_TEST_SECRET_KEY')
    : Deno.env.get('STRIPE_SECRET_KEY');
    
  return new Stripe(stripeKey as string, {
    apiVersion: '2023-08-16',
  });
};

// Get the appropriate webhook signing secret
const getEndpointSecret = (headers: Headers) => {
  return isTestMode(headers) && Deno.env.get('STRIPE_TEST_WEBHOOK_SIGNING_SECRET')
    ? Deno.env.get('STRIPE_TEST_WEBHOOK_SIGNING_SECRET')
    : Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Webhook signature missing', { status: 400 })
  }

  try {
    const body = await req.text()
    
    // Initialize Stripe with appropriate key based on mode
    const stripe = getStripe(req.headers);
    const endpointSecret = getEndpointSecret(req.headers);
    
    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      endpointSecret as string
    )
    
    // Handle the event
    switch (event.type) {
      // Handle checkout session completed
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          // Get subscription details 
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const priceId = subscription.items.data[0].price.id
          const customerId = session.customer as string
          const subscriptionId = subscription.id
          const status = subscription.status
          const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString()
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
          
          // Get plan ID from price ID
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('plan_id')
            .eq('stripe_price_id', priceId)
            .single()
          
          if (!planData) {
            throw new Error(`No plan found for price ID: ${priceId}`)
          }
          
          // Update user with customer ID
          await supabase
            .from('users')
            .update({ 
              stripe_customer_id: customerId,
              plan_id: planData.plan_id
            })
            .eq('stripe_customer_id', customerId)
          
          // Create or update subscription record
          const { data: userData } = await supabase
            .from('users')
            .select('auth_id')
            .eq('stripe_customer_id', customerId)
            .single()
          
          if (!userData) {
            throw new Error(`No user found for customer ID: ${customerId}`)
          }
          
          // Add or update subscription
          const { data: existingSubscription } = await supabase
            .from('subscriptions')
            .select('subscription_id')
            .eq('auth_id', userData.auth_id)
            .eq('status', 'active')
            .single()
          
          if (existingSubscription) {
            // Update existing subscription
            await supabase
              .from('subscriptions')
              .update({
                plan_id: planData.plan_id,
                stripe_subscription_id: subscriptionId,
                status,
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
                cancel_at_period_end: subscription.cancel_at_period_end,
                updated_at: new Date().toISOString()
              })
              .eq('subscription_id', existingSubscription.subscription_id)
          } else {
            // Create new subscription
            await supabase
              .from('subscriptions')
              .insert({
                auth_id: userData.auth_id,
                plan_id: planData.plan_id,
                stripe_subscription_id: subscriptionId,
                status,
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
                cancel_at_period_end: subscription.cancel_at_period_end
              })
          }
        }
        break
      }
      
      // Handle subscription updated
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId = subscription.items.data[0].price.id
        const customerId = subscription.customer as string
        const subscriptionId = subscription.id
        const status = subscription.status
        const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString()
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
        
        // Get plan ID from price ID
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('plan_id')
          .eq('stripe_price_id', priceId)
          .single()
        
        if (!planData) {
          throw new Error(`No plan found for price ID: ${priceId}`)
        }
        
        // Update the subscription in the database
        await supabase
          .from('subscriptions')
          .update({
            plan_id: planData.plan_id,
            status,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId)
        
        break
      }
      
      // Handle subscription canceled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id
        
        // Update the subscription status in the database
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId)
        
        break
      }
      
      // Handle payment succeeded
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription && invoice.customer) {
          const customerId = invoice.customer as string
          const subscriptionId = invoice.subscription as string
          const paymentIntentId = invoice.payment_intent as string
          
          // Get user ID from customer ID
          const { data: userData } = await supabase
            .from('users')
            .select('auth_id')
            .eq('stripe_customer_id', customerId)
            .single()
          
          if (!userData) {
            throw new Error(`No user found for customer ID: ${customerId}`)
          }
          
          // Get subscription ID from database
          const { data: subscriptionData } = await supabase
            .from('subscriptions')
            .select('subscription_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()
          
          if (!subscriptionData) {
            throw new Error(`No subscription found for Stripe subscription ID: ${subscriptionId}`)
          }
          
          // Record payment in payment history
          await supabase
            .from('payment_history')
            .insert({
              auth_id: userData.auth_id,
              subscription_id: subscriptionData.subscription_id,
              stripe_payment_intent_id: paymentIntentId,
              amount_usd: invoice.amount_paid / 100, // Convert from cents
              status: 'succeeded',
              payment_method: 'card',
              receipt_url: invoice.hosted_invoice_url
            })
        }
        
        break
      }
      
      // Handle payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription && invoice.customer) {
          const customerId = invoice.customer as string
          const subscriptionId = invoice.subscription as string
          const paymentIntentId = invoice.payment_intent as string
          
          // Get user ID from customer ID
          const { data: userData } = await supabase
            .from('users')
            .select('auth_id')
            .eq('stripe_customer_id', customerId)
            .single()
          
          if (!userData) {
            throw new Error(`No user found for customer ID: ${customerId}`)
          }
          
          // Get subscription ID from database
          const { data: subscriptionData } = await supabase
            .from('subscriptions')
            .select('subscription_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()
          
          if (!subscriptionData) {
            throw new Error(`No subscription found for Stripe subscription ID: ${subscriptionId}`)
          }
          
          // Record failed payment in payment history
          await supabase
            .from('payment_history')
            .insert({
              auth_id: userData.auth_id,
              subscription_id: subscriptionData.subscription_id,
              stripe_payment_intent_id: paymentIntentId,
              amount_usd: invoice.amount_due / 100, // Convert from cents
              status: 'failed',
              payment_method: 'card',
              receipt_url: invoice.hosted_invoice_url
            })
        }
        
        break
      }
    }
    
    // Return a successful response
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}) 