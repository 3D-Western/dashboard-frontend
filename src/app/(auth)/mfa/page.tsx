import type { Metadata } from 'next';
import { MFAForm } from './mfa-form';
import { redirect } from 'next/navigation';
import { Routes } from '@/lib/routes';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Verify Your Identity',
  description: 'Enter your verification code to continue',
};

export default async function MFAPage({
  searchParams,
}: {
  searchParams: Promise<{ challengeId?: string }>;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get('mfaToken')) {
    redirect(Routes.login);
  }

  const { challengeId } = await searchParams;
  const parsed = parseInt(challengeId ?? '', 10);
  if (!challengeId || isNaN(parsed)) {
    redirect(Routes.login);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <MFAForm challengeId={parsed} />
      </div>
    </div>
  );
}
