'use client';

import { Copy, ExternalLink, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CONTACT_EMAIL } from '@/constants/website';
import { copyToClipboard } from '@/lib/clipboard';

interface EmailUsButtonProps {
  /** Text of the button that opens the dialog */
  label: string;
  subject: string;
  body?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  className?: string;
}

async function copy(text: string, what: string) {
  try {
    await copyToClipboard(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Couldn't copy the ${what.toLowerCase()}`);
  }
}

/**
 * Lets the user email the club without relying on a mail app being set up: open a pre-filled
 * draft in Outlook (Western accounts) or Gmail on the web, use their own mail app, or copy the
 * details. A plain mailto: link silently does nothing on many students' computers.
 */
export function EmailUsButton({
  label,
  subject,
  body = '',
  variant = 'outline',
  className,
}: EmailUsButtonProps) {
  const to = encodeURIComponent(CONTACT_EMAIL);
  const su = encodeURIComponent(subject);
  const bo = encodeURIComponent(body);
  const options = [
    {
      label: 'Open in Outlook',
      hint: 'Western email',
      href: `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${su}&body=${bo}`,
    },
    {
      label: 'Open in Gmail',
      hint: 'Google account',
      href: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bo}`,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={variant === 'link' ? 'default' : 'lg'}
          className={className}
        >
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Email 3D Western</DialogTitle>
          <DialogDescription>
            Pick how you&apos;d like to send it. We&apos;ve filled in the subject
            {body ? ' and a starting message' : ''} for you.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <Button
              key={option.label}
              asChild
              variant="outline"
              className="h-auto justify-start py-3"
            >
              <a href={option.href} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                <span className="flex flex-col items-start">
                  <span>{option.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{option.hint}</span>
                </span>
              </a>
            </Button>
          ))}
        </div>
        <Button asChild variant="ghost" className="justify-start">
          <a href={`mailto:${CONTACT_EMAIL}?subject=${su}&body=${bo}`}>
            <Mail aria-hidden="true" />
            Use my email app
          </a>
        </Button>

        <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
          <p className="eyebrow text-[11px] text-muted-foreground">Or copy the details</p>
          {[
            { what: 'Email address', value: CONTACT_EMAIL },
            { what: 'Subject', value: subject },
          ].map(({ what, value }) => (
            <div key={what} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">{what}: </span>
                {value}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => copy(value, what)}
                aria-label={`Copy ${what.toLowerCase()}`}
              >
                <Copy aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
