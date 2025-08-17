import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Settings, Users, Trash2, RefreshCw } from 'lucide-react';

export default function SystemControlsPanel() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const setButtonLoading = (key: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  const triggerTrioRandomization = async () => {
    setButtonLoading('randomize', true);
    try {
      const { data, error } = await supabase.rpc('randomize_trios');
      
      if (error) {
        logger.error('RPC Error:', error);
        throw error;
      }

      // Check if the function returned success: false
      if (data && data.success === false) {
        throw new Error(data.error || 'Randomization failed');
      }

      // Skip logging for now if it doesn't exist
      try {
        const currentUser = await supabase.auth.getUser();
        await supabase.rpc('log_admin_action', {
          p_admin_id: currentUser.data.user?.id,
          p_action_type: 'system_control',
          p_description: 'Manually triggered trio randomization'
        });
      } catch (logError) {
        logger.log('Logging skipped:', logError);
      }

      // Only show success if we actually created trios
      if (data?.trios_created > 0) {
        toast({
          title: "Success",
          description: `Created ${data.trios_created} trios with ${data.users_assigned} users!`
        });
      } else {
        toast({
          variant: "destructive",
          title: "No Trios Created",
          description: data?.error || "No users available for trio creation"
        });
      }
    } catch (error) {
      logger.error('Error triggering randomization:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to trigger trio randomization. Please run the SQL script in Supabase."
      });
    } finally {
      setButtonLoading('randomize', false);
    }
  };

  const cleanupExpiredContent = async () => {
    setButtonLoading('cleanup', true);
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_content');
      
      if (error) {
        logger.error('RPC Error:', error);
        throw error;
      }

      // Check if the function returned success: false
      if (data && data.success === false) {
        throw new Error(data.error || 'Cleanup failed');
      }

      try {
        const currentUser = await supabase.auth.getUser();
        await supabase.rpc('log_admin_action', {
          p_admin_id: currentUser.data.user?.id,
          p_action_type: 'system_control',
          p_description: 'Manually triggered expired content cleanup'
        });
      } catch (logError) {
        logger.log('Logging skipped:', logError);
      }

      const deletedTotal = (data?.deleted_posts || 0) + (data?.deleted_messages || 0);
      if (deletedTotal > 0) {
        toast({
          title: "Success",
          description: `Cleanup completed: ${data?.deleted_posts || 0} posts, ${data?.deleted_messages || 0} messages deleted`
        });
      } else {
        toast({
          title: "No Content to Clean",
          description: "No expired content found"
        });
      }
    } catch (error) {
      logger.error('Error cleaning up content:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to cleanup expired content. Please run the SQL script in Supabase."
      });
    } finally {
      setButtonLoading('cleanup', false);
    }
  };

  const refreshSafeProfiles = async () => {
    setButtonLoading('profiles', true);
    try {
      const { data, error } = await supabase.rpc('populate_safe_profiles');
      
      if (error) {
        logger.error('RPC Error:', error);
        throw error;
      }

      // Check if the function returned success: false
      if (data && data.success === false) {
        throw new Error(data.error || 'Profile refresh failed');
      }

      try {
        const currentUser = await supabase.auth.getUser();
        await supabase.rpc('log_admin_action', {
          p_admin_id: currentUser.data.user?.id,
          p_action_type: 'system_control',
          p_description: 'Manually refreshed safe profiles'
        });
      } catch (logError) {
        logger.log('Logging skipped:', logError);
      }

      if (data?.profiles_updated > 0) {
        toast({
          title: "Success",
          description: `Updated ${data.profiles_updated} profiles out of ${data.total_profiles} total`
        });
      } else {
        toast({
          title: "Profiles Up to Date",
          description: `All ${data?.total_profiles || 0} profiles are already up to date`
        });
      }
    } catch (error) {
      logger.error('Error refreshing profiles:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to refresh safe profiles. Please run the SQL script in Supabase."
      });
    } finally {
      setButtonLoading('profiles', false);
    }
  };

  const deleteTodaysTrios = async () => {
    setButtonLoading('deleteTrios', true);
    try {
      // Use RPC function to delete today's trios
      const { data, error } = await supabase.rpc('delete_todays_trios');
      
      if (error) {
        logger.error('RPC Error:', error);
        throw error;
      }

      // Check if function returned success: false
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to delete trios');
      }

      // Skip logging for now
      try {
        const currentUser = await supabase.auth.getUser();
        await supabase.rpc('log_admin_action', {
          p_admin_id: currentUser.data.user?.id,
          p_action_type: 'system_control',
          p_description: `Deleted ${data?.deleted_count || 0} trios for ${data?.date || 'today'}`
        });
      } catch (logError) {
        logger.log('Logging skipped:', logError);
      }

      if (data?.deleted_count > 0) {
        toast({
          title: "Success",
          description: `Deleted ${data.deleted_count} trios for today`
        });
      } else {
        toast({
          title: "No Trios Found",
          description: "No trios exist for today to delete"
        });
      }
    } catch (error) {
      logger.error('Error deleting trios:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete today's trios. Please run the SQL function in Supabase."
      });
    } finally {
      setButtonLoading('deleteTrios', false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={triggerTrioRandomization}
            disabled={loading.randomize}
            className="h-20 flex flex-col gap-2"
          >
            <Users className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">Randomize Trios</div>
              <div className="text-xs opacity-80">Create new daily trios</div>
            </div>
          </Button>

          <Button
            onClick={cleanupExpiredContent}
            disabled={loading.cleanup}
            variant="outline"
            className="h-20 flex flex-col gap-2"
          >
            <Trash2 className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">Cleanup Content</div>
              <div className="text-xs opacity-80">Remove expired posts</div>
            </div>
          </Button>

          <Button
            onClick={refreshSafeProfiles}
            disabled={loading.profiles}
            variant="outline"
            className="h-20 flex flex-col gap-2"
          >
            <RefreshCw className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">Refresh Profiles</div>
              <div className="text-xs opacity-80">Update safe profile data</div>
            </div>
          </Button>

          <Button
            onClick={deleteTodaysTrios}
            disabled={loading.deleteTrios}
            variant="destructive"
            className="h-20 flex flex-col gap-2"
          >
            <Trash2 className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">Delete Today's Trios</div>
              <div className="text-xs opacity-80">Remove current daily trios</div>
            </div>
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">⚠️ Important Notes</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Trio randomization runs automatically daily</li>
            <li>• Content cleanup happens automatically via cron jobs</li>
            <li>• Use manual controls only when necessary</li>
            <li>• All actions are logged for audit purposes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}