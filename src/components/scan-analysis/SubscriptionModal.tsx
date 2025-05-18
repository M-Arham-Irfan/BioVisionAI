import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate if navigation is handled here
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SubscriptionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean | null; // Use boolean | null to match useAuth type more closely
  onNavigate: (path: string) => void; // Callback for navigation
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
    isOpen, onOpenChange, isAuthenticated, onNavigate 
}) => {
  const title = isAuthenticated ? "Daily Limit Reached" : "Free Scan Limit Reached";
  const description = isAuthenticated 
    ? "You have reached your daily scan limit. You can upgrade your subscription to increase your daily limit."
    : "You have reached the limit of free scans available to guest users. Please create an account to continue using our service.";
  const buttonText = isAuthenticated ? "Upgrade Subscription" : "Create Account";
  const navigationPath = isAuthenticated ? "/pricing" : "/register";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-900/90 backdrop-blur-xl border border-blue-600/20 text-gray-100" closeOnOutsideClick={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="bg-blue-900/20 border-blue-400/40 text-blue-200 hover:bg-blue-800/40 hover:text-white backdrop-blur-md transition-all duration-300"
          >
            Close
          </Button>
          <Button
            onClick={() => onNavigate(navigationPath)}
            className="bg-blue-900/20 border border-blue-400/40 text-blue-200 hover:bg-blue-800/40 hover:text-white backdrop-blur-md transition-all duration-300"
          >
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal; 