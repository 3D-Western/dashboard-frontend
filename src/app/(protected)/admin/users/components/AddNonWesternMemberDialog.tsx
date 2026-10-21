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
import {
  Invitation,
  MEMBER_TYPE_OPTIONS,
  MemberType,
  RESERVED_STUDENT_ID_START,
} from '@/types/invitation';
import { ApiError } from '@/api/client/errors';
import { toast } from 'sonner';

const formSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'),
  memberType: z.string().min(1, 'Choose a member type'),
  // Optional. Blank means the system assigns a number from the reserved range.
  studentId: z
    .string()
    .trim()
    .refine((val) => val === '' || /^\d{9}$/.test(val), 'A Western number is exactly 9 digits')
    .refine(
      (val) => val === '' || parseInt(val, 10) < RESERVED_STUDENT_ID_START,
      'Numbers from 900000000 up are reserved for members without a Western number',
    ),
  expiresInDays: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface AddNonWesternMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (invitation: Invitation) => void;
}

/**
 * User Management > "Add a non-Western member": invites someone without a @uwo.ca email.
 * They get an email with a code and a signup link.
 */
export function AddNonWesternMemberDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddNonWesternMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      memberType: '',
      studentId: '',
      expiresInDays: '7',
    },
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const invitation = await invitationApi.createInvitation({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        memberType: data.memberType as MemberType,
        ...(data.studentId ? { studentId: parseInt(data.studentId, 10) } : {}),
        expiresInDays: parseInt(data.expiresInDays, 10),
      });

      form.reset();
      onSuccess?.(invitation);
      onOpenChange(false);
      toast.success(`Invitation sent to ${invitation.email}.`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'INVITATION_ALREADY_EXISTS') {
          setServerError(error.message || 'A pending invitation already exists for this person.');
        } else if (error.code === 'USER_ALREADY_EXISTS') {
          setServerError(error.message || 'This person already has an account.');
        } else if (error.code === 'VALIDATION_FAILED' && error.details) {
          const details = error.details as Record<string, string>;
          Object.entries(details).forEach(([field, message]) => {
            if (['firstName', 'lastName', 'email', 'memberType', 'studentId'].includes(field)) {
              form.setError(field as keyof FormData, { message });
            }
          });
        } else {
          setServerError(error.message || 'Failed to send the invitation. Please try again.');
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
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a non-Western member</DialogTitle>
          <DialogDescription>
            For staff, alumni, community members and organisations without a @uwo.ca email. They get
            an email with a code to create their account.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {serverError && (
              <div
                role="alert"
                className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
              >
                {serverError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="jane@example.com"
                      type="email"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Any email address. The code only works for this one.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="memberType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a member type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEMBER_TYPE_OPTIONS.map((option) => (
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

            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Western student or staff number{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="251123456"
                      inputMode="numeric"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty if they don&apos;t have one. They are then given a number starting
                    at {RESERVED_STUDENT_ID_START}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresInDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invitation valid for</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
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
                {isSubmitting ? 'Sending...' : 'Send invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
