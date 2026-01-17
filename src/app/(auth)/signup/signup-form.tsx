'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { FieldDescription } from '@/components/ui/field';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_OPTIONS } from '@/constants/experience-levels';
import { Routes } from '@/lib/routes';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
  experienceLevel: z
    .enum([EXPERIENCE_LEVELS.NO_EXPERIENCE, EXPERIENCE_LEVELS.BEGINNER, EXPERIENCE_LEVELS.ADVANCED])
    .optional(),
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
      experienceLevel: undefined,
      agreedToTerms: false,
    },
  });

  // Step 1 validation
  const validateStep1 = async () => {
    const fields = ['email', 'password', 'inviteCode', 'studentId'] as const;
    const isValid = await form.trigger(fields);
    
    if (isValid) {
      setCurrentStep(2);
    }
    return isValid;
  };

  async function onSubmit(values: FormData) {
    try {
      setIsLoading(true);

      // Validate experienceLevel is selected
      if (!values.experienceLevel) {
        toast.error('Please select your experience level');
        return;
      }

      // Convert studentId to number and prepare data for submission
      const { studentId, ...rest } = values;
      const submitData = {
        studentId: parseInt(studentId, 10),
        email: rest.email,
        password: rest.password,
        inviteCode: rest.inviteCode,
        firstName: rest.firstName,
        lastName: rest.lastName,
        experienceLevel: values.experienceLevel,
      };

      // Make API call to signup endpoint
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      // Handle error responses (400-500 status codes)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An error occurred' }));
        toast.error(errorData.message || `Error: ${response.status} - ${response.statusText}`);
        return;
      }

      // Handle successful response (200 status code)
      const data = await response.json();

      // Store the session token as a cookie
      document.cookie = `sessionToken=${data.sessionToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;

      toast.success('Registration successful! Redirecting...');

      // Redirect to dashboard homepage
      router.push('/dashboard');
    } catch (error) {
      console.error('Form submission error', error);
      toast.error('Failed to connect to the server. Please try again.');
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

                {/* Step 1: Credentials */}
                {currentStep === 1 && (
                  <>
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
                          <FormLabel>Invite Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your invite code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

                    <Button type="button" onClick={validateStep1} className="w-full">
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Step 2: Personal Information */}
                {currentStep === 2 && (
                  <>
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

                    <FormField
                      control={form.control}
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

                    <FormField
                      control={form.control}
                      name="agreedToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                            />
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
        </Link>.
      </FieldDescription>
    </div>
  );
}