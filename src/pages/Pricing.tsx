import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import stripeService, { SubscriptionPlan } from "@/services/stripeService";
import { useAuth } from "@/contexts/AuthContext";

interface PricingPlanDisplay {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  mostPopular?: boolean;
  buttonText: string;
  stripePriceId?: string;
  isFallback?: boolean;
}

const Pricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<PricingPlanDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChangingInterval, setIsChangingInterval] = useState(false); // New state for interval change
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const prevBillingIntervalRef = useRef<"monthly" | "yearly">("monthly");
  
  // Change to a specific plan ID to track which button is loading
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  // Check for query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const checkoutStatus = queryParams.get("checkout");

    if (checkoutStatus === "success") {
      toast({
        title: "Subscription activated!",
        description: "Your subscription has been successfully activated.",
        variant: "default",
        duration: 5000,
      });
    } else if (checkoutStatus === "cancel") {
      toast({
        title: "Checkout canceled",
        description: "You have canceled the checkout process.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [location]);

  // Fetch current subscription when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("User authenticated, fetching subscription...");
      stripeService.getCurrentSubscription()
        .then(subscription => {
          console.log("Fetched subscription:", subscription);
          setCurrentSubscription(subscription);
        })
        .catch(error => {
          console.error("Error fetching subscription:", error);
          setCurrentSubscription(null); 
          // Optional: Show toast if subscription fetch fails?
          // toast({ title: "Could not load subscription details", variant: "destructive" });
        });
    } else {
      console.log("User not authenticated, clearing subscription.");
      // Clear subscription if user logs out or is not authenticated initially
      setCurrentSubscription(null);
    }
  }, [isAuthenticated, user]);

  // Fetch plans from the database
  useEffect(() => {
    const fetchPlans = async () => {
      // Only set isChangingInterval to true if this is a billing interval change, not initial load
      // We can detect this by checking if loading is already false (meaning we've loaded once)
      const isIntervalChange = !loading && billingInterval !== prevBillingIntervalRef.current;
      
      if (isIntervalChange) {
        setIsChangingInterval(true);
      }
      
      try {
        const dbPlans = await stripeService.getSubscriptionPlans();
        
        // Transform database plans into display plans
        const displayPlans = dbPlans
          .filter(plan => plan.billing_interval === billingInterval || plan.billing_interval === 'free')
          .map((plan) => {
            // Extract features from JSON if available
            const features = plan.features ? 
              (typeof plan.features === 'string' ? 
                JSON.parse(plan.features) : plan.features).features || [] 
              : [];
            
            // Determine button text and most popular flag
            let buttonText = "Subscribe";
            let mostPopular = false;
            
            if (plan.name.toLowerCase() === "free") {
              buttonText = "Get started";
            } else if (plan.name.toLowerCase() === "pro") {
              mostPopular = true;
            }
            
            // Check if user is already subscribed to this plan
            if (currentSubscription && currentSubscription.plan_id === plan.plan_id) {
              buttonText = "Current plan";
            }
            
            return {
              id: plan.plan_id.toString(),
              name: plan.name,
              price: plan.price_usd,
              description: `For ${plan.name.toLowerCase() === "free" ? "individuals" : plan.name.toLowerCase() === "pro" ? "professionals" : "organizations"} ${plan.name.toLowerCase() === "free" ? "getting started" : "with advanced requirements"}`,
              features,
              mostPopular,
              buttonText,
              stripePriceId: plan.stripe_price_id,
              isFallback: false
            };
          });
        
        // Sort plans by price
        displayPlans.sort((a, b) => a.price - b.price);
        
        setPlans(displayPlans);
      } catch (error) {
        console.error("Error fetching plans:", error);
        toast({
          title: "Error Loading Plans",
          description: "Failed to load subscription plans. Displaying default options. Some actions may be unavailable.",
          variant: "destructive",
          duration: 7000,
        });
        
        // Fallback to hardcoded plans
        setPlans([
          {
            id: "free",
            name: "Free",
            price: 0,
            description: "For individuals getting started with X-ray analysis",
            features: [
              "5 scans per month",
              "Basic disease detection",
              "Standard reporting",
              "30-day history",
              "Email support"
            ],
            buttonText: "Get started",
            isFallback: true,
          },
          {
            id: "pro",
            name: "Pro",
            price: billingInterval === "monthly" ? 12 : 99,
            description: "For healthcare professionals with moderate needs",
            features: [
              "300 scans per month",
              "Advanced disease detection",
              "Detailed reporting",
              "90-day history",
              "Priority email support",
              "Export reports as PDF"
            ],
            mostPopular: true,
            buttonText: "Subscribe",
            isFallback: true,
          },
          {
            id: "enterprise",
            name: "Enterprise",
            price: billingInterval === "monthly" ? 49 : 399,
            description: "For organizations with advanced requirements",
            features: [
              "Unlimited scans",
              "Advanced disease detection",
              "Comprehensive reporting",
              "Unlimited history",
              "24/7 phone & email support",
              "Advanced analytics",
              "Custom integrations",
              "API access"
            ],
            buttonText: "Subscribe",
            isFallback: true,
          }
        ]);
      } finally {
        setLoading(false);
        // Update the ref with current billing interval
        prevBillingIntervalRef.current = billingInterval;
        
        // Only clear interval changing state if it was set
        if (isIntervalChange) {
          setTimeout(() => {
            setIsChangingInterval(false);
          }, 300);
        }
      }
    };
    
    fetchPlans();
  }, [billingInterval, currentSubscription]);

  // Handler for billing interval toggle with proper state management
  const handleBillingIntervalChange = () => {
    setIsChangingInterval(true); // Show loading state first
    setBillingInterval(billingInterval === "monthly" ? "yearly" : "monthly");
  };

  const handlePlanSelection = async (plan: PricingPlanDisplay) => {
    // Set loading only for this specific plan button
    setLoadingPlanId(plan.id);
    
    // Handle free plan
    if (plan.price === 0) {
      if (!isAuthenticated) {
        navigate("/register");
      } else {
        // If logged in user clicks Free, assume they are already on it (or can manage via portal if upgrade needed?)
        // Let's check if they have *any* subscription first
        if (currentSubscription) {
             toast({
               title: "Manage Subscription",
               description: "Please manage your current subscription via the customer portal.",
               variant: "default",
             });
             
             // Now we open the portal immediately for convenience 
             try {
                await stripeService.openCustomerPortal();
             } catch (error) {
                console.error("Failed to open customer portal:", error);
                toast({
                  title: "Portal Access Error",
                  description: "Could not open the customer portal. Please try again later.",
                  variant: "destructive"
                });
             }
        } else {
             toast({
               title: "Already on Free Plan",
               description: "You are currently on the free plan.",
               variant: "default",
             });
        }
      }
      setLoadingPlanId(null);
      return;
    }
    
    // Check if this is the current plan
    if (currentSubscription && currentSubscription.plan_id.toString() === plan.id) {
      toast({
        title: "Current Plan",
        description: "You are already subscribed to this plan.",
        variant: "default",
      });
      setLoadingPlanId(null);
      return;
    }
    
    // Check if using HTTPS for Stripe (with exception for localhost)
    if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      toast({
        title: "Secure Connection Required",
        description: "For security reasons, Stripe requires HTTPS. Please use a secure connection.",
        variant: "destructive",
        duration: 5000,
      });
      setLoadingPlanId(null);
      return;
    }
    
    // Handle paid plans - redirect to login if not logged in
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in or register to subscribe to a plan.",
        variant: "default",
      });
      // Send to login, but maybe register is better if they don't have an account?
      // Sending to login allows them to login if they have an account OR navigate to register from there
      navigate("/login", { state: { from: "/pricing" } });
      setLoadingPlanId(null);
      return;
    }
    
    // User is authenticated, proceed with Stripe
    try {
      // If user has an active subscription, redirect to customer portal to manage
      if (currentSubscription && currentSubscription.status === 'active') { 
        console.log("User has active subscription, opening customer portal...");
        try {
          const result = await stripeService.openCustomerPortal();
          
          // If we get a specific error about no customer ID, we should proceed to checkout instead
          if (result && result.error && result.code === 'no_customer_id') {
            console.log("No customer ID found, proceeding with checkout instead");
            // Continue to checkout below instead of returning
          } else {
            // Portal opened successfully or redirecting
            // No need to do anything else as the page will redirect
            return;
          }
        } catch (portalError: any) {
          console.error("Customer portal error:", portalError);
          toast({ 
            title: "Portal Error", 
            description: portalError.message || "Could not open customer portal. Proceeding with checkout.", 
            variant: "destructive"
          });
          // Continue to checkout below instead of returning
        }
      }
      
      // No active subscription OR failed to open portal
      // Proceed to checkout for the selected plan
      console.log(`User initiating checkout for plan: ${plan.name} (${plan.stripePriceId})`);
      if (!plan.stripePriceId) {
        throw new Error("Stripe Price ID is missing for this plan.");
      }
      await stripeService.createCheckoutSession(plan.stripePriceId);
      // Redirect happens via Stripe, so we don't need to clear loading state
      
    } catch (error: any) {
      console.error("Stripe action error:", error);
      toast({
        title: "Subscription Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
      setLoadingPlanId(null);
    }
  };

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: 0.1 },
  };

  // Combined loading state for disabling buttons
  const isPageLoading = loading || authIsLoading;
  
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-950 via-blue-950 to-gray-950">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNhYWEiIHN0cm9rZS13aWR0aD0iMC4yIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-5"></div>
        
        {/* Animated circles */}
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-800/10 rounded-full filter blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-800/10 rounded-full filter blur-3xl"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center px-4 py-1 rounded-full bg-blue-950 text-blue-300 text-sm font-medium mb-6"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Flexible Plans for Every Need
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-6 text-white"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500">
              Choose Your Plan
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-blue-200 max-w-2xl mx-auto mb-10"
          >
            Select the perfect plan for your needs and unlock the full potential of our AI-powered chest X-ray analysis.
          </motion.p>

          {/* Billing toggle */}
          <div className="flex justify-center items-center space-x-4 mb-12">
            <span className={`text-sm ${billingInterval === "monthly" ? "text-white font-medium" : "text-gray-400"}`}>Monthly</span>
            <button
              onClick={handleBillingIntervalChange}
              className="relative inline-flex h-7 w-14 items-center rounded-full bg-gray-900 border border-gray-700 p-1 transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-opacity-50"
              disabled={isPageLoading || isChangingInterval}
            >
              <div
                className={`absolute h-5 w-5 rounded-full bg-blue-800 shadow-lg transform transition-transform duration-300 ${
                  billingInterval === "yearly" ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-sm ${billingInterval === "yearly" ? "text-white font-medium" : "text-gray-400"}`}>
              Yearly
              <span className="ml-1.5 rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-200">Save 20%</span>
            </span>
          </div>

          {/* Loading state */}
          {isPageLoading || isChangingInterval ? (
            <div className="text-center py-20">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-blue-300">
                {isChangingInterval 
                  ? `Updating to ${billingInterval} plans...` 
                  : "Loading plans..."}
              </p>
            </div>
          ) : (
            /* Pricing cards */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <motion.div
                  key={plan.id}
                  variants={containerVariants}
                  initial="initial"
                  animate="animate"
                  className={`relative rounded-2xl overflow-hidden ${
                    plan.mostPopular 
                      ? 'border-2 border-blue-700 bg-gray-900' 
                      : 'border-2 border-gray-800 bg-gray-900'
                  }`}
                >
                  {plan.mostPopular && (
                    <div className="absolute top-0 left-0 right-0 bg-blue-800 text-center py-1.5 text-xs font-semibold text-white">
                      MOST POPULAR
                    </div>
                  )}
                  
                  <div className={`px-6 pt-10 pb-6`}>
                    <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                    
                    <div className="flex items-baseline mb-6">
                      <span className="text-5xl font-bold text-white">${plan.price}</span>
                      {plan.price > 0 && (
                        <span className="text-gray-400 ml-2">/{billingInterval === "monthly" ? "month" : "year"}</span>
                      )}
                    </div>

                    <Button 
                      className={`w-full py-6 mb-6 ${
                        plan.mostPopular 
                          ? 'bg-blue-900 hover:bg-blue-800 text-white border-0' 
                          : 'bg-gray-900 hover:bg-gray-800 text-white border border-gray-700'
                      }`}
                      onClick={() => handlePlanSelection(plan)}
                      disabled={loadingPlanId === plan.id || (plan.buttonText === "Current plan") || (plan.isFallback && plan.price > 0 && !plan.stripePriceId)}
                    >
                      {loadingPlanId === plan.id ? (
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null} 
                      {plan.isFallback && plan.price > 0 && !plan.stripePriceId ? "Unavailable (Try Later)" : plan.buttonText}
                    </Button>

                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex text-sm">
                          <Check className="h-5 w-5 mr-3 text-blue-500 shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pricing; 