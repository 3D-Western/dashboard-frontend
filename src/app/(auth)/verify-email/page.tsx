import type { Metadata } from 'next';
import { VerifyEmailContent } from './verify-email-content';

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Confirming your email address',
};

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <VerifyEmailContent />
      </div>
    </div>
  );
}
