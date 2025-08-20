import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

export function IOSConnectionTest() {
  const [tests, setTests] = useState<Record<string, { status: 'pending' | 'success' | 'error'; message: string }>>({});
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTests({});

    // Test 1: Check if we're in iOS app
    const isIOSApp = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Artrio iOS App');
    setTests(prev => ({
      ...prev,
      iosApp: {
        status: isIOSApp ? 'success' : 'error',
        message: isIOSApp ? 'Running in iOS App' : 'Not in iOS App'
      }
    }));

    // Test 2: Check Supabase URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    setTests(prev => ({
      ...prev,
      supabaseUrl: {
        status: supabaseUrl ? 'success' : 'error',
        message: supabaseUrl || 'No Supabase URL configured'
      }
    }));

    // Test 3: Check localStorage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      setTests(prev => ({
        ...prev,
        localStorage: {
          status: 'success',
          message: 'localStorage is working'
        }
      }));
    } catch (err) {
      setTests(prev => ({
        ...prev,
        localStorage: {
          status: 'error',
          message: 'localStorage failed: ' + err
        }
      }));
    }

    // Test 4: Simple fetch to Supabase
    try {
      console.log('📱 Testing direct fetch to Supabase...');
      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=count&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setTests(prev => ({
          ...prev,
          fetch: {
            status: 'success',
            message: `Direct fetch successful (${response.status})`
          }
        }));
      } else {
        setTests(prev => ({
          ...prev,
          fetch: {
            status: 'error',
            message: `Fetch failed: ${response.status} ${response.statusText}`
          }
        }));
      }
    } catch (err: any) {
      console.error('📱 Fetch test error:', err);
      setTests(prev => ({
        ...prev,
        fetch: {
          status: 'error',
          message: `Fetch error: ${err.message || err}`
        }
      }));
    }

    // Test 5: Supabase client query
    try {
      console.log('📱 Testing Supabase client...');
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        setTests(prev => ({
          ...prev,
          supabaseClient: {
            status: 'error',
            message: `Supabase error: ${error.message}`
          }
        }));
      } else {
        setTests(prev => ({
          ...prev,
          supabaseClient: {
            status: 'success',
            message: 'Supabase client working'
          }
        }));
      }
    } catch (err: any) {
      console.error('📱 Supabase client test error:', err);
      setTests(prev => ({
        ...prev,
        supabaseClient: {
          status: 'error',
          message: `Client error: ${err.message || err}`
        }
      }));
    }

    // Test 6: Auth health check
    try {
      console.log('📱 Testing auth health...');
      const { data: { session } } = await supabase.auth.getSession();
      
      setTests(prev => ({
        ...prev,
        authHealth: {
          status: 'success',
          message: session ? 'Existing session found' : 'No session (ready for login)'
        }
      }));
    } catch (err: any) {
      console.error('📱 Auth health test error:', err);
      setTests(prev => ({
        ...prev,
        authHealth: {
          status: 'error',
          message: `Auth error: ${err.message || err}`
        }
      }));
    }

    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run tests on mount if in iOS app
    const isIOSApp = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Artrio iOS App');
    if (isIOSApp) {
      runTests();
    }
  }, []);

  // Only show in iOS app
  const isIOSApp = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Artrio iOS App');
  if (!isIOSApp) {
    return null;
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>iOS Connection Diagnostics</span>
          <Button 
            size="sm" 
            onClick={runTests} 
            disabled={isRunning}
            variant="outline"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(tests).map(([test, result]) => (
          <div key={test} className="flex items-start gap-2">
            {result.status === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            ) : result.status === 'error' ? (
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-medium text-sm">{test}</div>
              <div className="text-xs text-muted-foreground">{result.message}</div>
            </div>
          </div>
        ))}
        {Object.keys(tests).length === 0 && !isRunning && (
          <div className="text-sm text-muted-foreground">
            Click refresh to run diagnostics
          </div>
        )}
      </CardContent>
    </Card>
  );
}