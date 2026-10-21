'use client';

import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { memo } from 'react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';

interface EmailCellProps {
  email: string;
}

export const EmailCell = memo(function EmailCell({ email }: EmailCellProps) {
  const handleCopy = async () => {
    try {
      await copyToClipboard(email);
      toast.success('Email copied to clipboard');
    } catch (error) {
      console.error('Failed to copy email:', error);
      toast.error('Failed to copy email');
    }
  };

  return (
    <div className="flex w-full items-center justify-start gap-2 md:justify-center">
      <span className="text-sm break-all">{email}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-11 w-11 shrink-0 p-0 fine:h-6 fine:w-6"
        onClick={handleCopy}
        aria-label="Copy email"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
});
