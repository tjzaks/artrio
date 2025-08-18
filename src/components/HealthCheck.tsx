import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface HealthStatus {
  supabase: 'ok' | 'error' | 'loading';
  auth: 'ok' | 'error' | 'loading' | 'no_session';
  database: 'ok' | 'error' | 'loading';
  error?: string;
}

export default function HealthCheck({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<HealthStatus>({
    supabase: 'loading',
    auth: 'loading',
    database: 'loading',
  });

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    console.log('🔍 Running health check...');
    
    // 1. Test basic Supabase connection
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      setStatus(prev => ({ ...prev, supabase: 'ok', database: 'ok' }));
      console.log('✅ Supabase connection OK');
    } catch (error) {
      setStatus(prev => ({ 
        ...prev, 
        supabase: 'error', 
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      console.error('❌ Supabase connection failed:', error);
    }

    // 2. Check auth state
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session) {
        setStatus(prev => ({ ...prev, auth: 'ok' }));
        console.log('✅ Auth session active:', session.user.email);
      } else {
        setStatus(prev => ({ ...prev, auth: 'no_session' }));
        console.log('ℹ️  No active auth session');
      }
    } catch (error) {
      setStatus(prev => ({ 
        ...prev, 
        auth: 'error',
        error: error instanceof Error ? error.message : 'Auth error'
      }));
      console.error('❌ Auth check failed:', error);
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'ok': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'loading': return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'no_session': return <Wifi className="h-4 w-4 text-blue-500" />;
      default: return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const clearCache = () => {
    console.log('🗑️  Clearing cached data...');
    localStorage.removeItem('artrio_errors');
    localStorage.removeItem('artrio-auth-user');
    localStorage.removeItem('artrio-auth-session');
    localStorage.removeItem('artrio-is-admin');
    window.location.reload();
  };

  return (
    <Card className="fixed top-4 right-4 z-50 w-80">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Health Check</span>
          <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span>Supabase Connection</span>
          {getStatusIcon(status.supabase)}
        </div>
        
        <div className="flex items-center justify-between">
          <span>Database Access</span>
          {getStatusIcon(status.database)}
        </div>
        
        <div className="flex items-center justify-between">
          <span>Authentication</span>
          {getStatusIcon(status.auth)}
        </div>

        {status.error && (
          <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
            {status.error}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={checkHealth}>
            Recheck
          </Button>
          <Button variant="destructive" size="sm" onClick={clearCache}>
            Clear Cache
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}