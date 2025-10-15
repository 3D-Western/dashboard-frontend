'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = 'http://dev.3dwestern.ca:8080';

export default function Login() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate inputs
    if (!studentId.trim() || !password.trim()) {
      setError('Student ID and password are required');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/session/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: parseInt(studentId, 10),
          password: password,
        }),
      });

      if (response.status === 200) {
        // Login successful
        const data = await response.json();
        console.log('Login successful. Session token:', data.sessionToken);

        // Store session token (you can use cookies or other storage)
        sessionStorage.setItem('sessionToken', data.sessionToken);

        // Redirect to dashboard or main page
        router.push('/dashboard'); // Update this path as needed
      } else if (response.status === 400) {
        setError('Invalid request. Please check your input.');
      } else if (response.status === 401) {
        setError('Invalid student ID or password.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } catch (err) {
      // Network error or backend not available
      setError('Unable to connect to server. Please try again later.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen py-2">
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 mr-20">
          <span className="font-jersey text-[96px]">LOGIN</span>

          <Input
            type="text"
            placeholder="student ID"
            className="!bg-white w-[325px] h-[43px] placeholder:text-[20px]"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          />

          <Input
            type="password"
            placeholder="password"
            className="!bg-white w-[325px] h-[43px] placeholder:text-[20px]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="text-red-600 text-sm w-[325px] text-center">{error}</div>}

          <Link href="/forgot-password" className="font-jersey underline text-[16px]">
            Forgot Password?
          </Link>

          <Button
            type="submit"
            variant="default"
            className="w-[160px] h-[63px] text-[30px]"
            disabled={isLoading}
          >
            {isLoading ? 'LOADING...' : 'PRINT NOW'}
          </Button>

          <Link href="/signup">SIGN UP</Link>
        </form>

        <Image src="3dWesternLogo.svg" alt="3D Western Logo" width={750} height={765} />
      </div>
    </>
  );
}
