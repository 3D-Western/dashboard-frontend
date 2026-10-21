import Link from 'next/link';
import { cn } from '@/lib/utils';

export type UserManagementTab = 'users' | 'invitations';

interface UserManagementTabsProps {
  active: UserManagementTab;
  /** The Invitations tab needs `invitations:list`. */
  showInvitations: boolean;
}

const tabClass = (selected: boolean) =>
  cn(
    'inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium transition-colors fine:min-h-9',
    selected
      ? 'border-primary text-foreground'
      : 'border-transparent text-muted-foreground hover:text-foreground',
  );

/** Users and Invitations, as two tabs on the User Management page (the tab is `?tab=` in the URL). */
export function UserManagementTabs({ active, showInvitations }: UserManagementTabsProps) {
  if (!showInvitations) return null;
  return (
    <div role="tablist" aria-label="User management sections" className="flex border-b">
      <Link
        role="tab"
        aria-selected={active === 'users'}
        href="/admin/users"
        className={tabClass(active === 'users')}
      >
        Users
      </Link>
      <Link
        role="tab"
        aria-selected={active === 'invitations'}
        href="/admin/users?tab=invitations"
        className={tabClass(active === 'invitations')}
      >
        Invitations
      </Link>
    </div>
  );
}
