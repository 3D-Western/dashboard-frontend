'use client';

import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { memo } from 'react';
import { toast } from 'sonner';

interface EmailCellProps {
  email: string;
}

export const EmailCell = memo(function EmailCell({ email }: EmailCellProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success('Email copied to clipboard');
    } catch (error) {
      console.error('Failed to copy email:', error);
      toast.error('Failed to copy email');
    }
  };

  return (
    <div className="flex w-full items-center justify-center gap-2">
      <span className="text-sm">{email}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handleCopy}
        aria-label="Copy email"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
});
