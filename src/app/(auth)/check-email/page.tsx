import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Check Your Email',
  description: 'Verify your email address to complete registration',
};

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="flex items-center p-6 md:p-8">
                <div className="grid gap-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Check your email</h1>
                    <p className="text-balance text-muted-foreground">
                      We&apos;ve sent a verification link to your email address. Please check your
                      inbox and click the link to verify your account.
                    </p>
                  </div>

                  <div className="rounded-lg border border-muted bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      <strong>Didn&apos;t receive the email?</strong>
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Check your spam or junk folder, make sure you entered the correct email, or
                      wait a few minutes and try again.
                    </p>
                  </div>

                  <Button asChild>
                    <Link href={Routes.login}>Return to Login</Link>
                  </Button>
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
      </div>
    </div>
  );
}
