import { redirect } from 'next/navigation';

// TEMP: IAM Management is out of scope for the initial launch — remove this guard (and re-add
// the "IAM Management" tile/nav entry) when it's ready to ship. See docs/LAUNCH_SCOPE.md.
export default function AdminIamLayout({ children }: { children: React.ReactNode }) {
  redirect('/admin');
  return children;
}
