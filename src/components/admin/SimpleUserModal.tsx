import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SimpleUserModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SimpleUserModal({ userId, isOpen, onClose }: SimpleUserModalProps) {
  const [testData, setTestData] = useState<string>('Testing...');

  const handleTest = () => {
    setTestData(`User ID: ${userId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Simple Test Modal</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 space-y-4">
          <p>This is a simplified version to test if the modal works at all.</p>
          
          <div className="space-y-2">
            <p><strong>User ID:</strong> {userId || 'None'}</p>
            <p><strong>Modal Open:</strong> {isOpen ? 'Yes' : 'No'}</p>
            <p><strong>Test Data:</strong> {testData}</p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleTest}>Test Button</Button>
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}