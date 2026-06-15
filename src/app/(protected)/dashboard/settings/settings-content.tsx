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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EXPERIENCE_LEVEL_OPTIONS, EXPERIENCE_LEVELS } from '@/constants/experience-levels';
import { useUser } from '@/providers/user-provider';
import { userApi } from '@/api/client/user';
import { ApiError } from '@/api/client/errors';
import { useRouter } from 'next/navigation';
import { Routes } from '@/lib/routes';

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

// Experience level form schema
const experienceLevelSchema = z.object({
  experienceLevel: z.enum([
    EXPERIENCE_LEVELS.NO_EXPERIENCE,
    EXPERIENCE_LEVELS.BEGINNER,
    EXPERIENCE_LEVELS.ADVANCED,
  ]),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type ExperienceLevelFormData = z.infer<typeof experienceLevelSchema>;

export function SettingsContent() {
  const user = useUser();
  const router = useRouter();
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isExperienceLoading, setIsExperienceLoading] = useState(false);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      invalidateAllSessions: false,
    },
  });

  const experienceForm = useForm<ExperienceLevelFormData>({
    resolver: zodResolver(experienceLevelSchema),
    defaultValues: {
      experienceLevel: user?.experienceLevel || EXPERIENCE_LEVELS.NO_EXPERIENCE,
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

  async function onExperienceLevelSubmit(values: ExperienceLevelFormData) {
    try {
      setIsExperienceLoading(true);

      const response = await fetch('/api/user/experience-level', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experienceLevel: values.experienceLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An error occurred' }));
        toast.error(errorData.message || 'Failed to update experience level');
        return;
      }

      toast.success('Experience level updated successfully');
    } catch (error) {
      console.error('Experience level update error', error);
      toast.error('Failed to connect to the server. Please try again.');
    } finally {
      setIsExperienceLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
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
                    <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Sign out all active sessions</FormLabel>
                        <FormDescription>
                          After changing your password, you will be signed out from all devices and
                          redirected to the login page.
                        </FormDescription>
                      </div>
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

        {/* Experience Level Card */}
        <Card>
          <CardHeader>
            <CardTitle>Experience Level</CardTitle>
            <CardDescription>Update your 3D printing experience level</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...experienceForm}>
              <form
                onSubmit={experienceForm.handleSubmit(onExperienceLevelSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={experienceForm.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your experience level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isExperienceLoading}>
                  {isExperienceLoading ? 'Updating...' : 'Update Experience Level'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
