'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  experienceLevel: z.enum(['NoExperience', 'Beginner', 'Advanced']).optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      experienceLevel: undefined,
      agreedToTerms: false,
    },
  });

  async function onSubmit(values: FormData) {
    try {
      setIsLoading(true);

      // Validate experienceLevel is selected
      if (!values.experienceLevel) {
        toast.error('Please select your experience level');
        return;
      }

      // Remove agreedToTerms and convert studentId to number
      const { agreedToTerms, studentId, ...rest } = values;
      const submitData = {
        studentId: parseInt(studentId, 10),
        ...rest,
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
    <div className="flex flex-col items-center justify-center w-screen min-h-screen gap-y-[90px] bg-black bg-cover py-10">
      <span className="font-jersey text-[96px]">SIGN UP</span>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-[24px] gap-x-[74px] justify-items-center max-w-[1200px] mx-auto">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="flex flex-col w-[325px]">
                  <FormLabel className="font-jersey text-[26px]">FIRST NAME</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="FIRST NAME"
                      className="!bg-white w-[325px] h-[43px] placeholder:text-[20px] text-black !text-[20px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="flex flex-col w-[325px]">
                  <FormLabel className="font-jersey text-[26px]">LAST NAME</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="LAST NAME"
                      className="!bg-white w-[325px] h-[43px] placeholder:text-[20px] text-black !text-[20px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex flex-col w-[325px]">
                  <FormLabel className="font-jersey text-[26px]">UWO EMAIL</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="UWO EMAIL"
                      className="!bg-white w-[325px] h-[43px] placeholder:text-[20px] text-black !text-[20px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="flex flex-col w-[325px]">
                  <FormLabel className="font-jersey text-[26px]">PASSWORD</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="PASSWORD"
                      className="!bg-white w-[325px] h-[43px] placeholder:text-[20px] text-black !text-[20px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem className="flex flex-col w-[325px]">
                  <FormLabel className="font-jersey text-[26px]">STUDENT NUMBER</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="STUDENT NUMBER"
                      className="!bg-white w-[325px] h-[43px] placeholder:text-[20px] text-black !text-[20px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experienceLevel"
              render={({ field }) => (
                <FormItem className="flex flex-col w-[325px]">
                  <FormLabel className="font-jersey text-[26px]">EXPERIENCE LEVEL</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-[325px] h-[43px] !bg-white !text-[20px] text-black">
                        <SelectValue placeholder="Experience Level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NoExperience">No Experience</SelectItem>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col gap-y-[46px] items-center mt-[60px]">
            <FormField
              control={form.control}
              name="agreedToTerms"
              render={({ field }) => (
                <FormItem className="flex items-center gap-x-[16px] space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-jersey text-[20px] !mt-0">
                    I have read the{' '}
                    <Link href="/terms-and-conditions" className="underline">
                      terms and conditions
                    </Link>{' '}
                    and agree to 3D Western's{' '}
                    <Link href="/data-policy" className="underline">
                      data policy
                    </Link>
                    .
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormMessage />

            <Button type="submit" className="w-[160px] h-[63px] text-[30px]" disabled={isLoading}>
              {isLoading ? 'LOADING...' : 'REGISTER'}
            </Button>

            <span className="font-jersey text-[20px]">
              Having Issues?{' '}
              <Link href="/contact-us" className="underline">
                Contact us
              </Link>
            </span>
          </div>
        </form>
      </Form>
    </div>
  );
}
