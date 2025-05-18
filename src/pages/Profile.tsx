import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { UserRound, Lock, CreditCard, Bell, Trash2, LogOut, Camera, Heart } from "lucide-react";
import { useUserSubscription } from "@/hooks/useSupabaseData";
import AccountSubscription from "@/components/AccountSubscription";
import { 
  getProfilePictureFromStorage, 
  saveProfilePictureToStorage,
  fileToDataUrl
} from "@/utils/profileUtils";

const Profile = () => {
  const { user, signOut, isLoading } = useAuth();
  const { subscription, loading: loadingSubscription } = useUserSubscription(user?.auth_id || null);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [newProfilePicture, setNewProfilePicture] = useState<File | null>(null);
  
  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
      return;
    }

    if (user) {
      setName(user.full_name || "");
      setEmail(user.email || "");
      
      // Load profile picture from localStorage if it exists
      const storedProfilePicture = getProfilePictureFromStorage();
      if (storedProfilePicture) {
        setProfilePicture(storedProfilePicture);
      }
    }
  }, [user, navigate, isLoading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!user?.auth_id) return;
    
    try {
      setIsUpdating(true);
      
      await updateUserProfile(user.auth_id, {
        full_name: name,
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Profile update failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        // This would need to implement account deletion logic
        await signOut(); 
        navigate("/register");
      } catch (error: any) {
        console.error("Account deletion failed:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete account. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error: any) {
      console.error("Logout failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewProfilePicture(file);
      
      try {
        // Convert file to data URL and store
        const imageUrl = await fileToDataUrl(file);
        setProfilePicture(imageUrl);
        saveProfilePictureToStorage(imageUrl);
      } catch (error) {
        console.error("Error processing profile picture:", error);
        toast({
          title: "Error",
          description: "Failed to process the image. Please try another one.",
          variant: "destructive",
        });
      }
    }
  };

  if (!user) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-gray-600">Manage your profile information and settings.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <UserRound className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscription
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt="Profile"
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <UserRound className="h-10 w-10 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <Label
                      htmlFor="profile-picture-input"
                      className="absolute bottom-0 right-0 bg-gray-200 text-gray-700 rounded-full p-1 hover:bg-gray-300 cursor-pointer transition-colors duration-200"
                    >
                      <Camera className="h-4 w-4" />
                    </Label>
                    <Input
                      type="file"
                      id="profile-picture-input"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                      accept="image/*"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{name}</h3>
                    <p className="text-sm text-gray-500">{email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      type="email"
                      id="email"
                      value={email}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                </div>
                
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
              <CardDescription>Manage your subscription and billing details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <AccountSubscription />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="border-t pt-8 flex justify-between items-center">
        <Button variant="destructive" onClick={handleDeleteAccount}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Account
        </Button>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Profile;
