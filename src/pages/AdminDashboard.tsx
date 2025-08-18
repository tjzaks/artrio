import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
import { logger } from '@/utils/logger';
  Users, 
  Shuffle, 
  Trash2, 
  Calendar,
  Activity,
  Shield,
  Home,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  todaysTrios: number;
  usersInTrios: number;
  activeProfiles: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    todaysTrios: 0,
    usersInTrios: 0,
    activeProfiles: 0
  });
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadStats();
  }, [isAdmin, navigate]);

  const loadStats = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get today's trios
      const today = new Date().toISOString().split('T')[0];
      const { data: trios, count: trioCount } = await supabase
        .from('trios')
        .select('*', { count: 'exact' })
        .eq('date', today);

      // Count users in trios
      let usersInTrios = 0;
      if (trios && trios.length > 0) {
        trios.forEach(trio => {
          if (trio.user1_id) usersInTrios++;
          if (trio.user2_id) usersInTrios++;
          if (trio.user3_id) usersInTrios++;
          if (trio.user4_id) usersInTrios++;
          if (trio.user5_id) usersInTrios++;
        });
      }

      setStats({
        totalUsers: userCount || 0,
        todaysTrios: trioCount || 0,
        usersInTrios: usersInTrios,
        activeProfiles: userCount || 0
      });
    } catch (error) {
      logger.error('Error loading stats:', error);
    }
  };

  const randomizeTrios = async () => {
    setLoading(true);
    setLastAction('Randomizing trios...');
    
    try {
      // First, delete today's existing trios
      const today = new Date().toISOString().split('T')[0];
      const { error: deleteError } = await supabase
        .from('trios')
        .delete()
        .eq('date', today);

      if (deleteError) {
        logger.error('Delete error:', deleteError);
      }

      // Get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username');

      if (profileError) throw profileError;

      if (!profiles || profiles.length < 3) {
        toast({
          title: 'Not enough users',
          description: 'Need at least 3 users to create trios',
          variant: 'destructive'
        });
        return;
      }

      // Shuffle profiles
      const shuffled = [...profiles].sort(() => Math.random() - 0.5);
      
      // Create trios (groups of 3)
      const trios = [];
      for (let i = 0; i < shuffled.length - 2; i += 3) {
        const trio = {
          user1_id: shuffled[i].id,
          user2_id: shuffled[i + 1].id,
          user3_id: shuffled[i + 2].id,
          user4_id: shuffled[i + 3]?.id || null,
          user5_id: shuffled[i + 4]?.id || null,
          date: today
        };
        
        // Skip if we don't have at least 3 users for this trio
        if (i + 2 < shuffled.length) {
          trios.push(trio);
        }
      }

      if (trios.length === 0) {
        toast({
          title: 'No trios created',
          description: 'Not enough users to form complete trios',
          variant: 'destructive'
        });
        return;
      }

      // Insert all trios
      const { error: insertError } = await supabase
        .from('trios')
        .insert(trios);

      if (insertError) throw insertError;

      // Show success with details
      const usersAssigned = trios.length * 3;
      toast({
        title: '✅ Trios Created Successfully!',
        description: `Created ${trios.length} trios with ${usersAssigned} users`,
      });

      setLastAction(`Successfully created ${trios.length} trios`);
      
      // Reload stats
      await loadStats();

    } catch (error) {
      logger.error('Error randomizing:', error);
      toast({
        title: 'Error creating trios',
        description: error.message || 'Failed to randomize trios',
        variant: 'destructive'
      });
      setLastAction('Failed to create trios');
    } finally {
      setLoading(false);
    }
  };

  const deleteTodaysTrios = async () => {
    setLoading(true);
    setLastAction('Deleting trios...');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('trios')
        .delete()
        .eq('date', today);

      if (error) throw error;

      toast({
        title: '🗑️ Trios Deleted',
        description: 'Today\'s trios have been removed',
      });

      setLastAction('Successfully deleted today\'s trios');
      await loadStats();

    } catch (error) {
      logger.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete trios',
        variant: 'destructive'
      });
      setLastAction('Failed to delete trios');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllTrios = async () => {
    if (!confirm('Are you sure? This will delete ALL trios from the database.')) {
      return;
    }

    setLoading(true);
    setLastAction('Deleting all trios...');
    
    try {
      const { error } = await supabase
        .from('trios')
        .delete()
        .gte('id', 0); // Delete all

      if (error) throw error;

      toast({
        title: '🗑️ All Trios Deleted',
        description: 'All trios have been removed from the database',
      });

      setLastAction('Successfully deleted all trios');
      await loadStats();

    } catch (error) {
      logger.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete all trios',
        variant: 'destructive'
      });
      setLastAction('Failed to delete all trios');
    } finally {
      setLoading(false);
    }
  };

  const verifyTrios = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's trios with details
      const { data: trios, error } = await supabase
        .from('trios')
        .select('*')
        .eq('date', today);

      if (error) throw error;

      if (!trios || trios.length === 0) {
        toast({
          title: 'No trios found',
          description: 'No trios exist for today',
          variant: 'destructive'
        });
        return;
      }

      // Get profile details for all users in trios
      const userIds = new Set<string>();
      trios.forEach(trio => {
        if (trio.user1_id) userIds.add(trio.user1_id);
        if (trio.user2_id) userIds.add(trio.user2_id);
        if (trio.user3_id) userIds.add(trio.user3_id);
        if (trio.user4_id) userIds.add(trio.user4_id);
        if (trio.user5_id) userIds.add(trio.user5_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      // Show detailed info
      let details = `Found ${trios.length} trios for today:\n\n`;
      trios.forEach((trio, index) => {
        details += `Trio ${index + 1}:\n`;
        if (trio.user1_id) details += `  • ${profileMap.get(trio.user1_id) || 'Unknown'}\n`;
        if (trio.user2_id) details += `  • ${profileMap.get(trio.user2_id) || 'Unknown'}\n`;
        if (trio.user3_id) details += `  • ${profileMap.get(trio.user3_id) || 'Unknown'}\n`;
        if (trio.user4_id) details += `  • ${profileMap.get(trio.user4_id) || 'Unknown'}\n`;
        if (trio.user5_id) details += `  • ${profileMap.get(trio.user5_id) || 'Unknown'}\n`;
        details += '\n';
      });

      logger.log(details);
      
      toast({
        title: `✅ Verified: ${trios.length} trios exist`,
        description: `${userIds.size} users are in trios today`,
      });

      setLastAction(`Verified: ${trios.length} trios with ${userIds.size} users`);

    } catch (error) {
      logger.error('Verification error:', error);
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{stats.totalUsers}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Trios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{stats.todaysTrios}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Users in Trios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{stats.usersInTrios}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{stats.activeProfiles}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Action Status */}
        {lastAction && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-900">{lastAction}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Trio Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={randomizeTrios}
                disabled={loading}
                className="h-auto py-4 flex-col gap-2"
              >
                <Shuffle className="h-5 w-5" />
                <div>
                  <div className="font-semibold">Randomize Trios</div>
                  <div className="text-xs opacity-80">Create new random trios for today</div>
                </div>
              </Button>

              <Button 
                onClick={verifyTrios}
                disabled={loading}
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                <div>
                  <div className="font-semibold">Verify Trios</div>
                  <div className="text-xs opacity-80">Check today's trio status</div>
                </div>
              </Button>

              <Button 
                onClick={deleteTodaysTrios}
                disabled={loading}
                variant="destructive"
                className="h-auto py-4 flex-col gap-2"
              >
                <Trash2 className="h-5 w-5" />
                <div>
                  <div className="font-semibold">Delete Today's Trios</div>
                  <div className="text-xs opacity-80">Remove all trios for today</div>
                </div>
              </Button>

              <Button 
                onClick={deleteAllTrios}
                disabled={loading}
                variant="destructive"
                className="h-auto py-4 flex-col gap-2"
              >
                <XCircle className="h-5 w-5" />
                <div>
                  <div className="font-semibold">Delete ALL Trios</div>
                  <div className="text-xs opacity-80">Remove all trios from database</div>
                </div>
              </Button>
            </div>

            <Button 
              onClick={loadStats}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Stats
            </Button>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs space-y-1 text-muted-foreground">
              <div>Environment: {import.meta.env.MODE}</div>
              <div>Supabase URL: {import.meta.env.VITE_SUPABASE_URL}</div>
              <div>Last Refresh: {new Date().toLocaleTimeString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;