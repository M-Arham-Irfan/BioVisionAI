import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/contexts/AuthContext'; // Assuming User type is exported
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Mail, Save, UserRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getProfilePictureFromStorage, saveProfilePictureToStorage, fileToDataUrl } from "@/utils/profileUtils"; // Assuming these are correctly pathed
import { supabase } from '@/lib/supabase'; // For saving profile
import { invalidateUserProfileCache } from '@/hooks/useSupabaseData'; // Import the new function
import { useQueryClient } from '@tanstack/react-query'; // Import to get access to query client

interface ProfileInformationCardProps {
  authUser: User | null; // User object from useAuth
  onProfileUpdate?: () => void; // Optional: callback after profile is saved
}

interface ProfileData {
  name: string;
  email: string;
  profilePicture: string;
}

const ProfileInformationCard: React.FC<ProfileInformationCardProps> = ({ authUser, onProfileUpdate }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Get access to the query client
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    profilePicture: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const getInitials = useCallback((name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }, []);

  useEffect(() => {
    if (authUser) {
      const storedProfilePicture = getProfilePictureFromStorage();
      setProfileData({
        name: authUser.full_name || '',
        email: authUser.email || '',
        profilePicture: storedProfilePicture || '',
      });
    }
  }, [authUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await fileToDataUrl(file);
        setProfileData((prev) => ({
          ...prev,
          profilePicture: imageUrl,
        }));
        saveProfilePictureToStorage(imageUrl); // Save to localStorage immediately for preview
        toast({ title: "Profile picture updated", description: "Save changes to persist across sessions."});
      } catch (error) {
        console.error('Error processing profile picture:', error);
        toast({
          title: 'Error',
          description: 'Failed to process the image. Please try another one.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!authUser?.auth_id) {
        toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
        return;
    }
    
    // Validate inputs
    if (!profileData.name.trim()) {
      toast({ 
        title: "Validation Error", 
        description: "Name cannot be empty.", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // 1. Update user data in the database
      const dbUpdates: Partial<User> & { full_name?: string } = {
        full_name: profileData.name.trim()
      };

      // Save profile picture to localStorage
      if (profileData.profilePicture) {
        saveProfilePictureToStorage(profileData.profilePicture);
      }
      
      // Update user profile in database
      const { error: dbError } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('auth_id', authUser.auth_id);

      if (dbError) throw dbError;
      
      // 2. Also update the Supabase Auth user metadata to keep data in sync
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          full_name: profileData.name.trim()
        }
      });
      
      if (authError) {
        console.error('Error updating auth user:', authError);
        // Continue execution - database update was successful
      }
      
      // Explicitly invalidate the user profile cache to refresh data everywhere
      invalidateUserProfileCache(authUser.auth_id, queryClient);
      
      toast({ 
        title: 'Profile Saved', 
        description: 'Your profile information has been updated successfully.' 
      });
      
      setIsEditing(false);
      
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error Saving Profile',
        description: error.message || 'Could not update your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white">Profile Information</CardTitle>
            <CardDescription>View and update your personal details</CardDescription>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
              Edit Profile
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  // Reset changes if needed
                  if (authUser) {
                    const storedProfilePicture = getProfilePictureFromStorage();
                    setProfileData({
                        name: authUser.full_name || '',
                        email: authUser.email || '',
                        profilePicture: storedProfilePicture || '',
                    });
                  }
                }}
                className="border-gray-700 text-gray-400 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                {isSaving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profileData.profilePicture || undefined} alt="Profile Avatar" />
                <AvatarFallback className="bg-gray-700 text-white text-lg">
                  {getInitials(profileData.name)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <>
                  <Label
                    htmlFor="profile-picture-input"
                    className="absolute bottom-0 right-0 bg-gray-700 text-gray-300 rounded-full p-1 hover:bg-gray-600 cursor-pointer transition-colors duration-200"
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
                </>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{profileData.name || 'User Name'}</h3>
              <p className="text-sm text-gray-400">{profileData.email || 'user@example.com'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name" className="text-gray-400">
                Full Name
              </Label>
              <div className="flex items-center mt-1">
                <Input
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="bg-gray-800 border-gray-700 text-white focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-400">
                Email Address
              </Label>
              <div className="flex items-center mt-1">
                <Mail className="h-4 w-4 text-gray-500 mr-2" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  disabled // Email typically not editable from frontend directly for auth reasons
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileInformationCard; 