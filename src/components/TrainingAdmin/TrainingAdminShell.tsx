'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTrainingPermissions } from '@/hooks/useTrainingPermissions';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { title: 'Trainings', href: TrainingAdminRoutes.home },
  { title: 'Equipment', href: TrainingAdminRoutes.equipment },
  { title: 'Import', href: TrainingAdminRoutes.import },
  { title: 'Audit log', href: TrainingAdminRoutes.auditLog },
];

function isActive(pathname: string, href: string) {
  if (href === TrainingAdminRoutes.home) {
    return pathname === href || /^\/admin\/training\/\d+/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The frame of every `/admin/training` page: who may see it, and the section links.
 *
 * `training:author` or `training:publish` opens it (every read accepts either). Someone with only
 * `training:publish` can look at everything and publish, but their editing controls are switched off.
 */
export function TrainingAdminShell({ children }: { children: ReactNode }) {
  const { canAuthor, canSee } = useTrainingPermissions();
  const pathname = usePathname();

  if (!canSee) return <UnauthorizedPage title="the training editor" />;

  const sections = canAuthor
    ? SECTIONS
    : SECTIONS.filter((s) => s.href !== TrainingAdminRoutes.import);

  return (
    <div className="space-y-6">
      {!canAuthor && (
        <Alert>
          <AlertTitle>You can look and publish, but not edit</AlertTitle>
          <AlertDescription>
            Your role can publish trainings and correct questions. Changing trainings, questions and
            equipment needs the &ldquo;author trainings&rdquo; permission; ask an admin to add it to
            your role.
          </AlertDescription>
        </Alert>
      )}
      <nav aria-label="Training editor sections" className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const active = isActive(pathname, section.href);
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {section.title}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
