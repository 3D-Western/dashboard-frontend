import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your 3D Western account',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Phones start at the top (below the theme toggle) so the Login button stays clear of the keyboard
  return (
    <div className="flex min-h-svh flex-col items-center justify-start px-6 pt-16 pb-6 md:justify-center md:p-10">
      <div className="w-full max-w-md lg:max-w-4xl short:max-w-md">
        <LoginForm error={error} />
      </div>
    </div>
  );
}
