import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, User, Activity, Calendar, Phone, Mail, UserX, UserCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface UserProfileModalProps {
  user: {
    id: string;
    user_id: string;
    username: string;
    bio: string | null;
    avatar_url: string | null;
    phone_number: string | null;
    created_at: string;
    is_admin: boolean;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

export default function UserProfileModal({ user, isOpen, onClose, onUserUpdated }: UserProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!user) return null;

  const handleBanUser = async () => {
    setLoading(true);
    try {
      // This would implement user banning logic
      toast({
        title: 'Feature Coming Soon',
        description: 'User banning functionality will be implemented soon.',
      });
    } catch (error) {
      logger.error('Error banning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to ban user',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAdmin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${user.username} is now an admin`
      });

      onUserUpdated();
      onClose();
    } catch (error) {
      logger.error('Error making user admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to make user admin',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_user_account', {
        target_user_id: user.user_id
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Account Deleted',
          description: data.message
        });
        onUserUpdated();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to delete account');
      }
    } catch (error) {
      logger.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete account',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>User Profile Details</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="account">Account Info</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={`${user.username} avatar`}
                    className="w-16 h-16 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted border flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">@{user.username}</h3>
                  {user.is_admin && (
                    <Badge variant="destructive" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {user.bio && (
              <div>
                <h4 className="font-medium mb-2">Bio</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {user.bio}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBanUser}
                disabled={loading || user.is_admin}
                className="text-orange-600 hover:bg-orange-50"
              >
                <UserX className="h-4 w-4 mr-2" />
                Ban User
              </Button>

              {!user.is_admin && (
                <Button
                  variant="outline"
                  onClick={handleMakeAdmin}
                  disabled={loading}
                  className="text-blue-600 hover:bg-blue-50"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Make Admin
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={loading || user.is_admin}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete @{user.username}'s account and all associated data including posts, messages, stories, and profile information. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono text-xs">{user.user_id.slice(0, 8)}...</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined:</span>
                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                </div>

                {user.phone_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{user.phone_number}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Auth ID:</span>
                  <span className="font-mono text-xs">{user.user_id.slice(0, 8)}...</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Username Changes:</span>
                  <span className="ml-2">0</span>
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="ml-2">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Activity tracking coming soon...</span>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}