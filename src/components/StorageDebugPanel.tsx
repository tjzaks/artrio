import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { checkStoriesbucket, testUpload } from '@/utils/supabaseStorageCheck';

export default function StorageDebugPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  const checkBucket = async () => {
    addLog('Checking stories bucket...');
    const exists = await checkStoriesbucket();
    addLog(`Bucket check result: ${exists}`);
  };
  
  const testUploadFn = async () => {
    addLog('Testing upload...');
    const success = await testUpload();
    addLog(`Upload test result: ${success}`);
  };
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Storage Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={checkBucket} size="sm">
            Check Bucket
          </Button>
          <Button onClick={testUploadFn} size="sm">
            Test Upload
          </Button>
          <Button onClick={clearLogs} variant="outline" size="sm">
            Clear
          </Button>
        </div>
        
        <div className="bg-gray-100 p-3 rounded text-xs max-h-40 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="font-mono">
                {log}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}