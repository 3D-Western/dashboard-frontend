import { redirect } from 'next/navigation';

// TEMP: Equipment Management is out of scope for the initial launch — remove this guard (and
// re-add the "Equipment Management" tile/nav entry) when it's ready to ship. Covers this route
// and its nested /admin/equipment/[id]/capacity page. See docs/LAUNCH_SCOPE.md.
export default function AdminEquipmentLayout({ children }: { children: React.ReactNode }) {
  redirect('/admin');
  return children;
}
