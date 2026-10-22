'use client';

import { Button } from '@/components/ui/button';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { memo, useState } from 'react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';

interface InvitationCodeCellProps {
  code: string;
}

export const InvitationCodeCell = memo(function InvitationCodeCell({
  code,
}: InvitationCodeCellProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(code);
      toast.success('Invitation code copied to clipboard');
    } catch (error) {
      console.error('Failed to copy invitation code:', error);
      toast.error('Failed to copy invitation code');
    }
  };

  return (
    <div className="flex w-full items-center justify-start gap-2 md:justify-center">
      <span className="font-mono text-sm">{isVisible ? code : '********'}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-11 w-11 shrink-0 p-0 fine:h-6 fine:w-6"
        onClick={() => setIsVisible(!isVisible)}
        aria-label={isVisible ? 'Hide invitation code' : 'Show invitation code'}
      >
        {isVisible ? (
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-11 w-11 shrink-0 p-0 fine:h-6 fine:w-6"
        onClick={handleCopy}
        aria-label="Copy invitation code"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
});
