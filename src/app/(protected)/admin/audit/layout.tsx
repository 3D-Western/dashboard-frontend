import { redirect } from 'next/navigation';

// TEMP: Audit Log is out of scope for the initial launch — remove this guard (and re-add the
// "Audit Log" tile/nav entry) when it's ready to ship. See docs/LAUNCH_SCOPE.md.
export default function AdminAuditLayout({ children }: { children: React.ReactNode }) {
  redirect('/admin');
  return children;
}
