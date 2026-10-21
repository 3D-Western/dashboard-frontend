'use client';

import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { copyToClipboard } from '@/lib/clipboard';

/**
 * Shows a new token or key exactly once. The server never returns it again, so this dialog cannot be dismissed
 * by Escape or by tapping outside it; only "I have saved it" closes it, and the secret is gone from the page after that.
 */
export function SecretDialog({
  title,
  secretLabel,
  secret,
  description,
  onDone,
}: {
  title: string;
  /** What the secret is called on screen, e.g. "Gatekeeper token". */
  secretLabel: string;
  secret: string;
  description: ReactNode;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState<'yes' | 'no' | 'failed'>('no');

  const copy = async () => {
    try {
      await copyToClipboard(secret);
      setCopied('yes');
    } catch {
      setCopied('failed');
    }
  };

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Alert variant="warning" role="note">
          <AlertTitle>This is the only time you will see it</AlertTitle>
          <AlertDescription>
            It is not stored anywhere you can look it up again. If you lose it, rotate it to get a
            new one.
          </AlertDescription>
        </Alert>
        <div className="space-y-1.5">
          <Label htmlFor="access-secret">{secretLabel}</Label>
          <div className="flex gap-2">
            <Input
              id="access-secret"
              readOnly
              value={secret}
              onFocus={(event) => event.currentTarget.select()}
              className="font-mono text-sm"
            />
            <Button type="button" variant="outline" onClick={() => void copy()}>
              {copied === 'yes' ? <Check /> : <Copy />}
              {copied === 'yes' ? 'Copied' : 'Copy'}
            </Button>
          </div>
          {copied === 'failed' && (
            <p role="alert" className="text-xs text-destructive">
              We couldn&apos;t copy it. Select the text above and copy it by hand.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" onClick={onDone}>
            I have saved it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
