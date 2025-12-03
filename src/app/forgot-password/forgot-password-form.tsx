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
import { useRouter } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { useState } from 'react';

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
});

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const studentIdNumber = parseInt(values.studentId, 10);
      // Request password reset - don't show success/failure
      await passwordResetApi.requestReset(studentIdNumber);

      // Always show the same message regardless of success or failure
      setIsSubmitted(true);
    } catch (error) {
      // Silently handle errors - don't inform user of success/failure
      console.error('Password reset request error:', error);
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 md:p-8">
              <div className="grid gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Check your email</h1>
                  <p className="text-balance text-muted-foreground">
                    If an account exists with that Student ID, you will receive an email with
                    instructions to reset your password.
                  </p>
                </div>

                <Button onClick={() => router.push(Routes.login)}>Return to Login</Button>
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="grid gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Reset your password</h1>
                  <p className="text-balance text-muted-foreground">
                    Enter your Student ID and we&apos;ll send you a reset code
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

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Code'}
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
