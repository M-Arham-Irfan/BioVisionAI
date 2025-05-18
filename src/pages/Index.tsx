import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, User, AlertCircle } from "lucide-react";

// Import home components
import HeroSection from "@/components/home/HeroSection";
import StatsSection from "@/components/home/StatsSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import SponsorsSection from "@/components/home/SponsorsSection";
import CallToAction from "@/components/home/CallToAction";
import { useTotalSystemScans } from "@/hooks/useSupabaseData";
import { useCanPerformScan } from "@/hooks/useCanPerformScan";

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { count: scanCount, loading: scanCountLoading } = useTotalSystemScans();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { canScan, remainingScans, isLimited } = useCanPerformScan();

  const handleScanClick = () => {
    if (isAuthenticated) {
      navigate("/scan-analysis");
      return;
    }

    if (!canScan) {
      setShowLoginModal(true);
    } else {
      navigate("/scan-analysis");
    }
  };

  return (
    <div className="min-h-screen w-full">
      {/* Hero Section */}
      <HeroSection 
        scanCount={scanCount} 
        hasUsedFreeScan={isLimited && remainingScans !== 5}
        onScanClick={handleScanClick} 
      />
      
      {/* Stats Section */}
      <StatsSection />
      
      {/* Features Section */}
      <FeaturesSection />
      
      {/* Testimonials Section */}
      <TestimonialsSection />
      
      {/* Sponsors Section */}
      <SponsorsSection />
      
      {/* Call to Action */}
      <CallToAction 
        hasUsedFreeScan={isLimited && remainingScans !== 5}
        onScanClick={handleScanClick}
        scanCount={scanCount}
        loading={scanCountLoading} 
      />

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-gray-900 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Sign In Required</DialogTitle>
            <DialogDescription className="text-gray-400">
              You've reached your limit of 5 free scans per month. Please sign in or create an account to continue analyzing X-rays.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-yellow-200">
                Monthly guest limit: 5 scans. Create an account for unlimited access or subscribe to one of our premium plans.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLoginModal(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowLoginModal(false);
                navigate("/login");
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <User className="mr-2 h-4 w-4" />
              Sign In / Sign Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
