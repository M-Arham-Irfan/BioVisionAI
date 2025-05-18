import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { clearAuthFlowState } from "@/lib/supabase";

const Register = () => {
  const navigate = useNavigate();
  const { signUp, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowRecoveryInfo(false);
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    try {
      // Clear any stale auth flow state before sign up
      clearAuthFlowState();
      
      await signUp(formData.email, formData.password, formData.name);
      
      // Show success message with clear next steps
      toast({
        title: "Registration Successful",
        description: "Please check your email to confirm your account",
      });
      
      // Set confirmation sent to true to show confirmation instructions
      setConfirmationSent(true);
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Handle different error types
      if (error.message?.includes("already registered") || 
          error.message?.includes("already exists") ||
          error.code === '23505') {
        setError("This email is already registered. Please log in instead.");
        setShowRecoveryInfo(true);
        
        toast({
          title: "Email Already Registered",
          description: "This email is already registered. Please log in instead.",
          variant: "destructive",
        });
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login', { state: { email: formData.email } });
        }, 3000);
      } else if (error.message?.includes("unexpected_failure") || error.status === 500) {
        setError("Server is experiencing issues. This could be because the account already exists or there's a database problem. Please try logging in instead or contact support if the issue persists.");
        setShowRecoveryInfo(true);
        
        toast({
          title: "Registration Issue",
          description: "There was a server issue with your registration. If you already created this account, try logging in instead.",
          variant: "destructive",
        });
      } else {
        setError(error.message || "Failed to create account");
        
        toast({
          title: "Registration Failed",
          description: error.message || "Failed to create account",
          variant: "destructive",
        });
      }
    }
  };

  // Component for displaying recovery instructions
  const RecoveryInstructions = () => {
    if (!showRecoveryInfo) return null;
    
    return (
      <div className="mt-4 mb-2">
        <Alert className="bg-blue-900/20 border-blue-800 text-blue-400">
          <Info className="h-4 w-4" />
          <AlertTitle>What to do next?</AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="try-login">
                  <AccordionTrigger className="text-sm text-blue-400 hover:text-blue-300">
                    Try logging in
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-400">
                    <p>If you've previously registered or the account was created despite the error:</p>
                    <Button 
                      variant="link" 
                      className="text-blue-400 p-0 h-auto mt-1"
                      onClick={() => navigate("/login")}
                    >
                      Go to login page <CheckCircle2 className="ml-1 h-3 w-3" />
                    </Button>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="use-different-email">
                  <AccordionTrigger className="text-sm text-blue-400 hover:text-blue-300">
                    Use a different email
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-400">
                    If this email is already registered or causing issues, try registering with a different email address.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="contact-support">
                  <AccordionTrigger className="text-sm text-blue-400 hover:text-blue-300">
                    Contact support
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-400">
                    If you continue to experience issues, please contact our support team at <span className="text-blue-400">support@biovision-health.com</span>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  };
  
  // Render confirmation instructions if registration was successful
  if (confirmationSent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-900">
        <div className="w-full max-w-md">
          <Card className="border-gray-800 bg-gray-850">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-white">Check Your Email</CardTitle>
              <CardDescription className="text-gray-400">
                We've sent a confirmation link to your email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="mb-4 bg-blue-900/20 border-blue-800 text-blue-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Almost there!</AlertTitle>
                <AlertDescription>
                  We've sent a confirmation email to <span className="font-medium">{formData.email}</span>. 
                  Please check your inbox and click the confirmation link to activate your account.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4 text-gray-300">
                <h3 className="font-medium">What to do next:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the confirmation link in the email</li>
                  <li>After confirmation, you'll be able to sign in</li>
                </ol>
                
                <p className="text-sm text-gray-400 mt-4">
                  Didn't receive an email? Check your spam folder or try again in a few minutes.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Go to Login
              </Button>
              <Button 
                onClick={() => setConfirmationSent(false)} 
                variant="outline"
                className="w-full bg-transparent border-gray-700 text-white hover:bg-gray-800  hover:text-white"
              >
                Back to Registration
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-white">Create an Account</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your information to create an account
            </CardDescription>
          </CardHeader>
          <CardContent>
              {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Recovery instructions */}
              <RecoveryInstructions />
              
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Full Name
                </Label>
                  <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">
                    <User className="h-4 w-4" />
                  </span>
                    <Input
                      id="name"
                    name="name"
                      type="text"
                      placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>
                </div>
                
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email
                </Label>
                  <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">
                    <Mail className="h-4 w-4" />
                  </span>
                    <Input
                      id="email"
                    name="email"
                      type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>
                </div>
                
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                    <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">
                    <Lock className="h-4 w-4" />
                  </span>
                      <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                    required
                      />
                    </div>
                  </div>
                  
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">
                  Confirm Password
                </Label>
                    <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                </div>
                
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
                </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-400">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-500 hover:text-blue-400">
                Sign in
              </Link>
            </div>
            <div className="text-center text-xs text-gray-500">
              By creating an account, you agree to our 
              <Link to="/terms" className="text-blue-500 hover:text-blue-400 mx-1">
                Terms of Service
              </Link>
              and
              <Link to="/privacy" className="text-blue-500 hover:text-blue-400 ml-1">
                Privacy Policy
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
