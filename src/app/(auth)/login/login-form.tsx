'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { StatusAlert } from '@/components/StatusAlert';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { sessionApi } from '@/api/client/session';
import { useRouter } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { useState, useEffect } from 'react';
import { ApiError, ErrorCodes } from '@/api/client/errors';

const formSchema = z.object({
  studentId: z
    .string()
    .min(1, 'Student ID is required')
    .regex(/^\d{9}$/, 'Student ID must be exactly 9 digits')
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return num >= 251000000 && num <= 251999999;
      },
      { message: 'Student ID must be between 251000000 and 251999999' },
    ),
  password: z.string().min(1, 'Password is required'),
});

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  unauthenticated: {
    title: 'Session Expired',
    description: 'Your session has expired. Please log in again to continue.',
  },
};

type ErrorState = {
  title: string;
  description: string;
  variant?: 'default' | 'destructive' | 'warning';
  emailVerification?: {
    studentId: number;
  };
} | null;

export function LoginForm({
  error,
  className,
  ...props
}: React.ComponentProps<'div'> & { error?: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentError, setCurrentError] = useState<ErrorState>(
    error && ERROR_MESSAGES[error] ? { ...ERROR_MESSAGES[error], variant: 'destructive' } : null,
  );
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      password: '',
    },
  });

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setCurrentError(null); // Clear any existing errors

    try {
      const studentIdNumber = parseInt(values.studentId, 10);
      const response = await sessionApi.login(studentIdNumber, values.password);

      // Check if MFA is required
      if (response.requiresMfa && response.challengeId) {
        router.push(`${Routes.mfa}?challengeId=${response.challengeId}`);
      } else {
        // Successful login without MFA - Redirect to dashboard homepage
        router.push(Routes.dashboard);
      }
    } catch (error) {
      // Check if it's an email verification error
      if (error instanceof ApiError && error.code === ErrorCodes.EMAIL_NOT_VERIFIED) {
        // Extract challengeId and email from error details
        setCurrentError({
          title: 'Email Not Verified',
          description:
            'Your email address has not been verified. Please check your inbox for the verification link.',
          variant: 'warning',
          emailVerification: {
            studentId: parseInt(values.studentId, 10),
          },
        });
      } else if (error instanceof ApiError && error.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
        setCurrentError({
          title: 'Too Many Attempts',
          description: error.message || 'Too many login attempts. Please try again in 15 minutes.',
          variant: 'warning',
        });
      } else if (error instanceof ApiError) {
        // Handle other API errors
        setCurrentError({
          title: 'Login Failed',
          description: error.message || 'Invalid credentials. Please try again.',
          variant: 'destructive',
        });
      } else {
        // Handle unexpected errors
        setCurrentError({
          title: 'Login Failed',
          description: 'Invalid credentials. Please check your Student ID and password.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!currentError?.emailVerification || resendCooldown > 0) return;

    setIsResending(true);
    try {
      await sessionApi.resendEmailVerification(currentError.emailVerification.studentId);
      // Start 60-second cooldown
      setResendCooldown(60);
      // Update error to show success message
      setCurrentError({
        title: 'Verification Email Sent',
        description:
          'A new verification email has been sent. Please check your inbox and verify your email address.',
        variant: 'warning',
        emailVerification: currentError.emailVerification,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setCurrentError({
          title: 'Failed to Resend Email',
          description: error.message || 'Failed to resend verification email. Please try again.',
          variant: 'destructive',
          emailVerification: currentError.emailVerification,
        });
      } else {
        setCurrentError({
          title: 'Failed to Resend Email',
          description: 'Failed to resend verification email. Please try again.',
          variant: 'destructive',
          emailVerification: currentError.emailVerification,
        });
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {/* Single Error Display Area */}
      {currentError && (
        <StatusAlert
          variant={currentError.variant}
          title={currentError.title}
          description={currentError.description}
          action={
            currentError.emailVerification ? (
              <Button
                onClick={handleResendVerification}
                disabled={isResending || resendCooldown > 0}
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : 'Click here to resend verification email'}
              </Button>
            ) : undefined
          }
        />
      )}

      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="grid gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground">
                    Login to your 3D Western account
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student ID</FormLabel>
                      <FormControl>
                        <Input placeholder="251000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-right">
                  <a
                    href={`${Routes.forgotPassword}`}
                    className="text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>

                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href={`${Routes.signup}`}>Sign up</a>
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
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and{' '}
        <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
