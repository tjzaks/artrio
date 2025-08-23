import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useRealtimeConnection() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    
    const checkConnection = async () => {
      try {
        // Ping the database to check connection
        const { error } = await supabase.from('profiles').select('id').limit(1);
        
        if (error) {
          throw error;
        }
        
        setStatus('connected');
        setRetryCount(0);
      } catch (error) {
        console.error('Connection check failed:', error);
        setStatus('error');
        
        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        setRetryCount(prev => prev + 1);
        
        if (retryCount === 0) {
          toast({
            title: 'Connection Issue',
            description: 'Having trouble connecting to real-time updates. Retrying...',
            variant: 'destructive'
          });
        }
        
        reconnectTimer = setTimeout(checkConnection, delay);
      }
    };
    
    // Initial check
    checkConnection();
    
    // Monitor realtime subscription status
    const handleConnectionChange = (state: string) => {
      console.log('Realtime connection state:', state);
      
      switch (state) {
        case 'connected':
          setStatus('connected');
          if (retryCount > 0) {
            toast({
              title: 'Connected',
              description: 'Real-time updates restored',
            });
          }
          setRetryCount(0);
          break;
        case 'disconnected':
        case 'error':
          setStatus('disconnected');
          checkConnection();
          break;
        case 'connecting':
          setStatus('connecting');
          break;
      }
    };
    
    // Subscribe to connection state changes
    const subscription = supabase.channel('connection-monitor')
      .on('system', { event: '*' }, (payload) => {
        handleConnectionChange(payload.event);
      })
      .subscribe((status) => {
        handleConnectionChange(status);
      });
    
    // Periodic health check every 30 seconds
    const healthCheck = setInterval(checkConnection, 30000);
    
    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(healthCheck);
      subscription.unsubscribe();
    };
  }, [retryCount, toast]);
  
  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    hasError: status === 'error'
  };
}