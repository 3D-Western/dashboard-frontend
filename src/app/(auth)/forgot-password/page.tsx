import type { Metadata } from 'next';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your 3D Western account password',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 pt-16 pb-6 md:p-10">
      <div className="w-full max-w-md lg:max-w-4xl short:max-w-md">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
