import { redirect } from 'next/navigation';

// Invitations moved into User Management (the Invitations tab). Old bookmarks and links land there.
export default function InvitationManagementRedirect() {
  redirect('/admin/users?tab=invitations');
}
