import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageTitle from '@/components/PageTitle';
import { SignoffDetail } from '@/components/Signoff/SignoffDetail';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { PERMISSIONS } from '@/constants/permissions';
import { validateSession } from '@/lib/auth';
import { hasPermission } from '@/types/user';

export const metadata: Metadata = {
  title: 'Training Sign-off',
  description: 'Check a student off in person',
};

export default async function SignoffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await validateSession();
  if (!user || !hasPermission(user, PERMISSIONS.TRAINING_SIGNOFF)) {
    return <UnauthorizedPage title="Training Sign-offs" />;
  }

  const signoffId = Number((await params).id);
  if (!Number.isInteger(signoffId) || signoffId <= 0) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <PageTitle title="Training sign-off" />
      <SignoffDetail signoffId={signoffId} />
    </div>
  );
}
