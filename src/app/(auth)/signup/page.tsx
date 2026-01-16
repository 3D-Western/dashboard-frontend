import type { Metadata } from 'next';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your 3D Western account',
};

export default function SignupPage() {
  return <SignupForm />;
}
