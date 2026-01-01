'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FieldDescription } from '@/components/ui/field';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { useState, useEffect } from 'react';
import { sessionApi } from '@/api/client/session';

const formSchema = z.object({
  otp: z.string().min(6, 'Please enter the complete OTP code').max(6),
});

export function MFAForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [challengeId, setChallengeId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: '',
    },
  });

  // Check for MFA challenge ID on component mount
  useEffect(() => {
    const storedChallengeId = sessionStorage.getItem('mfaChallengeId');
    if (!storedChallengeId) {
      toast.error('No MFA challenge found. Please log in again.');
      router.push(Routes.login);
      return;
    }
    setChallengeId(parseInt(storedChallengeId, 10));
  }, [router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!challengeId) {
      toast.error('No MFA challenge found. Please log in again.');
      router.push(Routes.login);
      return;
    }

    setIsLoading(true);
    try {
      // Call API to verify OTP
      await sessionApi.verifyMfa(challengeId, values.otp);

      // Clear MFA challenge ID from sessionStorage
      sessionStorage.removeItem('mfaChallengeId');

      toast.success('OTP verified successfully! Redirecting...');

      // Force router to refresh server-side data and navigate
      // This ensures the session cookie is validated by the protected layout
      router.refresh();
      router.push(Routes.dashboard);
    } catch (error) {
      toast.error('Invalid OTP code. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-6 md:min-h-112.5', className)} {...props}>
      <Card className="flex-1 overflow-hidden p-0">
        <CardContent className="grid flex-1 p-0 md:grid-cols-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col items-center justify-center p-6 md:p-8"
            >
              <div className="grid gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
                  <p className="text-balance text-muted-foreground">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormLabel className="sr-only">Verification Code</FormLabel>
                      <FormControl>
                        <InputOTP maxLength={6} id="otp" required {...field}>
                          <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoading || form.watch('otp').length !== 6}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Button>

                <FieldDescription className="text-center">
                  Didn&apos;t receive a code?{' '}
                  <a href="#" className="underline-offset-2 hover:underline">
                    Resend code
                  </a>
                </FieldDescription>
              </div>
            </form>
          </Form>
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
      <FieldDescription className="px-6 text-center">
        Having trouble? <a href="#">Contact support</a>
      </FieldDescription>
    </div>
  );
}
