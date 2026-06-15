'use client';
import { ApiError } from '@/api/client/errors';
import { sessionApi } from '@/api/client/session';
import {
  transformExperienceLevelToBackend,
  transformFacultyToBackend,
} from '@/api/client/transformers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_OPTIONS } from '@/constants/experience-levels';
import { FACULTIES, FACULTY_OPTIONS } from '@/constants/faculties';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  studentId: z
    .string()
    .min(1, 'Student ID is required')
    .regex(/^\d+$/, 'Student ID must contain only numbers')
    .refine((val) => {
      const num = parseInt(val, 10);
      return num >= 251000000 && num <= 251999999;
    }, 'Student ID must be between 251000000 and 251999999'),
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(
      /^[a-z]+[0-9]*@uwo\.ca$/,
      'Must be a valid UWO email (e.g., jdoe@uwo.ca or jdoe2@uwo.ca)',
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  inviteCode: z.string().min(1, 'Invite code is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  experienceLevel: z.enum([
    EXPERIENCE_LEVELS.NO_EXPERIENCE,
    EXPERIENCE_LEVELS.BEGINNER,
    EXPERIENCE_LEVELS.ADVANCED,
  ]),
  faculty: z.enum([
    FACULTIES.UNDECLARED,
    FACULTIES.ARTS_AND_HUMANITIES,
    FACULTIES.MUSIC,
    FACULTIES.EDUCATION,
    FACULTIES.ENGINEERING,
    FACULTIES.HEALTH_SCIENCES,
    FACULTIES.INFORMATION_AND_MEDIA_STUDIES,
    FACULTIES.IVEY_BUSINESS_SCHOOL,
    FACULTIES.LAW,
    FACULTIES.SCHULICH_MEDICINE_AND_DENTISTRY,
    FACULTIES.SCIENCE,
    FACULTIES.SOCIAL_SCIENCE,
  ]),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

type FormData = z.infer<typeof formSchema>;

export function SignupForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      email: '',
      password: '',
      inviteCode: '',
      firstName: '',
      lastName: '',
      experienceLevel: EXPERIENCE_LEVELS.NO_EXPERIENCE,
      faculty: FACULTIES.UNDECLARED,
      agreedToTerms: false,
    },
  });

  // Step 1 validation
  const validateStep1 = async () => {
    const fields = [
      'firstName',
      'lastName',
      'studentId',
      'email',
      'password',
      'inviteCode',
    ] as const;
    const isValid = await form.trigger(fields);

    if (isValid) {
      setCurrentStep(2);
    }
    return isValid;
  };

  async function onSubmit(values: FormData) {
    try {
      setIsLoading(true);

      // Convert studentId to number and prepare data for API
      const signupData = {
        studentId: parseInt(values.studentId, 10),
        email: values.email,
        password: values.password,
        inviteCode: values.inviteCode,
        firstName: values.firstName,
        lastName: values.lastName,
        experienceLevel: transformExperienceLevelToBackend(values.experienceLevel),
        faculty: transformFacultyToBackend(values.faculty),
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="flex min-h-[600px] flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="mb-2 flex items-center gap-2">
                    {currentStep === 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(1)}
                        className="p-1"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <h1 className="text-2xl font-bold">
                      {currentStep === 1 ? 'Create your account' : 'Complete your profile'}
                    </h1>
                  </div>
                  <p className="text-balance text-muted-foreground">
                    {currentStep === 1
                      ? 'Step 1 of 2: Enter your credentials'
                      : 'Step 2 of 2: Tell us about yourself'}
                  </p>
                </div>

                {/* Step 1: Your Identity */}
                {currentStep === 1 && (
                  <>
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
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inviteCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            Invite Code
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p>
                                  Currently we are in invite only testing. If you want to give it a
                                  try, email support@3dwestern.ca
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your invite code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grow" />

                    <Button type="button" onClick={validateStep1} className="w-full">
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Step 2: Complete Your Profile */}
                {currentStep === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="experienceLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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

                    <FormField
                      control={form.control}
                      name="faculty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Faculty</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
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
                      name="agreedToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">
                              I agree to the{' '}
                              <Link href="/terms-and-conditions" className="underline">
                                Terms of Service
                              </Link>{' '}
                              and{' '}
                              <Link href="/data-policy" className="underline">
                                Privacy Policy
                              </Link>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="grow" />

                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </>
                )}

                <FieldDescription className="text-center">
                  Already have an account?{' '}
                  <Link href={Routes.login} className="underline">
                    Sign in
                  </Link>
                </FieldDescription>
              </div>
            </form>
          </Form>

          {/* Right side - Logo/Image */}
          <div className="relative hidden min-h-[600px] bg-muted md:block">
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
        By creating an account, you agree to our{' '}
        <Link href="/terms-and-conditions" className="underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/data-policy" className="underline">
          Privacy Policy
        </Link>
        .
      </FieldDescription>
    </div>
  );
}
