'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { Badge } from '@/components/ui/badge';
import { useAdminResource } from '@/hooks/useAdminResource';
import { TrainingAdminRoutes } from '@/lib/training-admin-routes';
import { cn } from '@/lib/utils';
import type { AdminTraining } from '@/types/training-admin';
import { LoadState } from './feedback';

interface TrainingContextValue {
  training: AdminTraining;
  /** Fetches the training again (after a draft is started, published, renamed ...). */
  reload: () => Promise<void>;
  setTraining: (training: AdminTraining) => void;
}

const TrainingContext = createContext<TrainingContextValue | null>(null);

/** The training being edited, shared by all of its screens. */
export function useTraining(): TrainingContextValue {
  const context = useContext(TrainingContext);
  if (!context) throw new Error('useTraining must be used inside a TrainingProvider');
  return context;
}

/** Loads one training and shows the training header and its section links around [children]. */
export function TrainingProvider({
  trainingId,
  children,
}: {
  trainingId: number;
  children: ReactNode;
}) {
  const load = useCallback(() => trainingAdminAPI.getTraining(trainingId), [trainingId]);
  const { data, error, isLoading, reload, setData } = useAdminResource(load);

  return (
    <LoadState
      isLoading={isLoading}
      error={error}
      hasData={!!data}
      onRetry={() => void reload()}
      what="this training"
    >
      {data && (
        <TrainingContext.Provider value={{ training: data, reload, setTraining: setData }}>
          <TrainingFrame training={data}>{children}</TrainingFrame>
        </TrainingContext.Provider>
      )}
    </LoadState>
  );
}

function TrainingFrame({ training, children }: { training: AdminTraining; children: ReactNode }) {
  const pathname = usePathname();
  const activeTab = useRef<HTMLAnchorElement>(null);
  const sections = [
    { title: 'Overview', href: TrainingAdminRoutes.detail(training.id) },
    { title: 'Draft', href: TrainingAdminRoutes.draft(training.id) },
    { title: 'Questions', href: TrainingAdminRoutes.questions(training.id) },
    { title: 'Settings', href: TrainingAdminRoutes.settings(training.id) },
    { title: 'Report', href: TrainingAdminRoutes.report(training.id) },
  ];

  // On a phone the strip scrolls sideways; bring the current section into view.
  useEffect(() => {
    activeTab.current?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [pathname]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href={TrainingAdminRoutes.home}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground fine:min-h-0"
        >
          <ArrowLeft className="size-4" /> All trainings
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold">{training.title}</h2>
          <Badge variant="outline">
            {training.kind === 'ORIENTATION' ? 'Orientation' : 'Equipment training'}
          </Badge>
          {training.archived && <Badge variant="outline">Archived</Badge>}
        </div>
      </div>
      <nav
        aria-label={`${training.title} sections`}
        className="-mx-1 flex gap-1 overflow-x-auto border-b [mask-image:linear-gradient(to_right,#000_calc(100%_-_2rem),transparent)] px-1 md:[mask-image:none]"
      >
        {sections.map((section) => {
          const active = pathname === section.href;
          return (
            <Link
              key={section.href}
              ref={active ? activeTab : undefined}
              href={section.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                '-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap fine:min-h-0',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
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
