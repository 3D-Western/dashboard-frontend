'use client';
import { logout } from '@/lib/auth';
import { Button } from '../ui/button';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError, ErrorCodes } from '@/api/client/errors';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      // Session already gone on the backend — treat as successful logout
      if (error instanceof ApiError && error.code === ErrorCodes.USER_NOT_FOUND) {
        router.push('/');
        return;
      }
      toast.error('Failed to log out. Please try again.');
      return;
    }
    router.push('/');
  }, [router]);

  return <Button onClick={handleLogout}>Logout</Button>;
}
