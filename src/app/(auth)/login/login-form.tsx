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
import { sessionApi } from '@/api/client/session';
import { toast } from 'sonner';
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
  password: z.string().min(1, 'Password is required'),
});

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const studentIdNumber = parseInt(values.studentId, 10);
      const response = await sessionApi.login(studentIdNumber, values.password);

      // Check if MFA is required
      if (response.requiresMfa && response.challengeId) {
        // Store MFA data for the MFA page
        sessionStorage.setItem('mfaChallengeId', response.challengeId.toString());

        // Redirect to MFA page
        router.push(Routes.mfa);
      } else {
        // Successful login without MFA
        toast.success('Login successful! Redirecting to dashboard...');
        // Redirect to dashboard homepage
        router.push(Routes.dashboard);
      }
    } catch (_error) {
      toast.error('Invalid credentials. Please check your Student ID and password.');
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
                      <div className="flex items-center">
                        <FormLabel>Password</FormLabel>
                        <a
                          href={`${Routes.forgotPassword}`}
                          className="ml-auto text-sm underline-offset-2 hover:underline"
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
