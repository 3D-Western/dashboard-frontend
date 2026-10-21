'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { userApi } from '@/api/client/user';
import { ApiError } from '@/api/client/errors';
import { useRouter } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { TrainingStatusCard } from './components/TrainingStatusCard';
import { PhoneNumberCard } from './components/PhoneNumberCard';
import { NotificationsCard } from './components/NotificationsCard';
import { PageContainer } from '@/components/PageContainer';

// Password change form schema
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    invalidateAllSessions: z.boolean(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export function SettingsContent() {
  const router = useRouter();
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      invalidateAllSessions: false,
    },
  });

  async function onPasswordSubmit(values: PasswordFormData) {
    try {
      setIsPasswordLoading(true);

      await userApi.changePassword(
        values.currentPassword,
        values.newPassword,
        values.confirmPassword,
        values.invalidateAllSessions,
      );

      toast.success('Password updated successfully');
      passwordForm.reset();

      // If sign out all sessions was checked, redirect to login
      if (values.invalidateAllSessions) {
        router.push(Routes.login);
      }
    } catch (error) {
      console.error('Password update error', error);

      if (error instanceof ApiError) {
        toast.error(error.message || 'Failed to update password');
      } else {
        toast.error('Failed to connect to the server. Please try again.');
      }
    } finally {
      setIsPasswordLoading(false);
    }
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid gap-4">
        {/* Password Change Card */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter current password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="invalidateAllSessions"
                  render={({ field }) => (
                    <FormItem className="space-y-0 rounded-md border p-4">
                      {/* The label row is the tap target: checkbox plus text, 44 px tall on phones. */}
                      <FormLabel className="flex min-h-11 cursor-pointer items-center gap-3 fine:min-h-0 fine:items-start">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="md:mt-0.5"
                          />
                        </FormControl>
                        Sign out all active sessions
                      </FormLabel>
                      <FormDescription className="max-w-[80ch] pl-8 md:pl-7">
                        After changing your password, you will be signed out from all devices and
                        redirected to the login page.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isPasswordLoading}>
                  {isPasswordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <NotificationsCard />

        <PhoneNumberCard />

        {/* The Usage and Limits cards are hidden until GET /users/{id}/usage and /limits exist in the
            backend (roadmap, usage limits): they only ever showed errors. Components are kept. */}
        <TrainingStatusCard />
      </div>
    </PageContainer>
  );
}
