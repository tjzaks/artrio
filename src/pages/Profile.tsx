import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Save, User, Camera, Upload, Check, X, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { cleanErrorMessage } from '@/utils/errorMessages';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  phone_number?: string | null;
  created_at: string;
  updated_at: string;
  username_change_count?: number;
  last_username_change?: string;
}

interface SensitiveData {
  birthday: string;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sensitiveData, setSensitiveData] = useState<SensitiveData | null>(null);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    username: user?.user_metadata?.username || '',
    bio: user?.user_metadata?.bio || '',
    avatar_url: ''
  });
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameChangeWarning, setUsernameChangeWarning] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      logger.log('Fetching profile for user:', user?.id);
      
      // Fetch profile data - use .single() to ensure we get exactly one
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        logger.error('Error fetching profile:', profileError);
        
        // If it's a "no rows" error, the profile doesn't exist yet
        if (profileError.code === 'PGRST116') {
          logger.log('No profile found for user:', user?.id);
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load profile',
            variant: 'destructive'
          });
          return;
        }
      }

      // Fetch sensitive data (birthday) - only accessible by the user themselves
      const { data: sensitiveData, error: sensitiveError } = await supabase
        .from('sensitive_user_data')
        .select('birthday')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (sensitiveError && sensitiveError.code !== 'PGRST116') {
        logger.error('Error fetching sensitive data:', sensitiveError);
      }

      // Calculate age using secure function
      const { data: ageData, error: ageError } = await supabase
        .rpc('calculate_age_secure', { target_user_id: user?.id });

      if (ageError) {
        logger.error('Error calculating age:', ageError);
      }

      if (profileData) {
        setProfile(profileData);
        setFormData({
          username: profileData.username,
          bio: profileData.bio || '',
          avatar_url: profileData.avatar_url || ''
        });
        setOriginalUsername(profileData.username);
        
        // Check if user is approaching or at the change limit
        const changeCount = profileData.username_change_count || 0;
        if (changeCount >= 1) {
          setUsernameChangeWarning('You\'ve used your free username change. Additional changes cost $5.');
        }
      } else {
        // Profile should exist from signup - if not, try to create it from user metadata
        logger.log('Profile not found, attempting to create from user metadata');
        
        // Get user metadata from auth
        const metadata = user?.user_metadata;
        if (metadata?.username) {
          // Create the profile that should have been created during signup
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              username: metadata.username,
              bio: metadata.bio || '',
              avatar_url: null
            })
            .select()
            .single();
          
          if (newProfile && !createError) {
            setProfile(newProfile);
            setFormData({
              username: newProfile.username,
              bio: newProfile.bio || '',
              avatar_url: newProfile.avatar_url || ''
            });
            setOriginalUsername(newProfile.username);
          } else if (createError?.message?.includes('duplicate')) {
            // Profile exists but query failed, retry
            setTimeout(() => fetchProfile(), 1000);
          } else {
            // Fallback - show form with metadata
            setFormData({
              username: metadata.username || '',
              bio: metadata.bio || '',
              avatar_url: ''
            });
          }
        } else {
          // Last resort - empty form
          setFormData({
            username: '',
            bio: '',
            avatar_url: ''
          });
        }
      }

      if (sensitiveData) {
        setSensitiveData(sensitiveData);
      }

      if (ageData) {
        setUserAge(ageData);
      }
    } catch (error) {
      logger.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image must be smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        toast({
          title: 'Upload failed',
          description: cleanErrorMessage(uploadError),
          variant: 'destructive'
        });
        return;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (data.publicUrl) {
        setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
        toast({
          title: 'Image uploaded!',
          description: 'Don\'t forget to save your profile to update your avatar'
        });
      }
    } catch (error) {
      logger.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      // Clear the input so the same file can be selected again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      toast({
        title: 'Error',
        description: 'Username is required',
        variant: 'destructive'
      });
      return;
    }

    // Check if username is available (only if it changed)
    if (formData.username !== originalUsername && usernameAvailable === false) {
      toast({
        title: 'Error',
        description: 'This username is already taken',
        variant: 'destructive'
      });
      return;
    }

    // Check if user has exceeded free username changes
    if (profile && formData.username !== originalUsername) {
      const changeCount = profile.username_change_count || 0;
      if (changeCount >= 1) {
        toast({
          title: 'Payment Required',
          description: 'You\'ve used your free username change. Additional changes cost $5.',
          variant: 'destructive'
        });
        // In the future, this would trigger a payment flow
        return;
      }
    }

    setSaving(true);
    try {
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            username: formData.username.trim(),
            bio: formData.bio.trim() || null,
            avatar_url: formData.avatar_url.trim() || null
          })
          .eq('user_id', user?.id);

        if (error) {
          toast({
            title: 'Error',
            description: cleanErrorMessage(error),
            variant: 'destructive'
          });
          return;
        }
      } else {
        // Create new profile (this shouldn't normally happen but handles edge cases)
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: user?.id,
            username: formData.username.trim(),
            bio: formData.bio.trim() || null,
            avatar_url: formData.avatar_url.trim() || null
          });

        if (error) {
          toast({
            title: 'Error',
            description: cleanErrorMessage(error),
            variant: 'destructive'
          });
          return;
        }
      }

      toast({
        title: profile ? 'Profile updated!' : 'Profile created!',
        description: profile ? 'Your profile has been saved successfully' : 'Your profile has been created successfully'
      });

      // Refresh profile data
      await fetchProfile();
    } catch (error) {
      logger.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === originalUsername) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error checking username:', error);
        setUsernameAvailable(null);
      } else {
        setUsernameAvailable(!data);
      }
    } catch (error) {
      logger.error('Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.username && formData.username !== originalUsername) {
        checkUsernameAvailability(formData.username);
      } else {
        setUsernameAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.username, originalUsername]);

  const calculateAge = (birthday: string | null): number | 'Unknown' => {
    if (!birthday) return 'Unknown';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const isUnderAge = (birthday: string | null): boolean => {
    const age = calculateAge(birthday);
    return typeof age === 'number' && age < 18;
  };

  const formatPhoneNumber = (phone: string): string => {
    // Phone is stored as digits only in database
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    // Return as-is for international numbers
    return phone;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-card p-4 pt-safe">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Profile Settings</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full p-4 space-y-6 pb-safe">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Avatar */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.avatar_url || undefined} />
                <AvatarFallback className="text-xl">
                  {formData.username.substring(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                disabled={uploading}
              />
              
              <Button 
                variant="outline" 
                size="sm" 
                disabled={uploading}
                onClick={handleCameraClick}
              >
                {uploading ? (
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Uploading...' : 'Change Photo'}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Select a photo from your device. Maximum size: 5MB
              </p>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className={`pr-10 ${
                    formData.username !== originalUsername && usernameAvailable !== null
                      ? usernameAvailable
                        ? 'border-green-500 focus:border-green-500'
                        : 'border-red-500 focus:border-red-500'
                      : ''
                  }`}
                />
                {/* Status icon */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {checkingUsername ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : formData.username !== originalUsername && usernameAvailable !== null ? (
                    usernameAvailable ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )
                  ) : null}
                </div>
              </div>
              
              {/* Availability message */}
              {formData.username !== originalUsername && usernameAvailable !== null && !checkingUsername && (
                <p className={`text-xs ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
                  {usernameAvailable ? 'Username is available!' : 'Username is already taken'}
                </p>
              )}
              
              {/* Username change warning */}
              {usernameChangeWarning && formData.username !== originalUsername && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-700">{usernameChangeWarning}</p>
                </div>
              )}
              
              {/* Username changes info */}
              {profile && (
                <p className="text-xs text-muted-foreground">
                  {profile.username_change_count === 0 || !profile.username_change_count
                    ? 'You have 1 free username change available'
                    : 'You\'ve used your free username change'}
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell others about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                {userAge !== null && userAge < 18
                  ? 'Bio will be hidden for users under 18' 
                  : 'Share a bit about yourself with your trio members'
                }
              </p>
            </div>

            {/* Read-only info */}
            {profile && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">
                  Account Information <span className="font-light text-muted-foreground">(Only you can see this)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p>{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p>{profile.phone_number ? formatPhoneNumber(profile.phone_number) : 'Not provided'}</p>
                  </div>
                  {userAge !== null && (
                    <div>
                      <p className="text-muted-foreground">Age</p>
                      <p>{userAge} years old</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Member since</p>
                    <p>{new Date(profile.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last updated</p>
                    <p>{new Date(profile.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <Button 
              onClick={handleSave}
              disabled={saving || uploading || !formData.username.trim()}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : (profile ? 'Save Profile' : 'Create Profile')}
            </Button>

            {/* Sign Out Button */}
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                size="default"
                onClick={signOut}
                className="w-full hover:bg-destructive/90 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;