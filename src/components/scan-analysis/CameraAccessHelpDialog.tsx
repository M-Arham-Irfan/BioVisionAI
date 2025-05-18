import React from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CameraAccessHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CameraAccessHelpDialog: React.FC<CameraAccessHelpDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Camera Access Issues?</DialogTitle>
          <DialogDescription className="text-gray-400">
            If you're having trouble accessing the camera, try these steps.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 p-2">
          <div className="rounded-lg bg-gray-800 p-4">
            <h4 className="text-sm font-medium mb-2">Step 1: Check Browser Permissions</h4>
            <p className="text-gray-400 text-sm">
              Look for a camera icon in your browser's address bar (usually on the left or right). Click it and ensure this site is allowed access.
            </p>
          </div>
          <div className="rounded-lg bg-gray-800 p-4">
            <h4 className="text-sm font-medium mb-2">Step 2: Check System Permissions</h4>
            <p className="text-gray-400 text-sm">
              Make sure your operating system (Windows, macOS, etc.) allows your browser to access the camera in its privacy settings.
            </p>
          </div>
          <div className="rounded-lg bg-gray-800 p-4">
            <h4 className="text-sm font-medium mb-2">Step 3: Close Other Apps</h4>
            <p className="text-gray-400 text-sm">
              Ensure no other application (like Zoom, Skype, etc.) is currently using the camera.
            </p>
          </div>
          <div className="rounded-lg bg-gray-800 p-4">
            <h4 className="text-sm font-medium mb-2">Step 4: Refresh Page</h4>
            <p className="text-gray-400 text-sm">
              After checking permissions, refresh this page.
            </p>
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CameraAccessHelpDialog; 