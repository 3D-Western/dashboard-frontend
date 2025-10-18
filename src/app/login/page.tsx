'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const formSchema = z.object({
  studentId: z
    .string()
    .min(1, 'Student ID is required')
    .regex(/^\d+$/, 'Student ID must contain only numbers')
    .refine((val) => {
      const num = parseInt(val, 10);
      return num >= 251000000 && num <= 251999999;
    }, 'Student ID must be between 251000000 and 251999999'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof formSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      password: '',
    },
  });

  async function onSubmit(values: FormData) {
    try {
      setIsLoading(true);

      // Convert studentId to number for API
      const submitData = {
        studentId: parseInt(values.studentId, 10),
        password: values.password,
      };

      // Make API call to login endpoint
      const response = await fetch('http://dev.3dwestern.ca:8080/login', {
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

      toast.success('Login successful! Redirecting...');

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
    <div className="grid grid-cols-2 h-screen">
      <div className="flex flex-col items-center justify-center gap-y-[90px] py-10">
        <span className="font-jersey text-[96px]">LOGIN</span>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-[500px] px-4">
            <div className="flex flex-col gap-y-[24px] items-center">
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
            </div>

            <div className="flex flex-col gap-y-[46px] items-center mt-[60px]">
              <Button type="submit" className="w-[160px] h-[63px] text-[30px]" disabled={isLoading}>
                {isLoading ? 'LOADING...' : 'LOGIN'}
              </Button>

              <span className="font-jersey text-[20px]">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="underline">
                  Sign up
                </Link>
              </span>

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
      <div className="self-center">
        <Image
          src="/3dWesternLogo.svg"
          alt="3d Western Logo"
          width={750}
          height={765}
          className="z-40"
        />
      </div>
    </div>
  );
}
