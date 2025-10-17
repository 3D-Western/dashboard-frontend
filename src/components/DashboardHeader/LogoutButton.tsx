'use client';
import { logout } from '@/lib/auth';
import { Button } from '../ui/button';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/');
  }, [router]);

  return <Button onClick={handleLogout}>Logout</Button>;
}
