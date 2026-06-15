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
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { useState } from 'react';
import { sessionApi } from '@/api/client/session';
import { ApiError, ErrorCodes } from '@/api/client/errors';

const formSchema = z.object({
  otp: z.string().min(6, 'Please enter the complete OTP code').max(6),
});

export function MFAForm({
  challengeId: initialChallengeId,
  className,
  ...props
}: React.ComponentProps<'div'> & { challengeId: number }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [challengeId, setChallengeId] = useState(initialChallengeId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp: '' },
  });

  const otpValue = useWatch({ control: form.control, name: 'otp', defaultValue: '' });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await sessionApi.verifyMfa(challengeId, values.otp);
      toast.success('OTP verified successfully! Redirecting...');
      router.refresh();
      router.push(Routes.dashboard);
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.code) {
          case ErrorCodes.OTP_EXPIRED:
          case ErrorCodes.OTP_ALREADY_USED:
          case ErrorCodes.TOO_MANY_OTP_ATTEMPTS:
            toast.error('This code is no longer valid. Please request a new one.');
            break;
          case ErrorCodes.ACCOUNT_LOCKED:
            toast.error(
              'Account temporarily locked due to too many attempts. Try again in 15 minutes.',
            );
            break;
          case ErrorCodes.CHALLENGE_NOT_FOUND:
            toast.error('MFA session expired. Please log in again.');
            router.push(Routes.login);
            break;
          default:
            toast.error('Invalid code. Please try again.');
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setIsResending(true);
    try {
      const response = await sessionApi.resendMfaOtp(challengeId);
      setChallengeId(response.challengeId);
      form.reset();
      toast.success('A new code has been sent to your email.');
    } catch (error) {
      if (error instanceof ApiError && error.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
        toast.error('Too many resend requests. Please wait a few minutes before trying again.');
      } else {
        toast.error('Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
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
                    Enter the 6-digit code sent to your email
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

                <Button type="submit" disabled={isLoading || otpValue.length !== 6}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Button>

                <FieldDescription className="text-center">
                  Didn&apos;t receive a code?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isResending ? 'Sending...' : 'Resend code'}
                  </button>
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
