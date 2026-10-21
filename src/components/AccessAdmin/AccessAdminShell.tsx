'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import UnauthorizedPage from '@/components/UnauthorizedPage';
import { useAccessPermissions } from '@/hooks/useAccessPermissions';
import { AccessAdminRoutes } from '@/lib/access-admin-routes';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { title: 'Live', href: AccessAdminRoutes.home },
  { title: 'Devices', href: AccessAdminRoutes.devices },
  { title: 'Gatekeepers', href: AccessAdminRoutes.gatekeepers },
  { title: 'Card links', href: AccessAdminRoutes.cardLinks },
];

function isActive(pathname: string, href: string) {
  if (href === AccessAdminRoutes.home) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The frame of every `/admin/access` page: only `access:admin` opens it, and it carries the section links. */
export function AccessAdminShell({ children }: { children: ReactNode }) {
  const { canAdmin } = useAccessPermissions();
  const pathname = usePathname();

  if (!canAdmin) return <UnauthorizedPage title="the access system" />;

  return (
    <div className="space-y-6">
      <nav aria-label="Access system sections" className="flex flex-wrap gap-2">
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
