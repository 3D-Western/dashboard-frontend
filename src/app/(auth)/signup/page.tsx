import type { Metadata } from 'next';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your 3D Western account',
};

interface SignupPageProps {
  searchParams: Promise<{ code?: string; email?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  // The link in an invitation email carries the code and the address it was sent to.
  const { code, email } = await searchParams;
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 pt-16 pb-6 md:p-10">
      <div className="w-full max-w-md lg:max-w-4xl short:max-w-md">
        <SignupForm initialInvitationCode={code} initialEmail={email} />
      </div>
    </div>
  );
}
