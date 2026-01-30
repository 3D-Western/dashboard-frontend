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
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { passwordResetApi } from '@/api/client/password-reset';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { useState, useEffect } from 'react';

const formSchema = z
  .object({
    newPassword: z.string().min(10, 'Password must be at least 10 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export function ResetPasswordForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setTokenError('No reset token found. Please use the link from your email.');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!token) {
      toast.error('Invalid reset token. Please use the link from your email.');
      return;
    }

    setIsLoading(true);
    try {
      await passwordResetApi.resetPassword(token, values.newPassword);

      toast.success('Password reset successful! Please login with your new password.');

      // Redirect to login page
      router.push(Routes.login);
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Invalid or expired reset token. Please request a new password reset.');
    } finally {
      setIsLoading(false);
    }
  }

  if (tokenError) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="flex items-center p-6 md:p-8 min-h-[500px]">
              <div className="grid gap-6 w-full">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Invalid Reset Link</h1>
                  <p className="text-balance text-muted-foreground">{tokenError}</p>
                </div>

                <Button onClick={() => router.push(Routes.forgotPassword)}>
                  Request New Reset Link
                </Button>

                <FieldDescription className="text-center">
                  Remember your password?{' '}
                  <a href={Routes.login} className="underline-offset-2 hover:underline">
                    Back to Login
                  </a>
                </FieldDescription>
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

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center p-6 md:p-8 min-h-[500px]">
              <div className="grid gap-6 w-full">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Create new password</h1>
                  <p className="text-balance text-muted-foreground">
                    Enter your new password below
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                      <FieldDescription>Must be at least 10 characters</FieldDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoading || !token}>
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>

                <FieldDescription className="text-center">
                  Remember your password?{' '}
                  <a href={Routes.login} className="underline-offset-2 hover:underline">
                    Back to Login
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
    </div>
  );
}
