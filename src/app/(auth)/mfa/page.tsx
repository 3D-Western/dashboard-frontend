import type { Metadata } from 'next';
import { MFAForm } from './mfa-form';
import { redirect } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Verify Your Identity',
  description: 'Enter your verification code to continue',
};

export default async function MFAPage() {
  // Server-side check: Verify mfaToken cookie exists
  const cookieStore = await cookies();
  const mfaToken = cookieStore.get('mfaToken');

  // If no mfaToken, user didn't come from login - redirect
  if (!mfaToken) {
    redirect(Routes.login);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <MFAForm />
      </div>
    </div>
  );
}
