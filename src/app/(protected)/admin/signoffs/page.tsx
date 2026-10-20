import type { Metadata } from 'next';
import PageTitle from '@/components/PageTitle';
import { SignoffQueue } from '@/components/Signoff/SignoffQueue';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { PERMISSIONS } from '@/constants/permissions';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';

export const metadata: Metadata = {
  title: 'Training Sign-offs',
  description: 'Students waiting for an in-person training sign-off',
};

export default async function SignoffQueuePage() {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.TRAINING_SIGNOFF)) {
    return <UnauthorizedPage title="Training Sign-offs" />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <PageTitle
        title="Training Sign-offs"
        description="Students who passed the online part and are waiting for you in the space."
      />
      <SignoffQueue />
    </div>
  );
}
