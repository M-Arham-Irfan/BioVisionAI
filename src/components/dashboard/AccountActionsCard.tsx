import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AccountActionsCardProps {
  onDeleteAccount: () => Promise<void>;
  onLogout: () => Promise<void>;
}

const AccountActionsCard: React.FC<AccountActionsCardProps> = ({
  onDeleteAccount,
  onLogout,
}) => {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      await onDeleteAccount();
    } finally {
      setIsDeletingAccount(false);
      setIsAlertOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="text-white">Account Actions</CardTitle>
        <CardDescription>Actions related to your account</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex justify-between">
          <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={isDeletingAccount}
                className="bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20 hover:text-red-300 hover:border-red-500/50"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-800 text-gray-100">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  This action cannot be undone. This will permanently delete your account
                  and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  className="bg-gray-700 hover:bg-gray-600 border-none"
                  disabled={isDeletingAccount}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="border-gray-700/50 bg-transparent text-gray-300 hover:bg-blue-700 hover:text-white hover:border-blue-600 transition-colors"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountActionsCard; 