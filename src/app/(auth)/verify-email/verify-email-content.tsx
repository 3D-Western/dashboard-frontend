'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

type VerificationStatus = 'loading' | 'success' | 'error' | 'invalid-token';

export function VerifyEmailContent({ className, ...props }: React.ComponentProps<'div'>) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<VerificationStatus>('loading');

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setStatus('invalid-token');
        return;
      }

      try {
        // TODO: Replace with actual API call
        // await emailVerificationApi.verify(token);

        // Stub: simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Stub: simulate success (in real implementation, this would depend on API response)
        setStatus('success');
      } catch (_error) {
        setStatus('error');
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="flex items-center p-6 md:p-8">
            <div className="grid gap-6">
              {status === 'loading' && (
                <>
                  <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <h1 className="text-2xl font-bold">Verifying your email</h1>
                    <p className="text-balance text-muted-foreground">
                      Please wait while we verify your email address...
                    </p>
                  </div>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="flex flex-col items-center gap-4 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                    <h1 className="text-2xl font-bold">Email verified</h1>
                    <p className="text-balance text-muted-foreground">
                      Your email has been successfully verified. You can now log in to your account.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={Routes.login}>Continue to Login</Link>
                  </Button>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="flex flex-col items-center gap-4 text-center">
                    <XCircle className="h-12 w-12 text-destructive" />
                    <h1 className="text-2xl font-bold">Verification failed</h1>
                    <p className="text-balance text-muted-foreground">
                      We couldn&apos;t verify your email. The link may have expired or already been
                      used.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={Routes.login}>Return to Login</Link>
                  </Button>
                </>
              )}

              {status === 'invalid-token' && (
                <>
                  <div className="flex flex-col items-center gap-4 text-center">
                    <XCircle className="h-12 w-12 text-destructive" />
                    <h1 className="text-2xl font-bold">Invalid link</h1>
                    <p className="text-balance text-muted-foreground">
                      This verification link is invalid. Please check your email for the correct
                      link.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={Routes.login}>Return to Login</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="relative hidden min-h-[500px] bg-muted md:block">
            <Image
              src="/3dWesternLogo.png"
              alt="3D Western Logo"
              fill
              className="object-contain p-8"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
