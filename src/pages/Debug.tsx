import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Debug() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test 1: Can we reach Supabase?
      const { data: healthCheck } = await supabase.from('profiles').select('count').limit(1);
      
      // Test 2: What's the Supabase URL?
      const supabaseUrl = (supabase as any).supabaseUrl || 'Unknown';
      const supabaseAnonKey = (supabase as any).supabaseKey ? 'Present' : 'Missing';
      
      // Test 3: Check auth endpoint directly
      const authUrl = `${supabaseUrl}/auth/v1/health`;
      let authHealth = 'Unknown';
      try {
        const response = await fetch(authUrl);
        authHealth = response.ok ? 'OK' : `Status ${response.status}`;
      } catch (e) {
        authHealth = 'Failed to reach';
      }
      
      setResult({
        connection: 'Success',
        supabaseUrl,
        supabaseAnonKey,
        authHealth,
        timestamp: new Date().toISOString(),
        healthCheck: healthCheck ? 'Connected' : 'Failed'
      });
    } catch (error: any) {
      setResult({
        connection: 'Failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      // Log what we're trying
      console.log('Attempting login with:', { email, password: '***' });
      
      // First, let's test the raw API directly
      const apiUrl = (supabase as any).supabaseUrl;
      const anonKey = (supabase as any).supabaseKey;
      
      try {
        const response = await fetch(`${apiUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': anonKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password.trim()
          })
        });
        
        const rawData = await response.json();
        
        if (!response.ok) {
          setResult({
            success: false,
            error: rawData.error || rawData.msg || 'Unknown error',
            errorCode: response.status,
            rawResponse: rawData,
            attemptedEmail: email.trim(),
            apiUrl,
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        // If raw API works, try Supabase client
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });
        
        if (error) {
          setResult({
            success: false,
            error: error.message,
            errorCode: error.status,
            rawApiWorked: true,
            clientFailed: true,
            timestamp: new Date().toISOString()
          });
        } else {
          setResult({
            success: true,
            user: data.user?.email,
            username: data.user?.user_metadata?.username,
            userId: data.user?.id,
            timestamp: new Date().toISOString()
          });
          await supabase.auth.signOut();
        }
      } catch (fetchError: any) {
        setResult({
          success: false,
          error: 'Failed to reach auth endpoint',
          fetchError: fetchError.message,
          apiUrl,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      setResult({
        success: false,
        error: error.message,
        unexpected: true,
        timestamp: new Date().toISOString()
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-4 bg-background">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Debug Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Connection Info:</h3>
            <p className="text-sm text-muted-foreground">
              URL: {window.location.href}
            </p>
            <p className="text-sm text-muted-foreground">
              User Agent: {navigator.userAgent.substring(0, 50)}...
            </p>
          </div>

          <Button 
            onClick={testConnection} 
            disabled={loading}
            className="w-full"
          >
            Test Supabase Connection
          </Button>

          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button 
              onClick={testLogin} 
              disabled={loading || !email || !password}
              className="w-full"
            >
              Test Login
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}