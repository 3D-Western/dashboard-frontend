'use client';
import { ApiError } from '@/api/client/errors';
import { sessionApi } from '@/api/client/session';
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
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FACULTY_OPTIONS } from '@/constants/faculties';
import { transformFacultyToBackend } from '@/api/client/transformers';
import type { UserFaculty } from '@/types/user';
import { BrandMark } from '@/components/BrandLogo';
import { TextConsentCheckbox } from '@/components/TextConsentCheckbox';
import {
  isAcceptablePhoneInput,
  PHONE_NUMBER_ERROR,
  phoneRequestFields,
  SMS_OPT_IN_NEEDS_PHONE_ERROR,
} from '@/lib/phone';

// Student numbers from 900000000 up are reserved for invited members (the invitation carries theirs)
const MAX_WESTERN_STUDENT_ID = 899999999;
const UWO_EMAIL = /^[a-z0-9][a-z0-9._-]*@uwo\.ca$/;
const ANY_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formSchema = z
  .object({
    // Required unless an invitation code is entered (checked below)
    studentId: z.string(),
    email: z.string().trim().toLowerCase().min(1, 'Email is required'),
    // For people without a @uwo.ca email: the code an admin emailed them
    invitationCode: z.string().trim(),
    // Optional. Blank is fine; anything typed must be a North American number.
    phoneNumber: z.string().trim().refine(isAcceptablePhoneInput, PHONE_NUMBER_ERROR),
    smsOptIn: z.boolean(),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    faculty: z.string().min(1, 'Faculty is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
  })
  .refine((values) => !values.smsOptIn || values.phoneNumber !== '', {
    message: SMS_OPT_IN_NEEDS_PHONE_ERROR,
    path: ['smsOptIn'],
  })
  .superRefine((values, ctx) => {
    const hasCode = values.invitationCode !== '';

    // Open signup (D-5) is @uwo.ca; anyone else needs the invitation code sent to their address.
    if (values.email !== '') {
      if (hasCode && !ANY_EMAIL.test(values.email)) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid email address' });
      } else if (!hasCode && !UWO_EMAIL.test(values.email)) {
        ctx.addIssue({
          code: 'custom',
          path: ['email'],
          message:
            'Must be a valid UWO email (e.g., jdoe@uwo.ca). No @uwo.ca address? Use the invitation code you were sent.',
        });
      }
    }

    // With a code the invitation carries the student number
    if (!hasCode) {
      if (values.studentId === '') {
        ctx.addIssue({ code: 'custom', path: ['studentId'], message: 'Student ID is required' });
      } else if (!/^\d+$/.test(values.studentId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['studentId'],
          message: 'Student ID must contain only numbers',
        });
      } else {
        const num = parseInt(values.studentId, 10);
        if (num < 100000000 || num > MAX_WESTERN_STUDENT_ID) {
          ctx.addIssue({
            code: 'custom',
            path: ['studentId'],
            message: 'Student ID must be exactly 9 digits',
          });
        }
      }
    }
  });
type FormData = z.infer<typeof formSchema>;

interface SignupFormProps extends React.ComponentProps<'div'> {
  /** From the link in an invitation email (?code=). Shows the code field filled in. */
  initialInvitationCode?: string;
  /** From the same link (?email=). */
  initialEmail?: string;
}

