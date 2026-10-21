import type { Metadata } from 'next';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your 3D Western account',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 pt-16 pb-6 md:p-10">
      <div className="w-full max-w-md lg:max-w-4xl short:max-w-md">
        <SignupForm />
      </div>
    </div>
  );
}
