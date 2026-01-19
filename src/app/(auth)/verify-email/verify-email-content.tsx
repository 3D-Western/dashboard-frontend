'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';
import { Mail, CheckCircle2 } from 'lucide-react';
import { sessionApi } from '@/api/client/session';
import { StatusAlert } from '@/components/StatusAlert';
import { ApiError } from '@/api/client/errors';

type VerificationStatus = 'loading' | 'success' | 'error' | 'invalid-token';

function LoadingIndicator() {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      {/* Outer ring - slow rotation */}
      <div className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border-2 border-muted-foreground/20 border-t-primary" />
      {/* Inner ring - opposite rotation */}
      <div className="absolute inset-2 animate-[spin_2s_linear_infinite_reverse] rounded-full border-2 border-muted-foreground/10 border-b-primary/60" />
      {/* Center icon */}
      <Mail className="h-5 w-5 text-primary" />
    </div>
  );
}

export function VerifyEmailContent({ className, ...props }: React.ComponentProps<'div'>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setStatus('invalid-token');
        setErrorMessage(
          'This verification link is invalid. Please check your email for the correct link.',
        );
        return;
      }

      try {
        await sessionApi.verifyEmail(token);
        setStatus('success');
      } catch (error) {
        setStatus('error');
        if (error instanceof ApiError) {
          setErrorMessage(
            error.message ||
              "We couldn't verify your email. The link may have expired or already been used.",
          );
        } else {
          setErrorMessage('An unexpected error occurred. Please try again.');
        }
      }
    }

    verifyEmail();
  }, [token]);

  // Countdown timer for auto-redirect after successful verification
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      router.push(Routes.login);
    }
  }, [status, countdown, router]);

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="flex items-center p-6 md:p-8">
            <div className="grid w-full gap-6">
              {status === 'loading' && (
                <div className="flex animate-in flex-col items-center gap-4 text-center duration-300 fade-in-0">
                  <LoadingIndicator />
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Verifying your email</h1>
                    <p className="text-balance text-muted-foreground">
                      Please wait while we verify your email address...
                    </p>
                  </div>
                </div>
              )}

              {status === 'success' && (
                <div className="flex animate-in flex-col items-center gap-6 text-center duration-300 fade-in-0 slide-in-from-bottom-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h1 className="text-2xl font-bold">Email verified</h1>
                      <p className="text-balance text-muted-foreground">
                        Your email has been successfully verified. You can now log in to your
                        account.
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}...
                    </p>
                  </div>
                  <Button asChild className="w-full">
                    <Link href={Routes.login}>Continue to Login</Link>
                  </Button>
                </div>
              )}

              {status === 'error' && (
                <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
                  <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold">Verification failed</h1>
                  </div>
                  <StatusAlert
                    variant="destructive"
                    title="Verification Error"
                    description={errorMessage}
                    action={
                      <Button asChild className="w-full">
                        <Link href={Routes.login}>Return to Login</Link>
                      </Button>
                    }
                  />
                </div>
              )}

              {status === 'invalid-token' && (
                <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
                  <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold">Invalid link</h1>
                  </div>
                  <StatusAlert
                    variant="destructive"
                    title="Invalid Token"
                    description={errorMessage}
                    action={
                      <Button asChild className="w-full">
                        <Link href={Routes.login}>Return to Login</Link>
                      </Button>
                    }
                  />
                </div>
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
