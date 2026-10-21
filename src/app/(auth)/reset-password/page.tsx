import type { Metadata } from 'next';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Create a new password for your 3D Western account',
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 pt-16 pb-6 md:p-10">
      <div className="w-full max-w-md lg:max-w-4xl short:max-w-md">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
