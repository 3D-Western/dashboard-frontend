'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { invitationApi } from '@/api/client/invitation';
import { Invitation } from '@/types/invitation';
import { ApiError } from '@/api/client/errors';

const formSchema = z.object({
  studentId: z
    .string()
    .min(1, 'Student ID is required')
    .refine(
      (val) => {
        const num = parseInt(val);
        return num >= 251000000 && num <= 251999999;
      },
      { message: 'Student ID must be between 251000000 and 251999999' },
    ),
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(/^[a-z]+\d*@uwo\.ca$/, 'Email must be a valid UWO email (e.g., jdoe123@uwo.ca)'),
  expiresInDays: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (invitation: Invitation) => void;
}

export function CreateInvitationDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInvitationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      email: '',
      expiresInDays: '7',
    },
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const invitation = await invitationApi.createInvitation({
        studentId: parseInt(data.studentId),
        email: data.email,
        expiresInDays: parseInt(data.expiresInDays),
      });

      form.reset();
      onSuccess?.(invitation);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'INVITATION_ALREADY_EXISTS') {
          setServerError(
            error.message || 'A pending invitation already exists for this student ID or email.',
          );
        } else if (error.code === 'USER_ALREADY_EXISTS') {
          setServerError(error.message || 'This student is already registered.');
        } else if (error.code === 'VALIDATION_FAILED' && error.details) {
          const details = error.details as Record<string, string>;
          Object.entries(details).forEach(([field, message]) => {
            if (field === 'studentId' || field === 'email') {
              form.setError(field, { message });
            }
          });
        } else {
          setServerError(error.message || 'Failed to create invitation. Please try again.');
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Invitation</DialogTitle>
          <DialogDescription>
            Send an invitation to allow a new student to register for the 3D Workshop.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {serverError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student ID</FormLabel>
                  <FormControl>
                    <Input placeholder="251123456" {...field} type="text" inputMode="numeric" />
                  </FormControl>
                  <FormDescription>Enter the student&apos;s 9-digit ID</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="jdoe123@uwo.ca" {...field} type="email" />
                  </FormControl>
                  <FormDescription>Must be a valid UWO email address</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresInDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires In</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expiry period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>How long the invitation will be valid</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
