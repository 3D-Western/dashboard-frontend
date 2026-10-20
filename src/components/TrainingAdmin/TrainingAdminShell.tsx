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
 * Everyone who can open the editor needs `training:author`, because every list and read endpoint
 * asks for it. `training:publish` on its own gets a short explanation instead of empty screens.
 */
export function TrainingAdminShell({ children }: { children: ReactNode }) {
  const { canAuthor, canSee } = useTrainingPermissions();
  const pathname = usePathname();

  if (!canSee) return <UnauthorizedPage title="the training editor" />;

  if (!canAuthor) {
    return (
      <Alert>
        <AlertTitle>You can publish trainings, but not open the editor</AlertTitle>
        <AlertDescription>
          Publishing and correcting questions are shown next to the draft or question they belong
          to, and opening those needs the &ldquo;author trainings&rdquo; permission. Ask an admin to
          add it to your role.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Training editor sections" className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => {
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