export function SignupForm({
  className,
  initialInvitationCode = '',
  initialEmail = '',
  ...props
}: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  // The code field is hidden until someone has a code (from the email link, or "I have an invitation code")
  const [showCodeField, setShowCodeField] = useState(initialInvitationCode !== '');
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      email: initialEmail,
      invitationCode: initialInvitationCode,
      phoneNumber: '',
      smsOptIn: false,
      password: '',
      faculty: '',
      firstName: '',
      lastName: '',
    },
  });

  // Watched so the consent box can be disabled until a number is typed.
  const phoneNumber = useWatch({ control: form.control, name: 'phoneNumber' });
  const invitationCode = useWatch({ control: form.control, name: 'invitationCode' });
  const hasInvitationCode = invitationCode.trim() !== '';

  async function onSubmit(values: FormData) {
    try {
      setIsLoading(true);

      // Convert studentId to number and prepare data for API
      const signupData = {
        // With an invitation code the invitation carries the student number
        ...(values.invitationCode !== ''
          ? { invitationCode: values.invitationCode }
          : { studentId: parseInt(values.studentId, 10) }),
        email: values.email,
        password: values.password,
        faculty: transformFacultyToBackend(values.faculty as UserFaculty),
        firstName: values.firstName,
        lastName: values.lastName,
        ...phoneRequestFields(values.phoneNumber, values.smsOptIn),
      };

      // Call signup API endpoint
      await sessionApi.signup(signupData);

      router.push(Routes.checkEmail);
    } catch (error) {
      if (error instanceof ApiError) {
        // Handle specific API errors
        toast.error(error.message);
      } else {
        // Handle network or unexpected errors
        toast.error('Failed to connect to the server. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 lg:grid-cols-2 short:grid-cols-1">
          <Form {...form}>
            {/* method="post": if someone submits before the page's JavaScript has loaded, the
                browser's fallback submit must not put the password in the URL */}
            <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="flex flex-col justify-center gap-6 lg:min-h-[600px]">
                {/* Header */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Create your account</h1>
                  <p className="text-balance text-muted-foreground">Enter your credentials</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {hasInvitationCode ? (
                  <p className="text-sm text-muted-foreground">
                    You were invited, so you don&apos;t need a student ID. Use the email address the
                    invitation was sent to.
                  </p>
                ) : (
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
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{hasInvitationCode ? 'Email' : 'UWO Email'}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={hasInvitationCode ? 'you@example.com' : 'example@uwo.ca'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showCodeField ? (
                  <FormField
                    control={form.control}
                    name="invitationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invitation code</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="off"
                            autoCapitalize="characters"
                            placeholder="ABC234"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCodeField(true)}
                    className="-mt-2 inline-flex min-h-11 items-center self-start px-1 text-sm underline fine:min-h-0 fine:px-0"
                  >
                    No @uwo.ca email? I have an invitation code
                  </button>
                )}

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Mobile number{' '}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          placeholder="519-555-1234"
                          {...field}
                          onChange={(event) => {
                            field.onChange(event);
                            // Consent needs a number: clearing the number clears the tick.
                            if (event.target.value.trim() === '') form.setValue('smsOptIn', false);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="smsOptIn"
                  render={({ field }) => (
                    <FormItem>
                      <TextConsentCheckbox
                        id="signup-sms-opt-in"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={phoneNumber.trim() === ''}
                      />
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
                        <PasswordInput autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="faculty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Faculty</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select your faculty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FACULTY_OPTIONS.map((option) => (
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

                <div className="grow" />

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>

                <FieldDescription className="text-center">
                  Already have an account?{' '}
                  <Link
                    href={Routes.login}
                    className="inline-flex min-h-11 items-center px-1 underline fine:min-h-0 fine:px-0"
                  >
                    Sign in
                  </Link>
                </FieldDescription>
              </div>
            </form>
          </Form>

          {/* Right side - Logo/Image */}
          <div className="relative hidden min-h-[600px] lg:block short:hidden">
            <BrandMark className="p-12" />
          </div>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By creating an account, you agree to our{' '}
        <Link
          href="/terms-and-conditions"
          className="inline-flex min-h-11 items-center px-1 underline fine:min-h-0 fine:px-0"
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          href="/data-policy"
          className="inline-flex min-h-11 items-center px-1 underline fine:min-h-0 fine:px-0"
        >
          Privacy Policy
        </Link>
        .
      </FieldDescription>
    </div>
  );
}
