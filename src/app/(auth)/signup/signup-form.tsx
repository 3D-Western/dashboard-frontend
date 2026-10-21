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
import { EXPERIENCE_LEVEL_OPTIONS } from '@/constants/experience-levels';
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

const formSchema = z
  .object({
    studentId: z
      .string()
      .min(1, 'Student ID is required')
      .regex(/^\d+$/, 'Student ID must contain only numbers')
      .refine((val) => {
        const num = parseInt(val, 10);
        return num >= 100000000 && num <= 999999999;
      }, 'Student ID must be exactly 9 digits'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email is required')
      .regex(
        /^[a-z0-9][a-z0-9._-]*@uwo\.ca$/,
        'Must be a valid UWO email (e.g., jdoe@uwo.ca or jdoe2@uwo.ca)',
      ),
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
    experienceLevel: z.string().min(1, 'Experience level is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
  })
  .refine((values) => !values.smsOptIn || values.phoneNumber !== '', {
    message: SMS_OPT_IN_NEEDS_PHONE_ERROR,
    path: ['smsOptIn'],
  });
type FormData = z.infer<typeof formSchema>;

export function SignupForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      email: '',
      phoneNumber: '',
      smsOptIn: false,
      password: '',
      faculty: '',
      experienceLevel: '',
      firstName: '',
      lastName: '',
    },
  });

  // Watched so the consent box can be disabled until a number is typed.
  const phoneNumber = useWatch({ control: form.control, name: 'phoneNumber' });

  async function onSubmit(values: FormData) {
    try {
      setIsLoading(true);

      // Convert studentId to number and prepare data for API
      const signupData = {
        studentId: parseInt(values.studentId, 10),
        email: values.email,
        password: values.password,
        faculty: transformFacultyToBackend(values.faculty as UserFaculty),
        experienceLevel: values.experienceLevel,
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
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            {/* method="post": if someone submits before the page's JavaScript has loaded, the
                browser's fallback submit must not put the password in the URL */}
            <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="flex min-h-[600px] flex-col justify-center gap-6">
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UWO Email</FormLabel>
                      <FormControl>
                        <Input placeholder="example@uwo.ca" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
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
          <div className="relative hidden min-h-[600px] md:block">
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
