import { useEffect, useState } from 'react';
import { HealthCheck } from '@/utils/monitoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const Health = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const result = await HealthCheck.checkAll();
      setHealth(result);
    } catch (error) {
      setHealth({
        status: 'error',
        message: 'Failed to check health',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'unauthenticated':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      case 'unauthenticated':
        return <Badge className="bg-yellow-500">Unauthenticated</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Return JSON for API-style health check
  if (window.location.pathname === '/api/health') {
    return <pre>{JSON.stringify(health, null, 2)}</pre>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>System Health Check</span>
              {health && getStatusBadge(health.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Checking system health...</p>
            ) : health ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Last checked: {new Date(health.timestamp).toLocaleString()}
                </div>

                {health.services && (
                  <div className="space-y-3">
                    {Object.entries(health.services).map(([service, status]: [string, any]) => (
                      <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(status.status)}
                          <div>
                            <p className="font-medium capitalize">{service}</p>
                            {status.message && (
                              <p className="text-sm text-muted-foreground">{status.message}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {status.responseTime && (
                            <p className="text-sm text-muted-foreground">
                              {status.responseTime.toFixed(2)}ms
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">System Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Environment:</span>
                      <span className="ml-2">{import.meta.env.MODE}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Version:</span>
                      <span className="ml-2">{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">App URL:</span>
                      <span className="ml-2">{import.meta.env.VITE_APP_URL || window.location.origin}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p>No health data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Health;