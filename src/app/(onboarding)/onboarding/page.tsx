import type { Metadata } from 'next';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = {
  title: 'Complete Your Profile',
  description: 'Finish setting up your 3D Western account',
};

export default function OnboardingPage() {
  return <OnboardingForm />;
}
