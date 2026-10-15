import { cn } from '@/lib/utils';

interface DashboardSectionProps {
  /** Used for the heading's id, so the section is labelled by its heading */
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/** A titled card that holds one dashboard widget */
export function DashboardSection({ id, title, children, className }: DashboardSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn('space-y-4 rounded-xl border bg-card p-5 sm:p-6', className)}
    >
      <h2 id={headingId} className="text-lg">
        {title}
      </h2>
      {children}
    </section>
  );
}
