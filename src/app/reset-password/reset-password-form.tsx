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
import { useRouter } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { useState } from 'react';

const formSchema = z
  .object({
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
    code: z
      .string()
      .min(1, 'Reset code is required')
      .regex(/^\d{6}$/, 'Reset code must be exactly 6 digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export function ResetPasswordForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const studentIdNumber = parseInt(values.studentId, 10);

      // First verify the code and get a reset token
      const verifyResponse = await passwordResetApi.verifyCode(studentIdNumber, values.code);

      // Then complete the password reset with the token
      await passwordResetApi.resetPassword(verifyResponse.resetToken, values.newPassword);

      toast.success('Password reset successful! Please login with your new password.');

      // Redirect to login page
      router.push(Routes.login);
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Invalid reset code or student ID. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="grid gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Create new password</h1>
                  <p className="text-balance text-muted-foreground">
                    Enter the code from your email and your new password
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
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reset Code</FormLabel>
                      <FormControl>
                        <Input placeholder="123456" maxLength={6} {...field} />
                      </FormControl>
                      <FormMessage />
                      <FieldDescription>
                        Enter the 6-digit code sent to your email
                      </FieldDescription>
                    </FormItem>
                  )}
                />

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

                <Button type="submit" disabled={isLoading}>
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
